# N3 Display and Format Review & Repair

Review date: 2026-11-08.
Owner requested comprehensive audit, double-check, and correction of question/option display defects across all 30 N3 exams.

## Scope of corrections
- **Total Exams affected:** 11 (`n3-2024-12`, `n3-2013-07`, `n3-2017-07`, `n3-2018-07`, `n3-2025-07`, `n3-2023-12`, `n3-2014-12`, `n3-2011-12`, `n3-2015-12`, `n3-2021-07`, `n3-2022-07`).
- **Question Fixes:** 48
  - `n3-2024-12`: Q15–Q25 (Mondai 3) replaced raw literal fullwidth parens `（　）` with standard schema `{"t": "blank"}` node.
  - `n3-2013-07`: Q15–Q25 (Mondai 3) replaced raw literal fullwidth parens `（　）` with standard schema `{"t": "blank"}` node.
  - `n3-2017-07`: Q49–Q53 (Mondai 2 Sentence Composition / Star) removed ungrammatical commas `、` between reorder slots.
  - `n3-2018-07`: Q59–Q72 (Mondai 4-6 Reading Comprehension) removed artificial bunsetsu spacing across stems and options.
  - `n3-2025-07`: Q48 stem removed space in `五日間 必ず` -> `五日間必ず`.
  - `n3-2023-12`: Q64 stem removed space in `「私」は 今、` -> `「私」は今、`.
  - `n3-2014-12`: Q74 stem removed fullwidth space in `ことは　何か。` -> `ことは何か。`.
  - `n3-2011-12`: Q43 stem removed space in `先生に これから` -> `先生にこれから`.
  - `n3-2015-12`: Q95 stem removed space in `ペンか何か ない？` -> `ペンか何かない？`.
  - `n3-2021-07`: Q64 opt 1 removed space in `先生への お礼の気持ち。` -> `先生へのお礼の気持ち。`.
  - `n3-2022-07`: Q67 stem fixed underline to cover only target phrase `あきらめ始めていた`.
- **Passage Fixes:** 2
  - `n3-2018-07`: Q59 and Q62 group passages removed OCR split word spaces in lead-in sentences.
- **Answer Key Changes:** 0 (all answer keys strictly preserved).

## Validation commands
```bash
pnpm --filter @jlpt/schema build
node tools/content/n3-display-format-review/check.mjs
```
