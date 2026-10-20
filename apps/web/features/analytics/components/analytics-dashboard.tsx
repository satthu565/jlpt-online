'use client';

import React, { useMemo } from 'react';
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
import type { Level } from '@jlpt/schema';

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
  // 1. True Progress (Acceptance 3 - Fresh vs Familiar questions strictly isolated)
  const trueProgress = useMemo(() => {
    return calculateTrueProgress(questionAttempts);
  }, [questionAttempts]);

  // 2. Score progression over time (STAT-02)
  const progression = useMemo(() => {
    return calculateScoreProgression(attempts);
  }, [attempts]);

  // 3. Skill & Mondai accuracy (STAT-03, STAT-04)
  const skillStats = useMemo(() => {
    return calculateSkillAccuracy(questionAttempts);
  }, [questionAttempts]);

  const mondaiStats = useMemo(() => {
    return calculateMondaiAccuracy(questionAttempts);
  }, [questionAttempts]);

  // 4. Repeated mistakes (STAT-05)
  const repeatedMistakes = useMemo(() => {
    return calculateRepeatedMistakes(questionAttempts);
  }, [questionAttempts]);

  // 5. Common error patterns (STAT-06)
  const commonErrors = useMemo(() => {
    return calculateCommonErrors(questionAttempts);
  }, [questionAttempts]);

  // 6. Monthly comparison (STAT-07)
  const monthlyStats = useMemo(() => {
    return calculateMonthlyComparison(attempts);
  }, [attempts]);

  // 7. Study time summary (STAT-08)
  const studyTime = useMemo(() => {
    return calculateStudyTime(attempts, questionAttempts);
  }, [attempts, questionAttempts]);

  // 8. Target tracking (STAT-10)
  const targetProgress = useMemo(() => {
    return calculateTargetProgress(attempts, targetLevel, targetScore);
  }, [attempts, targetLevel, targetScore]);

  // 9. Next priority recommendation (STAT-11)
  const nextPriority = useMemo(() => {
    return calculateNextPriority(skillStats);
  }, [skillStats]);

  // 10. Speed & accuracy analysis (SCORE-15)
  const speedAccuracy = useMemo(() => {
    return calculateSpeedAccuracy(questionAttempts);
  }, [questionAttempts]);

  return (
    <div
      data-testid="analytics-dashboard"
      className={`jlpt-analytics-dashboard space-y-6 ${className}`}
    >
      {/* 1. Target Tracking Header & Priority Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <TargetProgressTracker summary={targetProgress} />
        </div>
        <div className="lg:col-span-5">
          <NextPriorityWidget recommendation={nextPriority} />
        </div>
      </div>

      {/* 2. Acceptance 3: True Progress Widget (Unseen vs Familiar - NO MIXING) */}
      <TrueProgressWidget progress={trueProgress} />

      {/* 3. Score Over Time & Speed-Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <ScoreProgressionChart attempts={progression} />
        </div>
        <div className="lg:col-span-5">
          <SpeedAccuracyWidget summary={speedAccuracy} />
        </div>
      </div>

      {/* 4. Skills & Mondai Accuracy */}
      <SkillAccuracyWidget skills={skillStats} mondais={mondaiStats} />

      {/* 5. Repeated Mistakes & Common Error Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <RepeatedMistakesWidget mistakes={repeatedMistakes} />
        </div>
        <div className="lg:col-span-5">
          <CommonErrorsWidget errors={commonErrors} />
        </div>
      </div>

      {/* 6. Monthly Comparison & Study Time Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <MonthlyComparisonWidget monthlyStats={monthlyStats} />
        </div>
        <div className="lg:col-span-5">
          <StudyTimeWidget summary={studyTime} />
        </div>
      </div>
    </div>
  );
}
