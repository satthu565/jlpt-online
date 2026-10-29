'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Flag } from 'lucide-react';
import { Button } from '@jlpt/ui/components/exam-controls';
import { Modal } from '@jlpt/ui/components/exam-controls';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import { usePaperWorkspace } from '../hooks/use-paper-workspace';
import { answeredIn, nextReviewQuestion } from '../utils/booklet';
import { getSectionLabelKey } from '../utils/section-label';
import type { JapaneseFontSize } from './exam-toolbar';
import { PaperBooklet } from './paper-booklet';
import { PaperAnswerSheet } from './paper-answer-sheet';
import { PaperPassage } from './paper-content';
import './paper-exam.css';

interface ExamWorkspaceProps {
  attemptId: string;
  examId: string;
  version: number;
  title: string;
  questions: FlatQuestionItem[];
  answers: number[];
  flags: number[];
  currentIndex: number;
  fontSize: JapaneseFontSize;
  showFurigana: boolean;
  lookupEnabled: boolean;
  disabled: boolean;
  isLastSection: boolean;
  onActivate: (index: number) => void;
  onAnswer: (index: number, value: number) => void;
  onFlag: (index: number) => void;
  onFinishSection: () => void;
  children?: React.ReactNode;
}

/** Only the central workspace changes; the existing page shell stays in ExamRoom. */
export function ExamWorkspace(props: ExamWorkspaceProps): React.JSX.Element {
  const { t } = useI18n();
  const workspace = usePaperWorkspace(props.attemptId, props.examId, props.version);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [passage, setPassage] = useState<FlatQuestionItem | null>(null);
  const [notice, setNotice] = useState('');
  const restored = useRef(false);
  const sectionLabelKey = getSectionLabelKey(props.title);
  const sectionLabel = sectionLabelKey ? t(sectionLabelKey) : props.title;
  const answered = answeredIn(props.questions, props.answers);
  const activate = (index: number) => {
    props.onActivate(index);
    const question = props.questions.find((item) => item.globalIndex === index);
    if (question) workspace.update({ currentQuestionId: question.questionId });
  };
  const jump = (index: number) => {
    const question = props.questions.find((item) => item.globalIndex === index);
    if (!question) return;
    activate(index);
    setSheetOpen(false);
    setPassage(null);
    requestAnimationFrame(() => {
      const target = document.getElementById(`paper-question-${question.questionId}`);
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
      target?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    if (!workspace.ready || restored.current) return;
    restored.current = true;
    const question = props.questions.find((item) => item.questionId === workspace.workspace.currentQuestionId);
    if (question) jump(question.globalIndex);
  }, [workspace.ready]);
  const review = (filter: 'blank' | 'flagged', direction = 1) => {
    const next = nextReviewQuestion(props.questions, props.currentIndex, props.answers, props.flags, filter, direction);
    if (next) { setNotice(''); jump(next.globalIndex); }
    else setNotice(t(filter === 'blank' ? 'paperExam.noBlank' : 'paperExam.noFlags'));
  };
  const sheetProps = {
    questions: props.questions, answers: props.answers, flags: props.flags,
    currentIndex: props.currentIndex, disabled: props.disabled, onJump: jump,
    onAnswer: (index: number, value: number) => { activate(index); props.onAnswer(index, value); },
    onFlag: (index: number) => { activate(index); props.onFlag(index); }, onReview: review,
  };
  return <main className={`exam-workspace paper-font-mincho paper-size-${props.fontSize} flex-1 max-w-7xl w-full mx-auto p-4 md:p-6`} data-testid="exam-workspace">
    <div className="paper-main">
      {props.children}
      {(notice || workspace.saveFailed) && <p role={workspace.saveFailed ? 'alert' : 'status'}>{workspace.saveFailed ? t('paperExam.notesSaveError') : notice}</p>}
      <PaperBooklet questions={props.questions} title={props.title} answers={props.answers} flags={props.flags} currentIndex={props.currentIndex} workspace={workspace.workspace} showFurigana={props.showFurigana} lookupEnabled={props.lookupEnabled} disabled={props.disabled} onActivate={activate} onAnswer={props.onAnswer} onFlag={props.onFlag} onNote={workspace.setNote} onMark={workspace.mark} onClearMarks={workspace.clearMarks} onOpenPassage={setPassage} />
      <div className="paper-bottom-nav"><Button variant="outline" onClick={() => review('blank')}>{t('paperExam.nextBlank')}</Button><Button variant="primary" data-testid="finish-section-btn" disabled={props.disabled} onClick={props.onFinishSection}>{props.isLastSection ? t('paperExam.submit') : t('paperExam.submitSection', { section: sectionLabel })}</Button></div>
    </div>
    <div className="paper-sticky-sheet"><PaperAnswerSheet {...sheetProps} /></div>
    <div className="paper-mobile-bar"><span>{t('paperExam.answeredCount', { done: answered, total: props.questions.length })}</span><Button size="sm" variant="outline" aria-label={t('paperExam.reviewFlags')} onClick={() => review('flagged')}><Flag className="size-4" aria-hidden="true" />{props.questions.filter((item) => props.flags[item.globalIndex]).length}</Button><Button size="sm" onClick={() => setSheetOpen(true)}><BookOpen className="size-4" aria-hidden="true" />{t('paperExam.sheet')}</Button></div>
    <Modal isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title={t('paperExam.sheet')} closeLabel={t('paperExam.close')} className="paper-bottom-sheet"><div className="exam-workspace-modal"><PaperAnswerSheet {...sheetProps} /></div></Modal>
    <Modal isOpen={Boolean(passage)} onClose={() => setPassage(null)} title={t('paperExam.readPassage')} closeLabel={t('paperExam.close')} className="paper-reading-sheet"><div className={`exam-workspace-modal paper-font-mincho paper-size-${props.fontSize}`}>{passage?.passage && <PaperPassage id={passage.groupId} blocks={passage.passage} marks={workspace.workspace.marks} onMark={workspace.mark} onClear={workspace.clearMarks} showFurigana={props.showFurigana} disabled={props.disabled} />}</div></Modal>
  </main>;
}
