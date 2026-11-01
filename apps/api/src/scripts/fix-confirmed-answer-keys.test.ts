import { describe, expect, it } from 'vitest';
import { CONFIRMED_ANSWER_KEY_FIXES } from './fix-confirmed-answer-keys.js';

describe('confirmed answer-key correction manifest', () => {
  it('contains 27 unique corrections', () => {
    expect(CONFIRMED_ANSWER_KEY_FIXES).toHaveLength(27);
    const ids = CONFIRMED_ANSWER_KEY_FIXES.map((fix) => fix[0] + ':Q' + fix[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('changes valid option numbers', () => {
    for (const fix of CONFIRMED_ANSWER_KEY_FIXES) {
      expect(fix[2]).toBeGreaterThanOrEqual(1);
      expect(fix[2]).toBeLessThanOrEqual(4);
      expect(fix[3]).toBeGreaterThanOrEqual(1);
      expect(fix[3]).toBeLessThanOrEqual(4);
      expect(fix[3]).not.toBe(fix[2]);
    }
  });

  it('excludes ambiguous questions that require content editing', () => {
    const ids = new Set(CONFIRMED_ANSWER_KEY_FIXES.map((fix) => fix[0] + ':Q' + fix[1]));
    expect(ids.has('n3-2012-12:Q62')).toBe(false);
    expect(ids.has('n5-2017-07:Q54')).toBe(false);
    expect(ids.has('n5-2010-2011:Q54')).toBe(false);
  });
});
