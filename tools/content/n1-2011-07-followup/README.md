# N1 July 2011: Q104 follow-up

The owner approved this follow-up on 2026-11-06. Correct Q104's `検収` to `研修` in option 1, the transcript and explanation quotations. In the transportation-company dialogue, `安全研修` is safety training; `検収` means acceptance inspection and is the wrong kanji. Both words read けんしゅう, so audio cannot distinguish their spelling. Also correct the Vietnamese gloss `phương pháp kiểm tra tài xế` to `phương pháp đào tạo tài xế`.

The plan pins the current identities, baseline content hashes and answer key. It creates one group revision and one canonical explanation revision, followed by a new immutable exam snapshot. Q104 stays at answer 2; all 106 keys, unrelated content, media and timeline must remain intact. Preserve the v7 snapshot.

Q85 is deliberately unchanged. A new check of the source audio at 1545–1565 and 1535–1575 seconds with cached faster-whisper-medium, and at 1545–1565 seconds with faster-whisper-small, consistently returns `経済情勢が大きく左右されてしまいます`, matching the current transcript. The script PDF instead prints `左右されています`. The ASR runs are supporting evidence; this operation does not claim direct human listening. WAV clips, source SHA-256 and complete ASR output are saved in the owner's planning workspace under `report/n1-2011-07-followup-20261106/`.

## Operation

Run on `jlpt-vm` from an isolated worktree. Use this task's own auth env file, loaded privately from the documented editor/reviewer/publisher operators. Never print credentials or reuse session tokens.

```bash
export N1_REPAIR_DIR=/tmp/n1-2011-07-followup-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
pnpm --filter @jlpt/schema build
node tools/content/n1-2011-07-followup/repair.mjs plan
```

Before writes, require owner approval, successful mandatory CI for the exact commit, and a fresh PostgreSQL custom-format backup validated using `pg_restore -l`. Supply the validated backup path/SHA-256 via `N1_REPAIR_BACKUP` and `N1_REPAIR_BACKUP_SHA256`, and the verified commit via `N1_REPAIR_CI_COMMIT` and `N1_REPAIR_EXPECTED_COMMIT`.

```bash
node tools/content/n1-2011-07-followup/repair.mjs apply
node tools/content/n1-2011-07-followup/repair.mjs verify
```

The script follows editor → reviewer → publisher APIs; the publisher operator must have admin role. It uses the same ExplanationDraftSchema as the API, preserving all canonical explanation fields while omitting unsupported legacy display copies. It never retries ambiguous content mutations. Inspect the operation journal and current versions before recovery.

After publication, re-export all 106 authoring records and snapshot/key data. Compare the complete planned changes, confirm Q85 unchanged and all 106 keys unchanged, verify the v7 snapshot hash, then open the live page. Data changes cannot be isolated on `:3210`. Remove this task's auth env file after verification.
