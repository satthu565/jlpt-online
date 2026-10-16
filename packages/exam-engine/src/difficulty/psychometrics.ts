import type {
  DiscriminationRating,
  DistractorStats,
  ItemQualityFlag,
  ItemQualityValidation,
} from '@jlpt/schema';
import type { ItemAttemptRecord, QuestionWithChoices } from './types.js';
import { DEFAULT_MIN_SAMPLE_SIZE } from './empirical.js';

/**
 * Validates question quality based on option selection distribution and discrimination index
 * (QB-20, Acceptance 2).
 */
export function validateItemQuality(
  question: QuestionWithChoices,
  attempts: ItemAttemptRecord[],
  minSampleSize = DEFAULT_MIN_SAMPLE_SIZE,
): ItemQualityValidation {
  const sampleSize = attempts.length;
  const hasConclusion = sampleSize >= minSampleSize;
  const status = hasConclusion ? ('CALIBRATED' as const) : ('INSUFFICIENT_DATA' as const);

  const optionsCount = question.optionsCount ?? 4;
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 0: 0 };

  for (const a of attempts) {
    const opt = a.selectedOption ?? 0;
    if (counts[opt] !== undefined) {
      counts[opt] += 1;
    } else {
      counts[0] = (counts[0] ?? 0) + 1;
    }
  }

  const correctCount = counts[question.correctOption] ?? 0;
  const correctPercentage = sampleSize > 0 ? (correctCount / sampleSize) * 100 : 0;

  const distractorAnalysis: DistractorStats[] = [];
  const qualityFlags: ItemQualityFlag[] = [];

  for (let opt = 1; opt <= optionsCount; opt++) {
    const count = counts[opt] ?? 0;
    const percentage = sampleSize > 0 ? Number(((count / sampleSize) * 100).toFixed(2)) : 0;
    const isCorrect = opt === question.correctOption;
    // A distractor is functional if chosen by at least 5% of candidates
    const isFunctional = isCorrect || percentage >= 5.0;
    // A distractor is excessive if it was chosen more frequently than the correct answer
    const isExcessive = !isCorrect && percentage > correctPercentage;

    distractorAnalysis.push({
      optionIndex: opt,
      count,
      percentage,
      isCorrect,
      isFunctional,
      isExcessive,
    });

    if (!isCorrect && !isFunctional && sampleSize >= minSampleSize) {
      if (!qualityFlags.includes('NON_FUNCTIONAL_DISTRACTOR')) {
        qualityFlags.push('NON_FUNCTIONAL_DISTRACTOR');
      }
    }

    if (isExcessive && sampleSize >= minSampleSize) {
      if (!qualityFlags.includes('DECEPTIVE_DISTRACTOR')) {
        qualityFlags.push('DECEPTIVE_DISTRACTOR');
      }
    }
  }

  // Calculate Discrimination Index D (Upper 27% vs Lower 27%)
  let discriminationIndex = 0;
  if (sampleSize >= 4) {
    // Sort attempts by total score if available, or by isCorrect
    const sorted = [...attempts].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
    const groupSize = Math.max(1, Math.floor(sampleSize * 0.27));

    const upperGroup = sorted.slice(0, groupSize);
    const lowerGroup = sorted.slice(sorted.length - groupSize);

    const upperCorrect = upperGroup.filter(
      (a) => a.selectedOption === question.correctOption || a.isCorrect,
    ).length;
    const lowerCorrect = lowerGroup.filter(
      (a) => a.selectedOption === question.correctOption || a.isCorrect,
    ).length;

    const pUpper = upperCorrect / groupSize;
    const pLower = lowerCorrect / groupSize;

    discriminationIndex = Number((pUpper - pLower).toFixed(3));
  }

  let discriminationRating: DiscriminationRating = 'FAIR';
  if (discriminationIndex < 0) {
    discriminationRating = 'FLAWED_KEY';
    if (!qualityFlags.includes('FLAWED_KEY')) {
      qualityFlags.push('FLAWED_KEY');
    }
  } else if (discriminationIndex >= 0.4) {
    discriminationRating = 'EXCELLENT';
  } else if (discriminationIndex >= 0.3) {
    discriminationRating = 'GOOD';
  } else if (discriminationIndex >= 0.2) {
    discriminationRating = 'FAIR';
  } else {
    discriminationRating = 'POOR';
    if (!qualityFlags.includes('POOR_DISCRIMINATION')) {
      qualityFlags.push('POOR_DISCRIMINATION');
    }
  }

  if (qualityFlags.length === 0 && discriminationIndex >= 0.3) {
    qualityFlags.push('WELL_FORMED');
  }

  let recommendation: string;
  if (!hasConclusion) {
    recommendation = `Chưa đủ dữ liệu mẫu (hiện có ${sampleSize}/${minSampleSize} lượt làm). Kết quả kiểm định mang tính sơ bộ.`;
  } else if (qualityFlags.includes('FLAWED_KEY')) {
    recommendation =
      'Cảnh báo: Chỉ số phân biệt âm (thí sinh điểm thấp làm đúng nhiều hơn thí sinh điểm cao). Cần kiểm tra lại đáp án chính thức hoặc tính rõ ràng của đề bài.';
  } else if (qualityFlags.includes('DECEPTIVE_DISTRACTOR')) {
    recommendation =
      'Có phương án nhiễu thu hút nhiều lựa chọn hơn cả đáp án đúng. Cần xem xét câu hỏi có bẫy không hợp lý hoặc câu chữ gây nhầm lẫn.';
  } else if (qualityFlags.includes('NON_FUNCTIONAL_DISTRACTOR')) {
    recommendation =
      'Có phương án nhiễu hầu như không ai chọn (< 5%). Cân nhắc sửa phương án nhiễu để tăng tính hấp dẫn.';
  } else {
    recommendation = 'Câu hỏi đạt chuẩn kiểm định chất lượng tốt, các phương án nhiễu hoạt động hiệu quả.';
  }

  return {
    questionId: question.id,
    sampleSize,
    requiredSampleSize: minSampleSize,
    hasConclusion,
    status,
    distractorAnalysis,
    discriminationIndex,
    discriminationRating,
    qualityFlags,
    recommendation,
  };
}
