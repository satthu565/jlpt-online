# N1 kanji and vocabulary: owner-authorized correction and self-review

Review date: 2026-11-06. Scope: all 31 N1 exams, 775 kanji/vocabulary questions. This operation changes 75 questions across 18 exams; 56 changes normalize blank rich text, including 49 redundant surrounding parentheses and 7 literal blanks. Other changes repair source transcription, underline bounds, truncated inflections and explanation quotes. Three source-key conflicts are documented while preserving the semantically correct current choice.

Only one answer key changes: **July 2019 Q20 (簡素), 1 -> 4**. The old rationale wrongly rejected `手続きは簡素になりました`. The attached reference answer sheet says 3, which is also incompatible with `簡素な味`; this is an owner-authorized linguistic correction, not a claim that the source sheet says 4. Dictionary meaning, authentic government usage and an independent exam explanation support the adjudication:

- https://imidas.jp/kojiten/detail/W-06-2-274-06.html
- https://kotobank.jp/word/簡素-470614
- https://www.cao.go.jp/bunken-suishin/doc/teianbukai30gaiyou.pdf
- https://www.jlptzhen.com/n1真题在线做2019年07月日本语能力试验/

Local source PDFs are under `/srv/jlpt-extract/de-goc/N1/`. The detailed audit and rendered source evidence are in the owner's Windows planning folder, `bao-cao/kiem-tra-n1-20261106/BAO_CAO.md`. December 2018 has no source key for this section; its answers are unchanged.

The manifest pins exact current question IDs, versions, stem, choices, answer and explanation. The planner checks the live API against those pins. Apply requires the exact successful CI commit and a fresh validated database backup. All writes use the editor/reviewer/publisher APIs to create approved new versions. Existing question versions, published snapshots and historical answer keys must remain unchanged. No database migrations or direct SQL updates are used.

```bash
pnpm --filter @jlpt/schema build
node tools/content/n1-kanji-vocab-review/check.mjs
N1_REPAIR_DIR=<private-operation-dir> N1_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n1-kanji-vocab-review/repair.mjs plan
# Only after exact-commit CI succeeds and backup has passed pg_restore --list:
N1_REPAIR_DIR=<same-dir> N1_REPAIR_AUTH=<same-auth-env> \
N1_REPAIR_CI_COMMIT=<sha> N1_REPAIR_EXPECTED_COMMIT=<same-sha> \
N1_REPAIR_BACKUP=<fresh-dump> N1_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n1-kanji-vocab-review/repair.mjs apply
# Read back group/explanation/exam state:
N1_REPAIR_DIR=<same-dir> N1_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n1-kanji-vocab-review/repair.mjs verify
```

Self-review checks: full Japanese sentences are identical when only underline boundaries move; all four readings of July 2022 Q6 use the same passive te-form; every explanation answer label matches the stored key; no duplicate choices or missing values are introduced; only the approved one key changes. After publication, compare every new public snapshot and answer key against its previous version with an allowlist of the 75 edits. Verify old snapshot hashes and old version rows remain unchanged. Open the real site before reporting completion.
