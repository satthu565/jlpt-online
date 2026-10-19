'use client';

import React, { useEffect } from 'react';
import { Button } from '@jlpt/ui';

export interface QuestionNavigationProps {
  currentIndex: number;
  totalQuestions: number;
  isFirstInSection: boolean;
  isLastInSection: boolean;
  isLastSection: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRequestNextSection: () => void;
  onRequestSubmit: () => void;
  className?: string;
}

export function QuestionNavigation({
  currentIndex,
  totalQuestions,
  isFirstInSection,
  isLastInSection,
  isLastSection,
  onPrev,
  onNext,
  onRequestNextSection,
  onRequestSubmit,
  className = '',
}: QuestionNavigationProps): React.JSX.Element {
  // EXAM-12: Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      // Do not trigger if typing in an input/textarea
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (ev.key === 'ArrowLeft') {
        if (!isFirstInSection) {
          ev.preventDefault();
          onPrev();
        }
      } else if (ev.key === 'ArrowRight') {
        if (!isLastInSection) {
          ev.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstInSection, isLastInSection, onPrev, onNext]);

  return (
    <div
      className={`jlpt-question-nav flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 ${className}`}
      aria-label="Điều hướng câu hỏi"
    >
      {/* Previous question button */}
      <Button
        type="button"
        variant="secondary"
        onClick={onPrev}
        disabled={isFirstInSection}
        aria-label="Chuyển đến câu hỏi trước đó (Phím mũi tên trái)"
        className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl font-medium text-sm transition-all ${
          isFirstInSection
            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-sm'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Câu trước</span>
        <kbd className="hidden sm:inline text-xs text-slate-400 border border-slate-300 dark:border-slate-600 px-1 rounded">←</kbd>
      </Button>

      {/* Progress counter */}
      <div className="text-sm font-medium text-slate-500 font-mono">
        Câu {currentIndex + 1} / {totalQuestions}
      </div>

      {/* Next question or Section Transition / Submit button */}
      <div className="flex items-center gap-2">
        {!isLastInSection ? (
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
            aria-label="Chuyển đến câu hỏi tiếp theo (Phím mũi tên phải)"
            className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl font-medium text-sm shadow-sm"
          >
            <span>Câu sau</span>
            <kbd className="hidden sm:inline text-xs bg-blue-700 text-blue-100 border border-blue-500 px-1 rounded">→</kbd>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        ) : !isLastSection ? (
          <Button
            type="button"
            variant="primary"
            onClick={onRequestNextSection}
            aria-label="Hoàn thành phần thi này và chuyển sang phần thi kế tiếp"
            className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm shadow-md"
          >
            <span>Chuyển phần tiếp theo</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        ) : (
          <Button
            type="button"
            variant="success"
            onClick={onRequestSubmit}
            aria-label="Hoàn tất bài làm và nộp bài"
            className="flex items-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl font-bold text-sm shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Nộp bài thi</span>
          </Button>
        )}
      </div>
    </div>
  );
}
