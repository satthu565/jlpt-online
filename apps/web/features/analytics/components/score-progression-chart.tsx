'use client';

import React from 'react';
import type { AttemptRecord } from '../types';
import { Card } from '@jlpt/ui/components/card';

export interface ScoreProgressionChartProps {
  attempts: AttemptRecord[];
  passScore?: number;
  className?: string;
}

export function ScoreProgressionChart({
  attempts,
  passScore = 95,
  className = '',
}: ScoreProgressionChartProps): React.JSX.Element {
  if (attempts.length === 0) {
    return (
      <Card
        data-testid="score-progression-empty"
        className={`p-6 text-center text-xs text-slate-500 ${className}`}
      >
        Chưa có bài thi nào được ghi nhận để biểu diễn biểu đồ điểm.
      </Card>
    );
  }

  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );

  return (
    <Card
      data-testid="score-progression-chart"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📈</span> Biểu đồ tiến độ điểm số theo thời gian (STAT-02)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi xu hướng điểm số và mức độ tăng trưởng qua từng lượt thi thử.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-3 h-0.5 bg-rose-500 inline-block border-b border-dashed border-rose-500" />
            <span>Ngưỡng đỗ ({passScore}đ)</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            <span>Điểm đạt được</span>
          </span>
        </div>
      </div>

      {/* Visual Timeline Bar Chart */}
      <div className="space-y-3 pt-2" data-testid="score-timeline-bars">
        {sortedAttempts.map((attempt, idx) => {
          const score = attempt.totalScore;
          const max = attempt.maxScore || 180;
          const pct = Math.min(100, Math.round((score / max) * 100));
          const isPassed = score >= passScore;
          const formattedDate = new Date(attempt.submittedAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          return (
            <div
              key={attempt.id || idx}
              data-testid={`score-item-${idx}`}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{attempt.examTitle}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {attempt.level}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">{formattedDate}</span>
                  <span
                    data-testid={`score-value-${idx}`}
                    className={`font-mono font-bold text-sm ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {score} / {max}đ ({attempt.accuracy}%)
                  </span>
                </div>
              </div>

              {/* Progress bar with pass threshold marker */}
              <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${isPassed ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
