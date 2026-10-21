'use client';

import { Share2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import type { AttemptReviewData, ReviewFilter } from '../types';
import { flattenExamQuestions } from '../../exam/utils/flatten-questions';
import { ScoreSummaryCard } from './score-summary-card';
import { ScoreComparisonCard } from './score-comparison-card';
import { ReviewPalette } from './review-palette';
import { ReviewQuestionItem } from './review-question-item';
import { PdfScoreExportButton } from './pdf-score-export-button';
import { PacingAnalysisWidget } from './pacing-analysis-widget';
import { Button } from '@jlpt/ui/components/button';
import { ShareDialog } from '@jlpt/ui/components/share-dialog';
import { FuriganaToggle, useFurigana } from '@jlpt/ui/components/furigana-toggle';
import { AiChatAssistant } from '../../ai/components/ai-chat-assistant';
import { FEATURES } from '../../../lib/features';

export interface ReviewViewProps {
  reviewData: AttemptReviewData;
  className?: string;
}

export function ReviewView({
  reviewData,
  className = '',
}: ReviewViewProps): React.JSX.Element {
  const { snapshot, answers, flags, correct, result, previousResult, mode, submittedAt, attemptId } = reviewData;

  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('all');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showFurigana] = useFurigana();

  const timeSpentArray = (result.scoring as { timeSpentMs?: number[] }).timeSpentMs || (result as { timeSpentMs?: number[] }).timeSpentMs;

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

      {/* 2. Pacing analysis widget (P04: sau bài có phân tích câu tốn thời gian) */}
      <PacingAnalysisWidget
        timeSpentMs={timeSpentArray}
        questions={flatQuestions}
        level={snapshot.level}
      />

      {/* 3. Previous attempt comparison card */}
      <ScoreComparisonCard
        currentResult={result}
        previousResult={previousResult}
      />

      {/* Action Bar: PDF Score Export, Furigana Toggle & Share Link (SYS-17, SEO-08, P04) */}
      <div
        data-testid="review-actions-bar"
        className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] flex flex-wrap items-center justify-between gap-4 p-4"
      >
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <PdfScoreExportButton
            result={result}
            examTitle={snapshot.title}
            level={snapshot.level}
            attemptId={attemptId}
            submittedAt={submittedAt}
          />

          {/* Furigana toggle in review mode (P04) */}
          <FuriganaToggle />
        </div>

        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => setShareModalOpen(true)}
          data-testid="share-result-btn"
        >
          <Share2 className="inline size-4 align-[-2px]" aria-hidden="true" /> Chia sẻ kết quả thi
        </Button>
      </div>

      {/* 4. Main review section: Questions list + Sticky Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Questions list */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Chi tiết bài làm từng câu hỏi ({displayedQuestions.length}/{flatQuestions.length})
            </h3>
            {activeFilter !== 'all' && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setActiveFilter('all')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium p-0 h-auto min-h-0"
              >
                Hiển thị tất cả
              </Button>
            )}
          </div>

          {displayedQuestions.map((q) => (
            <ReviewQuestionItem
              key={q.globalIndex}
              question={q}
              userAnswer={answers[q.globalIndex] ?? 0}
              correctAnswer={correct[q.globalIndex] ?? 0}
              isFlagged={Boolean(flags[q.globalIndex])}
              showFurigana={showFurigana}
              timeSpentMs={timeSpentArray?.[q.globalIndex]}
            />
          ))}

          {displayedQuestions.length === 0 && (
            <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center text-slate-500">
              Không có câu hỏi nào thỏa mãn bộ lọc &ldquo;{activeFilter}&rdquo;.
            </div>
          )}

          {/* AI Study & Explanation Assistant with Transparency Labels */}
          {FEATURES.aiExplanation && (
            <AiChatAssistant
              attemptId={attemptId}
              contextTitle={`Giải đáp thắc mắc bài thi: ${snapshot.title} (${snapshot.level})`}
            />
          )}
        </div>

        {/* Right column: Sticky review palette */}
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

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={`https://jlpt.vn/chia-se/ket-qua/${attemptId}`}
        title={`Kết quả bài thi JLPT: ${snapshot.title} - Điểm: ${result.scoring.total}/${result.scoring.totalMax}`}
        description="Chia sẻ bảng điểm và kết quả bài thi năng lực tiếng Nhật JLPT chuẩn quốc tế."
        labels={{
          dialogTitle: 'Chia sẻ kết quả bài thi',
          copyLink: 'Sao chép liên kết',
          copied: 'Đã sao chép liên kết!',
          close: 'Đóng',
          shareToTwitter: 'Twitter (X)',
          shareToFacebook: 'Facebook',
        }}
      />
    </div>
  );
}

