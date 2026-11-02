import { describe, expect, it } from 'vitest';
import {
  CONFIRMED_CONTENT_CORRECTIONS,
  getCorrectionState,
} from './fix-confirmed-content-issues.js';

describe('confirmed content correction manifest', () => {
  it('contains 54 unique correction operations', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toHaveLength(54);
    const ids = CONFIRMED_CONTENT_CORRECTIONS.map(
      (c) => `${c[0]}:${c[1]}:${c[2]}:${c[3] ?? ''}:${c[4]}`,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a non-empty and non-identity replacement for every operation', () => {
    for (const correction of CONFIRMED_CONTENT_CORRECTIONS) {
      expect(['stem', 'passage', 'option']).toContain(correction[2]);
      expect(correction[4].length).toBeGreaterThan(0);
      expect(correction[5].length).toBeGreaterThan(0);
      expect(correction[5]).not.toBe(correction[4]);
      expect(correction[6].length).toBeGreaterThan(3);
    }
  });

  it('restores the N1 July 2013 passage and printed Q60 option', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toContainEqual([
      'n1-2013-07',
      59,
      'passage',
      null,
      '石垣そのものの them... 大規模な崩壊',
      '石垣そのものの大規模な崩壊',
      'Remove foreign OCR text absent from the source paper',
    ]);
    expect(CONFIRMED_CONTENT_CORRECTIONS).toContainEqual([
      'n1-2013-07',
      60,
      'option',
      3,
      '[KHONG_DOC_RO]',
      '化学薬品の有用性',
      'Restore the printed option from the source paper',
    ]);
  });

  it('restores the N1 December 2021 placeholders from the source paper', () => {
    const corrections = CONFIRMED_CONTENT_CORRECTIONS.filter((item) => item[0] === 'n1-2021-12');
    expect(corrections).toHaveLength(3);
    expect(corrections.map((item) => [item[1], item[2], item[4], item[5]])).toEqual([
      [53, 'stem', 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つ[KHONG_DOC_RO]るか。', 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つか。'],
      [62, 'passage', '弊店の客層に合うよう[KHONG_DOC_RO]階または２階', '弊店の客層に合うよう１階または２階'],
      [62, 'passage', '直[KHONG_DOC_RO]ご相談', '直接ご相談'],
    ]);
  });

  it('recognizes replacements whose new value contains the old value', () => {
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 0)).toBe('pending');
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 1)).toBe('applied');
    expect(getCorrectionState('誤字', '正字', 1, 1)).toBe('invalid');
  });
});
