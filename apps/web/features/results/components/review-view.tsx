'use client';

import React, { useState, useMemo } from 'react';
import type { AttemptReviewData, ReviewFilter } from '../types';
import { flattenExamQuestions } from '../../exam/utils/flatten-questions';
import { ScoreSummaryCard } from './score-summary-card';
import { ScoreComparisonCard } from './score-comparison-card';
import { ReviewPalette } from './review-palette';
import { ReviewQuestionItem } from './review-question-item';

export interface ReviewViewProps {
  reviewData: AttemptReviewData;
  className?: string;
}

export function ReviewView({
  reviewData,
  className = '',
}: ReviewViewProps): React.JSX.Element {
  const { snapshot, answers, flags, correct, result, previousResult, mode, submittedAt } = reviewData;

  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('all');

  const flatQuestions = useMemo(() => {
    return flattenExamQuestions(snapshot);
  }, [snapshot]);

  // Filter questions for display (SCORE-09)
  const displayedQuestions = useMemo(() => {
    return flatQuestions.filter((q, idx) => {
      const userAns = answers[idx] ?? 0;
      const correctAns = correct[idx] ?? 0;
      const isCorrect = userAns === correctAns && userAns > 0;
      const isBlank = userAns === 0;
      const isFlag = flags[idx] === 1;

      if (activeFilter === 'correct') return isCorrect;
      if (activeFilter === 'wrong') return !isCorrect && !isBlank;
      if (activeFilter === 'blank') return isBlank;
      if (activeFilter === 'flagged') return isFlag;
      return true;
    });
  }, [flatQuestions, answers, correct, flags, activeFilter]);

  const handleSelectQuestion = (globalIdx: number) => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`review-question-${globalIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className={`jlpt-review-view space-y-8 ${className}`}>
      {/* 1. Score summary card */}
      <ScoreSummaryCard
        result={result}
        examTitle={snapshot.title}
        level={snapshot.level}
        mode={mode}
        submittedAt={submittedAt}
      />

      {/* 2. Previous attempt comparison card (SCORE-10) */}
      <ScoreComparisonCard
        currentResult={result}
        previousResult={previousResult}
      />

      {/* 3. Main review section: Questions list + Sticky Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Questions list (SCORE-07, SCORE-08) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Chi tiết bài làm từng câu hỏi ({displayedQuestions.length}/{flatQuestions.length})
            </h3>
            {activeFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Hiển thị tất cả
              </button>
            )}
          </div>

          {displayedQuestions.map((q) => (
            <ReviewQuestionItem
              key={q.globalIndex}
              question={q}
              userAnswer={answers[q.globalIndex] ?? 0}
              correctAnswer={correct[q.globalIndex] ?? 0}
              isFlagged={Boolean(flags[q.globalIndex])}
            />
          ))}

          {displayedQuestions.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              Không có câu hỏi nào thỏa mãn bộ lọc &ldquo;{activeFilter}&rdquo;.
            </div>
          )}
        </div>

        {/* Right column: Sticky review palette (SCORE-09) */}
        <div className="lg:col-span-4 sticky top-20">
          <ReviewPalette
            questions={flatQuestions}
            answers={answers}
            correct={correct}
            flags={flags}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onSelectQuestion={handleSelectQuestion}
          />
        </div>
      </div>
    </div>
  );
}
