import { describe, it, expect } from 'vitest';
import {
  analyzeSpeedAndAccuracy,
  classifySpeedAccuracyQuadrant,
  analyzeAnswerChanges,
  analyzeUnseenProgress,
  compareTrueProgress,
  estimatePassProbability,
  UNCALIBRATED_PASS_DISCLAIMER,
  CALIBRATED_PASS_DISCLAIMER,
} from '../src/analytics/index.js';

describe('Learning Progress & Analytics Models (STAT-09, STAT-12, STAT-13, STAT-14, SCORE-14)', () => {
  describe('STAT-09: So sánh tốc độ và độ chính xác khi làm bài', () => {
    it('classifies performance into 4 quadrants correctly', () => {
      expect(classifySpeedAccuracyQuadrant(40, 85).quadrant).toBe('FAST_AND_ACCURATE');
      expect(classifySpeedAccuracyQuadrant(90, 85).quadrant).toBe('SLOW_AND_ACCURATE');
      expect(classifySpeedAccuracyQuadrant(35, 40).quadrant).toBe('FAST_AND_INACCURATE');
      expect(classifySpeedAccuracyQuadrant(95, 40).quadrant).toBe('SLOW_AND_INACCURATE');
    });

    it('computes average time, accuracy, and skill speed-accuracy report', () => {
      const items = [
        { questionId: '1', timeSpentMs: 30000, isCorrect: true, skill: 'vocabulary' as const },
        { questionId: '2', timeSpentMs: 40000, isCorrect: true, skill: 'vocabulary' as const },
        { questionId: '3', timeSpentMs: 90000, isCorrect: false, skill: 'reading' as const },
        { questionId: '4', timeSpentMs: 110000, isCorrect: true, skill: 'reading' as const },
      ];

      const report = analyzeSpeedAndAccuracy(items, 60, 60);

      expect(report.accuracyPercentage).toBe(75);
      expect(report.averageTimeSpentSec).toBe(67.5);
      expect(report.correctAverageTimeSpentSec).toBe(60);
      expect(report.wrongAverageTimeSpentSec).toBe(90);
      expect(report.bySkill.length).toBe(2);

      const vocabSkill = report.bySkill.find((s) => s.skill === 'vocabulary');
      expect(vocabSkill?.quadrant).toBe('FAST_AND_ACCURATE');
      expect(vocabSkill?.accuracyPercentage).toBe(100);

      const readingSkill = report.bySkill.find((s) => s.skill === 'reading');
      expect(readingSkill?.quadrant).toBe('SLOW_AND_INACCURATE');
      expect(readingSkill?.accuracyPercentage).toBe(50);
    });
  });

  describe('STAT-12: Phân tích câu thường đổi đáp án từ đúng sang sai', () => {
    it('detects second-guessing penalty (CORRECT_TO_WRONG) and provides harmful warning', () => {
      const answerKeys = { 0: 1, 1: 2, 2: 3, 3: 4 };

      // Question 0: Changed from option 1 (correct) to option 2 (wrong) -> CORRECT_TO_WRONG
      // Question 1: Changed from option 2 (correct) to option 3 (wrong) -> CORRECT_TO_WRONG
      // Question 2: Changed from option 1 (wrong) to option 3 (correct) -> WRONG_TO_CORRECT
      // Question 3: Kept option 4 (correct) -> NO_CHANGE
      const changes = [
        // Question 0
        { i: 0, v: 1, at: 1000 },
        { i: 0, v: 2, at: 5000 },
        // Question 1
        { i: 1, v: 2, at: 2000 },
        { i: 1, v: 3, at: 6000 },
        // Question 2
        { i: 2, v: 1, at: 3000 },
        { i: 2, v: 3, at: 7000 },
        // Question 3
        { i: 3, v: 4, at: 4000 },
      ];

      const analysis = analyzeAnswerChanges(changes, answerKeys, 4);

      expect(analysis.totalQuestions).toBe(4);
      expect(analysis.questionsWithChanges).toBe(3);
      expect(analysis.correctToWrongCount).toBe(2);
      expect(analysis.wrongToCorrectCount).toBe(1);
      expect(analysis.netScoreImpact).toBe(-1); // Lost 1 net point
      expect(analysis.secondGuessingTendency).toBe('HARMFUL');
      expect(analysis.advice).toContain('Trực giác ban đầu');
    });

    it('detects beneficial review when corrections outweigh second-guesses', () => {
      const answerKeys = { 0: 1, 1: 2 };
      const changes = [
        // Question 0: wrong to correct
        { i: 0, v: 3, at: 1000 },
        { i: 0, v: 1, at: 5000 },
        // Question 1: kept 2
        { i: 1, v: 2, at: 2000 },
      ];

      const analysis = analyzeAnswerChanges(changes, answerKeys, 2);

      expect(analysis.wrongToCorrectCount).toBe(1);
      expect(analysis.correctToWrongCount).toBe(0);
      expect(analysis.netScoreImpact).toBe(1);
      expect(analysis.secondGuessingTendency).toBe('BENEFICIAL');
      expect(analysis.advice).toContain('hiệu quả tích cực');
    });
  });

  describe('STAT-13: Thống kê tỷ lệ tiến bộ trên những câu chưa từng gặp', () => {
    it('isolates exposureCount === 0 and calculates chronological accuracy progression', () => {
      const periods = [
        {
          period: '2026-W40',
          questions: [
            { questionId: 'q1', isCorrect: true, exposureCount: 0 },
            { questionId: 'q2', isCorrect: false, exposureCount: 0 },
            { questionId: 'q-repeat', isCorrect: true, exposureCount: 2 }, // Excluded
          ],
        },
        {
          period: '2026-W41',
          questions: [
            { questionId: 'q3', isCorrect: true, exposureCount: 0 },
            { questionId: 'q4', isCorrect: true, exposureCount: 0 },
            { questionId: 'q5', isCorrect: false, exposureCount: 0 },
          ],
        },
        {
          period: '2026-W42',
          questions: [
            { questionId: 'q6', isCorrect: true, exposureCount: 0 },
            { questionId: 'q7', isCorrect: true, exposureCount: 0 },
          ],
        },
      ];

      const report = analyzeUnseenProgress(periods);

      expect(report.unseenQuestionCount).toBe(7);
      expect(report.unseenCorrectCount).toBe(5);
      expect(report.historicalTrend.length).toBe(3);
      expect(report.historicalTrend[0]?.unseenAccuracy).toBe(50); // W40: 1/2
      expect(report.historicalTrend[1]?.unseenAccuracy).toBe(66.67); // W41: 2/3
      expect(report.historicalTrend[2]?.unseenAccuracy).toBe(100); // W42: 2/2
      expect(report.progressDelta).toBe(50); // 100 - 50 = +50%
      expect(report.trendDirection).toBe('improving');
    });
  });

  describe('STAT-14: Phân biệt tiến bộ thực và tiến bộ do làm lại câu quen thuộc', () => {
    it('flags familiarity inflation when repeated question accuracy significantly exceeds unseen accuracy', () => {
      // 20 unseen questions: 10 correct (50%)
      const unseen = Array.from({ length: 20 }, (_, i) => ({
        questionId: `u-${i}`,
        isCorrect: i < 10,
        exposureCount: 0,
      }));

      // 20 familiar questions: 18 correct (90%)
      const familiar = Array.from({ length: 20 }, (_, i) => ({
        questionId: `f-${i}`,
        isCorrect: i < 18,
        exposureCount: 2,
      }));

      const comparison = compareTrueProgress([...unseen, ...familiar]);

      expect(comparison.unseenAccuracy).toBe(50);
      expect(comparison.familiarAccuracy).toBe(90);
      expect(comparison.familiarityDelta).toBe(40);
      expect(comparison.isInflatedByFamiliarity).toBe(true);
      expect(comparison.recommendedMode).toBe('unseen_practice');
      expect(comparison.assessment).toContain('Lạm phát do quen câu');
    });

    it('confirms true progress when unseen accuracy matches familiar accuracy', () => {
      const unseen = Array.from({ length: 20 }, (_, i) => ({
        questionId: `u-${i}`,
        isCorrect: i < 16, // 80%
        exposureCount: 0,
      }));
      const familiar = Array.from({ length: 20 }, (_, i) => ({
        questionId: `f-${i}`,
        isCorrect: i < 16, // 80%
        exposureCount: 1,
      }));

      const comparison = compareTrueProgress([...unseen, ...familiar]);

      expect(comparison.familiarityDelta).toBe(0);
      expect(comparison.isInflatedByFamiliarity).toBe(false);
      expect(comparison.recommendedMode).toBe('challenge');
      expect(comparison.assessment).toContain('Tiến bộ thực chất rất tốt');
    });
  });

  describe('SCORE-14 & Acceptance 3: Ước lượng xác suất đỗ kỳ thi', () => {
    it('reports UNCALIBRATED_ESTIMATE and explicit disclaimer when data is insufficient (< 3 full exams)', () => {
      const attempts = [
        {
          attemptId: 'att-1',
          level: 'N2' as const,
          totalScaledScore: 110,
          isFullExam: true,
          totalQuestionsAnswered: 105,
        },
        {
          attemptId: 'att-2',
          level: 'N2' as const,
          totalScaledScore: 115,
          isFullExam: true,
          totalQuestionsAnswered: 105,
        },
      ];

      const estimate = estimatePassProbability(attempts, 'N2');

      expect(estimate.sampleExamsCount).toBe(2);
      expect(estimate.isCalibrated).toBe(false);
      expect(estimate.status).toBe('UNCALIBRATED_ESTIMATE');
      expect(estimate.disclaimer).toBe(UNCALIBRATED_PASS_DISCLAIMER);
      expect(estimate.marginOfError).toBe(0.2); // Broad 20% margin
      expect(estimate.confidenceInterval[1] - estimate.confidenceInterval[0]).toBeGreaterThanOrEqual(0.3);
    });

    it('reports CALIBRATED estimate with tight confidence interval when sample size is sufficient (>= 3 full exams)', () => {
      const attempts = [
        {
          attemptId: 'att-1',
          level: 'N2' as const,
          totalScaledScore: 120,
          isFullExam: true,
          totalQuestionsAnswered: 105,
        },
        {
          attemptId: 'att-2',
          level: 'N2' as const,
          totalScaledScore: 125,
          isFullExam: true,
          totalQuestionsAnswered: 105,
        },
        {
          attemptId: 'att-3',
          level: 'N2' as const,
          totalScaledScore: 118,
          isFullExam: true,
          totalQuestionsAnswered: 105,
        },
      ];

      const estimate = estimatePassProbability(attempts, 'N2');

      expect(estimate.sampleExamsCount).toBe(3);
      expect(estimate.isCalibrated).toBe(true);
      expect(estimate.status).toBe('CALIBRATED');
      expect(estimate.disclaimer).toBe(CALIBRATED_PASS_DISCLAIMER);
      expect(estimate.marginOfError).toBeLessThanOrEqual(0.08); // Tight margin
      expect(estimate.passProbability).toBeGreaterThan(0.7);
      expect(estimate.skillBreakdown.length).toBe(4);
    });
  });
});
