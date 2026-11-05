import crypto from 'node:crypto';
import fs from 'node:fs';

const API = 'http://127.0.0.1:4000';
const workDir = process.env.N1_FIX_WORK_DIR || '/tmp';
const AUTH_ENV = `${workDir}/n1-safe-fix-auth.env`;
const BUNDLE = `${workDir}/n1-safe-fix-bundle.json`;
const PLAN = `${workDir}/n1-safe-fix-api-plan.json`;

function loadEnv(path) {
  return Object.fromEntries(
    fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
  );
}

function decodeBase32(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of value.replace(/=+$/u, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index >= 0) bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
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
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${API}${path}`, options);
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (response.ok) return body;
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(body?.details?.retryAfterSec) || Number(response.headers.get('retry-after')) || 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
      continue;
    }
    throw new Error(`${path} -> ${response.status}: ${body?.message || body?.error?.message || 'error'}`);
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
  return { token, secret };
}

async function request(auth, path) {
  const result = await rawRequest(path, { headers: { authorization: `Bearer ${auth.token}`, 'x-totp-code': totp(auth.secret) } });
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

function questionInput(question) {
  return {
    stem: question.version.stem,
    options: question.options.map((option) => ({ orderIndex: option.orderIndex, content: option.content })),
    correctOption: question.correctAnswer.correctOption,
    explanation: question.version.explanation,
    skill: question.skill,
    mondaiType: question.mondaiType,
    origin: question.origin,
  };
}

const env = loadEnv(AUTH_ENV);
const editor = await login(env.EDITOR_EMAIL, env.EDITOR_PASSWORD, env.EDITOR_TOTP_SECRET);
const accepted = JSON.parse(fs.readFileSync(BUNDLE, 'utf8')).accepted;
const contentFixes = accepted.filter((fix) => fix.target_field !== 'transcript');
const transcriptFixes = accepted.filter((fix) => fix.target_field === 'transcript');
const errors = [];
const groupPlans = [];
const explanationPlans = [];

const byGroup = Map.groupBy(contentFixes, (fix) => fix.group_id);
for (const [groupId, fixes] of byGroup) {
  const group = await request(editor, `/api/v1/admin/groups/${groupId}`);
  const beforeHash = hash(group);
  for (const fix of fixes) {
    const question = group.questions.find((item) => item.id === fix.question_id);
    if (!question) {
      errors.push({ ...fix, error: 'question_not_in_group' });
      continue;
    }
    if (fix.target_field === 'stem_richtext') {
      if (!Array.isArray(fix.current) || !Array.isArray(fix.expected) || hash(question.version.stem) !== hash(fix.current)) {
        errors.push({ ...fix, error: 'api_current_stem_richtext_mismatch' });
        continue;
      }
      question.version.stem = structuredClone(fix.expected);
      continue;
    }
    let target;
    if (fix.target_field === 'passage') target = group.version.passage;
    if (fix.target_field === 'stem') target = question.version.stem;
    if (fix.target_field === 'option') target = question.options.find((option) => option.orderIndex === fix.option_index)?.content;
    const occurrences = countIn(target, fix.current);
    if (occurrences !== 1) {
      errors.push({ ...fix, error: `api_current_occurrences_${occurrences}` });
      continue;
    }
    if (fix.target_field === 'passage') group.version.passage = replaceIn(group.version.passage, fix.current, fix.expected);
    if (fix.target_field === 'stem') question.version.stem = replaceIn(question.version.stem, fix.current, fix.expected);
    if (fix.target_field === 'option') {
      const option = question.options.find((item) => item.orderIndex === fix.option_index);
      option.content = replaceIn(option.content, fix.current, fix.expected);
    }
  }
  const dto = {
    passage: group.version.passage,
    audioSha256: group.version.audioSha256,
    questions: group.questions.map(questionInput),
  };
  groupPlans.push({
    groupId,
    examSlugs: [...new Set(fixes.map((fix) => fix.exam_slug))],
    sourceVersion: group.version.version,
    sourceStatus: group.version.status,
    fixes,
    beforeHash,
    afterHash: hash(dto),
    dto,
  });
}

const byQuestion = Map.groupBy(transcriptFixes, (fix) => fix.question_id);
for (const [questionId, fixes] of byQuestion) {
  const listed = await request(editor, `/api/v1/admin/explanations?questionId=${encodeURIComponent(questionId)}&status=approved`);
  const latest = [...listed.items].sort((a, b) => b.version - a.version)[0];
  if (!latest) {
    errors.push({ question_id: questionId, error: 'approved_explanation_not_found', fixes });
    continue;
  }
  const content = structuredClone(latest.content);
  for (const fix of fixes) {
    const transcriptOccurrences = countIn(content.transcript, fix.current);
    if (transcriptOccurrences !== 1) {
      errors.push({ ...fix, error: `api_transcript_occurrences_${transcriptOccurrences}` });
      continue;
    }
    const allOccurrences = countIn(content, fix.current);
    if (allOccurrences < 1) {
      errors.push({ ...fix, error: 'api_content_occurrences_0' });
      continue;
    }
    Object.assign(content, replaceIn(content, fix.current, fix.expected));
  }
  content.questionId = questionId;
  explanationPlans.push({
    questionId,
    examSlugs: [...new Set(fixes.map((fix) => fix.exam_slug))],
    sourceExplanationId: latest.id,
    sourceVersion: latest.version,
    fixes,
    beforeHash: hash(latest.content),
    afterHash: hash(content),
    draft: content,
  });
}

const plan = {
  createdAt: new Date().toISOString(),
  sourceAcceptedFixes: accepted.length,
  groupPlans,
  explanationPlans,
  errors,
};
fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2), { mode: 0o600 });
console.log(JSON.stringify({
  sourceAcceptedFixes: accepted.length,
  plannedGroupFixes: groupPlans.reduce((sum, item) => sum + item.fixes.length, 0),
  plannedGroups: groupPlans.length,
  plannedTranscriptFixes: explanationPlans.reduce((sum, item) => sum + item.fixes.length, 0),
  plannedExplanations: explanationPlans.length,
  errors: errors.length,
  errorTypes: Object.groupBy(errors, (item) => item.error),
}, (key, value) => key === 'errorTypes' ? Object.fromEntries(Object.entries(value).map(([name, items]) => [name, items.length])) : value, 2));
