import crypto from 'node:crypto';
import fs from 'node:fs';

const API = 'http://127.0.0.1:4000';
const workDir = process.env.N1_FIX_WORK_DIR || '/tmp';
const AUTH_ENV = `${workDir}/n1-safe-fix-auth.env`;
const PLAN = `${workDir}/n1-safe-fix-api-plan.json`;
const JOURNAL = `${workDir}/n1-safe-fix-apply-journal.json`;
const args = new Set(process.argv.slice(2));
const maxGroupsArg = process.argv.find((arg) => arg.startsWith('--max-groups='));
const maxGroups = maxGroupsArg ? Number(maxGroupsArg.split('=')[1]) : Number.POSITIVE_INFINITY;
const skipExplanations = args.has('--skip-explanations');
const skipPublish = args.has('--skip-publish');

function loadEnv(path) {
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf('=');
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

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

async function rawRequest(path, options = {}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${API}${path}`, options);
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (response.ok) return body;
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(body?.details?.retryAfterSec) || Number(response.headers.get('retry-after')) || 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
      continue;
    }
    throw new Error(`${path} -> ${response.status}: ${body?.message || body?.error?.message || JSON.stringify(body)}`);
  }
  throw new Error(`${path} -> retry limit exceeded`);
}

async function login(email, password, secret) {
  const signed = await rawRequest('/api/v1/auth/sign-in/email', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const token = signed.session.token;
  const code = totp(secret);
  await rawRequest('/api/v1/auth/totp/challenge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-totp-code': code },
    body: JSON.stringify({ code }),
  });
  return { token, secret, role: signed.user.role };
}

async function request(auth, method, path, body) {
  const result = await rawRequest(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      authorization: `Bearer ${auth.token}`,
      'x-totp-code': totp(auth.secret),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  await new Promise((resolve) => setTimeout(resolve, 650));
  return result;
}

function countIn(value, needle) {
  if (typeof value === 'string') return value.split(needle).length - 1;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countIn(item, needle), 0);
  if (value && typeof value === 'object') return Object.values(value).reduce((sum, item) => sum + countIn(item, needle), 0);
  return 0;
}

function replaceIn(value, needle, replacement) {
  if (typeof value === 'string') return value.split(needle).join(replacement);
  if (Array.isArray(value)) return value.map((item) => replaceIn(item, needle, replacement));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceIn(item, needle, replacement)]));
  }
  return value;
}

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function groupFixTarget(group, fix) {
  const question = group.questions.find((item) => item.id === fix.question_id);
  if (fix.target_field === 'passage') return group.version.passage;
  if (fix.target_field === 'stem') return question?.version?.stem;
  if (fix.target_field === 'option') return question?.options?.find((option) => option.orderIndex === fix.option_index)?.content;
  return undefined;
}

function groupFixApplied(group, fix) {
  const target = groupFixTarget(group, fix);
  return target !== undefined && countIn(target, fix.expected) >= 1;
}

function saveJournal(journal) {
  fs.writeFileSync(JOURNAL, JSON.stringify(journal, null, 2), { mode: 0o600 });
}

const env = loadEnv(AUTH_ENV);
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const journal = fs.existsSync(JOURNAL)
  ? JSON.parse(fs.readFileSync(JOURNAL, 'utf8'))
  : { createdAt: new Date().toISOString(), groups: {}, explanations: {}, publishedExams: {}, errors: [] };

const editor = await login(env.EDITOR_EMAIL, env.EDITOR_PASSWORD, env.EDITOR_TOTP_SECRET);
const reviewer = await login(env.REVIEWER_EMAIL, env.REVIEWER_PASSWORD, env.REVIEWER_TOTP_SECRET);
const publisher = await login(env.PUBLISHER_EMAIL, env.PUBLISHER_PASSWORD, env.PUBLISHER_TOTP_SECRET);
console.log(`authenticated editor=${editor.role} reviewer=${reviewer.role} publisher=${publisher.role}`);

let groupsAppliedThisRun = 0;
for (const item of plan.groupPlans) {
  if (journal.groups[item.groupId]?.verified) continue;
  if (groupsAppliedThisRun >= maxGroups) break;
  try {
    const current = await request(editor, 'GET', `/api/v1/admin/groups/${item.groupId}`);
    if (current.version.version !== item.sourceVersion || current.version.status !== item.sourceStatus) {
      if (current.version.status === 'approved' && item.fixes.every((fix) => groupFixApplied(current, fix))) {
        journal.groups[item.groupId] = { verified: true, newVersion: current.version.version, examSlugs: item.examSlugs, fixes: item.fixes.length, recovered: true };
        groupsAppliedThisRun += 1;
        saveJournal(journal);
        console.log(`group ${item.groupId} v${current.version.version} recovered fixes=${item.fixes.length}`);
        continue;
      }
      throw new Error(`precondition version/status changed: ${current.version.version}/${current.version.status}`);
    }
    const updated = await request(editor, 'PATCH', `/api/v1/admin/groups/${item.groupId}`, item.dto);
    const newVersion = updated.version?.version ?? updated.version;
    await request(editor, 'POST', `/api/v1/admin/groups/${item.groupId}/submit-review`, { expectedVersion: newVersion });
    await request(reviewer, 'POST', `/api/v1/admin/groups/${item.groupId}/reviews`, {
      decision: 'approved', expectedVersion: newVersion, comment: 'Sửa OCR N1 theo báo cáo kiểm tra chuyên sâu',
    });
    const verified = await request(reviewer, 'GET', `/api/v1/admin/groups/${item.groupId}`);
    const failedFix = item.fixes.find((fix) => !groupFixApplied(verified, fix));
    if (verified.version.version !== newVersion || verified.version.status !== 'approved' || failedFix) {
      throw new Error(`postcondition failed${failedFix ? ` for Q${failedFix.question_number}` : ''}`);
    }
    journal.groups[item.groupId] = { verified: true, newVersion, examSlugs: item.examSlugs, fixes: item.fixes.length };
    groupsAppliedThisRun += 1;
    saveJournal(journal);
    console.log(`group ${item.groupId} v${newVersion} approved fixes=${item.fixes.length}`);
  } catch (error) {
    journal.errors.push({ phase: 'group', id: item.groupId, message: String(error), at: new Date().toISOString() });
    saveJournal(journal);
    throw error;
  }
}

if (!skipExplanations && groupsAppliedThisRun < maxGroups) {
  for (const item of plan.explanationPlans) {
    if (journal.explanations[item.questionId]?.verified) continue;
    try {
      const listed = await request(editor, 'GET', `/api/v1/admin/explanations?questionId=${encodeURIComponent(item.questionId)}&status=approved`);
      const current = [...listed.items].sort((a, b) => b.version - a.version)[0];
      if (!current) throw new Error('approved explanation missing');
      let draft = structuredClone(current.content);
      for (const fix of item.fixes) {
        const currentCount = countIn(draft.transcript, fix.current);
        const expectedCount = countIn(draft.transcript, fix.expected);
        if (currentCount === 1) {
          draft = replaceIn(draft, fix.current, fix.expected);
        } else if (expectedCount >= 1) {
          continue;
        } else {
          throw new Error(`explanation precondition mismatch for Q${fix.question_number}`);
        }
      }
      draft.questionId = item.questionId;
      if (hash(draft) === hash(current.content)) {
        journal.explanations[item.questionId] = { verified: true, id: current.id, version: current.version, fixes: item.fixes.length, recovered: true };
        saveJournal(journal);
        console.log(`explanation ${item.questionId} v${current.version} recovered fixes=${item.fixes.length}`);
        continue;
      }
      const created = await request(editor, 'POST', '/api/v1/admin/explanations', draft);
      await request(reviewer, 'POST', `/api/v1/admin/explanations/${created.id}/reviews`, {
        decision: 'approved', comments: 'Sửa transcript N1 theo báo cáo kiểm tra chuyên sâu',
      });
      const verified = await request(reviewer, 'GET', `/api/v1/admin/explanations/${created.id}`);
      const failedFix = item.fixes.find((fix) => countIn(verified.content, fix.expected) < 1);
      if (verified.status !== 'approved' || failedFix) throw new Error('explanation postcondition failed');
      journal.explanations[item.questionId] = { verified: true, id: created.id, version: created.version, fixes: item.fixes.length };
      saveJournal(journal);
      console.log(`explanation ${item.questionId} v${created.version} approved fixes=${item.fixes.length}`);
    } catch (error) {
      journal.errors.push({ phase: 'explanation', id: item.questionId, message: String(error), at: new Date().toISOString() });
      saveJournal(journal);
      throw error;
    }
  }
}

if (!skipPublish && groupsAppliedThisRun < maxGroups) {
  const affected = new Set(Object.values(journal.groups).flatMap((item) => item.examSlugs || []));
  const listed = await request(publisher, 'GET', '/api/v1/admin/exams?level=N1');
  for (const slug of affected) {
    if (journal.publishedExams[slug]) continue;
    const exam = listed.items.find((item) => item.slug === slug);
    if (!exam) throw new Error(`exam not found: ${slug}`);
    const published = await request(publisher, 'POST', `/api/v1/admin/exams/${exam.id}/publish`, {});
    journal.publishedExams[slug] = { verified: true, examId: exam.id, version: published.version ?? published.publishedVersion };
    saveJournal(journal);
    console.log(`published ${slug} version=${journal.publishedExams[slug].version}`);
  }
}

console.log(JSON.stringify({
  groupsVerified: Object.keys(journal.groups).length,
  explanationsVerified: Object.keys(journal.explanations).length,
  examsPublished: Object.keys(journal.publishedExams).length,
  errors: journal.errors.length,
}, null, 2));
