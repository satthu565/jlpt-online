'use client';

import React from 'react';
import { useCountdownTimer } from '../hooks/use-countdown-timer';
import { useI18n } from '../../../lib/i18n';

export interface ExamClockProps {
  deadline: string | null;
  serverNow: string;
  onExpire?: () => void;
  className?: string;
}

export function ExamClock({
  deadline,
  serverNow,
  onExpire,
  className = '',
}: ExamClockProps): React.JSX.Element {
  const { t } = useI18n();
  const { formattedTime, isWarning5Min, isCritical1Min, isExpired, remainingSec } =
    useCountdownTimer({
      deadline,
      serverNow,
      onExpire,
      enabled: Boolean(deadline),
    });

  if (!deadline) {
    return (
      <div
        data-testid="exam-clock"
        className={`jlpt-clock-unlimited text-sm font-medium text-slate-500 ${className}`}
      >
        {t('paperExam.unlimited')}
      </div>
    );
  }

  let alertLevel = 'normal';
  let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700';

  if (isCritical1Min || isExpired) {
    alertLevel = 'critical';
    badgeClass = 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-2 border-red-500';
  } else if (isWarning5Min) {
    alertLevel = 'warning';
    badgeClass = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-500';
  }

  return (
    <div
      role="timer"
      aria-live="off"
      aria-atomic="true"
      aria-label={t('paperExam.timer', { time: formattedTime })}
      data-alert-level={alertLevel}
      data-remaining-sec={remainingSec}
      data-testid="exam-clock"
      className={`jlpt-exam-clock inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-base shadow-sm transition-colors ${badgeClass} ${className}`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
        <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" />
      </svg>
      <span className="tabular-nums tracking-wider">{formattedTime}</span>
      {isCritical1Min && !isExpired && (
        <span className="text-xs font-sans font-semibold text-red-600 ml-1 hidden sm:inline">
          ({t('paperExam.oneMinute')})
        </span>
      )}
      {isWarning5Min && !isCritical1Min && (
        <span className="text-xs font-sans font-semibold text-amber-700 ml-1 hidden sm:inline">
          ({t('paperExam.fiveMinutes')})
        </span>
      )}
      {isExpired && (
        <span className="text-xs font-sans font-semibold text-red-700 ml-1">
          ({t('paperExam.timeUp')})
        </span>
      )}
    </div>
  );
}
