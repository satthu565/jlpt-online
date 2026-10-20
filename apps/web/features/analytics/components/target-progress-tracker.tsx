'use client';

import React from 'react';
import type { TargetProgressSummary } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

export interface TargetProgressTrackerProps {
  summary: TargetProgressSummary;
  className?: string;
}

export function TargetProgressTracker({
  summary,
  className = '',
}: TargetProgressTrackerProps): React.JSX.Element {
  const {
    targetLevel,
    targetScore,
    currentBestScore,
    gapToTarget,
    progressPercentage,
    passProbability,
    readinessLabel,
  } = summary;

  const isAchieved = currentBestScore >= targetScore;

  return (
    <Card
      data-testid="target-progress-tracker"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">🏆</span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tiến độ so với mục tiêu JLPT
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi khoảng cách điểm số và xác suất vượt qua kỳ thi thực tế.
          </p>
        </div>

        <div>
          <Badge variant={isAchieved ? 'success' : passProbability >= 70 ? 'primary' : 'warning'} size="sm">
            {readinessLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Cấp độ mục tiêu:</span>
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
            JLPT {targetLevel}
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Điểm mục tiêu:</span>
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
            {targetScore} / 180đ
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Điểm cao nhất hiện tại:</span>
          <strong
            data-testid="target-best-score"
            className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono"
          >
            {currentBestScore} / 180đ
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Khoảng cách tới đích:</span>
          <strong
            data-testid="target-gap"
            className={`text-sm font-mono font-bold ${gapToTarget === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
          >
            {gapToTarget === 0 ? 'Đã đạt mục tiêu! 🎯' : `Còn thiếu ${gapToTarget}đ`}
          </strong>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Mức độ hoàn thành mục tiêu:
          </span>
          <strong data-testid="target-progress-percentage" className="font-mono text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </strong>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${isAchieved ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Probability Gauge / Metric */}
      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-blue-950 dark:text-blue-200 block">
            Xác suất đỗ ước tính (Pass Probability):
          </span>
          <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            Tính toán dựa trên phân phối điểm các lần thi gần nhất và ngưỡng đỗ chuẩn của JLPT.
          </span>
        </div>
        <div
          data-testid="pass-probability-value"
          className="text-2xl font-black text-blue-900 dark:text-blue-300 font-mono"
        >
          {passProbability}%
        </div>
      </div>
    </Card>
  );
}
