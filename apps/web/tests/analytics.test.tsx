import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  calculateTrueProgress,
  calculateScoreProgression,
  calculateSkillAccuracy,
  calculateMondaiAccuracy,
  calculateRepeatedMistakes,
  calculateCommonErrors,
  calculateMonthlyComparison,
  calculateStudyTime,
  calculateTargetProgress,
  calculateNextPriority,
  calculateSpeedAccuracy,
} from '../features/analytics/utils/calculator';
import { TrueProgressWidget } from '../features/analytics/components/true-progress-widget';
import { ScoreProgressionChart } from '../features/analytics/components/score-progression-chart';
import { SkillAccuracyWidget } from '../features/analytics/components/skill-accuracy-widget';
import { SpeedAccuracyWidget } from '../features/analytics/components/speed-accuracy-widget';
import { RepeatedMistakesWidget } from '../features/analytics/components/repeated-mistakes-widget';
import { CommonErrorsWidget } from '../features/analytics/components/common-errors-widget';
import { MonthlyComparisonWidget } from '../features/analytics/components/monthly-comparison-widget';
import { StudyTimeWidget } from '../features/analytics/components/study-time-widget';
import { TargetProgressTracker } from '../features/analytics/components/target-progress-tracker';
import { NextPriorityWidget } from '../features/analytics/components/next-priority-widget';
import { AnalyticsDashboard } from '../features/analytics/components/analytics-dashboard';
import type { AttemptRecord, QuestionAttemptRecord } from '../features/analytics/types';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

describe('Analytics, True Progress & Dashboard Hand-Calculation Suite (L03)', () => {
  // =========================================================================
  // 1. Acceptance 3: Dashboard dữ liệu tính tay đúng, không trộn câu quen với câu mới
  // =========================================================================

  describe('True Progress Calculation (No mixing of familiar and unseen questions)', () => {
    it('verifies exact manual math: strictly separates fresh unseen questions from familiar repeated questions', () => {
      // Hand-calculated dataset:
      // 10 fresh unseen questions: 7 correct, 3 wrong -> 7/10 = 70.00%
      // 5 familiar repeat questions: 5 correct, 0 wrong -> 5/5 = 100.00%
      const items = [
        // 10 Unseen items (exposureCount = 0)
        { questionId: 'u1', isCorrect: true, exposureCount: 0 },
        { questionId: 'u2', isCorrect: true, exposureCount: 0 },
        { questionId: 'u3', isCorrect: true, exposureCount: 0 },
        { questionId: 'u4', isCorrect: true, exposureCount: 0 },
        { questionId: 'u5', isCorrect: true, exposureCount: 0 },
        { questionId: 'u6', isCorrect: true, exposureCount: 0 },
        { questionId: 'u7', isCorrect: true, exposureCount: 0 },
        { questionId: 'u8', isCorrect: false, exposureCount: 0 },
        { questionId: 'u9', isCorrect: false, exposureCount: 0 },
        { questionId: 'u10', isCorrect: false, exposureCount: 0 },

        // 10 Familiar items (exposureCount >= 1)
        { questionId: 'f1', isCorrect: true, exposureCount: 1 },
        { questionId: 'f2', isCorrect: true, exposureCount: 2 },
        { questionId: 'f3', isCorrect: true, exposureCount: 1 },
        { questionId: 'f4', isCorrect: true, exposureCount: 3 },
        { questionId: 'f5', isCorrect: true, exposureCount: 1 },
        { questionId: 'f6', isCorrect: true, exposureCount: 2 },
        { questionId: 'f7', isCorrect: true, exposureCount: 1 },
        { questionId: 'f8', isCorrect: true, exposureCount: 1 },
        { questionId: 'f9', isCorrect: true, exposureCount: 4 },
        { questionId: 'f10', isCorrect: true, exposureCount: 2 },
      ];

      const res = calculateTrueProgress(items);

      // 1. Unseen accuracy must be EXACTLY 70.00%
      expect(res.unseenCount).toBe(10);
      expect(res.unseenAccuracy).toBe(70.0);

      // 2. Familiar accuracy must be EXACTLY 100.00%
      expect(res.familiarCount).toBe(10);
      expect(res.familiarAccuracy).toBe(100.0);

      // 3. Proves they are NOT mixed:
      // If mixed together, total accuracy would be (7 + 10) / (10 + 10) = 17 / 20 = 85.00%
      expect(res.unseenAccuracy).not.toBe(85.0);
      expect(res.familiarAccuracy).not.toBe(85.0);

      // 4. Familiarity delta: 100.00 - 70.00 = 30.00%
      expect(res.familiarityDelta).toBe(30.0);

      // 5. Familiarity inflation index: delta / unseenAccuracy = 30.0 / 70.0 = 0.42857... -> 0.429
      expect(res.familiarityInflationIndex).toBe(0.429);

      // 6. Recommendation must be 'unseen_practice' when inflated
      expect(res.recommendedMode).toBe('unseen_practice');
    });

    it('verifies non-inflated mastery when unseen and familiar accuracies are balanced', () => {
      // 10 unseen: 8 correct -> 80.00%
      // 10 familiar: 8 correct -> 80.00%
      const items = [
        ...Array.from({ length: 8 }, (_, i) => ({ questionId: `u_ok_${i}`, isCorrect: true, exposureCount: 0 })),
        ...Array.from({ length: 2 }, (_, i) => ({ questionId: `u_no_${i}`, isCorrect: false, exposureCount: 0 })),
        ...Array.from({ length: 8 }, (_, i) => ({ questionId: `f_ok_${i}`, isCorrect: true, exposureCount: 1 })),
        ...Array.from({ length: 2 }, (_, i) => ({ questionId: `f_no_${i}`, isCorrect: false, exposureCount: 1 })),
      ];

      const res = calculateTrueProgress(items);

      expect(res.unseenAccuracy).toBe(80.0);
      expect(res.familiarAccuracy).toBe(80.0);
      expect(res.familiarityDelta).toBe(0.0);
      expect(res.familiarityInflationIndex).toBe(0.0);
      expect(res.isInflatedByFamiliarity).toBe(false);
      expect(res.recommendedMode).toBe('challenge');
    });

    it('renders TrueProgressWidget with separated cards for unseen and familiar metrics', () => {
      const mockProgress = {
        unseenAccuracy: 65.5,
        unseenCount: 20,
        familiarAccuracy: 95.0,
        familiarCount: 15,
        familiarityDelta: 29.5,
        familiarityInflationIndex: 0.45,
        isInflatedByFamiliarity: true,
        assessment: 'Điểm số có dấu hiệu phụ thuộc vào câu quen thuộc.',
        recommendedMode: 'unseen_practice' as const,
      };

      const html = renderClean(<TrueProgressWidget progress={mockProgress} />);

      expect(html).toContain('data-testid="true-progress-widget"');
      expect(html).toContain('data-testid="unseen-stats-card"');
      expect(html).toContain('data-testid="familiar-stats-card"');
      expect(html).toContain('65.5%'); // Unseen
      expect(html).toContain('95%'); // Familiar
      expect(html).toContain('+29.5%'); // Delta
      expect(html).toContain('0.45'); // Inflation index
      expect(html).toContain('Luyện tập câu mới (Unseen Mode)');
    });
  });

  // =========================================================================
  // 2. Hand-calculation checks for STAT-02..08, 10, 11, SCORE-15
  // =========================================================================

  const TEST_ATTEMPTS: AttemptRecord[] = [
    {
      id: 'att-1',
      examId: 'e-1',
      examTitle: 'Đề thi N3 Đợt 1',
      level: 'N3',
      mode: 'real',
      totalScore: 90,
      maxScore: 180,
      accuracy: 50.0,
      passed: false,
      durationSec: 5400,
      submittedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'att-2',
      examId: 'e-2',
      examTitle: 'Đề thi N3 Đợt 2',
      level: 'N3',
      mode: 'real',
      totalScore: 110,
      maxScore: 180,
      accuracy: 61.1,
      passed: true,
      durationSec: 5000,
      submittedAt: '2026-09-12T10:00:00Z',
    },
    {
      id: 'att-3',
      examId: 'e-3',
      examTitle: 'Đề thi N3 Đợt 3',
      level: 'N3',
      mode: 'practice',
      totalScore: 135,
      maxScore: 180,
      accuracy: 75.0,
      passed: true,
      durationSec: 4600,
      submittedAt: '2026-10-15T10:00:00Z',
    },
  ];

  const TEST_QUESTION_ATTEMPTS: QuestionAttemptRecord[] = [
    // Kanji: 2 items, 1 correct (50.0%)
    {
      questionId: 'q-k1',
      questionNumber: '1',
      stemPreview: '漢字1',
      level: 'N3',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      isCorrect: true,
      timeSpentMs: 30000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:05:00Z',
    },
    {
      questionId: 'q-k2',
      questionNumber: '2',
      stemPreview: '漢字2',
      level: 'N3',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      isCorrect: false,
      timeSpentMs: 40000,
      exposureCount: 0,
      errorCategory: 'kanji_confusion',
      submittedAt: '2026-10-15T10:07:00Z',
    },

    // Vocabulary: 2 items, 2 correct (100.0%)
    {
      questionId: 'q-v1',
      questionNumber: '3',
      stemPreview: '語彙1',
      level: 'N3',
      skill: 'vocabulary',
      mondaiType: 'contextual',
      isCorrect: true,
      timeSpentMs: 35000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:09:00Z',
    },
    {
      questionId: 'q-v2',
      questionNumber: '4',
      stemPreview: '語彙2',
      level: 'N3',
      skill: 'vocabulary',
      mondaiType: 'paraphrase',
      isCorrect: true,
      timeSpentMs: 25000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:11:00Z',
    },

    // Grammar: 3 items, 2 correct (66.7%)
    {
      questionId: 'q-g1',
      questionNumber: '5',
      stemPreview: '文法1',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: true,
      timeSpentMs: 45000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:13:00Z',
    },
    {
      questionId: 'q-g2',
      questionNumber: '6',
      stemPreview: '文法2',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: true,
      timeSpentMs: 50000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:15:00Z',
    },
    {
      questionId: 'q-rep-grammar',
      questionNumber: '7',
      stemPreview: '文法ミス多発',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'sentence_composition',
      isCorrect: false,
      timeSpentMs: 60000,
      exposureCount: 2,
      errorCategory: 'grammar_trap',
      submittedAt: '2026-10-15T10:17:00Z',
    },
    // Same question missed previously
    {
      questionId: 'q-rep-grammar',
      questionNumber: '7',
      stemPreview: '文法ミス多発',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'sentence_composition',
      isCorrect: false,
      timeSpentMs: 58000,
      exposureCount: 1,
      errorCategory: 'grammar_trap',
      submittedAt: '2026-09-12T10:17:00Z',
    },

    // Reading: 2 items, 1 correct (50.0%)
    {
      questionId: 'q-r1',
      questionNumber: '8',
      stemPreview: '読解1',
      level: 'N3',
      skill: 'reading',
      mondaiType: 'comprehension_short',
      isCorrect: true,
      timeSpentMs: 90000,
      exposureCount: 0,
      submittedAt: '2026-10-15T10:20:00Z',
    },
    {
      questionId: 'q-r2',
      questionNumber: '9',
      stemPreview: '読解2',
      level: 'N3',
      skill: 'reading',
      mondaiType: 'comprehension_mid',
      isCorrect: false,
      timeSpentMs: 120000,
      exposureCount: 0,
      errorCategory: 'time_pressure',
      submittedAt: '2026-10-15T10:25:00Z',
    },

    // Listening: 2 items, 0 correct (0.0% -> Weakest!)
    {
      questionId: 'q-l1',
      questionNumber: '10',
      stemPreview: '聴解1',
      level: 'N3',
      skill: 'listening',
      mondaiType: 'task_based',
      isCorrect: false,
      timeSpentMs: 70000,
      exposureCount: 0,
      errorCategory: 'listening_distractor',
      submittedAt: '2026-10-15T10:30:00Z',
    },
    {
      questionId: 'q-l2',
      questionNumber: '11',
      stemPreview: '聴解2',
      level: 'N3',
      skill: 'listening',
      mondaiType: 'point',
      isCorrect: false,
      timeSpentMs: 65000,
      exposureCount: 0,
      errorCategory: 'listening_distractor',
      submittedAt: '2026-10-15T10:35:00Z',
    },
  ];

  it('STAT-02: verifies score progression ordering and score points', () => {
    const progression = calculateScoreProgression(TEST_ATTEMPTS);
    expect(progression).toHaveLength(3);
    expect(progression[0]!.totalScore).toBe(90);
    expect(progression[1]!.totalScore).toBe(110);
    expect(progression[2]!.totalScore).toBe(135);

    const html = renderClean(<ScoreProgressionChart attempts={progression} />);
    expect(html).toContain('data-testid="score-progression-chart"');
    expect(html).toContain('90 / 180đ');
    expect(html).toContain('110 / 180đ');
    expect(html).toContain('135 / 180đ');
  });

  it('STAT-03: verifies skill accuracy calculation hand-checked values', () => {
    const skills = calculateSkillAccuracy(TEST_QUESTION_ATTEMPTS);

    const kanji = skills.find((s) => s.skill === 'kanji')!;
    expect(kanji.correct).toBe(1);
    expect(kanji.total).toBe(2);
    expect(kanji.accuracy).toBe(50.0);

    const vocab = skills.find((s) => s.skill === 'vocabulary')!;
    expect(vocab.correct).toBe(2);
    expect(vocab.total).toBe(2);
    expect(vocab.accuracy).toBe(100.0);

    const listening = skills.find((s) => s.skill === 'listening')!;
    expect(listening.correct).toBe(0);
    expect(listening.total).toBe(2);
    expect(listening.accuracy).toBe(0.0);

    const html = renderClean(<SkillAccuracyWidget skills={skills} />);
    expect(html).toContain('data-testid="skill-accuracy-widget"');
    expect(html).toContain('50%');
    expect(html).toContain('100%');
  });

  it('STAT-04: verifies mondai type accuracy calculation', () => {
    const mondais = calculateMondaiAccuracy(TEST_QUESTION_ATTEMPTS);
    const kanjiReading = mondais.find((m) => m.mondaiType === 'kanji_reading')!;
    expect(kanjiReading.correct).toBe(1);
    expect(kanjiReading.total).toBe(2);
    expect(kanjiReading.accuracy).toBe(50.0);
  });

  it('STAT-05: verifies repeatedly wrong questions identification (wrongCount >= 2)', () => {
    const repeated = calculateRepeatedMistakes(TEST_QUESTION_ATTEMPTS);

    // Only 'q-rep-grammar' was missed >= 2 times (2 times)
    expect(repeated).toHaveLength(1);
    expect(repeated[0]!.questionId).toBe('q-rep-grammar');
    expect(repeated[0]!.wrongCount).toBe(2);
    expect(repeated[0]!.stemPreview).toBe('文法ミス多発');

    const html = renderClean(<RepeatedMistakesWidget mistakes={repeated} />);
    expect(html).toContain('data-testid="repeated-mistakes-widget"');
    expect(html).toContain('1 câu làm sai nhiều lần');
    expect(html).toContain('Sai 2 / 2 lần');
  });

  it('STAT-06: verifies common error pattern analysis', () => {
    const errors = calculateCommonErrors(TEST_QUESTION_ATTEMPTS);

    // 2 listening_distractor, 2 grammar_trap, 1 kanji_confusion, 1 time_pressure
    // Total errors = 6
    const distractor = errors.find((e) => e.category === 'listening_distractor')!;
    expect(distractor.count).toBe(2);
    expect(distractor.percentage).toBe(33.3); // 2/6 = 33.3%

    const html = renderClean(<CommonErrorsWidget errors={errors} />);
    expect(html).toContain('data-testid="common-errors-widget"');
    expect(html).toContain('Bẫy nghe hiểu');
  });

  it('STAT-07: verifies month-over-month comparison math', () => {
    const monthly = calculateMonthlyComparison(TEST_ATTEMPTS);

    expect(monthly).toHaveLength(3);
    // August
    expect(monthly[0]!.monthKey).toBe('2026-08');
    expect(monthly[0]!.avgScore).toBe(90.0);
    // September
    expect(monthly[1]!.monthKey).toBe('2026-09');
    expect(monthly[1]!.avgScore).toBe(110.0);
    // October
    expect(monthly[2]!.monthKey).toBe('2026-10');
    expect(monthly[2]!.avgScore).toBe(135.0);

    const html = renderClean(<MonthlyComparisonWidget monthlyStats={monthly} />);
    expect(html).toContain('data-testid="monthly-comparison-widget"');
    expect(html).toContain('Tháng 8/2026');
    expect(html).toContain('Tháng 9/2026');
    expect(html).toContain('Tháng 10/2026');
  });

  it('STAT-08: verifies study time hand-calculated totals', () => {
    // Total duration: 5400 + 5000 + 4600 = 15000 seconds = 250 minutes = 4.2 hours
    const studyTime = calculateStudyTime(TEST_ATTEMPTS, TEST_QUESTION_ATTEMPTS);

    expect(studyTime.totalMinutes).toBe(250);
    expect(studyTime.totalSessions).toBe(3);
    expect(studyTime.avgSessionMinutes).toBe(83); // 250 / 3 = 83.33 -> 83

    const html = renderClean(<StudyTimeWidget summary={studyTime} />);
    expect(html).toContain('data-testid="study-time-widget"');
    expect(html).toContain('4.2 giờ');
    expect(html).toContain('250 phút');
  });

  it('STAT-10: verifies progress tracking against target level and target score', () => {
    // Target N3, Target Score 120. Best score is 135.
    const target = calculateTargetProgress(TEST_ATTEMPTS, 'N3', 120);

    expect(target.currentBestScore).toBe(135);
    expect(target.targetScore).toBe(120);
    expect(target.gapToTarget).toBe(0);
    expect(target.progressPercentage).toBe(100);
    expect(target.passProbability).toBe(95);

    const html = renderClean(<TargetProgressTracker summary={target} />);
    expect(html).toContain('data-testid="target-progress-tracker"');
    expect(html).toContain('135 / 180đ');
    expect(html).toContain('Đã đạt mục tiêu!');
  });

  it('STAT-11: verifies priority recommendation picks the weakest skill', () => {
    const skills = calculateSkillAccuracy(TEST_QUESTION_ATTEMPTS);
    const rec = calculateNextPriority(skills);

    // Listening had 0% accuracy -> MUST be picked as priority!
    expect(rec.prioritySkill).toBe('listening');
    expect(rec.currentAccuracy).toBe(0.0);
    expect(rec.reason).toContain('Nghe hiểu');

    const html = renderClean(<NextPriorityWidget recommendation={rec} />);
    expect(html).toContain('data-testid="next-priority-widget"');
    expect(html).toContain('Nghe hiểu');
  });

  it('SCORE-15: verifies average time per question and per section speed-accuracy analysis', () => {
    // Total questions: 12
    // Total time = 30+40+35+25+45+50+60+58+90+120+70+65 = 688,000 ms
    // Avg time per question = 688,000 / 12 / 1000 = 57.33 -> 57.3 seconds
    // Correct questions = 6 out of 12 -> 50.0%
    const speedAcc = calculateSpeedAccuracy(TEST_QUESTION_ATTEMPTS, 60, 60);

    expect(speedAcc.avgTimePerQuestionSec).toBe(57.3);
    expect(speedAcc.accuracyPercentage).toBe(50.0);
    // isFast = 57.3 <= 60 (true); isAccurate = 50.0 >= 60 (false) -> FAST_AND_INACCURATE
    expect(speedAcc.quadrant).toBe('FAST_AND_INACCURATE');
    expect(speedAcc.quadrantLabel).toContain('Vội vàng');

    // Section averages: reading was (90000 + 120000) / 2 / 1000 = 105.0s
    expect(speedAcc.avgTimePerSectionSec['reading']).toBe(105.0);

    const html = renderClean(<SpeedAccuracyWidget summary={speedAcc} />);
    expect(html).toContain('data-testid="speed-accuracy-widget"');
    expect(html).toContain('57.3 giây');
    expect(html).toContain('Vội vàng');
  });

  // =========================================================================
  // 3. Composite Dashboard Integration
  // =========================================================================

  it('renders the complete AnalyticsDashboard embedding all widgets without errors', () => {
    const html = renderClean(
      <AnalyticsDashboard
        attempts={TEST_ATTEMPTS}
        questionAttempts={TEST_QUESTION_ATTEMPTS}
        targetLevel="N3"
        targetScore={120}
      />,
    );

    expect(html).toContain('data-testid="analytics-dashboard"');
    expect(html).toContain('data-testid="true-progress-widget"');
    expect(html).toContain('data-testid="target-progress-tracker"');
    expect(html).toContain('data-testid="next-priority-widget"');
    expect(html).toContain('data-testid="score-progression-chart"');
    expect(html).toContain('data-testid="skill-accuracy-widget"');
    expect(html).toContain('data-testid="speed-accuracy-widget"');
    expect(html).toContain('data-testid="repeated-mistakes-widget"');
    expect(html).toContain('data-testid="common-errors-widget"');
    expect(html).toContain('data-testid="monthly-comparison-widget"');
    expect(html).toContain('data-testid="study-time-widget"');
  });
});
