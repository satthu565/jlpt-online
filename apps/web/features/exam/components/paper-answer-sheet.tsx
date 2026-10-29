'use client';

import React, { useId, useState } from 'react';
import { ArrowDownToLine, ChevronRight, ClipboardList, Flag } from 'lucide-react';
import { Button, Card, Chip, ProgressBar, ProgressCircle, Separator, Tabs } from '@jlpt/ui/components/exam-controls';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import { answeredIn, displayQuestionNumber } from '../utils/booklet';

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
  const descriptionId = useId();
  const [filter, setFilter] = useState<'all' | 'answered' | 'blank'>('all');
  const hasAnswer = (question: FlatQuestionItem) => (props.answers[question.globalIndex] ?? 0) > 0 && props.answers[question.globalIndex]! <= question.options.length;
  const visible = props.questions.filter(question => filter === 'all' || (filter === 'answered' ? hasAnswer(question) : !hasAnswer(question)));
  const total = props.questions.length;
  const answered = answeredIn(props.questions, props.answers);
  const flagCount = props.questions.filter(question => props.flags[question.globalIndex]).length;
  const counts = { all: total, answered, blank: total - answered };
  const percent = Math.round(answered / Math.max(1, total) * 100);
  const progressLabel = t('paperExam.answeredCount', { done: answered, total });

  return <Card className="paper-answer-sheet" data-testid="question-palette" aria-label={t('paperExam.questionList')}>
    <Card.Header className="paper-palette-header">
      <div className="paper-palette-heading">
        <ClipboardList className="paper-palette-icon" aria-hidden="true" />
        <div><Card.Title className="text-base font-bold sm:text-lg">{t('paperExam.questionList')}</Card.Title><Card.Description className="text-xs sm:text-sm">{t('paperExam.paletteHint')}</Card.Description></div>
      </div>
      <div className="paper-palette-summary">
        <ProgressCircle value={answered} maxValue={Math.max(1, total)} aria-label={progressLabel} className="paper-palette-circle" data-testid="palette-progress-circle">
          <ProgressCircle.Track className="paper-palette-circle-track"><ProgressCircle.TrackCircle /><ProgressCircle.FillCircle /></ProgressCircle.Track>
          <strong className="paper-palette-percent" aria-hidden="true">{percent}%</strong>
        </ProgressCircle>
        <span className="paper-palette-count">{t('paperExam.paletteCount', { done: answered, total })}</span>
      </div>
      <ProgressBar value={answered} maxValue={Math.max(1, total)} aria-label={progressLabel} aria-hidden="true" className="paper-palette-bar"><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar>
    </Card.Header>
    <Card.Content className="paper-palette-content">
      <Tabs selectedKey={filter} onSelectionChange={key => { if (key === 'all' || key === 'answered' || key === 'blank') setFilter(key); }}>
        <Tabs.ListContainer><Tabs.List aria-label={t('paperExam.review')}>{(['all', 'answered', 'blank'] as const).map(key => <Tabs.Tab key={key} id={key} className="flex-1 whitespace-nowrap px-1 text-xs sm:px-2 sm:text-sm">{t(`paperExam.filter${key[0]!.toUpperCase() + key.slice(1)}`)} ({counts[key]})<Tabs.Indicator /></Tabs.Tab>)}</Tabs.List></Tabs.ListContainer>
      </Tabs>
      <div className="paper-palette-legend" aria-label={t('paperExam.questionStates')}>
        {(['blank', 'current', 'answered', 'flagged'] as const).map(state => <Chip key={state} size="sm" variant="tertiary" className="paper-palette-legend-item"><span className={`paper-legend-swatch paper-legend-${state}`} aria-hidden="true" />{t(state === 'blank' ? 'paperExam.stateBlank' : state === 'answered' ? 'paperExam.stateAnswered' : state === 'current' ? 'paperExam.paletteViewing' : 'paperExam.paletteFlagged')}</Chip>)}
      </div>
      <Separator />
      {visible.length === 0 && <p role="status">{t(filter === 'answered' ? 'paperExam.noAnswered' : 'paperExam.noBlank')}</p>}
      <nav className="paper-sheet-grid" aria-label={t('paperExam.groupNavigation')}>
        {visible.map(question => {
          const index = question.globalIndex;
          const number = displayQuestionNumber(question.number);
          const isAnswered = hasAnswer(question);
          const isCurrent = index === props.currentIndex;
          const isFlagged = Boolean(props.flags[index]);
          const state = [t(isAnswered ? 'paperExam.stateAnswered' : 'paperExam.stateBlank'), isCurrent ? t('paperExam.paletteViewing') : null, isFlagged ? t('paperExam.paletteFlagged') : null].filter(Boolean).join(', ');
          return <Button key={question.questionId} variant="outline" className="paper-question-tile paper-palette-status rounded-lg" data-testid={`paper-question-tile-${index}`} data-answered={isAnswered} data-flagged={isFlagged} aria-current={isCurrent ? 'step' : undefined} aria-label={t('paperExam.goToQuestion', { number })} aria-describedby={`${descriptionId}-${index}`} onClick={() => props.onJump(index)}>
            {number}<span id={`${descriptionId}-${index}`} className="sr-only">{state}</span>{isFlagged && <Flag className="paper-tile-flag size-3" aria-hidden="true" />}
          </Button>;
        })}
      </nav>
    </Card.Content>
    <Card.Footer className="paper-palette-actions">
      <Button variant="ghost" size="sm" className="paper-palette-action text-xs" onClick={() => props.onReview('flagged')} aria-label={t('paperExam.reviewFlags')}><span className="paper-palette-action-icon"><Flag aria-hidden="true" /></span><span>{t('paperExam.flagCount', { count: flagCount })}</span><ChevronRight aria-hidden="true" /></Button>
      <Separator orientation="vertical" className="h-8" />
      <Button variant="ghost" size="sm" className="paper-palette-action text-xs" onClick={() => props.onReview('blank')}><span className="paper-palette-action-icon"><ArrowDownToLine aria-hidden="true" /></span><span>{t('paperExam.nextBlank')}</span><ChevronRight aria-hidden="true" /></Button>
    </Card.Footer>
  </Card>;
}
