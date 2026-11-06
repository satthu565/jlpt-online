# N1 July 2018 content corrections

Owner authorized the corrections on 2026-11-06 after reviewing the full 105-question exam audit.

| Scope | Before | After | Evidence |
|---|---|---|---|
| Shared Q41–Q45 passage and its note | `上うわの空そら` | `上の空（うわのそら）` | Exam PDF pages 5–6: readings were joined into ordinary text. Retain the pronunciation explicitly. |
| Q103 transcript | `あとの他の方法としては` | `あと、他の方法としては` | Answer/script PDF page 13 has `あと他の方法としては`; old ASR 2818.46–2820.46 seconds agrees. |
| Q103 transcript | `好きな絵を真似て書けるように` | `好きな絵を真似て描けるように` | Editorial spelling repair: the action is drawing a picture. The source has the same spelling defect. |
| Q103 transcript | `絵が好きってわけじゃないこの興味` | `絵が好きってわけじゃない子の興味` | Editorial word separation: the interest of children who do not already like art. The source has the same spelling defect. |

The operation contains one group revision and one explanation revision. All 105 keys, question order, stems, options, media, timeline, and old published snapshots remain intact. The Q41–Q45 shared passage stays a single group. Leave Q76 `特殊コーナー` unchanged: no direct audio confirmation for a different term.

This runner follows the existing `n1-2012-07` API repair workflow. Its manifest pins identities and canonical hashes. Planning checks authoring and approved explanation payloads; applying requires a successful CI commit and a fresh validated database backup. Changes go through editor/reviewer/publisher APIs and create new versions. Never update published rows directly.

Run from an isolated VM worktree. Store newly prepared demo-operator credentials in a task-private env file; never print or commit them and never reuse another worker's token.

```bash
export N1_REPAIR_DIR=/tmp/n1-2018-07-repair-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
pnpm --filter @jlpt/schema build
node tools/content/n1-2018-07/repair.mjs plan
```

After required CI passes for the exact commit, validate a new PostgreSQL custom-format dump with `pg_restore -l`. Supply the verified commit as both `N1_REPAIR_CI_COMMIT` and `N1_REPAIR_EXPECTED_COMMIT`, and the backup path/hash as `N1_REPAIR_BACKUP` and `N1_REPAIR_BACKUP_SHA256`.

```bash
node tools/content/n1-2018-07/repair.mjs apply
node tools/content/n1-2018-07/repair.mjs verify
```

Explanation content goes through `ExplanationDraftSchema`, the same parser as the API. Canonical transcript, translations and reasons are preserved and verified in full. Unsupported legacy copies such as `blocks` and `explanationMarkdown` are not persisted in new versions; old versions remain available. The revised canonical transcript is the source for the explanation display.

Mutations are never retried automatically after an ambiguous failure. Inspect the journal and current versions before resuming. Re-export all 105 questions; compare the entire new snapshot against the old one with only the planned passage substitutions and version fields changed. Compare all keys, media and timeline, check the old v3 snapshot hash and open the live page. Data repairs cannot be previewed separately on port 3210 because the API/database is shared. Remove only this task's auth env file after verification.

Evidence is in the owner's planning folder at `report/n1-2018-07-review-20261106/`. Full audio playback and the complete exam/review journey were not verified during the audit.
