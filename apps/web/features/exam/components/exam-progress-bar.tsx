'use client';

import React from 'react';

export interface ExamProgressBarProps {
  answeredCount: number;
  totalQuestions: number;
  className?: string;
}

export function ExamProgressBar({
  answeredCount,
  totalQuestions,
  className = '',
}: ExamProgressBarProps): React.JSX.Element {
  const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div
      aria-label={`Tiến độ hoàn thành: ${answeredCount} trên ${totalQuestions} câu (${percentage}%)`}
      className={`jlpt-progress-container ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Tiến độ: {answeredCount} / {totalQuestions} câu
        </span>
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
          {percentage}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Thanh tiến độ làm bài"
        className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
