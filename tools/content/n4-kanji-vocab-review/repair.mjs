import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ExplanationDraftSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';

const API = 'http://127.0.0.1:4000';
const mode = process.argv[2] ?? 'plan';
assert(['plan', 'apply', 'verify'].includes(mode));
const dir = process.env.N4_REPAIR_DIR;
assert(dir && path.isAbsolute(dir), 'N4_REPAIR_DIR required');
const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.reviewDate, '2026-11-07');
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
  if (typeof old === 'string') {
    if (typeof v === 'string') return v.split(old).length - 1;
    if (Array.isArray(v)) return v.reduce((sum, x) => sum + count(x, old), 0);
    if (v && typeof v === 'object') return Object.values(v).reduce((sum, x) => sum + count(x, old), 0);
    return 0;
  }
  if (typeof old === 'object' && old !== null) {
    if (JSON.stringify(v) === JSON.stringify(old)) return 1;
    if (Array.isArray(v)) return v.reduce((sum, x) => sum + count(x, old), 0);
    if (v && typeof v === 'object') return Object.values(v).reduce((sum, x) => sum + count(x, old), 0);
  }
  return 0;
}

function replace(v, old, next) {
  if (typeof old === 'string') {
    if (typeof v === 'string') return v.split(old).join(next);
    if (Array.isArray(v)) return v.map((x) => replace(x, old, next));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x, old, next)]));
    return v;
  }
  if (typeof old === 'object' && old !== null) {
    if (JSON.stringify(v) === JSON.stringify(old)) return next;
    if (Array.isArray(v)) return v.map((x) => replace(x, old, next));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x, old, next)]));
  }
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
  for (let attempt = 0; attempt < 6; attempt++) {
    let response;
    try {
      response = await fetch(API + route, {
        method,
        headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth.token}`, 'x-totp-code': totp(auth.secret) } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      // A failed write can have reached the server: never replay it blindly.
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

const env = Object.fromEntries(fs.readFileSync(process.env.N4_REPAIR_AUTH, 'utf8').split(/\r?\n/u).filter(Boolean).map((line) => {
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
  return { passage: group.version.passage, audioSha256: group.version.audioSha256,
    questions: group.questions.map(q => ({ stem:q.version.stem,
      options:q.options.map(o=>({orderIndex:o.orderIndex,content:o.content})),
      correctOption:q.correctAnswer.correctOption, explanation:q.version.explanation,
      skill:q.skill,mondaiType:q.mondaiType,origin:q.origin })) };
}
function content(q) {
 return {stem:q.version.stem,options:q.options.map(o=>({orderIndex:o.orderIndex,content:o.content})),correctOption:q.correctAnswer.correctOption,explanation:q.version.explanation};
}
const editor=await login('editor');
const groupGet=id=>raw('GET',`/api/v1/admin/groups/${id}`,undefined,editor);
const examGet=slug=>raw('GET',`/api/v1/exams/${slug}`);
async function explanationGet(id) {
 const result=await raw('GET',`/api/v1/admin/explanations?questionId=${id}&status=approved`,undefined,editor);
 return result.items.sort((a,b)=>b.version-a.version)[0];
}
function text(v) {
 if(Array.isArray(v))return v.map(text).join('');
 if(v && typeof v==='object')return v.text??Object.entries(v).filter(([k])=>!['t','type','locale'].includes(k)).map(([,x])=>text(x)).join('');
 return '';
}
function explanationDraft(existing,fix){return makeExplanation(existing.content,fix,fix.questionVersion+1);}
if(mode==='plan') {
 assert(!fs.existsSync(planPath),'New operation directory required');
 const groups=[],explanations=[],exams=[];
 for(const slug of [...new Set(manifest.fixes.map(f=>f.slug))]){
  const fix=manifest.fixes.find(f=>f.slug===slug),exam=await examGet(slug);
  // Another section may have been published after the review. Exact question
  // versions/content remain pinned below; preserve the latest public context.
  assert(exam.publishedVersion>=fix.publishedVersion,'Published version regressed');
  exams.push({slug,id:fix.examId,sourceVersion:exam.publishedVersion,totalQuestions:exam.totalQuestions});
 }
 const ids=[...new Set(manifest.fixes.map(f=>f.groupId))];
 for(const id of ids){
  const group=await groupGet(id);assert.equal(group.version.status,'approved');
  const before=dto(group),after=structuredClone(before),fixes=manifest.fixes.filter(f=>f.groupId===id);
  for(const fix of fixes){
   const idx=group.questions.findIndex(q=>q.id===fix.questionId);assert(idx>=0);
   const q=group.questions[idx];assert.equal(q.version.version,fix.questionVersion);
   assert.equal(hash(content(q)),hash(fix.before),`Stale Q${fix.number} ${fix.slug}`);
   Object.assign(after.questions[idx],fix.after);
   if(hash(fix.before.explanation)!==hash(fix.after.explanation)){
    const old=await explanationGet(fix.questionId);assert(old,'Missing approved explanation');
    explanations.push({questionId:fix.questionId,beforeId:old.id,beforeHash:hash(old.content),after:{...explanationDraft(old,fix),contentVersion:group.version.version+1}});
   }
  }
  groups.push({id,sourceVersion:group.version.version,beforeHash:hash(before),after,questions:group.questions.map(q=>q.id)});
  if(groups.length%10===0)console.log(`Planned ${groups.length}/${ids.length} groups`);
 }
 const plan={manifestHash:hash(manifest),groups,explanations,exams};save(planPath,plan);
 console.log(JSON.stringify({mode,groups:groups.length,explanations:explanations.length,exams:exams.length,planHash:hash(plan)}));
} else {
 const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));assert.equal(plan.manifestHash,hash(manifest));
 const journal=fs.existsSync(journalPath)?JSON.parse(fs.readFileSync(journalPath,'utf8')):{planHash:hash(plan),groups:{},explanations:{},exams:{}};
 assert.equal(journal.planHash,hash(plan));
 if(mode==='apply'){
  assert(process.env.N4_REPAIR_CI_COMMIT,'CI commit required');assert.equal(process.env.N4_REPAIR_CI_COMMIT,process.env.N4_REPAIR_EXPECTED_COMMIT);
  const backup=process.env.N4_REPAIR_BACKUP;assert(backup&&fs.statSync(backup).size>1048576);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex'),process.env.N4_REPAIR_BACKUP_SHA256);
  // Validate all untouched groups before the first write, and validate again per group.
  for(const item of plan.groups)if(!journal.groups[item.id]){const g=await groupGet(item.id);assert.equal(g.version.version,item.sourceVersion);assert.equal(hash(dto(g)),item.beforeHash);}
  const reviewer=await login('reviewer'),publisher=await login('publisher');
  for(const item of plan.groups){
   if(journal.groups[item.id])continue;
   const current=await groupGet(item.id);assert.equal(current.version.version,item.sourceVersion);assert.equal(hash(dto(current)),item.beforeHash);
   const result=await raw('PATCH',`/api/v1/admin/groups/${item.id}`,item.after,editor);const version=result.version?.version??result.version;
   assert.equal(version,item.sourceVersion+1);
   await raw('POST',`/api/v1/admin/groups/${item.id}/submit-review`,{expectedVersion:version},editor);
   await raw('POST',`/api/v1/admin/groups/${item.id}/reviews`,{decision:'approved',expectedVersion:version,comment:'Owner-authorized N4 kanji/vocabulary correction; source and linguistic self-review 2026-11-07.'},reviewer);
   const checked=await groupGet(item.id);assert.equal(checked.version.status,'approved');assert.equal(hash(dto(checked)),hash(item.after));
   journal.groups[item.id]=version;save(journalPath,journal);console.log(`Approved group ${Object.keys(journal.groups).length}/${plan.groups.length}`);
  }
  for(const item of plan.explanations){
   if(journal.explanations[item.questionId])continue;
   const old=await explanationGet(item.questionId);assert.equal(old.id,item.beforeId);assert.equal(hash(old.content),item.beforeHash);
   const created=await raw('POST','/api/v1/admin/explanations',item.after,editor);
   await raw('POST',`/api/v1/admin/explanations/${created.id}/reviews`,{decision:'approved',comments:'Self-reviewed N4 kanji/vocabulary correction; synchronize answer rationale.'},reviewer);
   const checked=await explanationGet(item.questionId);assert.equal(checked.id,created.id);assert.equal(hash(ExplanationDraftSchema.parse(checked.content)),hash(item.after));
   journal.explanations[item.questionId]={id:created.id,version:checked.version};save(journalPath,journal);
  }
  for(const exam of plan.exams){
   if(journal.exams[exam.id])continue;
   const current=await examGet(exam.slug);assert.equal(current.publishedVersion,exam.sourceVersion);
   const result=await raw('POST',`/api/v1/admin/exams/${exam.id}/publish`,{},publisher);assert.equal(result.version,exam.sourceVersion+1);assert.equal(result.totalQuestions,exam.totalQuestions);
   journal.exams[exam.id]=result.version;save(journalPath,journal);console.log(`${exam.slug} published v${result.version}`);
  }
 } else {
  for(const item of plan.groups){const g=await groupGet(item.id);assert.equal(g.version.version,item.sourceVersion+1);assert.equal(g.version.status,'approved');assert.equal(hash(dto(g)),hash(item.after));}
  for(const item of plan.explanations){const e=await explanationGet(item.questionId);assert.equal(hash(ExplanationDraftSchema.parse(e.content)),hash(item.after));}
  for(const exam of plan.exams){const e=await examGet(exam.slug);assert.equal(e.publishedVersion,journal.exams[exam.id]);assert.equal(e.totalQuestions,exam.totalQuestions);}
  console.log(JSON.stringify({mode,verified:true,groups:plan.groups.length,exams:plan.exams.length}));
 }
}
