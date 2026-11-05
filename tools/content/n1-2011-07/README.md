# N1 7/2011: reviewed content corrections

Six questions have confirmed text corrections:

| Question | Before | After | Evidence |
|---|---|---|---|
| 34 | あと3日 | あと３日 | Consistent numeral width with source exam PDF page 4 |
| 47 | 一新的 | 一時的 | Exam PDF page 6; update passage and quoted explanations |
| 73 | シュミレーション | シミュレーション | Standard spelling; source script page 8 contains the typo |
| 76 | 保障期間 | 保証期間 | Printer warranty context; source script page 9 contains the typo |
| 80 | 配送量の無料化 | 配送料の無料化 | Free delivery charge context; script page 9 contains the typo |
| 89 | 店舗の新設にも値上げには賛成 | 店舗の新設にも値上げにも賛成 | Parallel positive alternatives; source script page 11 contains the typo |

The Q80 direction in the previous OCR report was reversed. Q62 stays at option 2. Preserve the passage shared by Q59–Q62 and the audio-only response labels at Q90–Q102. Q85 and Q104 require further audio verification and are excluded.

`manifest.json` pins question/group identities, answer keys and canonical hashes of reviewed source content. `repair.mjs plan` validates those hashes through the admin API and saves exact before/after operations. It changes four question groups and five Vietnamese explanation versions. Approved content is versioned through editor/reviewer APIs, then the publisher creates a new exam snapshot. Old published versions are preserved.

Run only on `jlpt-vm`, from an isolated worktree. Use a task-specific operation directory and auth env file, sourced from the documented demo operators without printing credentials. Do not reuse another worker's session tokens.

```bash
export N1_REPAIR_DIR=/tmp/n1-2011-07-repair-20261105
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
node tools/content/n1-2011-07/repair.mjs plan
```

Before applying, all required CI checks for this commit must pass. Create a fresh PostgreSQL custom-format backup and verify its archive table of contents with `pg_restore -l`. Provide the validated backup path and its SHA-256 through `N1_REPAIR_BACKUP` and `N1_REPAIR_BACKUP_SHA256`; set `N1_REPAIR_CI_COMMIT` and `N1_REPAIR_EXPECTED_COMMIT` to the verified commit SHA. The tool checks the backup hash before any content mutation.

```bash
node tools/content/n1-2011-07/repair.mjs apply
node tools/content/n1-2011-07/repair.mjs verify
```

The operation journal records successful approvals and publication. Mutations are not automatically retried after an ambiguous server error; inspect current versions and the journal before recovery. Verification reads approved content and the published snapshot through the API. Also re-export authoring data and compare all 106 keys and snapshot questions against the baseline, preserving the v5 snapshot. Open the live exam detail page and confirm the new version after publication. Data changes cannot be previewed on `:3210` because its API/database are shared.

Remove the task auth env file after verification; do not commit credentials, plan snapshots or session tokens.
