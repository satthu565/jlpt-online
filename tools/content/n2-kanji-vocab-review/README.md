# N2 kanji and vocabulary audit and versioned correction

Review date: 2026-11-06. Owner requested autonomous review, correction and a second reading of all N2 kanji/vocabulary questions. Scope: **31 exams, 964 questions**. The manifest corrects **277 questions in 31 exams**, including **188 blank representation fixes**, **34 underline boundary fixes**, transcription repairs and **51 explanation updates**. No answer index changes.

December 2018 has **28 explanations belonging to unrelated questions**. Each is replaced with a translation of the actual question, its correct rationale, and three reasons addressing the actual distractors. The two explanations that already match their questions are retained.

Local source PDFs: `/srv/jlpt-extract/de-goc/N2/`. Read all 964 question stems/options and correct-answer rationales. Compare suspect transcription/underline cases against rendered source pages. Keep distractors intentionally different from the correct word. Some source booklets themselves contain errors; linguistic corrections include December 2010 `納めれて` -> `納められて`, July 2015 `心が弱し` -> `心が弱い`, December 2020 missing particles/duplicated auxiliaries, July 2021 truncated `体力の限界に達している`, July 2022 `栓` -> `線`, and July 2024 `大比` -> `だいたい` and missing `します`. These are editorial repairs, not claims that the original PDF contains the corrected form.

Dictionary references used during review:

- https://www.kanjipedia.jp/kotoba/0004221300 (相互 / ソウゴ)
- https://www.kanjipedia.jp/kanji/0006192900 (平 / ヘイ・ビョウ)
- https://www.kanjipedia.jp/kotoba/0004133500 (全般 / ゼンパン)
- https://www.kanjipedia.jp/kanji/0003557300 (織: 糸 + 戠)

The manifest pins question IDs, exact versions, content and publication versions. All mutations go through editor/reviewer/publisher APIs, creating new approved question/group/explanation versions and new exam snapshots. Do not update old published rows or snapshots. API plan detects concurrent edits; rebuild publication pins only after confirming question content is unchanged, and capture a fresh immutable baseline immediately before applying.

```bash
pnpm --filter @jlpt/schema build
node tools/content/n2-kanji-vocab-review/check.mjs
N2_REPAIR_DIR=<private-operation-dir> N2_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n2-kanji-vocab-review/repair.mjs plan
# Exact-commit required CI must pass; create and validate a fresh pg_dump first.
N2_REPAIR_DIR=<same-dir> N2_REPAIR_AUTH=<same-auth-env> \
N2_REPAIR_CI_COMMIT=<sha> N2_REPAIR_EXPECTED_COMMIT=<same-sha> \
N2_REPAIR_BACKUP=<fresh-dump> N2_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n2-kanji-vocab-review/repair.mjs apply
N2_REPAIR_DIR=<same-dir> N2_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n2-kanji-vocab-review/repair.mjs verify
```

`verify-published.py baseline|verify` compares all 31 published snapshots against the allowlist, all answer arrays against their originals (zero key changes), and hashes every old N2 question/version/option/answer/exam-version row and historical snapshot file. Open the real site and inspect corrected content before claiming completion. Data edits cannot be previewed independently on :3210 because it shares the live database.

Local gates: content schema/rationale checks, lint, typecheck, build, UI primitive check, no-mock check and docs map pass. The full local test command hits the pre-existing coordinator integration disk-space check: this VM has about 5% free disk, while the external coordinator runtime requires 20%. Do not bypass this check or alter unrelated coordinator code; report the local failure and require the PR's full CI gate to pass before applying.
