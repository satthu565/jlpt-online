# N4 文法・読解 audit and versioned correction

Owner request: inspect all N4 grammar/reading content, correct inaccuracies and carefully reread the corrections. Inventory date: 2026-11-07. **15 imported exams, 464 questions** in language_grammar_reading. **435 questions in 14 exams reviewed**; all **29 questions of December 2022 remain unchanged** at the owner's explicit instruction to wait for its original booklet.

The manifest prepares **22 question revisions and 5 passage revisions in 12 exams**, including **16 explanation revisions**, with **zero answer-index changes**. Groups with passage changes affect 435-question scope only; kanji/vocabulary and listening must remain unchanged. Historical published versions are immutable.

Read all nondeferred stems, choices, stored answers, passages and correct-answer rationales. Read every table and inspect the two image-based information sheets for July 2021 and December 2024. Independently assembled **all 61 nondeferred sentence-composition questions** and recorded order, actual star position and full sentence in composition-review.json. Verified all **64 text-grammar questions** have matching passage blanks. Suspicious transcription cases were compared visually with rendered local PDFs under /srv/jlpt-extract/de-goc/N4/.

## Corrections

- 2010–2011 Q65: stored answer 3 agrees with the passage about unfamiliar work, but its explanation wrongly selects 4. Replace the rationale and restore missing する in distractor 2. No key change.
- December 2012 Q37: remove fixed に after the answer blank; otherwise selecting に produces 母親にに似る. Source booklet p5 Q3 has 母親（ ）にる.
- December 2013 Q54: remove yy from the stem and obsolete rationale. The scan p6 also contains yy; this is an editorial cleanup.
- 2019 Q22: restore missing か in しなければならないから; December 2021 Q29: restore the boundary between どのくらい and いる.
- July 2024 Q34: add destination particle に before こなかった; Q40: correct malformed apology 遅れなって to 遅れて (the source p5/p6 also has these defects). Q54: correct 降りたくなって所 to 降りたくなった所 in distractor 2.
- July 2021 explanations: replace corrupted gi option note (Q32), clarify 安心させる without a false blanket ban on Vていることができる (Q37), translate emphatic 200本も as “tới 200”, not “hơn 200” (Q42), and synchronize 静かで rather than 静かに (Q44).
- Correct explanation of 待たせる without wrongly labelling 待つ intransitive (December 2013 Q39), resulting-state 落ちていました instead of ongoing falling (July 2014 Q47), and frequency adverb ときどき modifying 飲みたくなる (December 2021 Q44).
- July 2023 Q52: supply the missing explanation from the actual Nakanishi email.
- December 2024: remove an incorrect instantaneous-action requirement for 間に (Q36), remove unsupported “first month” from the first-payment explanation (Q51), and replace literal backslash-n text with structured rationales for the factory conditions and reservation deadlines (Q56/Q57).
- July 2025 Q47: explain しか with negation without falsely claiming だけ can never be used with a negative verb.
- Passage repairs: connector punctuation (December 2018 swimming essay), causal punctuation (July 2021 diary passage), きれいでした and missing stop after the Kyoto-travel blank (December 2021 library essay, also malformed in source p7), sentence punctuation (July 2024 bus-travel essay), and the misplaced ① underline in December 2024 Kyoto story. The source p24/p25 marks 行かない; move ① away from 私の気持ちは変わりませんでした and align the question's underline boundary while preserving full wording except marker placement.

Second reading checked the completed revised stems/options, all revised explanations, all five resulting passages, every reviewed star order, the preserved question/answer inventory and the source limitations below. It caught the missing sentence stop at a paragraph boundary; that case has a specific assertion in check.mjs.

## Deferred and unresolved sources

- **December 2022, all 29 questions:** no edits of any kind, per owner instruction. No invented reconstruction or new labels.
- **July 2023 Q51:** the available PDF p3 itself prints only choices 1–3. Current key 3 agrees with the paragraph, but a fourth choice cannot be restored from this source. Keep existing three choices and report the gap; do not fabricate a fourth.
- **July 2023 Q53 / reading group 8cc507f5-0cd8-4b3a-af6c-979ba1c813c8:** first half of the original reading source is absent. Keep this entire group unchanged pending the original. It also has group version 2 while its three question rows only have version 1, so the editor group API returns null question versions. Planning deliberately does not silently filter null rows or reconstruct that group. Other groups are checked normally.

## Operation

Run from the worktree:

```bash
pnpm --filter @jlpt/schema build
node tools/content/n4-grammar-reading-review/check.mjs <private-inventory.json> <private-groups.json>
N4_GR_REPAIR_DIR=<private-operation-dir> N4_GR_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n4-grammar-reading-review/repair.mjs plan
# Require exact-commit CI success and a fresh pg_dump validated with pg_restore --list.
N4_GR_REPAIR_DIR=<same-dir> N4_GR_REPAIR_AUTH=<same-auth-env> \
N4_GR_REPAIR_CI_COMMIT=<successful-sha> N4_GR_REPAIR_EXPECTED_COMMIT=<same-sha> \
N4_GR_REPAIR_BACKUP=<fresh-dump> N4_GR_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n4-grammar-reading-review/repair.mjs apply
N4_GR_REPAIR_DIR=<same-dir> N4_GR_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n4-grammar-reading-review/repair.mjs verify
```

The planner pins full current question/group content, group publication version and old approved explanation content; absent explanations are guarded as absent before creation. Writes go only through editor → reviewer → publisher APIs, creating new approved versions and new exam snapshots. No SQL writes or migrations. Baseline/verify-published.py compares all N4 snapshots and keys, allowlists the five exact passage changes, and hashes historical question/group/explanation/answer/exam-version rows and snapshot files. Preserve all kanji/vocabulary, listening, deferred questions and unmodified passages.

The owner's request authorizes these content corrections, subject to backup and CI. Data changes cannot be previewed independently on :3210 because it shares the live database/API. Open the actual site after publication before reporting live completion. Private operational records distinguish preparation from application.

Local checks: full content/schema/rationale/NFC/choice/blank/star audit, lint, typecheck, build, UI primitives, no-mock and docs map pass. Full pnpm test reports the external coordinator Scenario 10 failure at tests/integration/dac-ta-runner.test.ts:777 (check.ok false), also observed before this content audit. Do not modify or bypass that unrelated runtime check. Require successful GitHub CI before applying.

Read-only publication verification also passes: all 464 current grammar/reading stems, choices and stored keys match all 15 published snapshots; all 22 question patches and 5 passage patches pin that published content exactly. Review baseline hashed 112 historical files. This is a review baseline, not a substitute for the fresh backup/baseline required immediately before any later apply.
