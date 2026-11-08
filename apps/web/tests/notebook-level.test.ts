import { describe, expect, it } from 'vitest';
import { getNotebookExamLevel } from '../features/learning/components/notebook-view';

describe('notebook source exam level', () => {
  it.each(['N5', 'N4', 'N3', 'N2', 'N1'])('recognizes %s exam titles', (level) => {
    expect(getNotebookExamLevel({ sourceExam: `${level} 7/2025`, tags: [] })).toBe(level);
  });

  it.each(['n3-2025-07', '2025年7月 N3', 'JLPT N3 2025'])('recognizes source format %s', (sourceExam) => {
    expect(getNotebookExamLevel({ sourceExam, tags: [] })).toBe('N3');
  });

  it('reads legacy source tags and prefers the explicit source exam', () => {
    expect(getNotebookExamLevel({ tags: ['##source_exam:N4 12/2024'] })).toBe('N4');
    expect(getNotebookExamLevel({ sourceExam: 'N2 7/2025', tags: ['source_exam:N4 12/2024'] })).toBe('N2');
  });

  it('does not mistake word levels, notes or invalid levels for source exams', () => {
    expect(getNotebookExamLevel({ tags: ['level:N1', 'N2', 'source_sentence:N3'] })).toBeUndefined();
    expect(getNotebookExamLevel({ sourceExam: 'N10 2025', tags: [] })).toBeUndefined();
    expect(getNotebookExamLevel({ tags: [] })).toBeUndefined();
  });
});
