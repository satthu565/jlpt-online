import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
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
import { AttemptModule } from '../attempt/attempt.module.js';
import { ExamModule } from './exam.module.js';
import { LicenseModule } from '../license/license.module.js';
import { QuestionBankModule } from '../question-bank/question-bank.module.js';
import { ReviewModule } from '../review/review.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { QuestionBankService } from '../question-bank/question-bank.service.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { FORBIDDEN_ANSWER_FIELDS } from '@jlpt/schema';

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
    LicenseModule,
    QuestionBankModule,
    ReviewModule,
    NotificationModule,
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
class TestPracticeAppModule {}

describe('L02 Practice & Mix API, Scope and Usage Tracking', () => {
  let app: NestFastifyApplication;
  let qbService: QuestionBankService;
  let studentId: string;
  let studentToken: string;
  let otherStudentId: string;
  let otherStudentToken: string;
  let adminId: string;
  let adminToken: string;

  let sourceId: string;
  let validLicenseId: string;
  let restrictedLicenseId: string;
  let questionGroup1Id: string;
  let questionGroup2Id: string;
  let question1Id: string;
  let question2Id: string;
  let question3Id: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Users
    studentId = generateUuidV7();
    studentToken = 'tok_student_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentId,
      email: `student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    otherStudentId = generateUuidV7();
    otherStudentToken = 'tok_other_' + Date.now();
    await client.db.insert(schema.users).values({
      id: otherStudentId,
      email: `other_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: otherStudentId,
      token: otherStudentToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    adminId = generateUuidV7();
    adminToken = 'tok_admin_' + Date.now();
    await client.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
      emailVerified: true,
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Create Source & Licenses
    sourceId = generateUuidV7();
    await client.db.insert(schema.examSources).values({
      id: sourceId,
      slug: `src-practice-${Date.now()}`,
      name: 'Nguồn Đề Luyện Thi',
      provenance: 'self_authored',
      metadata: {},
    });

    // Valid license with display and remix allowed
    validLicenseId = generateUuidV7();
    await client.db.insert(schema.contentLicenses).values({
      id: validLicenseId,
      sourceId,
      licenseType: 'open_educational',
      effectiveFrom: new Date('2026-01-01'),
      expiresAt: new Date('2030-01-01'),
      terms: JSON.stringify({
        rights: {
          displayAllowed: true,
          remixAllowed: true,
          transcriptAllowed: true,
        },
      }),
    });

    // Restricted license where remixAllowed = false
    restrictedLicenseId = generateUuidV7();
    await client.db.insert(schema.contentLicenses).values({
      id: restrictedLicenseId,
      sourceId,
      licenseType: 'restricted_view_only',
      effectiveFrom: new Date('2026-01-01'),
      expiresAt: new Date('2030-01-01'),
      terms: JSON.stringify({
        rights: {
          displayAllowed: true,
          remixAllowed: false,
          transcriptAllowed: false,
        },
      }),
    });

    // 3. Create Question Groups & Questions (Level N5)
    questionGroup1Id = generateUuidV7();
    await client.db.insert(schema.questionGroups).values({
      id: questionGroup1Id,
      level: 'N5',
      sectionCode: 'language_vocab',
      title: 'Nhóm từ vựng 1',
      sourceId,
      licenseId: validLicenseId,
    });
    await client.db.insert(schema.questionGroupVersions).values({
      groupId: questionGroup1Id,
      version: 1,
      status: 'approved',
      passage: { blocks: [{ type: 'paragraph', text: 'Chọn cách đọc đúng' }] },
    });

    // Question 1
    question1Id = generateUuidV7();
    await client.db.insert(schema.questions).values({
      id: question1Id,
      groupId: questionGroup1Id,
      level: 'N5',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      origin: 'self_authored',
    });
    await client.db.insert(schema.questionVersions).values({
      questionId: question1Id,
      version: 1,
      status: 'approved',
      stem: { blocks: [{ type: 'paragraph', text: 'あした (明日)' }] },
    });
    await client.db.insert(schema.answerOptions).values([
      { questionId: question1Id, questionVersion: 1, orderIndex: 1, content: { blocks: [{ type: 'paragraph', text: 'ashite' }] } },
      { questionId: question1Id, questionVersion: 1, orderIndex: 2, content: { blocks: [{ type: 'paragraph', text: 'ashita' }] } },
      { questionId: question1Id, questionVersion: 1, orderIndex: 3, content: { blocks: [{ type: 'paragraph', text: 'ashitaa' }] } },
      { questionId: question1Id, questionVersion: 1, orderIndex: 4, content: { blocks: [{ type: 'paragraph', text: 'ashitae' }] } },
    ]);
    await client.db.insert(schema.correctAnswers).values({
      questionId: question1Id,
      questionVersion: 1,
      correctOption: 2,
    });

    // Question 2
    question2Id = generateUuidV7();
    await client.db.insert(schema.questions).values({
      id: question2Id,
      groupId: questionGroup1Id,
      level: 'N5',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      origin: 'self_authored',
    });
    await client.db.insert(schema.questionVersions).values({
      questionId: question2Id,
      version: 1,
      status: 'approved',
      stem: { blocks: [{ type: 'paragraph', text: 'きょう (今日)' }] },
    });
    await client.db.insert(schema.answerOptions).values([
      { questionId: question2Id, questionVersion: 1, orderIndex: 1, content: { blocks: [{ type: 'paragraph', text: 'kyou' }] } },
      { questionId: question2Id, questionVersion: 1, orderIndex: 2, content: { blocks: [{ type: 'paragraph', text: 'kinou' }] } },
      { questionId: question2Id, questionVersion: 1, orderIndex: 3, content: { blocks: [{ type: 'paragraph', text: 'ashita' }] } },
      { questionId: question2Id, questionVersion: 1, orderIndex: 4, content: { blocks: [{ type: 'paragraph', text: 'asatte' }] } },
    ]);
    await client.db.insert(schema.correctAnswers).values({
      questionId: question2Id,
      questionVersion: 1,
      correctOption: 1,
    });

    // Question Group 2 (Restricted License)
    questionGroup2Id = generateUuidV7();
    await client.db.insert(schema.questionGroups).values({
      id: questionGroup2Id,
      level: 'N5',
      sectionCode: 'language_vocab',
      title: 'Nhóm ngữ pháp hạn chế',
      sourceId,
      licenseId: restrictedLicenseId,
    });
    await client.db.insert(schema.questionGroupVersions).values({
      groupId: questionGroup2Id,
      version: 1,
      status: 'approved',
      passage: { blocks: [{ type: 'paragraph', text: 'Chọn trợ từ thích hợp' }] },
    });

    // Question 3
    question3Id = generateUuidV7();
    await client.db.insert(schema.questions).values({
      id: question3Id,
      groupId: questionGroup2Id,
      level: 'N5',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      origin: 'self_authored',
    });
    await client.db.insert(schema.questionVersions).values({
      questionId: question3Id,
      version: 1,
      status: 'approved',
      stem: { blocks: [{ type: 'paragraph', text: 'わたし___たなかです。' }] },
    });
    await client.db.insert(schema.answerOptions).values([
      { questionId: question3Id, questionVersion: 1, orderIndex: 1, content: { blocks: [{ type: 'paragraph', text: 'は' }] } },
      { questionId: question3Id, questionVersion: 1, orderIndex: 2, content: { blocks: [{ type: 'paragraph', text: 'が' }] } },
      { questionId: question3Id, questionVersion: 1, orderIndex: 3, content: { blocks: [{ type: 'paragraph', text: 'を' }] } },
      { questionId: question3Id, questionVersion: 1, orderIndex: 4, content: { blocks: [{ type: 'paragraph', text: 'に' }] } },
    ]);
    await client.db.insert(schema.correctAnswers).values({
      questionId: question3Id,
      questionVersion: 1,
      correctOption: 1,
    });

    // 4. Initialize Nest App
    const moduleRef = await NestFactory.create<NestFastifyApplication>(
      TestPracticeAppModule,
      new FastifyAdapter(),
    );
    app = moduleRef;
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    qbService = app.get(QuestionBankService);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ===========================================================================
  // Acceptance 1: Check chỉ trả câu đã trả lời ở practice; không mở answer key thi thật
  // ===========================================================================
  describe('Acceptance 1: Check Answer Security (PRA-10)', () => {
    let practiceAttemptId: string;
    let practiceLease: string;
    let realAttemptId: string;
    let realLease: string;
    let examId: string;

    beforeAll(async () => {
      const client = await getOrCreateDbClient();
      examId = generateUuidV7();

      // Create a test practice exam
      await client.db.insert(schema.exams).values({
        id: examId,
        slug: `test-exam-${Date.now()}`,
        title: 'Đề kiểm tra an toàn đáp án',
        level: 'N5',
        kind: 'practice',
        year: 2026,
        session: '7',
        totalQuestions: 2,
        publishedVersion: 1,
      });
      const bpId = generateUuidV7();
      await client.db.insert(schema.blueprints).values({
        id: bpId,
        level: 'N5',
        version: 1,
        kind: 'synthetic',
        status: 'active',
        isOfficial: false,
        isConfirmed: true,
        effectiveFrom: '2026-10',
        sourceRef: [{ provider: 'self', label: 'JLPT Synthetic' }],
        sections: [],
        scoring: { sections: [], totalMax: 60, passingTotal: 19 },
      });
      await client.db.insert(schema.examVersions).values({
        examId,
        version: 1,
        snapshotKey: `exams/${examId}/v1/snapshot.json`,
        manifestKey: `exams/${examId}/v1/manifest.json`,
        blueprintId: bpId,
        blueprintVersion: 1,
        scoring: { sections: [{ code: 's1', title: 'S1', maxScaled: 60, weight: 1 }] },
        totalQuestions: 2,
        publishedAt: new Date(),
        publishedBy: adminId,
      });
      const secId = generateUuidV7();
      await client.db.insert(schema.examSections).values({
        id: secId,
        examId,
        code: 's1',
        title: 'Section 1',
        durationSec: 1800,
        orderIndex: 0,
      });
      await client.db.insert(schema.examItems).values([
        { id: generateUuidV7(), examId, sectionId: secId, questionId: question1Id, orderIndex: 0, itemWeight: 1 },
        { id: generateUuidV7(), examId, sectionId: secId, questionId: question2Id, orderIndex: 1, itemWeight: 1 },
      ]);
      await client.db.insert(schema.examAnswerKeys).values({
        examId,
        version: 1,
        keys: [2, 1], // Q0 correct is 2, Q1 correct is 1
        skills: ['vocabulary', 'grammar'],
        mondaiTypes: ['kanji_reading', 'orthography'],
        sectionRanges: [[0, 1]],
      });

      // Start Practice Attempt
      const startPracticeRes = await app.inject({
        method: 'POST',
        url: '/attempts',
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { examId, mode: 'practice' },
      });
      expect(startPracticeRes.statusCode).toBe(201);
      const practiceBody = JSON.parse(startPracticeRes.body);
      practiceAttemptId = practiceBody.attemptId;
      practiceLease = practiceBody.lease;

      // Start Real Attempt
      const startRealRes = await app.inject({
        method: 'POST',
        url: '/attempts',
        headers: { authorization: `Bearer ${otherStudentToken}` },
        payload: { examId, mode: 'real' },
      });
      expect(startRealRes.statusCode).toBe(201);
      const realBody = JSON.parse(startRealRes.body);
      realAttemptId = realBody.attemptId;
      realLease = realBody.lease;
    });

    it('từ chối 403 FORBIDDEN khi gọi checkAnswer trong chế độ thi thật (mode = real)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/attempts/${realAttemptId}/check`,
        headers: { authorization: `Bearer ${otherStudentToken}` },
        payload: { lease: realLease, index: 0 },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error?.code ?? body.code).toBe('FORBIDDEN');
    });

    it('từ chối 422 QUESTION_UNANSWERED khi gọi check câu chưa chọn đáp án trong practice', async () => {
      // Advance to section 0
      await app.inject({
        method: 'POST',
        url: `/attempts/${practiceAttemptId}/sections/next`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { lease: practiceLease },
      });

      // Sheet currently has answers [0, 0]. Calling check for index 0 should fail
      const res = await app.inject({
        method: 'POST',
        url: `/attempts/${practiceAttemptId}/check`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { lease: practiceLease, index: 0 },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.error?.code ?? body.code).toBe('QUESTION_UNANSWERED');
    });

    it('trả về 200 và kết quả đúng/sai CHỈ cho câu đã trả lời, không lộ đáp án câu khác', async () => {
      // User answers Q0 with option 2 (correct)
      await app.inject({
        method: 'PUT',
        url: `/attempts/${practiceAttemptId}/sheet`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          lease: practiceLease,
          seq: 1,
          answers: [2, 0],
          flags: [0, 0],
          changes: [{ i: 0, v: 2, at: Date.now() }],
        },
      });

      // Check Q0
      const res = await app.inject({
        method: 'POST',
        url: `/attempts/${practiceAttemptId}/check`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { lease: practiceLease, index: 0 },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.index).toBe(0);
      expect(body.correct).toBe(true);

      // Verify no forbidden keys are leaked
      for (const field of FORBIDDEN_ANSWER_FIELDS.filter((f) => f !== 'correct' && f !== 'explanation')) {
        expect(body[field]).toBeUndefined();
      }
      expect(body.keys).toBeUndefined();
      expect(body.answers).toBeUndefined();

      // Q1 is still unanswered [2, 0], checking Q1 must still throw 422
      const resQ1 = await app.inject({
        method: 'POST',
        url: `/attempts/${practiceAttemptId}/check`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { lease: practiceLease, index: 1 },
      });
      expect(resQ1.statusCode).toBe(422);
    });
  });

  // ===========================================================================
  // Acceptance 2: Chia sẻ đề không vượt license và owner scope
  // ===========================================================================
  describe('Acceptance 2: Sharing Scope & License Enforcement (MIX-17)', () => {
    let validGenExamId: string;
    let restrictedGenExamId: string;

    beforeAll(async () => {
      const client = await getOrCreateDbClient();

      // 1. Create a generated exam owned by student containing only valid licensed questions
      validGenExamId = generateUuidV7();
      await client.db.insert(schema.generatedExams).values({
        id: validGenExamId,
        ownerId: studentId,
        configJson: {
          level: 'N5',
          mode: 'Random',
          sourceSessions: [],
          sourceWeights: {},
          skills: ['kanji', 'vocabulary'],
          mondaiTypes: ['kanji_reading', 'contextual'],
          blueprintVersion: 1,
        },
        seed: '123456',
        engineVersion: '1.0.0',
        selectionHash: 'hash-valid-1',
      });
      await client.db.insert(schema.generatedExamItems).values([
        { generatedExamId: validGenExamId, questionId: question1Id, orderIndex: 0 },
        { generatedExamId: validGenExamId, questionId: question2Id, orderIndex: 1 },
      ]);

      // 2. Create a generated exam owned by student containing question with RESTRICTED license (remixAllowed = false)
      restrictedGenExamId = generateUuidV7();
      await client.db.insert(schema.generatedExams).values({
        id: restrictedGenExamId,
        ownerId: studentId,
        configJson: {
          level: 'N5',
          mode: 'Random',
          sourceSessions: [],
          sourceWeights: {},
          skills: ['kanji', 'vocabulary'],
          mondaiTypes: ['kanji_reading', 'contextual'],
          blueprintVersion: 1,
        },
        seed: '999999',
        engineVersion: '1.0.0',
        selectionHash: 'hash-restricted-1',
      });
      await client.db.insert(schema.generatedExamItems).values([
        { generatedExamId: restrictedGenExamId, questionId: question3Id, orderIndex: 0 },
      ]);
    });

    it('từ chối 403 FORBIDDEN khi người dùng không phải chủ sở hữu cố gắng tạo liên kết chia sẻ', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/generated-exams/${validGenExamId}/shares`,
        headers: { authorization: `Bearer ${otherStudentToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error?.code ?? body.code).toBe('FORBIDDEN');
    });

    it('từ chối 403 LICENSE_RESTRICTION khi đề thi chứa câu hỏi có giấy phép cấm chia sẻ/phối trộn', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/generated-exams/${restrictedGenExamId}/shares`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error?.code ?? body.code).toBe('LICENSE_RESTRICTION');
    });

    it('cho phép chủ sở hữu tạo liên kết chia sẻ đề thi khi giấy phép hợp lệ', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/generated-exams/${validGenExamId}/shares`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: {
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.token).toBeDefined();
      expect(body.shareUrl).toBe(`/shared-exams/${body.token}`);
      expect(body.expiresAt).toBeDefined();

      // Access shared exam publicly
      const publicRes = await app.inject({
        method: 'GET',
        url: `/shared-exams/${body.token}`,
      });

      expect(publicRes.statusCode).toBe(200);
      const publicBody = JSON.parse(publicRes.body);
      expect(publicBody.id).toBe(validGenExamId);
      expect(publicBody.totalQuestions).toBe(2);

      // Verify strictly NO answer key in public metadata
      for (const field of FORBIDDEN_ANSWER_FIELDS) {
        expect(publicBody[field]).toBeUndefined();
      }
    });

    it('từ chối 404 khi truy cập liên kết chia sẻ đã hết hạn', async () => {
      const client = await getOrCreateDbClient();
      const expiredShareId = generateUuidV7();
      const expiredToken = 'expired_tok_' + Date.now();
      const tokenHash = (await import('node:crypto')).createHash('sha256').update(expiredToken).digest('hex');

      await client.db.insert(schema.examShares).values({
        id: expiredShareId,
        ownerId: studentId,
        resourceType: 'generated_exam',
        resourceId: validGenExamId,
        tokenHash,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        createdAt: new Date(Date.now() - 7200000),
      });

      const res = await app.inject({
        method: 'GET',
        url: `/shared-exams/${expiredToken}`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error?.code ?? body.code).toBe('SHARE_EXPIRED');
    });
  });

  // ===========================================================================
  // Acceptance 4: Qbank tracks generated-exam usage (QB-18)
  // ===========================================================================
  describe('Acceptance 4: Qbank Tracks Generated-Exam Usage (QB-18)', () => {
    let trackedGenExamId: string;

    beforeAll(async () => {
      const client = await getOrCreateDbClient();
      trackedGenExamId = generateUuidV7();

      await client.db.insert(schema.generatedExams).values({
        id: trackedGenExamId,
        ownerId: studentId,
        configJson: {
          level: 'N5',
          pool: 'random',
          skills: ['kanji', 'vocabulary'],
          mondaiTypes: ['kanji_reading', 'contextual'],
          questionCount: 10,
        },
        seed: '888888',
        engineVersion: '1.0.0',
        selectionHash: 'hash-track-1',
      });

      await client.db.insert(schema.generatedExamItems).values([
        { generatedExamId: trackedGenExamId, questionId: question1Id, orderIndex: 0 },
      ]);
    });

    it('ngân hàng câu hỏi theo dõi chính xác các đề trộn chứa câu hỏi (QB-18)', async () => {
      const usage = await qbService.getQuestionExamUsage(question1Id);

      expect(usage.questionId).toBe(question1Id);
      expect(usage.usageCount).toBeGreaterThanOrEqual(1);
      expect(
        usage.appearances.some(
          (a: { generatedExamId: string; seed: string; engineVersion: string; ownerId: string; createdAt: string }) =>
            a.generatedExamId === trackedGenExamId,
        ),
      ).toBe(true);

      const item = usage.appearances.find(
        (a: { generatedExamId: string; seed: string; engineVersion: string; ownerId: string; createdAt: string }) =>
          a.generatedExamId === trackedGenExamId,
      )!;
      expect(item.seed).toBe('888888');
      expect(item.engineVersion).toBe('1.0.0');
      expect(item.ownerId).toBe(studentId);
    });

    it('endpoint admin trả về danh sách đề đã sử dụng câu hỏi', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/admin/questions/${question1Id}/exam-usage`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.usageCount).toBeGreaterThanOrEqual(1);
      expect(body.appearances.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Additional Features: PRA-13, PRA-17, MIX-13..15
  // ===========================================================================
  describe('Practice & Mix Enhancements (PRA-13, PRA-17, MIX-13..15)', () => {
    it('PRA-13: Đánh dấu và bỏ đánh dấu câu hỏi (question-marks)', async () => {
      // Mark question
      const putRes = await app.inject({
        method: 'PUT',
        url: `/me/question-marks/${question1Id}`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { markType: 'review' },
      });
      expect(putRes.statusCode).toBe(200);
      expect(JSON.parse(putRes.body).marked).toBe(true);

      // List marks
      const listRes = await app.inject({
        method: 'GET',
        url: '/me/question-marks',
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const marks = JSON.parse(listRes.body).items;
      expect(marks.some((m: { questionId: string }) => m.questionId === question1Id)).toBe(true);

      // Unmark question
      const delRes = await app.inject({
        method: 'DELETE',
        url: `/me/question-marks/${question1Id}`,
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(delRes.statusCode).toBe(200);
    });

    it('MIX-15: Tạo đề trộn mới nhanh chỉ bằng một nút (quick mix)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/mixed-exams/quick',
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { level: 'N5' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.examId).toBeDefined();
      expect(body.seed).toBeDefined();
    });

    it('MIX-13 & MIX-14: Liệt kê đề đã tạo và làm lại đề trộn trước đó (regenerate)', async () => {
      // List generated exams
      const listRes = await app.inject({
        method: 'GET',
        url: '/generated-exams',
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const items = JSON.parse(listRes.body).items;
      expect(items.length).toBeGreaterThanOrEqual(1);

      const targetId = items[0].id;

      // Detail
      const detailRes = await app.inject({
        method: 'GET',
        url: `/generated-exams/${targetId}`,
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(detailRes.statusCode).toBe(200);

      // Regenerate with new seed
      const regenRes = await app.inject({
        method: 'POST',
        url: `/generated-exams/${targetId}/regenerate`,
        headers: { authorization: `Bearer ${studentToken}` },
        payload: { newSeed: 777777 },
      });
      expect(regenRes.statusCode).toBe(201);
      const regenBody = JSON.parse(regenRes.body);
      expect(regenBody.id).toBeDefined();
      expect(regenBody.seed).toBe(777777);
    });

    it('Yêu thích đề thi: favorite/unfavorite', async () => {
      const testExamId = generateUuidV7();
      const client = await getOrCreateDbClient();
      await client.db.insert(schema.exams).values({
        id: testExamId,
        slug: `fav-exam-${Date.now()}`,
        title: 'Đề yêu thích',
        level: 'N5',
        kind: 'practice',
        year: 2026,
        session: '7',
        totalQuestions: 1,
        publishedVersion: 1,
      });

      // Favorite
      const favRes = await app.inject({
        method: 'PUT',
        url: `/me/favorite-exams/${testExamId}`,
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(favRes.statusCode).toBe(200);

      // List favorites
      const listRes = await app.inject({
        method: 'GET',
        url: '/me/favorite-exams',
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(listRes.statusCode).toBe(200);
      const favs = JSON.parse(listRes.body).items;
      expect(favs.some((f: { examId: string }) => f.examId === testExamId)).toBe(true);

      // Unfavorite
      const unfavRes = await app.inject({
        method: 'DELETE',
        url: `/me/favorite-exams/${testExamId}`,
        headers: { authorization: `Bearer ${studentToken}` },
      });
      expect(unfavRes.statusCode).toBe(200);
    });
  });
});
