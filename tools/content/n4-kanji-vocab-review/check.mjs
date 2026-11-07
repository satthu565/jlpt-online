import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';

const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const text = v => Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object'
  ? (v.text ?? ['blocks', 'content', 'children'].map(k => text(v[k])).join('')) : '';
const same = (a, b) => assert.deepEqual(a, b);
const fixes = new Map(manifest.fixes.map(f => [f.questionId, f]));
assert.equal(fixes.size, manifest.fixes.length);
same(manifest.scope, { exams: 15, questions: 448 });
same(manifest.keyChanges, []);
assert.equal(inventory.length, 15);
let questions = 0;
let explanations = 0;
let matched = 0;
const deferredQuestions = [];
for (const exam of inventory) {
  for (const q of exam.items.filter(q => q.section_code === 'language_vocab')) {
    questions++;
    const fix = fixes.get(q.question_id);
    const original = {
      stem: q.stem,
      options: q.options.map(o => ({ orderIndex: o.order_index, content: o.content })),
      correctOption: q.correct_option,
      explanation: q.explanation,
    };
    if (fix) {
      matched++;
      same(fix.before, original);
      assert.equal(fix.slug, exam.exam.slug);
      assert.equal(fix.number, q.exam_question_num);
      assert.equal(fix.questionVersion, q.q_version);
      same(fix.after.correctOption, original.correctOption);
      if (JSON.stringify(fix.before.explanation) !== JSON.stringify(fix.after.explanation)) {
        explanations++;
        const draft = makeExplanation({ language: 'vi', origin: 'official_past_exam' }, fix, q.q_version + 1);
        assert.equal(Object.keys(draft.wrongReasonsByOption).length, 3);
        const match = text(fix.after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
        assert(match);
        assert.equal(Number(match[1]), q.correct_option);
        assert(text(fix.after.explanation).includes(text(fix.after.options[q.correct_option - 1].content)));
      }
      if (fix.reasons.some(r => r.startsWith('Align underline'))) {
        same(text(fix.before.stem), text(fix.after.stem));
      }
    }
    const final = fix?.after ?? original;
    RichTextSchema.parse(final.stem);
    for (const block of final.explanation.blocks) RichTextSchema.parse(block.content);
    for (const option of final.options) RichTextSchema.parse(option.content);
    same(final.options.map(o => o.orderIndex), [1, 2, 3, 4]);
    assert.equal(new Set(final.options.map(o => text(o.content))).size, 4);
    assert(final.correctOption >= 1 && final.correctOption <= 4);
    assert(!/KHONG_DOC_RO|\uFFFD/u.test(JSON.stringify(final)));
    assert.equal(JSON.stringify(final).normalize('NFC'), JSON.stringify(final));
    if (q.mondai_type === 'contextual') assert.equal(final.stem.filter(n => n.t === 'blank').length, 1);
    if (exam.exam.slug === 'n4-2022-12') {
      assert(!fix, 'Owner deferred all December 2022 changes');
      same(final, original);
      deferredQuestions.push(q.question_id);
    }
  }
}
assert.equal(questions, 448);
assert.equal(matched, fixes.size);
assert.equal(deferredQuestions.length, 28);
const find = (slug, n) => manifest.fixes.find(f => f.slug === slug && f.number === n).after;
assert(text(find('n4-2021-07', 18).stem).includes('を　聞きました'));
assert(text(find('n4-2021-12', 16).stem).includes('わたしがかりている'));
assert(!text(find('n4-2012-12', 12).explanation).includes('correctOption'));
assert(text(find('n4-2024-07', 27).options[2].content).includes('水'));
assert.equal(manifest.fixes.length, 20);
assert.equal(explanations, 12);
assert.equal(new Set(manifest.fixes.map(f => f.slug)).size, 9);
assert.equal(manifest.deferred[0].slug, 'n4-2022-12');
console.log(JSON.stringify({ verified: true, exams: 15, questions, revisions: matched, explanations, deferredQuestions: deferredQuestions.length, answerChanges: 0 }));
