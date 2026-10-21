import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import {
  DictionaryAdapter,
  tagQuestion,
  type QuestionTagItem,
  getHanVietForWord,
  computeHanViet,
  containsJapanese,
  lemmatize,
} from './nlp/index.js';
import { romajiToHiragana } from './romaji.js';
import { getPosLabels } from './pos-labels.js';
import { getKanjiDetailsForWord } from './kanjidic-data.js';
import {
  backfillHanViet,
  listHanVietForReview,
  loadStoredHanViet,
  perKanjiFor,
  reportHanViet,
  updateEntryHanViet,
  type HanVietBackfillResult,
  type HanVietReviewList,
} from './hanviet-entries.js';
import { listKanjiEntries, type KanjiListResult } from './kanji-list.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  corpusTerms,
  entryMeanings,
  entryReadings,
  lexicalEntries,
  lexiconLicenses,
  questionTags,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  DictionaryEntryDetailDto,
  DictionaryLookupQueryDto,
  DictionaryLookupResponseDto,
  DictionarySenseDto,
  QuestionTagResultDto,
  TagQuestionDto,
} from './vocab.types.js';

export interface LexiconListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Array<{
    id: string;
    term: string;
    readings: string[];
    meanings: string[];
    partOfSpeech: string;
    hanViet: string;
    provider: string;
  }>;
}

@Injectable()
export class VocabService implements OnModuleInit {
  private dictionaryAdapter = new DictionaryAdapter({ providerType: 'sandbox' });

  private lookupCache = new Map<string, { data: DictionaryLookupResponseDto; expiresAt: number }>();
  private readonly MAX_LOOKUP_CACHE_SIZE = 2000;
  private readonly LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /** H01: load stored Hán Việt so notebook, flashcards and quizzes use the per-entry value. */
  async onModuleInit(): Promise<void> {
    try {
      await loadStoredHanViet(this.dbClient);
    } catch {
      // Dictionary tables missing or empty: callers fall back to the computed value.
    }
  }

  backfillHanViet(): Promise<HanVietBackfillResult> {
    return backfillHanViet(this.dbClient);
  }

  listHanVietForReview(params: { confidence?: string; q?: string; page?: number; pageSize?: number }): Promise<HanVietReviewList> {
    return listHanVietForReview(this.dbClient, params);
  }

  updateEntryHanViet(entryId: string, hanViet: unknown, operatorId?: string) {
    return updateEntryHanViet(this.dbClient, entryId, hanViet, operatorId);
  }

  reportHanViet(body: { entry?: unknown; reading?: unknown; suggestion?: unknown; note?: unknown }, userId?: string) {
    return reportHanViet(this.dbClient, body, userId);
  }

  /** Admin "Kanji" page: every KANJIDIC2 character with its Hán Việt. */
  listKanjiEntries(params: { q?: string; level?: string; page?: number; pageSize?: number }): Promise<KanjiListResult> {
    return listKanjiEntries(this.dbClient, params);
  }

  private async findRawEntry(
    text: string,
    locale: string,
  ): Promise<{
    id?: string;
    entry: string;
    readings: string[];
    meanings: string[];
    examples: string[];
    license: string;
    attribution: string;
    level?: string;
    partOfSpeech?: string;
    status: 'READY' | 'SANDBOX' | 'MISSING';
    hanViet?: string;
    hanVietConfidence?: 'high' | 'review' | 'kun';
    hanVietSource?: 'rule' | 'override' | 'manual';
    hanVietPerKanji?: Array<{ kanji: string; onyomi?: string; hanViet: string }>;
  } | null> {
    // 1. Try DB lexical entries if populated
    try {
      let dbEntries = await this.dbClient.db
        .select()
        .from(lexicalEntries)
        .where(eq(lexicalEntries.term, text))
        .limit(1);

      // Kana input (よやく) matches the reading of a kanji headword (予約).
      if (dbEntries.length === 0) {
        dbEntries = await this.dbClient.db
          .select({
            id: lexicalEntries.id,
            licenseId: lexicalEntries.licenseId,
            term: lexicalEntries.term,
            level: lexicalEntries.level,
            partOfSpeech: lexicalEntries.partOfSpeech,
            hanViet: lexicalEntries.hanViet,
            hanVietConfidence: lexicalEntries.hanVietConfidence,
            hanVietSource: lexicalEntries.hanVietSource,
            hanVietUpdatedAt: lexicalEntries.hanVietUpdatedAt,
            createdAt: lexicalEntries.createdAt,
          })
          .from(entryReadings)
          .innerJoin(lexicalEntries, eq(entryReadings.entryId, lexicalEntries.id))
          .where(eq(entryReadings.reading, text))
          .limit(1);
      }

      if (dbEntries.length > 0) {
        const entry = dbEntries[0]!;
        const readings = await this.dbClient.db
          .select()
          .from(entryReadings)
          .where(eq(entryReadings.entryId, entry.id));
        const meanings = await this.dbClient.db
          .select()
          .from(entryMeanings)
          .where(eq(entryMeanings.entryId, entry.id));

        let licenseName = 'CC-BY-SA-4.0';
        let attribution =
          'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0';

        if (entry.licenseId) {
          const lic = await this.dbClient.db
            .select()
            .from(lexiconLicenses)
            .where(eq(lexiconLicenses.id, entry.licenseId))
            .limit(1);
          if (lic.length > 0) {
            licenseName = lic[0]!.license;
            attribution = `${lic[0]!.provider} / ${lic[0]!.license}`;
          }
        }

        const primary =
          (readings as Array<{ reading: string; isPrimary: boolean }>).find((r) => r.isPrimary)?.reading ??
          (readings[0] as { reading: string } | undefined)?.reading;
        const computed = computeHanViet(entry.term, primary);
        const hanViet = entry.hanViet ?? computed.hanViet;
        // Kana-only headwords have no Hán Việt, so no confidence either.
        const hasKanji = computed.perKanji.length > 0;
        const hanVietConfidence = hasKanji
          ? ((entry.hanVietConfidence ?? computed.confidence) as 'high' | 'review' | 'kun')
          : undefined;
        const hanVietSource = (entry.hanVietSource ?? computed.source) as 'rule' | 'override' | 'manual';
        return {
          id: entry.id,
          entry: entry.term,
          readings: readings.map((r: { reading: string }) => r.reading),
          meanings: meanings.map((m: { meaning: string }) => m.meaning),
          examples: [],
          license: licenseName,
          attribution,
          level: entry.level ?? undefined,
          partOfSpeech: entry.partOfSpeech ?? undefined,
          status: 'READY',
          hanViet,
          hanVietConfidence,
          hanVietSource,
          hanVietPerKanji: perKanjiFor(entry.term, primary, entry.hanViet, entry.hanVietSource),
        };
      }
    } catch {
      // Fall through to dictionary adapter if DB not populated
    }

    // 2. Fallback to dictionary adapter with sandbox & full license/attribution
    const result = this.dictionaryAdapter.lookup(text, locale);
    if (!result) {
      return null;
    }

    const primaryReading = result.readings[0];
    const computed = computeHanViet(result.entry, primaryReading);
    const hanViet = result.hanViet || getHanVietForWord(result.entry, primaryReading) || computed.hanViet || '';
    return {
      entry: result.entry,
      readings: result.readings,
      meanings: result.meanings,
      examples: result.examples,
      license: result.license,
      attribution: result.attribution,
      level: result.level,
      partOfSpeech: result.partOfSpeech,
      status: result.status,
      hanViet,
      hanVietConfidence: computed.confidence,
      hanVietSource: computed.source,
      hanVietPerKanji: computed.perKanji,
    };
  }

  /**
   * Tra cứu từ vựng trong từ điển có bản quyền (H05, phục vụ tra nhanh khi bôi đen).
   */
  async lookupDictionary(
    dto: DictionaryLookupQueryDto,
  ): Promise<DictionaryLookupResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Query text is required for dictionary lookup');
    }

    const trimmed = dto.text.trim();
    if (trimmed.length > 20) {
      throw new BadRequestException('Query text exceeds maximum length of 20 characters');
    }
    let queryText = trimmed;
    if (!containsJapanese(trimmed)) {
      const hiragana = romajiToHiragana(trimmed);
      if (hiragana && containsJapanese(hiragana)) {
        queryText = hiragana;
      } else {
        throw new BadRequestException('Query text must contain Japanese characters');
      }
    }

    const locale = dto.locale ?? 'vi';
    const cacheKey = `${trimmed}:${locale}`;

    const cached = this.lookupCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let matchedText = trimmed;
    let raw = await this.findRawEntry(queryText, locale);
    if (!raw && queryText !== trimmed) {
      raw = await this.findRawEntry(trimmed, locale);
    }

    // 2. If no direct match, try lemmatizer
    if (!raw) {
      const lemmaResult = lemmatize(queryText);
      if (lemmaResult.baseForm && lemmaResult.baseForm !== queryText) {
        raw = await this.findRawEntry(lemmaResult.baseForm, locale);
        if (raw) {
          matchedText = trimmed;
        }
      }
      if (!raw && lemmaResult.baseForm?.endsWith('する')) {
        const suruStem = lemmaResult.baseForm.slice(0, -2);
        if (suruStem) {
          raw = await this.findRawEntry(suruStem, locale);
          if (raw) {
            matchedText = trimmed;
          }
        }
      }
    }

    // 3. If still no match, strip trailing kana (okurigana thừa khi bôi đen dư)
    if (!raw) {
      let candidate = queryText;
      const isKana = (char: string) => /[\u3040-\u309f\u30a0-\u30ff]/.test(char);
      while (!raw && candidate.length > 1 && isKana(candidate.charAt(candidate.length - 1))) {
        candidate = candidate.slice(0, -1);
        // Try candidate directly
        raw = await this.findRawEntry(candidate, locale);
        if (raw) {
          matchedText = candidate;
          break;
        }
        // Try lemmatizing candidate
        const candLemma = lemmatize(candidate);
        if (candLemma.baseForm) {
          raw = await this.findRawEntry(candLemma.baseForm, locale);
          if (raw) {
            matchedText = candidate;
            break;
          }
          if (candLemma.baseForm.endsWith('する')) {
            const candStem = candLemma.baseForm.slice(0, -2);
            if (candStem) {
              raw = await this.findRawEntry(candStem, locale);
              if (raw) {
                matchedText = candidate;
                break;
              }
            }
          }
        }
      }
    }

    if (!raw) {
      throw new NotFoundException(`No dictionary entry found for '${trimmed}'`);
    }

    const posLabels = getPosLabels(raw.partOfSpeech);
    const lemma = raw.entry;

    const response: DictionaryLookupResponseDto = {
      entry: raw.entry,
      readings: raw.readings,
      meanings: raw.meanings,
      examples: raw.examples ?? [],
      license: raw.license,
      attribution: raw.attribution,
      level: raw.level,
      partOfSpeech: raw.partOfSpeech,
      posLabels,
      matchedText,
      lemma,
      status: raw.status,
      hanViet: raw.hanViet,
      hanVietConfidence: raw.hanVietConfidence,
      hanVietSource: raw.hanVietSource,
      hanVietPerKanji: raw.hanVietPerKanji,
    };

    // Bounded cache
    if (this.lookupCache.size >= this.MAX_LOOKUP_CACHE_SIZE) {
      const firstKey = this.lookupCache.keys().next().value;
      if (firstKey) this.lookupCache.delete(firstKey);
    }
    this.lookupCache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + this.LOOKUP_CACHE_TTL_MS,
    });

    return response;
  }

  /**
   * Chi tiết một mục từ điển (H05, phục vụ trang chi tiết từ vựng /tu-vung/:term).
   */
  async getEntryDetails(term: string): Promise<DictionaryEntryDetailDto> {
    if (!term || typeof term !== 'string') {
      throw new BadRequestException('Dictionary term is required');
    }
    const decoded = decodeURIComponent(term).trim();
    if (decoded.length === 0 || decoded.length > 20) {
      throw new BadRequestException('Dictionary term must be between 1 and 20 characters');
    }
    let queryTerm = decoded;
    if (!containsJapanese(decoded)) {
      const hiragana = romajiToHiragana(decoded);
      if (hiragana && containsJapanese(hiragana)) {
        queryTerm = hiragana;
      } else {
        throw new BadRequestException('Dictionary term must contain Japanese characters');
      }
    }

    let entryId: string | undefined;
    let entryTerm = decoded;
    let entryLevel: string | null = null;
    let entryPos: string | null = null;
    let entryHanViet: string | null = null;
    let entryHanVietConfidence: 'high' | 'review' | 'kun' | null = null;
    let entryHanVietSource: 'rule' | 'override' | 'manual' | null = null;
    let licenseName = 'CC-BY-SA-4.0';
    let attribution =
      'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0';
    let readingsList: string[] = [];
    let meaningRows: Array<{ id: string; meaning: string; locale: string; senseIndex: number; pos: string | null }> = [];

    // 1. Try DB
    try {
      let dbEntries = await this.dbClient.db
        .select()
        .from(lexicalEntries)
        .where(eq(lexicalEntries.term, queryTerm))
        .limit(1);

      if (dbEntries.length === 0 && queryTerm !== decoded) {
        dbEntries = await this.dbClient.db
          .select()
          .from(lexicalEntries)
          .where(eq(lexicalEntries.term, decoded))
          .limit(1);
      }

      if (dbEntries.length === 0) {
        dbEntries = await this.dbClient.db
          .select({
            id: lexicalEntries.id,
            licenseId: lexicalEntries.licenseId,
            term: lexicalEntries.term,
            level: lexicalEntries.level,
            partOfSpeech: lexicalEntries.partOfSpeech,
            hanViet: lexicalEntries.hanViet,
            hanVietConfidence: lexicalEntries.hanVietConfidence,
            hanVietSource: lexicalEntries.hanVietSource,
            hanVietUpdatedAt: lexicalEntries.hanVietUpdatedAt,
            createdAt: lexicalEntries.createdAt,
          })
          .from(entryReadings)
          .innerJoin(lexicalEntries, eq(entryReadings.entryId, lexicalEntries.id))
          .where(eq(entryReadings.reading, queryTerm))
          .limit(1);
      }

      if (dbEntries.length > 0) {
        const dbEntry = dbEntries[0]!;
        entryId = dbEntry.id;
        entryTerm = dbEntry.term;
        entryLevel = dbEntry.level;
        entryPos = dbEntry.partOfSpeech;
        entryHanViet = dbEntry.hanViet;
        entryHanVietConfidence = dbEntry.hanVietConfidence as 'high' | 'review' | 'kun' | null;
        entryHanVietSource = dbEntry.hanVietSource as 'rule' | 'override' | 'manual' | null;

        const dbReadings = await this.dbClient.db
          .select()
          .from(entryReadings)
          .where(eq(entryReadings.entryId, dbEntry.id));
        readingsList = dbReadings.map((r: { reading: string }) => r.reading);

        meaningRows = await this.dbClient.db
          .select()
          .from(entryMeanings)
          .where(eq(entryMeanings.entryId, dbEntry.id));

        if (dbEntry.licenseId) {
          const lic = await this.dbClient.db
            .select()
            .from(lexiconLicenses)
            .where(eq(lexiconLicenses.id, dbEntry.licenseId))
            .limit(1);
          if (lic.length > 0) {
            licenseName = lic[0]!.license;
            attribution = `${lic[0]!.provider} / ${lic[0]!.license}`;
          }
        }
      }
    } catch {
      // Fall through to sandbox
    }

    // 2. If not in DB, fallback to sandbox dictionary
    if (!entryId && readingsList.length === 0) {
      const sandbox =
        this.dictionaryAdapter.lookup(queryTerm, 'en') ||
        (queryTerm !== decoded ? this.dictionaryAdapter.lookup(decoded, 'en') : null);
      if (!sandbox) {
        throw new NotFoundException(`No dictionary entry found for '${decoded}'`);
      }
      entryTerm = sandbox.entry;
      entryLevel = sandbox.level ?? null;
      entryPos = sandbox.partOfSpeech ?? null;
      readingsList = sandbox.readings;
      meaningRows = sandbox.meanings.map((m, idx) => ({
        id: `m-${idx}`,
        meaning: m,
        locale: 'en',
        senseIndex: idx,
        pos: sandbox.partOfSpeech ?? null,
      }));
      licenseName = sandbox.license;
      attribution = sandbox.attribution;
    }

    // Senses grouping
    const sensesMap = new Map<number, Array<{ meaning: string; pos: string | null }>>();
    for (const row of meaningRows) {
      const idx = row.senseIndex ?? 0;
      if (!sensesMap.has(idx)) {
        sensesMap.set(idx, []);
      }
      sensesMap.get(idx)!.push({ meaning: row.meaning, pos: row.pos });
    }

    const senses: DictionarySenseDto[] = [];
    const sortedIndices = Array.from(sensesMap.keys()).sort((a, b) => a - b);
    for (const idx of sortedIndices) {
      const items = sensesMap.get(idx)!;
      const sensePos = items[0]?.pos || entryPos || undefined;
      const posLabels = getPosLabels(sensePos);
      const glosses = items.map((i) => i.meaning);
      senses.push({
        index: idx,
        pos: sensePos,
        posLabels,
        meanings: glosses,
        gloss: glosses.join('; '),
      });
    }

    const primaryReading = readingsList[0];
    const computed = computeHanViet(entryTerm, primaryReading);
    const hanViet = entryHanViet ?? computed.hanViet;
    const hanVietConfidence = (entryHanVietConfidence ?? computed.confidence) as 'high' | 'review' | 'kun';
    const hanVietSource = (entryHanVietSource ?? computed.source) as 'rule' | 'override' | 'manual';
    const hanVietPerKanji = perKanjiFor(entryTerm, primaryReading, hanViet, hanVietSource);

    // KANJIDIC2 info
    const kanjiDetails = await getKanjiDetailsForWord(this.dbClient, entryTerm);

    const overallPosLabels = getPosLabels(entryPos);
    const allMeanings = meaningRows.map((m) => m.meaning);

    // Query occurrences from corpusTerms (H04) if table is populated
    let occurrencesList: Array<{ level: string; count: number }> = [];
    try {
      const rows = await this.dbClient.db
        .select({
          level: corpusTerms.level,
          count: sql<number>`cast(sum(${corpusTerms.count}) as integer)`,
        })
        .from(corpusTerms)
        .where(eq(corpusTerms.term, entryTerm))
        .groupBy(corpusTerms.level);

      occurrencesList = rows.map((r: { level: string; count: number | string }) => ({
        level: r.level,
        count: Number(r.count) || 0,
      }));
    } catch {
      occurrencesList = [];
    }

    return {
      entry: entryTerm,
      term: entryTerm,
      readings: readingsList,
      meanings: allMeanings,
      senses,
      posLabels: overallPosLabels,
      partOfSpeech: entryPos ?? undefined,
      level: entryLevel ?? undefined,
      hanViet,
      hanVietConfidence,
      hanVietSource,
      hanVietPerKanji,
      kanji: kanjiDetails,
      corpusOccurrences: occurrencesList,
      occurrences: occurrencesList,
      license: licenseName,
      attribution,
    };
  }

  /**
   * Tự động gắn tag từ vựng, target_vocab, kanji, ngữ pháp cho câu hỏi (QB-09).
   */
  async tagQuestion(dto: TagQuestionDto): Promise<QuestionTagResultDto[]> {
    const generatedTags: QuestionTagItem[] = tagQuestion({
      id: dto.questionId,
      skill: dto.skill,
      level: dto.level,
      mondai: dto.mondai,
      stem: dto.stem,
      options: dto.options,
      passage: dto.passage,
    });

    // If questionId provided, persist to questionTags table
    if (dto.questionId) {
      for (const t of generatedTags) {
        await this.dbClient.db.insert(questionTags).values({
          id: generateUuidV7(),
          questionId: dto.questionId,
          tag: t.tag,
          category: t.category,
        });
      }
    }

    return generatedTags.map((t) => ({ tag: t.tag, category: t.category }));
  }

  /**
   * Lấy danh sách tags đã gắn cho một câu hỏi.
   */
  async getQuestionTags(questionId: string): Promise<QuestionTagResultDto[]> {
    const rows = await this.dbClient.db
      .select()
      .from(questionTags)
      .where(eq(questionTags.questionId, questionId));
    return rows.map((r: { tag: string; category: string | null }) => ({
      tag: r.tag,
      category: r.category ?? 'general',
    }));
  }

  /** H07: paginated list of every dictionary entry for the admin "Từ điển" page. */
  async listLexiconEntries(params: { q?: string; pos?: string; page?: number; pageSize?: number }): Promise<LexiconListResult> {
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const q = params.q?.trim();
    const pos = params.pos?.trim();

    const conditions: SQL[] = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(lexicalEntries.term, like),
          sql`exists (select 1 from entry_readings r where r.entry_id = ${lexicalEntries.id} and r.reading ilike ${like})`,
          sql`exists (select 1 from entry_meanings m where m.entry_id = ${lexicalEntries.id} and m.meaning ilike ${like})`,
        )!,
      );
    }
    if (pos) {
      // part_of_speech is "n,vs,vt"; match a whole code or a code family (v5 matches v5k, v5r...).
      conditions.push(sql`(',' || coalesce(${lexicalEntries.partOfSpeech}, '') || ',') like ${`%,${pos}%`}`);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await this.dbClient.db.select({ value: count() }).from(lexicalEntries).where(where);
    const rows: Array<{ id: string; term: string; partOfSpeech: string | null; provider: string | null }> = await this.dbClient.db
      .select({
        id: lexicalEntries.id,
        term: lexicalEntries.term,
        partOfSpeech: lexicalEntries.partOfSpeech,
        provider: lexiconLicenses.provider,
      })
      .from(lexicalEntries)
      .leftJoin(lexiconLicenses, eq(lexicalEntries.licenseId, lexiconLicenses.id))
      .where(where)
      .orderBy(asc(lexicalEntries.term))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const ids = rows.map((r) => r.id);
    const readings: Array<{ entryId: string; reading: string }> = ids.length
      ? await this.dbClient.db.select().from(entryReadings).where(inArray(entryReadings.entryId, ids))
      : [];
    const meanings: Array<{ entryId: string; meaning: string }> = ids.length
      ? await this.dbClient.db.select().from(entryMeanings).where(inArray(entryMeanings.entryId, ids))
      : [];

    return {
      total: Number(total),
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        term: r.term,
        readings: readings.filter((x) => x.entryId === r.id).map((x) => x.reading),
        meanings: meanings.filter((x) => x.entryId === r.id).slice(0, 3).map((x) => x.meaning),
        partOfSpeech: r.partOfSpeech ?? '',
        hanViet: getHanVietForWord(r.term) || '',
        provider: r.provider ?? '',
      })),
    };
  }
}
