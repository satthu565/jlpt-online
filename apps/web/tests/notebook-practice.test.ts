import { describe, expect, it, vi } from 'vitest';
import type { NotebookItem } from '../features/learning/types';
import {
  advancePractice, answerPractice, buildPracticePool, DEFAULT_PRACTICE_SETTINGS,
  newPracticeSession, practiceScore, retryPractice, visiblePracticeTags,
} from '../features/learning/services/notebook-practice';
import {
  emptyPracticeState, practiceStorageKey, restorePracticeState,
} from '../features/learning/services/notebook-practice-storage';
import { LearningClient } from '../features/learning/services/learning-client';

const item = (id: string, term: string, meaning: string, updates: Partial<NotebookItem> = {}): NotebookItem => ({
  id, term, meaning, userId: 'learner', kind: 'vocab', mastered: false, tags: [],
  version: 1, createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z', ...updates,
});
const entries = [
  item('school', '学校', 'Trường học', { reading: 'がっこう', sourceExam: 'N5 7/2025', tags: ['nhà trường'], examples: ['学校へ行きます。'] }),
  item('teacher', '先生', 'Giáo viên', { reading: 'せんせい', sourceExam: 'N3 7/2025', mastered: true }),
  item('library', '図書館', 'Thư viện', { reading: 'としょかん', tags: ['level:N1'] }),
];
const pool = () => buildPracticePool(entries, DEFAULT_PRACTICE_SETTINGS, () => 0.5);

describe('notebook practice question quality and filters', () => {
  it('uses only real, unique answers of the same kind and keeps saved examples', () => {
    const grammar = [item('g1', 'から', 'Vì', { kind: 'grammar' }), item('g2', 'ても', 'Dù', { kind: 'grammar' })];
    const questions = buildPracticePool([...entries, ...grammar], DEFAULT_PRACTICE_SETTINGS);
    expect(questions).toHaveLength(5);
    for (const question of questions) {
      const candidates = [...entries, ...grammar].filter(entry => entry.kind === question.kind);
      expect(question.options.every(option => candidates.some(entry => entry.meaning === option))).toBe(true);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options[question.correctOptionIndex]).toBe(question.meaning);
    }
    expect(questions.find(q => q.term === '学校')?.example).toBe('学校へ行きます。');
  });
  it('uses two real choices instead of fallback distractors and skips insufficient data', () => {
    expect(buildPracticePool(entries.slice(0, 2), DEFAULT_PRACTICE_SETTINGS).every(q => q.options.length === 2)).toBe(true);
    expect(buildPracticePool(entries.slice(0, 1), DEFAULT_PRACTICE_SETTINGS)).toEqual([]);
  });
  it('excludes overlapping synonym lists and normalized duplicate answers', () => {
    expect(buildPracticePool([item('a', '学生', 'Học sinh; sinh viên'), item('b', '生徒', 'sinh viên')], DEFAULT_PRACTICE_SETTINGS)).toEqual([]);
    expect(buildPracticePool([item('a', '学校', 'Trường học'), item('b', '校舎', '  trường   học ')], DEFAULT_PRACTICE_SETTINGS)).toEqual([]);
  });
  it('does not ask an ambiguous duplicate prompt and deduplicates identical prompts', () => {
    const result = buildPracticePool([...entries, item('duplicate', '学校', 'Nhà ga')], DEFAULT_PRACTICE_SETTINGS);
    expect(result.some(q => q.term === '学校')).toBe(false);
    expect(buildPracticePool([...entries, { ...entries[0]!, id: 'copy' }], DEFAULT_PRACTICE_SETTINGS)).toHaveLength(3);
  });
  it('combines scope filters while drawing distractors from real entries outside the tested scope', () => {
    const result = buildPracticePool(entries, { ...DEFAULT_PRACTICE_SETTINGS, level: 'N5', tag: 'nhà trường', mastery: 'unmastered' });
    expect(result.map(q => q.notebookItemId)).toEqual(['school']);
    expect(result[0]?.options).toHaveLength(3);
    expect(buildPracticePool(entries, { ...DEFAULT_PRACTICE_SETTINGS, level: 'N1' })).toEqual([]);
    expect(visiblePracticeTags(entries[2]!)).toEqual([]);
  });
  it('keeps matching metadata when duplicate terms occur under different tags', () => {
    const duplicate = { ...entries[0]!, id: 'copy', tags: ['riêng'] };
    const result = buildPracticePool([...entries, duplicate], { ...DEFAULT_PRACTICE_SETTINGS, tag: 'riêng' });
    expect(result).toHaveLength(1);
    expect(result[0]?.notebookItemId).toBe('copy');
    expect(result[0]?.optionTerms.filter(term => term === '学校')).toHaveLength(1);
  });
  it('reading questions hide readings in the prompt and do not test grammar or kana-identical prompts', () => {
    const result = buildPracticePool([...entries,
      item('kana', 'ありがとう', 'Cảm ơn', { reading: 'ありがとう' }),
      item('g', 'から', 'Vì', { kind: 'grammar', reading: 'から' }),
    ], { ...DEFAULT_PRACTICE_SETTINGS, mode: 'reading' });
    expect(result.map(q => q.term).sort()).toEqual(entries.map(entry => entry.term).sort());
    for (const question of result) {
      expect(question.stem).toBe(question.term);
      expect(question.options[question.correctOptionIndex]).toBe(question.reading);
    }
  });
});

describe('durable notebook practice rounds', () => {
  it('selection is not graded until confirmation and survives reload', () => {
    const session = { ...newPracticeSession(pool()), selection: 0 };
    const state = { ...emptyPracticeState(), session };
    const restored = restorePracticeState(JSON.stringify(state));
    expect(restored.recovered).toBe(false);
    expect(restored.state.session?.answers).toEqual([]);
    expect(restored.state.session?.selection).toBe(0);
  });
  it('records the first confirmed answer once and cannot skip ungraded questions', () => {
    const session = newPracticeSession(pool());
    expect(advancePractice(session)).toBe(session);
    const checked = answerPractice(session, session.questions[0]!.correctOptionIndex);
    expect(answerPractice(checked, -1)).toBe(checked);
    expect(checked.answers).toHaveLength(1);
    expect(advancePractice(checked).cursor).toBe(1);
  });
  it('retries only mistakes and forgotten entries while preserving the first-round score', () => {
    let session = newPracticeSession(pool());
    session = advancePractice(answerPractice(session, session.questions[0]!.correctOptionIndex));
    session = advancePractice(answerPractice(session, -1));
    session = advancePractice(answerPractice(session, -1));
    expect(practiceScore(session.questions, session.answers)).toBe(1);
    let retry = retryPractice(session)!;
    expect(retry.questions).toHaveLength(2);
    expect(retry.initial?.answers).toEqual(session.answers);
    while (retry.cursor < retry.questions.length) {
      retry = advancePractice(answerPractice(retry, retry.questions[retry.cursor]!.correctOptionIndex));
    }
    expect(practiceScore(retry.questions, retry.answers)).toBe(2);
    expect(practiceScore(retry.initial!.questions, retry.initial!.answers)).toBe(1);
    expect(retryPractice(retry)).toBeNull();
    expect(restorePracticeState(JSON.stringify({ ...emptyPracticeState(), session: retry })).recovered).toBe(false);
  });
  it('restores a checked answer and prevents double grading after reload', () => {
    const session = answerPractice(newPracticeSession(pool()), -1);
    const restored = restorePracticeState(JSON.stringify({ ...emptyPracticeState(), session })).state.session!;
    expect(answerPractice(restored, 0)).toBe(restored);
    expect(restored.answers).toEqual([-1]);
  });
  it('rejects malformed drafts, impossible progress and invalid answer indexes', () => {
    const session = newPracticeSession(pool());
    for (const value of [
      'not json', JSON.stringify({ version: 999 }),
      JSON.stringify({ ...emptyPracticeState(), session: { ...session, cursor: 99 } }),
      JSON.stringify({ ...emptyPracticeState(), session: { ...session, answers: [99] } }),
      JSON.stringify({ ...emptyPracticeState(), session: { ...session, questions: [] } }),
      JSON.stringify({ ...emptyPracticeState(), session: { ...session, selection: 99 } }),
    ]) {
      const result = restorePracticeState(value);
      expect(result.recovered).toBe(true);
      expect(result.state.session).toBeNull();
    }
    expect(restorePracticeState(null).recovered).toBe(false);
  });
  it('scopes settings and drafts to distinct account keys', () => {
    expect(practiceStorageKey('first')).not.toBe(practiceStorageKey('second'));
    expect(practiceStorageKey('a:b')).not.toBe(practiceStorageKey('a%3Ab'));
  });
});

describe('practice notebook pagination', () => {
  it('loads beyond the first 100 records and deduplicates overlapping pages', async () => {
    const first = Array.from({ length: 100 }, (_, i) => item(String(i), String(i), String(i)));
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify({
      items: url.includes('offset=100') ? [first[99], item('last', '最後', 'Cuối cùng')] : first,
    }), { status: 200 }));
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as typeof fetch });
    const result = await client.getAllNotebookItems();
    expect(result).toHaveLength(101);
    expect(result.at(-1)?.id).toBe('last');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
  it('rejects a repeated full page instead of looping or pretending the notebook is empty', async () => {
    const items = Array.from({ length: 100 }, (_, i) => item(String(i), String(i), String(i)));
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ items }), { status: 200 }));
    await expect(new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as typeof fetch }).getAllNotebookItems())
      .rejects.toThrow('pagination did not advance');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
