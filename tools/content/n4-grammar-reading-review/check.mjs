import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema, RichBlockSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';

const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
const m = read('./manifest.json');
const orders = read('./composition-review.json');
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const groups = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const text = v => Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object'
  ? (v.text ?? ['blocks', 'content', 'children', 'rows'].map(k => text(v[k])).join('')) : '';
const fixes = new Map(m.fixes.map(f => [f.questionId, f]));
const passageFixes = new Map(m.groupFixes.map(f => [f.groupId, f]));
assert.equal(fixes.size, m.fixes.length);
assert.equal(passageFixes.size, m.groupFixes.length);
assert.deepEqual(m.scope, { exams: 15, questions: 464, reviewedQuestions: 435 });
assert.deepEqual(m.keyChanges, []);
let questionCount = 0;
let deferredCount = 0;
let explanationCount = 0;
let fixedCount = 0;
let compositionCount = 0;
let textGrammarCount = 0;
const checkedGroups = new Set();
for (const e of inventory) {
  for (const q of e.items.filter(q => q.section_code === 'language_grammar_reading')) {
    questionCount++;
    const f = fixes.get(q.question_id);
    const before = {
      stem: q.stem, options: q.options.map(o => ({ orderIndex: o.order_index, content: o.content })),
      correctOption: q.correct_option, explanation: q.explanation,
    };
    const after = f?.after ?? before;
    if (e.exam.slug === 'n4-2022-12') {
      deferredCount++;
      assert(!f);
      assert(!passageFixes.has(q.group_id));
      assert.deepEqual(after, before);
      continue;
    }
    if (f) {
      fixedCount++;
      assert.deepEqual(f.before, before);
      assert.equal(f.number, q.exam_question_num);
      assert.equal(f.questionVersion, q.q_version);
      assert.equal(f.after.correctOption, q.correct_option);
      assert.equal(f.groupId, q.group_id);
      if (JSON.stringify(f.before.explanation) !== JSON.stringify(f.after.explanation)) {
        explanationCount++;
        const draft = makeExplanation({ language: 'vi', origin: 'official_past_exam' }, f, f.questionVersion + 1);
        assert.equal(Object.keys(draft.wrongReasonsByOption).length, 3);
        assert(!draft.wrongReasonsByOption[f.after.correctOption]);
        const key = text(f.after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
        assert(key);
        assert.equal(Number(key[1]), q.correct_option);
      }
    }
    RichTextSchema.parse(after.stem);
    for (const o of after.options) RichTextSchema.parse(o.content);
    if (after.explanation) for (const b of after.explanation.blocks) RichBlockSchema.parse(b);
    assert(!(e.exam.slug === 'n4-2023-07' && q.exam_question_num === 53 && f), 'Source-incomplete reading group must stay unchanged');
    const missingSourceChoice = e.exam.slug === 'n4-2023-07' && q.exam_question_num === 51;
    assert.equal(after.options.length, missingSourceChoice ? 3 : 4);
    assert.equal(new Set(after.options.map(o => text(o.content))).size, after.options.length);
    assert.deepEqual(after.options.map(o => o.orderIndex), missingSourceChoice ? [1, 2, 3] : [1, 2, 3, 4]);
    assert(after.correctOption >= 1 && after.correctOption <= after.options.length);
    assert(after.explanation, 'Every nondeferred question needs an explanation');
    assert.equal(JSON.stringify(after).normalize('NFC'), JSON.stringify(after));
    assert(!/KHONG_DOC_RO|\uFFFD/u.test(JSON.stringify(after)));
    if (q.mondai_type === 'sentence_composition') {
      compositionCount++;
      const reviewed = orders.find(o => o.questionId === q.question_id);
      assert(reviewed);
      assert.deepEqual([...reviewed.order].sort(), [1, 2, 3, 4]);
      const slots = after.stem.filter(n => ['blank', 'star'].includes(n.t));
      assert.equal(slots.length, 4);
      assert.equal(slots.filter(n => n.t === 'star').length, 1);
      const star = slots.findIndex(n => n.t === 'star');
      assert.equal(reviewed.starPosition, star + 1);
      assert.equal(reviewed.order[star], q.correct_option);
      let cursor = 0;
      const complete = after.stem.map(n => ['blank', 'star'].includes(n.t)
        ? text(after.options[reviewed.order[cursor++] - 1].content) : text(n)).join('');
      assert.equal(complete, reviewed.sentence);
    }
    if (!checkedGroups.has(q.group_id)) {
      checkedGroups.add(q.group_id);
      const g = groups.find(g => g.id === q.group_id);
      assert(g);
      const gf = passageFixes.get(g.id);
      if (gf) {
        assert.deepEqual(gf.before, g.passage);
        assert.equal(gf.groupVersion, g.version);
        assert(gf.questionIds.includes(q.question_id));
      }
      const passage = gf?.after ?? g.passage;
      for (const b of passage) RichBlockSchema.parse(b);
      assert.equal(JSON.stringify(passage).normalize('NFC'), JSON.stringify(passage));
      if (q.mondai_type === 'text_grammar') {
        const related = e.items.filter(other => other.group_id === q.group_id);
        const count = v => Array.isArray(v) ? v.reduce((s, n) => s + count(n), 0) :
          v && typeof v === 'object' ? (v.t === 'blank' ? 1 : Object.values(v).reduce((s, n) => s + count(n), 0)) : 0;
        assert.equal(count(passage), related.length, 'Passage blanks must match text-grammar questions');
        textGrammarCount += related.length;
      }
    }
  }
}
assert.equal(questionCount, 464);
assert.equal(deferredCount, 29);
assert.equal(fixedCount, 22);
assert.equal(explanationCount, 16);
assert.equal(compositionCount, 61);
assert.equal(orders.length, 61);
assert.equal(passageFixes.size, 5);
assert.equal(new Set([...m.fixes, ...m.groupFixes].map(f => f.slug)).size, 12);
for (const gf of m.groupFixes) assert(checkedGroups.has(gf.groupId));
const library = m.groupFixes.find(f => f.slug === 'n4-2021-12');
assert(text(library.after).includes('きれいでした'));
assert(!text(library.after).includes('きれいでいた'));
assert(text(library.after).includes('京都を。森図書館'), 'Sentence stop must exist after Kyoto travel answer');
const kyoto = m.groupFixes.find(f => f.slug === 'n4-2024-12');
assert.equal(text(kyoto.after).replace('①', ''), text(kyoto.before).replace('①', ''));
assert(text(kyoto.after).includes('①行かない'));
console.log(JSON.stringify({ verified: true, exams: 15, questions: questionCount, reviewed: questionCount - deferredCount,
  deferredQuestions: deferredCount, revisions: fixedCount, passageRevisions: passageFixes.size, explanations: explanationCount,
  compositions: compositionCount, textGrammarQuestions: textGrammarCount, answerChanges: 0, sourceMissingFourthChoice: 1 }));
