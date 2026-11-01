import { describe, expect, it } from 'vitest';
import {
  CONFIRMED_CONTENT_CORRECTIONS,
  getCorrectionState,
} from './fix-confirmed-content-issues.js';

describe('confirmed content correction manifest', () => {
  it('contains 49 unique correction operations', () => {
    expect(CONFIRMED_CONTENT_CORRECTIONS).toHaveLength(49);
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

  it('recognizes replacements whose new value contains the old value', () => {
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 0)).toBe('pending');
    expect(getCorrectionState('当てはめて', 'に当てはめて', 1, 1)).toBe('applied');
    expect(getCorrectionState('誤字', '正字', 1, 1)).toBe('invalid');
  });
});
