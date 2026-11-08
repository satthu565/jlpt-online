import { describe, expect, it } from 'vitest';
import { getNotebookSourceHref } from '../features/learning/services/notebook-source-link';
import type { NotebookItem } from '../features/learning/types';

const item: NotebookItem = { id: 'word', userId: 'user', kind: 'vocab', term: '早い', meaning: 'early', mastered: false, tags: [], version: 1, createdAt: '', updatedAt: '' };

describe('notebook source navigation', () => {
  it('preserves the exact attempt and question even if the same exam was taken again', () => {
    const url = new URL(getNotebookSourceHref({ ...item, sourceAttemptId: 'original', sourceExamId: 'exam', sourceQid: 'question-12', sourceQnum: 12 }), 'https://example.test');
    expect(url.pathname).toBe('/lich-su');
    expect(url.searchParams.get('sourceAttemptId')).toBe('original');
    expect(url.searchParams.get('questionId')).toBe('question-12');
    expect(url.searchParams.get('questionNumber')).toBe('12');
  });
  it('supports legacy metadata and never invents an attempt', () => {
    const url = new URL(getNotebookSourceHref({ ...item, tags: ['#source_exam:JLPT N4 7/2024', 'source_qid:question-12', 'source_qnum:12'] }), 'https://example.test');
    expect(url.searchParams.get('sourceExam')).toBe('JLPT N4 7/2024');
    expect(url.searchParams.has('sourceAttemptId')).toBe(false);
    expect(url.searchParams.get('questionId')).toBe('question-12');
  });
  it('keeps arbitrary metadata inside query values', () => {
    const url = new URL(getNotebookSourceHref({ ...item, sourceAttemptId: 'a?sourceAttemptId=other', sourceExam: 'N4 & questionId=wrong', sourceQid: 'actual' }), 'https://example.test');
    expect(url.origin).toBe('https://example.test');
    expect(url.searchParams.getAll('questionId')).toEqual(['actual']);
    expect(url.searchParams.get('sourceAttemptId')).toBe('a?sourceAttemptId=other');
  });
});
