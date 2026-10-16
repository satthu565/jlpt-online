import type {
  MondaiSpeedAccuracy,
  MondaiType,
  Skill,
  SkillSpeedAccuracy,
  SpeedAccuracyQuadrant,
  SpeedAccuracyReport,
} from '@jlpt/schema';

export interface QuestionSpeedAccuracyItem {
  questionId: string;
  timeSpentMs: number;
  isCorrect: boolean;
  skill: Skill;
  mondaiType?: MondaiType;
}

export function classifySpeedAccuracyQuadrant(
  avgTimeSec: number,
  accuracyPct: number,
  benchmarkTimeSec = 60,
  benchmarkAccuracyPct = 60,
): { quadrant: SpeedAccuracyQuadrant; label: string } {
  const isFast = avgTimeSec <= benchmarkTimeSec;
  const isAccurate = accuracyPct >= benchmarkAccuracyPct;

  if (isFast && isAccurate) {
    return {
      quadrant: 'FAST_AND_ACCURATE',
      label: 'Thông thạo - Tốc độ nhanh và độ chính xác cao',
    };
  } else if (!isFast && isAccurate) {
    return {
      quadrant: 'SLOW_AND_ACCURATE',
      label: 'Cẩn trọng - Độ chính xác cao nhưng tốn nhiều thời gian',
    };
  } else if (isFast && !isAccurate) {
    return {
      quadrant: 'FAST_AND_INACCURATE',
      label: 'Vội vàng - Tốc độ nhanh nhưng độ chính xác thấp (nguy cơ làm ẩu hoặc đoán mò)',
    };
  } else {
    return {
      quadrant: 'SLOW_AND_INACCURATE',
      label: 'Gặp khó khăn - Tốn nhiều thời gian nhưng vẫn làm sai, cần ôn lại kiến thức nền tảng',
    };
  }
}

/**
 * Compares speed and accuracy from attempt responses (STAT-09).
 */
export function analyzeSpeedAndAccuracy(
  items: QuestionSpeedAccuracyItem[],
  benchmarkTimeSec = 60,
  benchmarkAccuracyPct = 60,
): SpeedAccuracyReport {
  if (items.length === 0) {
    return {
      averageTimeSpentSec: 0,
      correctAverageTimeSpentSec: 0,
      wrongAverageTimeSpentSec: 0,
      accuracyPercentage: 0,
      quadrant: 'SLOW_AND_INACCURATE',
      quadrantLabel: 'Chưa có dữ liệu làm bài',
      timeSpentCorrelation: 0,
      bySkill: [],
    };
  }

  let totalTimeMs = 0;
  let correctTimeMs = 0;
  let correctCount = 0;
  let wrongTimeMs = 0;
  let wrongCount = 0;

  const skillMap = new Map<Skill, { timeMs: number; correct: number; total: number }>();
  const mondaiMap = new Map<MondaiType, { timeMs: number; correct: number; total: number }>();

  for (const item of items) {
    totalTimeMs += item.timeSpentMs;
    if (item.isCorrect) {
      correctTimeMs += item.timeSpentMs;
      correctCount += 1;
    } else {
      wrongTimeMs += item.timeSpentMs;
      wrongCount += 1;
    }

    // Skill breakdown
    let sStat = skillMap.get(item.skill);
    if (!sStat) {
      sStat = { timeMs: 0, correct: 0, total: 0 };
      skillMap.set(item.skill, sStat);
    }
    sStat.timeMs += item.timeSpentMs;
    sStat.total += 1;
    if (item.isCorrect) sStat.correct += 1;

    // Mondai breakdown
    if (item.mondaiType) {
      let mStat = mondaiMap.get(item.mondaiType);
      if (!mStat) {
        mStat = { timeMs: 0, correct: 0, total: 0 };
        mondaiMap.set(item.mondaiType, mStat);
      }
      mStat.timeMs += item.timeSpentMs;
      mStat.total += 1;
      if (item.isCorrect) mStat.correct += 1;
    }
  }

  const averageTimeSpentSec = Number((totalTimeMs / items.length / 1000).toFixed(2));
  const correctAverageTimeSpentSec =
    correctCount > 0 ? Number((correctTimeMs / correctCount / 1000).toFixed(2)) : 0;
  const wrongAverageTimeSpentSec =
    wrongCount > 0 ? Number((wrongTimeMs / wrongCount / 1000).toFixed(2)) : 0;
  const accuracyPercentage = Number(((correctCount / items.length) * 100).toFixed(2));

  const { quadrant, label: quadrantLabel } = classifySpeedAccuracyQuadrant(
    averageTimeSpentSec,
    accuracyPercentage,
    benchmarkTimeSec,
    benchmarkAccuracyPct,
  );

  // Pearson correlation between time spent and correctness
  let timeSpentCorrelation = 0;
  if (items.length >= 3) {
    const meanTime = totalTimeMs / items.length;
    const meanCorrect = correctCount / items.length;
    let numerator = 0;
    let denomTime = 0;
    let denomCorrect = 0;

    for (const item of items) {
      const diffTime = item.timeSpentMs - meanTime;
      const diffCorrect = (item.isCorrect ? 1 : 0) - meanCorrect;
      numerator += diffTime * diffCorrect;
      denomTime += diffTime * diffTime;
      denomCorrect += diffCorrect * diffCorrect;
    }

    const denom = Math.sqrt(denomTime * denomCorrect);
    if (denom > 0) {
      timeSpentCorrelation = Number((numerator / denom).toFixed(3));
    }
  }

  const bySkill: SkillSpeedAccuracy[] = Array.from(skillMap.entries()).map(([skill, stat]) => {
    const avgSec = Number((stat.timeMs / stat.total / 1000).toFixed(2));
    const accPct = Number(((stat.correct / stat.total) * 100).toFixed(2));
    const { quadrant: sQuadrant } = classifySpeedAccuracyQuadrant(
      avgSec,
      accPct,
      benchmarkTimeSec,
      benchmarkAccuracyPct,
    );
    return {
      skill,
      averageTimeSpentSec: avgSec,
      accuracyPercentage: accPct,
      questionCount: stat.total,
      quadrant: sQuadrant,
    };
  });

  const byMondai: MondaiSpeedAccuracy[] = Array.from(mondaiMap.entries()).map(([mondaiType, stat]) => ({
    mondaiType,
    averageTimeSpentSec: Number((stat.timeMs / stat.total / 1000).toFixed(2)),
    accuracyPercentage: Number(((stat.correct / stat.total) * 100).toFixed(2)),
    questionCount: stat.total,
  }));

  return {
    averageTimeSpentSec,
    correctAverageTimeSpentSec,
    wrongAverageTimeSpentSec,
    accuracyPercentage,
    quadrant,
    quadrantLabel,
    timeSpentCorrelation,
    bySkill,
    byMondai,
  };
}
