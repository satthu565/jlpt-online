'use client';

import React, { useMemo, useState } from 'react';
import type { AttemptRecord, QuestionAttemptRecord } from '../types';
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
} from '../utils/calculator';
import { TrueProgressWidget } from './true-progress-widget';
import { TargetProgressTracker } from './target-progress-tracker';
import { NextPriorityWidget } from './next-priority-widget';
import { ScoreProgressionChart } from './score-progression-chart';
import { SkillAccuracyWidget } from './skill-accuracy-widget';
import { SpeedAccuracyWidget } from './speed-accuracy-widget';
import { RepeatedMistakesWidget } from './repeated-mistakes-widget';
import { CommonErrorsWidget } from './common-errors-widget';
import { MonthlyComparisonWidget } from './monthly-comparison-widget';
import { StudyTimeWidget } from './study-time-widget';
import type { Level, Skill } from '@jlpt/schema';

export interface AnalyticsDashboardProps {
  attempts: AttemptRecord[];
  questionAttempts: QuestionAttemptRecord[];
  targetLevel?: Level;
  targetScore?: number;
  className?: string;
}

export function AnalyticsDashboard({
  attempts,
  questionAttempts,
  targetLevel = 'N3',
  targetScore = 120,
  className = '',
}: AnalyticsDashboardProps): React.JSX.Element {
  const [selectedLevel, setSelectedLevel] = useState<Level | 'ALL'>(targetLevel);

  // Filter attempts by selected level if not 'ALL'
  const filteredAttempts = useMemo(() => {
    if (selectedLevel === 'ALL') return attempts;
    const match = attempts.filter((a) => a.level === selectedLevel);
    return match.length > 0 ? match : attempts;
  }, [attempts, selectedLevel]);

  // Filter question attempts by selected level if not 'ALL'
  const filteredQuestionAttempts = useMemo(() => {
    if (selectedLevel === 'ALL') return questionAttempts;
    const match = questionAttempts.filter((q) => q.level === selectedLevel);
    return match.length > 0 ? match : questionAttempts;
  }, [questionAttempts, selectedLevel]);

  // 1. Target tracking (STAT-10)
  const targetProgress = useMemo(() => {
    const activeLevel = selectedLevel === 'ALL' ? targetLevel : selectedLevel;
    return calculateTargetProgress(attempts, activeLevel, targetScore);
  }, [attempts, selectedLevel, targetLevel, targetScore]);

  // Sectional cutoffs (Chống điểm liệt JLPT)
  const sectionalBenchmarks = useMemo(() => {
    const langSkills: Skill[] = ['kanji', 'vocabulary', 'grammar'];
    const langItems = filteredQuestionAttempts.filter((q) => langSkills.includes(q.skill));
    const readingItems = filteredQuestionAttempts.filter((q) => q.skill === 'reading');
    const listeningItems = filteredQuestionAttempts.filter((q) => q.skill === 'listening');

    const calcSec = (items: typeof questionAttempts, name: string, shortLabel: string) => {
      const total = items.length;
      const correct = items.filter((i) => i.isCorrect).length;
      const best = targetProgress.currentBestScore;
      const estimatedScore = total > 0 ? Math.round((correct / total) * 60) : Math.round(best / 3);
      return {
        name,
        shortLabel,
        estimatedScore,
        maxScore: 60,
        isSafe: estimatedScore >= 19,
        questionCount: total,
      };
    };

    return [
      calcSec(langItems, 'Kiến thức ngôn ngữ (Từ vựng/Kanji/Ngữ pháp)', 'lang'),
      calcSec(readingItems, 'Đọc hiểu', 'reading'),
      calcSec(listeningItems, 'Nghe hiểu', 'listening'),
    ];
  }, [filteredQuestionAttempts, targetProgress.currentBestScore]);

  // 2. Score progression over time (STAT-02)
  const progression = useMemo(() => {
    return calculateScoreProgression(filteredAttempts);
  }, [filteredAttempts]);

  // 3. True Progress (Acceptance 3 - Fresh vs Familiar questions strictly isolated)
  const trueProgress = useMemo(() => {
    return calculateTrueProgress(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  // 4. Skill & Mondai accuracy (STAT-03, STAT-04)
  const skillStats = useMemo(() => {
    return calculateSkillAccuracy(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  const mondaiStats = useMemo(() => {
    return calculateMondaiAccuracy(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  // 5. Speed & accuracy analysis (SCORE-15)
  const speedAccuracy = useMemo(() => {
    return calculateSpeedAccuracy(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  // 6. Next priority recommendation (STAT-11)
  const nextPriority = useMemo(() => {
    return calculateNextPriority(skillStats);
  }, [skillStats]);

  // 7. Repeated mistakes (STAT-05)
  const repeatedMistakes = useMemo(() => {
    return calculateRepeatedMistakes(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  // 8. Common error patterns (STAT-06)
  const commonErrors = useMemo(() => {
    return calculateCommonErrors(filteredQuestionAttempts);
  }, [filteredQuestionAttempts]);

  // 9. Monthly comparison (STAT-07)
  const monthlyStats = useMemo(() => {
    return calculateMonthlyComparison(attempts);
  }, [attempts]);

  // 10. Study time summary (STAT-08)
  const studyTime = useMemo(() => {
    return calculateStudyTime(attempts, questionAttempts);
  }, [attempts, questionAttempts]);

  return (
    <div
      data-testid="analytics-dashboard"
      className={`jlpt-analytics-dashboard space-y-8 ${className}`}
    >
      {/* TẦNG 1: TỔNG QUAN, MỤC TIÊU & CHỐNG ĐIỂM LIỆT */}
      <section aria-label="Mục tiêu và điểm liệt JLPT">
        <TargetProgressTracker
          summary={targetProgress}
          selectedLevel={selectedLevel}
          onSelectLevel={setSelectedLevel}
          sectionalBenchmarks={sectionalBenchmarks}
        />
      </section>

      {/* TẦNG 2: PHONG ĐỘ THI CÁC NĂM & ĐỐI SÁNH TIẾN ĐỘ THỰC CHẤT */}
      <section aria-label="Tiến độ thi và đối sánh thực chất" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ScoreProgressionChart attempts={progression} />
          </div>
          <div className="lg:col-span-5">
            <NextPriorityWidget recommendation={nextPriority} />
          </div>
        </div>

        {/* Acceptance 3: True Progress Widget (Unseen vs Familiar - NO MIXING) */}
        <TrueProgressWidget progress={trueProgress} />
      </section>

      {/* TẦNG 3: BẢN ĐỒ KỸ NĂNG & TỐC ĐỘ LÀM BÀI */}
      <section aria-label="Bản đồ kỹ năng và tốc độ" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <SkillAccuracyWidget skills={skillStats} mondais={mondaiStats} />
          </div>
          <div className="lg:col-span-5">
            <SpeedAccuracyWidget summary={speedAccuracy} />
          </div>
        </div>
      </section>

      {/* TẦNG 4: HÀNH ĐỘNG CẢI THIỆN & CÂU HỎI SAI NHIỀU LẦN */}
      <section aria-label="Hành động cải thiện điểm số" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <RepeatedMistakesWidget mistakes={repeatedMistakes} />
          </div>
          <div className="lg:col-span-5">
            <CommonErrorsWidget errors={commonErrors} />
          </div>
        </div>
      </section>

      {/* TẦNG 5: LỊCH SỬ THÁNG & THỜI GIAN ÔN TẬP */}
      <section aria-label="Lịch sử tháng và thời lượng" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <MonthlyComparisonWidget monthlyStats={monthlyStats} />
          </div>
          <div className="lg:col-span-5">
            <StudyTimeWidget summary={studyTime} />
          </div>
        </div>
      </section>
    </div>
  );
}
