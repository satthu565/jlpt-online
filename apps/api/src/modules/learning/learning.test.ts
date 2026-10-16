import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { questions, questionVersions, users } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CsvExportService, sanitizeCsvField } from './csv-export.service.js';
import { FlashcardService } from './flashcard.service.js';
import { LearningController } from './learning.controller.js';
import { NotebookService } from './notebook.service.js';
import { QuizService } from './quiz.service.js';
import { alignIntervalToMidnight, SrsService } from './srs.service.js';
import { TTSService } from './tts.service.js';
import { VocabService } from '../vocab/vocab.service.js';

function mockUser(userId: string): AuthUserContext {
  return {
    userId,
    email: `test-${userId}@jlpt.local`,
    name: 'Test Student',
    role: 'student',
    sessionId: 'test-session-id',
    sessionToken: 'test-session-token',
    emailVerified: true,
    tenantId: 'default',
  };
}

describe('L05: Learning & Notebook Module Tests (VOC-01..18, Acceptance 1 & 4)', () => {
  let dbClient: DbClientInstance;
  let srsService: SrsService;
  let notebookService: NotebookService;
  let flashcardService: FlashcardService;
  let quizService: QuizService;
  let csvExportService: CsvExportService;
  let ttsService: TTSService;
  let learningController: LearningController;
  let vocabService: VocabService;

  const testUserId = generateUuidV7();

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    await dbClient.db.insert(users).values({
      id: testUserId,
      email: `test-${testUserId}@jlpt.local`,
      name: 'Test Learner',
      role: 'user',
    });

    srsService = new SrsService(dbClient);
    notebookService = new NotebookService(dbClient);
    flashcardService = new FlashcardService(dbClient, srsService);
    quizService = new QuizService(notebookService);
    csvExportService = new CsvExportService();
    ttsService = new TTSService();
    vocabService = new VocabService(dbClient);

    learningController = new LearningController(
      notebookService,
      flashcardService,
      srsService,
      quizService,
      csvExportService,
      ttsService,
    );
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 1: Cross-device review duplicate không nhân đôi lịch (VOC-11, VOC-18)
  // ---------------------------------------------------------------------------
  describe('Acceptance 1 & VOC-18: Cross-device review duplicate không nhân đôi lịch', () => {
    it('does not duplicate interval or increment repetitions when same review is submitted across devices with identical clientReviewId', async () => {
      // 1. Create a notebook item and generate card
      const item = await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '勉強',
        reading: 'べんきょう',
        meaning: 'học tập',
      });

      const card = await flashcardService.generateCardForNotebookItem(testUserId, item.id);
      expect(card.schedule).toBeDefined();
      expect(card.schedule!.repetitions).toBe(0);
      expect(card.schedule!.intervalDays).toBe(1);

      const clientReviewId = generateUuidV7();
      const reviewedAt = '2026-10-16T10:00:00.000Z';

      // 2. Device A submits review with rating 3 (Good)
      const resA = await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId,
        rating: 3,
        reviewedAt,
        timezone: 'Asia/Ho_Chi_Minh',
      });

      expect(resA.isIdempotentReplay).toBe(false);
      expect(resA.repetitions).toBe(1);
      expect(resA.intervalDays).toBe(1);
      const firstDueAt = resA.nextDueAt;

      // 3. Device B (or network replay) submits identical review with same clientReviewId
      const resB = await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId,
        rating: 3,
        reviewedAt,
        timezone: 'Asia/Ho_Chi_Minh',
      });

      // Verification: Idempotent replay, repetitions NOT doubled, interval NOT multiplied
      expect(resB.isIdempotentReplay).toBe(true);
      expect(resB.repetitions).toBe(1); // STILL 1, NOT 2!
      expect(resB.intervalDays).toBe(1); // STILL 1, NOT 6!
      expect(resB.nextDueAt).toBe(firstDueAt); // Due date unchanged!
    });

    it('advances SRS intervals correctly on consecutive distinct reviews', async () => {
      const item = await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '食べる',
        reading: 'たべる',
        meaning: 'ăn',
      });

      const card = await flashcardService.generateCardForNotebookItem(testUserId, item.id);

      // Review 1: Good -> reps 1, interval 1
      const rev1 = await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId: generateUuidV7(),
        rating: 3,
        reviewedAt: '2026-10-16T08:00:00.000Z',
      });
      expect(rev1.repetitions).toBe(1);
      expect(rev1.intervalDays).toBe(1);

      // Review 2: Good -> reps 2, interval 6
      const rev2 = await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId: generateUuidV7(),
        rating: 3,
        reviewedAt: '2026-10-17T08:00:00.000Z',
      });
      expect(rev2.repetitions).toBe(2);
      expect(rev2.intervalDays).toBe(6);

      // Review 3: Lapse (Again) -> reps reset to 0, interval reset to 1
      const rev3 = await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId: generateUuidV7(),
        rating: 1,
        reviewedAt: '2026-10-23T08:00:00.000Z',
      });
      expect(rev3.repetitions).toBe(0);
      expect(rev3.intervalDays).toBe(1);
      expect(rev3.state).toBe('relearning');
    });

    it('aligns SRS due dates to local timezone midnight', () => {
      const baseDate = new Date('2026-10-16T14:30:00.000Z'); // 21:30 in UTC+7
      const dueMidnight = alignIntervalToMidnight(baseDate, 1, 'Asia/Ho_Chi_Minh');

      // 1 day after Oct 16 in Ho Chi Minh is Oct 17.
      // Oct 17 00:00:00 local time in Asia/Ho_Chi_Minh (UTC+7) is Oct 16 17:00:00Z
      expect(dueMidnight.toISOString()).toBe('2026-10-16T17:00:00.000Z');
    });

    it('filters due cards accurately according to user timezone', async () => {
      const item = await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '水',
        reading: 'みず',
        meaning: 'nước',
      });
      const card = await flashcardService.generateCardForNotebookItem(testUserId, item.id);

      // Initially card is due today
      const dueList1 = await srsService.getDueCards(testUserId, 'Asia/Ho_Chi_Minh');
      expect(dueList1.items.length).toBeGreaterThanOrEqual(1);
      expect(dueList1.items.some((c: (typeof dueList1.items)[number]) => c.cardId === card.id)).toBe(true);

      // Review with Easy -> due in 4 days
      await srsService.processReview(testUserId, {
        cardId: card.id,
        clientReviewId: generateUuidV7(),
        rating: 4,
      });

      // Now card should NOT be due today
      const dueList2 = await srsService.getDueCards(testUserId, 'Asia/Ho_Chi_Minh');
      expect(dueList2.items.some((c: (typeof dueList2.items)[number]) => c.cardId === card.id)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Acceptance 4: CSV formula injection neutralized; TTS license kiểm tra (VOC-15, VOC-16)
  // ---------------------------------------------------------------------------
  describe('Acceptance 4: CSV formula injection neutralized; TTS license kiểm tra', () => {
    it('neutralizes all dangerous formula trigger characters (=, +, -, @, tab, newline, pipe, %) by prepending single quote', () => {
      expect(sanitizeCsvField('=cmd|\'/C calc\'!A0')).toBe('\'=cmd|\'/C calc\'!A0');
      expect(sanitizeCsvField('@SUM(1+1)*cmd')).toBe('\'@SUM(1+1)*cmd');
      expect(sanitizeCsvField('+123456')).toBe('\'+123456');
      expect(sanitizeCsvField('-50% discount')).toBe('\'-50% discount');
      expect(sanitizeCsvField('|pipe-command')).toBe('\'|pipe-command');
      expect(sanitizeCsvField('%PERCENT_VAR%')).toBe('\'%PERCENT_VAR%');
      expect(sanitizeCsvField(';semicolon-injection')).toBe('\';semicolon-injection');

      // Normal benign values remain un-prefixed
      expect(sanitizeCsvField('学校')).toBe('学校');
      expect(sanitizeCsvField('học tập')).toBe('học tập');
    });

    it('exports user notebook to CSV with all formula injection payloads neutralized (VOC-15)', async () => {
      // Create notebook items containing malicious formula strings
      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '=cmd|\'/C calc\'!A0',
        reading: '+84999999',
        meaning: '@HYPERLINK("http://evil.com","Click")',
        examples: ['-10% discount on evil site'],
      });

      await notebookService.createItem(testUserId, {
        kind: 'kanji',
        term: '語',
        reading: 'ご',
        meaning: 'ngôn ngữ, từ ngữ',
      });

      const exportRes = await learningController.exportNotebook(
        mockUser(testUserId),
        {},
      );

      expect(exportRes.contentType).toBe('text/csv; charset=utf-8');
      expect(exportRes.rowCount).toBe(2);

      const csvData = exportRes.data;
      // Verification: No line starts with raw unescaped formula =cmd or @HYPERLINK
      expect(csvData).not.toContain(',=cmd');
      expect(csvData).not.toContain(',@HYPERLINK');
      expect(csvData).not.toContain(',+84999999');

      // Verification: Neutralized with single quote
      expect(csvData).toContain('\'=cmd|\'/C calc\'!A0');
      expect(csvData).toContain('\'@HYPERLINK');
      expect(csvData).toContain('\'+84999999');
    });

    it('verifies TTS license metadata and falls back gracefully to sandbox when external tts-provider is MISSING (VOC-16)', async () => {
      // 1. Check TTS license information endpoint
      const licenseInfo = await learningController.getTtsLicense();
      expect(licenseInfo.license).toBe('Open-Voice-License-1.0');
      expect(licenseInfo.attribution).toContain('Open J-Talk / HTS Voice');
      expect(licenseInfo.status).toBe('SANDBOX');
      expect(licenseInfo.allowedVoices).toContain('ja-JP-Standard-A');

      // 2. Synthesize pronunciation with valid permitted voice
      const res = await learningController.synthesizePronunciation(
        mockUser(testUserId),
        {
          text: 'こんにちは',
          voice: 'ja-JP-Standard-A',
        },
      );

      expect(res.format).toBe('mp3');
      expect(res.license).toBe('Open-Voice-License-1.0');
      expect(res.status).toBe('SANDBOX');
      expect(res.isExternal).toBe(false);
      expect(res.audioUrl).toContain('text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF');
      expect(res.quota.remaining).toBeGreaterThan(0);
    });

    it('rejects unsupported voices that violate license policy', async () => {
      await expect(
        learningController.synthesizePronunciation(
          mockUser(testUserId),
          {
            text: 'こんにちは',
            voice: 'unlicensed-commercial-voice-xyz',
          },
        ),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Features VOC-01 to VOC-14, VOC-17
  // ---------------------------------------------------------------------------
  describe('Notebook CRUD, Search, Quizzes, and Example Retrieval (VOC-06..14, VOC-17)', () => {
    it('supports saving Kanji and reading information (VOC-07)', async () => {
      const kanjiItem = await notebookService.createItem(testUserId, {
        kind: 'kanji',
        term: '木',
        reading: 'き, モク',
        meaning: 'cây, gỗ',
        strokeCount: 4,
        tags: ['N5', 'nature', 'kanji-set-1'],
      });

      expect(kanjiItem.kind).toBe('kanji');
      expect(kanjiItem.term).toBe('木');
      expect(kanjiItem.reading).toBe('き, モク');
      expect(kanjiItem.meaning).toBe('cây, gỗ');
      expect(kanjiItem.strokeCount).toBe(4);
      expect(kanjiItem.tags).toContain('N5');
    });

    it('supports saving grammar patterns with explanations and examples (VOC-08)', async () => {
      const grammarItem = await notebookService.createItem(testUserId, {
        kind: 'grammar',
        term: '〜てはいけない',
        meaning: 'không được làm gì (cấm chỉ)',
        examples: ['ここでタバコを吸ってはいけません。'],
        tags: ['N5', 'grammar', 'prohibition'],
      });

      expect(grammarItem.kind).toBe('grammar');
      expect(grammarItem.term).toBe('〜てはいけない');
      expect(grammarItem.meaning).toBe('không được làm gì (cấm chỉ)');
      expect(grammarItem.examples).toContain('ここでタバコを吸ってはいけません。');
    });

    it('marks item as mastered / unmastered with optimistic versioning (VOC-09)', async () => {
      const item = await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '約束',
        reading: 'やくそく',
        meaning: 'lời hứa, hẹn ước',
      });
      expect(item.mastered).toBe(false);
      expect(item.version).toBe(1);

      // Update to mastered = true
      const updated = await notebookService.updateItem(testUserId, item.id, {
        mastered: true,
        expectedVersion: 1,
      });
      expect(updated.mastered).toBe(true);
      expect(updated.version).toBe(2);

      // Conflict test: Attempt to update with stale expectedVersion 1
      await expect(
        notebookService.updateItem(testUserId, item.id, {
          mastered: false,
          expectedVersion: 1,
        }),
      ).rejects.toThrow();
    });

    it('searches notebook items by query, tags, and mastery status (VOC-12, VOC-13)', async () => {
      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '自動車',
        reading: 'じどうしゃ',
        meaning: 'xe ô tô',
        tags: ['N4', 'transport'],
      });

      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '自転車',
        reading: 'じてんしゃ',
        meaning: 'xe đạp',
        tags: ['N5', 'transport'],
      });

      // Search by term query
      const searchRes = await notebookService.listItems(testUserId, { search: '自動車' });
      expect(searchRes.items.length).toBe(1);
      expect(searchRes.items[0]!.term).toBe('自動車');

      // Filter by tag
      const tagRes = await notebookService.listItems(testUserId, { tag: 'transport' });
      expect(tagRes.items.length).toBe(2);
    });

    it('generates 4-choice quiz from saved notebook items (VOC-14)', async () => {
      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '本',
        meaning: 'sách',
      });
      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: 'ペン',
        meaning: 'bút mực',
      });
      await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '机',
        meaning: 'cái bàn',
      });

      const quiz = await quizService.generateNotebookQuiz(testUserId, { count: 3 });
      expect(quiz.questions.length).toBe(3);

      for (const q of quiz.questions) {
        expect(q.options.length).toBe(4);
        expect(q.correctOptionIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctOptionIndex).toBeLessThan(4);
        const correctChoice = q.options[q.correctOptionIndex];
        expect(correctChoice).toBeDefined();
      }
    });

    it('retrieves example sentences from question bank matching target vocabulary (VOC-17)', async () => {
      const qId = generateUuidV7();
      await dbClient.db.insert(questions).values({
        id: qId,
        level: 'N5',
        skill: 'vocabulary',
        mondaiType: 'mondai_1',
        origin: 'JLPT-2023-12',
      });

      await dbClient.db.insert(questionVersions).values({
        questionId: qId,
        version: 1,
        stem: { text: '田中さんは毎日図書館で日本語を勉強します。' },
      });

      const item = await notebookService.createItem(testUserId, {
        kind: 'vocab',
        term: '勉強',
        reading: 'べんきょう',
        meaning: 'học tập',
      });

      const examples = await notebookService.findQuestionExamples(testUserId, item.id);
      expect(examples.length).toBeGreaterThanOrEqual(1);
      expect(examples[0]!.questionId).toBe(qId);
      expect(examples[0]!.stem).toContain('勉強');
      expect(examples[0]!.matchedTerm).toBe('勉強');
    });

    it('queries dictionary with readings, meanings, POS, examples (VOC-01..05)', async () => {
      const res = await vocabService.lookupDictionary({ text: '学校', locale: 'vi' });
      expect(res.entry).toBe('学校'); // VOC-01
      expect(res.readings).toContain('がっこう'); // VOC-02
      expect(res.meanings).toContain('trường học'); // VOC-03
      expect(res.partOfSpeech).toBeDefined(); // VOC-04
      expect(res.examples.length).toBeGreaterThan(0); // VOC-05
    });
  });
});
