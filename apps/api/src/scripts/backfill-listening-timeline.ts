// Restores listening timelines (and group audio) for exams imported before migration 0006.
//
//   DATABASE_URL=postgres://... node dist/src/scripts/backfill-listening-timeline.js <package.zip> [...]
//
// Then republish the exam so the student snapshot carries the timeline.
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import { createDbClient } from '../db/client.js';
import { backfillListeningTimeline } from '../modules/import/backfill-listening-timeline.js';

const zips = process.argv.slice(2);
if (zips.length === 0 || !process.env.DATABASE_URL) {
  console.error('Cần ít nhất một tệp gói .zip và biến DATABASE_URL.');
  process.exit(2);
}
const dbClient = await createDbClient();
try {
  for (const zip of zips) {
    const r = await backfillListeningTimeline(dbClient, fs.readFileSync(zip));
    console.log(`${r.examSlug}: ${r.sections} phần có timeline, sửa audio ${r.groupsAudioFixed} nhóm`);
  }
} finally {
  await dbClient.close();
}
