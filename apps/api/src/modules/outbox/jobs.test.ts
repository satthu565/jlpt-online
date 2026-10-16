import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { DatabaseModule, getOrCreateDbClient } from '../../common/database/database.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { OutboxModule } from './outbox.module.js';
import { OutboxService } from './outbox.service.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

@Module({
  imports: [DatabaseModule, ScoringModule, OutboxModule],
})
class TestJobsAppModule {}

describe('Background Jobs & Outbox Processing (N02, A14, SYS-18)', () => {
  let app: NestFastifyApplication;
  let outboxService: OutboxService;
  let testUserId: string;
  let testExamId: string;
  let questionIds: string[] = [];

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create User
    testUserId = generateUuidV7();
    await client.db.insert(schema.users).values({
      id: testUserId,
      email: `job_user_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });

    // 2. Create Questions
    questionIds = [generateUuidV7(), generateUuidV7(), generateUuidV7(), generateUuidV7()];
    for (let i = 0; i < questionIds.length; i++) {
      await client.db.insert(schema.questions).values({
        id: questionIds[i]!,
        level: 'N3',
        mondaiType: 'kanji_reading',
        skill: 'vocabulary',
        origin: 'original',
      });
    }

    // 3. Create Blueprint
    const blueprintId = generateUuidV7();
    await client.db.insert(schema.blueprints).values({
      id: blueprintId,
      level: 'N3',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [{ code: 'vocab', title: 'Từ vựng', durationSec: 1800 }],
      scoring: {
        method: 'linear_reference',
        sections: [{ code: 'vocab', label: 'Từ vựng', skills: ['vocabulary'], maxScaled: 60, minPass: 19 }],
      },
      changedBy: testUserId,
    });

    // 4. Create Exam
    testExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: testExamId,
      slug: `jobs-exam-${Date.now()}`,
      level: 'N3',
      title: 'Đề thi Job N3',
      kind: 'original',
      totalQuestions: 4,
      publishedVersion: 1,
    });

    await client.db.insert(schema.examVersions).values({
      examId: testExamId,
      version: 1,
      snapshotKey: `exams/${testExamId}/v1/snapshot.json`,
      manifestKey: `exams/${testExamId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: {
        method: 'linear_reference',
        guestTrial: false,
        scoringSections: [{ code: 'vocab', label: 'Từ vựng', skills: ['vocabulary'], maxScaled: 60, minPass: 19 }],
      },
      totalQuestions: 4,
      publishedAt: new Date(),
      publishedBy: testUserId,
    });

    const sectionId = generateUuidV7();
    await client.db.insert(schema.examSections).values({
      id: sectionId,
      examId: testExamId,
      code: 'vocab',
      title: 'Từ vựng',
      durationSec: 1800,
      orderIndex: 0,
    });

    // Link exam items
    for (let i = 0; i < questionIds.length; i++) {
      await client.db.insert(schema.examItems).values({
        id: generateUuidV7(),
        examId: testExamId,
        sectionId,
        questionId: questionIds[i]!,
        orderIndex: i,
      });
    }

    await client.db.insert(schema.examAnswerKeys).values({
      examId: testExamId,
      version: 1,
      keys: [1, 2, 3, 4],
      skills: ['vocabulary', 'vocabulary', 'vocabulary', 'vocabulary'],
      mondaiTypes: ['kanji_reading', 'kanji_reading', 'kanji_reading', 'kanji_reading'],
      sectionRanges: [[0, 3]],
    });

    // Nest App init
    app = await NestFactory.create<NestFastifyApplication>(
      TestJobsAppModule,
      new FastifyAdapter(),
      { logger: ['error', 'warn'] },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    outboxService = app.get(OutboxService);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Job 1: outbox-relay (A14)', () => {
    it('Relay các sự kiện outbox chưa phát hành (publishedAt is null) và cập nhật thời gian phát hành', async () => {
      const client = await getOrCreateDbClient();
      const eventId1 = generateUuidV7();
      const eventId2 = generateUuidV7();

      // Insert two unpublished outbox rows
      await client.db.insert(schema.outbox).values([
        {
          id: eventId1,
          topic: 'attempt.started',
          payload: { attemptId: 'att_1', userId: testUserId },
          createdAt: new Date(),
          publishedAt: null,
        },
        {
          id: eventId2,
          topic: 'attempt.submitted',
          payload: { attemptId: 'att_2', userId: testUserId },
          createdAt: new Date(),
          publishedAt: null,
        },
      ]);

      // Execute relay job
      const processed = await outboxService.relayOutbox(50);
      expect(processed).toBeGreaterThanOrEqual(2);

      // Verify DB rows now have publishedAt set
      const rows = await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.id, eventId1));
      expect(rows[0]?.publishedAt).toBeInstanceOf(Date);

      // Subsequent relay should skip already published rows (idempotent)
      const nextBatch = await outboxService.relayOutbox(50);
      const remainingUnpublished = await client.db
        .select()
        .from(schema.outbox)
        .where(isNull(schema.outbox.publishedAt));
      expect(remainingUnpublished.length).toBe(0);
    });
  });

  describe('Job 2: close-expired-attempts (A14, SYS-18)', () => {
    it('Tự động đóng và chấm điểm các bài thi quá hạn nộp, bổ sung cờ late_sync và gửi outbox', async () => {
      const client = await getOrCreateDbClient();
      const expiredAttemptId = generateUuidV7();
      const now = new Date();
      // Deadline was 1 hour ago
      const expiredDeadline = new Date(now.getTime() - 3600 * 1000);

      await client.db.insert(schema.examAttempts).values({
        id: expiredAttemptId,
        examId: testExamId,
        examVersion: 1,
        userId: testUserId,
        mode: 'real',
        status: 'in_progress',
        currentSection: 0,
        currentDeadline: expiredDeadline,
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(now.getTime() - 7200 * 1000),
        lastActivityAt: expiredDeadline,
      });

      await client.db.insert(schema.attemptAnswerSheets).values({
        attemptId: expiredAttemptId,
        answers: [1, 2, 0, 0],
        flags: [0, 0, 0, 0],
        lastSeq: 1,
      });

      // Run close-expired-attempts
      const closedCount = await outboxService.closeExpiredAttempts(now);
      expect(closedCount).toBeGreaterThanOrEqual(1);

      // Verify attempt is now submitted with late_sync flag
      const [closedAttempt] = await client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, expiredAttemptId));

      expect(closedAttempt?.status).toBe('submitted');
      expect(closedAttempt?.submittedBy).toBe('system');
      expect(closedAttempt?.resultFlags).toContain('late_sync');
      expect(closedAttempt?.result).toBeDefined();

      // Verify outbox has attempt.submitted event
      const events = await client.db
        .select()
        .from(schema.outbox)
      const forThis = events.find(
        (e: typeof schema.outbox.$inferSelect) => (e.payload as Record<string, unknown>)?.['aggregateId'] === expiredAttemptId,
      );
      expect(forThis).toBeDefined();
    });
  });

  describe('Job 3: abandon-between-sections (A14)', () => {
    it('Đóng các bài thi bị bỏ dở giữa các phần vượt quá 24h với cờ interrupted', async () => {
      const client = await getOrCreateDbClient();
      const abandonedAttemptId = generateUuidV7();
      const now = new Date();
      // Last activity was 30 hours ago
      const idleTime = new Date(now.getTime() - 30 * 3600 * 1000);

      await client.db.insert(schema.examAttempts).values({
        id: abandonedAttemptId,
        examId: testExamId,
        examVersion: 1,
        userId: testUserId,
        mode: 'real',
        status: 'in_progress',
        currentSection: 0,
        currentDeadline: null, // between sections
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(now.getTime() - 35 * 3600 * 1000),
        lastActivityAt: idleTime,
      });

      await client.db.insert(schema.attemptAnswerSheets).values({
        attemptId: abandonedAttemptId,
        answers: [1, 0, 0, 0],
        flags: [0, 0, 0, 0],
        lastSeq: 1,
      });

      // Run abandon job
      const closed = await outboxService.abandonBetweenSections(24, now);
      expect(closed).toBeGreaterThanOrEqual(1);

      const [attempt] = await client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, abandonedAttemptId));

      expect(attempt?.status).toBe('submitted');
      expect(attempt?.resultFlags).toContain('interrupted');
    });
  });

  describe('Job 4: normalize-user-answers (A14)', () => {
    it('Trích xuất và lưu câu trả lời chi tiết vào bảng user_answers một cách idempotent', async () => {
      const client = await getOrCreateDbClient();
      const attemptId = generateUuidV7();

      await client.db.insert(schema.examAttempts).values({
        id: attemptId,
        examId: testExamId,
        examVersion: 1,
        userId: testUserId,
        mode: 'practice',
        status: 'submitted',
        currentSection: 0,
        leaseId: generateUuidV7(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });

      await client.db.insert(schema.attemptAnswerSheets).values({
        attemptId,
        answers: [1, 2, 4, 3], // 1=correct, 2=correct, 4!=correct, 3!=correct
        flags: [1, 0, 0, 1],
        lastSeq: 5,
      });

      // First run: inserts records
      const count1 = await outboxService.normalizeUserAnswers(
        attemptId,
        testExamId,
        1,
        [1, 2, 4, 3],
      );
      expect(count1).toBe(4);

      // Verify rows in user_answers table
      const rows = await client.db
        .select()
        .from(schema.userAnswers)
        .where(eq(schema.userAnswers.attemptId, attemptId))
        .orderBy(schema.userAnswers.questionIndex);

      expect(rows.length).toBe(4);
      expect(rows[0]?.questionIndex).toBe(0);
      expect(rows[0]?.questionId).toBe(questionIds[0]);
      expect(rows[0]?.optionValue).toBe(1);
      expect(rows[0]?.isCorrect).toBe(true);
      expect(rows[0]?.flagged).toBe(true);

      expect(rows[2]?.questionIndex).toBe(2);
      expect(rows[2]?.optionValue).toBe(4);
      expect(rows[2]?.isCorrect).toBe(false); // answer key is 3

      // Second run: idempotent, returns 4 without duplicate key error
      const count2 = await outboxService.normalizeUserAnswers(
        attemptId,
        testExamId,
        1,
        [1, 2, 4, 3],
      );
      expect(count2).toBe(4);
    });
  });

  describe('Job 5: ensure-partitions (A14)', () => {
    it('Đảm bảo phân vùng theo tháng của bảng attempt_events được khởi tạo', async () => {
      await expect(outboxService.ensurePartitions()).resolves.not.toThrow();
    });
  });
});
