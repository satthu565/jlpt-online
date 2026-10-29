#!/usr/bin/env node
// H04: Extracts vocabulary from all published exams into database table corpus_terms.
//
//   pnpm --filter @jlpt/api build
//   DATABASE_URL=postgres://... node apps/api/scripts/lexicon/backfill-corpus.mjs
//
import process from 'node:process';
import console from 'node:console';
import { createDbClient } from '../../dist/src/db/client.js';
import { backfillCorpus } from '../../dist/src/modules/vocab/corpus-backfill.js';

if (!process.env.DATABASE_URL && !process.env.PGLITE_DATA_DIR) {
  console.error('Cần biến DATABASE_URL hoặc PGLITE_DATA_DIR.');
  process.exit(2);
}

const dbClient = await createDbClient();
try {
  const r = await backfillCorpus(dbClient);
  console.log(`Đã xử lý ${r.publishedExamsCount} đề thi đã xuất bản.`);
  console.log(`Tổng ${r.totalTerms} lượt xuất hiện, ${r.uniqueTerms} từ khác nhau.`);
  console.log(`Phân bố theo cấp độ: ${JSON.stringify(r.byLevel)}`);
} finally {
  await dbClient.close();
}
