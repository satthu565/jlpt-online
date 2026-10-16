import { describe, it, expect } from 'vitest';
import {
  calculateEmpiricalDifficulty,
  validateItemQuality,
  assignDifficultyLabel,
  scoreToDifficultyScale,
} from '../src/difficulty/index.js';

describe('Empirical Difficulty & Psychometrics (QB-10, QB-19, QB-20, Acceptance 2)', () => {
  describe('Acceptance 2: Difficulty đủ mẫu mới có kết luận', () => {
    it('returns INSUFFICIENT_DATA and hasConclusion = false when sample size is below threshold (< 30)', () => {
      const questionId = '11111111-1111-1111-1111-111111111111';
      // 15 attempts (below minSampleSize of 30)
      const attempts = Array.from({ length: 15 }, (_, i) => ({
        questionId,
        isCorrect: i % 2 === 0,
        selectedOption: i % 2 === 0 ? 1 : 2,
      }));

      const result = calculateEmpiricalDifficulty(questionId, attempts, 30);

      expect(result.sampleSize).toBe(15);
      expect(result.requiredSampleSize).toBe(30);
      expect(result.hasConclusion).toBe(false);
      expect(result.status).toBe('INSUFFICIENT_DATA');
      expect(result.difficultyIndex).toBeDefined();
    });

    it('returns CALIBRATED and hasConclusion = true when sample size meets threshold (>= 30)', () => {
      const questionId = '22222222-2222-2222-2222-222222222222';
      // 40 attempts (meets minSampleSize of 30)
      // 10 correct, 30 wrong -> errorRate = 30 / 40 = 0.75 -> difficultyIndex = 75
      const attempts = Array.from({ length: 40 }, (_, i) => ({
        questionId,
        isCorrect: i < 10,
        selectedOption: i < 10 ? 1 : 3,
      }));

      const result = calculateEmpiricalDifficulty(questionId, attempts, 30);

      expect(result.sampleSize).toBe(40);
      expect(result.hasConclusion).toBe(true);
      expect(result.status).toBe('CALIBRATED');
      expect(result.errorRate).toBe(0.75);
      expect(result.difficultyIndex).toBe(75);
      expect(result.confidenceInterval[0]).toBeLessThan(75);
      expect(result.confidenceInterval[1]).toBeGreaterThan(75);
      expect(result.standardError).toBeGreaterThan(0);
    });

    it('handles empty attempts safely', () => {
      const questionId = '33333333-3333-3333-3333-333333333333';
      const result = calculateEmpiricalDifficulty(questionId, []);

      expect(result.totalAttempts).toBe(0);
      expect(result.hasConclusion).toBe(false);
      expect(result.status).toBe('INSUFFICIENT_DATA');
      expect(result.difficultyIndex).toBe(50);
    });
  });

  describe('QB-10: Gắn nhãn độ khó', () => {
    it('correctly maps scores to difficulty scales (easy, medium, hard, very_hard)', () => {
      expect(scoreToDifficultyScale(15)).toBe('easy');
      expect(scoreToDifficultyScale(30)).toBe('easy');
      expect(scoreToDifficultyScale(45)).toBe('medium');
      expect(scoreToDifficultyScale(60)).toBe('medium');
      expect(scoreToDifficultyScale(75)).toBe('hard');
      expect(scoreToDifficultyScale(80)).toBe('hard');
      expect(scoreToDifficultyScale(95)).toBe('very_hard');
    });

    it('assigns difficulty label with empirical evidence when calibrated', () => {
      const stats = calculateEmpiricalDifficulty(
        '44444444-4444-4444-4444-444444444444',
        Array.from({ length: 120 }, (_, i) => ({
          questionId: '44444444-4444-4444-4444-444444444444',
          isCorrect: i < 30, // 90 wrong -> error rate 75%
        })),
        30,
      );

      const label = assignDifficultyLabel(stats, 50, 'N2');
      expect(label.scale).toBe('hard');
      expect(label.score).toBe(75);
      expect(label.source).toBe('empirical');
      expect(label.confidence).toBe('high'); // >= 100 sample size
    });

    it('falls back to estimated label when empirical data is insufficient', () => {
      const stats = calculateEmpiricalDifficulty(
        '55555555-5555-5555-5555-555555555555',
        [{ questionId: '55555555-5555-5555-5555-555555555555', isCorrect: false }],
        30,
      );

      const label = assignDifficultyLabel(stats, 40, 'N3');
      expect(label.scale).toBe('medium');
      expect(label.score).toBe(40);
      expect(label.source).toBe('estimated');
      expect(label.confidence).toBe('uncalibrated');
    });
  });

  describe('QB-20: Kiểm định chất lượng câu hỏi dựa trên tỷ lệ chọn đáp án', () => {
    it('detects functional distractors and well-formed item quality', () => {
      const question = {
        id: '66666666-6666-6666-6666-666666666666',
        correctOption: 2,
        optionsCount: 4,
      };

      // 50 attempts:
      // Option 2 (correct): 30 candidates (60%)
      // Option 1: 8 candidates (16%)
      // Option 3: 7 candidates (14%)
      // Option 4: 5 candidates (10%)
      // All distractors >= 5%, upper group scores higher than lower group
      const attempts = [
        ...Array.from({ length: 30 }, () => ({
          questionId: question.id,
          selectedOption: 2,
          totalScore: 85,
        })),
        ...Array.from({ length: 8 }, () => ({
          questionId: question.id,
          selectedOption: 1,
          totalScore: 40,
        })),
        ...Array.from({ length: 7 }, () => ({
          questionId: question.id,
          selectedOption: 3,
          totalScore: 35,
        })),
        ...Array.from({ length: 5 }, () => ({
          questionId: question.id,
          selectedOption: 4,
          totalScore: 30,
        })),
      ];

      const validation = validateItemQuality(question, attempts, 30);

      expect(validation.hasConclusion).toBe(true);
      expect(validation.status).toBe('CALIBRATED');
      expect(validation.distractorAnalysis.every((d) => d.isFunctional)).toBe(true);
      expect(validation.discriminationIndex).toBeGreaterThan(0.3);
      expect(validation.discriminationRating).toBe('EXCELLENT');
      expect(validation.qualityFlags).toContain('WELL_FORMED');
    });

    it('detects flawed answer key with negative discrimination (FLAWED_KEY)', () => {
      const question = {
        id: '77777777-7777-7777-7777-777777777777',
        correctOption: 1, // Supposedly 1 is correct
      };

      // Low scorers got 1, high scorers got 3
      const attempts = [
        // Top 15 scorers chose option 3
        ...Array.from({ length: 15 }, () => ({
          questionId: question.id,
          selectedOption: 3,
          totalScore: 90,
        })),
        // Bottom 15 scorers chose option 1
        ...Array.from({ length: 15 }, () => ({
          questionId: question.id,
          selectedOption: 1,
          totalScore: 20,
        })),
      ];

      const validation = validateItemQuality(question, attempts, 30);

      expect(validation.hasConclusion).toBe(true);
      expect(validation.discriminationIndex).toBeLessThan(0);
      expect(validation.discriminationRating).toBe('FLAWED_KEY');
      expect(validation.qualityFlags).toContain('FLAWED_KEY');
      expect(validation.recommendation).toContain('Chỉ số phân biệt âm');
    });

    it('detects non-functional distractors selected by less than 5%', () => {
      const question = {
        id: '88888888-8888-8888-8888-888888888888',
        correctOption: 1,
      };

      // 40 attempts: option 4 chosen by 0 candidates
      const attempts = [
        ...Array.from({ length: 25 }, () => ({
          questionId: question.id,
          selectedOption: 1,
          totalScore: 80,
        })),
        ...Array.from({ length: 10 }, () => ({
          questionId: question.id,
          selectedOption: 2,
          totalScore: 50,
        })),
        ...Array.from({ length: 5 }, () => ({
          questionId: question.id,
          selectedOption: 3,
          totalScore: 40,
        })),
      ];

      const validation = validateItemQuality(question, attempts, 30);

      expect(validation.hasConclusion).toBe(true);
      expect(validation.qualityFlags).toContain('NON_FUNCTIONAL_DISTRACTOR');
      const opt4 = validation.distractorAnalysis.find((d) => d.optionIndex === 4);
      expect(opt4?.isFunctional).toBe(false);
      expect(opt4?.percentage).toBe(0);
    });
  });
});
