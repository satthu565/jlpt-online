import type {
  CrossSourceDuplicateReport,
  QuestionCluster,
  QuestionSimilarityResult,
} from '@jlpt/schema';
import {
  classifyMatchType,
  computeQuestionSimilarity,
  type ComparableQuestion,
} from './similarity.js';

export interface CrossSourceDetectionOptions {
  similarityThreshold?: number;
  weights?: { stem: number; options: number };
}

/**
 * Detects questions that appear across different test sources/sessions (MIX-11).
 */
export function detectCrossSourceDuplicates(
  questions: ComparableQuestion[],
  options: CrossSourceDetectionOptions = {},
): CrossSourceDuplicateReport {
  const threshold = options.similarityThreshold ?? 0.80;
  const weights = options.weights ?? { stem: 0.7, options: 0.3 };

  const pairs: QuestionSimilarityResult[] = [];
  const adjacency = new Map<string, Set<string>>();

  for (let i = 0; i < questions.length; i++) {
    const qA = questions[i]!;
    for (let j = i + 1; j < questions.length; j++) {
      const qB = questions[j]!;

      // Only check if from different sources/sessions
      const sourceA = qA.sourceSession ?? qA.sourceId;
      const sourceB = qB.sourceSession ?? qB.sourceId;

      if (sourceA && sourceB && sourceA === sourceB) {
        continue;
      }

      const simResult = computeQuestionSimilarity(qA, qB, weights);
      if (simResult.overallSimilarity >= threshold) {
        pairs.push(simResult);

        // Build adjacency for clustering
        if (!adjacency.has(qA.id)) adjacency.set(qA.id, new Set());
        if (!adjacency.has(qB.id)) adjacency.set(qB.id, new Set());
        adjacency.get(qA.id)!.add(qB.id);
        adjacency.get(qB.id)!.add(qA.id);
      }
    }
  }

  // Find connected components (clusters)
  const visited = new Set<string>();
  const clusters: QuestionCluster[] = [];
  const qMap = new Map<string, ComparableQuestion>(questions.map((q) => [q.id, q]));

  for (const qId of adjacency.keys()) {
    if (visited.has(qId)) continue;

    const component: string[] = [];
    const queue = [qId];
    visited.add(qId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);
      for (const neighbor of adjacency.get(curr) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const clusterSources = Array.from(
      new Set(
        component
          .map((id) => qMap.get(id)?.sourceSession ?? qMap.get(id)?.sourceId)
          .filter((s): s is string => Boolean(s)),
      ),
    );

    // Find highest similarity among cluster pairs
    let highestSim = 0;
    for (const p of pairs) {
      if (component.includes(p.questionIdA) && component.includes(p.questionIdB)) {
        if (p.overallSimilarity > highestSim) {
          highestSim = p.overallSimilarity;
        }
      }
    }

    clusters.push({
      clusterId: `cluster_${clusters.length + 1}`,
      canonicalQuestionId: component[0]!,
      memberQuestionIds: component,
      sources: clusterSources,
      highestSimilarity: highestSim,
      matchType: classifyMatchType(highestSim),
    });
  }

  return {
    totalExamined: questions.length,
    duplicatePairCount: pairs.length,
    clusters,
    pairs,
  };
}
