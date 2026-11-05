# N1 7/2012: reviewed content corrections

Correct confirmed content defects from the 2026-11-05 source review:

| Question | Correction | Evidence |
|---|---|---|
| 33 | Restore option 1 `引き出したとするとして`; rewrite its Vietnamese rejection and explain the correct allegation construction | Exam PDF page 4, enlarged source image; the shortened option was also grammatical |
| 51 | `何かしょうとすると` → `何かしようとすると` | Exam PDF page 7 |
| 72 | `僕も何回やってみたい` → `僕も何かやってみたい` | New medium-model transcription at 104–116 seconds and the context of wanting to do something as a volunteer |
| 73 | `政府の景気の箇所` → `政府の景気対策の箇所`; synchronize its Vietnamese gloss | Small and medium ASR both recover the omitted `対策` at 211–216 seconds |
| 75 | `人数分コピーするじゃ` → `人数分コピーするんじゃ` | Necessary grammatical repair; existing Whisper segment 398.07–404.07 also has `するんじゃ` |
| 80 | `今一面白みに` → `今一つ面白みに` in the legacy explanation | Match the already corrected approved transcript |
| 83 | `最大な見所` → `最大の見所` in the legacy explanation | Match the already corrected approved transcript |
| 84 | `掃除機の買う人` → `掃除機を買う人` in option 4 and quoted explanations | Correct the source script's particle typo; match the approved transcript |
| 85 | `これ以上バイトいれないないよね` → `これ以上バイト入れらんないんだよね` | Medium ASR at 1428–1430 seconds recovers colloquial `入れらんない` (standard `入れられない`); preserve the spoken form |
| 90 | `存知あげません` → `存じあげません` in transcript and correct reason | Standard spelling; the published option already has the correct form |
| 104 | Restore `ほうがいいじゃない`; `スターテイア` → `スターティア` | Small and medium ASR agree on the omitted predicate and the name, at 2380–2391 and 2409–2412 seconds |
| 105 | `近所二坂` → `近所に坂` in the legacy explanation | Match the already corrected approved transcript |

The plan contains seven group revisions and eight explanation revisions. All 106 answer keys, passages, question order, audio and timeline must be preserved. Shared Q50–Q52 and Q105–Q106 groups remain intact. This repair does not claim direct listening verification. New ASR evidence and WAV clips are saved in the owner's planning workspace under `report/n1-2012-07-review-20261105/`; model output is supporting evidence, never imported wholesale.

Explanation plans use `ExplanationDraftSchema`, the same parser as the API. New versions retain canonical reasons, translations and transcripts; unsupported legacy copies (`blocks`, `translationVi`, `explanationMarkdown`) are omitted exactly as the API requires. Old explanation versions and the question's legacy explanation remain preserved. Verification compares the complete parsed payload without masking metadata differences.

Leave Q52 intact. Do not add `前` after `1400年` in Q83. The earlier review's pending phrases in Q72/Q73/Q85/Q104 were reassessed with a larger cached model and grammatical context; the Q85 correction retains the recovered colloquial form. Exact audio verification by a person remains a limitation of this repair.

## Operation

Run only from an isolated worktree on `jlpt-vm`. Use a task-specific directory and credentials sourced privately from the documented demo operators. Never print credentials or reuse another worker's tokens.

```bash
export N1_REPAIR_DIR=/tmp/n1-2012-07-repair-20261105
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
pnpm --filter @jlpt/schema build
node tools/content/n1-2012-07/repair.mjs plan
```

The manifest pins question/group identities, all affected keys and canonical hashes of authoring content and approved explanations. Planning reads the admin API and records exact changes without changing exam content. TOTP authentication may wait once for a fresh 30-second code when a shared operator's current code was consumed by another session.

Before applying, require successful CI for the exact commit, owner authorization, and a fresh custom-format PostgreSQL backup validated with `pg_restore -l`. Pass `N1_REPAIR_CI_COMMIT` and `N1_REPAIR_EXPECTED_COMMIT`, plus the validated backup path and SHA-256 through `N1_REPAIR_BACKUP` and `N1_REPAIR_BACKUP_SHA256`.

```bash
node tools/content/n1-2012-07/repair.mjs apply
node tools/content/n1-2012-07/repair.mjs verify
```

Mutations go through editor/reviewer/publisher APIs; old snapshots stay immutable. Failed content mutations are never automatically retried. Inspect the operation journal and current versions after ambiguous failures. Re-export all 106 questions, compare exactly against the planned replacements, compare all keys and the full snapshot, verify the old v2 snapshot hash, and open the live exam page after publishing.

Data repairs cannot be previewed on `:3210`, because all web instances share the API/database. Remove only this task's auth env file after verification. Do not commit credentials, session tokens or exported content plans.
