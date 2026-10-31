'use client';

import { Check, ChevronDown, ChevronRight, Flag, Timer, X } from 'lucide-react';
import React from 'react';
import type { FlatQuestionItem } from '../../exam/types';
import { RichTextView } from '@jlpt/ui/components/rich-text-view';
import { PassageView } from '@jlpt/ui/components/rich-block-view';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import { QuestionAudioPlayer } from '../../exam/components/audio-player';
import type { LearnerExplanation } from '../../explanations/types';
import { ExplanationView } from '../../explanations/components/explanation-view';

export interface ReviewQuestionItemProps {
  question: FlatQuestionItem;
  userAnswer: number; // 0 = blank, 1..4 = selected
  correctAnswer: number; // 1..4
  isFlagged: boolean;
  explanation?: LearnerExplanation;
  loadExplanation?: (index: number) => Promise<LearnerExplanation>;
  hasLicensePermission?: boolean;
  className?: string;
  showFurigana?: boolean;
  timeSpentMs?: number;
  defaultExpanded?: boolean;
  loadingExplanation?: boolean;
  explanationError?: string | null;
  onRetryExplanation?: () => void;
}

export function ReviewQuestionItem({
  question,
  userAnswer,
  correctAnswer,
  isFlagged,
  explanation,
  loadExplanation,
  hasLicensePermission = false,
  className = '',
  showFurigana = true,
  timeSpentMs,
  defaultExpanded = false,
  loadingExplanation: propLoadingExplanation,
  explanationError: propExplanationError,
  onRetryExplanation,
}: ReviewQuestionItemProps): React.JSX.Element {
  const [showExplanation, setShowExplanation] = React.useState(
    Boolean(explanation) || Boolean(defaultExpanded),
  );
  const [loadedExplanation, setLoadedExplanation] = React.useState<LearnerExplanation | null>(null);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const [internalError, setInternalError] = React.useState<string | null>(null);

  const isLoading = propLoadingExplanation !== undefined ? propLoadingExplanation : internalLoading;
  const currentError = propExplanationError !== undefined ? propExplanationError : internalError;

  const fetchExplanation = React.useCallback(async () => {
    if (!loadExplanation || explanation) return;
    setInternalLoading(true);
    setInternalError(null);
    try {
      const data = await loadExplanation(question.globalIndex);
      setLoadedExplanation(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải lời giải chi tiết.';
      setInternalError(message);
    } finally {
      setInternalLoading(false);
    }
  }, [loadExplanation, explanation, question.globalIndex]);

  React.useEffect(() => {
    if (showExplanation && !explanation && !loadedExplanation && !isLoading && !currentError && loadExplanation) {
      void fetchExplanation();
    }
  }, [showExplanation, explanation, loadedExplanation, isLoading, currentError, loadExplanation, fetchExplanation]);

  const handleToggleExplanation = () => {
    const nextOpen = !showExplanation;
    setShowExplanation(nextOpen);
    if (nextOpen && !explanation && !loadedExplanation && !isLoading && loadExplanation) {
      void fetchExplanation();
    }
  };

  const handleRetry = () => {
    if (onRetryExplanation) {
      onRetryExplanation();
    } else {
      void fetchExplanation();
    }
  };
  const isCorrect = userAnswer === correctAnswer;
  const isBlank = userAnswer === 0;

  // Find listening audio media key if in listening section (AUDIO-07)
  const audioMediaKey = (question.media || []).find((m: string) =>
    /\.(mp3|m4a|aac|ogg|wav)$/i.test(m),
  );

  // Illustration images in group media (AUDIO-03)
  const imageMedia = (question.media || []).filter((m: string) =>
    /\.(webp|jpg|jpeg|png|svg|gif)$/i.test(m),
  );

  return (
    <article
      id={`review-question-${question.globalIndex}`}
      aria-label={`Chi tiết xem lại câu số ${question.number}`}
      data-select-lookup-area="true"
      className={`jlpt-review-question-card bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-sm transition-all ${
        isCorrect
          ? 'border-emerald-200 dark:border-emerald-900/60'
          : isBlank
          ? 'border-slate-200 dark:border-slate-800'
          : 'border-rose-200 dark:border-rose-900/60'
      } ${className}`}
    >
      {/* Passage / Reading material if present */}
      {question.passage && question.passage.length > 0 && (
        <PassageView passage={question.passage} showFurigana={showFurigana} className="mb-6" />
      )}

      {/* Group instructions if present */}
      {question.instructions && question.instructions.length > 0 && (
        <div className="surface surface--secondary rounded-2xl mb-4 text-sm text-slate-600 dark:text-slate-400 p-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">Hướng dẫn:</span>
          <RichTextView segments={question.instructions} showFurigana={showFurigana} />
        </div>
      )}

      {/* Top row: Number, Correctness status, Audio player, Flag badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
            Câu {question.number}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            (Tổng hợp #{question.globalIndex + 1})
          </span>

          {/* Correctness badge */}
          {isCorrect ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1">
              <Check className="size-4" aria-hidden="true" /> Làm đúng
            </span>
          ) : isBlank ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
              ○ Bỏ trống
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold flex items-center gap-1">
              <X className="size-4" aria-hidden="true" /> Làm sai
            </span>
          )}

          {isFlagged && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
              <Flag className="inline size-4 align-[-2px]" aria-hidden="true" /> Có gắn cờ
            </span>
          )}

          {timeSpentMs !== undefined && timeSpentMs > 0 && (
            <span
              data-testid="question-time-spent"
              className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              title="Thời gian làm bài cho câu này"
            >
              <Timer className="inline size-4 align-[-2px]" aria-hidden="true" /> {Math.round(timeSpentMs / 1000)}s
            </span>
          )}
        </div>

        {/* Audio Replay for Listening Question */}
        {audioMediaKey && (
          <QuestionAudioPlayer
            mediaKey={audioMediaKey}
            label={`Nghe lại audio câu ${question.number}`}
          />
        )}
      </div>

      {/* Illustration image if available */}
      {imageMedia.length > 0 && (
        <div className="jlpt-question-illustration my-4 text-center">
          {imageMedia.map((imgSrc: string, idx: number) => (
            <figure key={idx} className="inline-block my-2">
              <img
                src={`/${imgSrc}`}
                alt={`Hình ảnh minh họa câu ${question.number}`}
                className="max-h-64 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain mx-auto shadow-sm"
              />
            </figure>
          ))}
        </div>
      )}

      {/* Stem */}
      <div className="mb-6 text-lg font-japanese leading-relaxed text-slate-900 dark:text-slate-100">
        <RichTextView segments={question.stem} showFurigana={showFurigana} />
      </div>

      {/* Options list with correct/selected highlighting */}
      <div className="space-y-3" role="group" aria-label={`Các phương án câu ${question.number}`}>
        {question.options.map((opt, optIdx) => {
          const optionValue = optIdx + 1;
          const isUserChoice = userAnswer === optionValue;
          const isTheCorrectOption = correctAnswer === optionValue;

          // Determine styling
          let containerClasses = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200';
          let labelClasses = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

          if (isTheCorrectOption) {
            containerClasses = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30';
            labelClasses = 'bg-emerald-600 text-white font-bold';
          } else if (isUserChoice && !isTheCorrectOption) {
            containerClasses = 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/30';
            labelClasses = 'bg-rose-600 text-white font-bold';
          }

          return (
            <div
              key={optIdx}
              className={`w-full p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${containerClasses}`}
            >
              <div className="flex items-start gap-3 flex-1">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${labelClasses}`}>
                  {opt.label}
                </span>
                <div className="flex-1 pt-1 font-japanese text-base leading-relaxed">
                  <RichTextView segments={opt.content} showFurigana={showFurigana} />
                </div>
              </div>

              {/* Status Tags */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {isTheCorrectOption && (
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-600 text-white shadow-xs">
                    Đáp án đúng
                  </span>
                )}
                {isUserChoice && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    Bạn đã chọn
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation Section (EXPL-01..09) */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleToggleExplanation}
            data-testid={`toggle-explanation-btn-${question.number}`}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 p-0 h-auto min-h-0"
          >
            {showExplanation ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
            <span>{showExplanation ? 'Ẩn lời giải chi tiết' : 'Xem lời giải chi tiết'}</span>
          </Button>
        </div>

        {showExplanation && (
          <div className="mt-3">
            {explanation ? (
              <ExplanationView
                explanation={explanation}
                questionNumber={question.number}
                userAnswer={userAnswer}
                correctAnswer={correctAnswer}
                hasLicensePermission={hasLicensePermission}
              />
            ) : isLoading ? (
              <div
                data-testid="explanation-loading"
                className="surface surface--secondary rounded-2xl p-4 text-xs text-slate-500 text-center flex items-center justify-center gap-2"
              >
                <Spinner size="sm" aria-label="Đang tải lời giải..." />
                <span>Đang tải lời giải chi tiết...</span>
              </div>
            ) : currentError ? (
              <div
                data-testid="explanation-error"
                className="surface surface--secondary rounded-2xl p-4 text-xs text-rose-600 dark:text-rose-400 text-center space-y-2"
              >
                <p className="m-0 font-medium">{currentError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  data-testid={`retry-explanation-btn-${question.number}`}
                >
                  Thử lại
                </Button>
              </div>
            ) : loadedExplanation ? (
              loadedExplanation.hasExplanation ? (
                <ExplanationView
                  explanation={loadedExplanation}
                  questionNumber={question.number}
                  userAnswer={userAnswer}
                  correctAnswer={correctAnswer}
                  hasLicensePermission={hasLicensePermission}
                />
              ) : (
                <div
                  data-testid="explanation-placeholder"
                  className="surface surface--secondary rounded-2xl p-4 text-xs text-slate-500 text-center"
                >
                  Chưa có dữ liệu lời giải chi tiết cho câu hỏi này.
                </div>
              )
            ) : (
              <div
                data-testid="explanation-placeholder"
                className="surface surface--secondary rounded-2xl p-4 text-xs text-slate-500 text-center"
              >
                Chưa có dữ liệu lời giải chi tiết cho câu hỏi này.
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
