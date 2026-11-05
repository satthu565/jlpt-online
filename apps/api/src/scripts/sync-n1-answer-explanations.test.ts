import { describe, expect, it } from 'vitest';
import {
  getExplanationSyncState,
  N1_EXPLANATION_ANSWER_SYNCS,
  synchronizeExplanationContent,
} from './sync-n1-answer-explanations.js';

describe('N1 explanation/answer synchronization', () => {
  it('covers the ten corrected N1 answer keys', () => {
    expect(N1_EXPLANATION_ANSWER_SYNCS).toHaveLength(10);
    expect(
      N1_EXPLANATION_ANSWER_SYNCS.map((item) => `${item.examSlug}:Q${item.questionNumber}`),
    ).toEqual([
      'n1-2025-07:Q20',
      'n1-2024-12:Q37',
      'n1-2024-07:Q47',
      'n1-2023-07:Q17',
      'n1-2022-07:Q58',
      'n1-2019-12:Q60',
      'n1-2019-07:Q20',
      'n1-2016-07:Q57',
      'n1-2015-12:Q51',
      'n1-2011-07:Q62',
    ]);
  });

  it('rewrites the correct reason and moves the stale answer into wrong reasons', () => {
    const sync = N1_EXPLANATION_ANSWER_SYNCS[0]!;
    const source = {
      contentVersion: 1,
      humanReviewed: false,
      translationVi: 'Tạm hoãn.',
      correctReason: [{ t: 'text', text: 'Đáp án đúng: [3] nội dung cũ' }],
      wrongReasonsByOption: {
        '1': [{ t: 'text', text: 'Sai 1' }],
        '2': [{ t: 'text', text: 'Sai 2' }],
        '4': [{ t: 'text', text: 'Sai 4' }],
      },
    };
    const result = synchronizeExplanationContent(
      source,
      sync,
      new Map([
        [1, 'Lựa chọn 1'],
        [2, '返答を保留した'],
        [3, 'データを保留した'],
        [4, 'Lựa chọn 4'],
      ]),
      3,
    );

    expect(getExplanationSyncState(source, 3, 2)).toBe('pending');
    expect(getExplanationSyncState(result, 3, 2)).toBe('applied');
    expect(result.contentVersion).toBe(3);
    expect(result.humanReviewed).toBe(true);
    expect(result.explanationMarkdown).toContain('Đáp án đúng: [2] 返答を保留した');
    expect(result.explanationMarkdown).toContain('[3] Phương án 3: データを保留した');
    expect(result.wrongReasonsByOption).not.toHaveProperty('2');
    expect(result.wrongReasonsByOption).toHaveProperty('3');
  });

  it('rejects explanations that name neither expected answer', () => {
    expect(
      getExplanationSyncState(
        { correctReason: [{ t: 'text', text: 'Không có đáp án được ghi' }] },
        4,
        2,
      ),
    ).toBe('invalid');
  });
});
