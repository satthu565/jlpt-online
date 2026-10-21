import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import {
  computeHanViet,
  CorpusAggregator,
  exportDatasetToCsv,
  exportDatasetToXlsx,
  getHanVietForWord,
  type ExamPackageInput,
} from './nlp/index.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  answerOptions,
  corpusAggregates,
  corpusTerms,
  datasetDocuments,
  datasets,
  entryMeanings,
  entryReadings,
  examAttempts,
  examEvents,
  exams,
  lexicalEntries,
  lexiconLicenses,
  notebookItems,
  questions,
  questionVersions,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { isUuid } from '../../common/pipes/uuid-param.pipe.js';
import type {
  AddToNotebookDto,
  AddToNotebookResponseDto,
  CompareWithLearnedResponseDto,
  CorpusFilterQueryDto,
  CorpusQuestionDto,
  CorpusVocabularyItem,
  CorpusVocabularyResponseDto,
  CreateDatasetDto,
  DatasetDetailDto,
  DatasetExportQueryDto,
  DatasetExportResponseDto,
  DatasetItemDto,
  GrammarPracticeResponseDto,
  JlptLevel,
  LevelComparisonResponseDto,
  QuestionSkill,
  RecommendationItemDto,
  RecommendationQueryDto,
  RecommendationResponseDto,
  SentenceRole,
  StudyListQueryDto,
  StudyListResponseDto,
  TimeSeriesResponseDto,
  VocabStatsResponseDto,
  YearlyTrendsResponseDto,
} from './vocab.types.js';
import { VocabService } from './vocab.service.js';

/**
 * Mã định danh chuẩn cho tập ngữ liệu mặc định JLPT N1-N5 (RFC 9562 UUIDv7).
 */
export const DEFAULT_CORPUS_DATASET_ID = '018e0000-0000-7000-8000-0000000000d1';

@Injectable()
export class CorpusService {
  // In-memory corpus aggregators cached per datasetId
  private aggregators = new Map<string, CorpusAggregator>();

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    @Optional() private readonly vocabService?: VocabService,
  ) {}

  private getOrCreateAggregator(
    datasetId: string,
    meta?: { name?: string; version?: string; source?: string; date?: string },
  ): CorpusAggregator {
    let agg = this.aggregators.get(datasetId);
    if (!agg) {
      agg = new CorpusAggregator({
        datasetId,
        name: meta?.name,
        version: meta?.version,
        source: meta?.source,
        date: meta?.date,
      });
      this.aggregators.set(datasetId, agg);
    }
    return agg;
  }

  /**
   * Tạo một tập ngữ liệu mới (Corpus Dataset) (Acceptance 3).
   */
  /**
   * Tìm bản ghi dataset theo UUID hoặc slug.
   */
  async findDatasetRecord(idOrSlug: string): Promise<{
    id: string;
    slug?: string | null;
    name: string;
    version: string;
    licenseId?: string | null;
    createdAt?: Date;
  } | null> {
    if (isUuid(idOrSlug)) {
      try {
        const rows = await this.dbClient.db
          .select()
          .from(datasets)
          .where(eq(datasets.id, idOrSlug))
          .limit(1);
        if (rows.length > 0) return rows[0]!;
      } catch {
        // Fallback if query fails
      }
    }

    try {
      const rows = await this.dbClient.db
        .select()
        .from(datasets)
        .where(eq(datasets.slug, idOrSlug))
        .limit(1);
      if (rows.length > 0) return rows[0]!;
    } catch {
      // Slug column not yet available or query failed
    }

    if (idOrSlug === 'jlpt-official' || idOrSlug === DEFAULT_CORPUS_DATASET_ID) {
      try {
        const rows = await this.dbClient.db
          .select()
          .from(datasets)
          .where(eq(datasets.id, DEFAULT_CORPUS_DATASET_ID))
          .limit(1);
        if (rows.length > 0) return rows[0]!;
      } catch {
        // Fallback if query fails
      }
    }

    return null;
  }

  /**
   * Tạo một tập ngữ liệu mới (Corpus Dataset) (Acceptance 3).
   */
  async createDataset(dto: CreateDatasetDto) {
    const id = dto.id ?? generateUuidV7();
    const slug =
      dto.slug ??
      (id === DEFAULT_CORPUS_DATASET_ID || dto.id === DEFAULT_CORPUS_DATASET_ID
        ? 'jlpt-official'
        : undefined);

    // Default license if not specified
    let licenseId = dto.licenseId;
    if (!licenseId) {
      const existingLicenses = await this.dbClient.db
        .select()
        .from(lexiconLicenses)
        .limit(1);
      if (existingLicenses.length > 0) {
        licenseId = existingLicenses[0]!.id;
      } else {
        const newLicId = generateUuidV7();
        await this.dbClient.db.insert(lexiconLicenses).values({
          id: newLicId,
          provider: 'EDRDG JMdict',
          license: 'CC-BY-SA-4.0',
          rightsTerms:
            'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0',
        });
        licenseId = newLicId;
      }
    }

    await this.dbClient.db
      .insert(datasets)
      .values({
        id,
        slug,
        name: dto.name,
        version: dto.version,
        licenseId,
      })
      .onConflictDoUpdate({
        target: datasets.id,
        set: {
          slug: slug ?? undefined,
          name: dto.name,
          version: dto.version,
          licenseId: licenseId ?? undefined,
        },
      });

    this.getOrCreateAggregator(id, {
      name: dto.name,
      version: dto.version,
      source: dto.source,
      date: dto.date,
    });

    return { id, slug, name: dto.name, version: dto.version, licenseId };
  }

  /**
   * Danh sách tập ngữ liệu (GET /api/v1/datasets).
   */
  async listDatasets(): Promise<{ items: DatasetItemDto[] }> {
    let rows = await this.dbClient.db.select().from(datasets);

    if (rows.length === 0) {
      try {
        await this.createDataset({
          id: DEFAULT_CORPUS_DATASET_ID,
          slug: 'jlpt-official',
          name: 'Tập ngữ liệu đề thi JLPT N1–N5',
          version: '1.0.0',
          source: 'Đề thi chính thức JLPT và Mẫu chuẩn hóa',
          date: '2026-10-16',
        });
        rows = await this.dbClient.db.select().from(datasets);
      } catch {
        rows = await this.dbClient.db.select().from(datasets);
      }
    }

    // Query distinct terms count per dataset from corpus_terms
    let dbTerms: Array<{ datasetId: string; term: string }> = [];
    try {
      dbTerms = await this.dbClient.db
        .select({
          datasetId: corpusTerms.datasetId,
          term: corpusTerms.term,
        })
        .from(corpusTerms);
    } catch {
      // Table may not yet exist in memory tests
    }

    const termsCountMap = new Map<string, Set<string>>();
    for (const t of dbTerms) {
      if (!termsCountMap.has(t.datasetId)) {
        termsCountMap.set(t.datasetId, new Set());
      }
      termsCountMap.get(t.datasetId)!.add(t.term);
    }

    const items: DatasetItemDto[] = rows.map(
      (r: { id: string; slug?: string | null; name: string; version: string }) => {
        const dbUniqueCount = termsCountMap.get(r.id)?.size ?? 0;
        const agg = this.aggregators.get(r.id);
        const totalWords =
          dbUniqueCount > 0
            ? dbUniqueCount
            : agg
              ? agg.getMetadata().uniqueVocabCount || agg.getMetadata().totalTokens
              : 0;
        return {
          id: r.id,
          slug: r.slug ?? (r.id === DEFAULT_CORPUS_DATASET_ID ? 'jlpt-official' : undefined),
          name: r.name,
          version: r.version,
          totalWords,
        };
      },
    );

    return { items };
  }

  /**
   * Chi tiết tập ngữ liệu (GET /api/v1/datasets/:id) (Acceptance 3: version, size, source, date).
   */
  async getDataset(idOrSlug: string): Promise<DatasetDetailDto> {
    const d = await this.findDatasetRecord(idOrSlug);
    if (!d) {
      if (idOrSlug === 'jlpt-official' || idOrSlug === DEFAULT_CORPUS_DATASET_ID) {
        return {
          id: DEFAULT_CORPUS_DATASET_ID,
          slug: 'jlpt-official',
          name: 'Tập ngữ liệu đề thi JLPT N1–N5',
          version: '1.0.0',
          license: 'CC-BY-SA-4.0',
          documentCount: 0,
          totalTokens: 0,
          source: 'Đề thi chính thức JLPT và Mẫu chuẩn hóa',
          date: '2026-10-16',
        };
      }
      throw new NotFoundException(`Dataset '${idOrSlug}' not found`);
    }

    let license = 'CC-BY-SA-4.0';
    if (d.licenseId) {
      const lics = await this.dbClient.db
        .select()
        .from(lexiconLicenses)
        .where(eq(lexiconLicenses.id, d.licenseId))
        .limit(1);
      if (lics.length > 0) {
        license = lics[0]!.license;
      }
    }

    let dbTermsForDataset: Array<{ examId: string; count: number }> = [];
    try {
      dbTermsForDataset = await this.dbClient.db
        .select({
          examId: corpusTerms.examId,
          count: corpusTerms.count,
        })
        .from(corpusTerms)
        .where(eq(corpusTerms.datasetId, d.id));
    } catch {
      // Table may not yet exist
    }

    const distinctExams = new Set(dbTermsForDataset.map((t) => t.examId));
    const totalDbTokens = dbTermsForDataset.reduce((sum, t) => sum + t.count, 0);

    const agg = this.getOrCreateAggregator(d.id, { name: d.name, version: d.version });
    const meta = agg.getMetadata();

    const documentCount = distinctExams.size > 0 ? distinctExams.size : meta.documentCount;
    const totalTokens = totalDbTokens > 0 ? totalDbTokens : meta.totalTokens;

    return {
      id: d.id,
      slug: d.slug ?? (d.id === DEFAULT_CORPUS_DATASET_ID ? 'jlpt-official' : undefined),
      name: d.name,
      version: d.version,
      license,
      licenseId: d.licenseId,
      documentCount,
      totalTokens,
      source: meta.source,
      date: meta.date,
      createdAt: d.createdAt?.toISOString(),
    };
  }

  /**
   * Nhập đề thi/văn bản vào ngữ liệu (DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08).
   */
  async ingestExamPackage(datasetId: string, pkg: ExamPackageInput) {
    const detail = await this.getDataset(datasetId);
    const realDatasetId = detail.id;

    // Ensure dataset exists in DB before inserting documents
    const exists = await this.findDatasetRecord(realDatasetId);
    if (!exists) {
      await this.createDataset({
        id: realDatasetId,
        slug: datasetId === 'jlpt-official' ? 'jlpt-official' : undefined,
        name: detail.name,
        version: detail.version,
        source: detail.source,
        date: detail.date,
      });
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    agg.ingestExam(pkg);

    // Save document record to DB
    const docHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(pkg))
      .digest('hex');

    const docId = generateUuidV7();
    await this.dbClient.db.insert(datasetDocuments).values({
      id: docId,
      datasetId: realDatasetId,
      documentHash: docHash,
      content: pkg.exam.title,
      metadata: {
        packageId: pkg.packageId,
        source: pkg.source,
        title: pkg.exam.title,
      },
    });

    // Save aggregate summary to corpusAggregates table
    const meta = agg.getMetadata();
    for (const [lvl, count] of Object.entries(meta.levels)) {
      const countNum = Number(count);
      if (countNum > 0) {
        await this.dbClient.db.insert(corpusAggregates).values({
          id: generateUuidV7(),
          level: lvl,
          aggregateType: 'vocab_summary',
          payload: {
            datasetId: realDatasetId,
            tokenCount: countNum,
            uniqueVocabCount: meta.uniqueVocabCount,
            source: meta.source,
          },
        });
      }
    }

    return {
      documentId: docId,
      documentHash: docHash,
      datasetId: realDatasetId,
      metadata: meta,
    };
  }

  /**
   * Thống kê từ vựng theo cấp độ và tần suất xuất hiện (GET /api/v1/datasets/:id/vocabulary).
   */
  async getDatasetVocabulary(
    id: string,
    filter: CorpusFilterQueryDto = {},
  ): Promise<CorpusVocabularyResponseDto> {
    const detail = await this.getDataset(id);
    const realDatasetId = detail.id;

    try {
      const dbTerms = await this.dbClient.db
        .select()
        .from(corpusTerms)
        .where(eq(corpusTerms.datasetId, realDatasetId));

      if (dbTerms.length > 0) {
        return await this.getVocabularyFromDb(realDatasetId, dbTerms, filter);
      }
    } catch {
      // Table may not yet exist in memory tests
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const analysis = agg.getVocabularyAnalysis(filter);
    const items: CorpusVocabularyItem[] = analysis.items.map((item) => ({
      ...item,
      word: item.term,
      reading: item.term,
      meaning: '',
      hanViet: getHanVietForWord(item.term) || undefined,
      hanVietConfidence: computeHanViet(item.term, item.term).confidence,
    }));
    return {
      total: analysis.total,
      items,
      rankings: analysis.rankings,
    };
  }

  private async getVocabularyFromDb(
    _datasetId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allDbTerms: any[],
    filter: CorpusFilterQueryDto,
  ) {
    let rows = allDbTerms;

    // 1. Filter by level
    if (filter.level && (filter.level as unknown) !== 'ALL') {
      rows = rows.filter((r) => r.level === filter.level);
    }

    // 2. Filter by skill
    if (filter.skill) {
      rows = rows.filter((r) => r.skill === filter.skill);
    }

    // 3. Filter by search query (supports filter.search, q, query)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSearch = filter.search || (filter as any).q || (filter as any).query;
    if (rawSearch && typeof rawSearch === 'string' && rawSearch.trim()) {
      const q = rawSearch.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.term.toLowerCase().includes(q) ||
          (r.reading && r.reading.toLowerCase().includes(q)),
      );
    }

    // Group rows by term
    const termMap = new Map<
      string,
      {
        term: string;
        reading?: string;
        level: string;
        count: number;
        distinctExams: Set<string>;
        byLevel: Record<JlptLevel, number>;
        bySkill: Record<QuestionSkill, number>;
        byRole: Record<SentenceRole, number>;
        bySession: Record<string, number>;
        bySource: Record<string, number>;
        targetCount: number;
        incidentalCount: number;
      }
    >();

    let totalTokens = 0;
    for (const r of rows) {
      totalTokens += r.count;
      const key = r.term;
      let entry = termMap.get(key);
      if (!entry) {
        entry = {
          term: r.term,
          reading: r.reading || undefined,
          level: r.level,
          count: 0,
          distinctExams: new Set<string>(),
          byLevel: { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 },
          bySkill: { kanji: 0, vocabulary: 0, grammar: 0, reading: 0, listening: 0 },
          byRole: { stem: 0, option: 0, passage: 0, instruction: 0, transcript: 0 },
          bySession: {},
          bySource: {},
          targetCount: 0,
          incidentalCount: 0,
        };
        termMap.set(key, entry);
      }

      entry.count += r.count;
      if (!entry.reading && r.reading) {
        entry.reading = r.reading;
      }
      if (r.examId) {
        entry.distinctExams.add(r.examId);
      }
      if (r.level && entry.byLevel[r.level as JlptLevel] !== undefined) {
        entry.byLevel[r.level as JlptLevel] += r.count;
      }
      if (r.skill && entry.bySkill[r.skill as QuestionSkill] !== undefined) {
        entry.bySkill[r.skill as QuestionSkill] += r.count;
      }
      if (r.skill === 'vocabulary' || r.skill === 'kanji') {
        entry.targetCount += r.count;
      } else {
        entry.incidentalCount += r.count;
      }
    }

    // Sort by count descending, then term ascending
    const sorted = Array.from(termMap.values()).sort(
      (a, b) => b.count - a.count || a.term.localeCompare(b.term),
    );

    // Pagination
    const limit = Number(filter.limit) || 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageNum = Number((filter as any).page);
    const offset = pageNum > 0 ? (pageNum - 1) * limit : Number(filter.offset) || 0;
    const pageItems = sorted.slice(offset, offset + limit);

    // Enrich from JMdict (lexical_entries, entry_readings, entry_meanings)
    const termsToEnrich = pageItems.map((p) => p.term);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lexicalMap = new Map<string, any>();

    if (termsToEnrich.length > 0) {
      try {
        const lexRows = await this.dbClient.db
          .select({
            term: lexicalEntries.term,
            partOfSpeech: lexicalEntries.partOfSpeech,
            hanViet: lexicalEntries.hanViet,
            hanVietConfidence: lexicalEntries.hanVietConfidence,
            reading: entryReadings.reading,
            meaning: entryMeanings.meaning,
          })
          .from(lexicalEntries)
          .leftJoin(
            entryReadings,
            and(
              eq(entryReadings.entryId, lexicalEntries.id),
              eq(entryReadings.isPrimary, true),
            ),
          )
          .leftJoin(
            entryMeanings,
            and(
              eq(entryMeanings.entryId, lexicalEntries.id),
              eq(entryMeanings.locale, 'en'),
            ),
          )
          .where(inArray(lexicalEntries.term, termsToEnrich));

        for (const lr of lexRows) {
          if (!lexicalMap.has(lr.term)) {
            lexicalMap.set(lr.term, lr);
          }
        }
      } catch {
        // Fallback if tables not yet seeded
      }
    }

    const enrichedItems = pageItems.map((item) => {
      const lex = lexicalMap.get(item.term);
      const reading = lex?.reading || item.reading || item.term;
      const meaning = lex?.meaning || '';
      const partOfSpeech = lex?.partOfSpeech || 'noun';
      const hanViet = lex?.hanViet || getHanVietForWord(item.term) || undefined;
      const hanVietConfidence =
        lex?.hanVietConfidence || computeHanViet(item.term, reading).confidence;

      const safeTotalTokens = totalTokens > 0 ? totalTokens : 1;
      const relativeFrequencyPerThousand =
        Math.round((item.count / safeTotalTokens) * 100000) / 100;

      return {
        id: `ct_${item.term}`,
        term: item.term,
        word: item.term,
        baseForm: item.term,
        reading,
        meaning,
        meaningVi: meaning,
        level: item.level as JlptLevel,
        partOfSpeech,
        count: item.count,
        frequency: item.count,
        occurrences: item.count,
        relativeFrequencyPerThousand,
        targetCount: item.targetCount,
        incidentalCount: item.incidentalCount,
        distinctExamsCount: item.distinctExams.size,
        examIds: Array.from(item.distinctExams),
        byLevel: item.byLevel,
        bySkill: item.bySkill,
        byRole: item.byRole,
        bySession: item.bySession,
        bySource: item.bySource,
        observedCount: item.count,
        syntheticCount: 0,
        byProvenance: {},
        hanViet,
        hanVietConfidence,
      };
    });

    const rankings = pageItems.map((item, idx) => ({
      rank: offset + idx + 1,
      baseForm: item.term,
      surface: item.term,
      level: item.level as JlptLevel,
      partOfSpeech: lexicalMap.get(item.term)?.partOfSpeech || 'noun',
      frequency: item.count,
      targetFrequency: item.targetCount,
      incidentalFrequency: item.incidentalCount,
      distinctExamsCount: item.distinctExams.size,
    }));

    return {
      total: sorted.length,
      items: enrichedItems,
      rankings,
    };
  }

  /**
   * Thống kê ngữ pháp theo cấp độ (GET /api/v1/datasets/:id/grammar) (DATA-19, DATA-20, DATA-21).
   */
  async getDatasetGrammar(id: string, _filter: CorpusFilterQueryDto = {}) {
    const detail = await this.getDataset(id);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    return agg.getGrammarAnalysis();
  }

  /**
   * Thống kê Hán tự theo cấp độ (GET /api/v1/datasets/:id/kanji) (DATA-22, DATA-23).
   */
  async getDatasetKanji(id: string, _filter: CorpusFilterQueryDto = {}) {
    const detail = await this.getDataset(id);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    return agg.getKanjiAnalysis();
  }

  // ---------------------------------------------------------------------------
  // DATA-11..18, DATA-24..26 Implementations
  // ---------------------------------------------------------------------------

  /**
   * DATA-11: Xem các câu hỏi chứa từ đó nếu được phép.
   * Chặn trong active real exam và event embargo; không lộ đáp án.
   */
  async getQuestionsForWord(
    datasetId: string,
    word: string,
    options?: { level?: JlptLevel; limit?: number; userId?: string },
  ): Promise<CorpusQuestionDto[]> {
    const detail = await this.getDataset(datasetId);

    // Negative Security Check: Block if user has active real exam attempt (Acceptance 2)
    if (options?.userId) {
      const activeAttempts = await this.dbClient.db
        .select({ id: examAttempts.id })
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.userId, options.userId),
            eq(examAttempts.mode, 'real'),
            eq(examAttempts.status, 'in_progress'),
          ),
        )
        .limit(1);

      if (activeAttempts.length > 0) {
        throw new ForbiddenException(
          'Question viewing is strictly blocked during an active real exam session.',
        );
      }
    }

    try {
      const matchingTerms = await this.dbClient.db
        .select({
          questionId: corpusTerms.questionId,
          examId: corpusTerms.examId,
          level: corpusTerms.level,
        })
        .from(corpusTerms)
        .where(
          and(
            eq(corpusTerms.datasetId, detail.id),
            eq(corpusTerms.term, word),
          ),
        );

      if (matchingTerms.length > 0) {
        let embargoedEventIds = new Set<string>();
        try {
          const embargoedEvents = await this.dbClient.db
            .select({ id: examEvents.id, releaseAt: examEvents.resultReleaseAt })
            .from(examEvents)
            .where(gt(examEvents.resultReleaseAt, new Date()));
          embargoedEventIds = new Set(embargoedEvents.map((e: { id: string }) => e.id));
        } catch {
          // Table may be empty
        }

        const validMatching = matchingTerms.filter(
          (t: { questionId: string | null; examId: string; level: string }) =>
            !embargoedEventIds.has(t.examId) &&
            (!options?.level || t.level === options.level) &&
            Boolean(t.questionId),
        );

        const qIds: string[] = Array.from(
          new Set(validMatching.map((t: { questionId: string | null }) => t.questionId!)),
        );
        const limit = options?.limit ?? 10;
        const limitedQIds: string[] = qIds.slice(0, limit);

        if (limitedQIds.length > 0) {
          const qRows = await this.dbClient.db
            .select()
            .from(questions)
            .where(inArray(questions.id, limitedQIds));

          const result: CorpusQuestionDto[] = [];
          for (const q of qRows) {
            const examRows = await this.dbClient.db
              .select({ title: exams.title })
              .from(exams)
              .where(eq(exams.id, q.examId || matchingTerms[0]!.examId))
              .limit(1);

            const qvRows = await this.dbClient.db
              .select()
              .from(questionVersions)
              .where(eq(questionVersions.questionId, q.id))
              .orderBy(desc(questionVersions.version))
              .limit(1);

            const qvRow = qvRows[0];
            const opts = await this.dbClient.db
              .select()
              .from(answerOptions)
              .where(
                and(
                  eq(answerOptions.questionId, q.id),
                  eq(answerOptions.questionVersion, qvRow?.version ?? 1),
                ),
              );

            const stemText =
              typeof qvRow?.stem === 'string'
                ? qvRow.stem
                : Array.isArray(qvRow?.stem)
                  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    qvRow.stem.map((s: any) => (typeof s === 'string' ? s : s?.text || '')).join(' ')
                  : '';

            result.push({
              id: q.id,
              examId: q.examId || matchingTerms[0]!.examId,
              examTitle: examRows[0]?.title || 'JLPT Exam',
              level: (q.level || matchingTerms[0]!.level) as JlptLevel,
              skill: (q.skill || 'vocabulary') as QuestionSkill,
              stem: qvRow?.stem || [],
              stemText,
              options: opts.map((opt: { id: string; content: unknown }) => ({
                id: opt.id,
                content: opt.content,
              })),
              terms: [word],
            });
          }
          return result;
        }
      }
    } catch {
      // Fallback
    }

    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    let questionsList = agg.getQuestionsForWord(word, options);

    // Embargo Guard: Filter out any questions associated with embargoed exam events
    try {
      const embargoedEvents = await this.dbClient.db
        .select({ id: examEvents.id, releaseAt: examEvents.resultReleaseAt })
        .from(examEvents)
        .where(gt(examEvents.resultReleaseAt, new Date()));
      const embargoedEventIds = new Set(embargoedEvents.map((e: { id: string }) => e.id));

      if (embargoedEventIds.size > 0) {
        questionsList = questionsList.filter((q) => !embargoedEventIds.has(q.examId));
      }
    } catch {
      // Table may be empty in test environments
    }

    // Zero Answer Leak: Guarantee no correct answers or answer keys in response
    return questionsList.map((q) => ({
      id: q.id,
      examId: q.examId,
      examTitle: q.examTitle,
      level: q.level,
      skill: q.skill,
      stem: q.stem,
      stemText: q.stemText,
      options: q.options?.map((opt) => ({
        id: opt.id,
        content: opt.content,
        text: opt.text,
      })),
      terms: q.terms,
    }));
  }

  /**
   * DATA-12: Tra cứu một từ để xem thống kê.
   */
  async getWordStatistics(datasetId: string, term: string): Promise<VocabStatsResponseDto> {
    const detail = await this.getDataset(datasetId);
    const realDatasetId = detail.id;

    try {
      const dbTerms = await this.dbClient.db
        .select({
          term: corpusTerms.term,
          reading: corpusTerms.reading,
          level: corpusTerms.level,
          skill: corpusTerms.skill,
          section: corpusTerms.section,
          examId: corpusTerms.examId,
          count: corpusTerms.count,
        })
        .from(corpusTerms)
        .where(eq(corpusTerms.datasetId, realDatasetId));

      if (dbTerms.length > 0) {
        const qTerm = term.trim().toLowerCase();
        const matching = dbTerms.filter((t: { term: string }) => t.term.toLowerCase() === qTerm);
        if (matching.length > 0) {
          let totalCount = 0;
          let targetCount = 0;
          const examIds = new Set<string>();
          const byLevel: Record<JlptLevel, number> = { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
          const bySkill: Record<QuestionSkill, number> = {
            kanji: 0,
            vocabulary: 0,
            grammar: 0,
            reading: 0,
            listening: 0,
          };
          const byRole: Record<SentenceRole, number> = {
            stem: 0,
            option: 0,
            passage: 0,
            instruction: 0,
            transcript: 0,
          };

          for (const m of matching) {
            totalCount += m.count;
            if (m.examId) examIds.add(m.examId);
            if (m.level && byLevel[m.level as JlptLevel] !== undefined) {
              byLevel[m.level as JlptLevel] += m.count;
            }
            if (m.skill && bySkill[m.skill as QuestionSkill] !== undefined) {
              bySkill[m.skill as QuestionSkill] += m.count;
            }
            if (m.skill === 'vocabulary' || m.skill === 'kanji') {
              targetCount += m.count;
            }
          }

          const freqMap = new Map<string, number>();
          for (const t of dbTerms) {
            freqMap.set(t.term, (freqMap.get(t.term) ?? 0) + t.count);
          }
          const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);
          const rank = sorted.findIndex(([t]) => t.toLowerCase() === qTerm) + 1;

          return {
            term: matching[0]!.term,
            baseForm: matching[0]!.term,
            level: (matching[0]!.level || 'N5') as JlptLevel,
            totalCount,
            targetCount,
            incidentalCount: totalCount - targetCount,
            distinctExamsCount: examIds.size,
            examIds: Array.from(examIds),
            byLevel,
            bySkill,
            byRole,
            bySession: {},
            bySource: {},
            rank: rank > 0 ? rank : 1,
            percentageOfLevel: 0,
          };
        }
      }
    } catch {
      // Fallback
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const stats = agg.getWordStatistics(term);
    if (!stats) {
      throw new NotFoundException(
        `No corpus statistics found for term '${term}' in dataset '${datasetId}'`,
      );
    }
    return stats;
  }

  /**
   * DATA-13: So sánh mức xuất hiện giữa các cấp độ.
   */
  async compareLevels(datasetId: string, terms?: string[]): Promise<LevelComparisonResponseDto> {
    const detail = await this.getDataset(datasetId);
    const realDatasetId = detail.id;

    try {
      const dbTerms = await this.dbClient.db
        .select({
          term: corpusTerms.term,
          level: corpusTerms.level,
          count: corpusTerms.count,
        })
        .from(corpusTerms)
        .where(eq(corpusTerms.datasetId, realDatasetId));

      if (dbTerms.length > 0) {
        const levelBreakdown: Record<
          JlptLevel,
          { level: JlptLevel; totalTokens: number; uniqueVocabCount: number }
        > = {
          N1: { level: 'N1', totalTokens: 0, uniqueVocabCount: 0 },
          N2: { level: 'N2', totalTokens: 0, uniqueVocabCount: 0 },
          N3: { level: 'N3', totalTokens: 0, uniqueVocabCount: 0 },
          N4: { level: 'N4', totalTokens: 0, uniqueVocabCount: 0 },
          N5: { level: 'N5', totalTokens: 0, uniqueVocabCount: 0 },
        };

        const termsPerLevel: Record<JlptLevel, Set<string>> = {
          N1: new Set(),
          N2: new Set(),
          N3: new Set(),
          N4: new Set(),
          N5: new Set(),
        };

        const termCounts = new Map<string, Record<JlptLevel, number>>();
        for (const t of dbTerms) {
          const lvl = t.level as JlptLevel;
          if (levelBreakdown[lvl]) {
            levelBreakdown[lvl].totalTokens += t.count;
            termsPerLevel[lvl].add(t.term);
          }
          if (!termCounts.has(t.term)) {
            termCounts.set(t.term, { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 });
          }
          if (termCounts.get(t.term)![lvl] !== undefined) {
            termCounts.get(t.term)![lvl] += t.count;
          }
        }

        const totalTokensAll = Object.values(levelBreakdown).reduce((s, x) => s + x.totalTokens, 0);
        const finalLevels: Record<
          JlptLevel,
          { level: JlptLevel; totalTokens: number; uniqueVocabCount: number; percentage: number }
        > = {
          N1: { ...levelBreakdown.N1, percentage: 0 },
          N2: { ...levelBreakdown.N2, percentage: 0 },
          N3: { ...levelBreakdown.N3, percentage: 0 },
          N4: { ...levelBreakdown.N4, percentage: 0 },
          N5: { ...levelBreakdown.N5, percentage: 0 },
        };
        for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
          finalLevels[lvl].uniqueVocabCount = termsPerLevel[lvl].size;
          finalLevels[lvl].percentage =
            totalTokensAll > 0
              ? Math.round((finalLevels[lvl].totalTokens / totalTokensAll) * 10000) / 100
              : 0;
        }

        let targetTerms = terms;
        if (!targetTerms || targetTerms.length === 0) {
          const sorted = Array.from(termCounts.entries())
            .map(([termStr, counts]) => ({
              term: termStr,
              total: Object.values(counts).reduce((a, b) => a + b, 0),
              counts,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 50);
          targetTerms = sorted.map((s) => s.term);
        }

        const termDistributions = targetTerms.map((tStr) => {
          const counts = termCounts.get(tStr) || { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
          let primaryLevel: JlptLevel = 'N5';
          let maxCount = -1;
          for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
            if (counts[lvl] > maxCount) {
              maxCount = counts[lvl];
              primaryLevel = lvl;
            }
          }
          return {
            term: tStr,
            counts,
            primaryLevel,
          };
        });

        return {
          datasetId,
          levels: finalLevels,
          termDistributions,
        };
      }
    } catch {
      // Fallback
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const res = agg.compareLevels(terms);
    return {
      ...res,
      datasetId,
    };
  }

  /**
   * DATA-14: Thống kê theo khoảng thời gian / exam session.
   */
  async getTimeSeries(datasetId: string): Promise<TimeSeriesResponseDto> {
    const detail = await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    return agg.getTimeSeries();
  }

  /**
   * DATA-15: Tạo danh sách từ thường gặp để ôn tập.
   */
  async createStudyList(
    datasetId: string,
    options: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    const detail = await this.getDataset(datasetId);
    const realDatasetId = detail.id;

    try {
      const dbTerms = await this.dbClient.db
        .select({
          term: corpusTerms.term,
          reading: corpusTerms.reading,
          level: corpusTerms.level,
          examId: corpusTerms.examId,
          count: corpusTerms.count,
        })
        .from(corpusTerms)
        .where(eq(corpusTerms.datasetId, realDatasetId));

      if (dbTerms.length > 0) {
        const termMap = new Map<
          string,
          {
            term: string;
            reading?: string;
            level: string;
            count: number;
            distinctExams: Set<string>;
          }
        >();
        for (const t of dbTerms) {
          if (options.level && (options.level as unknown) !== 'ALL' && t.level !== options.level) {
            continue;
          }
          let entry = termMap.get(t.term);
          if (!entry) {
            entry = {
              term: t.term,
              reading: t.reading || undefined,
              level: t.level,
              count: 0,
              distinctExams: new Set(),
            };
            termMap.set(t.term, entry);
          }
          entry.count += t.count;
          if (!entry.reading && t.reading) entry.reading = t.reading;
          if (t.examId) entry.distinctExams.add(t.examId);
        }

        const sorted = Array.from(termMap.values()).sort((a, b) => b.count - a.count);
        const limit = options.limit ?? 50;
        const items = sorted.slice(0, limit).map((s, idx) => {
          const rank = idx + 1;
          const priorityTier: 'TIER_1_CRITICAL' | 'TIER_2_HIGH' | 'TIER_3_MODERATE' =
            rank <= 20 ? 'TIER_1_CRITICAL' : rank <= 50 ? 'TIER_2_HIGH' : 'TIER_3_MODERATE';
          return {
            rank,
            baseForm: s.term,
            surface: s.term,
            level: s.level as JlptLevel,
            frequency: s.count,
            targetFrequency: s.count,
            distinctExamsCount: s.distinctExams.size,
            priorityTier,
          };
        });

        return {
          total: sorted.length,
          items,
        };
      }
    } catch {
      // Fallback
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    return agg.createStudyList(options);
  }

  /**
   * DATA-16: Kết nối từ vựng với sổ tay cá nhân.
   */
  async addWordsToNotebook(
    userId: string,
    datasetId: string,
    dto: AddToNotebookDto,
  ): Promise<AddToNotebookResponseDto> {
    await this.getDataset(datasetId);
    if (!dto.words || dto.words.length === 0) {
      throw new BadRequestException('At least one word must be provided to add to notebook.');
    }

    const addedItems: AddToNotebookResponseDto['items'] = [];
    const now = new Date();

    for (const rawWord of dto.words) {
      const word = rawWord.trim();
      if (!word) continue;

      let reading: string | undefined;
      let meaning: string | undefined;
      let hanViet: string | undefined;

      if (this.vocabService) {
        try {
          const dictRes = await this.vocabService.lookupDictionary({ text: word });
          reading = dictRes.readings[0];
          meaning = dictRes.meanings[0];
          hanViet = dictRes.hanViet;
        } catch {
          // Fall back if not in sandbox dictionary
        }
      }

      if (!hanViet) {
        hanViet = getHanVietForWord(word) || undefined;
      }

      const itemId = generateUuidV7();
      const tags = ['source:corpus', `dataset:${datasetId}`, `term:${word}`];
      if (reading) tags.push(`reading:${reading}`);
      if (meaning) tags.push(`meaning:${meaning}`);
      if (hanViet) tags.push(`hanviet:${hanViet}`);
      if (dto.level) tags.push(`level:${dto.level}`);

      await this.dbClient.db.insert(notebookItems).values({
        id: itemId,
        userId,
        kind: 'vocab',
        entryId: generateUuidV7(),
        mastered: false,
        tags,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });

      addedItems.push({
        id: itemId,
        term: word,
        reading,
        meaning,
        hanViet,
        level: dto.level,
        kind: 'vocab',
      });
    }

    return {
      addedCount: addedItems.length,
      items: addedItems,
    };
  }

  /**
   * DATA-17: So sánh danh sách từ thường gặp với các từ đã học.
   */
  async compareWithLearned(
    userId: string,
    datasetId: string,
    options?: { level?: JlptLevel; limit?: number },
  ): Promise<CompareWithLearnedResponseDto> {
    const detail = await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const studyList = agg.createStudyList({ level: options?.level, limit: options?.limit ?? 100 });

    const userRows = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(eq(notebookItems.userId, userId));

    const learnedMap = new Map<string, boolean>();
    for (const r of userRows) {
      const termTag = r.tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '');
      if (termTag) {
        learnedMap.set(termTag.toLowerCase(), r.mastered);
      }
    }

    let masteredCount = 0;
    let inProgressCount = 0;
    const unlearnedList: CompareWithLearnedResponseDto['unlearnedList'] = [];

    for (const item of studyList.items) {
      const key = item.baseForm.toLowerCase();
      if (learnedMap.has(key)) {
        if (learnedMap.get(key) === true) {
          masteredCount += 1;
        } else {
          inProgressCount += 1;
        }
      } else {
        unlearnedList.push({
          baseForm: item.baseForm,
          surface: item.surface,
          frequency: item.frequency,
          targetFrequency: item.targetFrequency,
          priorityTier: item.priorityTier,
        });
      }
    }

    const totalFrequentWords = studyList.items.length;
    const coveragePercentage =
      totalFrequentWords > 0
        ? Math.round((masteredCount / totalFrequentWords) * 10000) / 100
        : 0;

    return {
      datasetId,
      level: options?.level,
      totalFrequentWords,
      masteredCount,
      inProgressCount,
      unlearnedCount: unlearnedList.length,
      coveragePercentage,
      unlearnedList,
    };
  }

  /**
   * DATA-18 & Acceptance 6: Xuất báo cáo CSV / Excel với provenance và roundtrip.
   */
  async exportDataset(
    datasetId: string,
    query: DatasetExportQueryDto = {},
  ): Promise<DatasetExportResponseDto> {
    const detail = await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });

    const format = query.format ?? 'csv';
    const type = query.type ?? 'vocabulary';

    let result;
    if (format === 'xlsx') {
      result = exportDatasetToXlsx(agg, {
        format: 'xlsx',
        type,
        level: query.level,
        dataType: query.dataType,
      });
    } else {
      result = exportDatasetToCsv(agg, {
        format: 'csv',
        type,
        level: query.level,
        dataType: query.dataType,
      });
    }

    return {
      data: result.data,
      filename: result.filename,
      mimeType: result.mimeType,
      rowCount: result.rowCount,
      provenance: result.provenance,
    };
  }

  /**
   * DATA-24: So sánh xu hướng xuất hiện qua các năm.
   */
  async getYearlyTrends(
    datasetId: string,
    options?: { minOccurrences?: number },
  ): Promise<YearlyTrendsResponseDto> {
    const detail = await this.getDataset(datasetId);
    const realDatasetId = detail.id;

    try {
      const rows = await this.dbClient.db
        .select({
          term: corpusTerms.term,
          level: corpusTerms.level,
          count: corpusTerms.count,
          examId: corpusTerms.examId,
          examYear: exams.year,
        })
        .from(corpusTerms)
        .leftJoin(exams, eq(corpusTerms.examId, exams.id))
        .where(eq(corpusTerms.datasetId, realDatasetId));

      if (rows.length > 0) {
        const minOcc = options?.minOccurrences ?? 1;
        const termData = new Map<
          string,
          {
            term: string;
            level: JlptLevel;
            totalFrequency: number;
            yearlyCounts: Record<string, number>;
          }
        >();

        for (const r of rows) {
          let entry = termData.get(r.term);
          if (!entry) {
            entry = {
              term: r.term,
              level: (r.level || 'N5') as JlptLevel,
              totalFrequency: 0,
              yearlyCounts: {},
            };
            termData.set(r.term, entry);
          }
          entry.totalFrequency += r.count;
          const year = r.examYear ? String(r.examYear) : 'unknown';
          entry.yearlyCounts[year] = (entry.yearlyCounts[year] ?? 0) + r.count;
        }

        const topByLevel: Record<
          JlptLevel,
          Array<{
            term: string;
            level: JlptLevel;
            totalFrequency: number;
            distinctYearsCount: number;
            yearlyCounts: Record<string, number>;
            trend: 'increasing' | 'decreasing' | 'stable' | 'emerging';
          }>
        > = {
          N1: [],
          N2: [],
          N3: [],
          N4: [],
          N5: [],
        };

        const trends: YearlyTrendsResponseDto['trends'] = [];

        for (const v of termData.values()) {
          if (v.totalFrequency < minOcc) continue;

          const years = Object.keys(v.yearlyCounts).filter((y) => y !== 'unknown').sort();
          let trend: 'increasing' | 'decreasing' | 'stable' | 'emerging' = 'stable';
          if (years.length >= 2) {
            const firstHalf = years.slice(0, Math.floor(years.length / 2));
            const secondHalf = years.slice(Math.floor(years.length / 2));
            const firstSum = firstHalf.reduce((sum, y) => sum + (v.yearlyCounts[y] ?? 0), 0);
            const secondSum = secondHalf.reduce((sum, y) => sum + (v.yearlyCounts[y] ?? 0), 0);
            if (secondSum > firstSum * 1.5) {
              trend = firstSum === 0 ? 'emerging' : 'increasing';
            } else if (firstSum > secondSum * 1.5) {
              trend = 'decreasing';
            }
          }

          const item = {
            term: v.term,
            level: v.level,
            totalFrequency: v.totalFrequency,
            distinctYearsCount: Object.keys(v.yearlyCounts).length,
            yearlyCounts: v.yearlyCounts,
            trend,
          };

          trends.push(item);
          if (topByLevel[v.level]) {
            topByLevel[v.level].push(item);
          }
        }

        trends.sort((a, b) => b.totalFrequency - a.totalFrequency);
        for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5'] as JlptLevel[]) {
          topByLevel[lvl].sort((a, b) => b.totalFrequency - a.totalFrequency);
        }

        return { trends, topByLevel };
      }
    } catch {
      // Fallback
    }

    const agg = this.getOrCreateAggregator(realDatasetId, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    return agg.getYearlyTrends(options);
  }

  /**
   * DATA-25: Liên kết mẫu ngữ pháp với bài luyện tương ứng.
   */
  async getGrammarPractice(
    datasetId: string,
    patternId: string,
  ): Promise<GrammarPracticeResponseDto> {
    const detail = await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const practice = agg.getGrammarPractice(patternId);
    if (!practice) {
      throw new NotFoundException(
        `Grammar pattern '${patternId}' not found in dataset '${datasetId}'`,
      );
    }

    return {
      patternId: practice.patternId,
      pattern: practice.pattern,
      level: practice.level,
      meaning: practice.meaning,
      frequency: practice.frequency,
      questions: practice.questions.map((q) => ({
        id: q.id,
        examId: q.examId,
        examTitle: q.examTitle,
        level: q.level,
        skill: q.skill,
        stem: q.stem,
        stemText: q.stemText,
        options: q.options?.map((opt) => ({
          id: opt.id,
          content: opt.content,
          text: opt.text,
        })),
        terms: q.terms,
      })),
    };
  }

  /**
   * DATA-26: Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo.
   */
  async getRecommendations(
    userId: string,
    datasetId: string,
    query: RecommendationQueryDto = {},
  ): Promise<RecommendationResponseDto> {
    const detail = await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(detail.id, {
      name: detail.name,
      version: detail.version,
      source: detail.source,
      date: detail.date,
    });
    const studyList = agg.createStudyList({ level: query.level, limit: 100 });

    const userRows = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(eq(notebookItems.userId, userId));

    const learnedMap = new Map<string, boolean>();
    for (const r of userRows) {
      const termTag = r.tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '');
      if (termTag) {
        learnedMap.set(termTag.toLowerCase(), r.mastered);
      }
    }

    const recommendations: RecommendationItemDto[] = [];
    for (const item of studyList.items) {
      const key = item.baseForm.toLowerCase();
      let status: 'unlearned' | 'in_progress' | 'mastered' = 'unlearned';
      let multiplier = 1.6;
      let reason = `Appeared in ${item.distinctExamsCount} exams, not yet added to notebook (unlearned).`;

      if (learnedMap.has(key)) {
        if (learnedMap.get(key) === true) {
          status = 'mastered';
          multiplier = 0.2;
          reason = `Mastered in notebook; scheduled for periodic maintenance.`;
        } else {
          status = 'in_progress';
          multiplier = 1.3;
          reason = `In notebook but not yet mastered. High exam priority.`;
        }
      }

      const priorityScore = Math.round(
        item.frequency * multiplier * 10 + (item.targetFrequency > 0 ? 25 : 0),
      );

      recommendations.push({
        rank: 0,
        term: item.surface,
        baseForm: item.baseForm,
        level: item.level,
        frequency: item.frequency,
        targetFrequency: item.targetFrequency,
        priorityScore,
        reason,
        status,
      });
    }

    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
    const limit = query.limit ?? 20;
    const paginated = recommendations.slice(0, limit).map((rec, idx) => ({
      ...rec,
      rank: idx + 1,
    }));

    return {
      datasetId,
      totalRecommendations: recommendations.length,
      recommendations: paginated,
    };
  }
}
