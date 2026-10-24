'use client';

import React, { useMemo, useState } from 'react';
import { Flag, BookOpen, Eraser, PencilLine } from 'lucide-react';
import { Button, Card, Radio, RadioGroup, TextField, TextArea, Label, Description } from '@jlpt/ui/components/exam-controls';
import { ExamText } from './exam-content';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import type { PaperWorkspace, TextMark } from '../hooks/use-paper-workspace';
import { displayQuestionNumber, groupBookletQuestions } from '../utils/booklet';
import { MarkedText, PaperImage, PaperPassage } from './paper-content';

interface PaperBookletProps {
  questions: FlatQuestionItem[];
  title: string;
  answers: number[];
  flags: number[];
  currentIndex: number;
  workspace: PaperWorkspace;
  showFurigana: boolean;
  disabled: boolean;
  lookupEnabled?: boolean;
  onActivate: (index: number) => void;
  onAnswer: (index: number, value: number) => void;
  onFlag: (index: number) => void;
  onNote: (id: string, value: string) => void;
  onMark: (id: string, mark: TextMark) => void;
  onClearMarks: (id: string) => void;
  onOpenPassage: (question: FlatQuestionItem) => void;
}

export function PaperBooklet(props: PaperBookletProps): React.JSX.Element {
  const { t } = useI18n();
  const groups = useMemo(() => groupBookletQuestions(props.questions), [props.questions]);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  return <article className="paper-booklet" data-select-lookup-area={props.lookupEnabled ? 'true' : undefined} aria-label={t('paperExam.booklet')}>
    <div className="paper-booklet-heading"><span lang="ja">日本語能力試験</span><span>{props.title}</span></div>
    {groups.map((group, groupIndex) => <Card key={group.id} className="paper-mondai" id={`paper-group-${group.id}`}>
      {group.instructions.length > 0 && <h2 className="paper-instructions" lang="ja"><ExamText segments={group.instructions} showFurigana={props.showFurigana} /></h2>}
      {group.questions.map((question, index) => {
        const previous = group.questions[index - 1];
        const passageOwner = group.questions.find((candidate) => candidate.passage?.length && JSON.stringify(candidate.passage) === JSON.stringify(question.passage)) ?? question;
        const showPassage = Boolean(question.passage?.length) && (!previous || JSON.stringify(previous.passage) !== JSON.stringify(question.passage));
        const sameMedia = previous?.groupId === question.groupId;
        const isDisabled = props.disabled || question.isLocked;
        const qIndex = question.globalIndex;
        const number = displayQuestionNumber(question.number);
        return <React.Fragment key={question.questionId}>
          {showPassage && <PaperPassage id={passageOwner.groupId} blocks={question.passage!} marks={props.workspace.marks} onMark={props.onMark} onClear={props.onClearMarks} showFurigana={props.showFurigana} disabled={isDisabled} />}
          {!sameMedia && (question.media ?? []).filter((src) => /\.(png|jpe?g|webp|svg|gif)(?:\?|$)/i.test(src)).map((src) => <PaperImage key={src} src={src} alt={t('paperExam.questionImage', { number })} />)}
          {/* Activate pointer interactions after the control receives its click. Changing the
              pacing banner on pointerdown can move the control before pointerup on Safari. */}
          <section id={`paper-question-${question.questionId}`} data-question-index={qIndex} data-testid={`paper-question-${qIndex}`} className={`paper-question ${question.passage?.length || question.options.some(option => JSON.stringify(option.content).length > 100) ? 'paper-long-options' : ''} ${props.currentIndex === qIndex ? 'is-active' : ''} ${props.flags[qIndex] ? 'is-flagged' : ''}`} onClick={() => { if (window.getSelection()?.isCollapsed !== false) props.onActivate(qIndex); }} onFocusCapture={(event) => { if (event.target.matches(':focus-visible')) props.onActivate(qIndex); }} aria-label={t('paperExam.question', { number })}>
            <div className="paper-question-tools">
              {question.passage?.length ? <Button size="sm" variant="ghost" onClick={() => props.onOpenPassage(passageOwner)}><BookOpen className="size-4" aria-hidden="true" />{t('paperExam.readPassage')}</Button> : <span />}
              <Button size="sm" variant={props.flags[qIndex] ? 'secondary' : 'ghost'} disabled={isDisabled} onClick={() => props.onFlag(qIndex)} aria-pressed={Boolean(props.flags[qIndex])} aria-label={t(props.flags[qIndex] ? 'paperExam.unflagQuestion' : 'paperExam.flagQuestion', { number })}><Flag className="size-4" aria-hidden="true" fill={props.flags[qIndex] ? 'currentColor' : 'none'} />{t(props.flags[qIndex] ? 'paperExam.flagged' : 'paperExam.flag')}</Button>
            </div>
            <div className="paper-stem" lang="ja"><span className="paper-number">{number}</span><MarkedText id={question.questionId} segments={question.stem} marks={props.workspace.marks[question.questionId] ?? []} onMark={props.onMark} onClear={props.onClearMarks} showFurigana={props.showFurigana} disabled={isDisabled} /></div>
            <RadioGroup variant="secondary" className="paper-options" aria-label={t('paperExam.options', { number })} value={String(props.answers[qIndex] || '')} isDisabled={isDisabled} onChange={(value) => props.onAnswer(qIndex, Number(value))}>
              {question.options.map((option, optionIndex) => <Radio key={optionIndex} value={String(optionIndex + 1)}><Radio.Content aria-label={t('paperExam.selectAnswer', { number, option: option.label })}><Radio.Control><Radio.Indicator /></Radio.Control><span className="paper-option-text"><span>{option.label}. </span><ExamText segments={option.content} showFurigana={props.showFurigana} /></span></Radio.Content></Radio>)}
            </RadioGroup>
            <div className="paper-question-footer">
              <Button size="sm" variant="ghost" disabled={isDisabled || !props.answers[qIndex]} onClick={() => props.onAnswer(qIndex, 0)} aria-label={t('paperExam.eraseQuestion', { number })}><Eraser className="size-4" aria-hidden="true" />{t('paperExam.erase')}</Button>
              <Button size="sm" variant="ghost" onPress={() => setNotesOpen((previousNotes) => ({ ...previousNotes, [question.questionId]: !previousNotes[question.questionId] }))} aria-expanded={Boolean(notesOpen[question.questionId])}><PencilLine className="size-4" aria-hidden="true" />{t(question.mondaiType === 'sentence_composition' ? 'paperExam.compositionDraft' : 'paperExam.draft')}</Button>
            </div>
            {notesOpen[question.questionId] && <div className="paper-note"><TextField value={props.workspace.notes[question.questionId] ?? ''} onChange={(value) => props.onNote(question.questionId, value)} isDisabled={isDisabled}><Label>{t('paperExam.noteLabel', { number })}</Label><TextArea rows={2} maxLength={10000} /><Description>{t('paperExam.localNotes')}</Description></TextField><Button variant="ghost" size="sm" disabled={isDisabled || !props.workspace.notes[question.questionId]} onClick={() => props.onNote(question.questionId, '')}>{t('paperExam.clearDraft')}</Button></div>}
          </section>
        </React.Fragment>;
      })}
      <div className="paper-group-end">{groupIndex + 1} / {groups.length}</div>
    </Card>)}
  </article>;
}
