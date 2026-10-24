'use client';

import React from 'react';
import { useI18n } from '../../../lib/i18n';

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
  const { t } = useI18n();
  const percentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div
      aria-label={t('paperExam.progressAria', { done: answeredCount, total: totalQuestions, percent: percentage })}
      className={`jlpt-progress-container ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {t('paperExam.progress', { done: answeredCount, total: totalQuestions })}
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
        aria-label={t('paperExam.progressBar')}
        className="surface surface--secondary rounded-2xl w-full h-2.5 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          // ui-allow-style: chiều rộng theo tiến độ, tính lúc chạy
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
