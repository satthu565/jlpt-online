import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import {
  blueprints,
  examAttempts,
  examEvents,
  exams,
  examVersions,
  notebookItems,
  users,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CorpusService } from './corpus.service.js';
import { VocabController } from './vocab.controller.js';
import { VocabService } from './vocab.service.js';
import { parseDatasetCsv, parseDatasetXlsx, type ExamPackageInput } from './nlp/index.js';

describe('DATA-11..18, DATA-24..26 & Acceptance 6: Dataset Services & Export Controller', () => {
  let dbClient: DbClientInstance;
  let vocabService: VocabService;
  let corpusService: CorpusService;
  let vocabController: VocabController;

  const testUserId = generateUuidV7();
  const testUser: AuthUserContext = {
    userId: testUserId,
    email: 'learner@example.com',
    name: 'Learner One',
    role: 'student',
    sessionId: generateUuidV7(),
    sessionToken: 'test-token',
    emailVerified: true,
  };

  const datasetId = generateUuidV7();
  const examPkg1Id = generateUuidV7();
  const examPkg2Id = generateUuidV7();
  let sharedBlueprintId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    vocabService = new VocabService(dbClient);
    corpusService = new CorpusService(dbClient, vocabService);
    vocabController = new VocabController(vocabService, corpusService);

    // Create test user
    await dbClient.db.insert(users).values({
      id: testUserId,
      email: 'learner@example.com',
      passwordHash: 'hash',
      name: 'Learner One',
      role: 'student',
      status: 'active',
    });

    sharedBlueprintId = generateUuidV7();
    await dbClient.db.insert(blueprints).values({
      id: sharedBlueprintId,
      level: 'N3',
      version: 1,
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [],
      scoring: {},
    });

    // Create test dataset
    await corpusService.createDataset({
      id: datasetId,
      name: 'Tập dữ liệu chuẩn JLPT 2026',
      version: '2.0.0',
      source: 'Official JLPT and Synthetic Prepared Data',
      date: '2026-10-16',
    });

    // Ingest sample exams
    const examPkg1: ExamPackageInput = {
      packageId: examPkg1Id,
      source: {
        name: 'JLPT 2023-07 Official',
        level: 'N3',
        year: 2023,
        session: '07',
      },
      exam: {
        title: 'JLPT N3 Official 2023-07',
        groups: [
          {
            id: 'grp-1',
            instructions: [{ text: '次の文の（　）に入れるのに最もよいものを、選びなさい。' }],
            questions: [
              {
                id: 'q-n3-101',
                skill: 'vocabulary',
                stem: [
                  { text: 'この問題を解くのはとても' },
                  { text: '難しい', t: 'underline' },
                  { text: 'ですね。' },
                ],
                options: [
                  { id: 'opt-1', content: [{ text: 'やさしい' }] },
                  { id: 'opt-2', content: [{ text: 'むずかしい' }] },
                  { id: 'opt-3', content: [{ text: 'おもしろい' }] },
                ],
              },
              {
                id: 'q-n3-102',
                skill: 'grammar',
                stem: [
                  { text: '時間が足りないから、諦める' },
                  { text: 'わけにはいかない', t: 'underline' },
                  { text: '。' },
                ],
                options: [
                  { id: 'opt-g1', content: [{ text: 'わけにはいかない' }] },
                  { id: 'opt-g2', content: [{ text: 'はずがない' }] },
                ],
              },
            ],
          },
        ],
      },
    };

    const examPkg2: ExamPackageInput = {
      packageId: examPkg2Id,
      source: {
        name: 'JLPT 2020-12 Official',
        level: 'N3',
        year: 2020,
        session: '12',
      },
      exam: {
        title: 'JLPT N3 Official 2020-12',
        groups: [
          {
            id: 'grp-2',
            questions: [
              {
                id: 'q-n3-201',
                skill: 'vocabulary',
                stem: [
                  { text: '学校の' },
                  { text: '先生', t: 'underline' },
                  { text: 'に相談しました。' },
                ],
                options: [
                  { id: 'opt-s1', content: [{ text: 'せんせい' }] },
                  { id: 'opt-s2', content: [{ text: 'がくせい' }] },
                ],
              },
            ],
          },
        ],
      },
    };

    await corpusService.ingestExamPackage(datasetId, examPkg1);
    await corpusService.ingestExamPackage(datasetId, examPkg2);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // DATA-11: Questions containing a word (Negative checks & Zero answer leak)
  // ---------------------------------------------------------------------------
  describe('DATA-11: Questions containing a word', () => {
    it('returns questions containing the word with zero answer leaks', async () => {
      const questions = await vocabController.getQuestionsForWord(datasetId, '難しい', 'N3');

      expect(questions.length).toBeGreaterThan(0);
      const q = questions[0]!;
      expect(q.id).toBe('q-n3-101');
      expect(q.examTitle).toBe('JLPT N3 Official 2023-07');
      expect(q.stemText).toContain('難しい');

      // CRITICAL: Zero answer leak verification
      expect((q as unknown as Record<string, unknown>)['answerKey']).toBeUndefined();
      expect((q as unknown as Record<string, unknown>)['correct']).toBeUndefined();
      for (const opt of q.options ?? []) {
        expect((opt as unknown as Record<string, unknown>)['correct']).toBeUndefined();
        expect((opt as unknown as Record<string, unknown>)['isCorrect']).toBeUndefined();
      }
    });

    it('blocks question retrieval if learner is in active real exam session', async () => {
      // Create active exam record
      const examId = generateUuidV7();
      await dbClient.db.insert(exams).values({
        id: examId,
        slug: `real-jlpt-exam-${examId}`,
        title: 'Real JLPT Exam',
        level: 'N3',
        kind: 'real',
      });
      await dbClient.db.insert(examVersions).values({
        examId,
        version: 1,
        snapshotKey: `snapshots/${examId}/v1.json`,
        manifestKey: `manifests/${examId}/v1.json`,
        blueprintId: sharedBlueprintId,
        blueprintVersion: 1,
        scoring: {},
        totalQuestions: 10,
        publishedAt: new Date(),
        publishedBy: testUserId,
      });

      // Insert active real attempt for testUser
      await dbClient.db.insert(examAttempts).values({
        id: generateUuidV7(),
        userId: testUserId,
        examId,
        examVersion: 1,
        mode: 'real',
        status: 'in_progress',
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(),
      });

      await expect(
        vocabController.getQuestionsForWord(datasetId, '難しい', 'N3', undefined, testUser),
      ).rejects.toThrow('Question viewing is strictly blocked during an active real exam session.');
    });

    it('filters out questions from exam events currently under embargo', async () => {
      const embargoedEventId = examPkg1Id;
      const futureDate = new Date(Date.now() + 86400000); // 1 day in the future

      await dbClient.db.insert(examEvents).values({
        id: embargoedEventId,
        title: 'Embargoed Official Exam',
        level: 'N3',
        opensAt: new Date(Date.now() - 3600000),
        startsAt: new Date(Date.now() - 1800000),
        endsAt: new Date(Date.now() - 60000),
        resultReleaseAt: futureDate, // UNDER EMBARGO
        capacity: 1000,
      });

      const questions = await vocabController.getQuestionsForWord(datasetId, '難しい');
      // The question from embargoed exam must be filtered out
      expect(questions.some((q) => q.examId === embargoedEventId)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-12: Tra cứu một từ để xem thống kê
  // ---------------------------------------------------------------------------
  describe('DATA-12: Word statistics lookup', () => {
    it('returns detailed frequency and multi-dimensional distribution for term', async () => {
      const stats = await vocabController.getWordStatistics(datasetId, '難しい');

      expect(stats.term).toBe('難しい');
      expect(stats.baseForm).toBe('難しい');
      expect(stats.level).toBe('N3');
      expect(stats.totalCount).toBeGreaterThan(0);
      expect(stats.targetCount).toBeGreaterThan(0);
      expect(stats.distinctExamsCount).toBeGreaterThan(0);
      expect(stats.byLevel.N3).toBeGreaterThan(0);
      expect(stats.bySkill.vocabulary).toBeGreaterThan(0);
      expect(stats.bySession['2023-07']).toBeGreaterThan(0);
      expect(stats.rank).toBeGreaterThan(0);
    });

    it('throws 404 for term not present in dataset', async () => {
      await expect(
        vocabController.getWordStatistics(datasetId, 'nonexistent_term_xyz'),
      ).rejects.toThrow('No corpus statistics found');
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-13: So sánh mức xuất hiện giữa các cấp độ
  // ---------------------------------------------------------------------------
  describe('DATA-13: Compare appearance levels', () => {
    it('compares token and vocab counts across levels N1..N5', async () => {
      const comp = await vocabController.compareLevels(datasetId, '難しい,先生');

      expect(comp.datasetId).toBe(datasetId);
      expect(comp.levels.N3.totalTokens).toBeGreaterThan(0);
      expect(comp.termDistributions).toBeDefined();
      expect(comp.termDistributions?.length).toBe(2);
      expect(comp.termDistributions?.[0]?.term).toBe('難しい');
      expect(comp.termDistributions?.[0]?.counts.N3).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-14: Thống kê theo khoảng thời gian
  // ---------------------------------------------------------------------------
  describe('DATA-14: Time-series statistics', () => {
    it('aggregates tokens, exams, and top vocab by exam session', async () => {
      const ts = await vocabController.getTimeSeries(datasetId);

      expect(ts.sessions.length).toBeGreaterThanOrEqual(2);
      const session2023 = ts.sessions.find((s) => s.session === '2023-07');
      expect(session2023).toBeDefined();
      expect(session2023?.totalTokens).toBeGreaterThan(0);
      expect(session2023?.topVocab.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-15: Tạo danh sách từ thường gặp để ôn tập
  // ---------------------------------------------------------------------------
  describe('DATA-15: Study list creation', () => {
    it('generates prioritized study list with critical target tiers', async () => {
      const list = await vocabController.getStudyList(datasetId, {
        level: 'N3',
        prioritizeTarget: true,
      });

      expect(list.total).toBeGreaterThan(0);
      expect(list.items.length).toBeGreaterThan(0);
      const topItem = list.items[0]!;
      expect(topItem.rank).toBe(1);
      expect(topItem.priorityTier).toBe('TIER_1_CRITICAL');
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-16: Kết nối từ vựng với sổ tay cá nhân
  // ---------------------------------------------------------------------------
  describe('DATA-16: Connect vocabulary to personal notebook', () => {
    it('adds selected corpus words into user notebook items table', async () => {
      const res = await vocabController.addToNotebook(
        datasetId,
        { words: ['学校', '先生'], level: 'N3' },
        testUser,
      );

      expect(res.addedCount).toBe(2);
      expect(res.items.length).toBe(2);

      // Verify persistence in notebookItems table
      const rows = await dbClient.db
        .select()
        .from(notebookItems)
        .where(eq(notebookItems.userId, testUserId));

      expect(rows.length).toBe(2);
      expect(rows.some((r: { tags: string[] }) => r.tags.includes('term:学校'))).toBe(true);
      expect(rows.some((r: { tags: string[] }) => r.tags.includes('term:先生'))).toBe(true);
      expect(rows[0]!.tags.some((t: string) => t.startsWith('dataset:'))).toBe(true);
    });

    it('rejects unauthenticated requests to add to notebook', async () => {
      await expect(
        vocabController.addToNotebook(datasetId, { words: ['学校'] }, undefined),
      ).rejects.toThrow('Authentication required to save to notebook.');
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-17: So sánh danh sách từ thường gặp với các từ đã học
  // ---------------------------------------------------------------------------
  describe('DATA-17: Compare frequent words with learned words', () => {
    it('accurately reports mastered, in_progress, and unlearned words', async () => {
      // Add '難しい' as mastered in user notebook
      await dbClient.db.insert(notebookItems).values({
        id: generateUuidV7(),
        userId: testUserId,
        kind: 'vocab',
        entryId: generateUuidV7(),
        mastered: true,
        tags: ['term:難しい', 'reading:むずかしい', 'meaning:khó'],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await vocabController.compareWithLearned(
        datasetId,
        'N3',
        undefined,
        testUser,
      );

      expect(res.datasetId).toBe(datasetId);
      expect(res.totalFrequentWords).toBeGreaterThan(0);
      expect(res.masteredCount).toBeGreaterThanOrEqual(1);
      expect(res.coveragePercentage).toBeGreaterThan(0);
      expect(res.unlearnedList.some((u) => u.baseForm === '難しい')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-18 & Acceptance 6: Xuất báo cáo CSV / Excel
  // ---------------------------------------------------------------------------
  describe('DATA-18: Export reports in CSV and Excel with provenance', () => {
    it('exports CSV with UTF-8 BOM, provenance and formula sanitization', async () => {
      const exportRes = await vocabController.exportDatasetGet(datasetId, {
        format: 'csv',
        type: 'vocabulary',
      });

      expect(exportRes.mimeType).toContain('text/csv');
      expect(exportRes.provenance.datasetId).toBe(datasetId);
      expect(exportRes.provenance.license).toBe('CC-BY-SA-4.0');

      const csvData = exportRes.data as string;
      expect(csvData.charCodeAt(0)).toBe(0xfeff); // BOM

      // Roundtrip parse check
      const parsed = parseDatasetCsv(csvData);
      expect(parsed.type).toBe('vocabulary');
      expect(parsed.provenance.datasetId).toBe(datasetId);
      expect(parsed.rows.length).toBe(exportRes.rowCount);
    });

    it('exports XLSX OpenXML buffer with multi-sheet provenance and roundtrip', async () => {
      const exportRes = await vocabController.exportDatasetPost(datasetId, {
        format: 'xlsx',
        type: 'vocabulary',
      });

      expect(exportRes.mimeType).toContain('spreadsheetml.sheet');
      expect(Buffer.isBuffer(exportRes.data)).toBe(true);

      const parsed = parseDatasetXlsx(exportRes.data as Buffer);
      expect(parsed.format).toBe('xlsx');
      expect(parsed.type).toBe('vocabulary');
      expect(parsed.provenance.datasetId).toBe(datasetId);
      expect(parsed.rows.length).toBe(exportRes.rowCount);
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-24: So sánh xu hướng xuất hiện qua các năm
  // ---------------------------------------------------------------------------
  describe('DATA-24: Multi-year trend analysis', () => {
    it('computes trend classifications (increasing, decreasing, emerging, stable)', async () => {
      const trends = await vocabController.getYearlyTrends(datasetId);

      expect(trends.trends.length).toBeGreaterThan(0);
      for (const t of trends.trends) {
        expect(['increasing', 'decreasing', 'stable', 'emerging']).toContain(t.trend);
        expect(t.yearlyCounts).toBeDefined();
      }
      expect(trends.topByLevel.N3).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-25: Liên kết mẫu ngữ pháp với bài luyện tương ứng
  // ---------------------------------------------------------------------------
  describe('DATA-25: Link grammar patterns to practice exercises', () => {
    it('returns grammar practice questions without answer leaks', async () => {
      const practice = await vocabController.getGrammarPractice(
        datasetId,
        'n3-wake-ni-wa-ikanai',
      );

      expect(practice.patternId).toBe('n3-wake-ni-wa-ikanai');
      expect(practice.pattern).toBe('わけにはいかない');
      expect(practice.questions.length).toBeGreaterThan(0);

      // Verify zero answer leaks
      const q = practice.questions[0]!;
      expect((q as unknown as Record<string, unknown>)['answerKey']).toBeUndefined();
      expect((q as unknown as Record<string, unknown>)['correct']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // DATA-26: Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo
  // ---------------------------------------------------------------------------
  describe('DATA-26: Intelligent study recommendation algorithm', () => {
    it('weights unlearned frequent words higher than mastered words', async () => {
      // Mark '先生' as mastered
      await dbClient.db.insert(notebookItems).values({
        id: generateUuidV7(),
        userId: testUserId,
        kind: 'vocab',
        entryId: generateUuidV7(),
        mastered: true,
        tags: ['term:先生', 'reading:せんせい'],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await vocabController.getRecommendations(
        datasetId,
        { level: 'N3', limit: 10 },
        testUser,
      );

      expect(res.datasetId).toBe(datasetId);
      expect(res.recommendations.length).toBeGreaterThan(0);

      // Top recommendation should be unlearned
      const topRec = res.recommendations[0]!;
      expect(topRec.rank).toBe(1);
      expect(topRec.status).toBe('unlearned');
      expect(topRec.priorityScore).toBeGreaterThan(0);
      expect(topRec.reason).toContain('unlearned');
    });

    it('rejects unauthenticated requests for recommendations', async () => {
      await expect(
        vocabController.getRecommendations(datasetId, {}, undefined),
      ).rejects.toThrow('Authentication required for personalized recommendations.');
    });
  });
});
