import type {
  BlueprintScoring,
  ExamAnswerKey,
  MondaiType,
  Result,
  ResultFlag,
  Skill,
} from '@jlpt/schema';
import type { MondaiStats, TargetEvaluation } from './types.js';

export const REFERENCE_SCORING_DISCLAIMER =
  'Điểm quy đổi chỉ mang tính chất tham khảo (Linear Reference Scaling), không thay thế chứng chỉ JLPT chính thức.';

export interface ScoreResult {
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
}

/**
 * Calculates raw score and percentage from answer map (SCORE-01, SCORE-02, SCORE-03)
 */
export function calculateRawScore(
  answers: Record<string, number>,
  correctKey: Record<string, number>,
): ScoreResult {
  const totalQuestions = Object.keys(correctKey).length;
  if (totalQuestions === 0) {
    return { correctCount: 0, totalQuestions: 0, scorePercentage: 0 };
  }

  let correctCount = 0;
  for (const [qId, correctOption] of Object.entries(correctKey)) {
    if (answers[qId] === correctOption) {
      correctCount += 1;
    }
  }

  return {
    correctCount,
    totalQuestions,
    scorePercentage: Math.round((correctCount / totalQuestions) * 100),
  };
}

import { ESTIMATED_LABEL } from './score-estimation.js';
export * from './score-estimation.js';


/**
 * Calculates statistics broken down by mondai type (SCORE-05)
 */
export function calculateMondaiStats(
  userAnswers: number[],
  answerKey: ExamAnswerKey,
): MondaiStats[] {
  const map = new Map<MondaiType, { correct: number; total: number; wrong: number; blank: number }>();

  const total = answerKey.keys.length;
  for (let i = 0; i < total; i++) {
    const mondaiType = answerKey.mondaiTypes[i];
    if (!mondaiType) continue;

    let stats = map.get(mondaiType);
    if (!stats) {
      stats = { correct: 0, total: 0, wrong: 0, blank: 0 };
      map.set(mondaiType, stats);
    }

    stats.total += 1;
    const userVal = userAnswers[i] ?? 0;
    const correctVal = answerKey.keys[i];

    if (userVal === 0) {
      stats.blank += 1;
    } else if (userVal === correctVal) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }
  }

  return Array.from(map.entries()).map(([mondaiType, stats]) => ({
    mondaiType,
    correct: stats.correct,
    total: stats.total,
    wrong: stats.wrong,
    blank: stats.blank,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));
}

/**
 * Evaluates target score achievement for practice mode (SCORE-13)
 */
export function calculateTargetEvaluation(
  totalScaled: number,
  targetScore: number,
  totalPass: number,
): TargetEvaluation {
  const reached = totalScaled >= targetScore;
  const margin = totalScaled - targetScore;
  const percentageOfTarget =
    targetScore > 0 ? Math.round((totalScaled / targetScore) * 100) : 100;
  const passedStandard = totalScaled >= totalPass;

  return {
    targetScore,
    actualScore: totalScaled,
    reached,
    margin,
    percentageOfTarget,
    passThreshold: totalPass,
    passedStandard,
  };
}

export interface StandardExamResultOptions {
  durationSec?: number;
  flags?: ResultFlag[];
  targetScore?: number;
}

/**
 * Calculates complete exam result with linear reference scaling and analytics
 * (SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-13, Acceptance 2)
 */
export function calculateStandardExamResult(
  userAnswers: number[],
  answerKey: ExamAnswerKey,
  scoring: BlueprintScoring,
  options?: StandardExamResultOptions,
): Result & { byMondai?: MondaiStats[]; targetEvaluation?: TargetEvaluation } {
  const total = answerKey.keys.length;
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  const skillTotals: Record<Skill, { correct: number; total: number }> = {
    kanji: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
  };

  for (let i = 0; i < total; i++) {
    const userVal = userAnswers[i] ?? 0;
    const correctVal = answerKey.keys[i];
    const skill = answerKey.skills[i] as Skill;

    if (skillTotals[skill]) {
      skillTotals[skill].total += 1;
    }

    if (userVal === 0) {
      blank += 1;
    } else if (userVal === correctVal) {
      correct += 1;
      if (skillTotals[skill]) {
        skillTotals[skill].correct += 1;
      }
    } else {
      wrong += 1;
    }
  }

  // bySection stats
  const bySection = answerKey.sectionRanges.map(([start, end], idx) => {
    let sectionCorrect = 0;
    const sectionTotal = end - start + 1;
    for (let i = start; i <= end; i++) {
      if ((userAnswers[i] ?? 0) === answerKey.keys[i]) {
        sectionCorrect += 1;
      }
    }
    return {
      code: `section_${idx + 1}`,
      correct: sectionCorrect,
      total: sectionTotal,
    };
  });

  // bySkill stats (SCORE-04)
  const bySkill = (Object.keys(skillTotals) as Skill[])
    .filter((skill) => skillTotals[skill].total > 0)
    .map((skill) => ({
      skill,
      correct: skillTotals[skill].correct,
      total: skillTotals[skill].total,
    }));

  // byMondai stats (SCORE-05)
  const byMondai = calculateMondaiStats(userAnswers, answerKey);

  // Scoring sections with linear reference scaling (Acceptance 2)
  const scoredSections = scoring.scoringSections.map((sec) => {
    let raw = 0;
    let rawMax = 0;
    for (let i = 0; i < total; i++) {
      const skill = answerKey.skills[i] as Skill;
      if (sec.skills.includes(skill)) {
        rawMax += 1;
        if ((userAnswers[i] ?? 0) === answerKey.keys[i]) {
          raw += 1;
        }
      }
    }
    const scaled = rawMax > 0 ? Math.round((raw / rawMax) * sec.maxScaled) : 0;
    const passed = scaled >= sec.minPass;
    return {
      code: sec.code,
      label: sec.label,
      raw,
      rawMax,
      scaled,
      maxScaled: sec.maxScaled,
      minPass: sec.minPass,
      passed,
    };
  });

  const totalScaled = scoredSections.reduce((acc, s) => acc + s.scaled, 0);
  const totalMax = scoredSections.reduce((acc, s) => acc + s.maxScaled, 0);
  const allSectionsPassed = scoredSections.every((s) => s.passed);
  const passEstimate = totalScaled >= scoring.totalPass && allSectionsPassed;
  const failedSections = scoredSections.filter((s) => !s.passed).map((s) => s.code);

  // target evaluation (SCORE-13)
  const targetEvaluation = options?.targetScore
    ? calculateTargetEvaluation(totalScaled, options.targetScore, scoring.totalPass)
    : undefined;

  const result: Result & { byMondai?: MondaiStats[]; targetEvaluation?: TargetEvaluation } = {
    totals: {
      correct,
      wrong,
      blank,
      total,
    },
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    durationSec: options?.durationSec ?? 0,
    bySection,
    bySkill,
    byMondai,
    targetEvaluation,
    scoring: {
      method: 'linear_reference',
      sections: scoredSections,
      total: totalScaled,
      totalMax,
      totalPass: scoring.totalPass,
      passEstimate,
      disclaimer: REFERENCE_SCORING_DISCLAIMER,
      isEstimated: true,
      label: ESTIMATED_LABEL,
      failedSections,
    },
    flags: options?.flags ?? [],
  };

  return result;
}
