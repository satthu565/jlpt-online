import type { DuplicateMatchType, QuestionSimilarityResult } from '@jlpt/schema';
import { extractCharacterNgrams, normalizeJapaneseText } from './text-normalizer.js';

export interface ComparableQuestion {
  id: string;
  stem: string;
  options?: string[];
  sourceId?: string;
  sourceSession?: string;
}

/**
 * Calculates Jaccard similarity between two sets.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardIndex<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount += 1;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount > 0 ? Number((intersectionCount / unionCount).toFixed(4)) : 0.0;
}

/**
 * Calculates character n-gram text similarity between two Japanese strings.
 */
export function calculateTextSimilarity(textA: string, textB: string, n = 2): number {
  const normA = normalizeJapaneseText(textA);
  const normB = normalizeJapaneseText(textB);

  if (normA === normB) {
    return 1.0;
  }

  const ngramsA = extractCharacterNgrams(textA, n);
  const ngramsB = extractCharacterNgrams(textB, n);

  return calculateJaccardIndex(ngramsA, ngramsB);
}

/**
 * Calculates similarity between two option sets.
 * Uses maximum matching alignment.
 */
export function calculateOptionsSimilarity(optionsA: string[] = [], optionsB: string[] = []): number {
  if (optionsA.length === 0 && optionsB.length === 0) return 1.0;
  if (optionsA.length === 0 || optionsB.length === 0) return 0.0;

  let totalMatchScore = 0;
  for (const optA of optionsA) {
    let maxOptScore = 0;
    for (const optB of optionsB) {
      const score = calculateTextSimilarity(optA, optB);
      if (score > maxOptScore) {
        maxOptScore = score;
      }
    }
    totalMatchScore += maxOptScore;
  }

  const count = Math.max(optionsA.length, optionsB.length);
  return Number((totalMatchScore / count).toFixed(4));
}

export function classifyMatchType(similarity: number): DuplicateMatchType {
  if (similarity >= 1.0) {
    return 'EXACT';
  } else if (similarity >= 0.82) {
    return 'NEAR_DUPLICATE';
  } else if (similarity >= 0.60) {
    return 'SIMILAR';
  } else {
    return 'DISTINCT';
  }
}

/**
 * Computes question similarity comparing stem and options (QB-12, MIX-11).
 */
export function computeQuestionSimilarity(
  qA: ComparableQuestion,
  qB: ComparableQuestion,
  weights: { stem: number; options: number } = { stem: 0.7, options: 0.3 },
): QuestionSimilarityResult {
  const stemSim = calculateTextSimilarity(qA.stem, qB.stem);

  let overallSim: number;
  let optionsSim = 1.0;

  if (qA.options && qB.options && qA.options.length > 0 && qB.options.length > 0) {
    optionsSim = calculateOptionsSimilarity(qA.options, qB.options);
    overallSim = Number((stemSim * weights.stem + optionsSim * weights.options).toFixed(4));
  } else {
    overallSim = stemSim;
  }

  const matchType = classifyMatchType(overallSim);
  const isCrossSource =
    qA.sourceId !== undefined &&
    qB.sourceId !== undefined &&
    qA.sourceId !== qB.sourceId;

  return {
    questionIdA: qA.id,
    questionIdB: qB.id,
    sourceA: qA.sourceSession ?? qA.sourceId,
    sourceB: qB.sourceSession ?? qB.sourceId,
    stemSimilarity: stemSim,
    optionsSimilarity: optionsSim,
    overallSimilarity: overallSim,
    matchType,
    isCrossSource,
  };
}
