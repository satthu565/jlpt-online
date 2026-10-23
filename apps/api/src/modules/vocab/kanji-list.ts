// Admin "Kanji" page: every KANJIDIC2 character in kanji_entries with its Hán Việt (read-only).
import { and, count, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { getHanVietByOnyomi, getHanVietForKanji } from '@jlpt/content-tools';
import type { DbClientInstance } from '../../db/client.js';
import { kanjiDataset, kanjiEntries } from '../../db/schema.js';

export interface KanjiListItem {
  id: string;
  kanji: string;
  hanViet: string;
  hanVietByOnyomi: Array<{ onyomi: string; hanViet: string }>;
  onyomi: string[];
  kunyomi: string[];
  meanings: string[];
  strokeCount: number | null;
  level: string | null;
  /** From the standard dataset (kanji_dataset); empty when only KANJIDIC2 is loaded. */
  meaningVi: string;
  levels: string[];
  /** Hán Việt corrected by an editor in the admin (kanji_dataset.source = manual). */
  edited?: boolean;
}

export interface KanjiListResult {
  total: number;
  page: number;
  pageSize: number;
  items: KanjiListItem[];
}

const KANJI_RE = /[一-鿿㐀-䶿]/g;
const KANA_RE = /^[぀-ヿ.ー-]+$/;
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

function hiraganaToKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

/** meanings is jsonb; the importer stored a JSON string in it, so accept both shapes. */
function parseMeanings(value: unknown): string[] {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [v as string];
    }
  }
  return Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : [];
}

export async function listKanjiEntries(
  dbClient: DbClientInstance,
  params: { q?: string; level?: string; page?: number; pageSize?: number },
): Promise<KanjiListResult> {
  const db = dbClient.db;
  const pageSize = Math.min(Math.max(Number(params.pageSize) || 60, 1), 200);
  const page = Math.max(Number(params.page) || 1, 1);
  const [{ value: datasetRows }] = await db.select({ value: count() }).from(kanjiDataset);
  if (Number(datasetRows) > 0) return listFromDataset(dbClient, params, page, pageSize);
  const conditions: SQL[] = [];

  const level = params.level?.trim().toUpperCase();
  if (level === 'NONE') conditions.push(sql`${kanjiEntries.level} is null`);
  else if (level && LEVELS.includes(level)) conditions.push(sql`${kanjiEntries.level} = ${level}`);

  const q = params.q?.normalize('NFC').trim();
  if (q) {
    const chars = q.match(KANJI_RE);
    if (chars) {
      // Kanji typed or pasted (also a whole word): list those characters.
      conditions.push(inArray(kanjiEntries.kanji, [...new Set(chars)]));
    } else if (KANA_RE.test(q)) {
      const kata = hiraganaToKatakana(q);
      conditions.push(
        or(
          sql`exists (select 1 from unnest(${kanjiEntries.onyomi}) o where o like ${`%${kata}%`})`,
          sql`exists (select 1 from unnest(${kanjiEntries.kunyomi}) k where replace(k, '.', '') like ${`%${q}%`})`,
        )!,
      );
    } else {
      // Hán Việt (e.g. "nhạc") or English meaning: Hán Việt lives in code, so match it over the character list.
      const needle = q.toUpperCase();
      const all: Array<{ kanji: string }> = await db.select({ kanji: kanjiEntries.kanji }).from(kanjiEntries);
      const byHanViet = all
        .map((r) => r.kanji)
        .filter(
          (k) =>
            getHanVietForKanji(k) === needle || getHanVietByOnyomi(k).some((x) => x.hanViet === needle),
        );
      const meaning = ilike(sql`${kanjiEntries.meanings}::text`, `%${q}%`);
      conditions.push(byHanViet.length > 0 ? or(inArray(kanjiEntries.kanji, byHanViet), meaning)! : meaning);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ value: total }] = await db.select({ value: count() }).from(kanjiEntries).where(where);
  const rows: Array<{
    id: string;
    kanji: string;
    level: string | null;
    strokeCount: number | null;
    onyomi: string[];
    kunyomi: string[];
    meanings: unknown;
  }> = await db
    .select()
    .from(kanjiEntries)
    .where(where)
    .orderBy(
      sql`case ${kanjiEntries.level} when 'N5' then 1 when 'N4' then 2 when 'N3' then 3 when 'N2' then 4 when 'N1' then 5 else 6 end`,
      sql`${kanjiEntries.strokeCount} nulls last`,
      kanjiEntries.kanji,
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    total: Number(total),
    page,
    pageSize,
    items: rows.map((r) => ({
      id: r.id,
      kanji: r.kanji,
      hanViet: getHanVietForKanji(r.kanji),
      hanVietByOnyomi: getHanVietByOnyomi(r.kanji),
      onyomi: r.onyomi ?? [],
      kunyomi: r.kunyomi ?? [],
      meanings: parseMeanings(r.meanings).slice(0, 4),
      strokeCount: r.strokeCount,
      level: r.level,
      meaningVi: '',
      levels: r.level ? [r.level] : [],
    })),
  };
}

type DatasetRecord = {
  han_tu: string;
  han_viet?: { chinh?: string; theo_am_on?: Record<string, string> };
  am_on?: Array<{ am: string }>;
  am_kun?: Array<{ am: string }>;
  nghia?: string;
  nghia_en?: string[];
  so_net?: number | null;
  cap_do?: { chinh?: string | null; tat_ca?: string[] };
};

/** Standard dataset path: search also covers Vietnamese meaning and the dataset's Hán Việt. */
async function listFromDataset(
  dbClient: DbClientInstance,
  params: { q?: string; level?: string },
  page: number,
  pageSize: number,
): Promise<KanjiListResult> {
  const db = dbClient.db;
  const conditions: SQL[] = [];
  const level = params.level?.trim().toUpperCase();
  if (level === 'NONE') conditions.push(sql`${kanjiDataset.jlptLevel} is null`);
  else if (level && LEVELS.includes(level)) conditions.push(sql`${kanjiDataset.jlptLevel} = ${level}`);

  const q = params.q?.normalize('NFC').trim();
  if (q) {
    const chars = q.match(KANJI_RE);
    if (chars) {
      conditions.push(inArray(kanjiDataset.kanji, [...new Set(chars)]));
    } else if (KANA_RE.test(q)) {
      const kata = hiraganaToKatakana(q);
      conditions.push(
        or(
          sql`(${kanjiDataset.data} -> 'am_on')::text like ${`%${kata}%`}`,
          sql`replace((${kanjiDataset.data} -> 'am_kun')::text, '.', '') like ${`%${q}%`}`,
        )!,
      );
    } else {
      const like = `%${q}%`;
      conditions.push(
        or(
          sql`upper(${kanjiDataset.hanViet}) = ${q.toUpperCase()}`,
          sql`(${kanjiDataset.data} -> 'han_viet')::text ilike ${`%"${q.toUpperCase()}"%`}`,
          ilike(kanjiDataset.meaningVi, like),
          sql`(${kanjiDataset.data} -> 'nghia_en')::text ilike ${like}`,
        )!,
      );
    }
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ value: total }] = await db.select({ value: count() }).from(kanjiDataset).where(where);
  const rows: Array<{ data: unknown; jlptLevel: string | null; strokeCount: number | null; source: string }> = await db
    .select({
      data: kanjiDataset.data,
      jlptLevel: kanjiDataset.jlptLevel,
      strokeCount: kanjiDataset.strokeCount,
      source: kanjiDataset.source,
    })
    .from(kanjiDataset)
    .where(where)
    .orderBy(
      sql`case ${kanjiDataset.jlptLevel} when 'N5' then 1 when 'N4' then 2 when 'N3' then 3 when 'N2' then 4 when 'N1' then 5 else 6 end`,
      sql`coalesce((${kanjiDataset.data} ->> 'tan_suat')::int, 9999)`,
      kanjiDataset.kanji,
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    total: Number(total),
    page,
    pageSize,
    items: rows.map((r) => {
      const d = (typeof r.data === 'string' ? JSON.parse(r.data) : r.data) as DatasetRecord;
      return {
        id: d.han_tu,
        kanji: d.han_tu,
        hanViet: d.han_viet?.chinh ?? '',
        hanVietByOnyomi: Object.entries(d.han_viet?.theo_am_on ?? {}).map(([onyomi, hanViet]) => ({ onyomi, hanViet })),
        onyomi: (d.am_on ?? []).map((x) => x.am),
        kunyomi: (d.am_kun ?? []).map((x) => x.am),
        meanings: (d.nghia_en ?? []).slice(0, 4),
        strokeCount: r.strokeCount,
        level: r.jlptLevel,
        meaningVi: d.nghia ?? '',
        levels: d.cap_do?.tat_ca ?? [],
        edited: r.source === 'manual',
      };
    }),
  };
}
