import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { RichTextSchema, RichBlockSchema } from '../../../packages/schema/dist/index.js';
import { makeExplanation } from './explanation.mjs';

const m = JSON.parse(fs.readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const groups = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const text = v => Array.isArray(v) ? v.map(text).join('') : v && typeof v === 'object'
  ? (v.t === 'image' ? v.alt ?? '' : v.text ?? ['blocks', 'content', 'children', 'rows'].map(k => text(v[k])).join('')) : '';
const signature = v => JSON.stringify(v);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.deepEqual(m.scope, { exams: 11, questions: 297 });
assert.deepEqual(m.keyChanges, []);
assert.equal(inventory.length, 11);
const patches = new Map(m.fixes.map(f => [f.questionId, f]));
assert.equal(patches.size, 14);
let questions = 0;
let explanations = 0;
let matched = 0;
let boundaries = 0;
let images = 0;
const sourceHashes = new Map();
for (const asset of m.media) {
  const file = fs.readFileSync(new URL(asset.filename, import.meta.url));
  assert.equal(digest(file), asset.sha256);
  assert.equal(file.subarray(1, 4).toString(), 'PNG');
  assert.equal(file.readUInt32BE(16), asset.width);
  assert.equal(file.readUInt32BE(20), asset.height);
  assert.equal(asset.mediaKey, 'media/' + asset.sha256 + '.png');
  if (!sourceHashes.has(asset.sourcePdf)) sourceHashes.set(asset.sourcePdf, digest(fs.readFileSync(asset.sourcePdf)));
  assert.equal(sourceHashes.get(asset.sourcePdf), asset.sourceSha256);
}
assert.equal(m.media.length, 8);
for (const exam of inventory) {
  for (const q of exam.items.filter(q => q.section_code === 'language_vocab')) {
    questions++;
    const before = {
      stem: q.stem, options: q.options.map(o => ({ orderIndex: o.order_index, content: o.content })),
      correctOption: q.correct_option, explanation: q.explanation,
    };
    const fix = patches.get(q.question_id);
    const after = fix?.after ?? before;
    if (fix) {
      matched++;
      assert.deepEqual(fix.before, before);
      assert.equal(fix.questionVersion, q.q_version);
      assert.equal(fix.groupId, q.group_id);
      assert.equal(fix.slug, exam.exam.slug);
      assert.equal(fix.number, q.exam_question_num);
      assert.equal(after.correctOption, before.correctOption);
      if (fix.reasons.some(r => r.startsWith('Align underline'))) {
        boundaries++;
        assert.equal(text(after.stem), text(before.stem));
      }
      if (signature(after.explanation) !== signature(before.explanation)) {
        explanations++;
        const draft = makeExplanation({ language: 'vi', origin: 'official_past_exam' }, fix, q.q_version + 1);
        assert.equal(Object.keys(draft.wrongReasonsByOption).length, 3);
        assert(!draft.wrongReasonsByOption[String(after.correctOption)]);
        const h = text(after.explanation).match(/Đáp án đúng:\s*\[([1-4])\]/u);
        assert(h);
        assert.equal(Number(h[1]), after.correctOption);
      }
    }
    RichTextSchema.parse(after.stem);
    for (const block of after.explanation.blocks) RichBlockSchema.parse(block);
    for (const o of after.options) {
      RichTextSchema.parse(o.content);
      for (const node of o.content.filter(n => n.t === 'image')) {
        images++;
        const asset = m.media.find(a => a.mediaKey === node.mediaKey);
        assert(asset);
        assert.equal(asset.slug, exam.exam.slug);
        assert.equal(asset.number, q.exam_question_num);
        assert.equal(asset.option, o.orderIndex);
        assert.equal(node.width, asset.width);
        assert.equal(node.height, asset.height);
        assert.equal(node.alt, 'Phương án ' + o.orderIndex + ' (ảnh nguồn)');
      }
    }
    assert.deepEqual(after.options.map(o => o.orderIndex), [1, 2, 3, 4]);
    assert.equal(new Set(after.options.map(o => signature(o.content))).size, 4);
    // Variation selectors must not hide two visibly equal textual choices.
    const visible = after.options.map(o => signature(o.content).replace(/[\uFE00-\uFE0F]/gu, ''));
    assert.equal(new Set(visible).size, 4);
    assert(after.correctOption >= 1 && after.correctOption <= 4);
    assert.equal(signature(after).normalize('NFC'), signature(after));
    assert(!/KHONG_DOC_RO|\uFFFD/u.test(signature(after)));
    if (q.mondai_type === 'contextual') assert.equal(after.stem.filter(n => n.t === 'blank').length, 1);
    if (exam.exam.slug === 'n5-2024-12') assert(!fix, 'Missing original booklet: preserve this exam');
    if (exam.exam.slug === 'n5-2022-12' && fix) {
      assert.equal(q.exam_question_num, 2);
      assert.deepEqual(after.stem, before.stem);
      assert.deepEqual(after.options, before.options);
    }
    const g = groups.find(g => g.id === q.group_id);
    assert(g);
    for (const block of g.passage) RichBlockSchema.parse(block);
  }
}
assert.equal(questions, 297);
assert.equal(matched, 14);
assert.equal(explanations, 8);
assert.equal(boundaries, 6);
assert.equal(images, 8);
assert.equal(new Set(m.fixes.map(f => f.slug)).size, 7);
for (const d of m.deferred) assert(!m.fixes.some(f => f.slug === d.slug && f.number === d.number));
const find = (slug, n) => m.fixes.find(f => f.slug === slug && f.number === n).after;
assert(text(find('n5-2023-07', 7).stem).endsWith('いますか。'));
assert(!text(find('n5-2013-07', 8).explanation).includes('có âm ngắt ん'));
assert(!text(find('n5-2021-12', 13).explanation).includes('thực vật/đồ ăn'));
console.log(JSON.stringify({ verified: true, exams: 11, questions, revisions: matched, revisedExplanations: explanations,
  underlineCorrections: boundaries, sourceImageChoices: images, affectedExams: 7, answerChanges: 0, deferredAmbiguousQuestions: 3 }));
