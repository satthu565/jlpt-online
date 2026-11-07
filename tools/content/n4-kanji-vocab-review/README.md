# N4 文字・語彙 review and versioned correction

Reviewed 2026-11-07, at the owner's request to inspect, correct and reread every N4 kanji/vocabulary question on the VM. Inventory: **15 imported exams, 448 questions**. The 2019 sample has 10 questions; December 2021 has 27, matching its available booklet (the booklet skips question 12). December 2016 exists as source files but is not an imported exam in the live inventory.

The manifest prepares **48 revisions in 10 exams**, with **23 revised explanations** and **zero answer-index changes**. All 448 stems, options, stored keys and correct-answer rationales were read. Suspect transcription cases were compared visually with rendered local booklets under `/srv/jlpt-extract/de-goc/N4/`. The schema checker covers every inventoried question, unique choices, NFC, blanks, exact before-content pins and synchronized rationale keys.

## Findings and second reading

- 2010–2011 Q29 option 1: restore missing `き` in `きれい` from booklet page 4; remove obsolete explanation about the missing character.
- 2010–2011 Q10/Q15 and December 2012 Q13: move `して` / `に` outside the underline to match all four replacement choices, preserving the full original sentence.
- December 2021 Q16 (booklet Q17, page 2): restore `わたしがかりている`; Q20 option 3 (booklet Q21, page 3): restore small `ょ` in `聞きましょう`.
- July 2021 Q18: restore object particle `を` before `聞きました`; July 2024 Q25 option 2 and Q28 option 3: restore topic particle `は`. These are editorial grammatical repairs of errors also present in the source.
- July 2024 Q27 option 3: restore `水`, misrecognized as `木`, in the spilled-cup sentence (page 4).
- Correct explanations for December 2012 Q12 (`歩いて` is current option 4; remove stale claim that the key remains 3), July 2021 Q16 (`えいぎょう`), December 2021 Q1 (the sokuon belongs to `出`, while `発` becomes `ぱつ`), July 2024 Q9 (`動かなく` is the form before `なる`, not the negative te-form), July 2014 Q9 (large `つ` and missing long vowel in `とつきゅ`), and July 2025 Q16 (spatial `ちかく`, not temporal “gần đây”).
- Remove unsupported previous claims of exact official distractor restoration in December 2012 Q11, July 2017 Q12 and July 2024 Q12. Existing distinct choices and keys remain; explanations identify the editorial limitation.

### December 2022: reconstructed content, not a verified original booklet

The original import report at `/srv/jlpt-extract/xuat/N4 12-2022/BAO_CAO.md` explicitly records `source-missing-original-exam-booklet` and `DRAFT_ONLY`. The only local PDF is a four-page answer recollection, not an exam booklet. Existing stems and distractors were reconstructed before this review. **Do not claim that this review restored the original December 2022 exam.**

All 28 questions receive a visible Vietnamese source notice before the exercise: “Câu luyện tập biên tập từ bản gợi nhớ; chưa xác minh nguyên văn đề gốc.” This notice carries no answer information. Twelve standalone kanji terms receive an underline.

For Q13/Q14, add explicit position/capacity context. Remove plausible alternatives from reconstructed Q15/Q16/Q18/Q19 (such as `紹介`, `見て`, `知って`, `自転車で走って` and `狭い`), and from Q26. Q27 uses the already source-reviewed July 2014 Q32 practice choices rather than unsupported birthday/morning gratitude assumptions. Q28 teaches the unambiguous `水を足す`, clearly describing it as an editorial practice sentence rather than the recollected `力をたしたい`. Q3 corrects `ならって` versus `ならんで`; Q7 removes a visible drafting instruction. Eleven explanations are rewritten for these actual options and contexts.

Dictionary verification: [NINJAL 足す](https://mmsrv.ninjal.ac.jp/kamus/data/item3451.html) and [Kanji Kentei Foundation 足す](https://www.kanjipedia.jp/kotoba/0004339300).

Second reading checked each changed complete sentence with its correct choice inserted, each revised distractor against the rationale, the three unchanged full-sentence underline moves, and preservation of all 448 keys. Source authenticity for December 2022 remains unverified until an original booklet is available; the visible notices preserve that distinction.

## Guarded operation

```bash
pnpm --filter @jlpt/schema build
node tools/content/n4-kanji-vocab-review/check.mjs <private-full-inventory.json>
N4_REPAIR_DIR=<private-operation-dir> N4_REPAIR_AUTH=<existing-project-auth-env> \
  node tools/content/n4-kanji-vocab-review/repair.mjs plan
# First require successful CI for the exact commit and a fresh validated pg_dump.
N4_REPAIR_DIR=<same-dir> N4_REPAIR_AUTH=<same-auth-env> \
N4_REPAIR_CI_COMMIT=<successful-sha> N4_REPAIR_EXPECTED_COMMIT=<same-sha> \
N4_REPAIR_BACKUP=<fresh-dump> N4_REPAIR_BACKUP_SHA256=<sha256> \
  node tools/content/n4-kanji-vocab-review/repair.mjs apply
N4_REPAIR_DIR=<same-dir> N4_REPAIR_AUTH=<same-auth-env> \
  node tools/content/n4-kanji-vocab-review/repair.mjs verify
```

Writes exclusively use editor → reviewer → publisher APIs to create approved new question, explanation and exam versions. Exact pins reject concurrent content edits. No direct SQL writes or migrations. `verify-published.py baseline|verify` checks every N4 snapshot and all answer arrays, plus hashes of historical files and question/group/explanation/answer/exam-version rows. Grammar/reading and listening content must stay unchanged. The owner's request authorizes the corrections; take and validate a fresh backup before applying them.

Data corrections cannot be previewed independently on :3210, which shares the live database. Open the actual site after publication. The private operational report records CI, backup, application and real-site verification; preparing this manifest alone is not a completed live repair.

Local validation: the full inventory/schema/rationale check passes (448 reviewed, 48 revisions, 23 explanations); lint, typecheck, build, UI primitives, no-mock and docs map pass. Full `pnpm test` fails in the existing external coordinator runtime Scenario 10 at `tests/integration/dac-ta-runner.test.ts:777` (`check.ok` false); web tests pass (402). Do not bypass or change that unrelated check. Successful required GitHub CI is a prerequisite for applying the live corrections.
