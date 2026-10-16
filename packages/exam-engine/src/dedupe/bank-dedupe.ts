import type { QuestionSimilarityResult } from '@jlpt/schema';
import {
  computeQuestionSimilarity,
  type ComparableQuestion,
} from './similarity.js';

export interface BankDedupeOptions {
  similarityThreshold?: number;
  weights?: { stem: number; options: number };
}

/**
 * Finds duplicate or near-duplicate questions within the question bank (QB-12).
 */
export function findDuplicatesInBank(
  questions: ComparableQuestion[],
  options: BankDedupeOptions = {},
): QuestionSimilarityResult[] {
  const threshold = options.similarityThreshold ?? 0.85;
  const weights = options.weights ?? { stem: 0.7, options: 0.3 };
  const duplicates: QuestionSimilarityResult[] = [];

  for (let i = 0; i < questions.length; i++) {
    const qA = questions[i]!;
    for (let j = i + 1; j < questions.length; j++) {
      const qB = questions[j]!;
      const sim = computeQuestionSimilarity(qA, qB, weights);
      if (sim.overallSimilarity >= threshold) {
        duplicates.push(sim);
      }
    }
  }

  return duplicates.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
}
