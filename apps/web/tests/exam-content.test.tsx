import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExamPassage, ExamText } from '../features/exam/components/exam-content';
import { QuestionView } from '../features/exam/components/question-view';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';

describe('Source content in the original exam UI', () => {
  it('preserves source whitespace, ruby, underline and the existing answer controls', () => {
    const question = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT)[0]!;
    const html = renderToStaticMarkup(<QuestionView question={{ ...question, stem: [{ t: 'ruby', text: '予約', rt: 'よやく' }, { t: 'text', text: '　\n' }, { t: 'underline', text: 'する' }] }} selectedOption={2} isFlagged={false} onSelectOption={() => {}} onToggleFlag={() => {}} />);
    expect(html).toContain('jlpt-question-card');
    expect(html).toContain('<ruby');
    expect(html).toContain('よやく');
    expect(html).toContain('　\n');
    expect(html).toContain('<u');
    expect(html.match(/role="radio"/g)).toHaveLength(question.options.length);
    expect(html).not.toContain('paper-booklet');
  });

  it('renders actual passage blocks, tables and media through the API proxy', () => {
    const html = renderToStaticMarkup(<ExamPassage blocks={[{ type: 'paragraph', content: [{ t: 'text', text: '本文' }] }, { type: 'table', rows: [[[{ t: 'text', text: '予定' }]]] }, { type: 'image', mediaKey: 'media/figure.png', alt: '図', width: 640, height: 480 }]} />);
    expect(html).toContain('本文');
    expect(html).toContain('<table');
    expect(html).toContain('予定');
    expect(html).toContain('/api/v1/media/figure.png');
    expect(html).toContain('図');
  });

  it('routes inline media without changing external media URLs', () => {
    const html = renderToStaticMarkup(<ExamText segments={[{ t: 'image', mediaKey: 'media/inline.png', alt: '図' }]} />);
    expect(html).toContain('/api/v1/media/inline.png');
  });
});
