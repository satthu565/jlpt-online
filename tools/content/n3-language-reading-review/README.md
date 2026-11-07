# N3 文法・読解 review — 2026-11-07

Owner requested autonomous review of every N3 grammar/reading section, correction and a second reading. The shared database currently publishes **30 N3 exams / 1,160 questions in this section**: 390 grammar-form, 150 sentence-composition, 140 text-grammar and 480 reading questions. The December 2025 source folder is not an additional published exam in this inventory.

The reviewed export was compared against all 1,160 currently published question stems/options and group passages, with exact equality. Read all grammar questions/options and the 30 exams' text-grammar/reading passages; check counts, four distinct choices, answer range, blanks/stars, and explanation answer labels. Inspect source PDF images for suspected errors. A structural pass is not a guarantee that every distractor or every sentence in an explanation is flawless.

## Corrections

The manifest has **30 correction entries in 17 exams / 30 groups**, including six shared-passage changes and 13 revised explanations. It restores the missing second `19-b` gap and shared words in December 2010, restores the actual July 2018 grammar distractors instead of rejecting a second valid polite request, repairs missing particles/characters, removes duplicated lead-in words and commas between reorder slots, and clarifies reorder explanations. July 2024 Q59's unrelated fourth option is restored from the independently rendered Kosei copy on the owner's site, with a URL/page/SHA256 in the manifest.

Three answer indexes require new corrected versions:

| Exam / question number in website | Old → corrected | Four-piece order | Printed/current star position |
|---|---|---|---|
| July 2010 Q53 | 4 → 1 | 2-4-1-3 | 3 |
| December 2015 Q50 | 2 → 4 | 3-4-2-1 | 2 |
| July 2022 Q48 | 2 → 4 | 3-2-4-1 | 3 |

These are **editorial corrections**, independently reconstructed from the actual question. Do not describe the old answer tables as proof of the corrected keys. No star position is moved. The explanations show the complete order and explicitly disclose each key correction. July 2021 Q51 retains its correct key [3]; its old explanation incorrectly put `今` between the verb and `ところ`.

Several PDFs themselves contain errors. The manifest distinguishes restoration from editorial changes, including December 2012 `ご覧になる` → connecting `ご覧になって`; December 2014 `グラム` → `グラフ`; July 2015 removal of the unrelated copied ending; and the caller label in July 2022. These are not claims that the corrected wording was printed in the supplied PDF. Do not silently replace source documents.

Source root: `/srv/jlpt-extract/de-goc/N3/`. Exact filenames/pages and linguistic reasons are recorded per entry. The second reading reconstructs the repaired sentences, checks the actual star position against the selected option, verifies three distractor reasons for each revised explanation, and validates the rich-text schema and Unicode NFC.

## Source defects kept unresolved

- July 2012 Q68 refers to a sample email missing from the supplied source; do not invent an email.
- July 2023 long reading contains `約年前`, with the number missing in the source. No unverified year is inserted.
- July 2012 Q68: public reproductions show the sample email body, but the additional PDF on the owner's site also omits it; the complete original layout/contact line has not yet been independently verified. A JaLaTools page now requires an access code, so do not attempt to bypass it.
- July 2014 reading Q64 is answerable by comparing the two glasses descriptions; do not invent an additional claim about Maeda's lens color.
- Listening and kanji/vocabulary are outside this request. Do not modify them when republishing.

## Safe operation

All content writes go through separate editor/reviewer/publisher APIs. Every group is cloned into a new approved content version; new explanation versions and published exam snapshots are created. Old versions, answer keys and snapshot files remain intact. A plan pins complete before/after content, question versions, source group versions and current publication versions. It refuses concurrent changes. A journal records completed API steps; do not start a second operation if a journal already exists.

```bash
pnpm --filter @jlpt/schema build
node tools/content/n3-language-reading-review/check.mjs
N3_REPAIR_DIR=<private-operation-directory> N3_REPAIR_AUTH=<project-service-account-env> \
  node tools/content/n3-language-reading-review/repair.mjs plan

# Only after the exact reviewed commit passes required CI:
# 1. create a fresh pg_dump -Fc; validate with pg_restore --list;
# 2. capture a fresh immutable baseline immediately before applying;
# 3. pass the verified commit and backup hash below.
N3_REPAIR_DIR=<same-directory> N3_REPAIR_AUTH=<same-env> \
N3_REPAIR_CI_COMMIT=<sha> N3_REPAIR_EXPECTED_COMMIT=<same-sha> \
N3_REPAIR_BACKUP=<fresh-dump> N3_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n3-language-reading-review/repair.mjs apply
N3_REPAIR_DIR=<same-directory> N3_REPAIR_AUTH=<same-env> \
  node tools/content/n3-language-reading-review/repair.mjs verify
```

`verify-published.py baseline|verify` runs with read-only database access and storage read permissions. It compares the full 30-exam snapshots against the manifest allowlist, requires exactly the three listed new-version answer changes, and hashes all historical N3 content/group/explanation/options/answer/exam-version rows and snapshot files. It also checks unchanged sections. Data changes cannot be independently previewed at :3210 because that web instance shares the live API/database. Open the actual :3000 site after applying, inspect repaired content and record the evidence before claiming completion.

## Validation before PR

- Content schema, unique options, NFC, 13 structured explanations, six passage edits, eight independent reorder reconstructions and three explicitly allowed key changes: pass.
- `lint`, `typecheck`, `build`, `check:ui-primitives`, `check:no-mock-ui`, `docs:map`: pass locally.
- `pnpm test`: stops at the pre-existing coordinator integration Scenario 10 (`check.ok` false), also documented by preceding content repairs on this VM. Do not disable the check or alter coordinator permissions. Required CI must still pass before any live content write.
- API planning is read-only. Earlier 31/32-entry plans are superseded by this 30-entry manifest. Regenerate in a new operation directory; never apply an old plan. One earlier planning run met an API restart and wrote no content.
- No live apply, migration, or :3210 deployment at PR creation.

## Second review on session continuation

- July 2011 Q53: the original options form `子どもがしたいと思うことはやらせてやりたい` in order 1-4-3-2. Preserve all four options and key [3]; clarify only the explanation. The earlier proposal to replace したい with あげたい was a false positive.
- December 2014 Q50: `今日中に作らなくてはいけない会議の資料のことをすっかり忘れていた` is grammatical, order 3-4-2-1 and key [2]. The relative clause modifies 会議の資料, followed by のことを. Remove this entry entirely; replacing の with を would damage the retained order.
- December 2022 Q36: `書き方がよくわからないところなんですが` can introduce the part being asked about. Do not insert がある solely as a stylistic preference; remove this entry.
- July 2019 Q50: rewrite the explanation as one complete sentence ending `なかなかないだろう`, removing the old duplicated `[な]ない` and stale reference to いだろう.
- December 2020 Q52: synchronize the remaining distractor explanation with `好きだからだと思う`.
- The standalone API test run completed: 72 files / 754 tests passed. Required GitHub CI remains pending; no live content apply has occurred.
