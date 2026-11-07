import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';
const manifest = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const text = v => typeof v === 'string' ? v : Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object' ? v.text ?? ['blocks', 'children', 'content'].map(k => text(v[k])).join('') : '';
assert.deepEqual(manifest.scope, { exams: 30, questions: 1049 });
assert.deepEqual(manifest.keyChanges, []);
const seen = new Set();
let blanks = 0, explanations = 0, underlines = 0;
for (const fix of manifest.fixes) {
  assert(!seen.has(fix.questionId)); seen.add(fix.questionId);
  assert(fix.slug.startsWith('n3-') && fix.number >= 1 && fix.number <= 35);
  assert.notDeepEqual(fix.after, fix.before);
  RichTextSchema.parse(fix.after.stem);
  for (const option of fix.after.options) RichTextSchema.parse(option.content);
  assert.deepEqual(fix.after.options.map(o => o.orderIndex), [1, 2, 3, 4]);
  assert.equal(new Set(fix.after.options.map(o => text(o.content))).size, 4);
  assert.equal(fix.after.correctOption, fix.before.correctOption);
  const serialized = JSON.stringify(fix.after);
  assert.equal(serialized, serialized.normalize('NFC'));
  assert(!/KHONG_DOC_RO|\uFFFD|\[\{'t':|[가-힣]|わ客|nagonameru/u.test(serialized));
  const header = text(fix.after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
  assert(header); assert.equal(Number(header[1]), fix.after.correctOption);
  if (fix.reasons.some(r => r.includes('blank node'))) {
    blanks++; assert.equal(fix.after.stem.filter(n => n.t === 'blank').length, 1);
    assert(!/[（(][\s＿_]*[）)]/u.test(text(fix.after.stem)));
  }
  if (fix.reasons.some(r => r.includes('underline boundaries'))) {
    underlines++; assert.equal(text(fix.before.stem), text(fix.after.stem));
    assert.equal(fix.after.stem.filter(n => n.t === 'underline').length, 1);
  }
  if (JSON.stringify(fix.before.explanation) !== JSON.stringify(fix.after.explanation)) {
    explanations++;
    const draft = makeExplanation({ language: 'vi', origin: 'official_past_exam' }, fix, fix.questionVersion + 1);
    assert.equal(Object.keys(draft.wrongReasonsByOption).length, 3);
    assert(!draft.wrongReasonsByOption[fix.after.correctOption]);
    const block = fix.after.explanation.blocks.find(b => text(b).includes('Đáp án đúng:'));
    assert(text(block).includes(text(fix.after.options[fix.after.correctOption - 1].content)), `${fix.slug} Q${fix.number}: answer text missing`);
  }
}
if (process.argv[2]) {
  const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert.equal(rows.length, manifest.scope.questions);
  assert.equal(new Set(rows.map(q => q.slug)).size, manifest.scope.exams);
  for (const q of rows) {
    assert.equal(q.sec, 'language_vocab'); assert.equal(q.status, 'approved');
    const replacement = manifest.fixes.find(f => f.questionId === q.qid);
    const value = replacement?.after ?? { stem: q.stem, options: q.opts.map(o => ({ orderIndex: o.i, content: o.c })), correctOption: q.ans, explanation: q.expl };
    RichTextSchema.parse(value.stem);
    for (const option of value.options) RichTextSchema.parse(option.content);
    assert.deepEqual(value.options.map(o => o.orderIndex), [1, 2, 3, 4]);
    assert.equal(new Set(value.options.map(o => text(o.content))).size, 4);
    assert(value.correctOption >= 1 && value.correctOption <= 4);
    if (q.mt === 'contextual') assert.equal(value.stem.filter(n => n.t === 'blank').length, 1);
    if (['kanji_reading', 'orthography', 'paraphrase'].includes(q.mt)) assert(value.stem.some(n => n.t === 'underline'));
    const answer = text(value.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
    assert(answer); assert.equal(Number(answer[1]), value.correctOption);
  }
}
console.log(JSON.stringify({ verified: true, correctedQuestions: seen.size, exams: new Set(manifest.fixes.map(f => f.slug)).size, blanks, underlines, explanations, answerChanges: 0 }));

// Read the completed sentences as learners will see them, not only node shapes.
const completed = (slug, number) => {
  const fix = manifest.fixes.find(f => f.slug === slug && f.number === number);
  assert(fix);
  const answer = text(fix.after.options[fix.after.correctOption - 1].content);
  return fix.after.stem.map(n => n.t === 'blank' ? answer : text(n)).join('');
};
assert.equal(completed('n3-2011-07', 25), '将来のために、お金をためています。');
assert.equal(completed('n3-2013-07', 15), 'のどがかわいたので、何か飲みたい。');
assert.equal(completed('n3-2011-12', 24), '台風の影響で飛行機の出発が遅れた。');
assert(completed('n3-2016-07', 24).includes('他の国からの輸入に頼っている'));
assert(completed('n3-2024-07', 18).includes('消極的なので'));
