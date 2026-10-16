import type { EmpiricalDifficultyStats } from '@jlpt/schema';
import type { QuestionAttemptRecord } from './types.js';

export const DEFAULT_MIN_SAMPLE_SIZE = 30;

/**
 * Calculates empirical difficulty from attempt history (QB-10, QB-19, Acceptance 2).
 *
 * Acceptance 2: Difficulty đủ mẫu mới có kết luận.
 * Requires at least `minSampleSize` (default 30) attempts to produce a definitive conclusion.
 */
export function calculateEmpiricalDifficulty(
  questionId: string,
  attempts: QuestionAttemptRecord[],
  minSampleSize = DEFAULT_MIN_SAMPLE_SIZE,
): EmpiricalDifficultyStats {
  const totalAttempts = attempts.length;
  let correctAttempts = 0;
  let wrongAttempts = 0;
  let blankAttempts = 0;

  for (const a of attempts) {
    if (a.isCorrect) {
      correctAttempts += 1;
    } else if (a.selectedOption === 0) {
      blankAttempts += 1;
      wrongAttempts += 1;
    } else {
      wrongAttempts += 1;
    }
  }

  const hasConclusion = totalAttempts >= minSampleSize;
  const status = hasConclusion ? ('CALIBRATED' as const) : ('INSUFFICIENT_DATA' as const);

  if (totalAttempts === 0) {
    return {
      questionId,
      totalAttempts: 0,
      correctAttempts: 0,
      wrongAttempts: 0,
      blankAttempts: 0,
      errorRate: 0.5,
      difficultyIndex: 50,
      standardError: 0.5,
      confidenceInterval: [0, 100],
      hasConclusion: false,
      status: 'INSUFFICIENT_DATA',
      sampleSize: 0,
      requiredSampleSize: minSampleSize,
      updatedAt: new Date().toISOString(),
    };
  }

  // Error rate: proportion of attempts that answered incorrectly (0.0 = very easy, 1.0 = very hard)
  const errorRate = wrongAttempts / totalAttempts;
  const difficultyIndex = Math.round(errorRate * 100);

  // Standard error of proportion
  const standardError = Math.sqrt((errorRate * (1 - errorRate)) / totalAttempts);

  // Wilson score interval 95% (z = 1.96)
  const z = 1.96;
  const z2 = z * z;
  const denominator = totalAttempts + z2;
  const center = (wrongAttempts + z2 / 2) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt((wrongAttempts * (totalAttempts - wrongAttempts)) / totalAttempts + z2 / 4);

  const lowerBound = Math.max(0, Math.round((center - margin) * 100));
  const upperBound = Math.min(100, Math.round((center + margin) * 100));

  return {
    questionId,
    totalAttempts,
    correctAttempts,
    wrongAttempts,
    blankAttempts,
    errorRate: Number(errorRate.toFixed(4)),
    difficultyIndex,
    standardError: Number(standardError.toFixed(4)),
    confidenceInterval: [lowerBound, upperBound],
    hasConclusion,
    status,
    sampleSize: totalAttempts,
    requiredSampleSize: minSampleSize,
    updatedAt: new Date().toISOString(),
  };
}
