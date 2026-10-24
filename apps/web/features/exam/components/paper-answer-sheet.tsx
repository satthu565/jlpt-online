'use client';
import React, { useState } from 'react';
import { Flag, ArrowDownToLine } from 'lucide-react';
import { Button, Card, Chip, ProgressBar, Label, RadioGroup, Radio, Tabs } from '@jlpt/ui/components/exam-controls';
import { useI18n } from '../../../lib/i18n';
import type { FlatQuestionItem } from '../types';
import { answeredIn, displayQuestionNumber, groupBookletQuestions, richTextContent } from '../utils/booklet';
export interface PaperAnswerSheetProps {
 questions: FlatQuestionItem[]; answers: number[]; flags: number[]; currentIndex: number; disabled: boolean;
 onJump: (index: number) => void; onAnswer: (index: number, option: number) => void; onFlag: (index: number) => void;
 onReview: (filter: 'blank' | 'flagged', direction?: number) => void;
}
export function PaperAnswerSheet(props: PaperAnswerSheetProps): React.JSX.Element {
 const {t}=useI18n(); const [filter,setFilter]=useState('all');
 const answered=answeredIn(props.questions,props.answers), count=props.questions.filter(q=>props.flags[q.globalIndex]).length;
 const visible=props.questions.filter(q=>filter==='all'||(filter==='blank'?!props.answers[q.globalIndex]:props.flags[q.globalIndex]));
 return <Card className="paper-answer-sheet" data-testid="question-palette" aria-label={t('paperExam.sheet')}>
 <Card.Header><Card.Title>{t('paperExam.sheet')}</Card.Title><Card.Description>{t('paperExam.answeredCount',{done:answered,total:props.questions.length})}</Card.Description></Card.Header>
 <Card.Content className="grid gap-3 min-h-0">
 <ProgressBar value={answered} maxValue={Math.max(1,props.questions.length)} aria-label={t('paperExam.answeredCount',{done:answered,total:props.questions.length})}><div className="flex justify-between items-center"><Label>{t('paperExam.progress',{done:answered,total:props.questions.length})}</Label><ProgressBar.Output /></div><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar>
 <div className="flex gap-2"><Chip size="sm" variant="soft">{t('paperExam.flagCount',{count})}</Chip><Button variant="ghost" size="sm" onClick={()=>props.onReview('blank')} aria-label={t('paperExam.nextBlank')}><ArrowDownToLine className="size-4" />{t('paperExam.nextBlank')}</Button></div>
 <Tabs selectedKey={filter} onSelectionChange={key=>setFilter(String(key))}><Tabs.ListContainer><Tabs.List aria-label={t('paperExam.review')}>{['all','blank','flagged'].map(key=><Tabs.Tab key={key} id={key}>{t(`paperExam.filter${key[0]!.toUpperCase()+key.slice(1)}`)}<Tabs.Indicator /></Tabs.Tab>)}</Tabs.List></Tabs.ListContainer></Tabs>
 <div className="paper-sheet-rows">{groupBookletQuestions(visible).map((group,index)=><section key={group.id}><h3 className="paper-sheet-group" lang="ja">{richTextContent(group.instructions).match(/問題\s*[0-9０-９一二三四五六七八九十]+/)?.[0]??t('paperExam.group',{number:index+1})}</h3>{group.questions.map(question=>{
 const qIndex=question.globalIndex,number=displayQuestionNumber(question.number);
 return <div key={question.questionId} className="paper-answer-row" data-testid={`paper-answer-row-${qIndex}`}>
 <Button variant={qIndex===props.currentIndex?'secondary':'ghost'} size="sm" aria-current={qIndex===props.currentIndex?'true':undefined} aria-label={t('paperExam.goToQuestion',{number})} onClick={()=>props.onJump(qIndex)}>{number}</Button>
 <RadioGroup variant="secondary" orientation="horizontal" className="paper-bubbles" aria-label={t('paperExam.options',{number})} value={String(props.answers[qIndex]||'')} isDisabled={props.disabled||question.isLocked} onChange={value=>props.onAnswer(qIndex,Number(value))}>{question.options.map((option,index)=><Radio key={index} value={String(index+1)}><Radio.Content aria-label={t('paperExam.selectAnswer',{number,option:option.label})}><Radio.Control><Radio.Indicator /></Radio.Control>{option.label}</Radio.Content></Radio>)}</RadioGroup>
 <Button variant="ghost" size="icon" disabled={props.disabled||question.isLocked} aria-pressed={Boolean(props.flags[qIndex])} aria-label={t(props.flags[qIndex]?'paperExam.unflagQuestion':'paperExam.flagQuestion',{number})} onClick={()=>props.onFlag(qIndex)}><Flag className="size-4" fill={props.flags[qIndex]?'currentColor':'none'} /></Button>
 </div>;
 })}</section>)}</div>
 </Card.Content></Card>;
}