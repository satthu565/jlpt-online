import { describe, expect, it } from 'vitest';
import { getPosLabels, mapPosCode } from './pos-labels.js';

describe('H05 Acceptance 6: Ánh xạ mã từ loại JMdict sang tiếng Việt', () => {
  it('maps noun (n) to Danh từ', () => {
    expect(mapPosCode('n')).toBe('Danh từ');
  });

  it('maps v1 to Động từ', () => {
    expect(mapPosCode('v1')).toBe('Động từ');
    expect(mapPosCode('v1-s')).toBe('Động từ');
  });

  it('maps all v5* codes to Động từ', () => {
    const v5Codes = [
      'v5',
      'v5k',
      'v5k-s',
      'v5s',
      'v5t',
      'v5n',
      'v5m',
      'v5r',
      'v5r-i',
      'v5g',
      'v5b',
      'v5u',
      'v5u-s',
      'v5aru',
    ];
    for (const code of v5Codes) {
      expect(mapPosCode(code)).toBe('Động từ');
    }
  });

  it('maps vs to Danh động từ (đi với する)', () => {
    expect(mapPosCode('vs')).toBe('Danh động từ (đi với する)');
    expect(mapPosCode('vs-i')).toBe('Danh động từ (đi với する)');
    expect(mapPosCode('vs-s')).toBe('Danh động từ (đi với する)');
    expect(mapPosCode('vs-c')).toBe('Danh động từ (đi với する)');
  });

  it('maps vt to Ngoại động từ and vi to Nội động từ', () => {
    expect(mapPosCode('vt')).toBe('Ngoại động từ');
    expect(mapPosCode('vi')).toBe('Nội động từ');
  });

  it('maps adj-i to Tính từ đuôi い and adj-na to Tính từ đuôi な', () => {
    expect(mapPosCode('adj-i')).toBe('Tính từ đuôi い');
    expect(mapPosCode('adj-na')).toBe('Tính từ đuôi な');
  });

  it('maps adv to Phó từ', () => {
    expect(mapPosCode('adv')).toBe('Phó từ');
    expect(mapPosCode('adv-to')).toBe('Phó từ');
  });

  it('maps prt to Trợ từ', () => {
    expect(mapPosCode('prt')).toBe('Trợ từ');
  });

  it('maps conj to Liên từ', () => {
    expect(mapPosCode('conj')).toBe('Liên từ');
  });

  it('maps int to Thán từ', () => {
    expect(mapPosCode('int')).toBe('Thán từ');
  });

  it('maps pn to Đại từ', () => {
    expect(mapPosCode('pn')).toBe('Đại từ');
  });

  it('maps ctr to Trợ số từ', () => {
    expect(mapPosCode('ctr')).toBe('Trợ số từ');
  });

  it('maps exp to Cụm từ', () => {
    expect(mapPosCode('exp')).toBe('Cụm từ');
  });

  it('keeps unknown codes in parentheses', () => {
    expect(mapPosCode('unc')).toBe('(unc)');
    expect(mapPosCode('custom_code')).toBe('(custom_code)');
    expect(mapPosCode('(already_bracketed)')).toBe('(already_bracketed)');
  });

  it('getPosLabels parses comma-separated codes, preserves order, and deduplicates', () => {
    expect(getPosLabels('n,vs')).toEqual(['Danh từ', 'Danh động từ (đi với する)']);
    expect(getPosLabels('v1,v5k')).toEqual(['Động từ']);
    expect(getPosLabels('n, adj-na, exp')).toEqual(['Danh từ', 'Tính từ đuôi な', 'Cụm từ']);
    expect(getPosLabels(null)).toEqual([]);
    expect(getPosLabels('')).toEqual([]);
  });
});
