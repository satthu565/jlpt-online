import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const API = process.env.API_URL || 'http://127.0.0.1:4000';
const mode = process.argv[2] ?? 'plan';
assert(['plan', 'apply', 'verify'].includes(mode), 'Mode must be plan, apply, or verify');

const dir = process.env.N3_2010_12_IMAGE_DIR || '/tmp/n3-2010-12-images';
assert(dir && path.isAbsolute(dir), 'N3_2010_12_IMAGE_DIR required and must be absolute');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.slug, 'n3-2010-12');

const planPath = path.join(dir, 'plan.json');
const journalPath = path.join(dir, 'journal.json');
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of value.replace(/=+$/u, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index >= 0) bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest.at(-1) & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

async function raw(method, route, body, auth) {
  const headers = { 'content-type': 'application/json' };
  if (auth) {
    headers.authorization = `Bearer ${auth.token}`;
    headers['x-totp-code'] = totp(auth.secret);
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${API}${route}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429 && attempt < 7) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`${method} ${route} -> ${response.status}: ${text.slice(0, 200)}`);
    }
    if (!response.ok) {
      const err = new Error(`${method} ${route} -> ${response.status}: ${text.slice(0, 200)}`);
      err.data = json;
      throw err;
    }
    return json;
  }
}

function loadEnv() {
  const envFile = process.env.N1_CONTENT_AUTH_FILE || '/tmp/n1-safe-fix-auth.env';
  if (!fs.existsSync(envFile)) throw new Error(`Missing ${envFile}`);
  return Object.fromEntries(
    fs
      .readFileSync(envFile, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

async function login(role) {
  const env = loadEnv();
  const prefix = role.toUpperCase();
  const email = env[`${prefix}_EMAIL`];
  const password = env[`${prefix}_PASSWORD`];
  const secret = env[`${prefix}_TOTP_SECRET`];
  assert(email && password && secret, `Missing env credentials for ${role}`);

  const signed = await raw('POST', '/api/v1/auth/sign-in/email', { email, password });
  const auth = { token: signed.session.token, secret };
  try {
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(secret) }, auth);
  } catch (err) {
    if (!err.message.includes('mã cũ') && !err.message.includes('mã mới')) throw err;
    await new Promise((resolve) => setTimeout(resolve, 31000 - (Date.now() % 30000)));
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(secret) }, auth);
  }
  return auth;
}

function executeDb(sql) {
  const cmd = `sudo -n docker exec -i jlpt-staging-postgres psql -U jlpt -d jlpt_staging -v ON_ERROR_STOP=1`;
  execSync(cmd, { input: sql, encoding: 'utf8' });
}

// 1. Plan
const plan = {
  examSlug: manifest.slug,
  examId: manifest.examId,
  publishedVersion: manifest.publishedVersion,
  changesCount: manifest.changes.length,
  changes: manifest.changes,
};
save(planPath, plan);
console.log(`Plan saved to ${planPath} (${plan.changesCount} questions to update passage)`);

if (mode === 'plan') {
  console.log(JSON.stringify({ mode: 'plan', exam: manifest.slug, changes: plan.changesCount, passed: true }));
  process.exit(0);
}

// 2. Apply
let journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : { passageUpdated: false, publishedVersion: null };

if (mode === 'apply') {
  const backup = process.env.N3_2010_12_IMAGE_BACKUP;
  assert(backup && fs.existsSync(backup), 'N3_2010_12_IMAGE_BACKUP file is required');
  assert(fs.statSync(backup).size > 1_048_576, 'Backup must be > 1MB');

  // Update question_group_versions in DB
  if (!journal.passageUpdated) {
    console.log('Updating question_group_versions.passage in database...');
    for (const change of manifest.changes) {
      const passageJson = JSON.stringify(change.passage);
      const escapedJson = passageJson.replace(/'/g, "''");
      const sql = `UPDATE question_group_versions SET passage = '${escapedJson}'::jsonb WHERE group_id = '${change.groupId}';`;
      executeDb(sql);
      console.log(`Updated passage for Q${change.questionNumber} (group: ${change.groupId})`);
    }
    journal.passageUpdated = true;
    save(journalPath, journal);
  }

  // Publish new exam version
  if (!journal.publishedVersion) {
    console.log('Logging in as publisher...');
    const publisher = await login('publisher');
    console.log(`Publishing exam ${manifest.examId}...`);
    const pubResult = await raw('POST', `/api/v1/admin/exams/${manifest.examId}/publish`, {}, publisher);
    journal.publishedVersion = pubResult.version ?? pubResult.publishedVersion;
    assert(journal.publishedVersion > manifest.publishedVersion, 'New published version must be greater than previous');
    save(journalPath, journal);
    console.log(`Exam published as version ${journal.publishedVersion}`);
  }
}

// 3. Verify
console.log('Verifying published snapshot...');
const publisher = await login('publisher');
const newVersion = journal.publishedVersion || (manifest.publishedVersion + 1);
const snapshot = await raw('GET', `/api/v1/exams/${manifest.examId}/v${newVersion}/snapshot.json`, undefined, publisher);

assert.equal(snapshot.version, newVersion);
assert.equal(snapshot.totalQuestions, manifest.totalQuestions);

const sec = snapshot.sections.find((s) => s.code === 'listening');
assert(sec, 'Listening section missing in snapshot');

// Verify each change in snapshot
for (let i = 0; i < manifest.changes.length; i += 1) {
  const change = manifest.changes[i];
  // Find group in sec.groups
  const group = sec.groups.find((g) => (g.groupId || g.id) === change.groupId);
  assert(group, `Group ${change.groupId} missing in snapshot for Q${change.questionNumber}`);
  assert(group.passage && group.passage.length > 0, `Passage still empty for Q${change.questionNumber}`);
  const imgContent = group.passage[0]?.content?.find((c) => c.t === 'image');
  assert(imgContent, `Image block missing in passage for Q${change.questionNumber}`);
  const expectedMediaKey = change.passage[0].content[0].mediaKey;
  assert.equal(imgContent.mediaKey, expectedMediaKey, `MediaKey mismatch for Q${change.questionNumber}`);
  console.log(`Q${change.questionNumber} verified in snapshot: ${imgContent.mediaKey}`);
}

const verification = {
  at: new Date().toISOString(),
  version: newVersion,
  totalQuestions: snapshot.totalQuestions,
  questionsUpdated: manifest.changes.length,
  passed: true,
};
save(path.join(dir, 'verification.json'), verification);
console.log(JSON.stringify({ mode, ...verification }));
