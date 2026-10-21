import { inArray } from 'drizzle-orm';
import type { DbClientInstance } from '../../db/client.js';
import { kanjiEntries } from '../../db/schema.js';
import { extractKanjiCharacters, getHanVietForKanji, KANJI_DATABASE } from './nlp/index.js';
import type { DictionaryKanjiDetailDto } from './vocab.types.js';

export const KANJIDIC_FALLBACK_DATABASE: Record<string, Partial<DictionaryKanjiDetailDto>> = {
  要: {
    kanji: '要',
    onyomi: ['ヨウ'],
    kunyomi: ['い・る', 'かなめ'],
    strokeCount: 9,
    meanings: ['need', 'main point', 'necessity', 'vital point', 'demand'],
    level: 'N4',
    hanViet: 'YẾU',
  },
  約: {
    kanji: '約',
    onyomi: ['ヤク'],
    kunyomi: ['つづ・まる', 'つづ・める'],
    strokeCount: 9,
    meanings: ['promise', 'approximately', 'shrink'],
    level: 'N4',
    hanViet: 'ƯỚC',
  },
  静: {
    kanji: '静',
    onyomi: ['セイ', 'ジョウ'],
    kunyomi: ['しず・か', 'しず・まる', 'しず・める'],
    strokeCount: 14,
    meanings: ['quiet'],
    level: 'N3',
    hanViet: 'TĨNH',
  },
  高: {
    kanji: '高',
    onyomi: ['コウ'],
    kunyomi: ['たか・い', 'たか', 'たか・まる', 'たか・める'],
    strokeCount: 10,
    meanings: ['tall', 'high', 'expensive'],
    level: 'N5',
    hanViet: 'CAO',
  },
  食: {
    kanji: '食',
    onyomi: ['ショク', 'ジキ'],
    kunyomi: ['く・う', 'く・らう', 'た・べる', 'は・む'],
    strokeCount: 9,
    meanings: ['eat', 'food'],
    level: 'N5',
    hanViet: 'THỰC',
  },
  予: {
    kanji: '予',
    onyomi: ['ヨ'],
    kunyomi: ['あらかじ・め'],
    strokeCount: 4,
    meanings: ['in advance', 'beforehand', 'previous'],
    level: 'N4',
    hanViet: 'DỰ',
  },
  勉: {
    kanji: '勉',
    onyomi: ['ベン'],
    kunyomi: ['つと・める'],
    strokeCount: 10,
    meanings: ['exertion', 'endeavour', 'effort', 'study'],
    level: 'N5',
    hanViet: 'MIỄN',
  },
  強: {
    kanji: '強',
    onyomi: ['キョウ', 'ゴウ'],
    kunyomi: ['つよ・い', 'つよ・まる', 'つよ・める', 'し・いる', 'こわ・い'],
    strokeCount: 11,
    meanings: ['strong'],
    level: 'N5',
    hanViet: 'CƯỜNG',
  },
};

export async function getKanjiDetailsForWord(
  dbClient: DbClientInstance,
  word: string,
): Promise<DictionaryKanjiDetailDto[]> {
  const kanjiChars = extractKanjiCharacters(word);
  if (kanjiChars.length === 0) return [];

  // Deduplicate while preserving order of occurrence
  const uniqueKanji = Array.from(new Set(kanjiChars));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dbRecords: any[] = [];
  try {
    dbRecords = await dbClient.db
      .select()
      .from(kanjiEntries)
      .where(inArray(kanjiEntries.kanji, uniqueKanji));
  } catch {
    // If kanjiEntries is missing or empty, fall through to fallback
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbMap = new Map<string, any>();
  for (const r of dbRecords) {
    dbMap.set(r.kanji, r);
  }

  return uniqueKanji.map((k) => {
    const fromDb = dbMap.get(k);
    const fallback = KANJIDIC_FALLBACK_DATABASE[k];
    const kanjiBase = KANJI_DATABASE[k];
    const hanViet = getHanVietForKanji(k) || fallback?.hanViet || kanjiBase?.hanViet || '';

    const onyomi: string[] =
      (fromDb?.onyomi && fromDb.onyomi.length > 0 ? fromDb.onyomi : undefined) ??
      (fallback?.onyomi && fallback.onyomi.length > 0 ? fallback.onyomi : undefined) ??
      (kanjiBase?.onyomi && kanjiBase.onyomi.length > 0 ? kanjiBase.onyomi : []) ??
      [];

    const kunyomi: string[] =
      (fromDb?.kunyomi && fromDb.kunyomi.length > 0 ? fromDb.kunyomi : undefined) ??
      (fallback?.kunyomi && fallback.kunyomi.length > 0 ? fallback.kunyomi : undefined) ??
      (kanjiBase?.kunyomi && kanjiBase.kunyomi.length > 0 ? kanjiBase.kunyomi : []) ??
      [];

    const strokeCount: number | null =
      fromDb?.strokeCount ?? fallback?.strokeCount ?? kanjiBase?.strokeCount ?? null;

    const level: string | null =
      fromDb?.level ?? fallback?.level ?? kanjiBase?.level ?? null;

    let meanings: string[] = [];
    if (fromDb?.meanings) {
      meanings = Array.isArray(fromDb.meanings) ? fromDb.meanings : JSON.parse(fromDb.meanings);
    } else if (fallback?.meanings && fallback.meanings.length > 0) {
      meanings = fallback.meanings;
    } else if (kanjiBase?.meanings && kanjiBase.meanings.length > 0) {
      meanings = kanjiBase.meanings;
    }

    return {
      kanji: k,
      onyomi,
      kunyomi,
      strokeCount,
      meanings,
      level,
      hanViet,
    };
  });
}
