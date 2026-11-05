import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ExplanationDraftSchema } from '../../../packages/schema/dist/index.js';

const API = 'http://127.0.0.1:4000';
const mode = process.argv[2] ?? 'plan';
assert(['plan', 'apply', 'verify'].includes(mode));
const dir = process.env.N1_REPAIR_DIR;
assert(dir && path.isAbsolute(dir), 'N1_REPAIR_DIR required');
const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.slug, 'n1-2012-07');
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
function count(v, old) {
  if (typeof v === 'string') return v.split(old).length - 1;
  if (Array.isArray(v)) return v.reduce((sum, x) => sum + count(x, old), 0);
  if (v && typeof v === 'object') return Object.values(v).reduce((sum, x) => sum + count(x, old), 0);
  return 0;
}
function replace(v, old, next) {
  if (typeof v === 'string') return v.split(old).join(next);
  if (Array.isArray(v)) return v.map((x) => replace(x, old, next));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x, old, next)]));
  return v;
}
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
  // Mutations are never retried automatically after an ambiguous server failure.
  const response = await fetch(API + route, {
    method,
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth.token}`, 'x-totp-code': totp(auth.secret) } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  assert(response.ok, `${method} ${route}: HTTP ${response.status} ${value.code ?? value.error?.code ?? ""}: ${value.message ?? value.error?.message ?? ""}`);
  await new Promise((r) => setTimeout(r, 700));
  return value;
}
const env = Object.fromEntries(fs.readFileSync(process.env.N1_REPAIR_AUTH, 'utf8').split(/\r?\n/u).filter(Boolean).map((line) => {
  const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
}));
async function login(role) {
  const prefix = role.toUpperCase();
  const signed = await raw('POST', '/api/v1/auth/sign-in/email', { email: env[prefix + '_EMAIL'], password: env[prefix + '_PASSWORD'] });
  assert.equal(signed.user.role, role === 'publisher' ? 'admin' : role);
  const auth = { token: signed.session.token, secret: env[prefix + '_TOTP_SECRET'] };
  // Demo operators are shared. A different session may have consumed this step.
  try {
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(auth.secret) }, auth);
  } catch (error) {
    if (!/\(m\u00e3 c\u0169\)/u.test(error.message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 30_500 - Date.now() % 30_000));
    await raw('POST', '/api/v1/auth/totp/challenge', { code: totp(auth.secret) }, auth);
  }
  return auth;
}
const editor = await login('editor');
const getGroup = (id) => raw('GET', `/api/v1/admin/groups/${id}`, undefined, editor);
async function getExplanation(id) {
  const result = await raw('GET', `/api/v1/admin/explanations?questionId=${id}&status=approved`, undefined, editor);
  const item = result.items.sort((a, b) => b.version - a.version)[0];
  assert(item, 'Approved explanation required');
  return item;
}
function dto(group) {
  return {
    passage: group.version.passage,
    audioSha256: group.version.audioSha256,
    questions: group.questions.map((q) => ({
      stem: q.version.stem,
      options: q.options.map((o) => ({ orderIndex: o.orderIndex, content: o.content })),
      correctOption: q.correctAnswer.correctOption,
      explanation: q.version.explanation,
      skill: q.skill, mondaiType: q.mondaiType, origin: q.origin,
    })),
  };
}
if (mode === 'plan') {
  assert(!fs.existsSync(planPath), 'Use a new operation directory to re-plan');
  const groups = [], explanations = [];
  for (const fix of manifest.fixes) {
    const group = await getGroup(fix.groupId);
    assert.equal(group.version.status, 'approved');
    const q = group.questions.find((item) => item.id === fix.questionId);
    assert(q, 'Question identity missing');
    assert.equal(q.correctAnswer.correctOption, fix.correctOption);
    const baseline = {
      stem: q.version.stem, passage: group.version.passage,
      options: q.options.map((o) => ({ order_index: o.orderIndex, content: o.content })),
      question_explanation: q.version.explanation,
    };
    assert.equal(hash(baseline), fix.baselineHash, `Q${fix.number} changed since review`);
    const before = dto(group);
    const applyFix = (value) => fix.replacements.reduce((v, rule) => replace(v, rule.before, rule.after), value);
    const after = applyFix(before);
    if (hash(before) !== hash(after)) {
      assert.deepEqual(after.questions.map((x) => x.correctOption), before.questions.map((x) => x.correctOption));
      groups.push({ groupId: fix.groupId, sourceVersion: group.version.version, beforeHash: hash(before), after, number: fix.number });
    }
    if (fix.explanationHash) {
      const ex = await getExplanation(fix.questionId);
      assert.equal(hash(ex.content), fix.explanationHash, `Q${fix.number} explanation changed since review`);
      const updated = ExplanationDraftSchema.parse(applyFix(ex.content));
      assert.notEqual(hash(updated), hash(ex.content));
      explanations.push({ questionId: fix.questionId, sourceId: ex.id, sourceVersion: ex.version, beforeHash: hash(ex.content), after: updated, number: fix.number });
    }
  }
  assert.equal(new Set(groups.map((g) => g.groupId)).size, groups.length, 'Duplicate group plan');
  const plan = { manifestHash: hash(manifest), examId: manifest.examId, groups, explanations };
  save(planPath, plan);
  console.log(JSON.stringify({ mode, groups: groups.length, explanations: explanations.length, planHash: hash(plan) }));
} else {
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  assert.equal(plan.manifestHash, hash(manifest));
  const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, 'utf8')) : { planHash: hash(plan), groups: {}, explanations: {} };
  assert.equal(journal.planHash, hash(plan));
  if (mode === 'apply') {
    assert.equal(process.env.N1_REPAIR_CI_COMMIT, process.env.N1_REPAIR_EXPECTED_COMMIT, 'CI commit mismatch');
    assert(process.env.N1_REPAIR_CI_COMMIT, 'Successful CI commit required');
    const backup = process.env.N1_REPAIR_BACKUP;
    assert(backup && fs.statSync(backup).size > 1_048_576, 'Validated database backup required');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'), process.env.N1_REPAIR_BACKUP_SHA256, 'Backup hash mismatch');
    const reviewer = await login('reviewer');
    const publisher = await login('publisher');
    for (const item of plan.groups) {
      if (journal.groups[item.groupId]) continue;
      const current = await getGroup(item.groupId);
      assert.equal(current.version.version, item.sourceVersion, `Q${item.number} group version changed`);
      assert.equal(current.version.status, 'approved');
      assert.equal(hash(dto(current)), item.beforeHash);
      const result = await raw('PATCH', `/api/v1/admin/groups/${item.groupId}`, item.after, editor);
      const version = result.version?.version ?? result.version;
      assert.equal(version, item.sourceVersion + 1);
      await raw('POST', `/api/v1/admin/groups/${item.groupId}/submit-review`, { expectedVersion: version }, editor);
      await raw('POST', `/api/v1/admin/groups/${item.groupId}/reviews`, { decision: 'approved', expectedVersion: version, comment: 'N1 7/2012: sửa chữ đã đối chiếu nguồn ngày 05/11/2026' }, reviewer);
      const checked = await getGroup(item.groupId);
      assert.equal(checked.version.status, 'approved');
      assert.equal(hash(dto(checked)), hash(item.after));
      journal.groups[item.groupId] = version; save(journalPath, journal);
      console.log(`Q${item.number}: group v${version} approved`);
    }
    for (const item of plan.explanations) {
      if (journal.explanations[item.questionId]) continue;
      const current = await getExplanation(item.questionId);
      assert.equal(current.id, item.sourceId);
      assert.equal(hash(current.content), item.beforeHash);
      const created = await raw('POST', '/api/v1/admin/explanations', { ...item.after, questionId: item.questionId }, editor);
      await raw('POST', `/api/v1/admin/explanations/${created.id}/reviews`, { decision: 'approved', comments: 'Đồng bộ sửa chữ N1 7/2012, không thay đáp án' }, reviewer);
      const checked = await getExplanation(item.questionId);
      assert.equal(checked.id, created.id);
      assert.equal(hash(checked.content), hash(item.after));
      journal.explanations[item.questionId] = { id: created.id, version: checked.version }; save(journalPath, journal);
      console.log(`Q${item.number}: explanation v${checked.version} approved`);
    }
    if (!journal.publishedVersion) {
      const result = await raw('POST', `/api/v1/admin/exams/${plan.examId}/publish`, {}, publisher);
      journal.publishedVersion = result.version ?? result.publishedVersion;
      assert(journal.publishedVersion > manifest.publishedVersion);
      save(journalPath, journal);
    }
  }
  for (const item of plan.groups) {
    const current = await getGroup(item.groupId);
    assert.equal(current.version.status, 'approved');
    assert.equal(hash(dto(current)), hash(item.after));
  }
  for (const item of plan.explanations) {
    const current = await getExplanation(item.questionId);
    assert.equal(current.status, 'approved');
    assert.equal(hash(current.content), hash(item.after));
  }
  assert(journal.publishedVersion, 'Publication required');
  const snapshot = await raw('GET', `/api/v1/exams/${plan.examId}/v${journal.publishedVersion}/snapshot.json`, undefined, editor);
  assert.equal(snapshot.totalQuestions, 106);
  const questions = snapshot.sections.flatMap((s) => s.groups.flatMap((g) => g.questions.map((q) => ({ q, g }))));
  for (const item of plan.groups) {
    const actual = questions.find(({ q }) => q.questionId === manifest.fixes.find((x) => x.number === item.number).questionId);
    assert(actual);
    assert.equal(hash(actual.g.passage), hash(item.after.passage));
    const group = await getGroup(item.groupId);
    const position = group.questions.findIndex((q) => q.id === actual.q.questionId);
    assert(position >= 0);
    const changed = item.after.questions[position];
    assert.equal(hash(actual.q.stem), hash(changed.stem));
    assert.equal(hash(actual.q.options.map((o) => o.content)), hash(changed.options.map((o) => o.content)));
  }
  save(path.join(dir, 'verification.json'), { at: new Date().toISOString(), version: journal.publishedVersion, questions: questions.length, groups: plan.groups.length, explanations: plan.explanations.length, passed: true });
  console.log(JSON.stringify({ mode, version: journal.publishedVersion, passed: true }));
}
