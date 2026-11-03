import { describe, expect, it } from 'vitest';
import {
  CONFIRMED_CONTENT_CORRECTIONS,
  getCorrectionState,
  selectCorrections,
} from './fix-confirmed-content-issues.js';

describe('confirmed content correction manifest', () => {
  it('contains 60 unique correction operations', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toHaveLength(60);
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
    const corrections = CONFIRMED_CONTENT_CORRECTIONS.filter(
      (item) => item[0] === 'n1-2021-12' && item[4].includes('KHONG_DOC_RO'),
    );
    expect(corrections).toHaveLength(3);
    expect(corrections.map((item) => [item[1], item[2], item[4], item[5]])).toEqual([
      [53, 'stem', 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つ[KHONG_DOC_RO]るか。', 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つか。'],
      [62, 'passage', '弊店の客層に合うよう[KHONG_DOC_RO]階または２階', '弊店の客層に合うよう１階または２階'],
      [62, 'passage', '直[KHONG_DOC_RO]ご相談', '直接ご相談'],
    ]);
  });

  it('repairs the four confirmed N1 December 2021 OCR strings', () => {
    const ids = CONFIRMED_CONTENT_CORRECTIONS
      .filter((item) => item[0] === 'n1-2021-12' && !item[4].includes('KHONG_DOC_RO'))
      .map((item) => [item[1], item[2], item[3], item[4], item[5]]);
    expect(ids).toEqual([
      [62, 'passage', null, 'ご出店お願いえれば', 'ご出店お願いできれば'],
      [62, 'passage', null, '貴社の方針　心より', '貴社の方針に心より'],
      [62, 'passage', null, '平屋になんじだ年配', '平屋になじんだ年配'],
      [63, 'option', 3, '商店街にる現店舗', '商店街にある現店舗'],
    ]);
  });

  it('restores the complete N2 July 2021 Q60-62 passage', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toContainEqual([
      'n2-2021-07',
      60,
      'passage',
      null,
      '小学生はまだまだ経 漠のものです。さらに興味をもたらされた 囲のものになります。',
      '小学生はまだまだ経験の幅が狭いものです。ですから、おのずと興味や関心を持つ対象も、非常に限られた範囲のものになります。',
      'Restore the complete sentences from the original published passage',
    ]);
  });

  it('restores the printed N2 July 2021 Q54 option 4', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toContainEqual([
      'n2-2021-07',
      54,
      'option',
      4,
      'ペットボトルの飲み物で減量する女性が昨年辺りから増えていること。（※ đề in trùng với lựa chọn 3）',
      'どのような飲み物が流行するかは、人気のある雑誌の影響を受けること。',
      'Restore printed option 4 from the owner-provided source image',
    ]);
  });

  it('can safely select only the requested correction id', () => {
    const selected = selectCorrections(['--only=n2-2021-07:Q60:passage']);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.[0]).toBe('n2-2021-07');
    expect(selectCorrections([
      '--only=n2-2021-07:Q54:option4,n2-2021-07:Q60:passage',
    ])).toHaveLength(2);
    expect(() => selectCorrections(['--only=missing-id'])).toThrow('Unknown correction ids');
  });

  it('recognizes replacements whose new value contains the old value', () => {
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 0)).toBe('pending');
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 1)).toBe('applied');
    expect(getCorrectionState('誤字', '正字', 1, 1)).toBe('invalid');
  });
});
