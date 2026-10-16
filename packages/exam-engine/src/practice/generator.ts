import {
  PracticeConfigSchema,
  GeneratedExamSchema,
  type PracticeConfig,
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
} from '../mix/prng.js';
import {
  normalizeCandidateGroup,
  findSubsetSumGroups,
} from '../mix/generator.js';
import type {
  PracticeExamGenerateParams,
  PracticeExamResult,
} from './types.js';

/**
 * Validates whether a candidate group is eligible for practice based on quality and licensing.
 */
function isGroupEligibleForPractice(
  g: CandidateGroup,
  targetLevel: string,
  now: Date,
): boolean {
  if (g.level !== targetLevel) return false;
  if (!g.isApproved) return false;
  if (!g.hasAnswerKeys) return false;
  if (g.hasMedia === false && g.mediaKeys && g.mediaKeys.length > 0) {
    return false;
  }

  // License check for practice: displayAllowed must be true, not expired
  if (g.license) {
    if (g.license.displayAllowed === false) return false;
    if (g.license.expiresAt) {
      const expiry = new Date(g.license.expiresAt).getTime();
      if (expiry <= now.getTime()) return false;
    }
  }

  return true;
}

/**
 * Scores a candidate group for practice pool ranking.
 */
function scoreGroupForPracticePool(
  g: CandidateGroup,
  pool: PracticeConfig['pool'],
  difficultyRange: [number, number] | undefined,
  rng: SeededRandom,
): number {
  const jitter = rng.next();

  switch (pool) {
    case 'wrong': {
      const wrong = g.totalWrongCount ?? 0;
      const errorRate = 1 - (g.averageAccuracy ?? 1.0);
      return wrong * 10 + errorRate * 20 + jitter;
    }

    case 'unseen': {
      const exposure = g.maxExposure ?? 0;
      return exposure === 0 ? 100 + jitter : -exposure + jitter;
    }

    case 'marked': {
      return (g.isMarked ? 50 : 0) + jitter;
    }

    case 'difficulty': {
      if (difficultyRange) {
        const mid = (difficultyRange[0] + difficultyRange[1]) / 2;
        const diffDist = Math.abs((g.averageDifficulty ?? 0.5) - mid);
        return (1 - diffDist) * 10 + jitter;
      }
      return (g.averageDifficulty ?? 0.5) * 10 + jitter;
    }

    case 'tagged':
    case 'random':
    default:
      return jitter;
  }
}

/**
 * Core JLPT Practice Exam Generator (N01)
 *
 * Implements targeted practice for Kanji (PRA-01), Vocabulary (PRA-02),
 * Grammar (PRA-03), Reading (PRA-04), Listening (PRA-05), Mondai types (PRA-06),
 * 10/20/30/50 counts (PRA-07), untimed (PRA-08), custom timed (PRA-09),
 * multi-source random (PRA-14), difficulty ratings (PRA-15), tags (PRA-16),
 * group preservation, and pool shortage reporting.
 */
export function generatePracticeExam(
  params: PracticeExamGenerateParams,
): PracticeExamResult {
  const parsedConfig = PracticeConfigSchema.parse(params.config);
  const now = params.now ?? new Date();
  const engineVersion = params.engineVersion ?? '1.0.0';

  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);

  const normalizedPool = params.pool.map((g) => normalizeCandidateGroup(g));

  // 1. Base eligibility (level, approval, answer keys, media, license)
  const eligiblePool = normalizedPool.filter((g) =>
    isGroupEligibleForPractice(g, parsedConfig.level, now),
  );

  // 2. Filter by skills (PRA-01..05) and mondaiTypes (PRA-06)
  const skillFiltered = eligiblePool.filter(
    (g) =>
      parsedConfig.skills.includes(g.skill) &&
      parsedConfig.mondaiTypes.includes(g.mondaiType),
  );

  // 3. Filter by sourceIds if specified (PRA-14)
  const sourceFiltered =
    parsedConfig.sourceIds && parsedConfig.sourceIds.length > 0
      ? skillFiltered.filter(
          (g) =>
            (g.sourceId && parsedConfig.sourceIds!.includes(g.sourceId)) ||
            parsedConfig.sourceIds!.includes(g.sourceSession),
        )
      : skillFiltered;

  // 4. Filter by tagIds if specified (PRA-16)
  const tagFiltered =
    parsedConfig.tagIds && parsedConfig.tagIds.length > 0
      ? sourceFiltered.filter((g) => {
          const groupHasTag = g.tags?.some((t) =>
            parsedConfig.tagIds!.includes(t),
          );
          if (groupHasTag) return true;
          return g.questions.some((q) =>
            q.tags?.some((t) => parsedConfig.tagIds!.includes(t)),
          );
        })
      : sourceFiltered;

  // 5. Filter by difficultyRange if specified (PRA-15)
  const diffFiltered = parsedConfig.difficultyRange
    ? tagFiltered.filter((g) => {
        const [minDiff, maxDiff] = parsedConfig.difficultyRange!;
        const diff = g.averageDifficulty ?? 0.5;
        return diff >= minDiff && diff <= maxDiff;
      })
    : tagFiltered;

  // 6. Filter by pool policy
  const poolFiltered = diffFiltered.filter((g) => {
    switch (parsedConfig.pool) {
      case 'wrong':
        return (
          (g.totalWrongCount ?? 0) > 0 ||
          g.questions.some((q) => (q.wrongCount ?? 0) > 0)
        );

      case 'unseen':
        return (g.maxExposure ?? 0) === 0;

      case 'marked':
        return g.isMarked || g.questions.some((q) => q.isMarked);

      case 'tagged':
        return (
          (g.tags && g.tags.length > 0) ||
          g.questions.some((q) => q.tags && q.tags.length > 0)
        );

      case 'difficulty':
        return g.averageDifficulty !== undefined;

      case 'random':
      default:
        return true;
    }
  });

  const targetCount = parsedConfig.questionCount;
  const totalAvailableQuestions = poolFiltered.reduce(
    (acc, g) => acc + g.questionCount,
    0,
  );

  // Shortage check (Acceptance: "Thiếu pool trả shortage; không âm thầm sai tỷ lệ")
  if (totalAvailableQuestions < targetCount) {
    const shortageDetail: ShortageDetail = {
      requested: targetCount,
      available: totalAvailableQuestions,
      shortage: targetCount - totalAvailableQuestions,
      reason: `Kho câu hỏi luyện tập chỉ có ${totalAvailableQuestions} câu, không đủ ${targetCount} câu theo yêu cầu.`,
    };
    throw new PoolShortageError(
      `Không đủ câu hỏi để tạo đề luyện tập theo cấu hình đã chọn.`,
      [shortageDetail],
    );
  }

  // Sort candidates by score for the chosen pool + PRNG jitter
  poolFiltered.sort(
    (a, b) =>
      scoreGroupForPracticePool(b, parsedConfig.pool, parsedConfig.difficultyRange, rng) -
      scoreGroupForPracticePool(a, parsedConfig.pool, parsedConfig.difficultyRange, rng),
  );

  // Group preservation: find subset of whole groups summing to exact question count (PRA-07)
  const selectedGroups = findSubsetSumGroups(poolFiltered, targetCount);

  if (!selectedGroups) {
    const shortageDetail: ShortageDetail = {
      requested: targetCount,
      available: totalAvailableQuestions,
      shortage: 0,
      reason: `Không thể chia nhóm câu hỏi nguyên vẹn để đạt đúng ${targetCount} câu mà không bẻ gãy bài đọc hoặc nhóm nghe.`,
    };
    throw new PoolShortageError(
      `Không thể tạo đề luyện tập với đúng số lượng câu hỏi mà không bẻ gãy nhóm câu hỏi nguyên vẹn.`,
      [shortageDetail],
    );
  }

  // Duplicate check (Rule 7)
  const usedQuestionIds = new Set<string>();
  for (const g of selectedGroups) {
    for (const q of g.questions) {
      if (usedQuestionIds.has(q.id)) {
        throw new Error(
          `Phát hiện câu hỏi trùng lặp (${q.id}) trong đề luyện tập.`,
        );
      }
      usedQuestionIds.add(q.id);
    }
  }

  // Build sourceSummary
  const sourceSummary: Record<string, { count: number; ratio: number }> = {};
  for (const g of selectedGroups) {
    const key = g.sourceId ?? g.sourceSession;
    if (!sourceSummary[key]) {
      sourceSummary[key] = { count: 0, ratio: 0 };
    }
    sourceSummary[key]!.count += g.questionCount;
  }
  for (const key of Object.keys(sourceSummary)) {
    sourceSummary[key]!.ratio = Number(
      (sourceSummary[key]!.count / targetCount).toFixed(4),
    );
  }

  const warnings: string[] = [];

  // PRA-08 & PRA-09: Timing evaluation
  // timeLimitSec undefined => untimed; timeLimitSec > 0 => custom timed
  if (parsedConfig.timeLimitSec !== undefined) {
    warnings.push(`Đề luyện tập có giới hạn thời gian ${parsedConfig.timeLimitSec} giây.`);
  }

  const configHash = canonicalConfigHash(parsedConfig);

  const generatedExam: GeneratedExam = {
    id: deterministicUuid(seed, 'practice-exam-id'),
    examId: params.examId ?? deterministicUuid(seed, 'practice-template-id'),
    version: 1,
    seed,
    engineVersion,
    configHash,
    selectionGroupIds: selectedGroups.map((g) => g.groupId),
    sourceSummary,
    warnings,
    blueprintConformant: false,
  };

  GeneratedExamSchema.parse(generatedExam);

  return {
    generatedExam,
    selectedGroups,
    sourceSummary,
    timeLimitSec: parsedConfig.timeLimitSec,
    warnings,
  };
}
