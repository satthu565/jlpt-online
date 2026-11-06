# N1 July 2019 content corrections

Owner delegated the corrections on 2026-11-06 after a worker (W5) and a manual source comparison re-audited the exam against the exam PDF and the answer/script PDF.

| Scope | Before | After | Evidence |
|---|---|---|---|
| Q46 passage | `想像カ` (katakana カ) | `想像力` | Exam PDF page 5; the glyph is the kanji 力. |
| Q50, Q54, Q57 stem and passage | Asked phrase in plain text | Asked phrase underlined | Exam PDF pages 8, 9 and 10 underline the phrase in the passage and in the question. |
| Q61 option 3 and Q63 option 4, plus their explanations | `ベき` (katakana ベ) | `べき` | Exam PDF; the listed options are hiragana. |
| Q64–Q67 shared passage | `狐独` | `孤独` | The printed source has the typo `狐独`; normalised so learners see the real word. |
| Q83 transcript | `取り寄せしております` | `取り寄せております` | Script PDF page 8. |
| Q104 transcript | `息詰まったとき` | `行き詰まったとき` | Script PDF page 13; Q103 was already fixed, Q104 shares the same dialogue. |

Left unchanged on purpose:

- Q20 key stays **1** and Q90 key stays **1**. The Chinese-school answer sheet prints 3 and 2, which contradicts the question content (`簡素な味` is unnatural; the teacher cannot answer `もちろん差し上げますよ`). This was decided in the 2026-11-04 report.
- Half-width `6キロ`, `7年`, `?` and `!` match the source print, so they are not errors.
- `森田カーヅ` (Q83) and `斉藤/斎藤` (Q73) are spellings inside the source script; they do not change any answer.

The operation revises 8 groups and 4 explanations. All 104 keys, question order, media and old published snapshots remain intact. It follows the `n1-2018-07` runner: the manifest pins identities and canonical hashes, planning reads the admin API, and applying requires a successful CI commit plus a fresh validated backup. Changes go through the editor/reviewer/publisher APIs and create new versions; never update published rows directly.

```bash
export N1_REPAIR_DIR=/tmp/n1-2019-07-repair-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
pnpm --filter @jlpt/schema build
node tools/content/n1-2019-07/repair.mjs plan
# after CI passes and a validated pg_dump exists:
N1_REPAIR_CI_COMMIT=<sha> N1_REPAIR_EXPECTED_COMMIT=<sha> N1_REPAIR_BACKUP=<dump> N1_REPAIR_BACKUP_SHA256=<hash> \
  node tools/content/n1-2019-07/repair.mjs apply
node tools/content/n1-2019-07/repair.mjs verify
```

Underlines are inserted by `underline()` in `repair.mjs`: it splits the single text node containing the phrase and fails unless the phrase occurs exactly once in the passage and once in the stem. Remove only this task's auth env file after verification.
