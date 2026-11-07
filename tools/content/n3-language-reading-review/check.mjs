import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema, RichBlockSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';

const m = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const text = v => Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object' ? (v.text ?? ['blocks', 'children', 'content', 'rows'].map(k => text(v[k])).join('')) : '';
assert.deepEqual(m.scope, { exams: 30, questions: 1160, grammarForm: 390, sentenceComposition: 150, textGrammar: 140, reading: 480 });
const seen = new Set();
let explanations = 0, passages = 0;
for (const f of m.fixes) {
  assert(!seen.has(f.questionId)); seen.add(f.questionId);
  RichTextSchema.parse(f.after.stem);
  for (const o of f.after.options) RichTextSchema.parse(o.content);
  assert.deepEqual(f.after.options.map(o => o.orderIndex), [1, 2, 3, 4]);
  assert.equal(new Set(f.after.options.map(o => text(o.content))).size, 4);
  assert.equal(JSON.stringify(f.after).normalize('NFC'), JSON.stringify(f.after));
  assert(!/KHONG_DOC_RO|\uFFFD/u.test(JSON.stringify(f.after)));
  if (f.before.stem.some(s => s.t === 'star')) {
    assert.equal(f.after.stem.filter(s => s.t === 'star').length, 1);
    assert.equal(f.after.stem.filter(s => s.t === 'blank').length, 3);
    const before = f.before.stem.filter(s => ['star', 'blank'].includes(s.t));
    const after = f.after.stem.filter(s => ['star', 'blank'].includes(s.t));
    assert.deepEqual(after, before, 'Star positions must remain unchanged');
  }
  const header = text(f.after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
  assert(header); assert.equal(Number(header[1]), f.after.correctOption);
  if (JSON.stringify(f.before.explanation) !== JSON.stringify(f.after.explanation)) {
    explanations++;
    const draft = makeExplanation({ language: 'vi', origin: 'official_past_exam' }, f, f.groupVersion + 1);
    assert.equal(Object.keys(draft.wrongReasonsByOption).length, 3);
    assert(!draft.wrongReasonsByOption[f.after.correctOption]);
  }
  if (f.passageAfter) {
    passages++;
    for (const b of f.passageAfter) RichBlockSchema.parse(b);
    assert.notDeepEqual(f.passageAfter, f.passageBefore);
  }
}
const get = (slug, n) => m.fixes.find(f => f.slug === slug && f.number === n);
const orders = [
  ['n3-2010-07', 53, [2, 4, 1, 3], 'というような意味だったと思う'],
  ['n3-2011-07', 53, [2, 4, 3, 1], 'やりたいと思うことはやらせてあげたい'],
  ['n3-2015-07', 53, [4, 2, 1, 3], '雨の降らない日が続いている'],
  ['n3-2015-12', 49, [4, 2, 1, 3], '使っている古いものでいつ壊れてもおかしくないのに'],
  ['n3-2015-12', 50, [3, 4, 2, 1], 'あと半年で終わる予定だった駅ビルの建設工事が'],
  ['n3-2021-07', 51, [2, 1, 3, 4], '写真を今選んでいるところだから'],
  ['n3-2022-07', 48, [3, 2, 4, 1], 'あの先生ほどわかりやすく教えてくれる先生は'],
];
for (const [slug, n, order, sentence] of orders) {
  const f = get(slug, n), slots = f.after.stem.filter(s => ['blank', 'star'].includes(s.t));
  assert.equal(order[slots.findIndex(s => s.t === 'star')], f.after.correctOption);
  assert.equal(order.map(i => text(f.after.options[i - 1].content)).join(''), sentence);
}
const paired = get('n3-2010-12', 54).passageAfter[2].content;
assert.deepEqual(paired.filter(s => s.t === 'blank').map(s => s.label), ['19-a', '19-b']);
assert(text(paired).includes('、何でも100円で'));
assert.equal(get('n3-2012-07', 41).after.stem.filter(s => s.t === 'blank').length, 2);
assert(!text(get('n3-2015-07', 53).after.stem).includes('すぐ気にならなくなった'));
assert(!text(get('n3-2015-12', 50).after.stem).includes('あと半年で'));
const changes = m.fixes.filter(f => f.before.correctOption !== f.after.correctOption).map(f => ({ slug: f.slug, number: f.number, questionId: f.questionId, before: f.before.correctOption, after: f.after.correctOption }));
assert.deepEqual(changes, m.keyChanges);
assert.equal(changes.length, 3);
console.log(JSON.stringify({ verified: true, questions: seen.size, exams: new Set(m.fixes.map(f => f.slug)).size, explanations, passages, keyChanges: changes.length, reconstructedSentences: orders.length }));
