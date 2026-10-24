'use client';

import React from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Modal } from '@jlpt/ui/components/modal';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import { answeredIn, displayQuestionNumber } from '../utils/booklet';

interface PaperReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onJump: (index: number) => void;
  questions: FlatQuestionItem[];
  answers: number[];
  flags: number[];
  busy: boolean;
  expired: boolean;
  final: boolean;
  sectionTitle: string;
  error: string | null;
  currentSectionIndex?: number;
}

export function PaperReviewModal(props: PaperReviewModalProps): React.JSX.Element {
  const { t } = useI18n();
  const answered = answeredIn(props.questions, props.answers);
  const blank = props.questions.filter((question) => !props.answers[question.globalIndex]);
  const flagged = props.questions.filter((question) => props.flags[question.globalIndex]);
  return <Modal isOpen={props.open} onClose={() => { if (!props.busy) props.onClose(); }} title={t(props.final ? 'paperExam.submitTitle' : 'paperExam.transitionTitle')} closeLabel={t('paperExam.close')} footer={<div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={props.busy} onClick={props.onClose}>{t('paperExam.returnToExam')}</Button><Button variant="primary" disabled={props.busy} loading={props.busy} onClick={props.onConfirm} data-testid="modal-confirm-submit-btn">{t(props.final ? 'paperExam.confirmSubmit' : 'paperExam.confirmTransition')}</Button></div>}>
    <div className="space-y-4">
      <p>{props.sectionTitle}</p>
      <p>{t('paperExam.reviewStats', { done: answered, total: props.questions.length, blank: blank.length, flagged: flagged.length })}</p>
      <p>{t(props.final ? 'paperExam.confirmAllWarning' : 'paperExam.lockWarning')}</p>
      <p className="text-xs">{t('paperExam.reviewTimeRuns')}</p>
      {props.expired && <p role="status">{t('paperExam.expired')}</p>}
      {props.error && <p role="alert" className="text-red-700 dark:text-red-300">{props.error}</p>}
      {([['blank', blank], ['flagged', flagged]] as const).map(([type, questions]) => <section key={type}><h3 className="font-semibold">{t(type === 'blank' ? 'paperExam.blankQuestions' : 'paperExam.flaggedQuestions')}</h3><div className="flex flex-wrap gap-2 mt-2">{questions.length ? questions.map((question) => <Button key={question.questionId} size="sm" variant="outline" disabled={props.busy || props.expired || question.isLocked || question.sectionIndex !== (props.currentSectionIndex ?? 0)} onClick={() => props.onJump(question.globalIndex)}>{question.sectionTitle} · {t('paperExam.question', { number: displayQuestionNumber(question.number) })}</Button>) : <span>{t('paperExam.none')}</span>}</div></section>)}
    </div>
  </Modal>;
}
