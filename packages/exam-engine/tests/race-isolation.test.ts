import { describe, it, expect } from 'vitest';
import type { BlueprintScoring, ExamAnswerKey, Level } from '@jlpt/schema';
import { calculateStandardExamResult } from '../src/scoring.js';
import { generateScoreReportPdf, generateScoreReportXlsx, type ScoreReportData } from '../src/exports/index.js';

describe('Race Conditions, Parallel Execution & Isolation Verification (V01 Scope)', () => {
  it('handles 50 concurrent score calculations without state contamination', async () => {
    const totalQuestions = 30;
    const answerKey: ExamAnswerKey = {
      examId: '0192f000-00aa-7000-8000-000000000001',
      version: 1,
      keys: Array.from({ length: totalQuestions }, (_, i) => (i % 4) + 1),
      skills: Array.from({ length: totalQuestions }, (_, i) =>
        i < 10 ? 'kanji' : i < 20 ? 'reading' : 'listening',
      ),
      mondaiTypes: Array.from({ length: totalQuestions }, () => 'kanji_reading'),
      sectionRanges: [
        [0, 9],
        [10, 19],
        [20, 29],
      ],
    };

    const scoring: BlueprintScoring = {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        { code: 'language_vocab', label: '言語知識', skills: ['kanji', 'vocabulary', 'grammar'], maxScaled: 60, minPass: 19 },
        { code: 'reading', label: '読解', skills: ['reading'], maxScaled: 60, minPass: 19 },
        { code: 'listening', label: '聴解', skills: ['listening'], maxScaled: 60, minPass: 19 },
      ],
      totalPass: 90,
      totalMax: 180,
    };

    // Spawn 50 concurrent calculations
    const tasks = Array.from({ length: 50 }, (_, i) => {
      // User i answers: first (i % 30) answers correct, rest blank
      const correctCount = i % (totalQuestions + 1);
      const userAnswers = Array.from({ length: totalQuestions }, (_, q) =>
        q < correctCount ? answerKey.keys[q]! : 0,
      );

      return Promise.resolve().then(() => {
        const res = calculateStandardExamResult(userAnswers, answerKey, scoring);
        return { index: i, correctCount, res };
      });
    });

    const results = await Promise.all(tasks);

    expect(results).toHaveLength(50);
    for (const r of results) {
      expect(r.res.totals.correct).toBe(r.correctCount);
      expect(r.res.scoring.total).toBeGreaterThanOrEqual(0);
      expect(r.res.scoring.total).toBeLessThanOrEqual(180);
    }
  });

  it('generates 30 concurrent score report PDFs for different users without data interleaving', async () => {
    const reports: ScoreReportData[] = Array.from({ length: 30 }, (_, i) => {
      const pad = String(i).padStart(4, '0');
      const userId = `0192f000-${pad}-7000-8000-000000000001`;
      const attemptId = `0192f000-${pad}-7000-8000-000000000002`;
      return {
        attemptId,
        userId,
        candidateName: `受験者_${i} (${i}号)`,
        candidateEmail: `candidate_${i}@example.jp`,
        examTitle: `JLPT N${(i % 5) + 1} 試験`,
        level: (`N${(i % 5) + 1}`) as Level,
        examDate: '2026-10-16',
        scaledScore: 80 + i * 2,
        maxScore: 180,
        passThreshold: 90,
        passed: 80 + i * 2 >= 90,
        sections: [
          { code: 'language_vocab', name: '言語知識', scaledScore: 30, maxScore: 60, passThreshold: 19, passed: true },
          { code: 'reading', name: '読解', scaledScore: 30, maxScore: 60, passThreshold: 19, passed: true },
          { code: 'listening', name: '聴解', scaledScore: 20 + i, maxScore: 60, passThreshold: 19, passed: 20 + i >= 19 },
        ],
      };
    });

    // Run PDF generation concurrently
    const pdfTasks = reports.map((data) =>
      Promise.resolve().then(() =>
        generateScoreReportPdf({
          data,
          requestingActor: { userId: data.userId },
        }),
      ),
    );

    const pdfResults = await Promise.all(pdfTasks);

    expect(pdfResults).toHaveLength(30);

    // Verify isolation and no cross-contamination between all 30 outputs
    for (let i = 0; i < 30; i++) {
      const res = pdfResults[i]!;
      const data = reports[i]!;
      const bufStr = res.buffer.toString('utf8');

      // Contains own data
      expect(bufStr).toContain(data.userId);
      expect(bufStr).toContain(data.attemptId);
      expect(bufStr).toContain(data.candidateName);

      // Does NOT contain any other user's data
      const otherIdx = (i + 1) % 30;
      const otherData = reports[otherIdx]!;
      expect(bufStr).not.toContain(otherData.userId);
      expect(bufStr).not.toContain(otherData.candidateName);
    }
  });

  it('generates concurrent XLSX reports with zero shared mutable state', async () => {
    const dataA: ScoreReportData = {
      attemptId: '0192f000-0011-7000-8000-000000000001',
      userId: '0192f000-0011-7000-8000-000000000002',
      candidateName: 'User A',
      examTitle: 'JLPT N2',
      level: 'N2',
      examDate: '2026-10-16',
      scaledScore: 120,
      maxScore: 180,
      passThreshold: 90,
      passed: true,
      sections: [],
    };

    const dataB: ScoreReportData = {
      attemptId: '0192f000-0022-7000-8000-000000000001',
      userId: '0192f000-0022-7000-8000-000000000002',
      candidateName: 'User B',
      examTitle: 'JLPT N1',
      level: 'N1',
      examDate: '2026-10-16',
      scaledScore: 85,
      maxScore: 180,
      passThreshold: 100,
      passed: false,
      sections: [],
    };

    const [resA, resB] = await Promise.all([
      Promise.resolve().then(() => generateScoreReportXlsx({ data: dataA, requestingActor: { userId: dataA.userId } })),
      Promise.resolve().then(() => generateScoreReportXlsx({ data: dataB, requestingActor: { userId: dataB.userId } })),
    ]);

    expect(resA.buffer).not.toEqual(resB.buffer);
    expect(resA.passed).toBe(true);
    expect(resB.passed).toBe(false);
  });
});
