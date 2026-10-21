// Admin "Kanji" page: every KANJIDIC2 character in kanji_entries with its Hán Việt (read-only).
import { and, count, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { getHanVietByOnyomi, getHanVietForKanji } from '@jlpt/content-tools';
import type { DbClientInstance } from '../../db/client.js';
import { kanjiEntries } from '../../db/schema.js';

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
    })),
  };
}
