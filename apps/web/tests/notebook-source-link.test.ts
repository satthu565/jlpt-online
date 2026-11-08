import { describe, expect, it } from 'vitest';
import { getNotebookSourceHref, getSourceAttemptDestination, resolveNotebookAttempt } from '../features/learning/services/notebook-source-link';
import type { NotebookItem } from '../features/learning/types';

const item: NotebookItem = { id: 'word', userId: 'user', kind: 'vocab', term: '早い', meaning: 'early', mastered: false, tags: [], version: 1, createdAt: '', updatedAt: '' };

describe('notebook source navigation', () => {
  it('preserves the exact attempt and question even if the same exam was taken again', () => {
    const url = new URL(getNotebookSourceHref({ ...item, sourceAttemptId: 'original', sourceExamId: 'exam', sourceQid: 'question-12', sourceQnum: 12 }), 'https://example.test');
    expect(url.pathname).toBe('/ket-qua/original');
    expect(url.searchParams.get('questionId')).toBe('question-12');
    expect(url.searchParams.get('questionNumber')).toBe('12');
  });
  it('supports legacy metadata and never invents an attempt', () => {
    const url = new URL(getNotebookSourceHref({ ...item, tags: ['#source_exam:JLPT N4 7/2024', 'source_qid:question-12', 'source_qnum:12'] }), 'https://example.test');
    expect(url.searchParams.get('sourceExam')).toBe('JLPT N4 7/2024');
    expect(url.searchParams.has('sourceAttemptId')).toBe(false);
    expect(url.searchParams.get('questionId')).toBe('question-12');
  });
  it('passes the save timestamp for resolving legacy entries', () => {
    const url = new URL(getNotebookSourceHref({ ...item, sourceExam: 'JLPT N4 7/2024', createdAt: '2026-11-01T00:30:00Z' }), 'https://example.test');
    expect(url.searchParams.get('sourceSavedAt')).toBe('2026-11-01T00:30:00Z');
  });
  it('keeps arbitrary metadata inside query values', () => {
    const url = new URL(getNotebookSourceHref({ ...item, sourceAttemptId: 'a?sourceAttemptId=other', sourceExam: 'N4 & questionId=wrong', sourceQid: 'actual' }), 'https://example.test');
    expect(url.origin).toBe('https://example.test');
    expect(url.searchParams.getAll('questionId')).toEqual(['actual']);
    expect(url.pathname).toBe('/ket-qua/a%3FsourceAttemptId%3Dother');
  });
});

describe('source attempt status navigation', () => {
  it('opens completed reviews and resumes unfinished attempts at the saved question', () => {
    const params = new URLSearchParams({ questionId: 'question-12', questionNumber: '12' });
    expect(getSourceAttemptDestination({ id: 'original', status: 'submitted' }, params)).toBe('/ket-qua/original?questionId=question-12&questionNumber=12');
    const resume = new URL(getSourceAttemptDestination({ id: 'original', status: 'in_progress' }, params)!, 'https://example.test');
    expect(resume.pathname).toBe('/phong-thi');
    expect(resume.searchParams.get('attemptId')).toBe('original');
    expect(resume.searchParams.get('questionId')).toBe('question-12');
  });
});

describe('legacy source attempt resolution', () => {
  const original = { id: 'original', startedAt: '2026-11-01T00:00:00Z', submittedAt: '2026-11-01T01:00:00Z', status: 'submitted' };
  const newer = { ...original, id: 'newer', startedAt: '2026-11-02T00:00:00Z', submittedAt: '2026-11-02T01:00:00Z' };
  it('does not treat duplicate cursor pages as separate attempts', () => {
    expect(resolveNotebookAttempt([original, original])).toEqual(original);
  });
  it('resolves the saved time rather than choosing the newer attempt', () => {
    expect(resolveNotebookAttempt([newer, original], undefined, '2026-11-01T00:30:00Z')).toEqual(original);
    expect(resolveNotebookAttempt([newer, original])).toBeUndefined();
  });
  it('also resolves an unfinished attempt without requiring submission', () => {
    const active = { ...newer, submittedAt: null, status: 'in_progress' };
    expect(resolveNotebookAttempt([active, original], undefined, '2026-11-02T00:30:00Z')).toEqual(active);
  });
});
