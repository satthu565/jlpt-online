'use client';

import { RotateCcw, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import type { NotebookQuiz, NotebookQuizQuestion } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface NotebookQuizViewProps {
  quiz: NotebookQuiz;
  onRetake?: () => void;
  onExit?: () => void;
}

export function NotebookQuizView({
  quiz,
  onRetake,
  onExit,
}: NotebookQuizViewProps): React.JSX.Element {
  const { t } = useI18n();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [_history, setHistory] = useState<Array<{ questionId: string; selected: number; correct: boolean }>>([]);

  const questions = quiz.questions || [];
  const currentQ: NotebookQuizQuestion | undefined = questions[currentIndex];
  const isFinished = currentIndex >= questions.length;

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ?.correctOptionIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    if (currentQ) {
      setHistory((prev) => [...prev, { questionId: currentQ.id, selected: index, correct: isCorrect }]);
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div
      className="quiz-container max-w-[640px] mx-auto flex flex-col gap-6"
      data-testid="notebook-quiz-view"
    >
      {/* Quiz Progress Header */}
      {!isFinished && currentQ && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-[var(--text-secondary)]">
            {t('notebook.quiz.questionProgress', {
              current: String(currentIndex + 1),
              total: String(questions.length),
            })}
          </span>
          <Badge variant="primary">
            {t(`notebook.kinds.${currentQ.kind}`)}
          </Badge>
        </div>
      )}

      {/* Question Card */}
      {!isFinished && currentQ ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl leading-normal">
              {currentQ.stem}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {currentQ.options.map((optionText, idx) => {
              let btnVariant: 'outline' | 'primary' | 'success' | 'danger' = 'outline';
              let customStyle: React.CSSProperties = {
                justifyContent: 'flex-start',
                textAlign: 'left',
                minHeight: '48px',
                padding: '0.75rem 1rem',
              };

              if (isAnswered) {
                if (idx === currentQ.correctOptionIndex) {
                  btnVariant = 'success';
                  customStyle = {
                    ...customStyle,
                    borderColor: 'var(--color-success, #16a34a)',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                  };
                } else if (idx === selectedOption) {
                  btnVariant = 'danger';
                  customStyle = {
                    ...customStyle,
                    borderColor: 'var(--color-error, #dc2626)',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  };
                }
              }

              return (
                <Button
                  key={idx}
                  variant={btnVariant}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  style={customStyle}
                  data-testid={`quiz-option-${idx}`}
                >
                  <span className="font-bold mr-3">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{optionText}</span>
                </Button>
              );
            })}

            {isAnswered && (
              <div className="mt-4 flex flex-col gap-4">
                <Alert variant={selectedOption === currentQ.correctOptionIndex ? 'success' : 'error'}>
                  {selectedOption === currentQ.correctOptionIndex
                    ? `${t('notebook.quiz.correct')}`
                    : `${t('notebook.quiz.incorrect')}`}
                  {currentQ.explanation && (
                    <div className="mt-2 text-sm">
                      {currentQ.explanation}
                    </div>
                  )}
                </Alert>

                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleNext} data-testid="quiz-next-button">
                    {currentIndex + 1 < questions.length
                      ? t('common.buttons.next')
                      : t('notebook.quiz.viewResults')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Results Card */
        <Card data-testid="quiz-results-card">
          <CardContent className="p-12 text-center">
            <Trophy className="mx-auto mb-4 size-12" aria-hidden="true" />
            <h2 className="text-[1.75rem] font-extrabold mt-0 mx-0 mb-2 text-[var(--text-primary)]">
              {t('notebook.quiz.completedTitle')}
            </h2>
            <p className="text-xl text-[var(--text-secondary)] mt-0 mx-0 mb-6">
              {t('notebook.quiz.scoreSummary', {
                score: String(score),
                total: String(questions.length),
                percent: String(Math.round((score / Math.max(questions.length, 1)) * 100)),
              })}
            </p>

            <div className="flex justify-center gap-4">
              {onRetake && (
                <Button variant="outline" onClick={onRetake}>
                  <RotateCcw className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('notebook.quiz.retake')}
                </Button>
              )}
              {onExit && (
                <Button variant="primary" onClick={onExit}>
                  {t('notebook.quiz.finish')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
