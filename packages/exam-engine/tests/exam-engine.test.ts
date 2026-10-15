import { describe, it, expect } from 'vitest';
import { calculateRawScore, isExamExpired, getPassingScore } from '../src/index.js';

describe('@jlpt/exam-engine smoke test', () => {
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
});
