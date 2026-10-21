'use client';

import React from 'react';
import { useCountdownTimer } from '../hooks/use-countdown-timer';

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
        Không giới hạn thời gian
      </div>
    );
  }

  let alertLevel = 'normal';
  let badgeStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary, #f1f5f9)',
    color: 'var(--text-primary, #0f172a)',
    border: '1px solid var(--border-neutral, #cbd5e1)',
  };

  if (isCritical1Min || isExpired) {
    alertLevel = 'critical';
    badgeStyle = {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      border: '2px solid #ef4444',
      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    };
  } else if (isWarning5Min) {
    alertLevel = 'warning';
    badgeStyle = {
      backgroundColor: '#fef3c7',
      color: '#b45309',
      border: '1px solid #f59e0b',
    };
  }

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Thời gian làm bài còn lại: ${formattedTime}`}
      data-alert-level={alertLevel}
      data-remaining-sec={remainingSec}
      data-testid="exam-clock"
      className={`jlpt-exam-clock inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-base shadow-sm transition-colors ${className}`}
      style={badgeStyle}
    >
      <svg
        className={`w-5 h-5 ${isCritical1Min ? 'text-red-600 animate-spin' : isWarning5Min ? 'text-amber-600' : 'text-slate-600'}`}
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
          (Sắp hết giờ!)
        </span>
      )}
      {isWarning5Min && !isCritical1Min && (
        <span className="text-xs font-sans font-semibold text-amber-700 ml-1 hidden sm:inline">
          (&lt; 5 phút)
        </span>
      )}
      {isExpired && (
        <span className="text-xs font-sans font-semibold text-red-700 ml-1">
          (Hết giờ)
        </span>
      )}
    </div>
  );
}
