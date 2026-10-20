'use client';

import { Check, Lock, Star } from 'lucide-react';
import React from 'react';
import { Button } from '@jlpt/ui/components/button';
import type { FlatQuestionItem } from '../types';

export interface QuestionPaletteProps {
  questions: FlatQuestionItem[];
  currentIndex: number;
  answers: number[];
  flags: number[];
  onSelectQuestion: (globalIndex: number) => void;
  className?: string;
}

export function QuestionPalette({
  questions,
  currentIndex,
  answers,
  flags,
  onSelectQuestion,
  className = '',
}: QuestionPaletteProps): React.JSX.Element {
  return (
    <aside
      aria-label="Phiếu trả lời và danh sách câu hỏi"
      className={`jlpt-question-palette bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Phiếu trả lời
        </h2>
        <span className="text-xs font-mono text-slate-500">
          {questions.filter((_, idx) => (answers[idx] || 0) > 0).length} / {questions.length} đã làm
        </span>
      </div>

      {/* Grid of questions */}
      <div
        className="grid grid-cols-4 min-[360px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[380px] overflow-y-auto pr-1"
        role="navigation"
        aria-label="Danh sách các câu hỏi"
      >
        {questions.map((q, idx) => {
          const answerVal = answers[idx] || 0;
          const isAnswered = answerVal > 0;
          const isFlagged = Boolean(flags[idx]);
          const isCurrent = idx === currentIndex;
          const isLocked = q.isLocked;

          let btnClass = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300';

          if (isAnswered) {
            btnClass = 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold';
          }

          if (isCurrent) {
            btnClass += ' ring-2 ring-offset-2 ring-blue-500 font-extrabold';
          }

          if (isLocked) {
            btnClass = 'opacity-40 bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-slate-300 dark:border-slate-700';
          }

          const statusText = [
            `Câu ${q.number}`,
            isAnswered ? `Đã chọn: ${answerVal}` : 'Chưa làm',
            isFlagged ? 'Đã đánh dấu' : '',
            isCurrent ? 'Đang xem' : '',
            isLocked ? 'Phần thi đã khóa' : '',
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Button
              key={idx}
              type="button"
              variant="outline"
              disabled={isLocked}
              onClick={() => onSelectQuestion(idx)}
              aria-label={statusText}
              aria-current={isCurrent ? 'true' : undefined}
              data-question-index={idx}
              data-answered={isAnswered}
              data-flagged={isFlagged}
              className={`relative min-h-[44px] min-w-[44px] p-0 rounded-lg text-xs font-mono flex items-center justify-center border transition-all ${btnClass}`}
            >
              <span>{q.number}</span>

              {/* Flag icon / dot on top right corner */}
              {isFlagged && (
                <span
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-xs"
                  title="Đã đánh dấu xem lại"
                  aria-hidden="true"
                  data-icon="flag"
                >
                  <Star className="size-2.5 fill-current" />
                </span>
              )}

              {/* Padlock icon if locked */}
              {isLocked && (
                <span
                  className="absolute bottom-0.5 right-0.5 text-slate-400"
                  title="Đã khóa"
                  aria-hidden="true"
                  data-icon="lock"
                >
                  <Lock className="size-3" />
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Visual Legend explaining states */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Chú thích trạng thái:</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold"><Check className="size-3" aria-hidden="true" /></span>
            <span>Đã làm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800" />
            <span>Chưa làm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center text-[10px]"><Star className="size-3 fill-current" aria-hidden="true" /></span>
            <span>Đánh dấu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded border-2 border-blue-500 bg-white dark:bg-slate-900" />
            <span>Đang chọn</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
