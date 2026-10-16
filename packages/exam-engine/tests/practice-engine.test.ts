import { describe, it, expect } from 'vitest';
import type { PracticeConfig, Level, Skill, MondaiType } from '@jlpt/schema';
import {
  generatePracticeExam,
  PoolShortageError,
  deterministicUuid,
  type CandidateGroup,
} from '../src/index.js';

function createPracticeCandidatePool(options?: {
  totalGroups?: number;
  level?: Level;
  skills?: Skill[];
  mondaiTypes?: MondaiType[];
  questionsPerGroup?: number;
  difficulty?: number;
  exposureCount?: number;
  wrongCount?: number;
  isMarked?: boolean;
  tags?: string[];
  displayAllowed?: boolean;
  isApproved?: boolean;
  hasAnswerKeys?: boolean;
  sourceId?: string;
}): CandidateGroup[] {
  const count = options?.totalGroups ?? 30;
  const level = options?.level ?? 'N5';
  const skills = options?.skills ?? ['kanji'];
  const mondaiTypes = options?.mondaiTypes ?? ['kanji_reading'];
  const qPerGroup = options?.questionsPerGroup ?? 1;

  const pool: CandidateGroup[] = [];
  for (let i = 0; i < count; i++) {
    const skill = skills[i % skills.length]!;
    const mondaiType = mondaiTypes[i % mondaiTypes.length]!;
    const sourceId = options?.sourceId ?? `src_${i % 3}`;
    const groupId = deterministicUuid(pool.length + 1, `prac_${sourceId}_${i}`);
    const questions = Array.from({ length: qPerGroup }, (_, qIdx) => ({
      id: `q_${groupId}_${qIdx}`,
      difficulty: options?.difficulty ?? 0.5,
      exposureCount: options?.exposureCount ?? 0,
      userAccuracy: options?.wrongCount ? 0.2 : 0.9,
      wrongCount: options?.wrongCount ?? 0,
      isMarked: options?.isMarked ?? false,
      tags: options?.tags ?? [`tag_${skill}`],
    }));

    pool.push({
      groupId,
      sourceSession: '2023-07',
      sourceId: options?.sourceId ?? `src_${i % 3}`,
      level,
      mondaiType,
      skill,
      questions,
      questionCount: questions.length,
      passage: skill === 'reading' ? { text: 'Reading passage' } : undefined,
      hasMedia: true,
      mediaKeys: skill === 'listening' ? ['audio.mp3'] : undefined,
      isApproved: options?.isApproved ?? true,
      hasAnswerKeys: options?.hasAnswerKeys ?? true,
      license: {
        remixAllowed: true,
        displayAllowed: options?.displayAllowed ?? true,
        expiresAt: '2030-01-01T00:00:00Z',
      },
      averageDifficulty: options?.difficulty ?? 0.5,
      maxExposure: options?.exposureCount ?? 0,
      totalWrongCount: options?.wrongCount ?? 0,
      averageAccuracy: options?.wrongCount ? 0.2 : 0.9,
      isMarked: options?.isMarked ?? false,
      tags: options?.tags ?? [`tag_${skill}`],
    });
  }

  return pool;
}

describe('JLPT Practice Engine Suite (PRA-01..09, 14..16)', () => {
  it('PRA-01: Luyện riêng Kanji', () => {
    const pool = createPracticeCandidatePool({ totalGroups: 20, skills: ['kanji'], mondaiTypes: ['kanji_reading'] });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 101 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('kanji');
      expect(g.mondaiType).toBe('kanji_reading');
    }
  });

  it('PRA-02: Luyện riêng từ vựng', () => {
    const pool = createPracticeCandidatePool({ totalGroups: 20, skills: ['vocabulary'], mondaiTypes: ['orthography'] });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['vocabulary'],
      mondaiTypes: ['orthography'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 102 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('vocabulary');
      expect(g.mondaiType).toBe('orthography');
    }
  });

  it('PRA-03: Luyện riêng ngữ pháp', () => {
    const pool = createPracticeCandidatePool({ totalGroups: 20, skills: ['grammar'], mondaiTypes: ['grammar_form'] });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['grammar'],
      mondaiTypes: ['grammar_form'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 103 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('grammar');
      expect(g.mondaiType).toBe('grammar_form');
    }
  });

  it('PRA-04: Luyện riêng đọc hiểu', () => {
    const pool = createPracticeCandidatePool({
      totalGroups: 20,
      skills: ['reading'],
      mondaiTypes: ['comprehension_short'],
      questionsPerGroup: 2,
    });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['reading'],
      mondaiTypes: ['comprehension_short'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 104 });
    // 5 groups of 2 questions = 10 questions
    expect(result.selectedGroups.length).toBe(5);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('reading');
      expect(g.passage).toBeDefined();
      expect(g.questions.length).toBe(2);
    }
  });

  it('PRA-05: Luyện riêng nghe hiểu', () => {
    const pool = createPracticeCandidatePool({
      totalGroups: 20,
      skills: ['listening'],
      mondaiTypes: ['task_based'],
    });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['listening'],
      mondaiTypes: ['task_based'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 105 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('listening');
      expect(g.hasMedia).toBe(true);
      expect(g.mediaKeys).toContain('audio.mp3');
    }
  });

  it('PRA-06: Luyện theo từng dạng 問題', () => {
    const pool = createPracticeCandidatePool({
      totalGroups: 20,
      skills: ['grammar'],
      mondaiTypes: ['grammar_form'],
    });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['grammar'],
      mondaiTypes: ['grammar_form'],
      questionCount: 10,
      pool: 'random',
    };

    const result = generatePracticeExam({ config, pool, seed: 106 });
    for (const g of result.selectedGroups) {
      expect(g.mondaiType).toBe('grammar_form');
    }
  });

  describe('PRA-07: Tạo bài 10 / 20 / 30 / 50 câu theo bộ lọc', () => {
    it.each([10, 20, 30, 50] as const)('generates exact questionCount=%d', (count) => {
      const pool = createPracticeCandidatePool({
        totalGroups: count + 20,
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
      });
      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: count,
        pool: 'random',
      };

      const result = generatePracticeExam({ config, pool, seed: count * 11 });
      const totalQuestions = result.selectedGroups.reduce(
        (acc, g) => acc + g.questionCount,
        0,
      );
      expect(totalQuestions).toBe(count);
    });
  });

  it('PRA-08: Luyện không giới hạn thời gian (timeLimitSec undefined)', () => {
    const pool = createPracticeCandidatePool({ totalGroups: 20, skills: ['kanji'], mondaiTypes: ['kanji_reading'] });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      questionCount: 10,
      pool: 'random',
      // timeLimitSec omitted
    };

    const result = generatePracticeExam({ config, pool, seed: 108 });
    expect(result.timeLimitSec).toBeUndefined();
  });

  it('PRA-09: Luyện có thời gian do người dùng chọn (timeLimitSec specified)', () => {
    const pool = createPracticeCandidatePool({ totalGroups: 20, skills: ['kanji'], mondaiTypes: ['kanji_reading'] });
    const config: PracticeConfig = {
      level: 'N5',
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      questionCount: 10,
      pool: 'random',
      timeLimitSec: 600, // 10 minutes
    };

    const result = generatePracticeExam({ config, pool, seed: 109 });
    expect(result.timeLimitSec).toBe(600);
    expect(result.warnings.some((w) => w.includes('600'))).toBe(true);
  });

  it('PRA-14: Luyện ngẫu nhiên từ nhiều nguồn đề với sourceIds filter', () => {
    const pool = [
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        sourceId: '00000000-0000-4000-8000-000000000001',
      }),
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        sourceId: '00000000-0000-4000-8000-000000000002',
      }),
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        sourceId: '00000000-0000-4000-8000-000000000099', // Unrequested source
      }),
    ];

    const config: PracticeConfig = {
      level: 'N5',
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      questionCount: 20,
      pool: 'random',
      sourceIds: [
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
      ],
    };

    const result = generatePracticeExam({ config, pool, seed: 114 });
    expect(result.selectedGroups.length).toBe(20);
    for (const g of result.selectedGroups) {
      expect([
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
      ]).toContain(g.sourceId);
    }
  });

  it('PRA-15: Luyện theo độ khó được hệ thống đánh giá', () => {
    const pool = [
      ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], difficulty: 0.2 }),
      ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], difficulty: 0.5 }),
      ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], difficulty: 0.8 }),
    ];

    const config: PracticeConfig = {
      level: 'N5',
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      questionCount: 10,
      pool: 'difficulty',
      difficultyRange: [0.4, 0.6], // Only groups with difficulty around 0.5
    };

    const result = generatePracticeExam({ config, pool, seed: 115 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.averageDifficulty).toBeGreaterThanOrEqual(0.4);
      expect(g.averageDifficulty).toBeLessThanOrEqual(0.6);
    }
  });

  it('PRA-16: Luyện theo mẫu ngữ pháp hoặc nhóm từ vựng (tagIds filter)', () => {
    const pool = [
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['grammar'],
        mondaiTypes: ['grammar_form'],
        tags: ['grammar_n5_te_form'],
      }),
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['grammar'],
        mondaiTypes: ['grammar_form'],
        tags: ['grammar_n5_particles'],
      }),
      ...createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['grammar'],
        mondaiTypes: ['grammar_form'],
        tags: ['other_untargeted_tag'],
      }),
    ];

    const config: PracticeConfig = {
      level: 'N5',
      skills: ['grammar'],
      mondaiTypes: ['grammar_form'],
      questionCount: 10,
      pool: 'tagged',
      tagIds: ['grammar_n5_te_form'],
    };

    const result = generatePracticeExam({ config, pool, seed: 116 });
    expect(result.selectedGroups.length).toBe(10);
    for (const g of result.selectedGroups) {
      expect(g.tags).toContain('grammar_n5_te_form');
    }
  });

  describe('Practice Pools: wrong, unseen, marked', () => {
    it('pool="wrong": selects only questions user got wrong', () => {
      const pool = [
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], wrongCount: 3 }),
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], wrongCount: 0 }),
      ];

      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: 10,
        pool: 'wrong',
      };

      const result = generatePracticeExam({ config, pool, seed: 201 });
      for (const g of result.selectedGroups) {
        expect((g.totalWrongCount ?? 0) > 0).toBe(true);
      }
    });

    it('pool="unseen": selects only questions user has not encountered (exposureCount=0)', () => {
      const pool = [
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], exposureCount: 0 }),
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], exposureCount: 4 }),
      ];

      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: 10,
        pool: 'unseen',
      };

      const result = generatePracticeExam({ config, pool, seed: 202 });
      for (const g of result.selectedGroups) {
        expect(g.maxExposure).toBe(0);
      }
    });

    it('pool="marked": selects only bookmarked/marked questions', () => {
      const pool = [
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], isMarked: true }),
        ...createPracticeCandidatePool({ totalGroups: 15, skills: ['kanji'], mondaiTypes: ['kanji_reading'], isMarked: false }),
      ];

      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: 10,
        pool: 'marked',
      };

      const result = generatePracticeExam({ config, pool, seed: 203 });
      for (const g of result.selectedGroups) {
        expect(g.isMarked).toBe(true);
      }
    });
  });

  describe('Pool shortage and group preservation in Practice', () => {
    it('throws PoolShortageError when available pool has fewer questions than requested', () => {
      const pool = createPracticeCandidatePool({ totalGroups: 5, skills: ['kanji'], mondaiTypes: ['kanji_reading'] }); // Only 5 questions available
      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: 10, // Requesting 10 questions
        pool: 'random',
      };

      expect(() => generatePracticeExam({ config, pool })).toThrow(
        PoolShortageError,
      );
    });

    it('throws PoolShortageError when candidate groups cannot partition into exact question count without breaking groups', () => {
      // Pool contains only groups of 3 questions each (total 12 questions: 3+3+3+3)
      // Requested count is 10. No subset of 3s can sum to 10!
      const pool = createPracticeCandidatePool({
        totalGroups: 4,
        skills: ['reading'],
        mondaiTypes: ['comprehension_short'],
        questionsPerGroup: 3,
      });
      const config: PracticeConfig = {
        level: 'N5',
        skills: ['reading'],
        mondaiTypes: ['comprehension_short'],
        questionCount: 10,
        pool: 'random',
      };

      try {
        generatePracticeExam({ config, pool });
        expect.unreachable('Should have thrown PoolShortageError');
      } catch (err) {
        expect(err).toBeInstanceOf(PoolShortageError);
        const shortage = err as PoolShortageError;
        expect(shortage.code).toBe('POOL_SHORTAGE');
        expect(shortage.details[0]!.reason).toContain('nguyên vẹn');
      }
    });

    it('filters out groups with displayAllowed=false or unapproved status', () => {
      const pool = createPracticeCandidatePool({
        totalGroups: 15,
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        displayAllowed: false,
      });
      const config: PracticeConfig = {
        level: 'N5',
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        questionCount: 10,
        pool: 'random',
      };

      expect(() => generatePracticeExam({ config, pool })).toThrow(
        PoolShortageError,
      );
    });
  });
});
