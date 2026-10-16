import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../../apps/api/src/db/client.js';
import { runMigrations } from '../../../apps/api/src/db/migrate.js';
import * as schema from '../../../apps/api/src/db/schema.js';
import { generateUuidV7 } from '../../../apps/api/src/common/utils/uuid.js';
import { PlannerService } from '../../../apps/api/src/modules/planner/planner.service.js';
import { SrsService } from '../../../apps/api/src/modules/learning/srs.service.js';
import { FlashcardService } from '../../../apps/api/src/modules/learning/flashcard.service.js';
import { NotebookService } from '../../../apps/api/src/modules/learning/notebook.service.js';
import { OutboxService } from '../../../apps/api/src/modules/outbox/outbox.service.js';

describe('Learning Outbox Replay & Idempotency: Không Double-Count (L06 Acceptance 1)', () => {
  let dbClient: DbClientInstance;
  let plannerService: PlannerService;
  let srsService: SrsService;
  let flashcardService: FlashcardService;
  let notebookService: NotebookService;
  let outboxService: OutboxService;

  let studentId: string;

  beforeAll(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    outboxService = new OutboxService(dbClient);
    plannerService = new PlannerService(dbClient);
    srsService = new SrsService(dbClient);
    flashcardService = new FlashcardService(dbClient, srsService);
    notebookService = new NotebookService(dbClient);

    // Create test student user
    studentId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: studentId,
      email: `student_${studentId.slice(0, 8)}@jlpt.test`,
      name: 'Nguyen Van Học Tập',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.close();
    }
  });

  describe('1. Replay sự kiện hoàn thành buổi học (Study Session Completion): không double-count streak và thời gian', () => {
    let sessionId: string;
    const clientEventId = generateUuidV7();

    it('tạo kế hoạch học tập mới và lấy buổi học hôm nay', async () => {
      const plan = await plannerService.createStudyPlan(studentId, {
        targetLevel: 'N3',
        targetDate: '2026-12-01',
        dailyMinutes: 30,
        focusSkills: ['vocabulary', 'grammar'],
      });

      expect(plan.id).toBeDefined();

      const todayData = await plannerService.getTodayRecommendations(studentId, 'Asia/Ho_Chi_Minh');
      expect(todayData.sessions).toBeDefined();
      expect(todayData.sessions.length).toBeGreaterThan(0);
      sessionId = todayData.sessions[0]!.id;
    });

    it('lần 1: gửi xác nhận hoàn thành buổi học (isIdempotentReplay: false, streak: 1)', async () => {
      const res = await plannerService.completeStudySession(studentId, sessionId, {
        clientEventId,
        completedAt: new Date().toISOString(),
        timeSpentSeconds: 1800,
      });

      expect(res.sessionId).toBe(sessionId);
      expect(res.status).toBe('completed');
      expect(res.isIdempotentReplay).toBe(false);
      expect(res.streak).toBeGreaterThanOrEqual(1);
      expect(res.clientEventId).toBe(clientEventId);

      // Verify exactly 1 completion record in DB
      const dbCompletions = await dbClient.db
        .select()
        .from(schema.studySessionCompletions)
        .where(eq(schema.studySessionCompletions.clientEventId, clientEventId));
      expect(dbCompletions.length).toBe(1);
      expect(dbCompletions[0]!.timeSpentSeconds).toBe(1800);
    });

    it('lần 2..6: replay cùng clientEventId không double-count streak, trả về isIdempotentReplay: true', async () => {
      // Replay 5 times in succession
      for (let i = 0; i < 5; i++) {
        const replayRes = await plannerService.completeStudySession(studentId, sessionId, {
          clientEventId,
          completedAt: new Date().toISOString(),
          timeSpentSeconds: 1800,
        });

        expect(replayRes.isIdempotentReplay).toBe(true);
        expect(replayRes.streak).toBe(1);
      }

      // Check DB: rows count MUST remain exactly 1, no duplicate insertions
      const finalCompletions = await dbClient.db
        .select()
        .from(schema.studySessionCompletions)
        .where(eq(schema.studySessionCompletions.clientEventId, clientEventId));
      expect(finalCompletions.length).toBe(1);
    });
  });

  describe('2. Replay sự kiện ôn tập thẻ SRS (Cross-Device Flashcard Review Replay): không double-advance lịch lặp', () => {
    let cardId: string;
    const clientReviewId = generateUuidV7();

    beforeAll(async () => {
      // 1. Create a notebook item
      const item = await notebookService.createItem(studentId, {
        term: '継続',
        reading: 'けいぞく',
        meaning: 'Sự liên tục, tiếp tục',
        kind: 'vocab',
        tags: ['n3', 'noun', 'replay_test'],
      });

      // 2. Generate flashcard for item
      const card = await flashcardService.generateCardForNotebookItem(studentId, item.id, {
        template: 'term_to_meaning',
      });
      cardId = card.id;
    });

    it('lần 1: gửi review với clientReviewId (isIdempotentReplay: false, cập nhật schedule)', async () => {
      const res = await srsService.processReview(studentId, {
        cardId,
        rating: 3, // Good
        clientReviewId,
        timezone: 'Asia/Ho_Chi_Minh',
      });

      expect(res.cardId).toBe(cardId);
      expect(res.isIdempotentReplay).toBe(false);
      expect(res.repetitions).toBe(1);
      expect(res.intervalDays).toBe(1);
      expect(res.easeFactor).toBe(250);

      // Verify DB record
      const dbReviews = await dbClient.db
        .select()
        .from(schema.cardReviews)
        .where(eq(schema.cardReviews.clientReviewId, clientReviewId));
      expect(dbReviews.length).toBe(1);
      expect(dbReviews[0]!.rating).toBe(3);
    });

    it('lần 2..6: replay cùng clientReviewId giữ nguyên repetitions & interval, không double-count review', async () => {
      for (let i = 0; i < 5; i++) {
        const replayRes = await srsService.processReview(studentId, {
          cardId,
          rating: 3,
          clientReviewId,
          timezone: 'Asia/Ho_Chi_Minh',
        });

        expect(replayRes.isIdempotentReplay).toBe(true);
        expect(replayRes.repetitions).toBe(1); // Still 1, NOT 2 or 6!
        expect(replayRes.intervalDays).toBe(1);
      }

      // Check DB cardReviews: still exactly 1 review
      const dbReviews = await dbClient.db
        .select()
        .from(schema.cardReviews)
        .where(eq(schema.cardReviews.clientReviewId, clientReviewId));
      expect(dbReviews.length).toBe(1);

      // Check DB cardSchedules: repetitions is 1
      const schedules = await dbClient.db
        .select()
        .from(schema.cardSchedules)
        .where(eq(schema.cardSchedules.cardId, cardId));
      expect(schedules.length).toBe(1);
      expect(schedules[0]!.repetitions).toBe(1);
    });
  });

  describe('3. Outbox Transactional Relaying: relay idempotent và không publish lặp', () => {
    it('phát sự kiện domain study.session.completed vào outbox và relay idempotent', async () => {
      const mockAggregateId = generateUuidV7();

      // 1. Emit an event to outbox
      const eventId = await outboxService.emitEvent(
        'study.session.completed',
        mockAggregateId,
        studentId,
        {
          sessionId: mockAggregateId,
          userId: studentId,
          timeSpentSeconds: 1200,
          completedAt: new Date().toISOString(),
        },
      );

      expect(eventId).toBeDefined();

      // Verify stored row has publishedAt IS NULL
      const unpub = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.id, eventId));
      expect(unpub.length).toBe(1);
      expect(unpub[0]!.publishedAt).toBeNull();

      // 2. Relay outbox: publishes the event
      const relayedCount = await outboxService.relayOutbox(50);
      expect(relayedCount).toBeGreaterThanOrEqual(1);

      // Verify row now has publishedAt set
      const pub = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.id, eventId));
      expect(pub.length).toBe(1);
      expect(pub[0]!.publishedAt).not.toBeNull();

      // 3. Re-run relay immediately: should NOT re-relay the already published event
      const secondRelayCount = await outboxService.relayOutbox(50);
      expect(secondRelayCount).toBe(0);
    });
  });

  describe('4. Downstream Consumer Idempotent Deduplication Engine (Replay Event Handling)', () => {
    it('consumer tự kiểm tra deduplication cache: 10 lần nhận cùng một eventId chỉ xử lý 1 lần duy nhất', async () => {
      // Simulate downstream consumer processing study & review events
      interface ProcessedState {
        processedEventIds: Set<string>;
        totalStudyMinutes: number;
        totalFlashcardsReviewed: number;
        duplicateEventsIgnored: number;
      }

      const consumerState: ProcessedState = {
        processedEventIds: new Set<string>(),
        totalStudyMinutes: 0,
        totalFlashcardsReviewed: 0,
        duplicateEventsIgnored: 0,
      };

      function handleIncomingDomainEvent(envelope: {
        eventId: string;
        topic: string;
        payload: Record<string, unknown>;
      }): { success: boolean; replayed: boolean } {
        // Idempotency check: has this eventId been processed?
        if (consumerState.processedEventIds.has(envelope.eventId)) {
          consumerState.duplicateEventsIgnored++;
          return { success: true, replayed: true };
        }

        // Apply domain state mutations
        if (envelope.topic === 'study.session.completed') {
          const seconds = Number(envelope.payload['timeSpentSeconds'] ?? 0);
          consumerState.totalStudyMinutes += Math.round(seconds / 60);
        } else if (envelope.topic === 'learning.card.reviewed') {
          consumerState.totalFlashcardsReviewed += 1;
        }

        // Mark as processed in atomic consumer registry
        consumerState.processedEventIds.add(envelope.eventId);
        return { success: true, replayed: false };
      }

      // Event 1: Study session completed (20 mins)
      const studyEventId = generateUuidV7();
      const studyEvent = {
        eventId: studyEventId,
        topic: 'study.session.completed',
        payload: { timeSpentSeconds: 1200 },
      };

      // Deliver 10 times (network retry or replayed outbox batch)
      const results: Array<{ success: boolean; replayed: boolean }> = [];
      for (let i = 0; i < 10; i++) {
        results.push(handleIncomingDomainEvent(studyEvent));
      }

      // First call was processed, remaining 9 were replayed
      expect(results[0]!.replayed).toBe(false);
      expect(results.slice(1).every((r) => r.replayed)).toBe(true);

      // Verify study time was NOT double-counted: exactly 20 minutes (not 200 minutes!)
      expect(consumerState.totalStudyMinutes).toBe(20);
      expect(consumerState.duplicateEventsIgnored).toBe(9);

      // Event 2: Flashcard reviewed
      const cardEventId = generateUuidV7();
      const cardEvent = {
        eventId: cardEventId,
        topic: 'learning.card.reviewed',
        payload: { cardId: 'c_123', rating: 3 },
      };

      // Deliver 5 times
      for (let i = 0; i < 5; i++) {
        handleIncomingDomainEvent(cardEvent);
      }

      // Total cards reviewed MUST be exactly 1, not 5
      expect(consumerState.totalFlashcardsReviewed).toBe(1);
      expect(consumerState.duplicateEventsIgnored).toBe(9 + 4);
    });
  });
});
