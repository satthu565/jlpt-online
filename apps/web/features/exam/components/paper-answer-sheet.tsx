'use client';

import React from 'react';
import { Flag, ArrowDownToLine, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@jlpt/ui/components/button';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import { answeredIn, displayQuestionNumber, groupBookletQuestions, richTextContent } from '../utils/booklet';

export interface PaperAnswerSheetProps {
  questions: FlatQuestionItem[];
  answers: number[];
  flags: number[];
  currentIndex: number;
  disabled: boolean;
  onJump: (index: number) => void;
  onAnswer: (index: number, option: number) => void;
  onFlag: (index: number) => void;
  onReview: (filter: 'blank' | 'flagged', direction?: number) => void;
}

export function PaperAnswerSheet(props: PaperAnswerSheetProps): React.JSX.Element {
  const { t } = useI18n();
  const count = props.questions.filter((question) => props.flags[question.globalIndex] === 1).length;
  return <aside className="paper-answer-sheet" data-testid="question-palette" aria-label={t('paperExam.sheet')}>
    <div className="paper-sheet-heading"><h2>{t('paperExam.sheet')}</h2><span lang="ja">解答用紙</span></div>
    <div className="paper-sheet-status" aria-live="polite">{t('paperExam.answeredCount', { done: answeredIn(props.questions, props.answers), total: props.questions.length })} · {t('paperExam.flagCount', { count })}</div>
    <div className="paper-sheet-actions"><Button variant="outline" size="sm" onClick={() => props.onReview('blank')}><ArrowDownToLine className="size-4" aria-hidden="true" />{t('paperExam.nextBlank')}</Button><Button variant="ghost" size="sm" onClick={() => props.onReview('flagged')}><Flag className="size-4" aria-hidden="true" />{t('paperExam.reviewFlags')}</Button><div className="paper-review-arrows"><Button variant="ghost" size="sm" aria-label={t('paperExam.previousFlag')} onClick={() => props.onReview('flagged', -1)}><ArrowLeft className="size-4" aria-hidden="true" /></Button><Button variant="ghost" size="sm" aria-label={t('paperExam.nextFlag')} onClick={() => props.onReview('flagged', 1)}><ArrowRight className="size-4" aria-hidden="true" /></Button></div></div>
    <div className="paper-sheet-rows">{groupBookletQuestions(props.questions).map((group, index) => <section key={group.id}>
      <h3 className="paper-sheet-group" lang="ja">{richTextContent(group.instructions).match(/問題\s*[0-9０-９一二三四五六七八九十]+/)?.[0] ?? t('paperExam.group', { number: index + 1 })}</h3>
      {group.questions.map((question) => {
        const qIndex = question.globalIndex;
        const number = displayQuestionNumber(question.number);
        return <div key={question.questionId} className={`paper-answer-row ${qIndex === props.currentIndex ? 'is-active' : ''}`} data-testid={`paper-answer-row-${qIndex}`}>
          <Button variant="ghost" size="sm" onClick={() => props.onJump(qIndex)} aria-label={t('paperExam.goToQuestion', { number })} aria-current={qIndex === props.currentIndex ? 'true' : undefined}>{number}</Button>
          <div className="paper-bubbles" role="group" aria-label={t('paperExam.options', { number })}>{question.options.map((option, optionIndex) => <Button key={optionIndex} size="sm" variant="ghost" className={`paper-bubble ${props.answers[qIndex] === optionIndex + 1 ? 'is-selected' : ''}`} aria-pressed={props.answers[qIndex] === optionIndex + 1} aria-label={t('paperExam.selectAnswer', { number, option: option.label })} disabled={props.disabled || question.isLocked} onClick={() => props.onAnswer(qIndex, optionIndex + 1)}>{option.label}</Button>)}</div>
          <Button variant="ghost" size="sm" disabled={props.disabled || question.isLocked} aria-pressed={Boolean(props.flags[qIndex])} aria-label={t(props.flags[qIndex] ? 'paperExam.unflagQuestion' : 'paperExam.flagQuestion', { number })} onClick={() => props.onFlag(qIndex)}><Flag className="size-4" aria-hidden="true" fill={props.flags[qIndex] ? 'currentColor' : 'none'} /></Button>
        </div>;
      })}
    </section>)}</div>
    <div className="paper-sheet-legend">{t('paperExam.sheetLegend')}</div>
  </aside>;
}
