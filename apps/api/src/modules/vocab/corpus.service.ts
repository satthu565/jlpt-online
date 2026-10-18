import crypto from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import {
  CorpusAggregator,
  exportDatasetToCsv,
  exportDatasetToXlsx,
  type ExamPackageInput,
} from './nlp/index.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  corpusAggregates,
  datasetDocuments,
  datasets,
  examAttempts,
  examEvents,
  lexiconLicenses,
  notebookItems,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { isUuid } from '../../common/pipes/uuid-param.pipe.js';
import type {
  AddToNotebookDto,
  AddToNotebookResponseDto,
  CompareWithLearnedResponseDto,
  CorpusFilterQueryDto,
  CorpusQuestionDto,
  CreateDatasetDto,
  DatasetDetailDto,
  DatasetExportQueryDto,
  DatasetExportResponseDto,
  DatasetItemDto,
  GrammarPracticeResponseDto,
  JlptLevel,
  LevelComparisonResponseDto,
  RecommendationItemDto,
  RecommendationQueryDto,
  RecommendationResponseDto,
  StudyListQueryDto,
  StudyListResponseDto,
  TimeSeriesResponseDto,
  VocabStatsResponseDto,
  YearlyTrendsResponseDto,
} from './vocab.types.js';
import { VocabService } from './vocab.service.js';

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
  async createDataset(dto: CreateDatasetDto) {
    const id = dto.id ?? generateUuidV7();

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

    await this.dbClient.db.insert(datasets).values({
      id,
      name: dto.name,
      version: dto.version,
      licenseId,
    });

    this.getOrCreateAggregator(id, {
      name: dto.name,
      version: dto.version,
      source: dto.source,
      date: dto.date,
    });

    return { id, name: dto.name, version: dto.version, licenseId };
  }

  /**
   * Danh sách tập ngữ liệu (GET /api/v1/datasets).
   */
  async listDatasets(): Promise<{ items: DatasetItemDto[] }> {
    let rows = await this.dbClient.db.select().from(datasets);

    if (rows.length === 0) {
      const defaultId = '018e0000-0000-7000-8000-0000000000d1';
      try {
        await this.createDataset({
          id: defaultId,
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

    const items: DatasetItemDto[] = rows.map(
      (r: { id: string; name: string; version: string }) => {
        const agg = this.aggregators.get(r.id);
        const totalWords = agg ? agg.getMetadata().totalTokens : 0;
        return {
          id: r.id,
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
  async getDataset(id: string): Promise<DatasetDetailDto> {
    if (!isUuid(id)) {
      throw new NotFoundException(`Dataset '${id}' not found`);
    }

    const rows = await this.dbClient.db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Dataset '${id}' not found`);
    }

    const d = rows[0]!;
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

    const agg = this.getOrCreateAggregator(id, { name: d.name, version: d.version });
    const meta = agg.getMetadata();

    return {
      id: d.id,
      name: d.name,
      version: d.version,
      license,
      licenseId: d.licenseId,
      documentCount: meta.documentCount,
      totalTokens: meta.totalTokens,
      source: meta.source,
      date: meta.date,
      createdAt: d.createdAt?.toISOString(),
    };
  }

  /**
   * Nhập đề thi/văn bản vào ngữ liệu (DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08).
   */
  async ingestExamPackage(datasetId: string, pkg: ExamPackageInput) {
    await this.getDataset(datasetId); // ensure dataset exists

    const agg = this.getOrCreateAggregator(datasetId);
    agg.ingestExam(pkg);

    // Save document record to DB
    const docHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(pkg))
      .digest('hex');

    const docId = generateUuidV7();
    await this.dbClient.db.insert(datasetDocuments).values({
      id: docId,
      datasetId,
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
            datasetId,
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
      datasetId,
      metadata: meta,
    };
  }

  /**
   * Thống kê từ vựng theo cấp độ và tần suất xuất hiện (GET /api/v1/datasets/:id/vocabulary).
   */
  async getDatasetVocabulary(id: string, filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
    return agg.getVocabularyAnalysis(filter);
  }

  /**
   * Thống kê ngữ pháp theo cấp độ (GET /api/v1/datasets/:id/grammar) (DATA-19, DATA-20, DATA-21).
   */
  async getDatasetGrammar(id: string, _filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
    return agg.getGrammarAnalysis();
  }

  /**
   * Thống kê Hán tự theo cấp độ (GET /api/v1/datasets/:id/kanji) (DATA-22, DATA-23).
   */
  async getDatasetKanji(id: string, _filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
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
    await this.getDataset(datasetId);

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

    const agg = this.getOrCreateAggregator(datasetId);
    let questions = agg.getQuestionsForWord(word, options);

    // Embargo Guard: Filter out any questions associated with embargoed exam events
    try {
      const embargoedEvents = await this.dbClient.db
        .select({ id: examEvents.id, releaseAt: examEvents.resultReleaseAt })
        .from(examEvents)
        .where(gt(examEvents.resultReleaseAt, new Date()));
      const embargoedEventIds = new Set(embargoedEvents.map((e: { id: string }) => e.id));

      if (embargoedEventIds.size > 0) {
        questions = questions.filter((q) => !embargoedEventIds.has(q.examId));
      }
    } catch {
      // Table may be empty in test environments
    }

    // Zero Answer Leak: Guarantee no correct answers or answer keys in response
    return questions.map((q) => ({
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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
    return agg.compareLevels(terms);
  }

  /**
   * DATA-14: Thống kê theo khoảng thời gian / exam session.
   */
  async getTimeSeries(datasetId: string): Promise<TimeSeriesResponseDto> {
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
    return agg.getTimeSeries();
  }

  /**
   * DATA-15: Tạo danh sách từ thường gặp để ôn tập.
   */
  async createStudyList(
    datasetId: string,
    options: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
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

      if (this.vocabService) {
        try {
          const dictRes = await this.vocabService.lookupDictionary({ text: word });
          reading = dictRes.readings[0];
          meaning = dictRes.meanings[0];
        } catch {
          // Fall back if not in sandbox dictionary
        }
      }

      const itemId = generateUuidV7();
      const tags = ['source:corpus', `dataset:${datasetId}`, `term:${word}`];
      if (reading) tags.push(`reading:${reading}`);
      if (meaning) tags.push(`meaning:${meaning}`);
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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);

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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
    return agg.getYearlyTrends(options);
  }

  /**
   * DATA-25: Liên kết mẫu ngữ pháp với bài luyện tương ứng.
   */
  async getGrammarPractice(
    datasetId: string,
    patternId: string,
  ): Promise<GrammarPracticeResponseDto> {
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
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
    await this.getDataset(datasetId);
    const agg = this.getOrCreateAggregator(datasetId);
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
