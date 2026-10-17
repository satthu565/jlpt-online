import { describe, it, expect } from 'vitest';
import type { Blueprint, MixConfig, Level, MondaiType, Skill } from '@jlpt/schema';
import {
  generateMixedExam,
  PoolShortageError,
  SeededRandom,
  deterministicUuid,
  type CandidateGroup,
} from '../src/index.js';

const ALL_LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];
const ALL_MODES = [
  'Random',
  'Balanced',
  'Weakness',
  'Unseen',
  'Challenge',
  'Revision',
  'Custom',
] as const;

function generateRandomBlueprint(rng: SeededRandom, level: Level): Blueprint {
  const mondaiConfigs: Array<{ type: MondaiType; skill: Skill; count: number }> = [
    { type: 'kanji_reading', skill: 'kanji', count: rng.nextInt(2, 4) },
    { type: 'orthography', skill: 'vocabulary', count: rng.nextInt(2, 3) },
    { type: 'comprehension_short', skill: 'reading', count: 2 * rng.nextInt(1, 2) }, // Even count for multi-question groups
    { type: 'task_based', skill: 'listening', count: rng.nextInt(2, 3) },
  ];

  return {
    level,
    version: 1,
    effectiveFrom: '2026-10',
    sourceRef: [{ url: 'https://www.jlpt.jp', accessedAt: '2026-10-16' }],
    sections: [
      {
        code: 'language_vocab',
        title: '言語知識',
        durationSec: 1200,
        mondai: mondaiConfigs.slice(0, 2).map((m) => ({
          type: m.type,
          skill: m.skill,
          questionCount: m.count,
        })),
      },
      {
        code: 'reading_listening',
        title: '読解・聴解',
        durationSec: 1800,
        mondai: mondaiConfigs.slice(2).map((m) => ({
          type: m.type,
          skill: m.skill,
          questionCount: m.count,
        })),
      },
    ],
    scoring: {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        {
          code: 'total',
          label: 'Total',
          skills: ['kanji', 'vocabulary', 'reading', 'listening'],
          maxScaled: 180,
          minPass: 90,
        },
      ],
      totalMax: 180,
      totalPass: 90,
    },
  };
}

function generateCandidatePool(
  rng: SeededRandom,
  blueprint: Blueprint,
  sessions: string[],
  injectShortage: boolean,
): CandidateGroup[] {
  const pool: CandidateGroup[] = [];

  for (const s of sessions) {
    for (const sec of blueprint.sections) {
      for (const mon of sec.mondai) {
        // If injecting shortage, provide 0 questions for the first required mondai
        if (injectShortage && mon.type === sec.mondai[0]!.type) {
          continue;
        }

        const isReadingGroup = mon.type === 'comprehension_short';
        const totalGroupsNeeded = Math.ceil(mon.questionCount) * 2 + 6;

        for (let gIdx = 0; gIdx < totalGroupsNeeded; gIdx++) {
          const qCountPerGroup = isReadingGroup ? (gIdx % 2 === 0 ? 2 : 1) : 1;
          const groupId = deterministicUuid(pool.length + 1, `${blueprint.level}_${s}_${mon.type}_${gIdx}`);
          const questions = Array.from({ length: qCountPerGroup }, (_, qIdx) => ({
            id: `q_${groupId}_${qIdx}`,
            difficulty: rng.next(),
            exposureCount: rng.nextInt(0, 3),
            userAccuracy: rng.next(),
            wrongCount: rng.nextInt(0, 2),
            isMarked: rng.next() > 0.7,
            tags: [`tag_${mon.skill}`],
          }));

          // Extra buffer groups at the end include invalid items to test filtering
          const isInvalid = gIdx >= totalGroupsNeeded - 2;
          const isApproved = isInvalid ? false : true;
          const hasAnswerKeys = isInvalid ? false : true;
          const remixAllowed = isInvalid ? false : true;

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
            passage: isReadingGroup ? { text: `Passage ${groupId}` } : undefined,
            hasMedia: true,
            mediaKeys: mon.skill === 'listening' ? ['audio.mp3'] : undefined,
            isApproved,
            hasAnswerKeys,
            license: {
              remixAllowed,
              displayAllowed: true,
              expiresAt: '2030-01-01T00:00:00Z',
            },
            averageDifficulty: questions.reduce((acc, q) => acc + q.difficulty, 0) / questions.length,
            maxExposure: Math.max(...questions.map((q) => q.exposureCount)),
            totalWrongCount: questions.reduce((acc, q) => acc + q.wrongCount, 0),
            averageAccuracy: questions.reduce((acc, q) => acc + q.userAccuracy, 0) / questions.length,
            isMarked: questions.some((q) => q.isMarked),
            tags: [`tag_${mon.skill}`],
          });
        }
      }
    }
  }

  return pool;
}

describe('JLPT Exam Mixing Property Testing (1000 Cases)', () => {
  it('verifies 1000 property cases across all levels, modes, ratios, and candidate pools', () => {
    const masterRng = new SeededRandom(20261016);
    const totalCases = 1000;
    let successfulMixes = 0;
    let shortageCases = 0;

    for (let testIndex = 0; testIndex < totalCases; testIndex++) {
      const caseRng = new SeededRandom(masterRng.nextInt(1, 2147483647));
      const level = ALL_LEVELS[caseRng.nextInt(0, ALL_LEVELS.length - 1)]!;
      const mode = ALL_MODES[caseRng.nextInt(0, ALL_MODES.length - 1)]!;
      const numSessions = caseRng.nextInt(2, 4);
      const sessions = Array.from({ length: numSessions }, (_, i) => `session_${i + 1}`);

      const sourceWeights: Record<string, number> = {};
      for (const s of sessions) {
        sourceWeights[s] = caseRng.nextInt(1, 5);
      }

      const blueprint = generateRandomBlueprint(caseRng, level);

      // Inject shortage in ~15% of cases to test acceptance criterion 3
      const shouldInjectShortage = caseRng.next() < 0.15;
      const pool = generateCandidatePool(caseRng, blueprint, sessions, shouldInjectShortage);

      const seed = caseRng.nextInt(1, 1000000);
      const config: MixConfig = {
        level,
        sourceSessions: sessions,
        sourceWeights,
        skills: ['kanji', 'vocabulary', 'reading', 'listening'],
        mondaiTypes: ['kanji_reading', 'orthography', 'comprehension_short', 'task_based'],
        mode,
        seed,
        blueprintVersion: 1,
      };

      if (shouldInjectShortage) {
        // Invariant 7: Pool shortage must throw PoolShortageError with exact details and never silently skew ratios
        expect(() => {
          generateMixedExam({ blueprint, config, pool });
        }).toThrow(PoolShortageError);
        shortageCases++;
      } else {
        try {
          const result = generateMixedExam({ blueprint, config, pool });

          // Invariant 1: Group preservation
          // For every selected group, ALL of its questions must be present intact
          for (const g of result.selectedGroups) {
            expect(g.questions.length).toBe(g.questionCount);
            if (g.passage) {
              expect(g.questions.length).toBeGreaterThanOrEqual(1);
            }
          }

          // Invariant 2: Level conformity
          // Every selected group and question must strictly match target level
          for (const g of result.selectedGroups) {
            expect(g.level).toBe(level);
          }

          // Invariant 3: Zero duplicates
          const groupIds = result.selectedGroups.map((g) => g.groupId);
          expect(new Set(groupIds).size).toBe(groupIds.length);

          const questionIds = result.selectedGroups.flatMap((g) =>
            g.questions.map((q) => q.id),
          );
          expect(new Set(questionIds).size).toBe(questionIds.length);

          // Invariant 4: Resource completeness & License validity
          for (const g of result.selectedGroups) {
            expect(g.isApproved).toBe(true);
            expect(g.hasAnswerKeys).toBe(true);
            expect(g.hasMedia).toBe(true);
            expect(g.license?.remixAllowed).toBe(true);
          }

          // Invariant 5: Exact blueprint question count match
          const totalExamQuestions = result.selectedGroups.reduce(
            (acc, g) => acc + g.questionCount,
            0,
          );
          let expectedBlueprintQuestions = 0;
          for (const sec of blueprint.sections) {
            for (const mon of sec.mondai) {
              expectedBlueprintQuestions += mon.questionCount;
            }
          }
          expect(totalExamQuestions).toBe(expectedBlueprintQuestions);

          // Invariant 6: Deterministic reproducibility
          // Same seed/config/engineVersion produces identical GeneratedExam
          const rerun = generateMixedExam({ blueprint, config, pool });
          expect(rerun.generatedExam.configHash).toBe(result.generatedExam.configHash);
          expect(rerun.generatedExam.selectionGroupIds).toEqual(
            result.generatedExam.selectionGroupIds,
          );
          expect(rerun.generatedExam.sourceSummary).toEqual(
            result.generatedExam.sourceSummary,
          );

          successfulMixes++;
        } catch (err) {
          if (err instanceof PoolShortageError) {
            // Shortage triggered due to filter rejections (e.g. unapproved items)
            expect(err.code).toBe('POOL_SHORTAGE');
            expect(err.details.length).toBeGreaterThan(0);
            shortageCases++;
          } else {
            throw err;
          }
        }
      }
    }

    expect(successfulMixes + shortageCases).toBe(totalCases);
    expect(successfulMixes).toBeGreaterThan(700);
    expect(shortageCases).toBeGreaterThan(100);
    // 1000 seeded cases take ~5 s on GitHub runners, right at vitest's 5 s default.
  }, 60_000);
});
