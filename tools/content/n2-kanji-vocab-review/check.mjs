import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';
const m=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const text=v=>Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?(v.text??['blocks','children','content'].map(k=>text(v[k])).join('')):'';
const seen=new Set();let blanks=0,explanations=0;
assert.deepEqual(m.scope,{exams:31,questions:964});assert.deepEqual(m.keyChanges,[]);
for(const f of m.fixes){
 assert(!seen.has(f.questionId));seen.add(f.questionId);
 RichTextSchema.parse(f.after.stem);
 for(const o of f.after.options)RichTextSchema.parse(o.content);
 assert.deepEqual(f.after.options.map(o=>o.orderIndex),[1,2,3,4]);
 assert.equal(new Set(f.after.options.map(o=>text(o.content))).size,4);
 assert.equal(f.after.correctOption,f.before.correctOption);
 assert(!/KHONG_DOC_RO|\uFFFD/u.test(JSON.stringify(f.after)));
 assert.equal(JSON.stringify(f.after).normalize('NFC'),JSON.stringify(f.after));
 if(f.reasons.some(r=>r.includes('blank node'))){blanks++;assert.equal(f.after.stem.filter(n=>n.t==='blank').length,1);}
 if(f.reasons.some(r=>r.includes('underline boundaries')))assert.equal(text(f.before.stem).replace('\u3057\u304b\u3063\u305f\u306a\u3044','\u3057\u304b\u305f\u306a\u3044'),text(f.after.stem));
 const header=text(f.after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);assert(header);assert.equal(Number(header[1]),f.after.correctOption);
 if(JSON.stringify(f.before.explanation)!==JSON.stringify(f.after.explanation)){
  explanations++;
  const draft=makeExplanation({language:'vi',origin:'official_past_exam'},f,f.questionVersion+1);
  assert.equal(Object.keys(draft.wrongReasonsByOption).length,3);
  assert(!draft.wrongReasonsByOption[f.after.correctOption]);
  const correct=text(f.after.options[f.after.correctOption-1].content);
  const correctBlock=f.after.explanation.blocks.find(b=>text(b).includes('Đáp án đúng:'));
  assert(text(correctBlock).includes(correct),`Correct choice absent from rationale: ${f.slug} Q${f.number}`);
 }
}
assert.equal(m.fixes.filter(f=>f.reasons.some(r=>r.startsWith('Replace unrelated'))).length,28);
console.log(JSON.stringify({verified:true,questions:seen.size,exams:new Set(m.fixes.map(f=>f.slug)).size,blanks,explanations,answerChanges:0}));
