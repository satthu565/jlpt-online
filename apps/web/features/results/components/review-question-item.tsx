'use client';

import React from 'react';
import type { FlatQuestionItem } from '../../exam/types';
import { RichTextView } from '@jlpt/ui/components/rich-text-view';
import { PassageView } from '@jlpt/ui/components/rich-block-view';
import { Button } from '@jlpt/ui/components/button';
import { QuestionAudioPlayer } from '../../exam/components/audio-player';
import type { LearnerExplanation } from '../../explanations/types';
import { ExplanationView } from '../../explanations/components/explanation-view';

export interface ReviewQuestionItemProps {
  question: FlatQuestionItem;
  userAnswer: number; // 0 = blank, 1..4 = selected
  correctAnswer: number; // 1..4
  isFlagged: boolean;
  explanation?: LearnerExplanation;
  hasLicensePermission?: boolean;
  className?: string;
  showFurigana?: boolean;
  timeSpentMs?: number;
}

export function ReviewQuestionItem({
  question,
  userAnswer,
  correctAnswer,
  isFlagged,
  explanation,
  hasLicensePermission = false,
  className = '',
  showFurigana = true,
  timeSpentMs,
}: ReviewQuestionItemProps): React.JSX.Element {
  const [showExplanation, setShowExplanation] = React.useState(Boolean(explanation));
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
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
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
              <span>✓</span> Làm đúng
            </span>
          ) : isBlank ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold">
              ○ Bỏ trống
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold flex items-center gap-1">
              <span>✗</span> Làm sai
            </span>
          )}

          {isFlagged && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
              🚩 Có gắn cờ
            </span>
          )}

          {timeSpentMs !== undefined && timeSpentMs > 0 && (
            <span
              data-testid="question-time-spent"
              className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              title="Thời gian làm bài cho câu này"
            >
              ⏱️ {Math.round(timeSpentMs / 1000)}s
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
            onClick={() => setShowExplanation((prev) => !prev)}
            data-testid={`toggle-explanation-btn-${question.number}`}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 p-0 h-auto min-h-0"
          >
            <span>{showExplanation ? '▼ Ẩn lời giải chi tiết' : '▶ Xem lời giải chi tiết (EXPL-01..09)'}</span>
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
            ) : (
              <div
                data-testid="explanation-placeholder"
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500 text-center"
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
