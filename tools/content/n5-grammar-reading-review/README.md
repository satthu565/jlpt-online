# N5 grammar and reading audit (2026-11-07)

Owner-authorized review of all 281 imported language_grammar_reading questions in 11 N5 exams. Reviewed stems, all choices, keys, passages, correct-answer rationales, all 49 star questions and information tables/source images. Prepared 16 question revisions, one passage revision and 13 explanation revisions in eight exams. One key correction: n5-2012-12 overall Q41 (grammar Q6), 2 には -> 1 では. A location where ぬぐ occurs takes で; source booklet p5 preserves all four choices. Linguistic reference: https://www.coelang.tufs.ac.jp/mt/ja/gmod/contents_m/explanation/053.html (action location で, and subject が inside noun modifiers).

## Corrections

- 2010/2011 and July 2017 Q54: correct the explanation to 日本語がかんたんな本 using actual choice が; do not silently substitute の. The answer index remains 2.
- 2010/2011 Q61: picture 4 also has two chairs. Correct the incorrect one-chair claim; the relevant distinction is the large bookshelf, while picture 3 has an overflowing small bookshelf. Key 3 remains.
- December 2012 Q41: repair incorrect key and its rationale as above, via new versions only.
- July 2013 Q62: リンさんはおかしをいつ、どこで買いますか; source booklet p7 Q27 has は, not に.
- December 2018 Q53: remove extra で after the composition slots; the source p6 also contains this defect. Completed sentence is 兄の子どもといっしょに出かけました. Synchronize rationale.
- July 2023 Q33/Q34: remove orphan closing quotes from standalone composition questions (source p7).
- July 2024 Q25: existing key is 4 が, but old explanation still identifies 2 か as correct; synchronize explanation to Nがほしい.
- July 2024 Q43: fill missing explanation by reading source p12-13 and published image: apples on 13 at store 4, eggs on 14 at store 2. Existing provisional key 1 is now verified. All other combinations fail one condition.
- July 2024 reading passage for Q40: editorially restore 行っていました from malformed 行っていま, also truncated in source p9.
- December 2024 Q31/Q33/Q34: repair misplaced stars in explanations using the actual stored slot positions and complete four-piece sentences. Do not alter reconstructed questions, choices or keys.

- Additional rationale fixes from the second distractor reading: 2010/2011 Q40 must analyze the actual inserted は/か instead of dropping them; July 2017 Q56 must translate 行っていましたか as past, and December 2018 Q61 must not claim 来る requires the speaker already physically at the destination. All three keys remain unchanged.

## Source limitations (do not fabricate)

- December 2012: six missing questions, source grammar Q24-29, cannot be imported from the present scan. It jumps from choices Q22-23 on p6 to medium-reading Q30 on p7. Current text-grammar passage retains five blanks but only two question rows; preserve this explicitly reported gap.
- July 2023: all five reading questions (section Q18-22) absent; local PDF ends at text-grammar Q17. The previously downloaded PDF in the old reading worktree is also scanned/incomplete. Await original pages.
- December 2022 and December 2024: only answer recollections, no original booklet. All 44 stems/choices/keys remain unchanged. December 2022 Q26 telephone context is truncated.
- December 2024 Q26: both ぐらい and ほど fit the two-hour duration. Q32: なかで lacks the noun+の host, while the old explanation silently omits this fourth piece. Q36: reconstructed pizza passage does not establish a coherent context for the mother's pizza being eaten this morning while writer lives in Japan. Await original full passages and all choices.
- Star review records all 49 items; 48 have complete four-piece sentences, Q32 December 2024 is explicitly deferred. This is linguistic verification of reconstructed text, not certification as original wording.

## Operation and safeguards

Scripts use N5_GR_REPAIR_DIR and N5_GR_REPAIR_AUTH. Run check.mjs with the private inventory and groups exports. repair.mjs plan pins exact question/group versions, before content and old approved explanation IDs/hashes. apply requires exact-commit CI plus a fresh validated pg_dump and SHA-256. Editor -> reviewer -> publisher APIs create new versions; no direct SQL writes or migrations. verify checks approved content, explanations and published versions. verify-published.py baseline/verify compares all 11 public snapshots, allows exactly the manifest key change in the new key, and preserves hashes of historical snapshot files and database rows. Vocabulary/listening and all deferred questions must be untouched.

Owner request authorizes corrections subject to backup and CI. Shared database changes cannot be isolated in a :3210 web preview. Open actual practice rooms and inspect rendered content after publication before claiming completion. Private operation records: /home/jlpt/n5-gr-review-private.

Second reading completed on all 16 resulting question revisions, thirteen complete rationales and the passage, plus all 48 valid composition sentences. check.mjs passes schema, NFC, choice uniqueness, exact before-state, rationale keys, star positions and explicit missing-source exceptions. Read-only API planning passes for 17 groups, thirteen approved explanations and eight exams. All 281 current stems/choices/keys and grammar-reading passages match all 11 published snapshots; review baseline hashes 144 historical files. This review baseline must be replaced by a fresh operation baseline immediately before applying.

Local lint, typecheck, build, UI primitives, no-mock and docs map pass. Full test reports the pre-existing external coordinator Scenario 10 failure; do not bypass it. Exact-commit GitHub CI is required before database writes. Data is not yet applied at PR creation; see private report for eventual deployment evidence.
