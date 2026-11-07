# N5 文字・語彙 audit and versioned corrections

Owner requested checking all N5 vocabulary/kanji questions on the VM, correcting inaccuracies and rereading the corrections. Review date: 2026-11-07. **11 exams, 297 questions** reviewed: stems, choices, stored keys and correct-answer rationales, plus all four existing picture-question images. Compare suspected transcription/underline issues and visual glyph distinctions against rendered local source PDFs. Earlier OCR repairs remain intact; do not reintroduce known source misprints.

The manifest prepares **14 question revisions in 7 exams**, with **8 synchronized explanation revisions**, **6 underline-boundary corrections**, **8 source-cropped choice images across two questions**, and **zero answer-index changes**. Counts overlap.

## Corrections and second reading

- 2010–2011 Q2 and July 2017 Q2: underline 後, leaving で outside because choices are あと / つぎ / うしろ / まえ.
- July 2013 Q5/Q7: include ました / て inside the underline, matching full inflected choices はなしました / でて. December 2018 Q3/Q10: move に outside 中 / 間. All six boundary moves preserve the complete sentence.
- 2010–2011 Q15: option 2 uses 半 plus a variation selector, making it visibly indistinguishable from correct option 4 in ordinary fonts. July 2017 Q15 uses rare Unicode characters that do not reliably preserve the intended stroke differences. Replace all four choices in both questions with exact crops from the respective PDFs: page 3 of N5-2010-2011年.pdf and page 4 of N5-2017年-7月.pdf. Preserve key 4. All eight final crops were opened and visually compared again; manifest pins source hashes, source-page clip rectangles and image SHA-256. No glyphs were redrawn, guessed or replaced by invented distractors.
- 2010–2011 Q11: explain actual ツァワー / ツアワー instead of calling ツ the unrelated ン / ソ. Q18: the actual choice is 冋, not 囘; fix its analysis.
- July 2013 Q8: ん is a moraic nasal (撥音), not the sokuon っ (促音). Reference: [Japan Foundation](https://www.jpf.go.jp/j/project/japanese/teach/tsushin/research/031.html).
- December 2021 Q13: 食べ物 means food; remove misleading Vietnamese “thực vật”.
- July 2023 Q7: editorially complete the malformed question with final か (the recollection scan itself lacks it). Correct the false blanket rule that 何 is always なん before k: 何か is なにか, while 何か月 is なんかげつ.
- December 2022 Q2: correct the independently certain explanation error 着る → きて, not きって. Its reconstructed stem, four choices and key are preserved. This linguistic correction is not a claim that the absent original booklet was verified.

Second reading checked every revised full sentence, each new rationale against all four actual options, every source crop, and all four existing picture questions. In particular, 2010–2011 has six apples (key 3), while July 2017 has five apples (key 2); do not copy one exam's key to the other.

## Source limitations and unresolved ambiguity

December 2022 and December 2024 have only answer-recollection sheets, not original booklets. Their import reports explicitly record source-missing-original-exam-booklet and DRAFT_ONLY. All **42 reconstructed stems/options/keys** remain unchanged; December 2024 receives no edits at all. Only the source-independent December 2022 Q2 explanation above is corrected.

Three questions need original wording/options before a faithful correction can be made:

1. December 2022 Q14: both たくさん食べられません and なにも食べられません can fit its abbreviated context.
2. December 2024 Q15: both シャワーをあびる and おゆをあびる can fit the current sentence.
3. December 2024 Q21: 祖父 includes father’s father and mother’s father, so both current choices 3 and 4 fit. [Kanji Kentei Foundation definition](https://www.kanjipedia.jp/kotoba/0004160900) supports the broader meaning. Do not invent an alternative distractor or pretend the recollection established paternal-only meaning.

These three questions are explicitly deferred and remain unchanged. Reviewing their current Japanese does not validate the reconstruction against an absent original. July 2023's available vocabulary pages are also a recollection scan; its exact transcription and editorial completion are distinguished above.

## Operation

```bash
pnpm --filter @jlpt/schema build
node tools/content/n5-kanji-vocab-review/check.mjs <private-inventory.json> <private-groups.json>
N5_REPAIR_DIR=<private-operation-dir> N5_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n5-kanji-vocab-review/repair.mjs plan
# Require successful exact-head CI, plus a fresh validated pg_dump and baseline.
N5_REPAIR_DIR=<same-dir> N5_REPAIR_AUTH=<same-auth-env> \
N5_REPAIR_CI_COMMIT=<successful-sha> N5_REPAIR_EXPECTED_COMMIT=<same-sha> \
N5_REPAIR_BACKUP=<fresh-dump> N5_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n5-kanji-vocab-review/repair.mjs apply
N5_REPAIR_DIR=<same-dir> N5_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n5-kanji-vocab-review/repair.mjs verify
```

Planning is read-only, pinning exact group/question/explanation content and source media hashes. Only after CI and a validated backup does apply upload the eight PNGs through POST /admin/media, then use editor → reviewer → publisher APIs to create new approved content and exam versions. No direct SQL writes or migrations; old versions are immutable. Media uploads have a resumable journal and verified SHA-256, and verify downloads their bytes for hash comparison.

verify-published.py baseline|verify checks every N5 snapshot, preserves all 297 keys and other sections, allowlists only exact option/stem and corresponding media-list changes, compares new exam manifest asset sets, and hashes historical files/rows. Capture a fresh baseline immediately before apply; the review baseline alone is not a backup.

Data corrections cannot be previewed independently on :3210 because it shares the live database/API. Open the actual website and reread the corrections after publication before claiming live completion. Operational status, CI and backup evidence are recorded separately.

Local validation passes for the 297-question inventory/schema/NFC/rationale/blank/visible-choice checks, all eight image hashes/dimensions/source hashes, lint, typecheck, build, UI primitives, no-mock and docs map. Full pnpm test fails at the pre-existing external coordinator Scenario 10, tests/integration/dac-ta-runner.test.ts:777 (check.ok false); no bypass or unrelated runtime changes.

Read-only API plan passes: 14 groups, 8 explanations, 7 exams and 8 pinned source assets. All 297 vocabulary stems/options/keys match all 11 currently published snapshots, including all 14 before-pins. Review baseline hashes 116 historical files; capture a fresh baseline and validated backup before later application.
