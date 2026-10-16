import type {
  DifficultyLabel,
  ItemDifficultyScale,
  Level,
} from '@jlpt/schema';
import type { EmpiricalDifficultyStats } from '@jlpt/schema';

/**
 * Assigns difficulty scale label based on difficulty score (0..100) (QB-10).
 */
export function scoreToDifficultyScale(score: number): ItemDifficultyScale {
  if (score <= 30) {
    return 'easy';
  } else if (score <= 60) {
    return 'medium';
  } else if (score <= 80) {
    return 'hard';
  } else {
    return 'very_hard';
  }
}

/**
 * Assigns a structured difficulty label combining empirical performance
 * or initial estimate (QB-10).
 */
export function assignDifficultyLabel(
  empirical: EmpiricalDifficultyStats,
  fallbackScore = 50,
  level: Level = 'N3',
): DifficultyLabel {
  const isEmpirical = empirical.hasConclusion;
  const score = isEmpirical ? empirical.difficultyIndex : fallbackScore;
  const scale = scoreToDifficultyScale(score);

  let confidence: 'uncalibrated' | 'moderate' | 'high';
  if (!isEmpirical) {
    confidence = 'uncalibrated';
  } else if (empirical.sampleSize >= 100) {
    confidence = 'high';
  } else {
    confidence = 'moderate';
  }

  return {
    level,
    scale,
    score,
    source: isEmpirical ? 'empirical' : 'estimated',
    confidence,
  };
}
