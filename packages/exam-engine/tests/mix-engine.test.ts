import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { Blueprint, MixConfig } from '@jlpt/schema';
import {
  generateMixedExam,
  PoolShortageError,
  deterministicUuid,
  type CandidateGroup,
} from '../src/index.js';

function loadDemoBlueprint(): Blueprint {
  const candidates = [
    path.resolve(import.meta.dirname ?? '.', '../../../docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'),
    path.resolve(process.cwd(), 'docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return JSON.parse(fs.readFileSync(c, 'utf8'));
    }
  }
  throw new Error('synthetic-n5-demo-v1.json not found');
}

/**
 * Creates a synthetic candidate pool populated for a blueprint across given sessions.
 */
function createSyntheticPool(
  blueprint: Blueprint,
  sessions: string[],
  options?: {
    questionsPerGroup?: Record<string, number>;
    difficultyRange?: Record<string, number>;
    remixAllowed?: boolean;
    isApproved?: boolean;
    hasAnswerKeys?: boolean;
    exposureCount?: number;
    wrongCount?: number;
    isMarked?: boolean;
    copiesPerSession?: number;
  },
): CandidateGroup[] {
  const pool: CandidateGroup[] = [];
  const copies = options?.copiesPerSession ?? 5;

  for (const s of sessions) {
    for (const sec of blueprint.sections) {
      for (const mon of sec.mondai) {
        for (let i = 0; i < copies; i++) {
          const qCountPerGroup =
            options?.questionsPerGroup?.[mon.type] ??
            (mon.type.startsWith('comprehension') ? (i % 2 === 0 ? 2 : 1) : 1);
          const groupId = deterministicUuid(pool.length + 1, `${s}_${mon.type}_${i}`);
          const questions = Array.from({ length: qCountPerGroup }, (_, qIdx) => ({
            id: `q_${groupId}_${qIdx}`,
            difficulty: options?.difficultyRange?.[s] ?? 0.5,
            exposureCount: options?.exposureCount ?? 0,
            userAccuracy: options?.wrongCount ? 0.2 : 0.9,
            wrongCount: options?.wrongCount ?? 0,
            isMarked: options?.isMarked ?? false,
          }));

          pool.push({
            groupId,
            sourceSession: s,
            sourceId: `src_${s}`,
            level: blueprint.level,
            sectionCode: sec.code,
            mondaiType: mon.type,
            skill: mon.skill,
            questions,
            questionCount: questions.length,
            passage: mon.type.startsWith('comprehension') ? { text: 'Passage text' } : undefined,
            hasMedia: true,
            mediaKeys: mon.skill === 'listening' ? ['audio.mp3'] : undefined,
            isApproved: options?.isApproved ?? true,
            hasAnswerKeys: options?.hasAnswerKeys ?? true,
            license: {
              remixAllowed: options?.remixAllowed ?? true,
              displayAllowed: true,
              expiresAt: '2030-01-01T00:00:00Z',
            },
            averageDifficulty: options?.difficultyRange?.[s] ?? 0.5,
            maxExposure: options?.exposureCount ?? 0,
            totalWrongCount: options?.wrongCount ?? 0,
            averageAccuracy: options?.wrongCount ? 0.2 : 0.9,
            isMarked: options?.isMarked ?? false,
          });
        }
      }
    }
  }

  return pool;
}

describe('JLPT Exam Mixing Engine Suite (MIX-01..10, 12, 18, 19)', () => {
  const bp = loadDemoBlueprint();

  it('MIX-01: Enforces target level match and rejects level mismatch', () => {
    const config: MixConfig = {
      level: 'N4', // Mismatched level: bp is N5
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      mode: 'Random',
      blueprintVersion: 1,
    };
    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);

    expect(() =>
      generateMixedExam({
        blueprint: bp,
        config,
        pool,
      }),
    ).toThrow(/không khớp với blueprint/);
  });

  it('MIX-02: Mixes questions from 2 exam sessions according to 50/50 ratio', () => {
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'orthography',
        'contextual',
        'paraphrase',
        'grammar_form',
        'sentence_composition',
        'comprehension_short',
        'info_retrieval',
        'task_based',
        'point',
        'quick_response',
      ],
      mode: 'Random',
      seed: 42,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    expect(result.generatedExam.blueprintConformant).toBe(true);
    expect(result.sourceSummary['2023-07']).toBeDefined();
    expect(result.sourceSummary['2023-12']).toBeDefined();
    // Both sources contributed questions
    expect(result.sourceSummary['2023-07']!.count).toBeGreaterThan(0);
    expect(result.sourceSummary['2023-12']!.count).toBeGreaterThan(0);
    expect(
      result.sourceSummary['2023-07']!.count +
        result.sourceSummary['2023-12']!.count,
    ).toBe(29); // totalQuestions in synthetic-n5-demo
  });

  it('MIX-03: Mixes questions from 3 or more exam sessions', () => {
    const sessions = ['2022-12', '2023-07', '2023-12'];
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: sessions,
      sourceWeights: { '2022-12': 1, '2023-07': 1, '2023-12': 1 },
      skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'orthography',
        'contextual',
        'paraphrase',
        'grammar_form',
        'sentence_composition',
        'comprehension_short',
        'info_retrieval',
        'task_based',
        'point',
        'quick_response',
      ],
      mode: 'Random',
      seed: 100,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, sessions);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    expect(result.sourceSummary['2022-12']!.count).toBeGreaterThan(0);
    expect(result.sourceSummary['2023-07']!.count).toBeGreaterThan(0);
    expect(result.sourceSummary['2023-12']!.count).toBeGreaterThan(0);
  });

  it('MIX-04: Respects non-equal source weights and ratios accurately', () => {
    const sessions = ['session_A', 'session_B'];
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: sessions,
      sourceWeights: { session_A: 0.75, session_B: 0.25 },
      skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'orthography',
        'contextual',
        'paraphrase',
        'grammar_form',
        'sentence_composition',
        'comprehension_short',
        'info_retrieval',
        'task_based',
        'point',
        'quick_response',
      ],
      mode: 'Random',
      seed: 777,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, sessions);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    const countA = result.sourceSummary.session_A!.count;
    const countB = result.sourceSummary.session_B!.count;

    // session_A has 3x weight of session_B, so countA should be significantly higher
    expect(countA).toBeGreaterThan(countB);
    expect(countA + countB).toBe(29);
  });

  it('MIX-05 & MIX-06: Supports mixing filtered by specific skills and mondaiTypes', () => {
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      mode: 'Random',
      seed: 123,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    // Only kanji_reading groups should be selected
    expect(result.selectedGroups.length).toBeGreaterThan(0);
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('kanji');
      expect(g.mondaiType).toBe('kanji_reading');
    }
  });

  it('MIX-07: Conforms to exact blueprint question counts', () => {
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'orthography',
        'contextual',
        'paraphrase',
        'grammar_form',
        'sentence_composition',
        'comprehension_short',
        'info_retrieval',
        'task_based',
        'point',
        'quick_response',
      ],
      mode: 'Random',
      seed: 999,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    const totalQuestions = result.selectedGroups.reduce(
      (sum, g) => sum + g.questionCount,
      0,
    );
    expect(totalQuestions).toBe(29);
  });

  it('MIX-08: Preserves reading passages and associated question groups intact', () => {
    const pool = createSyntheticPool(bp, ['2023-07', '2023-12'], {
      questionsPerGroup: { comprehension_short: 2 },
    });

    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07'],
      sourceWeights: { '2023-07': 1 },
      skills: ['reading'],
      mondaiTypes: ['comprehension_short'],
      mode: 'Random',
      seed: 456,
      blueprintVersion: 1,
    };

    const result = generateMixedExam({ blueprint: bp, config, pool });
    expect(result.selectedGroups.length).toBe(1); // 1 group of 2 questions satisfies 2 required
    const group = result.selectedGroups[0]!;
    expect(group.questions.length).toBe(2);
    expect(group.passage).toBeDefined();
  });

  it('MIX-09: Preserves audio, images, and listening question groups intact', () => {
    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['listening'],
      mondaiTypes: ['task_based', 'point', 'quick_response'],
      mode: 'Random',
      seed: 888,
      blueprintVersion: 1,
    };

    const result = generateMixedExam({ blueprint: bp, config, pool });
    for (const g of result.selectedGroups) {
      expect(g.skill).toBe('listening');
      expect(g.hasMedia).toBe(true);
      expect(g.mediaKeys).toContain('audio.mp3');
    }
  });

  it('MIX-10: Guarantees zero duplicate questions or groups across the entire exam', () => {
    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'],
      mondaiTypes: [
        'kanji_reading',
        'orthography',
        'contextual',
        'paraphrase',
        'grammar_form',
        'sentence_composition',
        'comprehension_short',
        'info_retrieval',
        'task_based',
        'point',
        'quick_response',
      ],
      mode: 'Random',
      seed: 12345,
      blueprintVersion: 1,
    };

    const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
    const result = generateMixedExam({ blueprint: bp, config, pool });

    const groupIds = result.selectedGroups.map((g) => g.groupId);
    expect(new Set(groupIds).size).toBe(groupIds.length);

    const questionIds = result.selectedGroups.flatMap((g) =>
      g.questions.map((q) => q.id),
    );
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it('MIX-12: Produces reproducible exams with same seed and different exams with different seeds', () => {
    const pool = createSyntheticPool(bp, ['2023-07', '2023-12'], {
      copiesPerSession: 10,
    });
    const configA: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji', 'vocabulary'],
      mondaiTypes: ['kanji_reading', 'orthography'],
      mode: 'Random',
      seed: 42,
      blueprintVersion: 1,
    };

    const resA1 = generateMixedExam({ blueprint: bp, config: configA, pool });
    const resA2 = generateMixedExam({ blueprint: bp, config: configA, pool });

    // Deterministic reproduction
    expect(resA1.generatedExam.configHash).toBe(resA2.generatedExam.configHash);
    expect(resA1.generatedExam.selectionGroupIds).toEqual(
      resA2.generatedExam.selectionGroupIds,
    );

    // Different seed produces different selection
    const configB = { ...configA, seed: 9999 };
    const resB = generateMixedExam({ blueprint: bp, config: configB, pool });
    expect(resB.generatedExam.selectionGroupIds).not.toEqual(
      resA1.generatedExam.selectionGroupIds,
    );
  });

  it('MIX-18: Filters candidate questions by target difficulty range', () => {
    // Session 2023-07 has difficulty 0.8, Session 2023-12 has difficulty 0.2
    const pool = [
      ...createSyntheticPool(bp, ['2023-07'], { difficultyRange: { '2023-07': 0.8 } }),
      ...createSyntheticPool(bp, ['2023-12'], { difficultyRange: { '2023-12': 0.2 } }),
    ];

    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 1, '2023-12': 1 },
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      mode: 'Custom',
      difficultyRange: [0.7, 0.9], // Only 2023-07 is in this range
      seed: 55,
      blueprintVersion: 1,
    };

    // Because 2023-12 cannot provide any questions in range [0.7, 0.9], shortage is raised
    expect(() =>
      generateMixedExam({ blueprint: bp, config, pool }),
    ).toThrow(PoolShortageError);
  });

  it('MIX-19: Limits questions user has encountered past maxExposure', () => {
    const pool = createSyntheticPool(bp, ['2023-07', '2023-12'], {
      exposureCount: 5, // All questions seen 5 times
    });

    const config: MixConfig = {
      level: 'N5',
      sourceSessions: ['2023-07', '2023-12'],
      sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
      skills: ['kanji'],
      mondaiTypes: ['kanji_reading'],
      mode: 'Custom',
      maxExposure: 3, // Filters out questions with exposure >= 3
      seed: 12,
      blueprintVersion: 1,
    };

    // Should raise shortage because all candidates are filtered out by maxExposure
    expect(() =>
      generateMixedExam({ blueprint: bp, config, pool }),
    ).toThrow(PoolShortageError);
  });

  describe('7 Mix Modes verification', () => {
    it.each([
      'Random',
      'Balanced',
      'Weakness',
      'Unseen',
      'Challenge',
      'Revision',
      'Custom',
    ] as const)('successfully generates exam under mode: %s', (mode) => {
      const pool = createSyntheticPool(bp, ['2023-07', '2023-12']);
      const config: MixConfig = {
        level: 'N5',
        sourceSessions: ['2023-07', '2023-12'],
        sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
        skills: ['kanji', 'vocabulary'],
        mondaiTypes: ['kanji_reading', 'orthography'],
        mode,
        seed: 77,
        blueprintVersion: 1,
      };

      const result = generateMixedExam({ blueprint: bp, config, pool });
      expect(result.generatedExam.blueprintConformant).toBe(true);
      expect(result.selectedGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Licensing and Rule 5 filters', () => {
    it('rejects candidate questions with remixAllowed=false', () => {
      const pool = createSyntheticPool(bp, ['2023-07', '2023-12'], {
        remixAllowed: false,
      });
      const config: MixConfig = {
        level: 'N5',
        sourceSessions: ['2023-07', '2023-12'],
        sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        mode: 'Random',
        seed: 10,
        blueprintVersion: 1,
      };

      expect(() =>
        generateMixedExam({ blueprint: bp, config, pool }),
      ).toThrow(PoolShortageError);
    });

    it('rejects candidate questions with unapproved status or missing answer keys', () => {
      const poolUnapproved = createSyntheticPool(bp, ['2023-07', '2023-12'], {
        isApproved: false,
      });
      const poolNoAnswers = createSyntheticPool(bp, ['2023-07', '2023-12'], {
        hasAnswerKeys: false,
      });

      const config: MixConfig = {
        level: 'N5',
        sourceSessions: ['2023-07', '2023-12'],
        sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        mode: 'Random',
        seed: 10,
        blueprintVersion: 1,
      };

      expect(() =>
        generateMixedExam({ blueprint: bp, config, pool: poolUnapproved }),
      ).toThrow(PoolShortageError);

      expect(() =>
        generateMixedExam({ blueprint: bp, config, pool: poolNoAnswers }),
      ).toThrow(PoolShortageError);
    });
  });

  describe('Pool Shortage and ratio preservation (Acceptance 3)', () => {
    it('throws PoolShortageError with shortage details instead of silently distorting ratios', () => {
      // Create empty pool
      const emptyPool: CandidateGroup[] = [];
      const config: MixConfig = {
        level: 'N5',
        sourceSessions: ['2023-07', '2023-12'],
        sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
        skills: ['kanji'],
        mondaiTypes: ['kanji_reading'],
        mode: 'Random',
        seed: 10,
        blueprintVersion: 1,
      };

      try {
        generateMixedExam({ blueprint: bp, config, pool: emptyPool });
        expect.unreachable('Should have thrown PoolShortageError');
      } catch (err) {
        expect(err).toBeInstanceOf(PoolShortageError);
        const shortageErr = err as PoolShortageError;
        expect(shortageErr.code).toBe('POOL_SHORTAGE');
        expect(shortageErr.details.length).toBeGreaterThan(0);
        expect(shortageErr.details[0]!.mondaiType).toBe('kanji_reading');
        expect(shortageErr.details[0]!.shortage).toBeGreaterThan(0);
      }
    });
  });
});
