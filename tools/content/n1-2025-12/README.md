# N1 12/2025: reviewed content corrections and OCR repair

Correct confirmed content defects from the 2026-11-03 source review:

| Question | Correction | Evidence |
|---|---|---|
| 22 | `かすれいた` → `かすれていた` in option 1 and explanation | Missing kana in underline text; source exam PDF page 5 |
| 54 | `クリーナーシュリソプ` → `クリーナーシュリンプ` (9 passage occurrences and explanation quote); `休表` → `体表` in explanation | OCR katakana misrecognition of ソ vs ン; source exam PDF pages 19-20 |
| 70 | `山川アパート` → `山川デパート` in options 1–4 and explanation | Audio dialogue clearly says 山川デパート twice; source audio 06:19 |

All 96 answer keys, question order, audio SHA-256 and timeline are preserved.

## Operation

```bash
export N1_REPAIR_DIR=/tmp/n1-2025-12-repair-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
node tools/content/n1-2025-12/repair.mjs plan
```

Before applying, require successful CI for the exact commit, owner authorization, and a fresh custom-format PostgreSQL backup validated with `pg_restore -l`.

```bash
export N1_REPAIR_CI_COMMIT=<commit>
export N1_REPAIR_EXPECTED_COMMIT=<commit>
export N1_REPAIR_BACKUP=<backup_path>
export N1_REPAIR_BACKUP_SHA256=<backup_sha256>
node tools/content/n1-2025-12/repair.mjs apply
node tools/content/n1-2025-12/repair.mjs verify
```
