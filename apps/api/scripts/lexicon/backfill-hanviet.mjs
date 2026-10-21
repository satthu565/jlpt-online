#!/usr/bin/env node
// H01: computes Hán Việt for every dictionary entry (lexical_entries.han_viet*) from its primary reading.
//
//   pnpm --filter @jlpt/api build
//   DATABASE_URL=postgres://... node apps/api/scripts/lexicon/backfill-hanviet.mjs
//
// Entries an editor fixed by hand (han_viet_source = manual) are never overwritten; entries with an open learner
// report stay in review. Running it again gives the same result. Prints how many entries are high/review/kun.
import process from 'node:process';
import console from 'node:console';
import { createDbClient } from '../../dist/src/db/client.js';
import { backfillHanViet } from '../../dist/src/modules/vocab/hanviet-entries.js';

if (!process.env.DATABASE_URL) {
  console.error('Cần biến DATABASE_URL.');
  process.exit(2);
}
const dbClient = await createDbClient();
try {
  const r = await backfillHanViet(dbClient);
  console.log(`Tổng ${r.total} mục; cập nhật ${r.updated}; giữ nguyên ${r.keptManual} mục sửa tay, ${r.keptReported} mục đang bị báo sai.`);
  console.log(`high ${r.stats.high} · review ${r.stats.review} · kun ${r.stats.kun}`);
} finally {
  await dbClient.close();
}
