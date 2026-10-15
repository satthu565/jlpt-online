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
});
