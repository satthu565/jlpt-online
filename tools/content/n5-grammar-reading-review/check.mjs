import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema, RichBlockSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';
const m=JSON.parse(fs.readFileSync(new URL('./manifest.json',import.meta.url),'utf8'));
const compositions=JSON.parse(fs.readFileSync(new URL('./composition-review.json',import.meta.url),'utf8'));
const inventory=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const groups=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const text=v=>Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?(v.text??['blocks','content','children','rows'].map(k=>text(v[k])).join('')):'';
const countBlanks=v=>Array.isArray(v)?v.reduce((n,x)=>n+countBlanks(x),0):v&&typeof v==='object'?(v.t==='blank'?1:Object.values(v).reduce((n,x)=>n+countBlanks(x),0)):0;
const fixes=new Map(m.fixes.map(f=>[f.questionId,f]));
const passageFixes=new Map(m.groupFixes.map(f=>[f.groupId,f]));
assert.deepEqual(m.scope,{exams:11,questions:281});
assert.equal(fixes.size,13);assert.equal(passageFixes.size,1);
let total=0,explanations=0,compositionCount=0,textGrammar=0;const changes=[],seen=new Set();
for(const e of inventory)for(const q of e.items.filter(q=>q.section_code==='language_grammar_reading')){
 total++;const f=fixes.get(q.question_id);
 const before={stem:q.stem,options:q.options.map(o=>({orderIndex:o.order_index,content:o.content})),correctOption:q.correct_option,explanation:q.explanation};
 const after=f?.after??before;
 if(f){
  assert.deepEqual(f.before,before);assert.equal(f.questionVersion,q.q_version);assert.equal(f.number,q.exam_question_num);assert.equal(f.groupId,q.group_id);
  if(after.correctOption!==q.correct_option)changes.push([e.exam.slug,q.exam_question_num,q.correct_option,after.correctOption]);
  if(JSON.stringify(after.explanation)!==JSON.stringify(before.explanation)){
   explanations++;const draft=makeExplanation({language:'vi',origin:'official_past_exam'},f,q.q_version+1);
   assert.equal(Object.keys(draft.wrongReasonsByOption).length,3);assert(!draft.wrongReasonsByOption[after.correctOption]);
   assert.equal(Number(text(after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u)?.[1]),after.correctOption);
  }
 }
 RichTextSchema.parse(after.stem);assert.equal(after.options.length,4);assert.deepEqual(after.options.map(o=>o.orderIndex),[1,2,3,4]);
 for(const o of after.options)RichTextSchema.parse(o.content);
 assert.equal(new Set(after.options.map(o=>text(o.content))).size,4);
 if(after.explanation)for(const block of after.explanation.blocks)RichBlockSchema.parse(block);
 assert.equal(JSON.stringify(after).normalize('NFC'),JSON.stringify(after));assert(!JSON.stringify(after).includes('\uFFFD'));
 if(['n5-2022-12','n5-2024-12'].includes(e.exam.slug)){
  assert.deepEqual(after.stem,before.stem);assert.deepEqual(after.options,before.options);assert.equal(after.correctOption,before.correctOption);
 }
 if(q.mondai_type==='sentence_composition'){
  compositionCount++;const c=compositions.find(c=>c.questionId===q.question_id);assert(c);
  if(c.deferred){assert.equal(e.exam.slug,'n5-2024-12');assert.equal(q.exam_question_num,32);assert(!f);}
  else{
   assert.deepEqual([...c.order].sort(),[1,2,3,4]);const slots=after.stem.filter(n=>['blank','star'].includes(n.t));assert.equal(slots.length,4);assert.equal(slots.filter(n=>n.t==='star').length,1);
   assert.equal(c.starPosition,slots.findIndex(n=>n.t==='star')+1);assert.equal(c.order[c.starPosition-1],after.correctOption);
   let i=0;const complete=after.stem.map(n=>['blank','star'].includes(n.t)?text(after.options[c.order[i++]-1].content):text(n)).join('');assert.equal(complete,c.sentence);
  }
 }
 if(!seen.has(q.group_id)){
  seen.add(q.group_id);const g=groups.find(g=>g.id===q.group_id);assert(g);const gf=passageFixes.get(g.id);if(gf){assert.deepEqual(gf.before,g.passage);assert.equal(gf.groupVersion,g.version);}
  const passage=gf?.after??g.passage;for(const block of passage)RichBlockSchema.parse(block);
  assert.equal(JSON.stringify(passage).normalize('NFC'),JSON.stringify(passage));
  if(q.mondai_type==='text_grammar'){
   const count=inventory.flatMap(e=>e.items).filter(x=>x.group_id===q.group_id).length;textGrammar+=count;
   if(e.exam.slug==='n5-2012-12'){assert.equal(count,2);assert.equal(countBlanks(passage),5);}
   else assert.equal(countBlanks(passage),count);
  }
 }
}
assert.equal(total,281);assert.equal(explanations,10);assert.equal(compositionCount,49);assert.equal(compositions.length,49);assert.equal(textGrammar,46);
assert.deepEqual(changes,m.keyChanges);
const corrected=m.fixes.find(f=>f.slug==='n5-2018-12'&&f.number===53);assert(!text(corrected.after.stem).includes('で出かけました'));
assert(text(m.groupFixes[0].after).includes('行っていました。'));
console.log(JSON.stringify({verified:true,exams:11,questions:total,questionRevisions:fixes.size,passageRevisions:passageFixes.size,explanations,compositions:compositionCount,completeCompositions:48,textGrammarQuestions:textGrammar,keyChanges:changes}));
