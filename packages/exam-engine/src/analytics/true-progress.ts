import type { TrueProgressComparison } from '@jlpt/schema';

export interface QuestionExposureItem {
  questionId: string;
  isCorrect: boolean;
  exposureCount: number; // 0 = first encounter (unseen), >= 1 = repeated
}

/**
 * Distinguishes genuine progress from familiarity bias / retake inflation (STAT-14).
 *
 * Compares:
 * - Unseen accuracy: Genuine mastery on fresh material
 * - Familiar accuracy: Performance on previously encountered questions
 * - Familiarity inflation index: (Acc_familiar - Acc_unseen) / max(Acc_unseen, 1)
 */
export function compareTrueProgress(
  attempts: QuestionExposureItem[],
): TrueProgressComparison {
  const unseenAttempts = attempts.filter((a) => a.exposureCount === 0);
  const familiarAttempts = attempts.filter((a) => a.exposureCount > 0);

  const unseenCount = unseenAttempts.length;
  const familiarCount = familiarAttempts.length;

  const unseenCorrect = unseenAttempts.filter((a) => a.isCorrect).length;
  const familiarCorrect = familiarAttempts.filter((a) => a.isCorrect).length;

  const unseenAccuracy =
    unseenCount > 0 ? Number(((unseenCorrect / unseenCount) * 100).toFixed(2)) : 0;
  const familiarAccuracy =
    familiarCount > 0 ? Number(((familiarCorrect / familiarCount) * 100).toFixed(2)) : 0;

  const familiarityDelta = Number((familiarAccuracy - unseenAccuracy).toFixed(2));
  const familiarityInflationIndex =
    unseenAccuracy > 0
      ? Number((Math.max(0, familiarityDelta) / unseenAccuracy).toFixed(3))
      : familiarAccuracy > 0
        ? 1.0
        : 0.0;

  // If familiarity delta is 20% or more, performance is significantly inflated by repetition
  const isInflatedByFamiliarity = familiarityDelta >= 20.0 && familiarCount >= 10;

  let assessment: string;
  let recommendedMode: 'unseen_practice' | 'balanced_practice' | 'challenge';

  if (isInflatedByFamiliarity) {
    assessment = `Điểm số của bạn có dấu hiệu phụ thuộc vào câu quen thuộc (Lạm phát do quen câu: +${familiarityDelta}% trên câu làm lại so với câu mới). Để đánh giá đúng thực lực kỳ thi, bạn nên ưu tiên làm các câu hỏi chưa từng gặp.`;
    recommendedMode = 'unseen_practice';
  } else if (unseenCount < 10) {
    assessment = 'Cần làm thêm câu hỏi mới để có dữ liệu đối sánh đáng tin cậy giữa câu mới và câu quen thuộc.';
    recommendedMode = 'unseen_practice';
  } else if (familiarityDelta <= 5.0) {
    assessment = 'Tiến bộ thực chất rất tốt: Năng lực giải quyết câu hỏi mới tương đương với câu quen thuộc, thể hiện khả năng nắm vững kiến thức vững chắc.';
    recommendedMode = 'challenge';
  } else {
    assessment = 'Tiến bộ cân bằng: Tỷ lệ làm đúng câu quen thuộc cao hơn một phần câu mới ở mức độ tự nhiên của quá trình ghi nhớ.';
    recommendedMode = 'balanced_practice';
  }

  return {
    unseenAccuracy,
    unseenCount,
    familiarAccuracy,
    familiarCount,
    familiarityDelta,
    familiarityInflationIndex,
    isInflatedByFamiliarity,
    assessment,
    recommendedMode,
  };
}
