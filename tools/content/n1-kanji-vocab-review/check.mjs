import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema } from '../../../packages/schema/dist/index.js';
const m=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const flatten=v=>Array.isArray(v)?v.map(flatten).join(''):v&&typeof v==='object'?(v.text??(v.t==='blank'?'（　）':Object.entries(v).filter(([k])=>!['t','type','locale'].includes(k)).map(([,x])=>flatten(x)).join(''))):'';
const seen=new Set();let keys=0,blanks=0;
for(const f of m.fixes){
 assert(!seen.has(f.questionId));seen.add(f.questionId);
 RichTextSchema.parse(f.after.stem);
 for(const o of f.after.options)RichTextSchema.parse(o.content);
 assert.equal(f.after.options.length,4);assert.equal(new Set(f.after.options.map(o=>flatten(o.content))).size,4);
 assert(f.after.correctOption>=1&&f.after.correctOption<=4);
 assert(!/KHONG_DOC_RO|\uFFFD/u.test(JSON.stringify(f.after)));
 assert.equal(JSON.stringify(f.after).normalize('NFC'),JSON.stringify(f.after));
 if(f.before.correctOption!==f.after.correctOption){keys++;assert.equal(f.slug,'n1-2019-07');assert.equal(f.number,20);assert.equal(f.after.correctOption,4);}
 if(f.reasons.some(r=>r.includes('blank node'))){
  blanks++;assert.equal(f.after.stem.filter(n=>n.t==='blank').length,1);
  const text=flatten(f.after.stem);assert(!/（\s*（|\)\s*\)/u.test(text));
 }
 if(f.reasons.some(r=>r.includes('underline boundaries'))){assert.equal(flatten(f.before.stem),flatten(f.after.stem),'Sentence changed when moving underline');}
 const exp=flatten(f.after.explanation);const header=exp.match(/Đáp án đúng:\s*\[([1-4])\]/u);assert(header);assert.equal(Number(header[1]),f.after.correctOption,'Rationale disagrees with key');
}
assert.equal(keys,1);assert.equal(blanks,56);assert.equal(seen.size,75);
const fix=(slug,n)=>m.fixes.find(f=>f.slug===slug&&f.number===n);
assert.equal(flatten(fix('n1-2021-07',2).after.options[3].content),'へいさ');
assert.deepEqual(fix('n1-2022-07',6).after.options.map(o=>flatten(o.content)),['かこまれて','からまれて','こばまれて','はばまれて']);
assert.equal(flatten(fix('n1-2024-12',16).after.options[3].content),'いいかげんに');
assert(flatten(fix('n1-2025-12',11).after.stem).includes('準備をして'));
console.log(JSON.stringify({verified:true,questions:seen.size,blankFixes:blanks,answerChanges:keys}));
const {makeExplanation}=await import('./explanation.mjs');
for(const f of m.fixes.filter(f=>JSON.stringify(f.before.explanation)!==JSON.stringify(f.after.explanation))){
 const d=makeExplanation({language:'vi',origin:'official_past_exam'},f,f.questionVersion+1);
 assert.equal(Object.keys(d.wrongReasonsByOption).length,3);
 assert(!d.wrongReasonsByOption[f.after.correctOption]);
 if(f.slug==='n1-2015-12')assert(!JSON.stringify(d).includes('まょうぶん'));
 if(f.slug==='n1-2024-12'&&f.number===23)assert(JSON.stringify(d.wrongReasonsByOption['1']).includes('正当に組み立てた'));
}
console.log('All 12 normalized explanation DTOs agree with the reviewed blocks.');
