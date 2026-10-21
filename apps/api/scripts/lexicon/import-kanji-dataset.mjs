#!/usr/bin/env node
// Imports the standard kanji dataset (data/kanji/kanji_chuan_v1.json) into the kanji_dataset table.
//
//   DATABASE_URL=postgres://... node apps/api/scripts/lexicon/import-kanji-dataset.mjs data/kanji/kanji_chuan_v1.json
//
// Upserts one row per kanji; rows edited by hand (source = manual) are kept. Re-running the same file changes nothing.
import fs from 'node:fs';
import process from 'node:process';
import console from 'node:console';
import postgres from 'postgres';

export function rowsFromDataset(doc) {
  if (!doc || !Array.isArray(doc.kanji)) throw new Error('Tệp không đúng định dạng: thiếu mảng "kanji"');
  return doc.kanji.map((k) => ({
    kanji: k.han_tu,
    data: k,
    jlpt_level: k.cap_do?.chinh ?? null,
    stroke_count: Number.isInteger(k.so_net) ? k.so_net : null,
    han_viet: k.han_viet?.chinh || null,
    meaning_vi: k.nghia || null,
    dataset_version: doc.phien_ban,
  }));
}

export async function importKanjiDataset(sql, doc, { log = console.log } = {}) {
  const rows = rowsFromDataset(doc);
  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, data: sql.json(r.data) }));
    const res = await sql`
      insert into kanji_dataset ${sql(chunk, 'kanji', 'data', 'jlpt_level', 'stroke_count', 'han_viet', 'meaning_vi', 'dataset_version')}
      on conflict (kanji) do update set
        data = excluded.data, jlpt_level = excluded.jlpt_level, stroke_count = excluded.stroke_count,
        han_viet = excluded.han_viet, meaning_vi = excluded.meaning_vi, dataset_version = excluded.dataset_version,
        updated_at = now()
      where kanji_dataset.source <> 'manual' and kanji_dataset.data is distinct from excluded.data`;
    written += res.count;
  }
  log(`Bộ dữ liệu ${doc.phien_ban}: ${rows.length} chữ; ghi mới hoặc cập nhật ${written}.`);
  return { total: rows.length, written };
}

if (process.argv[1] && process.argv[1].endsWith('import-kanji-dataset.mjs')) {
  const file = process.argv[2];
  if (!file || !process.env.DATABASE_URL) {
    console.error('Cần đường dẫn tệp JSON và biến DATABASE_URL.');
    process.exit(2);
  }
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await importKanjiDataset(sql, JSON.parse(fs.readFileSync(file, 'utf8')));
  } finally {
    await sql.end();
  }
}
