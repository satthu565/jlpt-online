import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SAMPLE_EXAM_SUMMARIES } from './fixtures/exam-fixtures';
import { LibraryView } from '../features/library/components/library-view';
import { ExamPicker } from '../features/exam/components/exam-picker';
import type { ExamWithUserStatus } from '../features/library/types';

// D06: an exam with no questions (for example an empty generated mix) must never be offered,
// neither as the "next recommendation" nor in the exam lists.
describe('exams without questions are hidden', () => {
  const real = { ...SAMPLE_EXAM_SUMMARIES[0]!, title: 'Đề có câu hỏi', totalQuestions: 20 } as ExamWithUserStatus;
  const empty = {
    ...SAMPLE_EXAM_SUMMARIES[1]!,
    id: 'empty-mix',
    slug: 'de-tron-rong',
    title: 'Đề trộn rỗng',
    totalQuestions: 0,
    isRecommendedNext: true,
  } as ExamWithUserStatus;

  it('LibraryView neither recommends nor lists an empty exam', () => {
    const html = renderToString(<LibraryView exams={[empty, real]} />);
    expect(html).not.toContain('Đề trộn rỗng');
    expect(html).toContain('Đề có câu hỏi');
  });

  it('ExamPicker does not list an empty exam', () => {
    const html = renderToString(
      <ExamPicker
        exams={[
          { ...real, totalQuestions: 20 } as never,
          { ...empty, totalQuestions: 0 } as never,
        ]}
        onSelectExam={vi.fn()}
      />,
    );
    expect(html).not.toContain('Đề trộn rỗng');
    expect(html).toContain('Đề có câu hỏi');
  });
});
