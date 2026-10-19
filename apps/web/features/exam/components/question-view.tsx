'use client';

import React from 'react';
import type { FlatQuestionItem } from '../types';
import { RichTextView, PassageView, Button } from '@jlpt/ui';
import type { JapaneseFontSize } from './exam-toolbar';

export interface QuestionViewProps {
  question: FlatQuestionItem;
  selectedOption: number; // 0 = blank, 1..4 = option
  isFlagged: boolean;
  onSelectOption: (optionValue: number) => void;
  onToggleFlag: () => void;
  fontSize?: JapaneseFontSize;
  showKeyboardHints?: boolean;
  className?: string;
}

export function QuestionView({
  question,
  selectedOption,
  isFlagged,
  onSelectOption,
  onToggleFlag,
  fontSize = 'base',
  showKeyboardHints = true,
  className = '',
}: QuestionViewProps): React.JSX.Element {
  const handleOptionClick = (optionIndex: number) => {
    if (question.isLocked) return;
    // EXAM-11: If clicking the currently selected option, deselect it (set to 0 / blank)
    if (selectedOption === optionIndex) {
      onSelectOption(0);
    } else {
      onSelectOption(optionIndex);
    }
  };

  // Font size mapping for Japanese text scaling (EXAM-23)
  const stemFontSizeClass = {
    sm: 'text-base',
    base: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[fontSize];

  const optionFontSizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontSize];

  // Illustration images in group media (AUDIO-03)
  const imageMedia = (question.media || []).filter((m: string) =>
    /\.(webp|jpg|jpeg|png|svg|gif)$/i.test(m),
  );

  return (
    <article
      aria-label={`Câu hỏi số ${question.number}`}
      className={`jlpt-question-card bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-all ${className}`}
    >
      {/* Passage / Reading material if present */}
      {question.passage && question.passage.length > 0 && (
        <PassageView passage={question.passage} className="mb-6" />
      )}

      {/* Group instructions if present */}
      {question.instructions && question.instructions.length > 0 && (
        <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">Hướng dẫn:</span>
          <RichTextView segments={question.instructions} />
        </div>
      )}

      {/* Header bar: Question number & Bookmark button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
            Câu {question.number}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            (Tổng hợp #{question.globalIndex + 1})
          </span>
          {question.isLocked && (
            <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium">
              Đã khóa
            </span>
          )}
        </div>

        {/* EXAM-14: Bookmark / Flag question for review */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleFlag}
          disabled={question.isLocked}
          aria-pressed={isFlagged}
          aria-label={isFlagged ? 'Bỏ đánh dấu xem lại câu này (Phím F)' : 'Đánh dấu xem lại câu này sau (Phím F)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isFlagged
              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <svg
            className={`w-4 h-4 ${isFlagged ? 'fill-current text-amber-600' : 'text-slate-400'}`}
            viewBox="0 0 24 24"
            fill={isFlagged ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          <span>{isFlagged ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}</span>
          {showKeyboardHints && <kbd className="text-[10px] opacity-70 ml-1">F</kbd>}
        </Button>
      </div>

      {/* Illustration image if available (AUDIO-02, AUDIO-03) */}
      {imageMedia.length > 0 && (
        <div className="jlpt-question-illustration my-4 text-center">
          {imageMedia.map((imgSrc: string, idx: number) => (
            <figure key={idx} className="inline-block my-2">
              <img
                src={`/${imgSrc}`}
                alt={`Hình ảnh minh họa câu ${question.number}`}
                className="max-h-64 max-w-full rounded-lg border border-slate-200 dark:border-slate-700 object-contain mx-auto shadow-sm"
              />
              <figcaption className="text-xs text-slate-500 mt-1">
                Hình minh họa câu {question.number}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Question stem with font scaling (EXAM-23) */}
      <div className={`mb-6 ${stemFontSizeClass} font-japanese leading-relaxed text-slate-900 dark:text-slate-100`}>
        <RichTextView segments={question.stem} />
      </div>

      {/* Options list (1..4) */}
      <div className="space-y-3" role="radiogroup" aria-label={`Các phương án trả lời câu ${question.number}`}>
        {question.options.map((opt, optIdx) => {
          const optionValue = optIdx + 1;
          const isSelected = selectedOption === optionValue;

          return (
            <Button
              key={optIdx}
              type="button"
              role="radio"
              variant="outline"
              aria-checked={isSelected}
              disabled={question.isLocked}
              onClick={() => handleOptionClick(optionValue)}
              aria-label={`Lựa chọn ${opt.label} (Phím ${optionValue})`}
              className={`w-full justify-start text-left p-4 rounded-xl border transition-all flex items-start gap-4 min-h-[56px] h-auto whitespace-normal ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-sm ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
              } ${question.isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
            >
              {/* Option label indicator (1, 2, 3, 4) with keyboard hint (EXAM-24) */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </span>
                {showKeyboardHints && (
                  <kbd className="text-[10px] text-slate-400 font-mono">
                    [{optionValue}]
                  </kbd>
                )}
              </div>

              {/* Option rich text content with font scaling (EXAM-23) */}
              <div className={`flex-1 pt-1 font-japanese ${optionFontSizeClass} leading-relaxed`}>
                <RichTextView segments={opt.content} />
              </div>
            </Button>
          );
        })}
      </div>

      {selectedOption > 0 && !question.isLocked && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Click vào phương án đang chọn hoặc phím số tương ứng để bỏ chọn.</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => onSelectOption(0)}
            className="text-slate-500 hover:text-slate-700 underline text-xs min-h-0"
          >
            Bỏ chọn đáp án
          </Button>
        </div>
      )}
    </article>
  );
}
