import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { datasets, questions, questionGroups, users } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { CorpusService, DEFAULT_CORPUS_DATASET_ID } from './corpus.service.js';
import { VocabController } from './vocab.controller.js';
import { VocabService } from './vocab.service.js';

describe('N05: Vocab & Corpus Data Services (Acceptance 1, 2, 3, 4 & Features DATA-01..10, DATA-19..23, QB-09)', () => {
  let dbClient: DbClientInstance;
  let vocabService: VocabService;
  let corpusService: CorpusService;
  let vocabController: VocabController;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    vocabService = new VocabService(dbClient);
    corpusService = new CorpusService(dbClient);
    vocabController = new VocabController(vocabService, corpusService);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Acceptance 4: Dictionary license và attribution đầy đủ', () => {
    it('returns dictionary entry with readings, meanings, examples, and full attribution', async () => {
      const res = await vocabController.lookupDictionary({ text: '学校', locale: 'vi' });

      expect(res.entry).toBe('学校');
      expect(res.readings).toContain('がっこう');
      expect(res.meanings).toContain('trường học');
      expect(res.examples.length).toBeGreaterThan(0);
      expect(res.license).toBe('CC-BY-SA-4.0');
      expect(res.attribution).toContain('JMdict');
      expect(res.status).toBe('SANDBOX');
    });

    it('lemmatizes inflected query term before looking up', async () => {
      // Query inflected form: '登りました' -> base form '登る'
      const res = await vocabController.lookupDictionary({ text: '登りました' });

      expect(res.entry).toBe('登る');
      expect(res.readings).toContain('のぼる');
      expect(res.meanings).toContain('leo, trèo');
    });

    it('throws 404 NotFoundException for words not in dictionary', async () => {
      await expect(
        vocabController.lookupDictionary({ text: 'xyzunknownterm' }),
      ).rejects.toThrow();
    });
  });

  describe('Acceptance 3: Dataset version, size, source, date', () => {
    it('creates dataset with full version, source, date, and license metadata', async () => {
      const datasetId = generateUuidV7();
      const created = await corpusService.createDataset({
        id: datasetId,
        name: 'Tập ngữ liệu đề thi JLPT 2026',
        version: '1.0.0',
        source: 'Đề thi chính thức JLPT và Mẫu chuẩn hóa',
        date: '2026-10-16',
      });

      expect(created.id).toBe(datasetId);

      const detail = await vocabController.getDataset(datasetId);
      expect(detail.id).toBe(datasetId);
      expect(detail.name).toBe('Tập ngữ liệu đề thi JLPT 2026');
      expect(detail.version).toBe('1.0.0');
      expect(detail.source).toBe('Đề thi chính thức JLPT và Mẫu chuẩn hóa');
      expect(detail.date).toBe('2026-10-16');
      expect(detail.license).toBe('CC-BY-SA-4.0');
    });

    it('lists datasets conforming to GET /api/v1/datasets contract', async () => {
      const id1 = generateUuidV7();
      const id2 = generateUuidV7();
      await corpusService.createDataset({
        id: id1,
        name: 'Ngữ liệu N5',
        version: '1.0.0',
      });
      await corpusService.createDataset({
        id: id2,
        name: 'Ngữ liệu N4',
        version: '1.0.0',
      });

      const list = await vocabController.listDatasets();
      expect(list.items.length).toBeGreaterThanOrEqual(2);
      expect(list.items.some((i) => i.id === id1)).toBe(true);
      expect(list.items.some((i) => i.id === id2)).toBe(true);
    });
  });

  describe('DATA-01..10 & Acceptance 1 & 2: Ingestion, Frequency by Period, Level, Skill, Role and Target vs Incidental', () => {
    it('ingests multiple exams and computes frequency by period, level, skill, role, and target status', async () => {
      const datasetId = generateUuidV7();
      await corpusService.createDataset({
        id: datasetId,
        name: 'Full JLPT Corpus',
        version: '2.0.0',
        source: 'JEES & Prepared Synthetic Data',
        date: '2026-10-16',
      });

      // Exam 1: 2023-12 N5
      // Underlined target word: 山
      // Incidental word: 登る
      await corpusService.ingestExamPackage(datasetId, {
        packageId: 'exam-pkg-2023-12-n5',
        source: {
          name: 'Đề thi chính thức 12/2023 N5',
          level: 'N5',
          year: 2023,
          session: '12',
        },
        exam: {
          title: 'JLPT N5 2023-12',
          groups: [
            {
              id: 'g-1',
              instructions: [{ t: 'text', text: '下線の言葉の読み方を選んでください。' }],
              questions: [
                {
                  id: 'q-1',
                  skill: 'kanji',
                  stem: [
                    { t: 'underline', children: [{ t: 'text', text: '山' }] },
                    { t: 'text', text: 'に登りました。' },
                  ],
                  options: [
                    { id: 'opt-1', content: [{ t: 'text', text: 'やま' }] },
                    { id: 'opt-2', content: [{ t: 'text', text: 'かわ' }] },
                  ],
                },
              ],
            },
          ],
        },
      });

      // Exam 2: 2022-07 N5
      // Incidental occurrences of 山 in passage and option
      await corpusService.ingestExamPackage(datasetId, {
        packageId: 'exam-pkg-2022-07-n5',
        source: {
          name: 'Đề thi chính thức 07/2022 N5',
          level: 'N5',
          year: 2022,
          session: '07',
        },
        exam: {
          title: 'JLPT N5 2022-07',
          groups: [
            {
              id: 'g-2',
              passage: [
                {
                  type: 'paragraph',
                  content: [{ t: 'text', text: '休みの日に山へ行きました。' }],
                },
              ],
              questions: [
                {
                  id: 'q-2',
                  skill: 'reading',
                  stem: [{ t: 'text', text: '休みの日にどこへ行きましたか。' }],
                  options: [
                    { id: 'opt-1', content: [{ t: 'text', text: '山' }] },
                    { id: 'opt-2', content: [{ t: 'text', text: '海' }] },
                  ],
                },
              ],
            },
          ],
        },
      });

      // 1. Acceptance 1: Từ xuất hiện trong đề khác từ được hỏi trực tiếp (DATA-07)
      const yamaStats = await vocabController.getDatasetVocabulary(datasetId, {
        search: '山',
      });
      expect(yamaStats.items.length).toBe(1);
      const yama = yamaStats.items[0]!;

      expect(yama.targetCount).toBe(1); // Directly tested in Exam 1
      expect(yama.incidentalCount).toBe(2); // Incidental in passage and option of Exam 2
      expect(yama.count).toBe(3); // Total occurrences

      // 2. DATA-10: Hiển thị số đề khác nhau có chứa từ
      expect(yama.distinctExamsCount).toBe(2);
      expect(yama.examIds).toContain('exam-pkg-2023-12-n5');
      expect(yama.examIds).toContain('exam-pkg-2022-07-n5');

      // 3. DATA-04: Thống kê theo N1–N5
      expect(yama.byLevel['N5']).toBe(3);

      // 4. DATA-05: Thống kê theo năm và kỳ thi (2023-12 vs 2022-07)
      expect(yama.bySession['2023-12']).toBe(1);
      expect(yama.bySession['2022-07']).toBe(2);

      // 5. DATA-06: Thống kê theo Kanji, từ vựng, đọc hiểu, nghe hiểu (skill)
      expect(yama.bySkill['kanji']).toBe(1);
      expect(yama.bySkill['reading']).toBe(2);

      // 6. DATA-08: Phân biệt từ trong câu hỏi (stem), đáp án (option) và bài đọc (passage)
      expect(yama.byRole['stem']).toBe(1);
      expect(yama.byRole['passage']).toBe(1);
      expect(yama.byRole['option']).toBe(1);

      // 7. DATA-09: Xếp hạng từ vựng xuất hiện nhiều nhất
      const allVocab = await vocabController.getDatasetVocabulary(datasetId);
      expect(allVocab.rankings.length).toBeGreaterThan(0);
      expect(allVocab.rankings[0]!.rank).toBe(1);
      expect(allVocab.rankings[0]!.frequency).toBeGreaterThanOrEqual(
        allVocab.rankings[1]?.frequency ?? 0,
      );
    });
  });

  describe('DATA-19, DATA-20, DATA-21: Grammar Pattern Statistics & Exam Tracking', () => {
    it('detects grammar patterns and lists distinct exams that tested each pattern', async () => {
      const datasetId = generateUuidV7();
      await corpusService.createDataset({
        id: datasetId,
        name: 'Grammar Dataset',
        version: '1.0.0',
      });

      // Exam A tests n5-te-wa-ikemasen
      await corpusService.ingestExamPackage(datasetId, {
        packageId: 'exam-grammar-a',
        source: { level: 'N5' },
        exam: {
          title: 'Grammar Exam A',
          groups: [
            {
              id: 'g-ga',
              questions: [
                {
                  id: 'q-ga-1',
                  skill: 'grammar',
                  stem: [{ t: 'text', text: 'ここで写真を撮ってはいけません。' }],
                },
              ],
            },
          ],
        },
      });

      // Exam B also tests n5-te-wa-ikemasen
      await corpusService.ingestExamPackage(datasetId, {
        packageId: 'exam-grammar-b',
        source: { level: 'N5' },
        exam: {
          title: 'Grammar Exam B',
          groups: [
            {
              id: 'g-gb',
              questions: [
                {
                  id: 'q-gb-1',
                  skill: 'grammar',
                  stem: [{ t: 'text', text: '教室で走ってはいけません。' }],
                },
              ],
            },
          ],
        },
      });

      const grammarStats = await vocabController.getDatasetGrammar(datasetId, {});
      expect(grammarStats.totalCount).toBeGreaterThan(0);

      // DATA-19 & DATA-20: Pattern occurrence count
      const pattern = (grammarStats.items as Array<{ patternId: string; count: number; distinctExamsCount: number; examIds: string[] }>).find((i) => i.patternId === 'n5-te-wa-ikemasen');
      expect(pattern).toBeDefined();
      expect(pattern?.count).toBe(2);
      expect(pattern?.distinctExamsCount).toBe(2);

      // DATA-21: Xem những đề từng kiểm tra mẫu ngữ pháp đó
      expect(pattern?.examIds).toContain('exam-grammar-a');
      expect(pattern?.examIds).toContain('exam-grammar-b');
    });
  });

  describe('DATA-22 & DATA-23: Kanji Statistics & Knowledge Groups', () => {
    it('aggregates Kanji frequency, levels, and knowledge groups', async () => {
      const datasetId = generateUuidV7();
      await corpusService.createDataset({
        id: datasetId,
        name: 'Kanji Dataset',
        version: '1.0.0',
      });

      await corpusService.ingestExamPackage(datasetId, {
        packageId: 'exam-kanji-1',
        source: { level: 'N5' },
        exam: {
          title: 'Kanji Exam',
          groups: [
            {
              id: 'g-k',
              questions: [
                {
                  id: 'q-k-1',
                  skill: 'kanji',
                  stem: [{ t: 'text', text: '月曜日に学校へ行きます。' }],
                },
              ],
            },
          ],
        },
      });

      const kanjiStats = await vocabController.getDatasetKanji(datasetId, {});
      expect(kanjiStats.totalCount).toBeGreaterThan(0);

      // DATA-23: Classification by knowledge group
      expect(kanjiStats.byKnowledgeGroup['time']).toBeGreaterThan(0); // 月, 曜
      expect(kanjiStats.byKnowledgeGroup['education']).toBeGreaterThan(0); // 学, 校
      expect(kanjiStats.byKnowledgeGroup['action']).toBeGreaterThan(0); // 行

      const getsu = (kanjiStats.items as Array<{ kanji: string; count: number; knowledgeGroup: string; level: string }>).find((k) => k.kanji === '月');
      expect(getsu).toBeDefined();
      expect(getsu?.count).toBe(1);
      expect(getsu?.knowledgeGroup).toBe('time');
      expect(getsu?.level).toBe('N5');
    });
  });

  describe('QB-09: Gắn từ vựng, Kanji, mẫu ngữ pháp (Question Tagging)', () => {
    it('automatically extracts and persists vocab, target_vocab, kanji, and grammar tags for a question', async () => {
      const groupId = generateUuidV7();
      await dbClient.db.insert(questionGroups).values({
        id: groupId,
        level: 'N5',
        sectionCode: 'language_vocab',
        title: 'Group Tagging Test',
      });

      const questionId = generateUuidV7();
      await dbClient.db.insert(questions).values({
        id: questionId,
        groupId,
        level: 'N5',
        skill: 'kanji',
        mondaiType: 'kanji_reading',
        origin: 'self_authored',
      });

      const stem = [
        {
          t: 'underline' as const,
          children: [{ t: 'text' as const, text: '山' }],
        },
        {
          t: 'text' as const,
          text: 'に登ってはいけません。',
        },
      ];

      const res = await vocabController.tagQuestion({
        questionId,
        stem,
        options: [{ id: 'opt-1', content: [{ t: 'text', text: 'やま' }] }],
        skill: 'kanji',
        level: 'N5',
        mondai: 1,
      });

      expect(res.tags.length).toBeGreaterThan(0);

      // Check tag types
      expect(res.tags.some((t) => t.tag === 'level:N5')).toBe(true);
      expect(res.tags.some((t) => t.tag === 'skill:kanji')).toBe(true);
      expect(res.tags.some((t) => t.tag === 'mondai:1')).toBe(true);
      expect(res.tags.some((t) => t.tag === 'target_vocab:山')).toBe(true);
      expect(res.tags.some((t) => t.tag === 'kanji:山')).toBe(true);
      expect(res.tags.some((t) => t.tag === 'grammar:n5-te-wa-ikemasen')).toBe(true);

      // Check that tags are persisted to questionTags table
      const storedTags = await vocabService.getQuestionTags(questionId);
      expect(storedTags.length).toBe(res.tags.length);
      expect(storedTags.some((t) => t.tag === 'target_vocab:山')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // I11: Route API nhận id sai định dạng trả 400/404, không bao giờ 500
  // ---------------------------------------------------------------------------
  describe('I11: Route API nhận id sai định dạng trả 400/404, không bao giờ 500', () => {
    it('throws NotFoundException when datasetId is an unknown non-existent ID', async () => {
      // Calling getDataset with unknown ID must throw NotFoundException, never 500
      await expect(vocabController.getDataset('0192f000-0000-7000-8000-999999999999')).rejects.toThrow();

      // Calling getDatasetVocabulary with unknown ID must throw NotFoundException, never 500
      await expect(vocabController.getDatasetVocabulary('0192f000-0000-7000-8000-999999999999')).rejects.toThrow();

      // Calling getDatasetGrammar with unknown ID must throw NotFoundException, never 500
      await expect(vocabController.getDatasetGrammar('0192f000-0000-7000-8000-999999999999')).rejects.toThrow();

      // Calling getDatasetKanji with unknown ID must throw NotFoundException, never 500
      await expect(vocabController.getDatasetKanji('0192f000-0000-7000-8000-999999999999')).rejects.toThrow();
    });

    it('listDatasets auto-initializes a standard dataset if none exists', async () => {
      // Even on an initially clean database, listDatasets returns at least one valid UUID dataset
      const res = await vocabController.listDatasets();
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  // ---------------------------------------------------------------------------
  // I14: API /api/v1/datasets/jlpt-official/* trả 200, không bao giờ 500
  // ---------------------------------------------------------------------------
  describe('I14: API /api/v1/datasets/jlpt-official/* trả 200 cho cả trường hợp chưa có và đã có dataset', () => {
    it('returns 200 with valid empty list when querying jlpt-official on clean/unseeded state', async () => {
      // Explicitly test unseeded state where datasets table has 0 records
      await dbClient.db.delete(datasets);

      // 1. GET /api/v1/datasets/jlpt-official/trends
      const trends = await vocabController.getYearlyTrends('jlpt-official');
      expect(trends).toBeDefined();
      expect(Array.isArray(trends.trends)).toBe(true);
      expect(trends.topByLevel).toBeDefined();

      // 2. GET /api/v1/datasets/jlpt-official/vocabulary
      const vocab = await vocabController.getDatasetVocabulary('jlpt-official');
      expect(vocab).toBeDefined();
      expect(vocab.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(vocab.items)).toBe(true);
      expect(Array.isArray(vocab.rankings)).toBe(true);

      // 3. GET /api/v1/datasets/jlpt-official/grammar
      const grammar = await vocabController.getDatasetGrammar('jlpt-official');
      expect(grammar).toBeDefined();
      expect(grammar.totalCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(grammar.items)).toBe(true);

      // 4. GET /api/v1/datasets/jlpt-official/compare/levels
      const compare = await vocabController.compareLevels('jlpt-official');
      expect(compare).toBeDefined();
      expect(compare.datasetId).toBe('jlpt-official');
      expect(compare.levels).toBeDefined();
      expect(compare.levels.N5).toBeDefined();
    });

    it('returns 200 with real ingested data when dataset exists and has exams', async () => {
      const seededDataset = await corpusService.createDataset({
        id: DEFAULT_CORPUS_DATASET_ID,
        slug: 'jlpt-official',
        name: 'Tập ngữ liệu đề thi JLPT N1–N5',
        version: '1.0.0',
      });
      expect(seededDataset.slug).toBe('jlpt-official');

      // Ingest a package
      await corpusService.ingestExamPackage('jlpt-official', {
        packageId: 'pkg-i14-test',
        source: {
          name: 'Đề thi N5 2024',
          level: 'N5',
          year: 2024,
          session: '12',
        },
        exam: {
          title: 'JLPT N5 Real Test for I14',
          groups: [
            {
              id: 'g-i14-1',
              questions: [
                {
                  id: 'q-i14-1',
                  skill: 'vocabulary',
                  stem: [
                    { t: 'underline', children: [{ t: 'text', text: '図書館' }] },
                    { t: 'text', text: 'で本を読みます。' },
                  ],
                  options: [{ id: 'opt-1', content: [{ t: 'text', text: 'としょかん' }] }],
                },
              ],
            },
          ],
        },
      });

      // Verify all 4 endpoints return 200 with populated data
      const vocabRes = await vocabController.getDatasetVocabulary('jlpt-official');
      expect(vocabRes.total).toBeGreaterThan(0);
      expect(vocabRes.items.some((i) => i.baseForm === '図書館' || i.baseForm === '本' || i.baseForm === '読む')).toBe(true);

      const grammarRes = await vocabController.getDatasetGrammar('jlpt-official');
      expect(grammarRes).toBeDefined();

      const compareRes = await vocabController.compareLevels('jlpt-official');
      expect(compareRes.datasetId).toBe('jlpt-official');

      const trendsRes = await vocabController.getYearlyTrends('jlpt-official');
      expect(trendsRes).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // P02: Dữ liệu âm Hán Việt cho Kanji và từ vựng
  // ---------------------------------------------------------------------------
  describe('P02: Dữ liệu âm Hán Việt cho Kanji và từ vựng', () => {
    it('returns hanViet: KINH TẾ for 経済 in dictionary lookup', async () => {
      const res = await vocabController.lookupDictionary({ text: '経済' });
      expect(res.entry).toBe('経済');
      expect(res.hanViet).toBe('KINH TẾ');
    });

    it('returns hanViet: KINH for single kanji 経', async () => {
      const res = await vocabController.lookupDictionary({ text: '経' });
      expect(res.entry).toBe('経');
      expect(res.hanViet).toBe('KINH');
    });

    it('returns empty string for kanji or words without Han-Viet data', async () => {
      const res = await vocabController.getHanViet('さようなら');
      expect(res.hanViet).toBe('');

      const resKokuji = await vocabController.getHanViet('込');
      expect(resKokuji.hanViet).toBe('');
    });

    it('returns dedicated hanviet endpoint with license and attribution', async () => {
      const res = await vocabController.getHanViet('経済');
      expect(res.query).toBe('経済');
      expect(res.hanViet).toBe('KINH TẾ');
      expect(res.entries.length).toBe(2);
      expect(res.entries[0]).toEqual({ kanji: '経', hanViet: 'KINH' });
      expect(res.entries[1]).toEqual({ kanji: '済', hanViet: 'TẾ' });
      expect(res.license.source).toContain('Unicode Unihan Database');
      expect(res.license.version).toBe('15.1.0');
      expect(res.license.license).toContain('Unicode Terms of Use');
    });

    it('returns hanViet when adding vocabulary to notebook via corpusService', async () => {
      const datasets = await vocabController.listDatasets();
      const datasetId = datasets.items[0]!.id;
      const userId = generateUuidV7();
      await dbClient.db.insert(users).values({
        id: userId,
        email: `test-${userId}@jlpt.local`,
        name: 'Test Learner',
        role: 'user',
      });
      const res = await corpusService.addWordsToNotebook(userId, datasetId, { words: ['経済'] });
      expect(res.addedCount).toBe(1);
      expect(res.items[0]?.term).toBe('経済');
      expect(res.items[0]?.hanViet).toBe('KINH TẾ');
    });
  });
});
