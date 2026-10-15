import type {
  BlueprintScoring,
  ExamAnswerKey,
  Level,
  Result,
  ResultFlag,
  Skill,
} from '@jlpt/schema';

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

export function isExamExpired(
  startedAt: Date,
  durationMinutes: number,
  now: Date = new Date(),
): boolean {
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

export function calculateStandardExamResult(
  userAnswers: number[],
  answerKey: ExamAnswerKey,
  scoring: BlueprintScoring,
  options?: {
    durationSec?: number;
    flags?: ResultFlag[];
  },
): Result {
  const total = answerKey.keys.length;
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  const skillTotals: Record<Skill, { correct: number; total: number }> = {
    kanji: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
    grammar: { correct: 0, total: 0 },
    reading: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
  };

  for (let i = 0; i < total; i++) {
    const userVal = userAnswers[i] ?? 0;
    const correctVal = answerKey.keys[i];
    const skill = answerKey.skills[i] as Skill;

    if (skillTotals[skill]) {
      skillTotals[skill].total += 1;
    }

    if (userVal === 0) {
      blank += 1;
    } else if (userVal === correctVal) {
      correct += 1;
      if (skillTotals[skill]) {
        skillTotals[skill].correct += 1;
      }
    } else {
      wrong += 1;
    }
  }

  // bySection
  const bySection = answerKey.sectionRanges.map(([start, end], idx) => {
    let sectionCorrect = 0;
    const sectionTotal = end - start + 1;
    for (let i = start; i <= end; i++) {
      if ((userAnswers[i] ?? 0) === answerKey.keys[i]) {
        sectionCorrect += 1;
      }
    }
    return {
      code: `section_${idx + 1}`,
      correct: sectionCorrect,
      total: sectionTotal,
    };
  });

  // bySkill
  const bySkill = (Object.keys(skillTotals) as Skill[])
    .filter((skill) => skillTotals[skill].total > 0)
    .map((skill) => ({
      skill,
      correct: skillTotals[skill].correct,
      total: skillTotals[skill].total,
    }));

  // scoring sections
  const scoredSections = scoring.scoringSections.map((sec) => {
    let raw = 0;
    let rawMax = 0;
    for (let i = 0; i < total; i++) {
      const skill = answerKey.skills[i] as Skill;
      if (sec.skills.includes(skill)) {
        rawMax += 1;
        if ((userAnswers[i] ?? 0) === answerKey.keys[i]) {
          raw += 1;
        }
      }
    }
    const scaled = rawMax > 0 ? Math.round((raw / rawMax) * sec.maxScaled) : 0;
    const passed = scaled >= sec.minPass;
    return {
      code: sec.code,
      label: sec.label,
      raw,
      rawMax,
      scaled,
      maxScaled: sec.maxScaled,
      minPass: sec.minPass,
      passed,
    };
  });

  const totalScaled = scoredSections.reduce((acc, s) => acc + s.scaled, 0);
  const totalMax = scoredSections.reduce((acc, s) => acc + s.maxScaled, 0);
  const allSectionsPassed = scoredSections.every((s) => s.passed);
  const passEstimate = totalScaled >= scoring.totalPass && allSectionsPassed;

  return {
    totals: {
      correct,
      wrong,
      blank,
      total,
    },
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    durationSec: options?.durationSec ?? 0,
    bySection,
    bySkill,
    scoring: {
      method: 'linear_reference',
      sections: scoredSections,
      total: totalScaled,
      totalMax,
      totalPass: scoring.totalPass,
      passEstimate,
    },
    flags: options?.flags ?? [],
  };
}
