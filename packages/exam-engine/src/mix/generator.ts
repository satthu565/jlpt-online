import {
  MixConfigSchema,
  GeneratedExamSchema,
  type MixConfig,
  type GeneratedExam,
} from '@jlpt/schema';
import {
  PoolShortageError,
  type CandidateGroup,
  type ShortageDetail,
} from '../types.js';
import {
  SeededRandom,
  canonicalConfigHash,
  deterministicUuid,
  allocateIntegerQuotas,
} from './prng.js';
import type { MixedExamGenerateParams, MixedExamResult } from './types.js';

/**
 * Normalizes a candidate group to ensure all required fields and metrics are populated.
 */
export function normalizeCandidateGroup(
  g: Partial<CandidateGroup> & { groupId: string },
): CandidateGroup {
  const questions = g.questions ?? [];
  const questionCount = g.questionCount ?? questions.length;

  let totalDiff = 0;
  let diffCount = 0;
  let maxExposure = 0;
  let totalWrong = 0;
  let totalAcc = 0;
  let accCount = 0;
  let isMarked = false;

  for (const q of questions) {
    if (q.difficulty !== undefined) {
      totalDiff += q.difficulty;
      diffCount++;
    }
    if (q.exposureCount !== undefined && q.exposureCount > maxExposure) {
      maxExposure = q.exposureCount;
    }
    if (q.wrongCount !== undefined) {
      totalWrong += q.wrongCount;
    }
    if (q.userAccuracy !== undefined) {
      totalAcc += q.userAccuracy;
      accCount++;
    }
    if (q.isMarked) {
      isMarked = true;
    }
  }

  const averageDifficulty =
    g.averageDifficulty ?? (diffCount > 0 ? totalDiff / diffCount : 0.5);
  const averageAccuracy =
    g.averageAccuracy ?? (accCount > 0 ? totalAcc / accCount : 1.0);

  return {
    groupId: g.groupId,
    sourceSession: g.sourceSession ?? 'unknown',
    sourceId: g.sourceId,
    level: g.level ?? 'N5',
    sectionCode: g.sectionCode,
    mondaiType: g.mondaiType ?? 'kanji_reading',
    skill: g.skill ?? 'kanji',
    questions,
    questionCount: questionCount > 0 ? questionCount : 1,
    passage: g.passage,
    hasMedia: g.hasMedia ?? false,
    mediaKeys: g.mediaKeys,
    isApproved: g.isApproved ?? true,
    hasAnswerKeys: g.hasAnswerKeys ?? true,
    license: g.license,
    averageDifficulty,
    tags: g.tags,
    maxExposure: g.maxExposure ?? maxExposure,
    totalWrongCount: g.totalWrongCount ?? totalWrong,
    averageAccuracy,
    isMarked: g.isMarked ?? isMarked,
  };
}

/**
 * Pruned branch-and-bound subset-sum to find a combination of atomic question groups
 * that sums to exactly targetCount without splitting any group.
 */
export function findSubsetSumGroups(
  candidates: CandidateGroup[],
  targetCount: number,
): CandidateGroup[] | null {
  if (targetCount === 0) return [];
  if (candidates.length === 0) return null;

  const n = candidates.length;
  const suffixSum = new Array<number>(n);
  let acc = 0;
  for (let i = n - 1; i >= 0; i--) {
    acc += candidates[i]!.questionCount;
    suffixSum[i] = acc;
  }

  if (acc < targetCount) return null;

  const memo = new Set<string>();

  function search(index: number, remaining: number): CandidateGroup[] | null {
    if (remaining === 0) return [];
    if (index >= n || remaining < 0) return null;
    if (suffixSum[index]! < remaining) return null;

    const key = `${index}:${remaining}`;
    if (memo.has(key)) return null;

    const current = candidates[index]!;

    // 1. Include current group (preserves the whole group intact)
    if (current.questionCount <= remaining) {
      const sub = search(index + 1, remaining - current.questionCount);
      if (sub !== null) {
        return [current, ...sub];
      }
    }

    // 2. Exclude current group
    const skip = search(index + 1, remaining);
    if (skip !== null) {
      return skip;
    }

    memo.add(key);
    return null;
  }

  return search(0, targetCount);
}

/**
 * Validates whether a candidate group satisfies Rule 5 and licensing criteria.
 */
function isGroupEligibleForMixing(
  g: CandidateGroup,
  targetLevel: string,
  now: Date,
): boolean {
  // Rule 1: Level match
  if (g.level !== targetLevel) return false;

  // Rule 5: Approved questions with verified answer keys and media
  if (!g.isApproved) return false;
  if (!g.hasAnswerKeys) return false;
  if (g.hasMedia === false && (g.mediaKeys && g.mediaKeys.length > 0)) {
    return false;
  }

  // Licensing rights check: remixAllowed must be true, license must not be expired
  if (g.license) {
    if (g.license.remixAllowed === false) return false;
    if (g.license.expiresAt) {
      const expiry = new Date(g.license.expiresAt).getTime();
      if (expiry <= now.getTime()) return false;
    }
  }

  return true;
}

/**
 * Scores a candidate group based on MixMode and pseudo-random jitter.
 */
function scoreGroupForMode(
  g: CandidateGroup,
  mode: MixConfig['mode'],
  rng: SeededRandom,
): number {
  const jitter = rng.next();

  switch (mode) {
    case 'Random':
      return jitter;

    case 'Balanced': {
      // Prioritize difficulty closest to 0.5 (medium)
      const diffDist = Math.abs((g.averageDifficulty ?? 0.5) - 0.5);
      return (1 - diffDist) * 10 + jitter;
    }

    case 'Weakness': {
      // Prioritize higher wrong counts and lower accuracy
      const wrong = g.totalWrongCount ?? 0;
      const errorRate = 1 - (g.averageAccuracy ?? 1.0);
      return wrong * 10 + errorRate * 20 + jitter;
    }

    case 'Unseen': {
      // Prioritize groups user has never seen
      const exposure = g.maxExposure ?? 0;
      return exposure === 0 ? 100 + jitter : -exposure + jitter;
    }

    case 'Challenge': {
      // Prioritize highest difficulty questions
      const diff = g.averageDifficulty ?? 0.5;
      return diff * 50 + jitter;
    }

    case 'Revision': {
      // Prioritize marked or previously answered questions
      const wrong = g.totalWrongCount ?? 0;
      const marked = g.isMarked ? 20 : 0;
      return wrong * 10 + marked + jitter;
    }

    case 'Custom':
    default:
      return jitter;
  }
}

/**
 * Core JLPT Mixed Exam Generator (N01)
 *
 * Implements 7 mix modes, integer source ratios, group preservation,
 * target difficulty, max exposure limits, pool shortage reporting, and deterministic output.
 */
export function generateMixedExam(
  params: MixedExamGenerateParams,
): MixedExamResult {
  const parsedConfig = MixConfigSchema.parse(params.config);
  const { blueprint, pool } = params;
  const now = params.now ?? new Date();
  const engineVersion = params.engineVersion ?? '1.0.0';

  // Rule 1: Level match between config and blueprint (MIX-01)
  if (parsedConfig.level !== blueprint.level) {
    throw new Error(
      `Cấu hình cấp độ (${parsedConfig.level}) không khớp với blueprint (${blueprint.level}).`,
    );
  }

  const seed = parsedConfig.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);

  // Filter pool by level, approval, answer keys, media, and licensing
  const normalizedPool = pool.map((g) => normalizeCandidateGroup(g));
  const eligiblePool = normalizedPool.filter((g) =>
    isGroupEligibleForMixing(g, parsedConfig.level, now),
  );

  // Apply global filters: maxExposure (MIX-19), difficultyRange (MIX-18), sourceSessions (MIX-02, MIX-03)
  const allowedSessions = new Set(parsedConfig.sourceSessions);
  const filteredPool = eligiblePool.filter((g) => {
    if (!allowedSessions.has(g.sourceSession)) {
      return false;
    }
    if (
      parsedConfig.maxExposure !== undefined &&
      (g.maxExposure ?? 0) >= parsedConfig.maxExposure
    ) {
      return false;
    }
    if (parsedConfig.difficultyRange) {
      const [minDiff, maxDiff] = parsedConfig.difficultyRange;
      const diff = g.averageDifficulty ?? 0.5;
      if (diff < minDiff || diff > maxDiff) {
        return false;
      }
    }
    return true;
  });

  const selectedGroups: CandidateGroup[] = [];
  const usedGroupIds = new Set<string>();
  const usedQuestionIds = new Set<string>();
  const sourceQuestionCounts: Record<string, number> = {};
  for (const s of parsedConfig.sourceSessions) {
    sourceQuestionCounts[s] = 0;
  }

  const shortages: ShortageDetail[] = [];
  const warnings: string[] = [];

  // Iterate over blueprint sections and mondai
  for (const section of blueprint.sections) {
    for (const mon of section.mondai) {
      // Filter by config skills / mondaiTypes if specified
      if (
        parsedConfig.skills &&
        parsedConfig.skills.length > 0 &&
        !parsedConfig.skills.includes(mon.skill)
      ) {
        continue;
      }
      if (
        parsedConfig.mondaiTypes &&
        parsedConfig.mondaiTypes.length > 0 &&
        !parsedConfig.mondaiTypes.includes(mon.type)
      ) {
        continue;
      }

      const totalRequiredQuestions = mon.questionCount;

      // Allocate integer question quotas among source sessions according to sourceWeights (MIX-04)
      const quotas = allocateIntegerQuotas(
        parsedConfig.sourceSessions,
        parsedConfig.sourceWeights,
        totalRequiredQuestions,
      );

      // Select question groups for each source session quota
      for (const s of parsedConfig.sourceSessions) {
        const quota = quotas[s] ?? 0;
        if (quota <= 0) continue;

        // Candidates matching this mondai, skill, and source session
        const candidates = filteredPool.filter(
          (g) =>
            g.sourceSession === s &&
            g.mondaiType === mon.type &&
            g.skill === mon.skill &&
            !usedGroupIds.has(g.groupId),
        );

        // Sort candidates according to mode scoring
        candidates.sort(
          (a, b) =>
            scoreGroupForMode(b, parsedConfig.mode, rng) -
            scoreGroupForMode(a, parsedConfig.mode, rng),
        );

        // Find subset of whole groups summing to exact quota (MIX-08, MIX-09)
        const chosen = findSubsetSumGroups(candidates, quota);

        if (!chosen) {
          const availableQuestions = candidates.reduce(
            (sum, c) => sum + c.questionCount,
            0,
          );
          shortages.push({
            mondaiType: mon.type,
            skill: mon.skill,
            sourceSession: s,
            requested: quota,
            available: availableQuestions,
            shortage: quota - availableQuestions,
            reason: `Nguồn ${s} không đủ câu hỏi cho dạng ${mon.type} (yêu cầu: ${quota}, có: ${availableQuestions})`,
          });
        } else {
          for (const g of chosen) {
            // Check duplicate questions within the exam (MIX-10)
            for (const q of g.questions) {
              if (usedQuestionIds.has(q.id)) {
                throw new Error(
                  `Phát hiện câu hỏi trùng lặp (${q.id}) trong đề trộn.`,
                );
              }
              usedQuestionIds.add(q.id);
            }
            usedGroupIds.add(g.groupId);
            selectedGroups.push(g);
            sourceQuestionCounts[s] = (sourceQuestionCounts[s] ?? 0) + g.questionCount;
          }
        }
      }
    }
  }

  // Acceptance rule: "Thiếu pool trả shortage; không âm thầm sai tỷ lệ"
  if (shortages.length > 0) {
    throw new PoolShortageError(
      `Không đủ câu hỏi trong kho để trộn đề theo blueprint và tỷ lệ nguồn cấu hình.`,
      shortages,
    );
  }

  // Build sourceSummary
  const totalExamQuestions = selectedGroups.reduce(
    (sum, g) => sum + g.questionCount,
    0,
  );
  let totalRequestedWeight = 0;
  for (const s of parsedConfig.sourceSessions) {
    totalRequestedWeight += parsedConfig.sourceWeights[s] ?? 0;
  }

  const sourceSummary: Record<
    string,
    { count: number; ratio: number; requestedRatio: number }
  > = {};
  for (const s of parsedConfig.sourceSessions) {
    const count = sourceQuestionCounts[s] ?? 0;
    const ratio =
      totalExamQuestions > 0
        ? Number((count / totalExamQuestions).toFixed(4))
        : 0;
    const reqRatio =
      totalRequestedWeight > 0
        ? Number(
            ((parsedConfig.sourceWeights[s] ?? 0) / totalRequestedWeight).toFixed(4),
          )
        : 0;
    sourceSummary[s] = {
      count,
      ratio,
      requestedRatio: reqRatio,
    };
  }

  // Compute canonical config hash for immutability and reproducibility
  const configHash = canonicalConfigHash(parsedConfig);

  const generatedExam: GeneratedExam = {
    id: deterministicUuid(seed, 'mixed-exam-id'),
    examId: params.examId ?? deterministicUuid(seed, 'blueprint-exam-id'),
    version: 1,
    seed,
    engineVersion,
    configHash,
    selectionGroupIds: selectedGroups.map((g) => g.groupId),
    sourceSummary,
    warnings,
    blueprintConformant: true,
  };

  // Validate output conforms strictly to GeneratedExamSchema
  GeneratedExamSchema.parse(generatedExam);

  return {
    generatedExam,
    selectedGroups,
    sourceSummary,
    warnings,
  };
}
