'use client';

import React, { useMemo, useState } from 'react';
import { Flag, BookOpen, Eraser, PencilLine } from 'lucide-react';
import { Button } from '@jlpt/ui/components/button';
import { Textarea } from '@jlpt/ui/components/textarea';
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
    {groups.map((group, groupIndex) => <section key={group.id} className="paper-mondai" id={`paper-group-${group.id}`}>
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
          <section id={`paper-question-${question.questionId}`} data-question-index={qIndex} data-testid={`paper-question-${qIndex}`} className={`paper-question ${props.currentIndex === qIndex ? 'is-active' : ''} ${props.flags[qIndex] ? 'is-flagged' : ''}`} onPointerDown={() => props.onActivate(qIndex)} onFocusCapture={() => props.onActivate(qIndex)} aria-label={t('paperExam.question', { number })}>
            <div className="paper-question-tools">
              {question.passage?.length ? <Button size="sm" variant="ghost" onClick={() => props.onOpenPassage(passageOwner)}><BookOpen className="size-4" aria-hidden="true" />{t('paperExam.readPassage')}</Button> : <span />}
              <Button size="sm" variant={props.flags[qIndex] ? 'secondary' : 'ghost'} disabled={isDisabled} onClick={() => props.onFlag(qIndex)} aria-pressed={Boolean(props.flags[qIndex])} aria-label={t(props.flags[qIndex] ? 'paperExam.unflagQuestion' : 'paperExam.flagQuestion', { number })}><Flag className="size-4" aria-hidden="true" fill={props.flags[qIndex] ? 'currentColor' : 'none'} />{t(props.flags[qIndex] ? 'paperExam.flagged' : 'paperExam.flag')}</Button>
            </div>
            <div className="paper-stem" lang="ja"><span className="paper-number">{number}</span><MarkedText id={question.questionId} segments={question.stem} marks={props.workspace.marks[question.questionId] ?? []} onMark={props.onMark} onClear={props.onClearMarks} showFurigana={props.showFurigana} disabled={isDisabled} /></div>
            <div className="paper-options" role="radiogroup" aria-label={t('paperExam.options', { number })}>
              {question.options.map((option, optionIndex) => <Button key={optionIndex} role="radio" aria-checked={props.answers[qIndex] === optionIndex + 1} variant="ghost" disabled={isDisabled} className={`paper-option ${props.answers[qIndex] === optionIndex + 1 ? 'is-selected' : ''}`} onClick={() => { if (!window.getSelection()?.toString().trim()) props.onAnswer(qIndex, optionIndex + 1); }} aria-label={t('paperExam.selectAnswer', { number, option: option.label })}><span className="paper-option-label">{option.label}.</span><ExamText segments={option.content} showFurigana={props.showFurigana} /></Button>)}
            </div>
            <div className="paper-question-footer">
              <Button size="sm" variant="ghost" disabled={isDisabled || !props.answers[qIndex]} onClick={() => props.onAnswer(qIndex, 0)} aria-label={t('paperExam.eraseQuestion', { number })}><Eraser className="size-4" aria-hidden="true" />{t('paperExam.erase')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setNotesOpen((previousNotes) => ({ ...previousNotes, [question.questionId]: !previousNotes[question.questionId] }))} aria-expanded={Boolean(notesOpen[question.questionId])}><PencilLine className="size-4" aria-hidden="true" />{t(question.mondaiType === 'sentence_composition' ? 'paperExam.compositionDraft' : 'paperExam.draft')}</Button>
            </div>
            {notesOpen[question.questionId] && <div className="paper-note"><Textarea label={t('paperExam.noteLabel', { number })} hint={t('paperExam.localNotes')} value={props.workspace.notes[question.questionId] ?? ''} onChange={(event) => props.onNote(question.questionId, event.target.value)} disabled={isDisabled} rows={2} maxLength={10000} /><Button variant="ghost" size="sm" disabled={isDisabled || !props.workspace.notes[question.questionId]} onClick={() => props.onNote(question.questionId, '')}>{t('paperExam.clearDraft')}</Button></div>}
          </section>
        </React.Fragment>;
      })}
      <div className="paper-group-end">{groupIndex + 1} / {groups.length}</div>
    </section>)}
  </article>;
}
