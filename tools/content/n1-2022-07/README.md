# N1 07/2022: reviewed content corrections and Q74 image deduplication

Correct confirmed content defects and image display configuration from the 2026-11-03 source review:

| Question | Correction | Evidence |
|---|---|---|
| 41 | `以下では、作家が書いた文章です` → `以下は、作家が書いた文章です` in cloze reading passage introduction | Source exam PDF page 4 |
| 74 | Move nursing home activity diagram (`media/8335359803ec7fda90d3a039afef4f5fd86ce57c2916eb7b71ffb92cdfe8b7c9.png`) to single source of truth in `group_media` by clearing group passage (`[]`) | Avoids duplicate image rendering and eliminates unwanted "Read passage" button in listening question; follows PR #179 & #197 architecture |

All 103 answer keys (including confirmed Q58=2), question order, audio SHA-256 and option contents are preserved.

## Operation

```bash
export N1_REPAIR_DIR=/tmp/n1-2022-07-repair-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
node tools/content/n1-2022-07/repair.mjs plan
```

Before applying, require successful CI for the exact commit, owner authorization, and a fresh custom-format PostgreSQL backup validated with `pg_restore -l`.

```bash
export N1_REPAIR_CI_COMMIT=<commit>
export N1_REPAIR_EXPECTED_COMMIT=<commit>
export N1_REPAIR_BACKUP=<backup_path>
export N1_REPAIR_BACKUP_SHA256=<backup_sha256>
node tools/content/n1-2022-07/repair.mjs apply
node tools/content/n1-2022-07/repair.mjs verify
```
