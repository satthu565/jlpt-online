import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RichTextSchema, RichBlockSchema } from '../../../packages/schema/dist/index.js';

const manifestPath = new URL('./manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.reviewDate, '2026-11-09');
assert.equal(manifest.scope.exams, 5);
assert.equal(manifest.scope.questions, 61);
assert.equal(manifest.scope.groups, 2);
assert.deepEqual(manifest.keyChanges, []);

const seenQuestions = new Set();
for (const fix of manifest.fixes) {
  assert(!seenQuestions.has(fix.questionId), `Duplicate questionId: ${fix.questionId}`);
  seenQuestions.add(fix.questionId);

  // Validate stem & options schema
  RichTextSchema.parse(fix.after.stem);
  assert([3, 4].includes(fix.after.options.length), `Question ${fix.slug} Q${fix.number} must have 3 or 4 options`);
  assert.deepEqual(
    fix.after.options.map(o => o.orderIndex),
    Array.from({ length: fix.after.options.length }, (_, i) => i + 1),
    `Options ordering invalid in ${fix.slug} Q${fix.number}`
  );

  for (const opt of fix.after.options) {
    RichTextSchema.parse(opt.content);
  }

  // Answer key must not change
  assert.equal(fix.after.correctOption, fix.before.correctOption, `Answer key changed on ${fix.slug} Q${fix.number}`);

  // No mojibake or raw markers
  const jsonStr = JSON.stringify(fix.after);
  assert(!jsonStr.includes('\uFFFD'), `Mojibake in ${fix.slug} Q${fix.number}`);
  assert.equal(jsonStr.normalize('NFC'), jsonStr, `Non-NFC text in ${fix.slug} Q${fix.number}`);
}

const seenGroups = new Set();
for (const gf of manifest.groupFixes) {
  assert(!seenGroups.has(gf.groupId), `Duplicate groupId: ${gf.groupId}`);
  seenGroups.add(gf.groupId);

  for (const block of gf.after) {
    RichBlockSchema.parse(block);
  }

  const jsonStr = JSON.stringify(gf.after);
  assert(!jsonStr.includes('\uFFFD'), `Mojibake in group ${gf.slug} ${gf.groupId}`);
  assert.equal(jsonStr.normalize('NFC'), jsonStr, `Non-NFC text in group ${gf.slug} ${gf.groupId}`);
}

console.log(JSON.stringify({
  verified: true,
  exams: manifest.scope.exams,
  questionFixes: manifest.fixes.length,
  groupFixes: manifest.groupFixes.length,
  keyChanges: 0
}));
