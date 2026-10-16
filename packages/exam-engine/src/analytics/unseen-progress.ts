import type {
  UnseenProgressPoint,
  UnseenProgressReport,
} from '@jlpt/schema';

export interface UserHistoricalQuestionAttempt {
  questionId: string;
  isCorrect: boolean;
  exposureCount: number;
}

export interface UserAttemptSessionPeriod {
  period: string; // e.g. '2026-W40', '2026-10-01'
  questions: UserHistoricalQuestionAttempt[];
}

/**
 * Tracks progress rate exclusively on questions the user has never encountered before (STAT-13).
 */
export function analyzeUnseenProgress(
  periods: UserAttemptSessionPeriod[],
): UnseenProgressReport {
  let totalUnseen = 0;
  let totalUnseenCorrect = 0;
  const historicalTrend: UnseenProgressPoint[] = [];

  for (const session of periods) {
    const unseenInPeriod = session.questions.filter((q) => q.exposureCount === 0);
    if (unseenInPeriod.length === 0) continue;

    const correct = unseenInPeriod.filter((q) => q.isCorrect).length;
    const accuracy = Number(((correct / unseenInPeriod.length) * 100).toFixed(2));

    totalUnseen += unseenInPeriod.length;
    totalUnseenCorrect += correct;

    historicalTrend.push({
      period: session.period,
      unseenAccuracy: accuracy,
      sampleSize: unseenInPeriod.length,
    });
  }

  const unseenAccuracy =
    totalUnseen > 0 ? Number(((totalUnseenCorrect / totalUnseen) * 100).toFixed(2)) : 0;

  let progressDelta = 0;
  let trendDirection: 'improving' | 'stable' | 'declining' | 'insufficient_history' =
    'insufficient_history';

  if (historicalTrend.length >= 2) {
    const initialAccuracy = historicalTrend[0]!.unseenAccuracy;
    const latestAccuracy = historicalTrend[historicalTrend.length - 1]!.unseenAccuracy;
    progressDelta = Number((latestAccuracy - initialAccuracy).toFixed(2));

    if (progressDelta >= 5.0) {
      trendDirection = 'improving';
    } else if (progressDelta <= -5.0) {
      trendDirection = 'declining';
    } else {
      trendDirection = 'stable';
    }
  }

  return {
    unseenQuestionCount: totalUnseen,
    unseenCorrectCount: totalUnseenCorrect,
    unseenAccuracy,
    historicalTrend,
    progressDelta,
    trendDirection,
  };
}
