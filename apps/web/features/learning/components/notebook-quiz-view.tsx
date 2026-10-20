'use client';

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
      className="quiz-container"
      style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      data-testid="notebook-quiz-view"
    >
      {/* Quiz Progress Header */}
      {!isFinished && currentQ && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
            <CardTitle style={{ fontSize: '1.25rem', lineHeight: 1.5 }}>
              {currentQ.stem}
            </CardTitle>
          </CardHeader>

          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <span style={{ fontWeight: 700, marginRight: '0.75rem' }}>
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span>{optionText}</span>
                </Button>
              );
            })}

            {isAnswered && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Alert variant={selectedOption === currentQ.correctOptionIndex ? 'success' : 'error'}>
                  {selectedOption === currentQ.correctOptionIndex
                    ? `✓ ${t('notebook.quiz.correct')}`
                    : `✗ ${t('notebook.quiz.incorrect')}`}
                  {currentQ.explanation && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      {currentQ.explanation}
                    </div>
                  )}
                </Alert>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
          <CardContent style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('notebook.quiz.completedTitle')}
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
              {t('notebook.quiz.scoreSummary', {
                score: String(score),
                total: String(questions.length),
                percent: String(Math.round((score / Math.max(questions.length, 1)) * 100)),
              })}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              {onRetake && (
                <Button variant="outline" onClick={onRetake}>
                  🔄 {t('notebook.quiz.retake')}
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
