import crypto from 'node:crypto';
import fs from 'node:fs';

const API = 'http://127.0.0.1:4000';
const workDir = process.env.N1_FIX_WORK_DIR || '/tmp';
const plan = JSON.parse(fs.readFileSync(`${workDir}/n1-safe-fix-api-plan.json`, 'utf8'));
const journal = JSON.parse(fs.readFileSync(`${workDir}/n1-safe-fix-apply-journal.json`, 'utf8'));
const env = Object.fromEntries(fs.readFileSync(`${workDir}/n1-safe-fix-auth.env`, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)];
}));

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = '';
  for (const char of value.replace(/=+$/u, '').toUpperCase()) {
    const index = alphabet.indexOf(char); if (index >= 0) bits += index.toString(2).padStart(5, '0');
  }
  const bytes = []; for (let offset = 0; offset + 8 <= bits.length; offset += 8) bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret) {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(buffer).digest(); const offset = digest.at(-1) & 0x0f;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

async function login() {
  const signed = await fetch(`${API}/api/v1/auth/sign-in/email`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: env.PUBLISHER_EMAIL, password: env.PUBLISHER_PASSWORD }) }).then((r) => r.json());
  const token = signed.session.token; const code = totp(env.PUBLISHER_TOTP_SECRET);
  await fetch(`${API}/api/v1/auth/totp/challenge`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-totp-code': code }, body: JSON.stringify({ code }) });
  return token;
}

function countIn(value, needle) {
  if (typeof value === 'string') return value.split(needle).length - 1;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countIn(item, needle), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + countIn(item, needle), 0);
  return 0;
}

const fixesBySlug = new Map();
for (const item of plan.groupPlans) {
  for (const slug of item.examSlugs) {
    const list = fixesBySlug.get(slug) || [];
    list.push(...item.fixes);
    fixesBySlug.set(slug, list);
  }
}

const failures = [];
const versions = {};
const token = await login();
for (const [slug, fixes] of fixesBySlug) {
  const publication = journal.publishedExams[slug];
  const response = await fetch(`${API}/api/v1/exams/${publication.examId}/v${publication.version}/snapshot.json`, {
    headers: { authorization: `Bearer ${token}`, 'x-totp-code': totp(env.PUBLISHER_TOTP_SECRET) },
  });
  const text = await response.text();
  if (!response.ok) {
    failures.push({ slug, error: `http_${response.status}` });
    continue;
  }
  const body = JSON.parse(text);
  versions[slug] = publication.version;
  for (const fix of fixes) {
    if (countIn(body, fix.expected) < 1) {
      failures.push({ slug, question: fix.question_number, field: fix.target_field, error: 'expected_not_in_public_snapshot' });
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 650));
}

const result = {
  checkedExams: fixesBySlug.size,
  checkedFixes: [...fixesBySlug.values()].reduce((sum, fixes) => sum + fixes.length, 0),
  journalPublishedExams: Object.keys(journal.publishedExams).length,
  versions,
  failures,
};
fs.writeFileSync(`${workDir}/n1-safe-fix-public-verification.json`, JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify({
  checkedExams: result.checkedExams,
  checkedFixes: result.checkedFixes,
  journalPublishedExams: result.journalPublishedExams,
  failures: result.failures.length,
}, null, 2));
if (failures.length) process.exit(1);
