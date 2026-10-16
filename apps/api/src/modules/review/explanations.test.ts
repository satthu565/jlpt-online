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
import { ExamModule } from '../exam/exam.module.js';
import { LicenseModule } from '../license/license.module.js';
import { QuestionBankModule } from '../question-bank/question-bank.module.js';
import { ReviewModule } from './review.module.js';
import { NotificationModule } from '../notification/notification.module.js';
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
class TestReviewAppModule {}

describe('L02 Explanations, Audio Transcript Licensing & Moderation (EXPL-01..13, AUDIO-08..09, QB-08)', () => {
  let app: NestFastifyApplication;

  let authorId: string;
  let authorToken: string;
  let reviewerId: string;
  let reviewerToken: string;
  let learnerId: string;
  let learnerToken: string;

  let questionWithAudioId: string;
  let questionRestrictedAudioId: string;
  let examId: string;
  let practiceAttemptId: string;
  let practiceLease: string;

  beforeAll(async () => {
    const client = await getOrCreateDbClient();

    // 1. Create Users (Author, Reviewer, Learner)
    authorId = generateUuidV7();
    authorToken = 'tok_author_' + Date.now();
    await client.db.insert(schema.users).values({
      id: authorId,
      email: `author_${Date.now()}@example.com`,
      role: 'editor',
      emailVerified: true,
      locale: 'vi',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: authorId,
      token: authorToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    reviewerId = generateUuidV7();
    reviewerToken = 'tok_reviewer_' + Date.now();
    await client.db.insert(schema.users).values({
      id: reviewerId,
      email: `reviewer_${Date.now()}@example.com`,
      role: 'reviewer',
      emailVerified: true,
      locale: 'vi',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: reviewerId,
      token: reviewerToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    learnerId = generateUuidV7();
    learnerToken = 'tok_learner_' + Date.now();
    await client.db.insert(schema.users).values({
      id: learnerId,
      email: `learner_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
      locale: 'vi',
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: learnerId,
      token: learnerToken,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 2. Create Sources & Licenses
    const srcId = generateUuidV7();
    await client.db.insert(schema.examSources).values({
      id: srcId,
      slug: `src-audio-${Date.now()}`,
      name: 'Nguồn bài nghe JLPT',
      provenance: 'self_authored',
      metadata: {},
    });

    // License A: Allows transcript
    const licAudioAllowedId = generateUuidV7();
    await client.db.insert(schema.contentLicenses).values({
      id: licAudioAllowedId,
      sourceId: srcId,
      licenseType: 'open_audio',
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

    // License B: Prohibits transcript
    const licAudioRestrictedId = generateUuidV7();
    await client.db.insert(schema.contentLicenses).values({
      id: licAudioRestrictedId,
      sourceId: srcId,
      licenseType: 'restricted_audio',
      effectiveFrom: new Date('2026-01-01'),
      expiresAt: new Date('2030-01-01'),
      terms: JSON.stringify({
        rights: {
          displayAllowed: true,
          remixAllowed: true,
          transcriptAllowed: false, // Transcript forbidden
        },
      }),
    });

    // 3. Create Question Groups & Questions
    const groupAllowedId = generateUuidV7();
    await client.db.insert(schema.questionGroups).values({
      id: groupAllowedId,
      level: 'N4',
      sectionCode: 'listening',
      title: 'Bài nghe có transcript',
      sourceId: srcId,
      licenseId: licAudioAllowedId,
      audioSha256: 'sha256-audio-allowed',
    });
    await client.db.insert(schema.questionGroupVersions).values({
      groupId: groupAllowedId,
      version: 1,
      status: 'approved',
      passage: { blocks: [{ type: 'paragraph', text: 'Nghe đoạn hội thoại' }] },
    });

    questionWithAudioId = generateUuidV7();
    await client.db.insert(schema.questions).values({
      id: questionWithAudioId,
      groupId: groupAllowedId,
      level: 'N4',
      skill: 'listening',
      mondaiType: 'task_based',
      origin: 'self_authored',
    });
    await client.db.insert(schema.questionVersions).values({
      questionId: questionWithAudioId,
      version: 1,
      status: 'approved',
      stem: { blocks: [{ type: 'paragraph', text: 'Người phụ nữ sẽ làm gì tiếp theo?' }] },
    });
    await client.db.insert(schema.correctAnswers).values({
      questionId: questionWithAudioId,
      questionVersion: 1,
      correctOption: 3,
    });

    // Group with restricted audio
    const groupRestrictedId = generateUuidV7();
    await client.db.insert(schema.questionGroups).values({
      id: groupRestrictedId,
      level: 'N4',
      sectionCode: 'listening',
      title: 'Bài nghe giấu transcript',
      sourceId: srcId,
      licenseId: licAudioRestrictedId,
      audioSha256: 'sha256-audio-restricted',
    });
    await client.db.insert(schema.questionGroupVersions).values({
      groupId: groupRestrictedId,
      version: 1,
      status: 'approved',
      passage: { blocks: [{ type: 'paragraph', text: 'Nghe đoạn hội thoại bí mật' }] },
    });

    questionRestrictedAudioId = generateUuidV7();
    await client.db.insert(schema.questions).values({
      id: questionRestrictedAudioId,
      groupId: groupRestrictedId,
      level: 'N4',
      skill: 'listening',
      mondaiType: 'task_based',
      origin: 'self_authored',
    });
    await client.db.insert(schema.questionVersions).values({
      questionId: questionRestrictedAudioId,
      version: 1,
      status: 'approved',
      stem: { blocks: [{ type: 'paragraph', text: 'Họ sẽ gặp nhau ở đâu?' }] },
    });
    await client.db.insert(schema.correctAnswers).values({
      questionId: questionRestrictedAudioId,
      questionVersion: 1,
      correctOption: 1,
    });

    // 4. Create Backing Exam & Attempt for Learner
    examId = generateUuidV7();
    await client.db.insert(schema.exams).values({
      id: examId,
      slug: `exam-listening-${Date.now()}`,
      title: 'Đề luyện nghe N4',
      level: 'N4',
      kind: 'practice',
      year: 2026,
      session: '7',
      totalQuestions: 2,
      publishedVersion: 1,
    });
    const bpId = generateUuidV7();
    await client.db.insert(schema.blueprints).values({
      id: bpId,
      level: 'N4',
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
      scoring: { sections: [{ code: 'sec_lis', title: 'Listening', maxScaled: 60, weight: 1 }] },
      totalQuestions: 2,
      publishedAt: new Date(),
      publishedBy: reviewerId,
    });
    const secId = generateUuidV7();
    await client.db.insert(schema.examSections).values({
      id: secId,
      examId,
      code: 'sec_lis',
      title: 'Listening Section',
      durationSec: 1800,
      orderIndex: 0,
    });
    await client.db.insert(schema.examItems).values([
      { id: generateUuidV7(), examId, sectionId: secId, questionId: questionWithAudioId, orderIndex: 0, itemWeight: 1 },
      { id: generateUuidV7(), examId, sectionId: secId, questionId: questionRestrictedAudioId, orderIndex: 1, itemWeight: 1 },
    ]);
    await client.db.insert(schema.examAnswerKeys).values({
      examId,
      version: 1,
      keys: [3, 1],
      skills: ['listening', 'listening'],
      mondaiTypes: ['task_based_comprehension', 'point_comprehension'],
      sectionRanges: [[0, 1]],
    });

    // Initialize Nest App
    const moduleRef = await NestFactory.create<NestFastifyApplication>(
      TestReviewAppModule,
      new FastifyAdapter(),
    );
    app = moduleRef;
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Start practice attempt for learner
    const startRes = await app.inject({
      method: 'POST',
      url: '/attempts',
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: { examId, mode: 'practice' },
    });
    const startBody = JSON.parse(startRes.body);
    practiceAttemptId = startBody.attemptId;
    practiceLease = startBody.lease;

    // Advance section & answer Q0
    await app.inject({
      method: 'POST',
      url: `/attempts/${practiceAttemptId}/sections/next`,
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: { lease: practiceLease },
    });
    await app.inject({
      method: 'PUT',
      url: `/attempts/${practiceAttemptId}/sheet`,
      headers: { authorization: `Bearer ${learnerToken}` },
      payload: {
        lease: practiceLease,
        seq: 1,
        answers: [3, 0], // Answered Q0 with 3
        flags: [0, 0],
        changes: [{ i: 0, v: 3, at: Date.now() }],
      },
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ===========================================================================
  // 1. Explanation Draft Creation & Rich Content (QB-08, EXPL-01..09)
  // ===========================================================================
  describe('Explanation Creation & Content (QB-08, EXPL-01..09)', () => {
    let explanationAllowedId: string;
    let explanationRestrictedId: string;

    it('tạo bản nháp giải thích với đầy đủ các trường phong phú (correct, wrong reasons, translation, vocab, grammar, transcript, evidenceRanges)', async () => {
      const draftPayload = {
        questionId: questionWithAudioId,
        contentVersion: 1,
        language: 'vi',
        origin: 'self_authored',
        humanReviewed: false,
        correctReason: [
          {
            t: 'text',
            text: 'Đáp án 3 đúng vì ở cuối đoạn hội thoại, người phụ nữ nói rõ: "じゃあ、先にチケットを買っておきます" (EXPL-01).',
          },
        ],
        wrongReasonsByOption: {
          '1': [{ t: 'text', text: 'Phương án 1 sai vì người đàn ông làm việc đó (EXPL-02).' }],
          '2': [{ t: 'text', text: 'Phương án 2 sai vì hai người đã thống nhất không đi ăn trước (EXPL-02).' }],
          '4': [{ t: 'text', text: 'Phương án 4 sai vì đây là hành động của ngày mai (EXPL-02).' }],
        },
        translation: [
          {
            t: 'text',
            text: 'Dịch câu hỏi: Người phụ nữ sẽ làm gì tiếp theo? (EXPL-03)',
          },
        ],
        vocabTags: ['チケット (vé)', '先 (trước)'], // EXPL-05
        grammarTags: ['〜ておく (chuẩn bị trước)'], // EXPL-06
        transcript: [
          {
            t: 'text',
            text: '男：映画は何時からですか。女：７時です。男：じゃあ、先にチケットを買っておきますね。女：はい、お願いします。',
          },
        ], // EXPL-08
        evidenceRanges: [{ start: 35, end: 55 }], // EXPL-09
      };

      const res = await app.inject({
        method: 'POST',
        url: '/explanations',
        headers: { authorization: `Bearer ${authorToken}` },
        payload: draftPayload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.version).toBe(1);
      expect(body.status).toBe('draft');
      expect(body.questionId).toBe(questionWithAudioId);
      explanationAllowedId = body.id;
    });

    it('tạo bản nháp giải thích cho câu hỏi bài nghe bị hạn chế transcript', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/explanations',
        headers: { authorization: `Bearer ${authorToken}` },
        payload: {
          questionId: questionRestrictedAudioId,
          contentVersion: 1,
          correctReason: [{ t: 'text', text: 'Đáp án 1 đúng' }],
          transcript: [{ t: 'text', text: 'Đoạn transcript tuyệt mật không được lộ' }],
        },
      });

      expect(res.statusCode).toBe(201);
      explanationRestrictedId = JSON.parse(res.body).id;
    });

    // =========================================================================
    // 2. Moderation & Separation of Duties (EXPL-13)
    // =========================================================================
    describe('Moderation & Versioning (EXPL-13)', () => {
      it('từ chối 403 SELF_REVIEW_FORBIDDEN khi tác giả cố tình tự duyệt giải thích của chính mình', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/explanations/${explanationAllowedId}/reviews`,
          headers: { authorization: `Bearer ${authorToken}` }, // Author attempts to review!
          payload: { decision: 'approved', comments: 'Tự duyệt bài của mình' },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.body);
        expect(body.error?.code ?? body.code).toBe('SELF_REVIEW_FORBIDDEN');
      });

      it('người kiểm duyệt khác tác giả (reviewerId != authorId) duyệt thành công giải thích', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/explanations/${explanationAllowedId}/reviews`,
          headers: { authorization: `Bearer ${reviewerToken}` }, // Reviewer approves
          payload: { decision: 'approved', comments: 'Giải thích chi tiết, chính xác' },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.status).toBe('approved');

        // Approve second explanation as well
        await app.inject({
          method: 'POST',
          url: `/explanations/${explanationRestrictedId}/reviews`,
          headers: { authorization: `Bearer ${reviewerToken}` },
          payload: { decision: 'approved' },
        });
      });
    });

    // =========================================================================
    // 3. Audio Transcript Licensing & Synchronization (AUDIO-08, AUDIO-09)
    // =========================================================================
    describe('Audio Transcript Licensing & Timestamps (AUDIO-08, AUDIO-09)', () => {
      it('AUDIO-08 & 09: Trả về transcript và evidenceRanges khi giấy phép cho phép', async () => {
        // Learner views explanation for Q0 (answered question with allowed transcript)
        const res = await app.inject({
          method: 'GET',
          url: `/attempts/${practiceAttemptId}/explanations/0`,
          headers: { authorization: `Bearer ${learnerToken}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.hasExplanation).toBe(true);
        expect(body.correctReason).toBeDefined();
        expect(body.transcript).toBeDefined();
        expect(body.transcript[0].text).toContain('映画は何時からですか');
        expect(body.evidenceRanges).toEqual([{ start: 35, end: 55 }]);
      });

      it('AUDIO-08: Lược bỏ transcript nếu giấy phép cấm hiển thị transcript (transcriptAllowed = false)', async () => {
        // Learner answers Q1 first
        await app.inject({
          method: 'PUT',
          url: `/attempts/${practiceAttemptId}/sheet`,
          headers: { authorization: `Bearer ${learnerToken}` },
          payload: {
            lease: practiceLease,
            seq: 2,
            answers: [3, 1], // Answered Q1
            flags: [0, 0],
            changes: [{ i: 1, v: 1, at: Date.now() }],
          },
        });

        const res = await app.inject({
          method: 'GET',
          url: `/attempts/${practiceAttemptId}/explanations/1`,
          headers: { authorization: `Bearer ${learnerToken}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.hasExplanation).toBe(true);
        expect(body.correctReason).toBeDefined();
        // Transcript MUST BE NULL due to license restriction!
        expect(body.transcript).toBeNull();
      });
    });

    // =========================================================================
    // 4. Content Reports (EXPL-12)
    // =========================================================================
    describe('Content Reports (EXPL-12)', () => {
      let reportId: string;

      it('học viên gửi báo cáo lỗi giải thích hoặc câu hỏi', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/content-reports',
          headers: { authorization: `Bearer ${learnerToken}` },
          payload: {
            questionId: questionWithAudioId,
            issueType: 'confusing_explanation',
            description: 'Giải thích phần trợ từ hơi khó hiểu, xin giải thích thêm',
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.id).toBeDefined();
        expect(body.status).toBe('open');
        reportId = body.id;
      });

      it('nhân viên xem danh sách báo cáo và xử lý cập nhật trạng thái', async () => {
        // List reports
        const listRes = await app.inject({
          method: 'GET',
          url: '/admin/content-reports',
          headers: { authorization: `Bearer ${reviewerToken}` },
        });

        expect(listRes.statusCode).toBe(200);
        const reports = JSON.parse(listRes.body).items;
        expect(reports.some((r: any) => r.id === reportId)).toBe(true);

        // Update status
        const patchRes = await app.inject({
          method: 'PATCH',
          url: `/admin/content-reports/${reportId}`,
          headers: { authorization: `Bearer ${reviewerToken}` },
          payload: { status: 'resolved', notes: 'Đã bổ sung ví dụ' },
        });

        expect(patchRes.statusCode).toBe(200);
        expect(JSON.parse(patchRes.body).status).toBe('resolved');
      });
    });
  });
});
