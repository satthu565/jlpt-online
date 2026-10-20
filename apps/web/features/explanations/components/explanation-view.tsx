'use client';

import React, { useState } from 'react';
import type { LearnerExplanation } from '../types';
import { TranscriptView } from './transcript-view';
import { QuestionBookmarkButton } from './question-bookmark-button';
import { QuestionReportModal } from './question-report-modal';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Check, Flag, Lightbulb, BookOpen, Languages } from 'lucide-react';

export interface ExplanationViewProps {
  explanation: LearnerExplanation;
  questionNumber?: string | number;
  userAnswer?: number;
  correctAnswer?: number;
  hasLicensePermission?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (isBookmarked: boolean) => void;
  className?: string;
}

export function ExplanationView({
  explanation,
  questionNumber,
  userAnswer,
  correctAnswer,
  hasLicensePermission = false,
  isBookmarked = false,
  onToggleBookmark,
  className = '',
}: ExplanationViewProps): React.JSX.Element {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  if (!explanation.hasExplanation) {
    return (
      <div
        data-testid="explanation-empty"
        className={`p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-xs text-[var(--text-muted)] text-center ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span>Chưa có lời giải thích được phê duyệt cho câu hỏi này.</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setReportModalOpen(true)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline p-0 h-auto min-h-0"
          >
            Báo cáo thiếu lời giải
          </Button>
        </div>
        <QuestionReportModal
          isOpen={reportModalOpen}
          questionId={explanation.questionId}
          onClose={() => setReportModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="explanation-container"
      className={`jlpt-explanation-view rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 space-y-4 shadow-xs ${className}`}
    >
      {/* Header with approved badge, bookmark and report buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="flex items-center gap-1 font-bold uppercase tracking-wider text-xs">
            <Check className="size-3" />
            <span>Lời giải thích đã duyệt</span>
          </Badge>
          {questionNumber && (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Câu {questionNumber}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bookmark Button */}
          <QuestionBookmarkButton
            questionId={explanation.questionId}
            initialBookmarked={isBookmarked}
            onToggle={onToggleBookmark}
          />

          {/* Report Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReportModalOpen(true)}
            data-testid="report-question-btn"
            className="text-xs px-2 py-1 h-auto min-h-[32px] text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1"
            title="Báo cáo lỗi câu hỏi hoặc lời giải"
          >
            <Flag className="size-3.5" />
            <span>Báo lỗi</span>
          </Button>
        </div>
      </div>

      {/* 1. Correct Reason (EXPL-01..04) */}
      {explanation.correctReason && (
        <div data-testid="explanation-correct-reason" className="space-y-1">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="size-3.5" />
            <span>Vì sao đáp án đúng?</span>
          </h4>
          <div className="text-xs text-[var(--text-primary)] leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            {explanation.correctReason}
          </div>
        </div>
      )}

      {/* 2. Wrong Reasons By Option */}
      {explanation.wrongReasonsByOption &&
        Object.keys(explanation.wrongReasonsByOption).length > 0 && (
          <div data-testid="explanation-wrong-reasons" className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Phân tích các phương án còn lại (Bẫy thường gặp):
            </h4>
            <div className="space-y-1.5">
              {Object.entries(explanation.wrongReasonsByOption).map(([optKey, reason]) => {
                const optNum = Number(optKey);
                const isSelectedWrong = userAnswer === optNum && userAnswer !== correctAnswer;

                return (
                  <div
                    key={optKey}
                    data-testid={`wrong-reason-opt-${optKey}`}
                    className={`text-xs p-2.5 rounded-lg border ${
                      isSelectedWrong
                        ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 ring-1 ring-rose-400'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="font-bold mr-1.5">Phương án {optKey}:</span>
                    <span>{reason}</span>
                    {isSelectedWrong && (
                      <span className="ml-2 text-[10px] font-bold bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 px-1.5 py-0.5 rounded">
                        Lựa chọn của bạn
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* 3. Translation */}
      {explanation.translation && (
        <div data-testid="explanation-translation" className="space-y-1">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Dịch nghĩa tiếng Việt:
          </h4>
          <p className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] m-0">
            {explanation.translation}
          </p>
        </div>
      )}

      {/* Sino-Vietnamese (Hán Việt) Readings (P04) */}
      {explanation.hanViet && (
        <div data-testid="explanation-hanviet" className="space-y-1">
          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Languages className="size-3.5" />
            <span>Âm Hán Việt:</span>
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {Array.isArray(explanation.hanViet) ? (
              explanation.hanViet.map((item, idx) => {
                const isObj = typeof item === 'object' && item !== null;
                const kanji = isObj ? (item as { kanji: string }).kanji : String(item);
                const reading = isObj ? (item as { reading: string }).reading : '';
                return (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                  >
                    <strong className="font-japanese mr-1">{kanji}</strong>
                    {reading ? `(${reading})` : ''}
                  </span>
                );
              })
            ) : (
              <span className="px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                {explanation.hanViet}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Vocabulary and Grammar Tags */}
      {((explanation.vocabTags && explanation.vocabTags.length > 0) ||
        (explanation.grammarTags && explanation.grammarTags.length > 0)) && (
        <div data-testid="explanation-tags" className="flex flex-wrap gap-2 pt-1">
          {explanation.grammarTags?.map((tag, idx) => (
            <span
              key={`grammar-${idx}`}
              className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
            >
              <BookOpen className="size-3" />
              <span>Ngữ pháp: {tag}</span>
            </span>
          ))}
          {explanation.vocabTags?.map((tag, idx) => (
            <span
              key={`vocab-${idx}`}
              className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1"
            >
              <Languages className="size-3" />
              <span>Từ vựng: {tag}</span>
            </span>
          ))}
        </div>
      )}

      {/* 5. Transcript and Evidence */}
      {(explanation.transcript || explanation.isLicensed) && (
        <TranscriptView
          transcript={explanation.transcript}
          evidenceRanges={explanation.evidenceRanges}
          isLicensed={explanation.isLicensed}
          hasLicensePermission={hasLicensePermission}
          sourceLabel={explanation.sourceLabel}
          licenseLabel={explanation.licenseLabel}
        />
      )}

      {/* Report Modal */}
      <QuestionReportModal
        isOpen={reportModalOpen}
        questionId={explanation.questionId}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
