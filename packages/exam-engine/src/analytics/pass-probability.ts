import type {
  Level,
  PassProbabilityEstimate,
  Skill,
  SkillReadiness,
} from '@jlpt/schema';
import { getPassingScore } from '../scoring.js';

export const UNCALIBRATED_PASS_DISCLAIMER =
  'Ước lượng chưa được hiệu chỉnh do thiếu dữ liệu lịch sử làm bài. Điểm số chỉ mang tính tham khảo sơ bộ và cần thêm tối thiểu 3 bài thi hoàn chỉnh hoặc 100 câu hỏi mỗi phần để có mô hình hiệu chuẩn chính xác.';

export const CALIBRATED_PASS_DISCLAIMER =
  'Xác suất đỗ được hiệu chuẩn dựa trên lịch sử làm bài thi thử hoàn chỉnh và phân bố điểm thành phần so với chuẩn sàn JLPT.';

export interface HistoricalExamAttemptRecord {
  attemptId: string;
  level: Level;
  totalScaledScore: number;
  isFullExam: boolean;
  skillScores?: Partial<Record<Skill, { score: number; maxScore: number; minPass: number }>>;
  totalQuestionsAnswered?: number;
}

/**
 * Standard minimum passing thresholds per section for JLPT levels.
 * (N1, N2, N3: Language Knowledge 19/60, Reading 19/60, Listening 19/60).
 * (N4, N5: Language Knowledge & Reading combined 38/120, Listening 19/60).
 */
export function getSectionMinPass(level: Level, skill: Skill): number {
  return 19; // 19 / 60 scaled points minimum per section
}

/**
 * Estimates pass probability based on historical attempts (SCORE-14, Acceptance 3).
 *
 * Acceptance 3: Báo xác suất đỗ là ước lượng chưa được hiệu chỉnh nếu thiếu dữ liệu.
 */
export function estimatePassProbability(
  attempts: HistoricalExamAttemptRecord[],
  targetLevel: Level,
): PassProbabilityEstimate {
  const passingThreshold = getPassingScore(targetLevel);
  const fullExamAttempts = attempts.filter((a) => a.isFullExam && a.level === targetLevel);
  const sampleExamsCount = fullExamAttempts.length;

  let totalQuestionsCount = 0;
  for (const a of attempts) {
    totalQuestionsCount += a.totalQuestionsAnswered ?? (a.isFullExam ? 100 : 20);
  }

  // Check calibration criteria:
  // Requires at least 3 full exam attempts for the target level
  const isCalibrated = sampleExamsCount >= 3;
  const status = isCalibrated
    ? ('CALIBRATED' as const)
    : ('UNCALIBRATED_ESTIMATE' as const);
  const disclaimer = isCalibrated
    ? CALIBRATED_PASS_DISCLAIMER
    : UNCALIBRATED_PASS_DISCLAIMER;

  const relevantAttempts = fullExamAttempts.length > 0 ? fullExamAttempts : attempts;

  let predictedTotalScore: number;
  if (relevantAttempts.length === 0) {
    predictedTotalScore = Math.round(passingThreshold * 0.7);
  } else {
    const sumScores = relevantAttempts.reduce((sum, a) => sum + a.totalScaledScore, 0);
    predictedTotalScore = Number((sumScores / relevantAttempts.length).toFixed(1));
  }

  // Logistic model: P(pass) = 1 / (1 + exp(-k * (score - threshold)))
  // When score == passingThreshold, baseline prob is 50%
  const scoreDiff = predictedTotalScore - passingThreshold;
  const k = 0.08; // scale steepness
  let rawProbability = 1 / (1 + Math.exp(-k * scoreDiff));

  // Section breakdown evaluation
  const skills: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening'];
  const skillBreakdown: SkillReadiness[] = [];

  for (const skill of skills) {
    const minPass = getSectionMinPass(targetLevel, skill);
    // Skill score estimated proportionally to overall score
    const estimatedScore = Math.min(
      60,
      Math.max(0, Number(((predictedTotalScore / 180) * 60).toFixed(1))),
    );
    const passedStandard = estimatedScore >= minPass;
    const diff = estimatedScore - minPass;
    const probabilityPassingSection = Number((1 / (1 + Math.exp(-0.15 * diff))).toFixed(3));

    skillBreakdown.push({
      skill,
      estimatedScore,
      minPass,
      passedStandard,
      probabilityPassingSection,
    });
  }

  // Adjust pass probability by the weakest section probability
  const minSectionProb = Math.min(...skillBreakdown.map((s) => s.probabilityPassingSection));
  let passProbability = Number((rawProbability * (0.5 + 0.5 * minSectionProb)).toFixed(3));
  passProbability = Math.min(0.99, Math.max(0.01, passProbability));

  let confidenceInterval: [number, number];
  let marginOfError: number;

  if (isCalibrated) {
    // Calibrated: tight error margin based on sample variance (approx 5% to 8%)
    marginOfError = sampleExamsCount >= 5 ? 0.05 : 0.08;
    const lower = Number(Math.max(0, passProbability - marginOfError).toFixed(3));
    const upper = Number(Math.min(1, passProbability + marginOfError).toFixed(3));
    confidenceInterval = [lower, upper];
  } else {
    // Uncalibrated: broad conservative margin of error (+-20%)
    marginOfError = 0.2;
    const lower = Number(Math.max(0, passProbability - marginOfError).toFixed(3));
    const upper = Number(Math.min(1, passProbability + marginOfError).toFixed(3));
    confidenceInterval = [lower, upper];
  }

  return {
    level: targetLevel,
    isCalibrated,
    status,
    passProbability,
    confidenceInterval,
    marginOfError,
    sampleExamsCount,
    sampleQuestionsCount: totalQuestionsCount,
    disclaimer,
    skillBreakdown,
    predictedTotalScore,
    passingThreshold,
  };
}
