'use client';

import React from 'react';
import type { FlatQuestionItem } from '../../exam/types';
import type { ReviewFilter } from '../types';

export interface ReviewPaletteProps {
  questions: FlatQuestionItem[];
  answers: number[];
  correct: number[];
  flags: number[];
  activeFilter: ReviewFilter;
  onFilterChange: (filter: ReviewFilter) => void;
  onSelectQuestion: (globalIndex: number) => void;
  className?: string;
}

export function ReviewPalette({
  questions,
  answers,
  correct,
  flags,
  activeFilter,
  onFilterChange,
  onSelectQuestion,
  className = '',
}: ReviewPaletteProps): React.JSX.Element {
  // Counts
  const correctCount = questions.filter((_, idx) => {
    const a = answers[idx] ?? 0;
    const c = correct[idx] ?? 0;
    return a === c && a > 0;
  }).length;

  const wrongCount = questions.filter((_, idx) => {
    const a = answers[idx] ?? 0;
    const c = correct[idx] ?? 0;
    return a !== c && a > 0;
  }).length;

  const blankCount = questions.filter((_, idx) => (answers[idx] ?? 0) === 0).length;
  const flaggedCount = questions.filter((_, idx) => (flags[idx] ?? 0) === 1).length;

  const filters: Array<{ id: ReviewFilter; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả', count: questions.length },
    { id: 'correct', label: 'Làm đúng', count: correctCount },
    { id: 'wrong', label: 'Làm sai', count: wrongCount },
    { id: 'blank', label: 'Bỏ trống', count: blankCount },
    { id: 'flagged', label: 'Có gắn cờ', count: flaggedCount },
  ];

  return (
    <div
      className={`jlpt-review-palette bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 ${className}`}
      role="region"
      aria-label="Danh sách câu hỏi xem lại"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Phiếu câu hỏi xem lại
        </h3>
        <span className="text-xs text-slate-400 font-mono">
          {questions.length} câu
        </span>
      </div>

      {/* Filter Tabs (SCORE-09) */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === f.id}
            onClick={() => onFilterChange(f.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              activeFilter === f.id
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>{f.label}</span>
            <span className="text-[10px] opacity-75 font-mono font-bold">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Grid of question buttons */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {questions.map((q, idx) => {
          const userAns = answers[idx] ?? 0;
          const correctAns = correct[idx] ?? 0;
          const isCorrect = userAns === correctAns && userAns > 0;
          const isBlank = userAns === 0;
          const isFlag = flags[idx] === 1;

          // Check if question satisfies active filter (SCORE-09)
          let matchesFilter = true;
          if (activeFilter === 'correct') matchesFilter = isCorrect;
          if (activeFilter === 'wrong') matchesFilter = !isCorrect && !isBlank;
          if (activeFilter === 'blank') matchesFilter = isBlank;
          if (activeFilter === 'flagged') matchesFilter = isFlag;

          let btnClasses = 'border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
          if (isCorrect) {
            btnClasses = 'border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold';
          } else if (!isBlank) {
            btnClasses = 'border-rose-500 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              aria-label={`Câu ${q.number}: ${isCorrect ? 'Đúng' : isBlank ? 'Bỏ trống' : 'Sai'}`}
              className={`relative h-10 rounded-xl border text-xs font-mono transition-all flex items-center justify-center ${btnClasses} ${
                matchesFilter ? 'opacity-100 hover:scale-105' : 'opacity-30'
              }`}
            >
              {q.number}
              {isFlag && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                  title="Có gắn cờ"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
