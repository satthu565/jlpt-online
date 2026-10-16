import type {
  AnswerChange,
  AnswerChangeAnalysis,
  AnswerChangeDetail,
  AnswerChangePattern,
  SecondGuessingTendency,
} from '@jlpt/schema';

/**
 * Analyzes answer changes and evaluates second-guessing patterns (STAT-12).
 *
 * Distinguishes:
 * - CORRECT_TO_WRONG: User had the right answer initially, but changed to wrong (harmful penalty)
 * - WRONG_TO_CORRECT: User had a wrong answer, but reconsidered and picked right (beneficial gain)
 * - WRONG_TO_WRONG: Switched between two incorrect distractors
 * - NO_CHANGE: Kept original answer
 */
export function analyzeAnswerChanges(
  changes: AnswerChange[],
  answerKeys: Record<number, number>,
  totalQuestions: number,
): AnswerChangeAnalysis {
  // Group changes by question index `i` sorted by timestamp `at`
  const changesByQuestion = new Map<number, AnswerChange[]>();
  for (const c of changes) {
    let list = changesByQuestion.get(c.i);
    if (!list) {
      list = [];
      changesByQuestion.set(c.i, list);
    }
    list.push(c);
  }

  for (const list of changesByQuestion.values()) {
    list.sort((a, b) => a.at - b.at);
  }

  const details: AnswerChangeDetail[] = [];
  let correctToWrongCount = 0;
  let wrongToCorrectCount = 0;
  let wrongToWrongCount = 0;
  let questionsWithChanges = 0;

  for (let qIdx = 0; qIdx < totalQuestions; qIdx++) {
    const qChanges = changesByQuestion.get(qIdx);
    const correctOption = answerKeys[qIdx] ?? 1;

    if (!qChanges || qChanges.length <= 1) {
      // 0 or 1 change event means original selection without subsequent modification
      const finalOption = qChanges && qChanges.length === 1 ? qChanges[0]!.v : 0;
      details.push({
        questionIndex: qIdx,
        pattern: 'NO_CHANGE',
        initialOption: finalOption,
        finalOption,
        correctOption,
        changeCount: 0,
      });
      continue;
    }

    questionsWithChanges += 1;
    const initialOption = qChanges[0]!.v;
    const finalOption = qChanges[qChanges.length - 1]!.v;
    const changeCount = qChanges.length - 1;

    let pattern: AnswerChangePattern = 'NO_CHANGE';
    if (initialOption === correctOption && finalOption !== correctOption) {
      pattern = 'CORRECT_TO_WRONG';
      correctToWrongCount += 1;
    } else if (initialOption !== correctOption && finalOption === correctOption) {
      pattern = 'WRONG_TO_CORRECT';
      wrongToCorrectCount += 1;
    } else if (initialOption !== correctOption && finalOption !== correctOption && initialOption !== finalOption) {
      pattern = 'WRONG_TO_WRONG';
      wrongToWrongCount += 1;
    } else {
      pattern = 'NO_CHANGE';
    }

    details.push({
      questionIndex: qIdx,
      pattern,
      initialOption,
      finalOption,
      correctOption,
      changeCount,
    });
  }

  const netScoreImpact = wrongToCorrectCount - correctToWrongCount;

  let secondGuessingTendency: SecondGuessingTendency;
  let advice: string;

  if (correctToWrongCount > wrongToCorrectCount) {
    secondGuessingTendency = 'HARMFUL';
    advice = `Bạn có xu hướng đổi đáp án từ đúng sang sai (${correctToWrongCount} câu bị mất điểm so với ${wrongToCorrectCount} câu gỡ lại). Trực giác ban đầu của bạn thường chính xác hơn; khuyên bạn nên giữ nguyên lựa chọn đầu tiên trừ khi phát hiện lỗi đọc đề hiển nhiên.`;
  } else if (wrongToCorrectCount > correctToWrongCount) {
    secondGuessingTendency = 'BENEFICIAL';
    advice = `Việc kiểm tra lại bài làm mang lại hiệu quả tích cực (sửa đúng thêm ${wrongToCorrectCount} câu và chỉ đổi sai ${correctToWrongCount} câu, điểm ròng +${netScoreImpact}). Hãy tiếp tục duy trì thói quen rà soát kỹ lưỡng.`;
  } else {
    secondGuessingTendency = 'NEUTRAL';
    advice = 'Số lần đổi đáp án từ đúng sang sai và từ sai sang đúng cân bằng nhau, không ảnh hưởng đáng kể đến tổng điểm.';
  }

  return {
    totalQuestions,
    questionsWithChanges,
    totalChanges: changes.length,
    correctToWrongCount,
    wrongToCorrectCount,
    wrongToWrongCount,
    netScoreImpact,
    secondGuessingTendency,
    advice,
    details,
  };
}
