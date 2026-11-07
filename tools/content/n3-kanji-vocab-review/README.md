# N3 kanji/vocabulary review and versioned correction

Review date: 2026-11-07. Owner authorized checking, correcting and rereading all N3 **文字・語彙** content on the VM. Scope: **30 exams, 1,049 questions**, July 2010 through July 2025 (no July 2020 exam; July 2022 has 34 questions). All stems, four choices, stored correct choices and correct-answer rationales were read. Structural checks cover the whole inventory; suspicious wording was compared with locally rendered source PDFs under `/srv/jlpt-extract/de-goc/N3/`.

The manifest prepares **207 question revisions in 26 exams**: **174 blank representation corrections**, **12 underline boundary corrections**, textual/grammatical repairs, and **23 synchronized explanation revisions**. Counts overlap. **No answer index changes.** Existing intentionally incorrect distractors are retained except the four choices of December 2011 Q24, which are restored together from its source while preserving correct index 2.

Concrete repairs:

- July 2011 Q25: restore missing `います` after the te-form (source page 3).
- July 2013 Q15: remove the duplicated `ので` already contained in all four choices (source page 2).
- December 2011 Q24: source page 3 reads `台風の（ ）で飛行機の出発が遅れた。`, with `効果 / 影響 / 制限 / 結果`; replace the corrupted speed-limit/airplane context and its rationale.
- July 2016 Q24: add `の` in `他の国からの輸入`. December 2011 Q33: `短気な性格`. July 2024 Q18: restore `な` in `消極的なので`. These are grammatical editorial corrections of errors also present in the source, not claims that the PDFs contain the corrected wording.
- July 2016 Q31–Q35: replace Python rich-text serialization in visible answer headings with readable Japanese; July 2018 Q31–Q35: replace bare repeated answer numbers with actual correct sentences.
- Correct the reading `なぐさめる`, corrupted `わ客`, stray Korean text, the Kun reading of `型`, the radical `衤`, the te-form `汚して`, and other explanation inaccuracies recorded per question in the manifest.

Dictionary checks: [型, Kanji Kentei Foundation](https://www.kanjipedia.jp/kanji/0001764100) and [賃, Hán Nôm dictionary](https://www.hanzi.live/hanzi/%E8%B3%83). The manifest records exact before/after text and reasons for each revision. Moving underline boundaries never changes the full sentence.

## Operation

```bash
pnpm --filter @jlpt/schema build
node tools/content/n3-kanji-vocab-review/check.mjs <private-full-inventory.json>
N3_REPAIR_DIR=<private-operation-dir> N3_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n3-kanji-vocab-review/repair.mjs plan
# Required CI must pass for the exact commit. Create a fresh pg_dump,
# validate it with pg_restore --list and record its SHA-256 before applying.
N3_REPAIR_DIR=<same-dir> N3_REPAIR_AUTH=<same-auth-env> \
N3_REPAIR_CI_COMMIT=<successful-sha> N3_REPAIR_EXPECTED_COMMIT=<same-sha> \
N3_REPAIR_BACKUP=<fresh-dump> N3_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n3-kanji-vocab-review/repair.mjs apply
N3_REPAIR_DIR=<same-dir> N3_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n3-kanji-vocab-review/repair.mjs verify
```

Use `verify-published.py baseline|verify` with the same operation directory and read access to Docker/storage. It compares all 30 published snapshots and answer arrays against an allowlist, including the grammar/reading and listening sections which must remain unchanged, and hashes historical snapshot files and old question/group/explanation/answer/exam-version rows. Writes exclusively use editor → reviewer → publisher APIs to create approved new versions; no direct SQL writes or migrations. Planning guards against concurrent changes. Apply only with owner authorization, successful CI and a validated backup. Open the real website and check corrected content before claiming completion. Data changes cannot be previewed independently on :3210 because it shares the live database.

The separate operational report records actual application and verification status; preparing these tools alone does not mean the live content was changed.

Local checks: inventory/schema/rationale/completed-sentence checks, lint, typecheck, build, UI primitive check, no-mock check and docs map pass. Full `pnpm test` reports a failure in the external coordinator runtime scenario `tests/integration/dac-ta-runner.test.ts:777` (`check.ok` is false). This patch does not change coordinator code or bypass that check. Required GitHub CI must pass before application; retain the failed local gate in the operational record.
