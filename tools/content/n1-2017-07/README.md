# N1 7/2017: reviewed content corrections

Corrections confirmed against the printed exam and script PDFs (2026-11-06 review):

| Question | Correction | Evidence |
|---|---|---|
| 33 | `歓迎会に失敗だった` → `歓迎会は失敗だった` in the stem | Owner decision: the print has a particle typo (`に`); the stem is corrected so test-takers see grammatical Japanese |
| 75 | transcript `他社のかと並べて` → `他社のと並べて` (and quotes) | Script PDF page 8 |
| 79 | option 4 `大人とお子供` → `大人と子供` (and quotes); transcript `何もしないでぼんやり` → `何もせずにぼんやり` | Exam PDF page 14; script PDF page 10 |
| 104, 105 | transcript `消費者に魅せる` → `消費者に見せる` (shared group, both explanations) | Script PDF page 13 |

Not changed on purpose: Q1 option 4 (`いやす`; the print `いや` is a typo and the key is unaffected), Q103 transcript `うちの店` (the print `うち店` is a typo), Q77 kanji spelling, all answer keys, audio, passages and Mondai 13 instruction (the admin group DTO does not carry `instructions`).

Operation is identical to `tools/content/n1-2012-07/README.md`: run only on `jlpt-vm` from an isolated worktree with `N1_REPAIR_DIR`, `N1_REPAIR_AUTH`, then `plan`, and — only after CI, a validated backup and owner approval — `apply` and `verify`.
Q105 shares its group with Q104; its group text is changed once via Q104 and only its explanation is revised here (`explanationOnly`).
