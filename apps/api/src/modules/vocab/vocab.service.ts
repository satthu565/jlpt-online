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
} from './nlp/index.js';
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
  entryMeanings,
  entryReadings,
  lexicalEntries,
  lexiconLicenses,
  questionTags,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  DictionaryLookupQueryDto,
  DictionaryLookupResponseDto,
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

  /**
   * Tra cứu từ vựng trong từ điển có bản quyền (Acceptance 4).
   */
  async lookupDictionary(
    dto: DictionaryLookupQueryDto,
  ): Promise<DictionaryLookupResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Query text is required for dictionary lookup');
    }

    const trimmed = dto.text.trim();
    const locale = dto.locale ?? 'vi';

    // 1. Try DB lexical entries if populated
    try {
      let dbEntries = await this.dbClient.db
        .select()
        .from(lexicalEntries)
        .where(eq(lexicalEntries.term, trimmed))
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
          .where(eq(entryReadings.reading, trimmed))
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
    const result = this.dictionaryAdapter.lookup(trimmed, locale);
    if (!result) {
      throw new NotFoundException(`No dictionary entry found for '${trimmed}'`);
    }

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
      hanViet: result.hanViet || getHanVietForWord(result.entry, result.readings[0]) || '',
      ...(() => {
        const c = computeHanViet(result.entry, result.readings[0]);
        return { hanVietConfidence: c.confidence, hanVietSource: c.source, hanVietPerKanji: c.perKanji };
      })(),
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
