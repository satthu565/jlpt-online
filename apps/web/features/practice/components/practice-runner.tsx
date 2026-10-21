'use client';

import { PartyPopper } from 'lucide-react';
import React, { useState, useRef } from 'react';
import type { PublicExamSnapshot } from '@jlpt/schema';
import { flattenExamQuestions } from '../../exam/utils/flatten-questions';
import { RichTextView } from '@jlpt/ui/components/rich-text-view';
import { PassageView } from '@jlpt/ui/components/rich-block-view';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { FuriganaToggle, useFurigana } from '@jlpt/ui/components/furigana-toggle';
import { Switch } from '@jlpt/ui/components/switch';
import { ExplanationView } from '../../explanations/components/explanation-view';
import type { LearnerExplanation } from '../../explanations/types';
import type { ExamApiClient } from '../../exam';
import { useSelectLookup, useSelectLookupSetting, SelectionLookupPopover } from '../../corpus';
import { useI18n } from '../../../lib/i18n';

export interface PracticeRunnerProps {
  snapshot: PublicExamSnapshot;
  attemptId?: string;
  lease?: string;
  initialAnswers?: number[];
  initialSeq?: number;
  apiClient?: ExamApiClient;
  explanationsMap?: Record<number, LearnerExplanation>;
  onFinish?: (results: { total: number; correct: number; durationSec: number }) => void;
  className?: string;
}

interface CheckResult {
  isCorrect: boolean;
  explanation?: string;
}

export function PracticeRunner({
  snapshot,
  attemptId,
  lease,
  initialAnswers,
  initialSeq,
  apiClient,
  explanationsMap = {},
  onFinish,
  className = '',
}: PracticeRunnerProps): React.JSX.Element {
  const flatQuestions = flattenExamQuestions(snapshot);
  const { t } = useI18n();
  const [showFurigana] = useFurigana();
  const [selectLookupEnabled, setSelectLookupEnabled] = useSelectLookupSetting();
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialAnswers && Array.isArray(initialAnswers)) {
      const firstUnanswered = initialAnswers.findIndex((a) => a === 0);
      if (firstUnanswered >= 0 && firstUnanswered < flatQuestions.length) {
        return firstUnanswered;
      }
    }
    return 0;
  });

  // Initialize selected answers from initialAnswers if present
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    if (initialAnswers && Array.isArray(initialAnswers)) {
      initialAnswers.forEach((ans, idx) => {
        if (ans > 0) init[idx] = ans;
      });
    }
    return init;
  });

  const [checkedState, setCheckedState] = useState<Record<number, CheckResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const lastSeqRef = useRef<number>(initialSeq ?? 0);
  const pendingSyncRef = useRef<Promise<unknown> | null>(null);

  const selectLookupState = useSelectLookup({
    enabled: selectLookupEnabled,
    questionIndex: currentIndex,
  });

  const currentQ = flatQuestions[currentIndex];
  const userChoice = currentQ ? selectedAnswers[currentQ.globalIndex] : undefined;
  const currentCheck = currentQ ? checkedState[currentQ.globalIndex] : undefined;
  const isChecked = Boolean(currentCheck);
  const isCorrect = Boolean(currentCheck?.isCorrect);

  const handleSelectOption = async (optVal: number) => {
    if (isChecked) return; // Locked once checked
    if (!currentQ) return;
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && (selection.toString() || '').trim().length > 0) {
        return;
      }
    }

    const newAnswers = {
      ...selectedAnswers,
      [currentQ.globalIndex]: optVal,
    };
    setSelectedAnswers(newAnswers);

    // Sync answer sheet with server
    if (attemptId && lease && apiClient) {
      try {
        lastSeqRef.current += 1;
        const currentSeq = lastSeqRef.current;
        const answerArray = Array(flatQuestions.length).fill(0);
        Object.entries(newAnswers).forEach(([k, v]) => {
          answerArray[Number(k)] = v;
        });
        const syncPromise = apiClient.updateAnswerSheet(attemptId, {
          lease,
          seq: currentSeq,
          answers: answerArray,
          flags: Array(flatQuestions.length).fill(0),
          changes: [{ i: currentQ.globalIndex, v: optVal, at: Date.now() }],
        });
        pendingSyncRef.current = syncPromise;
        await syncPromise;
      } catch {
        // Non-blocking sync error
      }
    }
  };

  const handleCheckAnswer = async () => {
    if (!currentQ || !userChoice) return;
    setIsChecking(true);
    setCheckError(null);

    try {
      if (pendingSyncRef.current) {
        try {
          await pendingSyncRef.current;
        } catch {
          // Non-blocking sync error
        }
      }
      if (attemptId && lease && apiClient) {
        const res = await apiClient.checkAnswer(attemptId, {
          lease,
          index: currentQ.globalIndex,
        });
        setCheckedState((prev) => ({
          ...prev,
          [currentQ.globalIndex]: {
            isCorrect: res.correct,
            explanation: res.explanation,
          },
        }));
      } else {
        // Fallback for standalone/demo testing
        setCheckedState((prev) => ({
          ...prev,
          [currentQ.globalIndex]: {
            isCorrect: true,
          },
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kiểm tra đáp án vào lúc này.';
      setCheckError(msg);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < flatQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      let correct = 0;
      Object.values(checkedState).forEach((c) => {
        if (c.isCorrect) correct += 1;
      });

      if (pendingSyncRef.current) {
        try {
          await pendingSyncRef.current;
        } catch {
          // Non-blocking sync error
        }
      }

      if (attemptId && lease && apiClient) {
        try {
          const answerArray = Array(flatQuestions.length).fill(0);
          Object.entries(selectedAnswers).forEach(([k, v]) => {
            answerArray[Number(k)] = v;
          });
          await apiClient.submitAttempt(attemptId, {
            lease,
            seq: lastSeqRef.current + 1,
            answers: answerArray,
            flags: Array(flatQuestions.length).fill(0),
          });
        } catch {
          // Submitted
        }
      }

      onFinish?.({ total: flatQuestions.length, correct, durationSec: 180 });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (isFinished) {
    let correctCount = 0;
    Object.values(checkedState).forEach((c) => {
      if (c.isCorrect) correctCount += 1;
    });
    const totalCount = flatQuestions.length || 1;
    const percentage = Math.round((correctCount / totalCount) * 100);

    return (
      <div
        data-testid="practice-session-complete"
        className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-sm ${className}`}
      >
        <PartyPopper className="mx-auto size-10" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Hoàn thành buổi luyện tập!
        </h2>
        <div className="flex justify-center gap-6">
          <div className="surface surface--secondary rounded-2xl p-4 min-w-[120px]">
            <span className="text-xs text-slate-500 block">Số câu đúng</span>
            <strong className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {correctCount} / {flatQuestions.length}
            </strong>
          </div>
          <div className="surface surface--secondary rounded-2xl p-4 min-w-[120px]">
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
    return (
      <div className="p-8 text-center text-slate-500">
        Không có câu hỏi trong đề luyện tập.
      </div>
    );
  }

  const resolvedExplanation: LearnerExplanation = explanationsMap[currentQ.globalIndex] || {
    index: currentQ.globalIndex,
    questionId: currentQ.questionId,
    hasExplanation: Boolean(currentCheck?.explanation),
    correctReason: currentCheck?.explanation || 'Đáp án đã được hệ thống xác nhận.',
    wrongReasonsByOption: {},
    translation: null,
    vocabTags: [],
    grammarTags: [],
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

        <div className="flex flex-wrap items-center gap-2">
          <FuriganaToggle size="sm" />
          {/* H06: Switch Tra từ khi bôi đen */}
          <div className="flex items-center gap-1.5 px-1 py-0.5" data-testid="select-lookup-toggle-wrap">
            <Switch
              id="practice-select-lookup-switch"
              data-testid="select-lookup-switch"
              checked={selectLookupEnabled}
              onCheckedChange={setSelectLookupEnabled}
              aria-label={t('dictionary.selectLookupLabel')}
            />
            <label
              htmlFor="practice-select-lookup-switch"
              className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              {t('dictionary.selectLookupLabel')}
            </label>
          </div>
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

      {checkError && (
        <Alert variant="error" onClose={() => setCheckError(null)}>
          {checkError}
        </Alert>
      )}

      {/* Passage if present */}
      {currentQ.passage && currentQ.passage.length > 0 && (
        <div data-select-lookup-area="true">
          <PassageView passage={currentQ.passage} showFurigana={showFurigana} className="mb-4" />
        </div>
      )}

      {/* Stem */}
      <div
        data-select-lookup-area="true"
        className="text-lg font-japanese leading-relaxed text-slate-900 dark:text-slate-100 p-2"
      >
        <RichTextView segments={currentQ.stem} showFurigana={showFurigana} />
      </div>

      {/* Options List */}
      <div
        data-select-lookup-area="true"
        className="space-y-3"
        role="radiogroup"
        aria-label={`Phương án câu ${currentQ.number}`}
      >
        {currentQ.options.map((opt, optIdx) => {
          const optValue = optIdx + 1;
          const isSelected = userChoice === optValue;

          let btnClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-400';
          let badgeClass = 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';

          if (isChecked) {
            if (isSelected) {
              if (isCorrect) {
                btnClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30';
                badgeClass = 'bg-emerald-600 text-white font-bold';
              } else {
                btnClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30';
                badgeClass = 'bg-rose-600 text-white font-bold';
              }
            }
          } else if (isSelected) {
            btnClass = 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/30';
            badgeClass = 'bg-blue-600 text-white font-bold';
          }

          return (
            <Button
              key={optIdx}
              type="button"
              role="radio"
              variant="outline"
              aria-checked={isSelected}
              disabled={isChecked}
              onClick={() => handleSelectOption(optValue)}
              data-testid={`practice-option-${optValue}`}
              className={`w-full p-4 rounded-xl border text-left flex items-start justify-start gap-3 transition-all min-h-[56px] h-auto whitespace-normal ${btnClass}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${badgeClass}`}>
                {opt.label}
              </span>
              <div className="flex-1 pt-1 font-japanese text-base leading-relaxed">
                <RichTextView segments={opt.content} showFurigana={showFurigana} />
              </div>
            </Button>
          );
        })}
      </div>

      {/* Check Answer Action */}
      {!isChecked && (
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={isChecking}
            disabled={!userChoice || isChecking}
            onClick={handleCheckAnswer}
            data-testid="practice-check-answer-btn"
          >
            {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra đáp án ngay'}
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
            <span>{isCorrect ? 'Chính xác! Bạn đã chọn đúng.' : 'Chưa chính xác. Hãy xem lời giải chi tiết bên dưới.'}</span>
          </div>

          <ExplanationView
            explanation={resolvedExplanation}
            questionNumber={currentQ.number}
            userAnswer={userChoice}
            correctAnswer={isCorrect ? userChoice : undefined}
          />

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="md" onClick={handleNext} data-testid="practice-continue-btn">
              {currentIndex === flatQuestions.length - 1 ? 'Xem kết quả buổi học' : 'Câu tiếp theo →'}
            </Button>
          </div>
        </div>
      )}

      {/* H06: Khung tra từ nổi khi bôi đen trong luyện tập */}
      <SelectionLookupPopover state={selectLookupState} openInNewTab={true} />
    </div>
  );
}
