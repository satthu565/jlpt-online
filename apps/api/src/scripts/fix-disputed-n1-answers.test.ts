import { describe, expect, it } from 'vitest';
import {
  buildUpdatedExplanation,
  fixId,
  getDisputedFixState,
  N1_3_DISPUTED_FIXES,
} from './fix-disputed-n1-answers.js';

describe('disputed N1 answer keys correction manifest', () => {
  it('covers exactly the three disputed N1 questions', () => {
    expect(N1_3_DISPUTED_FIXES).toHaveLength(3);
    const ids = N1_3_DISPUTED_FIXES.map(fixId);
    expect(ids).toEqual([
      'n1-2025-07:Q88',
      'n1-2023-12:Q63',
      'n1-2019-07:Q90',
    ]);
  });

  it('changes valid option numbers between 1 and 4', () => {
    for (const fix of N1_3_DISPUTED_FIXES) {
      expect(fix.oldKey).toBeGreaterThanOrEqual(1);
      expect(fix.oldKey).toBeLessThanOrEqual(4);
      expect(fix.newKey).toBeGreaterThanOrEqual(1);
      expect(fix.newKey).toBeLessThanOrEqual(4);
      expect(fix.newKey).not.toBe(fix.oldKey);
      expect(fix.reason.length).toBeGreaterThan(20);
      expect(fix.oldKeyReason.length).toBeGreaterThan(20);
    }
  });

  it('correctly tracks state between pending and applied', () => {
    expect(getDisputedFixState(1, 1, 2)).toBe('pending');
    expect(getDisputedFixState(2, 1, 2)).toBe('pending');
    expect(getDisputedFixState(2, 2, 2)).toBe('applied');
  });

  it('rewrites the explanation with updated correct reason, wrong reasons, and humanReviewed flag', () => {
    const fix = N1_3_DISPUTED_FIXES[0]!;
    const source = {
      contentVersion: 4,
      humanReviewed: false,
      translationVi: 'Về báo cáo tiến độ thi công...',
      correctReason: [{ t: 'text', text: 'Đáp án cũ: [1]' }],
      wrongReasonsByOption: {
        '2': [{ t: 'text', text: 'Lý do cũ cho 2' }],
        '3': [{ t: 'text', text: 'Lý do cũ cho 3' }],
      },
      explanationMarkdown: '**Lý do đúng**:\n...\n\n**Phân tích các phương án còn lại**:\n...\n\n**Script bài nghe**:\n6番\n工事の報告ですが...',
      transcript: [{ t: 'text', text: '6番' }],
    };

    const options = new Map<number, string>([
      [1, '困りましたね。すぐに対策を考えないとね'],
      [2, '全く問題ないんですね。それは安心しました'],
      [3, 'スケジュールにちょっと遅れが出ているんですね'],
    ]);

    const updated = buildUpdatedExplanation(source, fix, options, 5);

    expect(updated.contentVersion).toBe(5);
    expect(updated.humanReviewed).toBe(true);
    expect(updated.translationVi).toBe('Về báo cáo tiến độ thi công...');
    expect(JSON.stringify(updated.correctReason)).toContain('[2] 全く問題ないんですね。それは安心しました');
    expect(updated.wrongReasonsByOption).toHaveProperty('1');
    expect(updated.wrongReasonsByOption).not.toHaveProperty('2');
    expect(updated.wrongReasonsByOption).toHaveProperty('3');
    expect(updated.explanationMarkdown).toContain('**Script bài nghe**:\n6番\n工事の報告ですが...');
    expect(Array.isArray(updated.blocks)).toBe(true);
  });
});
