import { describe, it, expect } from 'vitest';
import {
  calculateRawScore,
  isExamExpired,
  getPassingScore,
  calculateStandardExamResult,
} from '../src/index.js';
import type { ExamAnswerKey, BlueprintScoring } from '@jlpt/schema';

describe('@jlpt/exam-engine tests', () => {
  it('calculates score correctly', () => {
    const key = { q1: 1, q2: 3, q3: 2, q4: 4 };
    const answers = { q1: 1, q2: 3, q3: 1, q4: 4 };
    const res = calculateRawScore(answers, key);

    expect(res.correctCount).toBe(3);
    expect(res.totalQuestions).toBe(4);
    expect(res.scorePercentage).toBe(75);
  });

  it('determines exam expiration properly', () => {
    const started = new Date('2026-10-15T10:00:00Z');
    const during = new Date('2026-10-15T10:30:00Z');
    const after = new Date('2026-10-15T11:01:00Z');

    expect(isExamExpired(started, 60, during)).toBe(false);
    expect(isExamExpired(started, 60, after)).toBe(true);
  });

  it('provides passing scores for JLPT levels', () => {
    expect(getPassingScore('N1')).toBe(100);
    expect(getPassingScore('N5')).toBe(80);
  });

  it('calculates complete standard exam result with linear_reference scoring', () => {
    const answerKey: ExamAnswerKey = {
      examId: '0192f0c0-0000-7000-8000-000000000001',
      version: 1,
      keys: [1, 2, 3, 4],
      skills: ['kanji', 'vocabulary', 'reading', 'listening'],
      mondaiTypes: ['kanji_reading', 'orthography', 'comprehension_short', 'task_based'],
      sectionRanges: [[0, 1], [2, 3]],
    };

    const scoring: BlueprintScoring = {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        {
          code: 'language_reading',
          label: '言語知識・読解',
          skills: ['kanji', 'vocabulary', 'reading'],
          maxScaled: 120,
          minPass: 38,
        },
        {
          code: 'listening',
          label: '聴解',
          skills: ['listening'],
          maxScaled: 60,
          minPass: 19,
        },
      ],
      totalMax: 180,
      totalPass: 95,
    };

    const userAnswers = [1, 2, 3, 0]; // 3 correct, 1 blank
    const result = calculateStandardExamResult(userAnswers, answerKey, scoring, {
      durationSec: 1200,
    });

    expect(result.totals.correct).toBe(3);
    expect(result.totals.wrong).toBe(0);
    expect(result.totals.blank).toBe(1);
    expect(result.totals.total).toBe(4);
    expect(result.accuracy).toBe(75);
    expect(result.durationSec).toBe(1200);

    // Section 1 has 3/3 -> 120/120 scaled
    // Section 2 has 0/1 -> 0/60 scaled
    expect(result.scoring.sections[0]?.scaled).toBe(120);
    expect(result.scoring.sections[1]?.scaled).toBe(0);
    expect(result.scoring.total).toBe(120);
    expect(result.scoring.passEstimate).toBe(false); // section 2 failed minPass
  });
});
