import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { ensureAttemptEventsPartitions } from '../../db/partitions.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type { Role } from '@jlpt/schema';
import { ExamEventService } from './exam-event.service.js';
import { ExamEventController } from './exam-event.controller.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { AttemptService } from '../attempt/attempt.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { TurnstileService } from '../turnstile/turnstile.service.js';
import { eq } from 'drizzle-orm';

function makeUser(id: string, role: Role = 'student'): AuthUserContext {
  return {
    userId: id,
    email: `${id}@test.jlpt.local`,
    name: `User ${id}`,
    role,
    sessionId: `session-${id}`,
    sessionToken: `token-${id}`,
    emailVerified: true,
  };
}

describe('A02: Exam Event Tests (GAME-06, Acceptance 3: Event chưa kết thúc không lộ answer kể cả early submit/review)', () => {
  let dbClient: DbClientInstance;
  let outboxService: OutboxService;
  let scoringService: ScoringService;
  let turnstileService: TurnstileService;
  let attemptService: AttemptService;
  let examEventService: ExamEventService;
  let examEventController: ExamEventController;

  const student1 = makeUser('018e0000-0000-7000-8000-000000000011');
  const student2 = makeUser('018e0000-0000-7000-8000-000000000012');
  const student3 = makeUser('018e0000-0000-7000-8000-000000000013');
  const adminUser = makeUser('018e0000-0000-7000-8000-000000000014', 'admin');

  let examId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    await ensureAttemptEventsPartitions(dbClient);

    scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    turnstileService = new TurnstileService();
    attemptService = new AttemptService(
      dbClient,
      scoringService,
      outboxService,
      turnstileService,
    );
    examEventService = new ExamEventService(dbClient, outboxService, attemptService);
    examEventController = new ExamEventController(examEventService);

    // Seed users
    for (const u of [student1, student2, student3, adminUser]) {
      await dbClient.db.insert(schema.users).values({
        id: u.userId,
        email: u.email,
        name: u.name,
        role: u.role,
      });
    }

    // Seed Exam N1
    examId = generateUuidV7();
    await dbClient.db.insert(schema.exams).values({
      id: examId,
      slug: `exam-n1-test`,
      title: 'Đề Thi Thử Toàn Quốc N1',
      level: 'N1',
      kind: 'practice',
      scoringMethod: 'scaled',
      publishedVersion: 1,
    });

    const blueprintId = generateUuidV7();
    await dbClient.db.insert(schema.blueprints).values({
      id: blueprintId,
      level: 'N1',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      isOfficial: false,
      isConfirmed: true,
      confirmedBy: adminUser.userId,
      confirmedAt: new Date(),
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [],
      scoring: {},
    });

    await dbClient.db.insert(schema.examVersions).values({
      examId,
      version: 1,
      snapshotKey: `exams/${examId}/v1/snapshot.json`,
      manifestKey: `exams/${examId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: {
        method: 'linear_reference',
        guestTrial: false,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
        ],
      },
      totalQuestions: 5,
      publishedAt: new Date(),
      publishedBy: adminUser.userId,
    });

    await dbClient.db.insert(schema.examSections).values({
      id: generateUuidV7(),
      examId,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ',
      durationSec: 3600,
      orderIndex: 0,
    });

    // Seed answer key for scoring and review
    await dbClient.db.insert(schema.examAnswerKeys).values({
      examId,
      version: 1,
      keys: [1, 2, 3, 4, 1],
      skills: ['vocabulary', 'vocabulary', 'grammar', 'grammar', 'reading'],
      mondaiTypes: ['kanji_reading', 'orthography', 'word_formation', 'context_reference', 'sentence_composition'],
      sectionRanges: [[0, 4]],
    });
  });

  afterEach(async () => {
    await dbClient.close();
  });

  // ---------------------------------------------------------------------------
  // Acceptance 3: Event chưa kết thúc không lộ answer kể cả early submit/review
  // ---------------------------------------------------------------------------
  describe('Acceptance 3: Embargo answers and results before resultReleaseAt', () => {
    it('Blocks viewing results and early attempt review before resultReleaseAt', async () => {
      // Create exam event: starts now, ends in 2 hours, results released in 4 hours
      const now = Date.now();
      const opensAt = new Date(now - 1000).toISOString();
      const startsAt = new Date(now).toISOString();
      const endsAt = new Date(now + 2 * 3600 * 1000).toISOString();
      const resultReleaseAt = new Date(now + 4 * 3600 * 1000).toISOString();

      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt,
        startsAt,
        endsAt,
        resultReleaseAt,
        capacity: 100,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        title: 'Kỳ thi thử trực tuyến đồng loạt 2026',
        level: 'N1',
      });

      // 1. Student 1 registers
      const reg = await examEventController.registerExamEvent(eventId, student1);
      expect(reg.registered).toBe(true);

      // 2. Student 1 checks lobby
      const lobby = await examEventController.getExamEventLobby(eventId, student1);
      expect(lobby.canEnter).toBe(true);
      expect(lobby.serverNow).toBeDefined();

      // 3. Student 1 starts exam event attempt
      const attemptInit = await examEventController.startExamEventAttempt(eventId, student1);
      expect(attemptInit.attemptId).toBeDefined();
      expect(attemptInit.status).toBe('in_progress');

      // 4. Student 1 submits attempt early (e.g. 15 minutes into 2-hour exam)
      const submitResult = await attemptService.submitAttempt(
        attemptInit.attemptId,
        {
          lease: attemptInit.lease,
          seq: 1,
          answers: [1, 2, 3, 4, 1],
          flags: [0, 0, 0, 0, 0],
        },
        student1,
      );
      expect(submitResult.result).toBeDefined();

      // 5. CRITICAL: Student 1 tries to view event results before resultReleaseAt -> 403 Forbidden with RESULTS_EMBARGOED
      await expect(
        examEventController.getExamEventResults(eventId),
      ).rejects.toMatchObject({
        response: {
          code: 'RESULTS_EMBARGOED',
          message: expect.stringContaining('chưa được công bố'),
        },
      });

      // 6. CRITICAL: Student 1 tries to call /attempts/:id/review on the event attempt before resultReleaseAt -> 403 Forbidden with RESULTS_EMBARGOED
      await expect(
        attemptService.reviewAttempt(attemptInit.attemptId, student1),
      ).rejects.toMatchObject({
        response: {
          code: 'RESULTS_EMBARGOED',
          message: expect.stringContaining('chưa được công bố'),
        },
      });

      // 7. Time passes: resultReleaseAt arrives!
      // Update event timeline so endsAt <= resultReleaseAt <= now
      const pastBase = Date.now() - 10000;
      await dbClient.db
        .update(schema.examEvents)
        .set({
          opensAt: new Date(pastBase),
          startsAt: new Date(pastBase + 1000),
          endsAt: new Date(pastBase + 5000),
          resultReleaseAt: new Date(pastBase + 6000),
        })
        .where(eq(schema.examEvents.id, eventId));

      // 8. Now results are published and leaderboard is accessible
      const results = await examEventController.getExamEventResults(eventId);
      expect(results.items).toHaveLength(1);
      expect(results.items[0]?.rank).toBe(1);
      expect(results.items[0]?.userId).toBe(student1.userId);
      // PII masked in public ranking
      expect(results.items[0]?.name).toBe('U***');

      // 9. Publication record and outbox event are recorded
      const [pub] = await dbClient.db
        .select()
        .from(schema.eventResultPublications)
        .where(eq(schema.eventResultPublications.eventId, eventId));
      expect(pub).toBeDefined();

      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'exam_event.results_released'));
      expect(outboxEvents.length).toBeGreaterThanOrEqual(1);

      // 10. Attempt review is now allowed after results are released!
      const review = await attemptService.reviewAttempt(attemptInit.attemptId, student1);
      expect(review.answers).toEqual([1, 2, 3, 4, 1]);
      expect(review.correct).toEqual([1, 2, 3, 4, 1]);
    });
  });

  // ---------------------------------------------------------------------------
  // GAME-06: Event creation, capacity and lifecycle rules
  // ---------------------------------------------------------------------------
  describe('GAME-06: Event creation, capacity limit and lifecycle rules', () => {
    it('Rejects event creation if chronological constraint is violated', async () => {
      const now = Date.now();
      // Invalid: startsAt is AFTER endsAt
      await expect(
        examEventController.createExamEvent(adminUser, {
          examId,
          opensAt: new Date(now).toISOString(),
          startsAt: new Date(now + 2 * 3600 * 1000).toISOString(),
          endsAt: new Date(now + 1 * 3600 * 1000).toISOString(),
          resultReleaseAt: new Date(now + 3 * 3600 * 1000).toISOString(),
          capacity: 50,
          lateSyncWindowSec: 0,
          rankingScope: 'national',
          level: 'N1',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('Enforces capacity limit: rejects registration once capacity is reached', async () => {
      const now = Date.now();
      // Event with capacity = 2
      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt: new Date(now).toISOString(),
        startsAt: new Date(now + 1000).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
        resultReleaseAt: new Date(now + 7200000).toISOString(),
        capacity: 2,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        level: 'N1',
      });

      // User 1 registers -> OK
      await examEventController.registerExamEvent(eventId, student1);
      // User 2 registers -> OK (reaches capacity 2/2)
      await examEventController.registerExamEvent(eventId, student2);

      // User 3 registers -> 400 Bad Request
      await expect(
        examEventController.registerExamEvent(eventId, student3),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('đủ số lượng'),
        },
      });
    });

    it('Registration is idempotent for the same user', async () => {
      const now = Date.now();
      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt: new Date(now).toISOString(),
        startsAt: new Date(now + 1000).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
        resultReleaseAt: new Date(now + 7200000).toISOString(),
        capacity: 10,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        level: 'N1',
      });

      const res1 = await examEventController.registerExamEvent(eventId, student1);
      expect(res1.registered).toBe(true);

      const res2 = await examEventController.registerExamEvent(eventId, student1);
      expect(res2.registered).toBe(true);

      const event = await examEventController.getExamEvent(eventId);
      expect(event.registeredCount).toBe(1);
    });

    it('Rejects attempt start if user is not registered', async () => {
      const now = Date.now();
      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt: new Date(now - 1000).toISOString(),
        startsAt: new Date(now).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
        resultReleaseAt: new Date(now + 7200000).toISOString(),
        capacity: 10,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        level: 'N1',
      });

      await expect(
        examEventController.startExamEventAttempt(eventId, student1),
      ).rejects.toMatchObject({
        response: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('chưa đăng ký'),
        },
      });
    });

    it('Rejects attempt start if exam has not started yet', async () => {
      const now = Date.now();
      // Starts in 1 hour
      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt: new Date(now).toISOString(),
        startsAt: new Date(now + 3600000).toISOString(),
        endsAt: new Date(now + 7200000).toISOString(),
        resultReleaseAt: new Date(now + 10800000).toISOString(),
        capacity: 10,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        level: 'N1',
      });

      await examEventController.registerExamEvent(eventId, student1);

      await expect(
        examEventController.startExamEventAttempt(eventId, student1),
      ).rejects.toMatchObject({
        response: {
          code: 'EVENT_NOT_STARTED',
        },
      });
    });

    it('Resumes attempt when user calls startExamEventAttempt on an in-progress attempt instead of duplicating', async () => {
      const now = Date.now();
      const { eventId } = await examEventController.createExamEvent(adminUser, {
        examId,
        opensAt: new Date(now - 1000).toISOString(),
        startsAt: new Date(now).toISOString(),
        endsAt: new Date(now + 3600000).toISOString(),
        resultReleaseAt: new Date(now + 7200000).toISOString(),
        capacity: 10,
        lateSyncWindowSec: 0,
        rankingScope: 'national',
        level: 'N1',
      });

      await examEventController.registerExamEvent(eventId, student1);

      // Start attempt 1st time
      const attempt1 = await examEventController.startExamEventAttempt(eventId, student1);
      expect(attempt1.attemptId).toBeDefined();
      expect(attempt1.status).toBe('in_progress');

      // Call start attempt 2nd time while attempt 1 is in_progress -> should resume attempt1, NOT throw 500
      const attempt2 = await examEventController.startExamEventAttempt(eventId, student1);
      expect(attempt2.attemptId).toBe(attempt1.attemptId);
      expect(attempt2.status).toBe('in_progress');
    });
  });
});
