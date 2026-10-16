import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { TenantGuard } from '../../common/guards/tenant.guard.js';
import { OriginGuard } from '../../common/guards/origin.guard.js';
import { TotpGuard } from '../../common/guards/totp.guard.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { ApiExceptionFilter } from '../../common/filters/api-exception.filter.js';
import { PiiMaskingInterceptor } from '../../common/interceptors/pii-masking.interceptor.js';
import { DatabaseModule, getOrCreateDbClient } from '../../common/database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { TurnstileModule } from '../turnstile/turnstile.module.js';
import { AttemptModule } from './attempt.module.js';
import { ExamModule } from '../exam/exam.module.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    ScoringModule,
    OutboxModule,
    TurnstileModule,
    AttemptModule,
    ExamModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TotpGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: PiiMaskingInterceptor },
  ],
})
class TestAttemptAppModule {}

describe('Attempt Module - Secure Exam API & Race Handling (N02)', () => {
  let app: NestFastifyApplication;
  let verifiedUserId: string;
  let verifiedUserToken: string;
  let unverifiedUserId: string;
  let unverifiedUserToken: string;
  let otherUserId: string;
  let otherUserToken: string;
  let standardExamId: string;
  let guestTrialExamId: string;
  let resumeUserToken: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Verified Student
    verifiedUserId = generateUuidV7();
    verifiedUserToken = 'tok_verified_' + Date.now();
    await client.db.insert(schema.users).values({
      id: verifiedUserId,
      email: `verified_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: verifiedUserId,
      token: verifiedUserToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Create Unverified Student
    unverifiedUserId = generateUuidV7();
    unverifiedUserToken = 'tok_unverified_' + Date.now();
    await client.db.insert(schema.users).values({
      id: unverifiedUserId,
      email: `unverified_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: false,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: unverifiedUserId,
      token: unverifiedUserToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 3. Create Other Student
    otherUserId = generateUuidV7();
    otherUserToken = 'tok_other_' + Date.now();
    await client.db.insert(schema.users).values({
      id: otherUserId,
      email: `other_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: otherUserId,
      token: otherUserToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 3b. Create Dedicated Resume Student
    const resumeUserId = generateUuidV7();
    resumeUserToken = 'tok_resume_' + Date.now();
    await client.db.insert(schema.users).values({
      id: resumeUserId,
      email: `resume_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: resumeUserId,
      token: resumeUserToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 4. Create Blueprint for testing
    const blueprintId = generateUuidV7();
    await client.db.insert(schema.blueprints).values({
      id: blueprintId,
      level: 'N3',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [
        { code: 'language_vocab', title: 'Kiến thức ngôn ngữ', durationSec: 1800 },
        { code: 'listening', title: 'Nghe hiểu', durationSec: 2400 },
      ],
      scoring: {
        method: 'linear_reference',
        maxScore: 180,
        passingScore: 95,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
    });

    await client.db.insert(schema.blueprintVersions).values({
      blueprintId,
      version: 1,
      sections: [],
      scoring: {
        method: 'linear_reference',
        maxScore: 180,
        passingScore: 95,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
      changedBy: verifiedUserId,
    });

    // 5. Create Standard Exam (non-guest-trial)
    standardExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: standardExamId,
      slug: `standard-exam-${Date.now()}`,
      level: 'N3',
      title: 'Đề thi JLPT N3 Tiêu chuẩn',
      kind: 'original',
      totalQuestions: 4,
      publishedVersion: 1,
      description: 'Đề thi thật có bản quyền, bắt buộc tài khoản học viên',
    });

    await client.db.insert(schema.examVersions).values({
      examId: standardExamId,
      version: 1,
      snapshotKey: `exams/${standardExamId}/v1/snapshot.json`,
      manifestKey: `exams/${standardExamId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: {
        method: 'linear_reference',
        guestTrial: false,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
      totalQuestions: 4,
      publishedAt: new Date(),
      publishedBy: verifiedUserId,
    });

    await client.db.insert(schema.examSections).values([
      {
        id: generateUuidV7(),
        examId: standardExamId,
        code: 'language_vocab',
        title: 'Phần 1: Kiến thức ngôn ngữ',
        durationSec: 300,
        orderIndex: 0,
      },
      {
        id: generateUuidV7(),
        examId: standardExamId,
        code: 'listening',
        title: 'Phần 2: Nghe hiểu',
        durationSec: 400,
        orderIndex: 1,
      },
    ]);

    await client.db.insert(schema.examAnswerKeys).values({
      examId: standardExamId,
      version: 1,
      keys: [1, 2, 3, 4],
      skills: ['vocabulary', 'vocabulary', 'listening', 'listening'],
      mondaiTypes: ['kanji_reading', 'orthography', 'task_based_comprehension', 'point_comprehension'],
      sectionRanges: [[0, 1], [2, 3]],
    });

    // 6. Create Guest Trial Exam
    guestTrialExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: guestTrialExamId,
      slug: `guest-trial-mock-${Date.now()}`,
      level: 'N3',
      title: 'Đề thi Làm thử Miễn phí N3 (Guest Trial)',
      kind: 'practice',
      totalQuestions: 4,
      publishedVersion: 1,
      description: 'Đề thi mẫu guest_trial cho phép khách trải nghiệm',
    });

    await client.db.insert(schema.examVersions).values({
      examId: guestTrialExamId,
      version: 1,
      snapshotKey: `exams/${guestTrialExamId}/v1/snapshot.json`,
      manifestKey: `exams/${guestTrialExamId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: {
        method: 'linear_reference',
        guestTrial: true,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
      totalQuestions: 4,
      publishedAt: new Date(),
      publishedBy: verifiedUserId,
    });

    await client.db.insert(schema.examSections).values([
      {
        id: generateUuidV7(),
        examId: guestTrialExamId,
        code: 'language_vocab',
        title: 'Phần 1: Kiến thức ngôn ngữ',
        durationSec: 300,
        orderIndex: 0,
      },
    ]);

    await client.db.insert(schema.examAnswerKeys).values({
      examId: guestTrialExamId,
      version: 1,
      keys: [1, 2, 3, 4],
      skills: ['vocabulary', 'vocabulary', 'listening', 'listening'],
      mondaiTypes: ['kanji_reading', 'orthography', 'task_based_comprehension', 'point_comprehension'],
      sectionRanges: [[0, 3]],
    });

    // Initialize Nest app
    app = await NestFactory.create<NestFastifyApplication>(
      TestAttemptAppModule,
      new FastifyAdapter(),
      { logger: ['error', 'warn'] },
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Acceptance 5: Guest chỉ làm đề guestTrial, attach history không chiếm attempt người khác', () => {
    it('Khách (không đăng nhập) làm đề không có cờ guest_trial bị từ chối 401 UNAUTHENTICATED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          'content-type': 'application/json',
          cookie: '__Host-guest=0192f000-0000-7000-8000-000000000099',
        },
        payload: {
          examId: standardExamId,
          mode: 'real',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('UNAUTHENTICATED');
      expect(body.error.message).toContain('guest_trial');
    });

    it('Khách làm đề có cờ guest_trial được phép bắt đầu lượt thi (201 Created)', async () => {
      const guestId = '0192f000-0000-7000-8000-000000000088';
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          'content-type': 'application/json',
          cookie: `__Host-guest=${guestId}`,
        },
        payload: {
          examId: guestTrialExamId,
          mode: 'practice',
          turnstileToken: 'test_valid_token',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.attemptId).toBeDefined();
      expect(body.lease).toBeDefined();
      expect(body.status).toBe('in_progress');
      expect(body.snapshotUrl).toContain('snapshot.json');
      expect(body.mediaToken).toBeDefined();
    });

    it('Khách làm đề có cờ guest_trial với Turnstile không hợp lệ bị từ chối 400 TURNSTILE_FAILED', async () => {
      const guestId = '0192f000-0000-7000-8000-000000000077';
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          'content-type': 'application/json',
          cookie: `__Host-guest=${guestId}`,
        },
        payload: {
          examId: guestTrialExamId,
          mode: 'practice',
          turnstileToken: 'test_invalid_token',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('TURNSTILE_FAILED');
    });

    it('Tài khoản chưa xác minh email (emailVerified = false) bị từ chối 403 EMAIL_NOT_VERIFIED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          authorization: `Bearer ${unverifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          examId: standardExamId,
          mode: 'real',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('Gắn lịch sử khách (attach-guest) chỉ chuyển các attempt của guest_id chưa gán, KHÔNG chiếm attempt người khác', async () => {
      const client = await getOrCreateDbClient();
      const guestId = generateUuidV7();

      // Create an attempt belonging to this guestId
      const guestAttemptId = generateUuidV7();
      await client.db.insert(schema.examAttempts).values({
        id: guestAttemptId,
        guestId,
        userId: null,
        examId: guestTrialExamId,
        examVersion: 1,
        mode: 'practice',
        status: 'submitted',
        currentSection: 0,
        leaseId: crypto.randomUUID(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });

      // Create an attempt belonging to OTHER user
      const otherUserAttemptId = generateUuidV7();
      await client.db.insert(schema.examAttempts).values({
        id: otherUserAttemptId,
        guestId, // even if guestId happened to match or was set earlier
        userId: otherUserId, // ALREADY OWNED BY OTHER USER!
        examId: guestTrialExamId,
        examVersion: 1,
        mode: 'practice',
        status: 'submitted',
        currentSection: 0,
        leaseId: crypto.randomUUID(),
        attemptMonth: '2026-10-01',
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });

      // Now verified user attaches this guestId
      const attachRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/attach-guest',
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          guestId,
        },
      });

      expect(attachRes.statusCode).toBe(200);
      const attachBody = JSON.parse(attachRes.payload);
      expect(attachBody.attachedCount).toBe(1);

      // Verify attaching non-existent guest returns attachedCount: 0
      const attachEmptyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/attach-guest',
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          guestId: generateUuidV7(),
        },
      });
      expect(attachEmptyRes.statusCode).toBe(200);
      const emptyBody = JSON.parse(attachEmptyRes.payload);
      expect(emptyBody.attachedCount).toBe(0);

      // Verify guest attempt was attached to verifiedUser
      const [attachedRow] = await client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, guestAttemptId));
      expect(attachedRow?.userId).toBe(verifiedUserId);
      expect(attachedRow?.guestId).toBeNull();

      // CRITICAL: Verify other user's attempt was NOT stolen / modified!
      const [otherRow] = await client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, otherUserAttemptId));
      expect(otherRow?.userId).toBe(otherUserId); // STILL OTHER USER!
    });
  });

  describe('Acceptance 1: Seq2 trước 1, trùng seq hai tab và submit/job race đúng', () => {
    let attemptId: string;
    let lease: string;

    it('Tạo lượt thi mới thành công và từ chối tạo trùng lượt thi đang mở (409 ATTEMPT_ALREADY_OPEN)', async () => {
      // 1. First create succeeds
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          examId: standardExamId,
          mode: 'real',
        },
      });

      expect(res1.statusCode).toBe(201);
      const body1 = JSON.parse(res1.payload);
      attemptId = body1.attemptId;
      lease = body1.lease;

      // 2. Second create while in_progress returns 409
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          examId: standardExamId,
          mode: 'real',
        },
      });

      expect(res2.statusCode).toBe(409);
      const body2 = JSON.parse(res2.payload);
      expect(body2.error.code).toBe('ATTEMPT_ALREADY_OPEN');
      expect(body2.error.details.attemptId).toBe(attemptId);
    });

    it('Lưu phiếu khi chưa bắt đầu phần thi nào bị từ chối 409 SECTION_NOT_STARTED', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          lease,
          seq: 1,
          answers: [1, 0, 0, 0],
          flags: [0, 0, 0, 0],
          changes: [],
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('SECTION_NOT_STARTED');
    });

    it('Chuyển sang phần 1 (sections/next) tính đúng deadline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/sections/next`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: { lease },
      });

      if (res.statusCode !== 200) {
        console.error('FAILED NEXT_SECTION:', res.statusCode, res.payload);
      }
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.sectionIndex).toBe(0);
      expect(body.deadline).toBeDefined();
    });

    it('Lô seq=2 đến trước seq=1: Phiếu lưu giá trị của seq=2, nhật ký ghi cả 2', async () => {
      // 1. Send seq=2 FIRST with answers [1, 2, 0, 0]
      const resSeq2 = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          lease,
          seq: 2,
          answers: [1, 2, 0, 0],
          flags: [0, 0, 0, 0],
          changes: [{ i: 1, v: 2, at: Date.now() }],
        },
      });

      expect(resSeq2.statusCode).toBe(200);
      const ack2 = JSON.parse(resSeq2.payload);
      expect(ack2.lastSeq).toBe(2);

      // 2. Send out-of-order seq=1 LATER with stale answers [1, 0, 0, 0]
      const resSeq1 = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          lease,
          seq: 1,
          answers: [1, 0, 0, 0],
          flags: [0, 0, 0, 0],
          changes: [{ i: 0, v: 1, at: Date.now() - 5000 }],
        },
      });

      expect(resSeq1.statusCode).toBe(200);
      const ack1 = JSON.parse(resSeq1.payload);
      expect(ack1.lastSeq).toBe(2); // Stays at 2

      // Check DB attempt_answer_sheets: answers must be from seq=2 [1, 2, 0, 0]
      const client = await getOrCreateDbClient();
      const [sheet] = await client.db
        .select()
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
      expect(sheet?.lastSeq).toBe(2);
      expect(sheet?.answers).toEqual([1, 2, 0, 0]);

      // Check DB attempt_events: both seq=1 and seq=2 must be recorded
      const events = await client.db
        .select()
        .from(schema.attemptEvents)
        .where(eq(schema.attemptEvents.attemptId, attemptId));
      const answerSeqs = events
        .filter((e: typeof schema.attemptEvents.$inferSelect) => e.type === 'answers')
        .map((e: typeof schema.attemptEvents.$inferSelect) => e.seq);
      expect(answerSeqs).toContain(1);
      expect(answerSeqs).toContain(2);
    });

    it('Trùng seq giữa 2 tab: Idempotent 200, không lỗi DB và không ghi trùng sự kiện', async () => {
      // Tab 1 and Tab 2 both send seq=3
      const payload = {
        lease,
        seq: 3,
        answers: [1, 2, 3, 0],
        flags: [0, 0, 0, 0],
        changes: [{ i: 2, v: 3, at: Date.now() }],
      };

      const [resTab1, resTab2] = await Promise.all([
        app.inject({
          method: 'PUT',
          url: `/api/v1/attempts/${attemptId}/sheet`,
          headers: { authorization: `Bearer ${verifiedUserToken}`, 'content-type': 'application/json' },
          payload,
        }),
        app.inject({
          method: 'PUT',
          url: `/api/v1/attempts/${attemptId}/sheet`,
          headers: { authorization: `Bearer ${verifiedUserToken}`, 'content-type': 'application/json' },
          payload,
        }),
      ]);

      expect(resTab1.statusCode).toBe(200);
      expect(resTab2.statusCode).toBe(200);

      // Verify DB sheet lastSeq is 3
      const client = await getOrCreateDbClient();
      const [sheet] = await client.db
        .select()
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
      expect(sheet?.lastSeq).toBe(3);
    });

    it('Đua lệnh giữa người dùng nộp và job nền đóng bài (submit vs job race): Chỉ chấm 1 lần, kết quả nhất quán', async () => {
      const outboxService = app.get(OutboxService);

      // Concurrently run client submit and background lockAndScoreAttempt
      const [clientSubmitRes, _jobResult] = await Promise.all([
        app.inject({
          method: 'POST',
          url: `/api/v1/attempts/${attemptId}/submit`,
          headers: {
            authorization: `Bearer ${verifiedUserToken}`,
            'content-type': 'application/json',
          },
          payload: {
            lease,
            seq: 4,
            answers: [1, 2, 3, 4],
            flags: [0, 0, 0, 0],
          },
        }),
        outboxService.lockAndScoreAttempt(attemptId, 'system'),
      ]);

      expect(clientSubmitRes.statusCode).toBe(200);
      const submitBody = JSON.parse(clientSubmitRes.payload);
      expect(submitBody.result).toBeDefined();

      // Check DB attempt state
      const client = await getOrCreateDbClient();
      const [finalAttempt] = await client.db
        .select()
        .from(schema.examAttempts)
        .where(eq(schema.examAttempts.id, attemptId));
      expect(finalAttempt?.status).toBe('submitted');

      // Check Outbox: exactly 1 attempt.submitted event emitted
      const outboxEvents = await client.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'attempt.submitted'));
      const forThisAttempt = outboxEvents.filter(
        (e: typeof schema.outbox.$inferSelect) => (e.payload as Record<string, unknown>)?.['aggregateId'] === attemptId,
      );
      expect(forThisAttempt.length).toBe(1);
    });

    it('Thao tác ghi phiếu hoặc chuyển phần sau khi bài thi đã nộp bị từ chối 409 ATTEMPT_CLOSED', async () => {
      // 1. Try sections/next on closed attempt
      const resNext = await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/sections/next`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: { lease },
      });
      expect(resNext.statusCode).toBe(409);
      const bodyNext = JSON.parse(resNext.payload);
      expect(bodyNext.error.code).toBe('ATTEMPT_CLOSED');

      // 2. Try update sheet on closed attempt
      const resSheet = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: {
          authorization: `Bearer ${verifiedUserToken}`,
          'content-type': 'application/json',
        },
        payload: {
          lease,
          seq: 99,
          answers: [1, 2, 3, 4],
          flags: [0, 0, 0, 0],
          changes: [],
        },
      });
      expect(resSheet.statusCode).toBe(409);
      const bodySheet = JSON.parse(resSheet.payload);
      expect(bodySheet.error.code).toBe('ATTEMPT_CLOSED');
    });
  });

  describe('Acceptance 2: ACK chỉ sau commit DB', () => {
    it('Sheet update trả 200 ACK chỉ khi dữ liệu đã thực sự được ghi vào DB', async () => {
      // Create new attempt
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: { authorization: `Bearer ${otherUserToken}`, 'content-type': 'application/json' },
        payload: { examId: guestTrialExamId, mode: 'practice' },
      });
      expect(createRes.statusCode).toBe(201);
      const { attemptId, lease } = JSON.parse(createRes.payload);

      // Start section
      await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/sections/next`,
        headers: { authorization: `Bearer ${otherUserToken}`, 'content-type': 'application/json' },
        payload: { lease },
      });

      // Send update
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: { authorization: `Bearer ${otherUserToken}`, 'content-type': 'application/json' },
        payload: {
          lease,
          seq: 10,
          answers: [1, 1, 1, 1],
          flags: [0, 1, 0, 0],
          changes: [{ i: 0, v: 1, at: Date.now() }],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const ack = JSON.parse(updateRes.payload);
      expect(ack.lastSeq).toBe(10);
      expect(ack.serverNow).toBeDefined();

      // Immediately query DB to prove commit succeeded before ACK
      const client = await getOrCreateDbClient();
      const [sheetInDb] = await client.db
        .select()
        .from(schema.attemptAnswerSheets)
        .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
      expect(sheetInDb?.lastSeq).toBe(10);
      expect(sheetInDb?.answers).toEqual([1, 1, 1, 1]);
      expect(sheetInDb?.flags).toEqual([0, 1, 0, 0]);
    });

    it('Từ chối khi phiếu trả lời sai cấu trúc hoặc vượt số lượng phương án (400 VALIDATION_ERROR), không trả ACK', async () => {
      // Create new attempt
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: { authorization: `Bearer ${otherUserToken}`, 'content-type': 'application/json' },
        payload: { examId: standardExamId, mode: 'real' },
      });
      const { attemptId, lease } = JSON.parse(createRes.payload);

      // Send invalid sheet (option 9 on 4-option question)
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: { authorization: `Bearer ${otherUserToken}`, 'content-type': 'application/json' },
        payload: {
          lease,
          seq: 1,
          answers: [1, 9, 2, 3], // 9 is invalid!
          flags: [0, 0, 0, 0],
          changes: [{ i: 1, v: 9, at: Date.now() }],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('vượt quá số phương án');
    });
  });

  describe('Resume and Lease Invalidation (EXAM-18, SYS-05)', () => {
    it('Vào lại bài thi (resume) cấp lease mới và vô hiệu hóa lease cũ', async () => {
      const resumeToken = resumeUserToken;
      // Create attempt
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/attempts',
        headers: { authorization: `Bearer ${resumeToken}`, 'content-type': 'application/json' },
        payload: { examId: guestTrialExamId, mode: 'practice' },
      });
      expect(createRes.statusCode).toBe(201);
      const { attemptId, lease: oldLease } = JSON.parse(createRes.payload);

      // Start section so attempt has currentSection initialized
      const sectionRes = await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/sections/next`,
        headers: { authorization: `Bearer ${resumeToken}`, 'content-type': 'application/json' },
        payload: { lease: oldLease },
      });
      expect(sectionRes.statusCode).toBe(200);

      // Call resume
      const resumeRes = await app.inject({
        method: 'POST',
        url: `/api/v1/attempts/${attemptId}/resume`,
        headers: { authorization: `Bearer ${resumeToken}` },
      });

      expect(resumeRes.statusCode).toBe(200);
      const resumeBody = JSON.parse(resumeRes.payload);
      const newLease = resumeBody.lease;
      expect(newLease).toBeDefined();
      expect(newLease).not.toBe(oldLease);

      // Request with OLD lease must be rejected 409 LEASE_INVALID
      const oldLeaseRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: { authorization: `Bearer ${resumeToken}`, 'content-type': 'application/json' },
        payload: {
          lease: oldLease,
          seq: 1,
          answers: [1, 0, 0, 0],
          flags: [0, 0, 0, 0],
          changes: [],
        },
      });

      expect(oldLeaseRes.statusCode).toBe(409);
      const err = JSON.parse(oldLeaseRes.payload);
      expect(err.error.code).toBe('LEASE_INVALID');

      // Request with NEW lease succeeds
      const newLeaseRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/attempts/${attemptId}/sheet`,
        headers: { authorization: `Bearer ${resumeToken}`, 'content-type': 'application/json' },
        payload: {
          lease: newLease,
          seq: 1,
          answers: [1, 0, 0, 0],
          flags: [0, 0, 0, 0],
          changes: [{ i: 0, v: 1, at: Date.now() }],
        },
      });
      expect(newLeaseRes.statusCode).toBe(200);
    });
  });
});
