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
import { AuditModule } from '../audit/audit.module.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ScoringService } from '../scoring/scoring.service.js';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    ScoringModule,
    OutboxModule,
    TurnstileModule,
    AuditModule,
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
class TestN5ScoringAppModule {}

interface ScoredSectionItem {
  code: string;
  label: string;
  raw: number;
  rawMax: number;
  scaled: number;
  minPass: number;
  passed: boolean;
  margin?: number;
}

interface AttemptHistoryRecord {
  id: string;
  score: number | null;
  passed: boolean | null;
  sections: unknown[] | null;
  failedSections: string[];
  isEstimated: boolean;
  label: string;
}

describe('P03: Demo N5 Scoring, JLPT Floor Rules & Pacing Analysis (Matching P01)', () => {
  let app: NestFastifyApplication;
  let scoringService: ScoringService;

  let studentId: string;
  let studentToken: string;
  let examId: string;
  let failTotalExamId: string;
  let blueprintId: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Student User & Session
    studentId = generateUuidV7();
    studentToken = 'tok_n5_student_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentId,
      email: `n5_student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Create Blueprint for N5 conforming to P01 and official JLPT thresholds:
    // Language & Reading: maxScaled 120, minPass 38
    // Listening: maxScaled 60, minPass 19
    // Total: maxScaled 180, totalPass 80
    blueprintId = generateUuidV7();
    const scoringConfig = {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        {
          code: 'language_reading',
          label: 'Kiến thức ngôn ngữ & Đọc hiểu',
          skills: ['kanji', 'vocabulary', 'grammar', 'reading'],
          maxScaled: 120,
          minPass: 38,
        },
        {
          code: 'listening',
          label: 'Nghe hiểu',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
        },
      ],
      totalMax: 180,
      totalPass: 80,
    };

    await client.db.insert(schema.blueprints).values({
      id: blueprintId,
      level: 'N5',
      version: 1,
      kind: 'synthetic',
      status: 'active',
      effectiveFrom: '2026-01-01',
      sourceRef: {},
      sections: [
        { code: 'language_reading', title: 'Kiến thức ngôn ngữ & Đọc hiểu', durationSec: 3600 },
        { code: 'listening', title: 'Nghe hiểu', durationSec: 1800 },
      ],
      scoring: scoringConfig,
    });

    await client.db.insert(schema.blueprintVersions).values({
      blueprintId,
      version: 1,
      sections: [],
      scoring: scoringConfig,
      changedBy: studentId,
    });

    // 3. Create N5 Exam
    examId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: examId,
      slug: `demo-n5-exam-${Date.now()}`,
      level: 'N5',
      title: 'Đề thi demo JLPT N5 Chuẩn P01',
      kind: 'synthetic',
      year: 2026,
      session: '10',
      totalQuestions: 4,
      publishedVersion: 1,
    });

    await client.db.insert(schema.examVersions).values({
      examId,
      version: 1,
      snapshotKey: `exams/${examId}/v1/snapshot.json`,
      manifestKey: `exams/${examId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: scoringConfig,
      totalQuestions: 4,
      publishedAt: new Date(),
      publishedBy: studentId,
    });

    // 4. Create Sections & Items
    const sec1Id = generateUuidV7();
    const sec2Id = generateUuidV7();
    await client.db.insert(schema.examSections).values([
      {
        id: sec1Id,
        examId,
        orderIndex: 0,
        code: 'language_reading',
        title: 'Kiến thức ngôn ngữ & Đọc hiểu',
        durationSec: 3600,
      },
      {
        id: sec2Id,
        examId,
        orderIndex: 1,
        code: 'listening',
        title: 'Nghe hiểu',
        durationSec: 1800,
      },
    ]);

    for (let i = 0; i < 4; i++) {
      const qId = generateUuidV7();
      await client.db.insert(schema.questions).values({
        id: qId,
        level: 'N5',
        skill: i < 3 ? ((['kanji', 'grammar', 'reading'] as const)[i]) : 'listening',
        mondaiType: i < 3 ? 'kanji_reading' : 'quick_response',
        origin: 'self_authored',
      });
      await client.db.insert(schema.examItems).values({
        id: generateUuidV7(),
        examId,
        sectionId: i < 3 ? sec1Id : sec2Id,
        orderIndex: i,
        questionId: qId,
      });
    }

    // 5. Answer Key: Q0: 1, Q1: 4, Q2: 2, Q3: 1
    await client.db.insert(schema.examAnswerKeys).values({
      examId,
      version: 1,
      keys: [1, 4, 2, 1],
      skills: ['kanji', 'grammar', 'reading', 'listening'],
      mondaiTypes: ['kanji_reading', 'sentence_composition', 'comprehension_short', 'quick_response'],
      sectionRanges: [[0, 2], [3, 3]],
    });

    // 6. Create Exam specifically for FAILED_TOTAL_SCORE scenario (total < 80 but each section >= floor)
    // Section 1: language_reading (3 questions, maxScaled 120, minPass 38). Correct: [1, 4, 2]
    // Section 2: listening (3 questions, maxScaled 60, minPass 19). Correct: [1, 2, 3]
    failTotalExamId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: failTotalExamId,
      slug: `demo-n5-fail-total-${Date.now()}`,
      level: 'N5',
      title: 'Đề thi demo JLPT N5 Kịch bản Trượt Tổng Điểm',
      kind: 'synthetic',
      year: 2026,
      session: '10',
      totalQuestions: 6,
      publishedVersion: 1,
    });

    await client.db.insert(schema.examVersions).values({
      examId: failTotalExamId,
      version: 1,
      snapshotKey: `exams/${failTotalExamId}/v1/snapshot.json`,
      manifestKey: `exams/${failTotalExamId}/v1/manifest.json`,
      blueprintId,
      blueprintVersion: 1,
      scoring: scoringConfig,
      totalQuestions: 6,
      publishedAt: new Date(),
      publishedBy: studentId,
    });

    const ftSec1Id = generateUuidV7();
    const ftSec2Id = generateUuidV7();
    await client.db.insert(schema.examSections).values([
      {
        id: ftSec1Id,
        examId: failTotalExamId,
        orderIndex: 0,
        code: 'language_reading',
        title: 'Kiến thức ngôn ngữ & Đọc hiểu',
        durationSec: 3600,
      },
      {
        id: ftSec2Id,
        examId: failTotalExamId,
        orderIndex: 1,
        code: 'listening',
        title: 'Nghe hiểu',
        durationSec: 1800,
      },
    ]);

    for (let i = 0; i < 6; i++) {
      const qId = generateUuidV7();
      await client.db.insert(schema.questions).values({
        id: qId,
        level: 'N5',
        skill: i < 3 ? ((['kanji', 'grammar', 'reading'] as const)[i]) : 'listening',
        mondaiType: i < 3 ? 'kanji_reading' : 'quick_response',
        origin: 'self_authored',
      });
      await client.db.insert(schema.examItems).values({
        id: generateUuidV7(),
        examId: failTotalExamId,
        sectionId: i < 3 ? ftSec1Id : ftSec2Id,
        orderIndex: i,
        questionId: qId,
      });
    }

    await client.db.insert(schema.examAnswerKeys).values({
      examId: failTotalExamId,
      version: 1,
      keys: [1, 4, 2, 1, 2, 3],
      skills: ['kanji', 'grammar', 'reading', 'listening', 'listening', 'listening'],
      mondaiTypes: ['kanji_reading', 'sentence_composition', 'comprehension_short', 'quick_response', 'task_based_comprehension', 'point_comprehension'],
      sectionRanges: [[0, 2], [3, 5]],
    });

    // Boot Nest App
    const moduleRef = await NestFactory.create<NestFastifyApplication>(
      TestN5ScoringAppModule,
      new FastifyAdapter(),
      { logger: ['error', 'warn'] },
    );
    app = moduleRef;
    app.setGlobalPrefix('api/v1');
    scoringService = app.get(ScoringService);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. ĐỖ (PASSED): Vượt ngưỡng tổng (180 >= 80) và vượt điểm sàn mọi phần (120 >= 38, 60 >= 19)', async () => {
    // 1. Create Attempt
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { examId, mode: 'real' },
    });
    expect(createRes.statusCode).toBe(201);
    const { attemptId, lease } = JSON.parse(createRes.payload);

    // 2. Start section
    await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/sections/next`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { lease },
    });

    // 3. Submit perfect answers: [1, 4, 2, 1] with per-question pacing timeSpentMs
    const timeSpentMs = [14500, 21200, 28000, 16300];
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/submit`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: {
        lease,
        seq: 1,
        answers: [1, 4, 2, 1],
        flags: [0, 0, 0, 0],
        timeSpentMs,
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitData = JSON.parse(submitRes.payload);
    const scoring = submitData.result.scoring;

    // Verify Pass / Fail & Scores matching P01
    expect(scoring.passEstimate).toBe(true);
    expect(scoring.reason).toBe('PASSED');
    expect(scoring.total).toBe(180);
    expect(scoring.totalPass).toBe(80);
    expect(scoring.failedSections).toEqual([]);
    expect(scoring.isEstimated).toBe(true);
    expect(scoring.label).toBe('ước lượng');
    expect(scoring.disclaimer).toContain('Linear Reference Scaling');

    // Section 1: language_reading
    const sec1 = scoring.sections.find((s: ScoredSectionItem) => s.code === 'language_reading');
    expect(sec1).toBeDefined();
    expect(sec1.raw).toBe(3);
    expect(sec1.rawMax).toBe(3);
    expect(sec1.scaled).toBe(120);
    expect(sec1.minPass).toBe(38);
    expect(sec1.passed).toBe(true);
    expect(sec1.margin).toBe(82); // 120 - 38 = +82

    // Section 2: listening
    const sec2 = scoring.sections.find((s: ScoredSectionItem) => s.code === 'listening');
    expect(sec2).toBeDefined();
    expect(sec2.raw).toBe(1);
    expect(sec2.rawMax).toBe(1);
    expect(sec2.scaled).toBe(60);
    expect(sec2.minPass).toBe(19);
    expect(sec2.passed).toBe(true);
    expect(sec2.margin).toBe(41); // 60 - 19 = +41

    // 4. Verify pacing timeSpentMs persisted in DB
    const client = await getOrCreateDbClient();
    const [sheet] = await client.db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
    expect(sheet?.timeSpentMs).toEqual(timeSpentMs);

    // 5. Verify GET /api/v1/attempts/:id returns timeSpentMs
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${attemptId}`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(detailRes.statusCode).toBe(200);
    const detailData = JSON.parse(detailRes.payload);
    expect(detailData.result.timeSpentMs).toEqual(timeSpentMs);

    // 6. Verify GET /api/v1/attempts/:id/review returns timeSpentMs
    const reviewRes = await app.inject({
      method: 'GET',
      url: `/api/v1/attempts/${attemptId}/review`,
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(reviewRes.statusCode).toBe(200);
    const reviewData = JSON.parse(reviewRes.payload);
    expect(reviewData.result.timeSpentMs).toEqual(timeSpentMs);

    // 7. Verify GET /api/v1/me/attempts history returns sections, failedSections, isEstimated, label
    const historyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/attempts',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(historyRes.statusCode).toBe(200);
    const historyData = JSON.parse(historyRes.payload);
    const myAttempt = historyData.items.find((it: AttemptHistoryRecord) => it.id === attemptId);
    expect(myAttempt).toBeDefined();
    expect(myAttempt.score).toBe(180);
    expect(myAttempt.passed).toBe(true);
    expect(myAttempt.failedSections).toEqual([]);
    expect(myAttempt.isEstimated).toBe(true);
    expect(myAttempt.label).toBe('ước lượng');
    expect(myAttempt.sections).toHaveLength(2);
  });

  it('2. TRƯỢT DO ĐIỂM SÀN (FAILED_SECTION_FLOOR): Tổng điểm 120 >= 80 nhưng Nghe hiểu 0 < 19', async () => {
    // Answers: [1, 4, 2, 2] -> 3 language_reading correct (120/120), listening wrong (0/60)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { examId, mode: 'real' },
    });
    const { attemptId, lease } = JSON.parse(createRes.payload);

    await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/sections/next`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { lease },
    });

    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/submit`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: {
        lease,
        seq: 1,
        answers: [1, 4, 2, 2], // Last answer wrong!
        flags: [0, 0, 0, 0],
        timeSpentMs: [10000, 10000, 10000, 10000],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitData = JSON.parse(submitRes.payload);
    const scoring = submitData.result.scoring;

    // Must be FAILED_SECTION_FLOOR because total (120) >= totalPass (80), but listening (0) < minPass (19)
    expect(scoring.total).toBe(120);
    expect(scoring.passEstimate).toBe(false);
    expect(scoring.reason).toBe('FAILED_SECTION_FLOOR');
    expect(scoring.failedSections).toEqual(['listening']);

    const listeningSec = scoring.sections.find((s: ScoredSectionItem) => s.code === 'listening');
    expect(listeningSec.scaled).toBe(0);
    expect(listeningSec.minPass).toBe(19);
    expect(listeningSec.passed).toBe(false);
    expect(listeningSec.margin).toBe(-19); // 0 - 19 = -19

    const langSec = scoring.sections.find((s: ScoredSectionItem) => s.code === 'language_reading');
    expect(langSec.scaled).toBe(120);
    expect(langSec.passed).toBe(true);
    expect(langSec.margin).toBe(82);

    // Verify history endpoint also reflects failedSections
    const historyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/attempts',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    const historyData = JSON.parse(historyRes.payload);
    const myAttempt = historyData.items.find((it: AttemptHistoryRecord) => it.id === attemptId);
    expect(myAttempt.passed).toBe(false);
    expect(myAttempt.failedSections).toEqual(['listening']);
  });

  it('3. TRƯỢT DO CẢ TỔNG VÀ SÀN (FAILED_TOTAL_AND_SECTION): Tất cả các câu đều sai', async () => {
    // Answers: [2, 1, 1, 2] -> All wrong
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { examId, mode: 'real' },
    });
    const { attemptId, lease } = JSON.parse(createRes.payload);

    await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/sections/next`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { lease },
    });

    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/submit`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: {
        lease,
        seq: 1,
        answers: [2, 1, 1, 2],
        flags: [0, 0, 0, 0],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitData = JSON.parse(submitRes.payload);
    const scoring = submitData.result.scoring;

    expect(scoring.total).toBe(0);
    expect(scoring.passEstimate).toBe(false);
    expect(scoring.reason).toBe('FAILED_TOTAL_AND_SECTION');
    expect(scoring.failedSections).toContain('language_reading');
    expect(scoring.failedSections).toContain('listening');
  });

  it('4. TRƯỢT DO TỔNG ĐIỂM (FAILED_TOTAL_SCORE): Các phần đạt điểm sàn nhưng tổng < 80', async () => {
    // 1. Create Attempt for failTotalExamId
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/attempts',
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { examId: failTotalExamId, mode: 'real' },
    });
    expect(createRes.statusCode).toBe(201);
    const { attemptId, lease } = JSON.parse(createRes.payload);

    await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/sections/next`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: { lease },
    });

    // 2. Submit answers: [1, 0, 0, 1, 0, 0]
    // Q0 correct (kanji: raw 1/3 -> scaled 40 >= 38 floor)
    // Q3 correct (listening: raw 1/3 -> scaled 20 >= 19 floor)
    // Total = 40 + 20 = 60 < 80
    const submitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/attempts/${attemptId}/submit`,
      headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/json' },
      payload: {
        lease,
        seq: 1,
        answers: [1, 0, 0, 1, 0, 0],
        flags: [0, 0, 0, 0, 0, 0],
      },
    });

    expect(submitRes.statusCode).toBe(200);
    const submitData = JSON.parse(submitRes.payload);
    const scoring = submitData.result.scoring;

    // Must be FAILED_TOTAL_SCORE because sections pass minPass (40 >= 38, 20 >= 19) but total 60 < 80
    expect(scoring.total).toBe(60);
    expect(scoring.total).toBeLessThan(80);
    expect(scoring.passEstimate).toBe(false);
    expect(scoring.reason).toBe('FAILED_TOTAL_SCORE');
    expect(scoring.failedSections).toEqual([]);

    const sec1 = scoring.sections.find((s: ScoredSectionItem) => s.code === 'language_reading');
    expect(sec1).toBeDefined();
    expect(sec1.scaled).toBe(40);
    expect(sec1.minPass).toBe(38);
    expect(sec1.passed).toBe(true);
    expect(sec1.margin).toBe(2); // 40 - 38 = +2

    const sec2 = scoring.sections.find((s: ScoredSectionItem) => s.code === 'listening');
    expect(sec2).toBeDefined();
    expect(sec2.scaled).toBe(20);
    expect(sec2.minPass).toBe(19);
    expect(sec2.passed).toBe(true);
    expect(sec2.margin).toBe(1); // 20 - 19 = +1

    // Verify GET /api/v1/me/attempts reflects failed status with no failed individual sections
    const historyRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me/attempts',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(historyRes.statusCode).toBe(200);
    const historyData = JSON.parse(historyRes.payload);
    const myAttempt = historyData.items.find((it: AttemptHistoryRecord) => it.id === attemptId);
    expect(myAttempt).toBeDefined();
    expect(myAttempt.score).toBe(60);
    expect(myAttempt.passed).toBe(false);
    expect(myAttempt.failedSections).toEqual([]);

    // Direct scoring service evaluation also proves FAILED_TOTAL_SCORE pure logic
    const directResult = await scoringService.scoreAttempt(failTotalExamId, 1, [1, 0, 0, 1, 0, 0]);
    expect(directResult.scoring.total).toBe(60);
    expect(directResult.scoring.total).toBeLessThan(80);
    expect(directResult.scoring.passEstimate).toBe(false);
    expect((directResult.scoring as Record<string, unknown>)['reason']).toBe('FAILED_TOTAL_SCORE');
    expect(directResult.scoring.failedSections).toEqual([]);
  });
});
