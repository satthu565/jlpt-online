import type { Level } from '@jlpt/schema';

export interface ScoreResult {
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
}

export function calculateRawScore(
  answers: Record<string, number>,
  correctKey: Record<string, number>,
): ScoreResult {
  const totalQuestions = Object.keys(correctKey).length;
  if (totalQuestions === 0) {
    return { correctCount: 0, totalQuestions: 0, scorePercentage: 0 };
  }

  let correctCount = 0;
  for (const [qId, correctOption] of Object.entries(correctKey)) {
    if (answers[qId] === correctOption) {
      correctCount += 1;
    }
  }

  return {
    correctCount,
    totalQuestions,
    scorePercentage: Math.round((correctCount / totalQuestions) * 100),
  };
}

export function isExamExpired(startedAt: Date, durationMinutes: number, now: Date = new Date()): boolean {
  const deadline = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
  return now.getTime() > deadline.getTime();
}

export function getPassingScore(level: Level): number {
  switch (level) {
    case 'N1':
      return 100;
    case 'N2':
      return 90;
    case 'N3':
      return 95;
    case 'N4':
      return 90;
    case 'N5':
      return 80;
  }
}
