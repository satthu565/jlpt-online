import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { answeredIn, displayQuestionNumber, groupBookletQuestions, mediaUrl, nextReviewQuestion } from '../features/exam/utils/booklet';
import { PaperBooklet } from '../features/exam/components/paper-booklet';
import { PaperAnswerSheet } from '../features/exam/components/paper-answer-sheet';
import { MarkedText } from '../features/exam/components/paper-content';
import { ExamRoom } from '../features/exam/components/exam-room';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';
import { ExamApiClient } from '../features/exam/api/exam-api';

const flat = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT);
const first = flat[0]!;
const second = { ...first, questionId: 'second-question', number: 'V2', globalIndex: 1, groupId: 'separate-import-group' };
const noop = () => {};

describe('Paper booklet and answer sheet', () => {
  it('keeps the original room controls around all questions in the active section', () => {
    const html = renderToStaticMarkup(<ExamRoom snapshot={SAMPLE_N5_EXAM_SNAPSHOT} attemptId="booklet-attempt" lease="booklet-lease" mode="practice" serverNow={new Date().toISOString()} storage={new MemoryExamStorage()} apiClient={new ExamApiClient()} />);
    expect(html).toContain('jlpt-section-header');
    expect(html).toContain('jlpt-exam-toolbar');
    expect(html).toContain('submit-exam-btn');
    const questions = flat.filter((question) => question.sectionIndex === 0);
    expect(questions.length).toBeGreaterThan(1);
    for (const question of questions) expect(html).toContain(`data-testid="paper-question-${question.globalIndex}"`);
    for (const question of flat.filter((item) => item.sectionIndex !== 0)) expect(html).not.toContain(`data-testid="paper-question-${question.globalIndex}"`);
    expect(html).not.toContain('jlpt-question-card');
    expect(html).not.toContain('paper-session-header');
    expect(html).toContain('paper-answer-sheet');
  });
  it('routes imported media through the same-origin API while preserving external and signed URLs', () => {
    expect(mediaUrl('media/listening.wav')).toBe('/api/v1/media/listening.wav');
    expect(mediaUrl('/media/figure.png?t=example')).toBe('/api/v1/media/figure.png?t=example');
    expect(mediaUrl('/api/v1/media/listening.wav')).toBe('/api/v1/media/listening.wav');
    expect(mediaUrl('https://cdn.example.test/listening.wav?t=example')).toBe('https://cdn.example.test/listening.wav?t=example');
  });
  it('collapses repeated printed instructions but keeps separate unknown groups', () => {
    const instructions = [{ t: 'text' as const, text: '問題１　次の問いに答えてください。' }];
    expect(groupBookletQuestions([{ ...first, instructions }, { ...second, instructions }])).toHaveLength(1);
    expect(groupBookletQuestions([{ ...first, instructions: [] }, { ...second, instructions: [] }])).toHaveLength(2);
    expect(groupBookletQuestions([{ ...first, instructions }, { ...second, sectionIndex: 1, instructions }])).toHaveLength(2);
    expect(groupBookletQuestions([{ ...first, instructions }, { ...second, instructions: [{ t: 'text', text: '問題２' }] }])).toHaveLength(2);
  });

  it('preserves Japanese ruby and underlining without exposing imported number prefixes', () => {
    expect(displayQuestionNumber('V12')).toBe('12');
    expect(displayQuestionNumber('G1')).toBe('1');
    expect(displayQuestionNumber('問1')).toBe('問1');
    const html = renderToStaticMarkup(<MarkedText id="question" segments={[{ t: 'ruby', text: '予約', rt: 'よやく' }, { t: 'underline', children: [{ t: 'text', text: 'する' }] }]} marks={[{ start: 0, end: 1 }]} onMark={noop} onClear={noop} showFurigana />);
    expect(html).toContain('<mark>予</mark>約<rt>よやく</rt>');
    expect(html).toContain('<u>する</u>');
  });

  it('renders multiple questions, one shared passage, review flags and a distinct erase action', () => {
    const passage = [{ type: 'paragraph' as const, content: [{ t: 'text' as const, text: 'SHARED_PASSAGE' }] }];
    const instructions = [{ t: 'text' as const, text: '問題１　共通の指示' }];
    const html = renderToStaticMarkup(<PaperBooklet title="N3" questions={[{ ...first, instructions, passage }, { ...second, instructions, passage }]} answers={[2, 0]} flags={[1, 0]} currentIndex={0} workspace={{ fontSize: 'base', font: 'mincho', notes: {}, marks: {} }} showFurigana disabled={false} onActivate={noop} onAnswer={noop} onFlag={noop} onNote={noop} onMark={noop} onClearMarks={noop} onOpenPassage={noop} />);
    expect(html.split('SHARED_PASSAGE')).toHaveLength(2);
    expect(html.split('共通の指示')).toHaveLength(2);
    expect(html).toContain('paper-question-0');
    expect(html).toContain('paper-question-1');
    expect(html).toContain('Bỏ đánh dấu xem lại câu');
    expect(html).toContain('Tẩy đáp án câu');
    expect(html).not.toContain('Tổng hợp #');
  });

  it('counts answers independently from flags and rejects nonexistent option values', () => {
    const threeOptions = { ...second, options: first.options.slice(0, 3) };
    expect(answeredIn([first, threeOptions], [2, 4])).toBe(1);
    expect(answeredIn([first, threeOptions], [0, 0])).toBe(0);
    const html = renderToStaticMarkup(<PaperAnswerSheet questions={[first, threeOptions]} answers={[2, 0]} flags={[0, 1]} currentIndex={1} disabled={false} onJump={noop} onAnswer={noop} onFlag={noop} onReview={noop} />);
    expect(html).toContain('Đã trả lời 1/2 câu');
    expect(html).toContain('1 câu cần xem lại');
    expect(html).toContain('Đến câu 2');
    expect(html).not.toContain('Câu 2, đáp án 4');
  });

  it('cycles through blank or flagged questions and excludes locked questions', () => {
    const questions = [first, second, { ...second, questionId: 'locked', globalIndex: 2, isLocked: true }];
    expect(nextReviewQuestion(questions, 1, [0, 2, 0], [0, 1, 1], 'blank')?.globalIndex).toBe(0);
    expect(nextReviewQuestion(questions, 0, [1, 2, 0], [0, 1, 1], 'blank')).toBeUndefined();
    expect(nextReviewQuestion(questions, 0, [1, 2, 0], [0, 1, 1], 'flagged', -1)?.globalIndex).toBe(1);
    expect(nextReviewQuestion([], 0, [], [], 'blank')).toBeUndefined();
  });

});
