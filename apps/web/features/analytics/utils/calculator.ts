import type { Skill, MondaiType, Level, SpeedAccuracyQuadrant, TrueProgressComparison } from '@jlpt/schema';
import type {
  AttemptRecord,
  QuestionAttemptRecord,
  SkillAccuracyStat,
  MondaiAccuracyStat,
  RepeatedMistakeItem,
  MonthlyProgressStat,
  StudyTimeSummary,
  TargetProgressSummary,
  PriorityRecommendation,
  SpeedAccuracySummary,
} from '../types';

export const SKILL_LABELS: Record<Skill, string> = {
  kanji: 'Chữ Hán (Kanji)',
  vocabulary: 'Từ vựng (Vocabulary)',
  grammar: 'Ngữ pháp (Grammar)',
  reading: 'Đọc hiểu (Reading)',
  listening: 'Nghe hiểu (Listening)',
};

/**
 * Acceptance 3: Calculates true progress strictly distinguishing unseen from familiar questions.
 * Does NOT mix familiar questions with fresh unseen questions!
 */
export function calculateTrueProgress(
  items: Array<{ questionId: string; isCorrect: boolean; exposureCount: number }>,
): TrueProgressComparison {
  const unseenItems = items.filter((item) => item.exposureCount === 0);
  const familiarItems = items.filter((item) => item.exposureCount > 0);

  const unseenCount = unseenItems.length;
  const familiarCount = familiarItems.length;

  const unseenCorrect = unseenItems.filter((i) => i.isCorrect).length;
  const familiarCorrect = familiarItems.filter((i) => i.isCorrect).length;

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

  const isInflatedByFamiliarity = familiarityDelta >= 20.0 && familiarCount >= 10;

  let assessment: string;
  let recommendedMode: 'unseen_practice' | 'balanced_practice' | 'challenge';

  if (isInflatedByFamiliarity) {
    assessment = `Điểm số của bạn có dấu hiệu phụ thuộc vào câu quen thuộc (Lạm phát do quen câu: +${familiarityDelta}% trên câu làm lại). Hãy ưu tiên các đề luyện câu mới để phản ánh đúng thực lực.`;
    recommendedMode = 'unseen_practice';
  } else if (unseenCount < 10) {
    assessment = 'Cần làm thêm câu hỏi mới để có dữ liệu đối sánh đáng tin cậy giữa câu mới và câu quen thuộc.';
    recommendedMode = 'unseen_practice';
  } else if (familiarityDelta <= 5.0) {
    assessment = 'Tiến bộ thực chất xuất sắc: Khả năng xử lý câu hỏi mới tương đương với câu đã ôn tập.';
    recommendedMode = 'challenge';
  } else {
    assessment = 'Tiến bộ cân bằng: Tỷ lệ làm đúng câu quen cao hơn câu mới ở mức độ ghi nhớ bình thường.';
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

/**
 * STAT-02: Biểu đồ điểm theo thời gian
 */
export function calculateScoreProgression(attempts: AttemptRecord[]): AttemptRecord[] {
  return [...attempts].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
}

/**
 * STAT-03: Độ chính xác từng kỹ năng
 */
export function calculateSkillAccuracy(items: QuestionAttemptRecord[]): SkillAccuracyStat[] {
  const map = new Map<Skill, { correct: number; total: number }>();
  const allSkills: Skill[] = ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'];

  allSkills.forEach((s) => map.set(s, { correct: 0, total: 0 }));

  items.forEach((item) => {
    const entry = map.get(item.skill) || { correct: 0, total: 0 };
    entry.total += 1;
    if (item.isCorrect) entry.correct += 1;
    map.set(item.skill, entry);
  });

  return allSkills.map((skill) => {
    const entry = map.get(skill) || { correct: 0, total: 0 };
    const accuracy =
      entry.total > 0 ? Number(((entry.correct / entry.total) * 100).toFixed(1)) : 0;
    return {
      skill,
      skillLabel: SKILL_LABELS[skill] || skill,
      correct: entry.correct,
      total: entry.total,
      accuracy,
    };
  });
}

/**
 * STAT-04: Độ chính xác từng dạng câu
 */
export function calculateMondaiAccuracy(items: QuestionAttemptRecord[]): MondaiAccuracyStat[] {
  const map = new Map<MondaiType, { correct: number; total: number; skill: Skill }>();

  items.forEach((item) => {
    if (!item.mondaiType) return;
    const entry = map.get(item.mondaiType) || { correct: 0, total: 0, skill: item.skill };
    entry.total += 1;
    if (item.isCorrect) entry.correct += 1;
    map.set(item.mondaiType, entry);
  });

  return Array.from(map.entries()).map(([mondaiType, data]) => ({
    mondaiType,
    label: mondaiType.replace(/_/g, ' ').toUpperCase(),
    skill: data.skill,
    correct: data.correct,
    total: data.total,
    accuracy: data.total > 0 ? Number(((data.correct / data.total) * 100).toFixed(1)) : 0,
  }));
}

/**
 * STAT-05: Số câu làm sai nhiều lần (wrongCount >= 2)
 */
export function calculateRepeatedMistakes(items: QuestionAttemptRecord[]): RepeatedMistakeItem[] {
  const map = new Map<
    string,
    {
      questionId: string;
      questionNumber?: string;
      stemPreview: string;
      skill: Skill;
      level: Level;
      wrongCount: number;
      totalAttempts: number;
      lastAttemptDate: string;
    }
  >();

  items.forEach((item) => {
    const existing = map.get(item.questionId) || {
      questionId: item.questionId,
      questionNumber: item.questionNumber,
      stemPreview: item.stemPreview || 'Câu hỏi luyện tập',
      skill: item.skill,
      level: item.level,
      wrongCount: 0,
      totalAttempts: 0,
      lastAttemptDate: item.submittedAt,
    };

    existing.totalAttempts += 1;
    if (!item.isCorrect) {
      existing.wrongCount += 1;
    }
    if (new Date(item.submittedAt) > new Date(existing.lastAttemptDate)) {
      existing.lastAttemptDate = item.submittedAt;
    }
    map.set(item.questionId, existing);
  });

  // Filter only questions missed 2 or more times
  return Array.from(map.values())
    .filter((item) => item.wrongCount >= 2)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

/**
 * STAT-06: Phân tích lỗi thường gặp
 */
export function calculateCommonErrors(
  items: QuestionAttemptRecord[],
): Array<{ category: string; label: string; count: number; percentage: number }> {
  const wrongItems = items.filter((i) => !i.isCorrect);
  if (wrongItems.length === 0) return [];

  const counts: Record<string, number> = {
    grammar_trap: 0,
    kanji_confusion: 0,
    vocab_nuance: 0,
    listening_distractor: 0,
    time_pressure: 0,
    other: 0,
  };

  const labels: Record<string, string> = {
    grammar_trap: 'Bẫy ngữ pháp (Nhầm lẫn cấu trúc tương tự)',
    kanji_confusion: 'Nhầm lẫn âm Hán tự (Âm On/Kun hoặc bộ thủ gần giống)',
    vocab_nuance: 'Sắc thái từ vựng (Dùng sai ngữ cảnh)',
    listening_distractor: 'Bẫy nghe hiểu (Thông tin nhiễu đảo ngược cuối câu)',
    time_pressure: 'Áp lực thời gian (Làm vội vàng hoặc đoán mò)',
    other: 'Lỗi kiến thức khác',
  };

  wrongItems.forEach((item) => {
    const cat = item.errorCategory || 'other';
    counts[cat] = (counts[cat] ?? 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      label: labels[category] || category,
      count,
      percentage: Number(((count / wrongItems.length) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * STAT-07: So sánh kết quả theo từng tháng
 */
export function calculateMonthlyComparison(attempts: AttemptRecord[]): MonthlyProgressStat[] {
  const map = new Map<
    string,
    {
      monthKey: string;
      scores: number[];
      accuracies: number[];
      totalSec: number;
    }
  >();

  attempts.forEach((a) => {
    const date = new Date(a.submittedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = map.get(monthKey) || {
      monthKey,
      scores: [],
      accuracies: [],
      totalSec: 0,
    };
    entry.scores.push(a.totalScore);
    entry.accuracies.push(a.accuracy);
    entry.totalSec += a.durationSec;
    map.set(monthKey, entry);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => {
      const avgScore = Number(
        (data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length).toFixed(1),
      );
      const avgAccuracy = Number(
        (data.accuracies.reduce((sum, s) => sum + s, 0) / data.accuracies.length).toFixed(1),
      );
      const totalDurationMin = Math.round(data.totalSec / 60);
      const [yr, mo] = monthKey.split('-');

      return {
        monthKey,
        monthLabel: `Tháng ${Number(mo)}/${yr}`,
        attemptCount: data.scores.length,
        avgScore,
        avgAccuracy,
        totalDurationMin,
      };
    });
}

/**
 * STAT-08: Thống kê thời gian ôn tập
 */
export function calculateStudyTime(
  attempts: AttemptRecord[],
  questionItems: QuestionAttemptRecord[] = [],
): StudyTimeSummary {
  const totalSec = attempts.reduce((acc, a) => acc + a.durationSec, 0);
  const totalMinutes = Math.round(totalSec / 60);
  const totalSessions = attempts.length;
  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const bySkillMinutes: Record<Skill, number> = {
    kanji: 0,
    vocabulary: 0,
    grammar: 0,
    reading: 0,
    listening: 0,
  };

  questionItems.forEach((q) => {
    bySkillMinutes[q.skill] = (bySkillMinutes[q.skill] || 0) + q.timeSpentMs / 60000;
  });

  // Round values
  (Object.keys(bySkillMinutes) as Skill[]).forEach((s) => {
    bySkillMinutes[s] = Math.round(bySkillMinutes[s]);
  });

  return {
    totalMinutes,
    totalSessions,
    avgSessionMinutes,
    bySkillMinutes,
  };
}

/**
 * STAT-10: Theo dõi tiến độ so với mục tiêu
 */
export function calculateTargetProgress(
  attempts: AttemptRecord[],
  targetLevel: Level = 'N3',
  targetScore = 120,
): TargetProgressSummary {
  const matchingAttempts = attempts.filter((a) => a.level === targetLevel);
  const currentBestScore =
    matchingAttempts.length > 0
      ? Math.max(...matchingAttempts.map((a) => a.totalScore))
      : 0;

  const gapToTarget = Math.max(0, targetScore - currentBestScore);
  const progressPercentage = Math.min(100, Number(((currentBestScore / targetScore) * 100).toFixed(1)));

  // Estimate pass probability based on current best score vs standard pass threshold (90-100/180)
  const passThreshold = { N1: 100, N2: 90, N3: 95, N4: 90, N5: 80 }[targetLevel] || 90;
  let passProbability = 0;
  if (currentBestScore >= targetScore) {
    passProbability = 95;
  } else if (currentBestScore >= passThreshold) {
    passProbability = 75 + Math.min(20, Math.round(((currentBestScore - passThreshold) / (targetScore - passThreshold)) * 20));
  } else {
    passProbability = Math.max(10, Math.round((currentBestScore / passThreshold) * 65));
  }

  let readinessLabel = 'Cần nỗ lực thêm';
  if (passProbability >= 85) readinessLabel = 'Sẵn sàng vượt ngưỡng mục tiêu';
  else if (passProbability >= 70) readinessLabel = 'Đạt ngưỡng đỗ an toàn';
  else if (passProbability >= 50) readinessLabel = 'Đang tiến gần ngưỡng đỗ';

  return {
    targetLevel,
    targetScore,
    currentBestScore,
    gapToTarget,
    progressPercentage,
    passProbability,
    readinessLabel,
  };
}

/**
 * STAT-11: Gợi ý kỹ năng nên ưu tiên học tiếp
 */
export function calculateNextPriority(skillStats: SkillAccuracyStat[]): PriorityRecommendation {
  if (skillStats.length === 0) {
    return {
      prioritySkill: 'vocabulary',
      skillLabel: 'Từ vựng (Vocabulary)',
      currentAccuracy: 0,
      targetAccuracy: 75,
      reason: 'Chưa có đủ dữ liệu bài thi. Nên bắt đầu luyện củng cố vốn từ vựng nền tảng.',
      suggestedAction: 'Luyện tập chế độ từ vựng theo chủ đề với 15 câu mỗi ngày.',
    };
  }

  // Find skill with lowest accuracy
  const sorted = [...skillStats].sort((a, b) => a.accuracy - b.accuracy);
  const weakest = sorted[0]!;

  const tips: Record<Skill, { reason: string; action: string }> = {
    listening: {
      reason: 'Kỹ năng Nghe hiểu đạt tỷ lệ thấp nhất. Nguy cơ bị điểm liệt dưới 19 điểm.',
      action: 'Luyện nghe phản xạ với transcript đồng bộ và tập trung vào đoạn dẫn chứng then chốt.',
    },
    reading: {
      reason: 'Đọc hiểu tốn nhiều thời gian và tỷ lệ làm sai cao ở các câu hỏi tổng hợp quan điểm tác giả.',
      action: 'Luyện đọc đoạn văn trung - dài, gạch chân từ khóa nối câu và đối chiếu dẫn chứng trong bài.',
    },
    grammar: {
      reason: 'Ngữ pháp có nhiều câu mắc bẫy cấu trúc phân hóa.',
      action: 'Ôn lại các mẫu câu tương tự và phân tích lý do sai trong từng phương án bẫy.',
    },
    vocabulary: {
      reason: 'Vốn từ vựng chưa đủ bao quát các ngữ cảnh chuyên môn.',
      action: 'Tăng cường flashcards SRS kết hợp làm bài tập trắc nghiệm nghĩa từ theo ngữ cảnh.',
    },
    kanji: {
      reason: 'Nhầm lẫn âm On/Kun và các chữ Hán có bộ thủ giống nhau.',
      action: 'Ôn tập chữ Hán theo bộ thủ và luyện câu hỏi tìm cách đọc Hiragana tương ứng.',
    },
  };

  const tip = tips[weakest.skill] || {
    reason: `Kỹ năng ${weakest.skillLabel} có điểm số thấp nhất hiện tại.`,
    action: `Dành thêm 20 phút mỗi ngày luyện tập tập trung vào kỹ năng ${weakest.skillLabel}.`,
  };

  return {
    prioritySkill: weakest.skill,
    skillLabel: weakest.skillLabel,
    currentAccuracy: weakest.accuracy,
    targetAccuracy: 75,
    reason: tip.reason,
    suggestedAction: tip.action,
  };
}

/**
 * SCORE-15: Phân tích thời gian trung bình mỗi câu và mỗi phần
 */
export function calculateSpeedAccuracy(
  items: QuestionAttemptRecord[],
  benchmarkSec = 60,
  benchmarkAccuracy = 60,
): SpeedAccuracySummary {
  if (items.length === 0) {
    return {
      avgTimePerQuestionSec: 0,
      avgTimePerSectionSec: {},
      accuracyPercentage: 0,
      quadrant: 'SLOW_AND_INACCURATE',
      quadrantLabel: 'Chưa có dữ liệu làm bài',
      assessment: 'Chưa có đủ dữ liệu câu hỏi để phân tích thời gian và tốc độ.',
    };
  }

  const totalTimeMs = items.reduce((acc, i) => acc + i.timeSpentMs, 0);
  const correctCount = items.filter((i) => i.isCorrect).length;
  const avgTimePerQuestionSec = Number((totalTimeMs / items.length / 1000).toFixed(1));
  const accuracyPercentage = Number(((correctCount / items.length) * 100).toFixed(1));

  // Avg time per skill/section
  const sectionTimes: Record<string, { totalMs: number; count: number }> = {};
  items.forEach((item) => {
    const sec = item.skill;
    const entry = sectionTimes[sec] || { totalMs: 0, count: 0 };
    entry.totalMs += item.timeSpentMs;
    entry.count += 1;
    sectionTimes[sec] = entry;
  });

  const avgTimePerSectionSec: Record<string, number> = {};
  Object.entries(sectionTimes).forEach(([sec, data]) => {
    avgTimePerSectionSec[sec] = Number((data.totalMs / data.count / 1000).toFixed(1));
  });

  const isFast = avgTimePerQuestionSec <= benchmarkSec;
  const isAccurate = accuracyPercentage >= benchmarkAccuracy;

  let quadrant: SpeedAccuracyQuadrant;
  let quadrantLabel: string;
  let assessment: string;

  if (isFast && isAccurate) {
    quadrant = 'FAST_AND_ACCURATE';
    quadrantLabel = 'Thông thạo (Fast & Accurate)';
    assessment = 'Tốc độ phản xạ nhanh và độ chính xác xuất sắc. Bạn đang kiểm soát thời gian làm bài rất tốt.';
  } else if (!isFast && isAccurate) {
    quadrant = 'SLOW_AND_ACCURATE';
    quadrantLabel = 'Cẩn trọng (Slow & Accurate)';
    assessment = 'Độ chính xác cao nhưng tốn nhiều thời gian. Cần rèn luyện thêm tốc độ đọc lướt để tránh thiếu giờ khi thi thật.';
  } else if (isFast && !isAccurate) {
    quadrant = 'FAST_AND_INACCURATE';
    quadrantLabel = 'Vội vàng (Fast & Inaccurate)';
    assessment = 'Tốc độ làm bài nhanh nhưng tỷ lệ sai cao. Cần đọc kỹ lại đề bài và kiểm tra các phương án bẫy trước khi chọn.';
  } else {
    quadrant = 'SLOW_AND_INACCURATE';
    quadrantLabel = 'Gặp khó khăn (Slow & Inaccurate)';
    assessment = 'Tốn nhiều thời gian nhưng kết quả chưa đạt. Cần ôn lại kiến thức nền tảng và bổ sung từ vựng trọng tâm.';
  }

  return {
    avgTimePerQuestionSec,
    avgTimePerSectionSec,
    accuracyPercentage,
    quadrant,
    quadrantLabel,
    assessment,
  };
}
