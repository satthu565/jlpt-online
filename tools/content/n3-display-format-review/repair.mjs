import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const API = 'http://127.0.0.1:4000';
const mode = process.argv[2] ?? 'plan';
assert(['plan', 'apply', 'verify'].includes(mode));

const dir = process.env.N3_FMT_REPAIR_DIR;
assert(dir && path.isAbsolute(dir), 'N3_FMT_REPAIR_DIR required');

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.reviewDate, '2026-11-08');

const planPath = path.join(dir, 'plan.json');
const journalPath = path.join(dir, 'journal.json');

const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
const canonical = (v) => JSON.stringify(normalize(v));
function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, normalize(x)]));
  return v;
}
const hash = (v) => crypto.createHash('sha256').update(canonical(v)).digest('hex');

function totp(secret) {
  let bits = '';
  for (const c of secret.replace(/=+$/u, '').toUpperCase()) {
    const i = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);
    assert(i >= 0, 'Invalid TOTP encoding');
    bits += i.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = crypto.createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest.at(-1) & 15) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}

async function raw(method, route, body, auth) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let response;
    try {
      response = await fetch(API + route, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(auth ? { authorization: `Bearer ${auth.token}`, 'x-totp-code': totp(auth.secret) } : {})
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (method !== 'GET' || attempt === 5) throw error;
      await new Promise(r => setTimeout(r, Math.min(15_000, 1000 * 2 ** attempt)));
      continue;
    }
    const value = await response.json();
    if (response.status === 429 || (method === 'GET' && response.status >= 500)) {
      assert(attempt < 5, `${method} ${route}: retry limit HTTP ${response.status}`);
      const delay = Math.max(1000, Number(response.headers.get('retry-after') || value.details?.retryAfterSec || 2 ** attempt) * 1000);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    assert(response.ok, `${method} ${route}: HTTP ${response.status} ${value.code ?? value.error?.code ?? ''}: ${value.message ?? value.error?.message ?? ''}`);
    await new Promise(r => setTimeout(r, 700));
    return value;
  }
  throw new Error(`${method} ${route}: retries exhausted`);
}

const env = Object.fromEntries(fs.readFileSync(process.env.N3_FMT_REPAIR_AUTH, 'utf8').split(/\r?\n/u).filter(Boolean).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));

async function login(role) {
  const prefix = role.toUpperCase();
  const signed = await raw('POST', '/api/v1/auth/sign-in/email', { email: env[prefix + '_EMAIL'], password: env[prefix + '_PASSWORD'] });
  assert.equal(signed.user.role, role === 'publisher' ? 'admin' : role);
  const auth = { token: signed.session.token, secret: env[prefix + '_TOTP_SECRET'] };
  try {
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(auth.secret) }, auth);
  } catch (error) {
    if (!/\(m\u00e3 c\u0169\)/u.test(error.message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 30_500 - Date.now() % 30_000));
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(auth.secret) }, auth);
  }
  return auth;
}

function dto(group) {
  return {
    passage: group.version.passage,
    audioSha256: group.version.audioSha256,
    questions: group.questions.map(q => ({
      stem: q.version.stem,
      options: q.options.map(o => ({ orderIndex: o.orderIndex, content: o.content })),
      correctOption: q.correctAnswer.correctOption,
      explanation: q.version.explanation,
      skill: q.skill,
      mondaiType: q.mondaiType,
      origin: q.origin
    }))
  };
}

function content(q) {
  return {
    stem: q.version.stem,
    options: q.options.map(o => ({ orderIndex: o.orderIndex, content: o.content })),
    correctOption: q.correctAnswer.correctOption,
    explanation: q.version.explanation
  };
}

const editor = await login('editor');
const groupGet = id => raw('GET', `/api/v1/admin/groups/${id}`, undefined, editor);
const examGet = slug => raw('GET', `/api/v1/exams/${slug}`);

if (mode === 'plan') {
  assert(!fs.existsSync(planPath), 'New operation directory required');
  const groups = [], exams = [];
  const changes = [...manifest.fixes, ...manifest.groupFixes];

  for (const slug of [...new Set(changes.map(f => f.slug))]) {
    const fix = changes.find(f => f.slug === slug);
    const exam = await examGet(slug);
    assert(exam.publishedVersion >= fix.publishedVersion, 'Published version regressed');
    exams.push({ slug, id: fix.examId, sourceVersion: exam.publishedVersion, totalQuestions: exam.totalQuestions });
  }

  const ids = [...new Set(changes.map(f => f.groupId))];
  for (const id of ids) {
    const group = await groupGet(id);
    assert.equal(group.version.status, 'approved');
    const before = dto(group);
    const after = structuredClone(before);
    const fixes = manifest.fixes.filter(f => f.groupId === id);
    const passageFix = manifest.groupFixes.find(f => f.groupId === id);

    if (passageFix) {
      assert.equal(group.version.version, passageFix.groupVersion);
      assert.equal(hash(group.version.passage), hash(passageFix.before), 'Stale passage');
      after.passage = structuredClone(passageFix.after);
    }

    for (const fix of fixes) {
      const idx = group.questions.findIndex(q => q.id === fix.questionId);
      assert(idx >= 0, `Missing question ${fix.number} in group ${id}`);
      assert.equal(group.questions[idx].version.version, fix.questionVersion, `Stale question version ${fix.number}`);
      assert.equal(hash(content(group.questions[idx])), hash(fix.before), `Stale content for question ${fix.number}`);
      after.questions[idx].stem = structuredClone(fix.after.stem);
      after.questions[idx].options = structuredClone(fix.after.options);
      after.questions[idx].correctOption = fix.after.correctOption;
      after.questions[idx].explanation = structuredClone(fix.after.explanation);
    }

    groups.push({
      groupId: id,
      sourceGroupVersion: group.version.version,
      beforeHash: hash(before),
      afterHash: hash(after),
      payload: after
    });
  }

  save(planPath, {
    plannedAt: new Date().toISOString(),
    manifestSha256: hash(manifest),
    exams,
    groups
  });
  console.log(`Plan saved to ${planPath}: ${exams.length} exams, ${groups.length} groups.`);
}

if (mode === 'apply') {
  assert(fs.existsSync(planPath), 'Plan required');
  assert(!fs.existsSync(journalPath), 'Journal already exists');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(plan.manifestSha256, hash(manifest), 'Manifest tampered');

  const reviewer = await login('reviewer');
  const publisher = await login('publisher');

  const journal = { appliedAt: new Date().toISOString(), groups: {}, exams: {} };

  for (const item of plan.groups) {
    console.log(`Updating group ${item.groupId}...`);
    const created = await raw('POST', `/api/v1/admin/groups/${item.groupId}/versions`, item.payload, editor);
    assert(created.version > item.sourceGroupVersion);

    console.log(`Submitting group version ${created.version}...`);
    await raw('POST', `/api/v1/admin/groups/${item.groupId}/versions/${created.version}/submit`, {}, editor);

    console.log(`Approving group version ${created.version}...`);
    await raw('POST', `/api/v1/admin/groups/${item.groupId}/versions/${created.version}/review`, { decision: 'approved', notes: 'N3 display format fix' }, reviewer);

    journal.groups[item.groupId] = created.version;
  }

  for (const ex of plan.exams) {
    console.log(`Publishing exam ${ex.slug}...`);
    const pub = await raw('POST', `/api/v1/admin/exams/${ex.id}/publish`, { changeSummary: 'N3 display format and spacing fix' }, publisher);
    assert(pub.publishedVersion > ex.sourceVersion);
    journal.exams[ex.id] = pub.publishedVersion;
    console.log(`Exam ${ex.slug} published at v${pub.publishedVersion}`);
  }

  save(journalPath, journal);
  console.log(`Apply completed and journal saved to ${journalPath}`);
}

if (mode === 'verify') {
  assert(fs.existsSync(journalPath), 'Journal required');
  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
  for (const [id, ver] of Object.entries(journal.groups)) {
    const g = await groupGet(id);
    assert.equal(g.version.version, ver);
    assert.equal(g.version.status, 'approved');
  }
  for (const [id, ver] of Object.entries(journal.exams)) {
    const exam = await raw('GET', `/api/v1/admin/exams/${id}`, undefined, editor);
    assert.equal(exam.publishedVersion, ver);
  }
  console.log('All API entities verified approved and published.');
}
