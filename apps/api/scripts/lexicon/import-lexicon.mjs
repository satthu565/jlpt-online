#!/usr/bin/env node
// Imports the open EDRDG dictionaries into the lexicon tables used by GET /dictionary/lookup.
//
//   DATABASE_URL=postgres://... node apps/api/scripts/lexicon/import-lexicon.mjs \
//     --jmdict JMdict_e.gz --kanjidic kanjidic2.xml.gz [--all] [--replace]
//
// Files: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz and http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
// Licence: CC BY-SA 4.0, attribution required (https://www.edrdg.org/edrdg/licence.html).
// By default only JMdict entries marked common (news1/ichi1/spec1/spec2/gai1) are imported; --all imports every entry.
// Re-running with the same dataset date is a no-op; --replace removes this provider's earlier rows first.
// H01: every new entry gets its Hán Việt (computeHanViet on the primary reading); with --replace, Hán Việt an
// editor set by hand (han_viet_source = manual) is carried over to the re-imported entry with the same term and reading.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import process from 'node:process';
import console from 'node:console';
import postgres from 'postgres';
import { computeHanViet } from '@jlpt/content-tools';
import { parseJmdict, parseKanjidic, datasetDate } from './parse.mjs';

export const PROVIDER = 'Electronic Dictionary Research and Development Group (EDRDG) — JMdict, KANJIDIC2';
export const LICENSE = 'CC-BY-SA-4.0';
const ATTRIBUTION =
  'This publication has included material from the JMdict and KANJIDIC2 dictionary files in accordance with the ' +
  'licence provisions of the Electronic Dictionaries Research Group. https://www.edrdg.org/edrdg/licence.html';

function readMaybeGz(file) {
  const buf = fs.readFileSync(file);
  return (buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf).toString('utf8');
}

async function insertBatched(sql, table, rows, size = 2000) {
  for (let i = 0; i < rows.length; i += size) await sql`insert into ${sql(table)} ${sql(rows.slice(i, i + size))}`;
}

export async function importLexicon(sql, { jmdictXml, kanjidicXml, commonOnly = true, replace = false, log = console.log }) {
  const version = `jmdict:${datasetDate(jmdictXml) ?? 'unknown'};kanjidic2:${kanjidicXml ? datasetDate(kanjidicXml) ?? 'unknown' : 'none'}`;
  const existing = await sql`select id, rights_terms from lexicon_licenses where provider = ${PROVIDER}`;
  if (existing.some((r) => r.rights_terms?.includes(`version=${version}`)) && !replace) {
    log(`Đã có bản ${version}, bỏ qua (dùng --replace để nạp lại).`);
    return { skipped: true, version };
  }
  return sql.begin(async (tx) => {
    const manual = new Map();
    if (replace && existing.length > 0) {
      const ids = existing.map((r) => r.id);
      const kept = await tx`select e.term, e.han_viet, coalesce(r.reading, '') as reading
                              from lexical_entries e
                              left join entry_readings r on r.entry_id = e.id and r.is_primary
                             where e.license_id in ${tx(ids)} and e.han_viet_source = 'manual'`;
      for (const k of kept) manual.set(`${k.term}\t${k.reading}`, k.han_viet);
      const entryIds = tx`select id from lexical_entries where license_id in ${tx(ids)}`;
      await tx`delete from entry_meanings where entry_id in (${entryIds})`;
      await tx`delete from entry_readings where entry_id in (${entryIds})`;
      await tx`delete from lexical_entries where license_id in ${tx(ids)}`;
      await tx`delete from lexicon_licenses where id in ${tx(ids)}`;
    }
    const licenseId = crypto.randomUUID();
    await tx`insert into lexicon_licenses (id, provider, license, rights_terms)
             values (${licenseId}, ${PROVIDER}, ${LICENSE}, ${`${ATTRIBUTION} version=${version}; scope=${commonOnly ? 'common' : 'all'}`})`;

    const entries = [];
    const readings = [];
    const meanings = [];
    for (const e of parseJmdict(jmdictXml, { commonOnly })) {
      const id = crypto.randomUUID();
      const hv = computeHanViet(e.term, e.readings[0]);
      const manualHanViet = manual.get(`${e.term}\t${e.readings[0] ?? ''}`);
      entries.push({
        id,
        license_id: licenseId,
        term: e.term,
        level: null,
        part_of_speech: e.pos.join(',') || null,
        han_viet: manualHanViet ?? hv.hanViet,
        han_viet_confidence: manualHanViet ? 'high' : hv.confidence,
        han_viet_source: manualHanViet ? 'manual' : hv.source,
        han_viet_updated_at: new Date(),
      });
      e.readings.forEach((r, i) => readings.push({ id: crypto.randomUUID(), entry_id: id, reading: r, is_primary: i === 0 }));
      for (const m of e.meanings) meanings.push({ id: crypto.randomUUID(), entry_id: id, locale: 'en', meaning: m });
    }
    await insertBatched(tx, 'lexical_entries', entries);
    await insertBatched(tx, 'entry_readings', readings);
    await insertBatched(tx, 'entry_meanings', meanings);

    let kanjiCount = 0;
    if (kanjidicXml) {
      const kanji = [...parseKanjidic(kanjidicXml)].map((k) => ({
        id: crypto.randomUUID(),
        kanji: k.kanji,
        level: k.level,
        stroke_count: k.strokeCount,
        onyomi: k.onyomi,
        kunyomi: k.kunyomi,
        meanings: JSON.stringify(k.meanings),
      }));
      for (let i = 0; i < kanji.length; i += 1000) {
        const chunk = kanji.slice(i, i + 1000);
        await tx`insert into kanji_entries ${tx(chunk)}
                 on conflict (kanji) do update set level = excluded.level, stroke_count = excluded.stroke_count,
                   onyomi = excluded.onyomi, kunyomi = excluded.kunyomi, meanings = excluded.meanings`;
      }
      kanjiCount = kanji.length;
    }
    log(`Đã nạp ${entries.length} mục từ, ${readings.length} cách đọc, ${meanings.length} nghĩa, ${kanjiCount} kanji (${version}).`);
    return { skipped: false, version, entries: entries.length, readings: readings.length, meanings: meanings.length, kanji: kanjiCount };
  });
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import-lexicon.mjs')) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const jmdict = arg('--jmdict');
  if (!jmdict || !process.env.DATABASE_URL) {
    console.error('Cần --jmdict <file> và biến DATABASE_URL.');
    process.exit(2);
  }
  const kanjidic = arg('--kanjidic');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await importLexicon(sql, {
      jmdictXml: readMaybeGz(jmdict),
      kanjidicXml: kanjidic ? readMaybeGz(kanjidic) : undefined,
      commonOnly: !process.argv.includes('--all'),
      replace: process.argv.includes('--replace'),
    });
  } finally {
    await sql.end();
  }
}
