# N5 Display and Format Review & Repair

Review date: 2026-11-09.
Owner requested comprehensive audit, double-check, and correction of question/option display defects across all 11 N5 exams.

## Scope of corrections
- **Total Exams affected:** 5 (`n5-2018-12`, `n5-2017-07`, `n5-2010-2011`, `n5-2024-12`, `n5-2025-07`).
- **Question Fixes:** 61
  - `n5-2018-12`: Q21–Q30 (Mondai 3) and Q36–Q51 (Mondai 1) removed redundant outer halfwidth parentheses `((   ) )` wrapping schema `{"t": "blank"}` node (26 questions, 27 blank positions).
  - `n5-2017-07`: Q34–Q49 (Mondai 1) removed redundant outer fullwidth parentheses `（(   )）` wrapping schema `{"t": "blank"}` node (16 questions).
  - `n5-2010-2011`: Q34–Q49 (Mondai 1) replaced raw literal fullwidth parens `（　）` with standard schema `{"t": "blank"}` node (16 questions).
  - `n5-2010-2011`: Q53 (Mondai 2) removed abnormal fullwidth space before Japanese comma (`　、` -> `、`).
  - `n5-2024-12`: Q61 (Choukai Mondai 3) normalized counter spacing in `2 つ` -> `2つ`.
  - `n5-2025-07`: Q40 (Mondai 4) standardized ASCII halfwidth `( )` to Japanese fullwidth blank `（　　）`.
- **Passage Fixes:** 2
  - `n5-2010-2011`: Group passage for short reading memo (3) removed 33 artificial fullwidth spaces before sender signature `山口`.
  - `n5-2025-07`: Group passage for Q40 standardized ASCII halfwidth `( )` to Japanese fullwidth blank `（　　）`.
- **Answer Key Changes:** 0 (all answer keys strictly preserved).

## Validation commands
```bash
pnpm --filter @jlpt/schema build
node tools/content/n5-display-format-review/check.mjs
```
