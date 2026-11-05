import { describe, expect, it } from 'vitest';
import {
  getExplanationSyncState,
  N2_EXPLANATION_ANSWER_SYNCS,
  synchronizeExplanationContent,
} from './sync-n2-answer-explanations.js';

describe('N2 explanation/answer synchronization', () => {
  it('covers the two corrected N2 answer keys', () => {
    expect(N2_EXPLANATION_ANSWER_SYNCS).toHaveLength(2);
    expect(
      N2_EXPLANATION_ANSWER_SYNCS.map((item) => `${item.examSlug}:Q${item.questionNumber}`),
    ).toEqual(['n2-2021-12:Q37', 'n2-2013-07:Q32']);
  });

  it('rewrites the correct reason and moves the stale answer into wrong reasons', () => {
    const sync = N2_EXPLANATION_ANSWER_SYNCS[0]!;
    const source = {
      contentVersion: 1,
      humanReviewed: false,
      translationVi: 'Con gái tôi...',
      correctReason: [{ t: 'text', text: 'Đáp án đúng: [3] にでもなって\nnội dung cũ' }],
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
        [1, 'にもなって'],
        [2, 'にもなれば'],
        [3, 'にでもなって'],
        [4, 'にでもなれば'],
      ]),
      3,
    );

    expect(getExplanationSyncState(source, 3, 1)).toBe('pending');
    expect(getExplanationSyncState(result, 3, 1)).toBe('applied');
    expect(result.contentVersion).toBe(3);
    expect(result.humanReviewed).toBe(true);
    expect(result.explanationMarkdown).toContain('Đáp án đúng: [1] にもなって');
    expect(result.explanationMarkdown).toContain('[3] Phương án 3: にでもなって');
    expect(result.wrongReasonsByOption).not.toHaveProperty('1');
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
