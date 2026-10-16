'use client';

import React from 'react';
import type { PublicSection } from '@jlpt/schema';

export interface SectionHeaderProps {
  sections: PublicSection[];
  currentSectionIndex: number;
  lockedSections: number[];
  onSelectSection?: (sectionIndex: number) => void;
  className?: string;
}

export function SectionHeader({
  sections,
  currentSectionIndex,
  lockedSections,
  onSelectSection,
  className = '',
}: SectionHeaderProps): React.JSX.Element {
  return (
    <nav
      aria-label="Các phần thi JLPT"
      className={`jlpt-section-header bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-2">
          {sections.map((sec, idx) => {
            const isCurrent = idx === currentSectionIndex;
            const isLocked = lockedSections.includes(idx);
            const isUpcoming = idx > currentSectionIndex;
            const durationMinutes = Math.round(sec.durationSec / 60);

            let statusLabel = 'Chưa bắt đầu';
            if (isCurrent) statusLabel = 'Đang làm bài';
            if (isLocked) statusLabel = 'Đã khóa';

            return (
              <button
                key={sec.code}
                type="button"
                disabled={isLocked || isUpcoming}
                onClick={() => onSelectSection?.(idx)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Phần ${idx + 1}: ${sec.title}, ${durationMinutes} phút (${statusLabel})`}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : isLocked
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{sec.title}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isCurrent
                      ? 'bg-blue-700 text-blue-100'
                      : isLocked
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {durationMinutes} phút
                </span>
                {isLocked && (
                  <span className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title="Phần thi này đã khóa, không thể quay lại">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2" />
                      <circle cx="12" cy="16" r="1" strokeWidth="2" />
                      <path d="M8 11V7a4 4 0 018 0v4" strokeWidth="2" />
                    </svg>
                    Khóa
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {lockedSections.length > 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-900">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Quy chế: Không thể quay lại phần thi đã kết thúc</span>
          </div>
        )}
      </div>
    </nav>
  );
}
