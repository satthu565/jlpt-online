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
class TestNoAnswerLeakAppModule {}

describe('Acceptance 3: Answer key không xuất hiện trước nộp (SYS-03, SYS-13, EXAM-09, EXAM-20)', () => {
  let app: NestFastifyApplication;
  let studentId: string;
  let studentToken: string;
  let realExamId: string;
  let practiceExamId: string;
  const answerKeyValues = [3, 1, 4, 2];

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Verified Student
    studentId = generateUuidV7();
    studentToken = 'tok_student_leak_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentId,
      email: `student_leak_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Blueprint
    const blueprintId = generateUuidV7();
    await client.db.insert(schema.blueprints).values({
      id: blueprintId,
      level: 'N2',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [
        { code: 'language_knowledge', title: 'Kiến thức ngôn ngữ', durationSec: 3600 },
        { code: 'listening', title: 'Nghe hiểu', durationSec: 3000 },
      ],
      scoring: {
        method: 'linear_reference',
        sections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar', 'reading'], maxScaled: 120, minPass: 38 },
          { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
        ],
      },
      changedBy: studentId,
    });

    // 3. Real Exam (exam for official exam mode)
    realExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: realExamId,
      slug: `real-exam-leak-${Date.now()}`,
      level: 'N2',
      title: 'Đề thi Thật JLPT N2 Tuyệt mật',
      kind: 'original',
      totalQuestions: 4,
      publishedVersion: 1,
      description: 'Đề thi bảo mật, tuyệt đối không lộ bảng đáp án',
    });

    await client.db.insert(schema.examVersions).values({
      examId: realExamId,
      version: 1,
      snapshotKey: `exams/${realExamId}/v1/snapshot.json`,
      manifestKey: `exams/${realExamId}/v1/manifest.json`,
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
      publishedBy: studentId,
    });

    await client.db.insert(schema.examSections).values([
      {
        id: generateUuidV7(),
        examId: realExamId,
        code: 'language_knowledge',
        title: 'Phần 1',
        durationSec: 1800,
        orderIndex: 0,
      },
    ]);

    await client.db.insert(schema.examAnswerKeys).values({
      examId: realExamId,
      version: 1,
      keys: answerKeyValues,
      skills: ['vocabulary', 'vocabulary', 'reading', 'reading'],
      mondaiTypes: ['kanji_reading', 'orthography', 'contextual_meaning', 'paraphrase'],
      sectionRanges: [[0, 3]],
    });

    // 4. Practice Exam (allows guest trial)
    practiceExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: practiceExamId,
      slug: `practice-exam-leak-${Date.now()}`,
      level: 'N2',
      title: 'Đề thi Luyện tập N2 (guest_trial)',
      kind: 'practice',
      totalQuestions: 4,
      publishedVersion: 1,
      description: 'guest_trial',
    });

    await client.db.insert(schema.examVersions).values({
      examId: practiceExamId,
      version: 1,
      snapshotKey: `exams/${practiceExamId}/v1/snapshot.json`,
      manifestKey: `exams/${practiceExamId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: {
        method: 'linear_reference',
        guestTrial: true,
        scoringSections: [
          { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['vocabulary', 'grammar'], maxScaled: 120, minPass: 38 },
        ],
      },
      totalQuestions: 4,
      publishedAt: new Date(),
      publishedBy: studentId,
    });

    await client.db.insert(schema.examSections).values([
      {
        id: generateUuidV7(),
        examId: practiceExamId,
        code: 'language_knowledge',
        title: 'Phần 1',
        durationSec: 1800,
        orderIndex: 0,
      },
    ]);

    await client.db.insert(schema.examAnswerKeys).values({
      examId: practiceExamId,
      version: 1,
      keys: answerKeyValues,
      skills: ['vocabulary', 'vocabulary', 'reading', 'reading'],
      mondaiTypes: ['kanji_reading', 'orthography', 'contextual_meaning', 'paraphrase'],
      sectionRanges: [[0, 3]],
    });

    // Nest application init
    app = await NestFactory.create<NestFastifyApplication>(
      TestNoAnswerLeakAppModule,
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

  it('1. Bắt đầu lượt thi (POST /attempts): Không lộ bảng đáp án hoặc giải thích trong phản hồi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        examId: realExamId,
        mode: 'real',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);

    // Verify critical fields exist
    expect(body.attemptId).toBeDefined();
    expect(body.lease).toBeDefined();
    expect(body.mediaToken).toBeDefined();

    // STRICT CHECK: response text must not contain answer key array or fields
    const rawPayload = res.payload;
    expect(rawPayload).not.toContain('"keys"');
    expect(rawPayload).not.toContain('"answerKey"');
    expect(rawPayload).not.toContain('"correct"');
    expect(rawPayload).not.toContain('"explanation"');
    expect(rawPayload).not.toContain('"result"');
    expect(body.result).toBeUndefined();
    expect(body.keys).toBeUndefined();
  });

  it('2. Vào phần thi tiếp theo (POST /sections/next): Chỉ trả thông tin phần thi và deadline, không lộ đáp án', async () => {
    // Get open attempt
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));
    expect(openAttempt).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${openAttempt!.id}/sections/next`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        lease: openAttempt!.leaseId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.sectionIndex).toBe(0);
    expect(body.deadline).toBeDefined();

    // No leaks
    const rawPayload = res.payload;
    expect(rawPayload).not.toContain('"keys"');
    expect(rawPayload).not.toContain('"answerKey"');
    expect(rawPayload).not.toContain('"correct"');
  });

  it('3. Cập nhật phiếu làm bài (PUT /sheet): Trả ACK và serverNow, không phản hồi đúng/sai', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/attempts/${openAttempt!.id}/sheet`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        lease: openAttempt!.leaseId,
        seq: 1,
        answers: [3, 0, 0, 0],
        flags: [0, 0, 0, 0],
        changes: [{ i: 0, v: 3, at: Date.now() }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.lastSeq).toBe(1);
    expect(body.serverNow).toBeDefined();

    // ACK MUST NOT contain correct answers or correctness indication
    expect(body.isCorrect).toBeUndefined();
    expect(body.score).toBeUndefined();
    expect(body.correct).toBeUndefined();
    expect(res.payload).not.toContain('"correct"');
  });

  it('4. Chi tiết bài thi đang làm (GET /attempts/:id): Omit trường result khi in_progress', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${openAttempt!.id}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('in_progress');
    expect(body.result).toBeUndefined();
    expect(res.payload).not.toContain('"result"');
    expect(res.payload).not.toContain('"keys"');
    expect(res.payload).not.toContain('"correct"');
  });

  it('5. Vào lại bài thi (POST /attempts/:id/resume): Không chứa bảng đáp án', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${openAttempt!.id}/resume`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.lease).toBeDefined();
    expect(body.answers).toBeDefined(); // Only user's current answers

    // No leak of correct answers
    expect(body.correct).toBeUndefined();
    expect(body.keys).toBeUndefined();
    expect(body.answerKey).toBeUndefined();
    expect(res.payload).not.toContain('"keys"');
    expect(res.payload).not.toContain('"correct"');
  });

  it('6. Chế độ thi thật (mode = real): Từ chối 403 khi gọi checkAnswer từng câu', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${openAttempt!.id}/check`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        lease: openAttempt!.leaseId,
        index: 0,
        selectedOption: 3,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('thi thật');
  });

  it('7. Chưa nộp bài (status = in_progress): Gọi xem lại bài thi (GET /review) bị từ chối 409 ATTEMPT_NOT_SUBMITTED', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${openAttempt!.id}/review`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('ATTEMPT_NOT_SUBMITTED');
    expect(body.error.message).toContain('sau khi đã nộp');
  });

  it('8. Nộp bài (POST /submit): Sau khi nộp thành công, mới được xem bảng đáp án và giải thích qua GET /review', async () => {
    const client = await getOrCreateDbClient();
    const [openAttempt] = await client.db
      .select()
      .from(schema.examAttempts)
      .where(eq(schema.examAttempts.userId, studentId));

    // Submit attempt
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${openAttempt!.id}/submit`,
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      payload: {
        lease: openAttempt!.leaseId,
        seq: 2,
        answers: [3, 1, 4, 2],
        flags: [0, 0, 0, 0],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitBody = JSON.parse(submitRes.payload);
    expect(submitBody.result).toBeDefined();
    expect(submitBody.result.scoring.total).toBeGreaterThan(0);

    // NOW review endpoint is authorized and returns answer key
    const reviewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${openAttempt!.id}/review`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    });

    expect(reviewRes.statusCode).toBe(200);
    const reviewBody = JSON.parse(reviewRes.payload);
    expect(reviewBody.correct).toEqual(answerKeyValues);
    expect(reviewBody.answers).toEqual([3, 1, 4, 2]);
    expect(reviewBody.result).toBeDefined();
  });

  it('9. Khách làm thử (guest trial): Tuyệt đối không lộ đáp án trong suốt quá trình làm bài', async () => {
    const guestCookie = '__Host-guest=0192f000-0000-7000-8000-000000000088';

    // 1. Create guest attempt
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: {
        'content-type': 'application/json',
        cookie: guestCookie,
      },
      payload: {
        examId: practiceExamId,
        mode: 'practice',
      },
    });

    expect(createRes.statusCode).toBe(201);
    const createBody = JSON.parse(createRes.payload);
    const attemptId = createBody.attemptId;
    const lease = createBody.lease;

    // Check payload has no answer key
    expect(createRes.payload).not.toContain('"keys"');
    expect(createRes.payload).not.toContain('"correct"');

    // 2. Review before submit is rejected
    const reviewBeforeRes = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${attemptId}/review`,
      headers: { cookie: guestCookie },
    });
    expect(reviewBeforeRes.statusCode).toBe(409);

    // 3. Submit guest attempt
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/submit`,
      headers: {
        'content-type': 'application/json',
        cookie: guestCookie,
      },
      payload: {
        lease,
        seq: 1,
        answers: [1, 2, 3, 4],
        flags: [0, 0, 0, 0],
      },
    });
    expect(submitRes.statusCode).toBe(200);

    // 4. Review after submit succeeds
    const reviewAfterRes = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${attemptId}/review`,
      headers: { cookie: guestCookie },
    });
    expect(reviewAfterRes.statusCode).toBe(200);
    const reviewBody = JSON.parse(reviewAfterRes.payload);
    expect(reviewBody.correct).toEqual(answerKeyValues);
  });
});
