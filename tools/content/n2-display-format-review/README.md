# N2 Display and Format Review & Repair

Review date: 2026-11-08.
Owner requested comprehensive audit, double-check, and correction of question/option display defects across all 31 N2 exams.

## Scope of corrections
- **Total Exams affected:** 6 (`n2-2024-12`, `n2-2025-07`, `n2-2025-12`, `n2-2023-07`, `n2-2022-07`, `n2-2016-07`).
- **Question Fixes:** 22
  - `n2-2024-12`: Q31–Q42 (Mondai 7) replaced raw literal fullwidth parens `（　　）` with standard schema `{"t": "blank"}` node.
  - `n2-2024-12`: Q78 opt 1, Q79 opt 3, Q82 opt 4 removed abnormal fullwidth space `\u3000` inside Japanese option text.
  - `n2-2025-07`: Q72 opt 1, Q80 opt 1, Q82 opt 2, Q83 opts 1–4 removed abnormal spaces in option text.
  - `n2-2025-12`: Q100 opts 1–4, Q101 opts 1–4 removed space between number and `番` (`1 番` -> `1番`).
  - `n2-2016-07`: Q33 stem removed space in `3 番目` -> `3番目`.
- **Passage Fixes:** 2
  - `n2-2023-07` Q56 passage: repaired OCR split word `使い果 たそう` -> `使い果たそう` and `生き ていく` -> `生きていく`.
  - `n2-2022-07` text_grammar passage: separated heading `地下駐輪場\n誰もが`, repaired split word `誰 もが` -> `誰もが`, restored missing character in `手段の つ` -> `手段の一つ`, and normalized spaces after commas.
- **Answer Key Changes:** 0 (all answer keys strictly preserved).

## Validation commands
```bash
pnpm --filter @jlpt/schema build
node tools/content/n2-display-format-review/check.mjs
```
