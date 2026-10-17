import { describe, it, expect } from 'vitest';
import {
  LevelSchema,
  ExamKindSchema,
  QuestionOriginSchema,
  ReviewStatusSchema,
  RichTextSchema,
  PublicExamSnapshotSchema,
  PublicOptionSchema,
  PublicQuestionSchema,
  assertNoAnswerLeak,
  ExamAnswerKeySchema,
  StaffQuestionSchema,
  ApiErrorEnvelopeSchema,
  createApiError,
  EventEnvelopeSchema,
  createEventEnvelope,
  ResultSchema,
  EventCreateSchema,
  AssignmentCreateSchema,
  ReviewAttemptResponseSchema,
  ActorContextSchema,
  ResourceVersionSchema,
  SourceRightsSchema,
  assertNoEventLeak,
  RetentionPolicySchema,
  DeletionRequestSchema,
  ExportJobSchema,
  RetentionViolationError,
  assertRetentionPolicyApproved,
  evaluateDataDeletionEligibility,
  assertNoRetentionViolationOnDelete,
  sanitizeExportField,
  AIContentReviewedPayloadSchema,
} from '../src/index.js';

describe('@jlpt/schema contracts test', () => {
  it('validates standard JLPT level enums', () => {
    expect(LevelSchema.parse('N1')).toBe('N1');
    expect(LevelSchema.parse('N5')).toBe('N5');
    expect(() => LevelSchema.parse('N6')).toThrow();
  });

  it('validates exam kind enum values', () => {
    expect(ExamKindSchema.parse('original')).toBe('original');
    expect(ExamKindSchema.parse('practice')).toBe('practice');
    expect(() => ExamKindSchema.parse('unknown')).toThrow();
  });

  it('validates question origin values', () => {
    expect(QuestionOriginSchema.parse('official_past_exam')).toBe('official_past_exam');
    expect(QuestionOriginSchema.parse('ai_generated')).toBe('ai_generated');
  });

  it('validates review status values', () => {
    expect(ReviewStatusSchema.parse('draft')).toBe('draft');
    expect(ReviewStatusSchema.parse('approved')).toBe('approved');
  });

  it('validates rich text structure', () => {
    const valid = [
      { t: 'ruby', text: '漢字', rt: 'かんじ' },
      { t: 'text', text: 'を勉強する' },
      { t: 'blank' },
      { t: 'star' },
    ];
    expect(RichTextSchema.parse(valid)).toEqual(valid);
  });

  describe('Acceptance 1: DTO công khai tách DTO đáp án', () => {
    const validOption = {
      label: '1',
      content: [{ t: 'text', text: 'ちず' }],
    };

    it('validates public option without answers', () => {
      expect(PublicOptionSchema.parse(validOption)).toEqual(validOption);
    });

    it('rejects public option containing answer/correct flags', () => {
      const leakedOption = {
        label: '1',
        content: [{ t: 'text', text: 'ちず' }],
        isCorrect: true,
      };
      expect(() => PublicOptionSchema.parse(leakedOption)).toThrow();
    });

    it('validates public question without answers', () => {
      const validQuestion = {
        index: 0,
        questionId: '0192f0c0-0000-7000-8000-0000000000b1',
        number: '1',
        stem: [{ t: 'text', text: 'この地図を見てください。' }],
        options: [
          { label: '1', content: [{ t: 'text', text: 'ちず' }] },
          { label: '2', content: [{ t: 'text', text: 'ちと' }] },
          { label: '3', content: [{ t: 'text', text: 'じず' }] },
          { label: '4', content: [{ t: 'text', text: 'じと' }] },
        ],
      };
      expect(PublicQuestionSchema.parse(validQuestion)).toEqual(validQuestion);
      expect(() => assertNoAnswerLeak(validQuestion)).not.toThrow();
    });

    it('strictly rejects public question containing correctOption or explanation', () => {
      const leakedQuestion = {
        index: 0,
        questionId: '0192f0c0-0000-7000-8000-0000000000b1',
        number: '1',
        stem: [{ t: 'text', text: 'この地図を見てください。' }],
        options: [
          { label: '1', content: [{ t: 'text', text: 'ちず' }] },
          { label: '2', content: [{ t: 'text', text: 'ちと' }] },
          { label: '3', content: [{ t: 'text', text: 'じず' }] },
          { label: '4', content: [{ t: 'text', text: 'じと' }] },
        ],
        correctOption: 1,
      };
      expect(() => PublicQuestionSchema.parse(leakedQuestion)).toThrow();
      expect(() => assertNoAnswerLeak(leakedQuestion)).toThrow(/forbidden answer field/);
    });

    it('strictly rejects public exam snapshot containing answer key', () => {
      const leakedSnapshot = {
        schemaVersion: 1,
        examId: '0192f0c0-0000-7000-8000-000000000001',
        version: 1,
        level: 'N5',
        title: 'Đề luyện N5',
        kind: 'practice',
        totalQuestions: 1,
        sections: [
          {
            index: 0,
            code: 'language_vocab',
            title: '言語知識',
            durationSec: 600,
            questionRange: [0, 0],
            groups: [
              {
                groupId: '0192f0c0-0000-7000-8000-0000000000a1',
                mondaiType: 'kanji_reading',
                instructions: [{ t: 'text', text: '指示' }],
                passage: null,
                media: [],
                questions: [
                  {
                    index: 0,
                    questionId: '0192f0c0-0000-7000-8000-0000000000b1',
                    number: '1',
                    stem: [{ t: 'text', text: '問題文' }],
                    options: [
                      { label: '1', content: [{ t: 'text', text: 'A' }] },
                      { label: '2', content: [{ t: 'text', text: 'B' }] },
                      { label: '3', content: [{ t: 'text', text: 'C' }] },
                      { label: '4', content: [{ t: 'text', text: 'D' }] },
                    ],
                    correctOption: 1,
                  },
                ],
              },
            ],
            listeningTimeline: null,
          },
        ],
      };
      expect(() => PublicExamSnapshotSchema.parse(leakedSnapshot)).toThrow();
      expect(() => assertNoAnswerLeak(leakedSnapshot)).toThrow(/forbidden answer field/);
    });

    it('validates server-only answer key DTO', () => {
      const answerKey = {
        examId: '0192f0c0-0000-7000-8000-000000000001',
        version: 1,
        keys: [1, 2, 4, 3],
        skills: ['kanji', 'vocabulary', 'grammar', 'reading'],
        mondaiTypes: ['kanji_reading', 'orthography', 'grammar_form', 'comprehension_short'],
        sectionRanges: [[0, 1], [2, 3]],
      };
      expect(ExamAnswerKeySchema.parse(answerKey)).toEqual(answerKey);
    });

    it('validates staff question draft with correctOption', () => {
      const staffQuestion = {
        questionId: '0192f0c0-0000-7000-8000-0000000000b1',
        stem: [{ t: 'text', text: '問題文' }],
        options: [
          { label: '1', content: [{ t: 'text', text: 'A' }], isCorrect: true },
          { label: '2', content: [{ t: 'text', text: 'B' }] },
          { label: '3', content: [{ t: 'text', text: 'C' }] },
          { label: '4', content: [{ t: 'text', text: 'D' }] },
        ],
        correctOption: 1,
      };
      expect(StaffQuestionSchema.parse(staffQuestion)).toEqual(staffQuestion);
    });
  });

  describe('Standard Error Envelope', () => {
    it('creates and validates API error response envelope', () => {
      const err = createApiError('LEASE_INVALID', 'Bài thi đang được mở ở nơi khác.', {
        openedElsewhere: true,
      });
      const parsed = ApiErrorEnvelopeSchema.parse(err);
      expect(parsed.error.code).toBe('LEASE_INVALID');
      expect(parsed.error.message).toBe('Bài thi đang được mở ở nơi khác.');
      expect(parsed.error.details.openedElsewhere).toBe(true);
    });
  });

  describe('Event Envelope & Topics', () => {
    it('creates and validates standard event envelope', () => {
      const envelope = createEventEnvelope(
        'attempt.submitted',
        '0192f0c0-0000-7000-8000-000000000001',
        '0192f0c0-0000-7000-8000-000000000099',
        {
          attemptId: '0192f0c0-0000-7000-8000-000000000001',
          examId: '0192f0c0-0000-7000-8000-000000000002',
          examVersion: 1,
          score: 150,
          passed: true,
        },
      );
      const parsed = EventEnvelopeSchema.parse(envelope);
      expect(parsed.topic).toBe('attempt.submitted');
      expect(parsed.schemaVersion).toBe(1);
    });
  });

  describe('Scoring Result Schema', () => {
    it('validates complete scoring Result structure', () => {
      const result = {
        totals: { correct: 20, wrong: 5, blank: 0, total: 25 },
        accuracy: 80,
        durationSec: 1500,
        bySection: [{ code: 'language_vocab', correct: 20, total: 25 }],
        bySkill: [{ skill: 'kanji', correct: 20, total: 25 }],
        scoring: {
          method: 'linear_reference',
          sections: [
            {
              code: 'language',
              label: '言語知識',
              raw: 20,
              rawMax: 25,
              scaled: 48,
              maxScaled: 60,
              minPass: 19,
              passed: true,
            },
          ],
          total: 48,
          totalMax: 60,
          totalPass: 38,
          passEstimate: true,
        },
        flags: [],
      };
      expect(ResultSchema.parse(result)).toEqual(result);
    });
  });

  describe('ReviewAttemptResponseSchema', () => {
    it('validates review attempt response containing answer comparison', () => {
      const reviewData = {
        snapshotUrl: 'https://cdn.jlpt.example.com/snapshots/exam-01.json',
        mediaToken: 'token_123',
        answers: [1, 2, 3, 4],
        flags: [0, 1, 0, 0],
        correct: [1, 2, 4, 3],
        result: {
          totals: { correct: 2, wrong: 2, blank: 0, total: 4 },
          accuracy: 50,
          durationSec: 300,
          bySection: [{ code: 'language', correct: 2, total: 4 }],
          bySkill: [{ skill: 'kanji', correct: 2, total: 4 }],
          scoring: {
            method: 'linear_reference',
            sections: [
              {
                code: 'language',
                label: '言語知識',
                raw: 2,
                rawMax: 4,
                scaled: 30,
                maxScaled: 60,
                minPass: 19,
                passed: true,
              },
            ],
            total: 30,
            totalMax: 60,
            totalPass: 38,
            passEstimate: false,
          },
          flags: [],
        },
      };
      expect(ReviewAttemptResponseSchema.parse(reviewData)).toEqual(reviewData);
    });
  });

  describe('EventCreateSchema time constraints: require opens<=starts<ends<=release', () => {
    const baseEvent = {
      examId: '0192f0c0-0000-7000-8000-000000000001',
      opensAt: '2026-12-01T08:00:00.000Z',
      startsAt: '2026-12-01T09:00:00.000Z',
      endsAt: '2026-12-01T11:00:00.000Z',
      resultReleaseAt: '2026-12-01T12:00:00.000Z',
      capacity: 1000,
      lateSyncWindowSec: 0,
      rankingScope: 'global',
    };

    it('accepts valid timeline where opens <= starts < ends <= release', () => {
      expect(EventCreateSchema.parse(baseEvent)).toEqual(baseEvent);
    });

    it('accepts opens == starts and ends == release', () => {
      const equalBounds = {
        ...baseEvent,
        opensAt: '2026-12-01T09:00:00.000Z',
        resultReleaseAt: '2026-12-01T11:00:00.000Z',
      };
      expect(EventCreateSchema.parse(equalBounds)).toEqual(equalBounds);
    });

    it('rejects if opensAt > startsAt', () => {
      const invalid = {
        ...baseEvent,
        opensAt: '2026-12-01T09:30:00.000Z',
      };
      expect(() => EventCreateSchema.parse(invalid)).toThrow(/opens<=starts<ends<=release/);
    });

    it('rejects if startsAt >= endsAt', () => {
      const invalid = {
        ...baseEvent,
        startsAt: '2026-12-01T11:00:00.000Z',
      };
      expect(() => EventCreateSchema.parse(invalid)).toThrow(/opens<=starts<ends<=release/);
    });

    it('rejects if endsAt > resultReleaseAt', () => {
      const invalid = {
        ...baseEvent,
        resultReleaseAt: '2026-12-01T10:30:00.000Z',
      };
      expect(() => EventCreateSchema.parse(invalid)).toThrow(/opens<=starts<ends<=release/);
    });
  });

  describe('AssignmentCreateSchema constraints: opensAtUTC < dueAtUTC and require examId || mixConfig', () => {
    const validAssignment = {
      examId: '0192f0c0-0000-7000-8000-000000000001',
      opensAtUTC: '2026-11-01T00:00:00.000Z',
      dueAtUTC: '2026-11-07T23:59:59.000Z',
      attemptPolicy: { maxAttempts: 3 },
    };

    it('accepts valid assignment with examId and opensAtUTC < dueAtUTC', () => {
      expect(AssignmentCreateSchema.parse(validAssignment)).toMatchObject(validAssignment);
    });

    it('rejects if neither examId nor mixConfig is provided', () => {
      const missingConfig = {
        opensAtUTC: '2026-11-01T00:00:00.000Z',
        dueAtUTC: '2026-11-07T23:59:59.000Z',
        attemptPolicy: {},
      };
      expect(() => AssignmentCreateSchema.parse(missingConfig)).toThrow(/examId hoặc mixConfig/);
    });

    it('rejects if opensAtUTC >= dueAtUTC', () => {
      const invalidTime = {
        ...validAssignment,
        opensAtUTC: '2026-11-08T00:00:00.000Z',
      };
      expect(() => AssignmentCreateSchema.parse(invalidTime)).toThrow(/opensAtUTC phải diễn ra trước dueAtUTC/);
    });
  });

  describe('Shared contracts: ActorContext, ResourceVersion, SourceRights', () => {
    it('validates ActorContextSchema', () => {
      const actor = {
        userId: '0192f0c0-0000-7000-8000-000000000001',
        tenantId: null,
        roles: ['admin', 'reviewer'],
        entitlements: ['exam.review', 'exam.publish'],
      };
      expect(ActorContextSchema.parse(actor)).toEqual(actor);
    });

    it('validates ResourceVersionSchema', () => {
      const version = {
        id: '0192f0c0-0000-7000-8000-000000000001',
        version: 2,
        createdAt: '2026-10-15T10:00:00.000Z',
        createdBy: '0192f0c0-0000-7000-8000-000000000002',
        status: 'published',
      };
      expect(ResourceVersionSchema.parse(version)).toEqual(version);
    });

    it('validates SourceRightsSchema', () => {
      const rights = {
        sourceId: '0192f0c0-0000-7000-8000-000000000001',
        licenseId: '0192f0c0-0000-7000-8000-000000000002',
        displayAllowed: true,
        remixAllowed: false,
        commercialAllowed: false,
        transcriptAllowed: true,
        aiProcessingAllowed: true,
        exportAllowed: false,
      };
      expect(SourceRightsSchema.parse(rights)).toMatchObject(rights);
    });
  });

  describe('Acceptance 3: Public events không chứa answers hay PII', () => {
    it('validates compliant event envelope without answers or PII', () => {
      const validEvent = createEventEnvelope(
        'attempt.submitted',
        '0192f0c0-0000-7000-8000-000000000010',
        '0192f0c0-0000-7000-8000-000000000099',
        {
          attemptId: '0192f0c0-0000-7000-8000-000000000010',
          examId: '0192f0c0-0000-7000-8000-000000000001',
          examVersion: 1,
          score: 145,
          passed: true,
        },
      );
      expect(EventEnvelopeSchema.parse(validEvent)).toEqual(validEvent);
      expect(() => assertNoEventLeak(validEvent)).not.toThrow();
    });

    it('strictly rejects event containing forbidden answer fields (answers, correctOption, answerKey)', () => {
      const leakedAnswerEvent = {
        eventId: '0192f0c0-0000-7000-8000-000000000001',
        schemaVersion: 1,
        topic: 'attempt.submitted',
        occurredAt: '2026-10-15T10:00:00.000Z',
        actorId: 'system',
        tenantId: null,
        aggregateId: '0192f0c0-0000-7000-8000-000000000010',
        aggregateVersion: 1,
        correlationId: 'req_01',
        payload: {
          attemptId: '0192f0c0-0000-7000-8000-000000000010',
          answers: [1, 2, 3, 4],
          correctOption: 2,
        },
      };

      expect(() => EventEnvelopeSchema.parse(leakedAnswerEvent)).toThrow(/forbidden answer field/);
      expect(() => assertNoEventLeak(leakedAnswerEvent)).toThrow(/forbidden answer field "answers"/);
    });

    it('strictly rejects event containing forbidden PII fields (email, password, bearerToken)', () => {
      const leakedPiiEvent = {
        eventId: '0192f0c0-0000-7000-8000-000000000001',
        schemaVersion: 1,
        topic: 'privacy.consent.changed',
        occurredAt: '2026-10-15T10:00:00.000Z',
        actorId: 'system',
        tenantId: null,
        aggregateId: '0192f0c0-0000-7000-8000-000000000010',
        aggregateVersion: 1,
        correlationId: 'req_01',
        payload: {
          userId: '0192f0c0-0000-7000-8000-000000000099',
          email: 'student@example.com',
          purpose: 'analytics',
          granted: true,
        },
      };

      expect(() => EventEnvelopeSchema.parse(leakedPiiEvent)).toThrow(/forbidden PII field/);
      expect(() => assertNoEventLeak(leakedPiiEvent)).toThrow(/forbidden PII field "email"/);
    });

    it('strictly rejects event containing plain email string in nested payload value', () => {
      const plainEmailEvent = {
        eventId: '0192f0c0-0000-7000-8000-000000000001',
        schemaVersion: 1,
        topic: 'payment.failed',
        occurredAt: '2026-10-15T10:00:00.000Z',
        actorId: 'system',
        tenantId: null,
        aggregateId: '0192f0c0-0000-7000-8000-000000000010',
        aggregateVersion: 1,
        correlationId: 'req_01',
        payload: {
          orderId: '0192f0c0-0000-7000-8000-000000000020',
          reason: 'Failed to contact learner@jlpt.example.org on invoice delivery',
        },
      };

      // Email pattern detected in string
      expect(() => assertNoEventLeak(plainEmailEvent)).toThrow(/plain email PII detected/);
    });

    it('createEventEnvelope throws immediately if leaked answer or PII is passed', () => {
      expect(() =>
        createEventEnvelope(
          'attempt.submitted',
          '0192f0c0-0000-7000-8000-000000000010',
          'system',
          {
            score: 100,
            answers: [1, 2],
          },
        ),
      ).toThrow(/forbidden answer field "answers"/);
    });
  });

  describe('Acceptance 2: Delete/export không phá nghĩa vụ retention chưa được phê duyệt', () => {
    const approvedBillingPolicy = {
      id: '0192f0c0-0000-7000-8000-0000000000a1',
      domain: 'billing',
      retentionDays: 3650,
      policyApproved: true,
      approvedBy: '0192f0c0-0000-7000-8000-000000000001',
    };

    const unapprovedSamplePolicy = {
      id: '0192f0c0-0000-7000-8000-0000000000a2',
      domain: 'unapproved_sample',
      retentionDays: 30,
      policyApproved: false,
    };

    it('validates RetentionPolicySchema', () => {
      expect(RetentionPolicySchema.parse(approvedBillingPolicy)).toMatchObject(approvedBillingPolicy);
      expect(RetentionPolicySchema.parse(unapprovedSamplePolicy)).toMatchObject(unapprovedSamplePolicy);
    });

    it('assertRetentionPolicyApproved succeeds for approved policy', () => {
      expect(() => assertRetentionPolicyApproved(approvedBillingPolicy, 'billing')).not.toThrow();
    });

    it('assertRetentionPolicyApproved throws RetentionViolationError for unapproved policy', () => {
      expect(() => assertRetentionPolicyApproved(unapprovedSamplePolicy, 'unapproved_sample')).toThrow(
        RetentionViolationError,
      );
      expect(() => assertRetentionPolicyApproved(unapprovedSamplePolicy, 'unapproved_sample')).toThrow(
        /chưa được phê duyệt/,
      );
    });

    it('assertRetentionPolicyApproved throws RetentionViolationError if policy is missing', () => {
      expect(() => assertRetentionPolicyApproved(null, 'unknown_domain')).toThrow(RetentionViolationError);
    });

    it('evaluateDataDeletionEligibility accurately evaluates domain deletion safety', () => {
      const policies = [approvedBillingPolicy, unapprovedSamplePolicy];
      expect(evaluateDataDeletionEligibility(policies, 'billing')).toEqual({ eligible: true });
      const unapprovedCheck = evaluateDataDeletionEligibility(policies, 'unapproved_sample');
      expect(unapprovedCheck.eligible).toBe(false);
      expect(unapprovedCheck.reason).toContain('chưa có chính sách lưu trữ');
    });

    it('assertNoRetentionViolationOnDelete blocks multi-domain deletion containing unapproved retention obligations', () => {
      const policies = [approvedBillingPolicy, unapprovedSamplePolicy];
      expect(() =>
        assertNoRetentionViolationOnDelete(policies, ['billing', 'unapproved_sample']),
      ).toThrow(RetentionViolationError);

      expect(() =>
        assertNoRetentionViolationOnDelete(policies, ['billing']),
      ).not.toThrow();
    });

    it('validates DeletionRequestSchema and ExportJobSchema', () => {
      const delReq = {
        id: '0192f0c0-0000-7000-8000-0000000000d1',
        userId: '0192f0c0-0000-7000-8000-000000000099',
        status: 'blocked_retention',
        requestedAt: '2026-10-15T12:00:00.000Z',
        metadata: { preservedDomains: ['billing'] },
      };
      expect(DeletionRequestSchema.parse(delReq)).toMatchObject(delReq);

      const expJob = {
        id: '0192f0c0-0000-7000-8000-0000000000e1',
        userId: '0192f0c0-0000-7000-8000-000000000099',
        status: 'completed',
        downloadUrl: 'https://cdn.jlpt.example.com/exports/user-data.zip',
        createdAt: '2026-10-15T12:00:00.000Z',
      };
      expect(ExportJobSchema.parse(expJob)).toMatchObject(expJob);
    });

    it('sanitizes export fields to prevent spreadsheet formula injection', () => {
      expect(sanitizeExportField('=1+1')).toBe("'=1+1");
      expect(sanitizeExportField('+SUM(A1:A10)')).toBe("'+SUM(A1:A10)");
      expect(sanitizeExportField('-12345')).toBe("'-12345");
      expect(sanitizeExportField('@cmd')).toBe("'@cmd");
      expect(sanitizeExportField('Safe Text')).toBe('Safe Text');
      expect(sanitizeExportField(12345)).toBe(12345);
    });
  });

  describe('AI generation labels and moderation', () => {
    it('validates AIContentReviewedPayloadSchema retains aiGenerated label', () => {
      const payload = {
        contentId: '0192f0c0-0000-7000-8000-0000000000c1',
        decision: 'approve',
        reviewerId: '0192f0c0-0000-7000-8000-000000000001',
        aiGenerated: true,
        contentType: 'explanation',
      };
      const parsed = AIContentReviewedPayloadSchema.parse(payload);
      expect(parsed.aiGenerated).toBe(true);
      expect(parsed.decision).toBe('approve');
    });
  });

  describe('R01 Acceptance: Logic contracts and schema integrity', () => {
    it('validates event envelope generation and zero-leakage for all 23 topics', () => {
      const topics = [
        'content.import.requested',
        'content.import.completed',
        'content.import.failed',
        'content.approved',
        'content.published',
        'content.taken_down',
        'attempt.submitted',
        'learning.card.reviewed',
        'study.session.completed',
        'study.session.missed',
        'payment.captured',
        'payment.refunded',
        'payment.failed',
        'subscription.changed',
        'ai.request.settled',
        'ai.request.cancelled',
        'ai.content.reviewed',
        'assignment.created',
        'assignment.completed',
        'exam_event.results_released',
        'privacy.consent.changed',
        'privacy.deletion.requested',
        'experiment.exposed',
      ] as const;

      expect(topics.length).toBe(23);

      for (const topic of topics) {
        const envelope = createEventEnvelope(
          topic,
          '0192f0c0-0000-7000-8000-000000000001',
          '0192f0c0-0000-7000-8000-000000000002',
          { status: 'ok', detail: `Sample payload for topic ${topic}` },
          { tenantId: '0192f0c0-0000-7000-8000-000000000003' },
        );
        expect(envelope.topic).toBe(topic);
        expect(envelope.schemaVersion).toBe(1);
        expect(envelope.tenantId).toBe('0192f0c0-0000-7000-8000-000000000003');
        expect(() => assertNoEventLeak(envelope)).not.toThrow();
        expect(EventEnvelopeSchema.parse(envelope)).toMatchObject({ topic });
      }
    });

    it('assertNoEventLeak strictly rejects answer keys and PII in payloads', () => {
      expect(() =>
        assertNoEventLeak({
          topic: 'attempt.submitted',
          payload: { answerKey: { '1': 'A' } },
        }),
      ).toThrow(/forbidden answer field/);

      expect(() =>
        assertNoEventLeak({
          topic: 'attempt.submitted',
          payload: { userEmail: 'user@example.com' },
        }),
      ).toThrow(/plain email PII detected/);

      expect(() =>
        assertNoEventLeak({
          topic: 'attempt.submitted',
          payload: { token: 'Bearer eyJhbGciOiJIUzI1NiJ9.test' },
        }),
      ).toThrow(/bearer token secret detected/);
    });

    it('assertNoAnswerLeak strictly rejects leaked answer fields at arbitrary nesting depths', () => {
      const shallowLeak = { isCorrect: true };
      expect(() => assertNoAnswerLeak(shallowLeak)).toThrow(/forbidden answer field/);

      const deepLeak = {
        section: {
          group: {
            question: {
              answers: ['1'],
            },
          },
        },
      };
      expect(() => assertNoAnswerLeak(deepLeak)).toThrow(/forbidden answer field/);
    });

    it('sanitizeExportField strips and neutralizes all spreadsheet formula injection triggers', () => {
      expect(sanitizeExportField('=HYPERLINK("http://attacker.com")')).toBe("'=HYPERLINK(\"http://attacker.com\")");
      expect(sanitizeExportField('+1+1')).toBe("'+1+1");
      expect(sanitizeExportField('-cmd|"/C calc"!A0')).toBe("'-cmd|\"/C calc\"!A0");
      expect(sanitizeExportField('@SUM(1,2)')).toBe("'@SUM(1,2)");
      expect(sanitizeExportField('\tTAB_PREFIX')).toBe("'\tTAB_PREFIX");
      expect(sanitizeExportField('\rCR_PREFIX')).toBe("'\rCR_PREFIX");
      expect(sanitizeExportField('Normal Japanese テキスト 日本語')).toBe('Normal Japanese テキスト 日本語');
    });
  });
});

