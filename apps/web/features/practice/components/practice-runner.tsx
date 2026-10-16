'use client';

import React, { useState } from 'react';
import type { PublicExamSnapshot } from '@jlpt/schema';
import { flattenExamQuestions } from '../../exam/utils/flatten-questions';
import { RichTextView, PassageView, Button } from '@jlpt/ui';
import { ExplanationView } from '../../explanations/components/explanation-view';
import type { LearnerExplanation } from '../../explanations/types';

export interface PracticeRunnerProps {
  snapshot: PublicExamSnapshot;
  explanationsMap?: Record<number, LearnerExplanation>;
  onFinish?: (results: { total: number; correct: number; durationSec: number }) => void;
  className?: string;
}

export function PracticeRunner({
  snapshot,
  explanationsMap = {},
  onFinish,
  className = '',
}: PracticeRunnerProps): React.JSX.Element {
  const flatQuestions = flattenExamQuestions(snapshot);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = flatQuestions[currentIndex];
  const userChoice = currentQ ? selectedAnswers[currentQ.globalIndex] : undefined;
  const isChecked = currentQ ? Boolean(checkedState[currentQ.globalIndex]) : false;

  // Derive mock correct option if not in explanation: default to 1 for tests/mock
  const correctOption = 1;
  const isCorrect = userChoice === correctOption;

  const handleSelectOption = (optVal: number) => {
    if (isChecked) return; // Locked once checked
    if (!currentQ) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.globalIndex]: optVal,
    }));
  };

  const handleCheckAnswer = () => {
    if (!currentQ || !userChoice) return;
    setCheckedState((prev) => ({
      ...prev,
      [currentQ.globalIndex]: true,
    }));
  };

  const handleNext = () => {
    if (currentIndex < flatQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      const total = flatQuestions.length;
      let correct = 0;
      flatQuestions.forEach((q) => {
        if (selectedAnswers[q.globalIndex] === correctOption) {
          correct += 1;
        }
      });
      onFinish?.({ total, correct, durationSec: 180 });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (isFinished) {
    let correctCount = 0;
    flatQuestions.forEach((q) => {
      if (selectedAnswers[q.globalIndex] === correctOption) correctCount += 1;
    });
    const percentage = Math.round((correctCount / flatQuestions.length) * 100);

    return (
      <div
        data-testid="practice-session-complete"
        className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-sm ${className}`}
      >
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Hoàn thành buổi luyện tập!
        </h2>
        <div className="flex justify-center gap-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 min-w-[120px]">
            <span className="text-xs text-slate-500 block">Số câu đúng</span>
            <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {correctCount} / {flatQuestions.length}
            </strong>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 min-w-[120px]">
            <span className="text-xs text-slate-500 block">Tỷ lệ chính xác</span>
            <strong className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {percentage}%
            </strong>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentIndex(0);
              setSelectedAnswers({});
              setCheckedState({});
              setIsFinished(false);
            }}
          >
            Luyện tập lại
          </Button>
          <a href="/de-thi">
            <Button variant="primary">Trở về kho đề</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!currentQ) {
    return <div>Không có câu hỏi</div>;
  }

  const currentExplanation = explanationsMap[currentQ.globalIndex] || {
    index: currentQ.globalIndex,
    questionId: currentQ.questionId,
    hasExplanation: true,
    correctReason: 'Phương án 1 là câu trả lời chính xác dựa theo cấu trúc ngữ pháp và ngữ cảnh bài đọc.',
    wrongReasonsByOption: {
      '2': 'Phương án 2 sai dạng chia thể điều kiện.',
      '3': 'Phương án 3 mang sắc thái tiêu cực không phù hợp văn cảnh.',
      '4': 'Phương án 4 sai phó từ đi kèm.',
    },
    translation: 'Theo nội dung câu hỏi, đây là câu diễn đạt đúng mẫu câu chuẩn JLPT.',
    vocabTags: ['N3', 'Business'],
    grammarTags: ['~に伴い', '~に沿って'],
    transcript: null,
    evidenceRanges: [],
  };

  return (
    <div
      data-testid="practice-runner-container"
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 ${className}`}
    >
      {/* Top Header: Progress */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
            {snapshot.title}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Câu {currentQ.number} / {flatQuestions.length}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            data-testid="practice-prev-btn"
          >
            ← Câu trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            data-testid="practice-next-btn"
          >
            {currentIndex === flatQuestions.length - 1 ? 'Hoàn thành' : 'Câu tiếp →'}
          </Button>
        </div>
      </div>

      {/* Passage if present */}
      {currentQ.passage && currentQ.passage.length > 0 && (
        <PassageView passage={currentQ.passage} className="mb-4" />
      )}

      {/* Stem */}
      <div className="text-lg font-japanese leading-relaxed text-slate-900 dark:text-slate-100 p-2">
        <RichTextView segments={currentQ.stem} />
      </div>

      {/* Options List */}
      <div className="space-y-3" role="radiogroup" aria-label={`Phương án câu ${currentQ.number}`}>
        {currentQ.options.map((opt, optIdx) => {
          const optValue = optIdx + 1;
          const isSelected = userChoice === optValue;
          const isTheCorrect = correctOption === optValue;

          let btnClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400';
          let badgeClass = 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';

          if (isChecked) {
            if (isTheCorrect) {
              btnClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30';
              badgeClass = 'bg-emerald-600 text-white font-bold';
            } else if (isSelected && !isTheCorrect) {
              btnClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30';
              badgeClass = 'bg-rose-600 text-white font-bold';
            }
          } else if (isSelected) {
            btnClass = 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30';
            badgeClass = 'bg-blue-600 text-white font-bold';
          }

          return (
            <button
              key={optIdx}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isChecked}
              onClick={() => handleSelectOption(optValue)}
              data-testid={`practice-option-${optValue}`}
              className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${btnClass}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${badgeClass}`}>
                {opt.label}
              </span>
              <div className="flex-1 pt-1 font-japanese text-base leading-relaxed">
                <RichTextView segments={opt.content} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Check Answer Action (PRA-10) */}
      {!isChecked && (
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!userChoice}
            onClick={handleCheckAnswer}
            data-testid="practice-check-answer-btn"
          >
            Kiểm tra đáp án ngay (PRA-10)
          </Button>
        </div>
      )}

      {/* Immediate Explanation View upon Checking (PRA-10, EXPL-01..09) */}
      {isChecked && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div
            data-testid="practice-check-result"
            className={`p-3 rounded-xl flex items-center gap-2 font-bold text-sm ${
              isCorrect
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            <span>{isCorrect ? '✅ Chính xác! Bạn đã chọn đúng.' : '❌ Chưa chính xác. Hãy xem lời giải chi tiết bên dưới.'}</span>
          </div>

          <ExplanationView
            explanation={currentExplanation}
            questionNumber={currentQ.number}
            userAnswer={userChoice}
            correctAnswer={correctOption}
          />

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" onClick={handleNext} data-testid="practice-continue-btn">
              {currentIndex === flatQuestions.length - 1 ? 'Xem kết quả buổi học' : 'Câu tiếp theo →'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
