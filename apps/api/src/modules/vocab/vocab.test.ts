import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import {
  answerOptions,
  correctAnswers,
  corpusTerms,
  datasets,
  entryMeanings,
  entryReadings,
  examItems,
  exams,
  examSections,
  lexicalEntries,
  lexiconHanvietReports,
  lexiconLicenses,
  operatorActions,
  questions,
  questionGroups,
  questionVersions,
  users,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { CorpusService, DEFAULT_CORPUS_DATASET_ID } from './corpus.service.js';
import { VocabController } from './vocab.controller.js';
import { VocabService } from './vocab.service.js';
import { clearStoredHanViet, getHanVietForWord } from './hanviet-store.js';
import { backfillCorpus } from './corpus-backfill.js';
import { indexExamForCorpus, removeExamFromCorpus } from './corpus-indexer.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { RATE_LIMIT_KEY } from '../../common/decorators/rate-limit.decorator.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

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

    it('finds an imported JMdict entry by its headword and by its kana reading, with the EDRDG licence', async () => {
      const licenseId = generateUuidV7();
      const entryId = generateUuidV7();
      await dbClient.db.insert(lexiconLicenses).values({
        id: licenseId,
        provider: 'Electronic Dictionary Research and Development Group (EDRDG) — JMdict, KANJIDIC2',
        license: 'CC-BY-SA-4.0',
      });
      await dbClient.db.insert(lexicalEntries).values({ id: entryId, licenseId, term: '予約', partOfSpeech: 'n,vs' });
      await dbClient.db.insert(entryReadings).values({ id: generateUuidV7(), entryId, reading: 'よやく', isPrimary: true });
      await dbClient.db.insert(entryMeanings).values({ id: generateUuidV7(), entryId, locale: 'en', meaning: 'reservation; booking' });

      for (const text of ['予約', 'よやく']) {
        const res = await vocabController.lookupDictionary({ text });
        expect(res.entry).toBe('予約');
        expect(res.readings).toEqual(['よやく']);
        expect(res.meanings).toEqual(['reservation; booking']);
        expect(res.license).toBe('CC-BY-SA-4.0');
        expect(res.attribution).toContain('EDRDG');
      }
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

  describe('H07: admin lexicon list', () => {
    async function seed(term: string, reading: string, meaning: string, pos: string) {
      const id = generateUuidV7();
      await dbClient.db.insert(lexicalEntries).values({ id, term, partOfSpeech: pos });
      await dbClient.db.insert(entryReadings).values({ id: generateUuidV7(), entryId: id, reading, isPrimary: true });
      await dbClient.db.insert(entryMeanings).values({ id: generateUuidV7(), entryId: id, locale: 'en', meaning });
    }

    it('lists, searches by headword, kana and English meaning, filters by part of speech and paginates', async () => {
      await seed('予約', 'よやく', 'reservation; booking', 'n,vs,vt');
      await seed('静か', 'しずか', 'quiet; silent', 'adj-na');
      await seed('食べる', 'たべる', 'to eat', 'v1,vt');

      const all = await vocabController.adminListLexicon();
      expect(all.total).toBe(3);
      expect(all.items.map((i) => i.term).sort()).toEqual(['予約', '静か', '食べる'].sort());

      for (const q of ['予約', 'よやく', 'reservation']) {
        const r = await vocabController.adminListLexicon(q);
        expect(r.items.map((i) => i.term)).toEqual(['予約']);
        expect(r.items[0]!.readings).toEqual(['よやく']);
      }

      const na = await vocabController.adminListLexicon(undefined, 'adj-na');
      expect(na.items.map((i) => i.term)).toEqual(['静か']);

      const page2 = await vocabController.adminListLexicon(undefined, undefined, '2', '2');
      expect(page2.total).toBe(3);
      expect(page2.items).toHaveLength(1);
    });

    it('returns an empty list when no dictionary is loaded', async () => {
      const r = await vocabController.adminListLexicon();
      expect(r).toMatchObject({ total: 0, items: [] });
    });
  });

  describe('H01: Hán Việt lưu cho từng mục từ điển, duyệt và báo sai', () => {
    async function seed(term: string, reading: string, meaning: string, pos = 'n') {
      const id = generateUuidV7();
      await dbClient.db.insert(lexicalEntries).values({ id, term, partOfSpeech: pos });
      await dbClient.db.insert(entryReadings).values({ id: generateUuidV7(), entryId: id, reading, isPrimary: true });
      await dbClient.db.insert(entryMeanings).values({ id: generateUuidV7(), entryId: id, locale: 'en', meaning });
      return id;
    }
    async function row(id: string) {
      const [r] = await dbClient.db.select().from(lexicalEntries).where(eq(lexicalEntries.id, id));
      return r!;
    }

    afterEach(() => clearStoredHanViet());

    it('lookup 要約 trả YẾU ƯỚC, high, perKanji 要 ヨウ YẾU, 約 ヤク ƯỚC (cả trước và sau backfill)', async () => {
      await seed('要約', 'ようやく', 'summary');
      const before = await vocabController.lookupDictionary({ text: '要約' });
      expect(before.hanViet).toBe('YẾU ƯỚC');
      expect(before.hanVietConfidence).toBe('high');
      expect(before.hanVietPerKanji).toEqual([
        { kanji: '要', onyomi: 'ヨウ', hanViet: 'YẾU' },
        { kanji: '約', onyomi: 'ヤク', hanViet: 'ƯỚC' },
      ]);
      await vocabService.backfillHanViet();
      const after = await vocabController.lookupDictionary({ text: '要約' });
      expect(after).toMatchObject({ hanViet: 'YẾU ƯỚC', hanVietConfidence: 'high', hanVietSource: 'override' });
    });

    it('backfill tính cho mọi mục, thống kê high/review/kun, giữ dòng manual, chạy lại không đổi', async () => {
      const yoyaku = await seed('予約', 'よやく', 'reservation');
      const yama = await seed('山', 'やま', 'mountain');
      const choshin = await seed('長身', 'ちょうしん', 'tall');
      const ongaku = await seed('音楽', 'おんがく', 'music');

      const first = await vocabService.backfillHanViet();
      expect(first.total).toBe(4);
      expect(first.updated).toBe(4);
      expect(first.stats).toEqual({ high: 2, review: 1, kun: 1 });
      expect(await row(yoyaku)).toMatchObject({ hanViet: 'DỰ ƯỚC', hanVietConfidence: 'high' });
      expect(await row(yama)).toMatchObject({ hanViet: 'SƠN', hanVietConfidence: 'kun' });
      expect(await row(choshin)).toMatchObject({ hanViet: 'TRƯỜNG THÂN', hanVietConfidence: 'review' });
      // Without a reading, notebook/quiz callers now get the stored per-entry value (音楽 = ÂM NHẠC, not ÂM LẠC).
      expect(getHanVietForWord('音楽')).toBe('ÂM NHẠC');

      await vocabController.adminUpdateHanViet(choshin, { hanViet: 'trường thân' });
      const second = await vocabService.backfillHanViet();
      expect(second.updated).toBe(0);
      expect(second.keptManual).toBe(1);
      expect(await row(choshin)).toMatchObject({ hanViet: 'TRƯỜNG THÂN', hanVietConfidence: 'high', hanVietSource: 'manual' });
      expect((await row(ongaku)).hanViet).toBe('ÂM NHẠC');
    });

    it('PATCH admin đổi âm: lookup trả âm mới, source manual, ghi audit log', async () => {
      const id = await seed('重複', 'ちょうふく', 'duplication');
      await vocabService.backfillHanViet();
      const userId = generateUuidV7();
      await dbClient.db.insert(users).values({ id: userId, email: 'editor-h01@example.com', role: 'editor' });

      const res = await vocabController.adminUpdateHanViet(id, { hanViet: 'Trùng  phức' }, { userId } as AuthUserContext);
      expect(res).toMatchObject({ hanViet: 'TRÙNG PHỨC', confidence: 'high', source: 'manual' });
      const lookup = await vocabController.lookupDictionary({ text: '重複' });
      expect(lookup).toMatchObject({ hanViet: 'TRÙNG PHỨC', hanVietConfidence: 'high', hanVietSource: 'manual' });
      const audit = await dbClient.db.select().from(operatorActions).where(eq(operatorActions.operatorId, userId));
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ action: 'lexicon.hanviet.update', targetResource: `lexical_entries:${id}` });

      await expect(vocabController.adminUpdateHanViet(id, { hanViet: '' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(vocabController.adminUpdateHanViet(generateUuidV7(), { hanViet: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('báo sai chuyển mục sang review, có trong danh sách duyệt, backfill giữ review; PATCH xử lý báo cáo', async () => {
      const id = await seed('番号', 'ばんごう', 'number');
      await vocabService.backfillHanViet();
      expect((await row(id)).hanVietConfidence).toBe('high');

      const userId = generateUuidV7();
      const report = await vocabController.reportHanViet({ entry: '番号', reading: 'ばんごう', suggestion: 'phiên hiệu', note: 'thử' }, { userId } as AuthUserContext);
      expect(report).toMatchObject({ entryId: id, status: 'open' });
      expect((await row(id)).hanVietConfidence).toBe('review');

      const list = await vocabController.adminListHanViet('review');
      expect(list.total).toBe(1);
      expect(list.items[0]).toMatchObject({ term: '番号', reading: 'ばんごう', meaning: 'number', hanViet: 'PHIÊN HIỆU', confidence: 'review', reportCount: 1 });
      expect(list.items[0]!.perKanji.map((p) => p.hanViet)).toEqual(['PHIÊN', 'HIỆU']);

      const again = await vocabService.backfillHanViet();
      expect(again.keptReported).toBe(1);
      expect((await row(id)).hanVietConfidence).toBe('review');

      await vocabController.adminUpdateHanViet(id, { hanViet: 'PHIÊN HIỆU' });
      expect((await vocabController.adminListHanViet('review')).total).toBe(0);
      const [r] = await dbClient.db.select().from(lexiconHanvietReports).where(eq(lexiconHanvietReports.entryId, id));
      expect(r!.status).toBe('resolved');

      await expect(vocabController.reportHanViet({})).rejects.toBeInstanceOf(BadRequestException);
      await expect(vocabController.adminListHanViet('bad')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('báo sai cần đăng nhập và có giới hạn tần suất; route duyệt chỉ cho editor, reviewer, admin', () => {
      const report = VocabController.prototype.reportHanViet;
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, report)).toBeUndefined();
      expect(Reflect.getMetadata(RATE_LIMIT_KEY, report)).toMatchObject({ limit: 10, windowSec: 3600 });
      for (const fn of [VocabController.prototype.adminListHanViet, VocabController.prototype.adminUpdateHanViet]) {
        expect(Reflect.getMetadata(ROLES_KEY, fn)).toEqual(['admin', 'editor', 'reviewer']);
      }
    });

    it('GET /dictionary/hanviet nhận reading và trả độ tin cậy', async () => {
      const res = await vocabController.getHanViet('楽しい', undefined, 'たのしい');
      expect(res).toMatchObject({ hanViet: 'LẠC', confidence: 'kun' });
      const gaku = await vocabController.getHanViet('音楽', undefined, 'おんがく');
      expect(gaku).toMatchObject({ hanViet: 'ÂM NHẠC', confidence: 'high' });
    });
  });

  // ---------------------------------------------------------------------------
  // H04: Bộ ngữ liệu đề thi lưu vào database, tự tách từ khi xuất bản đề
  // ---------------------------------------------------------------------------
  describe('H04: Bộ ngữ liệu đề thi lưu vào database (Corpus DB Persistence & Indexing)', () => {
    async function seedTestExam(opts: {
      id: string;
      slug: string;
      level: string;
      title: string;
      status: 'published' | 'draft';
      year?: number;
      stemText: string;
      optionTexts?: string[];
      correctIndex?: number;
    }) {
      const now = new Date();
      await dbClient.db.insert(exams).values({
        id: opts.id,
        slug: opts.slug,
        level: opts.level,
        title: opts.title,
        kind: 'official',
        year: opts.year ?? 2023,
        session: '12',
        totalQuestions: 1,
        publishedVersion: opts.status === 'published' ? 1 : null,
        createdAt: now,
        updatedAt: now,
      });

      const sectionId = generateUuidV7();
      await dbClient.db.insert(examSections).values({
        id: sectionId,
        examId: opts.id,
        code: 'language_knowledge',
        title: 'Language Knowledge',
        durationSec: 3600,
        orderIndex: 1,
      });

      const questionId = generateUuidV7();
      await dbClient.db.insert(questions).values({
        id: questionId,
        level: opts.level,
        skill: 'vocabulary',
        mondaiType: 'vocab_reading',
        origin: 'official',
        createdAt: now,
      });

      await dbClient.db.insert(examItems).values({
        id: generateUuidV7(),
        examId: opts.id,
        sectionId,
        questionId,
        orderIndex: 1,
      });

      await dbClient.db.insert(questionVersions).values({
        questionId,
        version: 1,
        stem: opts.stemText,
        status: opts.status === 'published' ? 'published' : 'draft',
        createdAt: now,
      });

      if (opts.optionTexts && opts.optionTexts.length > 0) {
        for (let i = 0; i < opts.optionTexts.length; i++) {
          await dbClient.db.insert(answerOptions).values({
            questionId,
            questionVersion: 1,
            orderIndex: i + 1,
            content: opts.optionTexts[i],
          });
        }
      }

      if (opts.correctIndex !== undefined) {
        await dbClient.db.insert(correctAnswers).values({
          questionId,
          questionVersion: 1,
          correctOption: opts.correctIndex,
          explanationNotes: 'Test explanation notes',
        });
      }

      return { examId: opts.id, sectionId, questionId };
    }

    it('Acceptance 1, 4, 5, 6: backfill đề published, lemmatize 食べた->食べる, lọc N3, chạy lại không trùng, không lộ đáp án', async () => {
      const examN3Id = generateUuidV7();
      const examN5Id = generateUuidV7();

      // Seed N3 published exam (simulating N3 12/2019)
      await seedTestExam({
        id: examN3Id,
        slug: 'n3-2019-12',
        level: 'N3',
        title: 'JLPT N3 12/2019',
        status: 'published',
        year: 2019,
        stemText: '昨日、美味しいリンゴを食べた。',
        optionTexts: ['食べた', '飲んだ', '走った'],
        correctIndex: 1,
      });

      // Seed N5 published exam (simulating N5 demo)
      await seedTestExam({
        id: examN5Id,
        slug: 'n5-demo',
        level: 'N5',
        title: 'JLPT N5 Demo',
        status: 'published',
        year: 2023,
        stemText: '先生が教室で日本語を教える。',
        optionTexts: ['教える', '習う'],
        correctIndex: 1,
      });

      // Run backfill
      const backfillResult = await backfillCorpus(dbClient);
      expect(backfillResult.publishedExamsCount).toBe(2);
      expect(backfillResult.totalTerms).toBeGreaterThan(0);

      // Verify corpus_terms populated in DB
      const dbRows = await dbClient.db.select().from(corpusTerms);
      expect(dbRows.length).toBeGreaterThan(0);

      // Acceptance 1: GET /datasets/jlpt-official/vocabulary trả danh sách khác rỗng
      const allVocab = await vocabController.getDatasetVocabulary('jlpt-official');
      expect(allVocab.total).toBeGreaterThan(0);
      expect(allVocab.items.length).toBeGreaterThan(0);

      // Acceptance 5: Lemmatized form (食べた -> 食べる), no particles/punctuation/single kana
      const terms = allVocab.items.map((i) => i.term);
      expect(terms).toContain('食べる'); // Lemmatized from 食べた
      expect(terms).toContain('飲む'); // Lemmatized from 飲んだ
      expect(terms).toContain('教える');
      expect(terms).toContain('教室');
      expect(terms).toContain('日本語');

      // Particles & punctuation must be excluded
      expect(terms).not.toContain('が');
      expect(terms).not.toContain('を');
      expect(terms).not.toContain('で');
      expect(terms).not.toContain('、');
      expect(terms).not.toContain('。');

      // Acceptance 1 (cont): Filtering level=N3 only returns terms from N3
      const n3Vocab = await vocabController.getDatasetVocabulary('jlpt-official', { level: 'N3' });
      expect(n3Vocab.total).toBeGreaterThan(0);
      for (const item of n3Vocab.items) {
        expect(item.level).toBe('N3');
      }
      const n3Terms = n3Vocab.items.map((i) => i.term);
      expect(n3Terms).toContain('食べる');
      expect(n3Terms).not.toContain('教室'); // N5 word must not be in N3

      // Acceptance 6: Test không lộ đáp án
      const jsonString = JSON.stringify(allVocab);
      expect(jsonString).not.toContain('correctOption');
      expect(jsonString).not.toContain('correctAnswer');
      expect(jsonString).not.toContain('answerKey');
      expect(jsonString).not.toContain('Test explanation notes');

      // Acceptance 4: Chạy backfill hai lần không tạo dòng trùng
      const countBefore = dbRows.length;
      const secondBackfill = await backfillCorpus(dbClient);
      expect(secondBackfill.publishedExamsCount).toBe(2);

      const dbRowsAfter = await dbClient.db.select().from(corpusTerms);
      expect(dbRowsAfter.length).toBe(countBefore);

      const allVocabAfter = await vocabController.getDatasetVocabulary('jlpt-official');
      expect(allVocabAfter.total).toBe(allVocab.total);
    });

    it('Acceptance 2: Khởi động lại API dữ liệu vẫn còn (persistence in database)', async () => {
      const examId = generateUuidV7();
      await seedTestExam({
        id: examId,
        slug: 'n3-persist-test',
        level: 'N3',
        title: 'JLPT N3 Persist Test',
        status: 'published',
        stemText: '昨日、美味しいリンゴを食べた。',
        optionTexts: ['食べた', '飲んだ'],
      });
      await backfillCorpus(dbClient);

      // Re-instantiate CorpusService and VocabController completely fresh
      const freshCorpusService = new CorpusService(dbClient);
      const freshVocabController = new VocabController(vocabService, freshCorpusService);

      const vocab = await freshVocabController.getDatasetVocabulary('jlpt-official');
      expect(vocab.total).toBeGreaterThan(0);
      expect(vocab.items.some((i) => i.term === '食べる')).toBe(true);

      const stats = await freshVocabController.getWordStatistics('jlpt-official', '食べる');
      expect(stats.term).toBe('食べる');
      expect(stats.totalCount).toBeGreaterThan(0);
    });

    it('Acceptance 3: Xuất bản một đề mới thì từ của đề đó có trong danh sách; gỡ xuất bản thì biến mất', async () => {
      const newExamId = generateUuidV7();
      await seedTestExam({
        id: newExamId,
        slug: 'n2-special-test',
        level: 'N2',
        title: 'JLPT N2 Special',
        status: 'draft',
        year: 2024,
        stemText: '貿易と経済が急速に発展する。',
        optionTexts: ['発展', '衰退'],
      });

      // Before publish: N2 term '発展' not in corpus
      let vocab = await vocabController.getDatasetVocabulary('jlpt-official', { level: 'N2' });
      const termsBefore = vocab.items.map((i) => i.term);
      expect(termsBefore).not.toContain('発展');

      // Publish exam: calls indexExamForCorpus
      const indexResult = await indexExamForCorpus(dbClient, newExamId);
      expect(indexResult.indexedTerms).toBeGreaterThan(0);

      // After publish: term '発展' is in list
      vocab = await vocabController.getDatasetVocabulary('jlpt-official', { level: 'N2' });
      const termsAfter = vocab.items.map((i) => i.term);
      expect(termsAfter).toContain('発展');
      expect(termsAfter).toContain('経済');

      // Unpublish: calls removeExamFromCorpus
      await removeExamFromCorpus(dbClient, newExamId);

      const rowsRemaining = await dbClient.db
        .select()
        .from(corpusTerms)
        .where(eq(corpusTerms.examId, newExamId));
      expect(rowsRemaining.length).toBe(0);

      // After unpublish: terms are gone
      vocab = await vocabController.getDatasetVocabulary('jlpt-official', { level: 'N2' });
      const termsAfterUnpublish = vocab.items.map((i) => i.term);
      expect(termsAfterUnpublish).not.toContain('発展');
    });

    it('Acceptance 7 & JMdict + H01 Han-Viet enrichment: từ vựng lấy cách đọc, nghĩa tiếng Anh, Hán Việt', async () => {
      const examId = generateUuidV7();
      await seedTestExam({
        id: examId,
        slug: 'n5-enrich-test',
        level: 'N5',
        title: 'JLPT N5 Enrich',
        status: 'published',
        stemText: '先生が教室で日本語を教える。美味しいリンゴ。',
      });
      await indexExamForCorpus(dbClient, examId);

      // Seed a JMdict lexical entry for '教室'
      const licenseId = generateUuidV7();
      const entryId = generateUuidV7();
      await dbClient.db.insert(lexiconLicenses).values({
        id: licenseId,
        provider: 'JMdict',
        license: 'CC-BY-SA-4.0',
      });
      await dbClient.db.insert(lexicalEntries).values({
        id: entryId,
        licenseId,
        term: '教室',
        partOfSpeech: 'noun',
        hanViet: 'GIÁO THẤT',
        hanVietConfidence: 'high',
      });
      await dbClient.db.insert(entryReadings).values({
        id: generateUuidV7(),
        entryId,
        reading: 'きょうしつ',
        isPrimary: true,
      });
      await dbClient.db.insert(entryMeanings).values({
        id: generateUuidV7(),
        entryId,
        locale: 'en',
        meaning: 'classroom',
      });

      const vocab = await vocabController.getDatasetVocabulary('jlpt-official');
      const kyoushitsu = vocab.items.find((i) => i.term === '教室');
      expect(kyoushitsu).toBeDefined();
      expect(kyoushitsu?.reading).toBe('きょうしつ');
      expect(kyoushitsu?.meaning).toBe('classroom');
      expect(kyoushitsu?.hanViet).toBe('GIÁO THẤT');
      expect(kyoushitsu?.hanVietConfidence).toBe('high');

      // Word not in JMdict (e.g. 'リンゴ') still has valid reading and doesn't crash
      const ringo = vocab.items.find((i) => i.term === 'リンゴ');
      expect(ringo).toBeDefined();
      expect(ringo?.reading).toBeTruthy();
    });
  });
});
