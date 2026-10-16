import { describe, it, expect } from 'vitest';
import type { BlueprintScoring, ExamAnswerKey, Level, MondaiType, Skill } from '@jlpt/schema';
import { calculateStandardExamResult, getPassingScore } from '../src/scoring.js';

describe('Scoring Property-Based Testing (500 Randomized Answer Configurations)', () => {
  const ALL_LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

  function createStandardAnswerKey(totalQuestions: number): ExamAnswerKey {
    const keys: number[] = [];
    const skills: Skill[] = [];
    const mondaiTypes: MondaiType[] = [];

    const sec1End = Math.floor(totalQuestions * 0.35) - 1;
    const sec2End = Math.floor(totalQuestions * 0.70) - 1;
    const sec3End = totalQuestions - 1;

    for (let i = 0; i < totalQuestions; i++) {
      keys.push((i % 4) + 1);
      if (i <= sec1End) {
        skills.push(i % 2 === 0 ? 'kanji' : 'vocabulary');
        mondaiTypes.push('kanji_reading');
      } else if (i <= sec2End) {
        skills.push('reading');
        mondaiTypes.push('comprehension_short');
      } else {
        skills.push('listening');
        mondaiTypes.push('task_based');
      }
    }

    return {
      examId: '0192f000-00aa-7000-8000-000000000001',
      version: 1,
      keys,
      skills,
      mondaiTypes,
      sectionRanges: [
        [0, sec1End],
        [sec1End + 1, sec2End],
        [sec2End + 1, sec3End],
      ],
    };
  }

  function createBlueprintScoring(level: Level): BlueprintScoring {
    const totalPass = getPassingScore(level);
    return {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        { code: 'language_vocab', label: '言語知識', skills: ['kanji', 'vocabulary', 'grammar'], maxScaled: 60, minPass: 19 },
        { code: 'reading', label: '読解', skills: ['reading'], maxScaled: 60, minPass: 19 },
        { code: 'listening', label: '聴解', skills: ['listening'], maxScaled: 60, minPass: 19 },
      ],
      totalMax: 180,
      totalPass,
    };
  }

  it('preserves scoring mathematical boundaries and JLPT pass/fail invariants over 500 cases', () => {
    let seed = 1234567;
    function nextRand(): number {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    const CASES_COUNT = 500;
    const TOTAL_QUESTIONS = 60;
    const answerKey = createStandardAnswerKey(TOTAL_QUESTIONS);

    for (let i = 0; i < CASES_COUNT; i++) {
      const level = ALL_LEVELS[i % ALL_LEVELS.length]!;
      const scoring = createBlueprintScoring(level);

      // Generate randomized user answers: 0 (blank), 1, 2, 3, 4
      const userAnswers: number[] = [];
      for (let q = 0; q < TOTAL_QUESTIONS; q++) {
        const randChoice = Math.floor(nextRand() * 5); // 0 to 4
        userAnswers.push(randChoice);
      }

      const res = calculateStandardExamResult(userAnswers, answerKey, scoring);

      // Invariant 1: Total scaled score bounded within [0, 180]
      expect(res.scoring.total).toBeGreaterThanOrEqual(0);
      expect(res.scoring.total).toBeLessThanOrEqual(180);

      // Invariant 2: Max score is strictly 180
      expect(res.scoring.totalMax).toBe(180);

      // Invariant 3: Accuracy bounded within [0, 100]
      expect(res.accuracy).toBeGreaterThanOrEqual(0);
      expect(res.accuracy).toBeLessThanOrEqual(100);

      // Invariant 4: Exactly 3 sections, each bounded within [0, 60]
      expect(res.scoring.sections).toHaveLength(3);
      let sectionSum = 0;
      for (const s of res.scoring.sections) {
        expect(s.scaled).toBeGreaterThanOrEqual(0);
        expect(s.scaled).toBeLessThanOrEqual(60);
        sectionSum += s.scaled;

        // Invariant 5: Section pass threshold consistency
        const expectedSecPass = s.scaled >= s.minPass;
        expect(s.passed).toBe(expectedSecPass);
      }

      // Invariant 6: Sum of section scaled scores equals total scaled score
      expect(res.scoring.total).toBe(sectionSum);

      // Invariant 7: JLPT Dual Threshold Pass Invariant:
      // A candidate passes IF AND ONLY IF total scaled score >= totalPass AND each section score >= sectional threshold (19)
      const allSectionsMet = res.scoring.sections.every((s) => s.scaled >= s.minPass);
      const totalScoreMet = res.scoring.total >= scoring.totalPass;
      const expectedOverallPass = allSectionsMet && totalScoreMet;
      expect(res.scoring.passEstimate).toBe(expectedOverallPass);
    }
  });

  it('guarantees monotonicity: answering additional correct questions never decreases score', () => {
    const TOTAL_QUESTIONS = 40;
    const answerKey = createStandardAnswerKey(TOTAL_QUESTIONS);
    const scoring = createBlueprintScoring('N2');

    // Start with 10 correct answers
    const baseAnswers = Array.from({ length: TOTAL_QUESTIONS }, (_, i) =>
      i < 10 ? answerKey.keys[i]! : 0,
    );
    const baseResult = calculateStandardExamResult(baseAnswers, answerKey, scoring);

    // Give 10 more correct answers (total 20 correct)
    const improvedAnswers = Array.from(baseAnswers);
    for (let i = 10; i < 20; i++) {
      improvedAnswers[i] = answerKey.keys[i]!;
    }
    const improvedResult = calculateStandardExamResult(improvedAnswers, answerKey, scoring);

    expect(improvedResult.totals.correct).toBeGreaterThan(baseResult.totals.correct);
    expect(improvedResult.scoring.total).toBeGreaterThanOrEqual(baseResult.scoring.total);
    expect(improvedResult.accuracy).toBeGreaterThan(baseResult.accuracy);
  });

  it('handles boundary conditions: 100% correct and 100% blank', () => {
    const TOTAL_QUESTIONS = 30;
    const answerKey = createStandardAnswerKey(TOTAL_QUESTIONS);
    const scoring = createBlueprintScoring('N1');

    // Perfect score
    const perfectAnswers = [...answerKey.keys];
    const perfectResult = calculateStandardExamResult(perfectAnswers, answerKey, scoring);
    expect(perfectResult.scoring.total).toBe(180);
    expect(perfectResult.scoring.passEstimate).toBe(true);
    expect(perfectResult.accuracy).toBe(100);

    // Zero score (all blank)
    const zeroAnswers = Array.from({ length: TOTAL_QUESTIONS }, () => 0);
    const zeroResult = calculateStandardExamResult(zeroAnswers, answerKey, scoring);
    expect(zeroResult.scoring.total).toBe(0);
    expect(zeroResult.scoring.passEstimate).toBe(false);
    expect(zeroResult.accuracy).toBe(0);
  });
});
