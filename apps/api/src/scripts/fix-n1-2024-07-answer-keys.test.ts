import { describe, expect, it } from 'vitest';
import { fixId } from './fix-disputed-n1-answers.js';
import { N1_2024_07_KEY_FIXES } from './fix-n1-2024-07-answer-keys.js';

// Official answer sheet: reading Q52 = 3; listening 問題3 = 2,1,4,1,4; 問題5 = 3,4,3.
const EXPECTED: Record<string, number> = {
  'n1-2024-07:Q47': 3,
  'n1-2024-07:Q63': 2,
  'n1-2024-07:Q65': 4,
  'n1-2024-07:Q67': 4,
  'n1-2024-07:Q79': 3,
  'n1-2024-07:Q80': 4,
  'n1-2024-07:Q81': 3,
};

describe('N1 7/2024 answer key corrections', () => {
  it('covers exactly the seven keys that differ from the official sheet', () => {
    expect(N1_2024_07_KEY_FIXES.map(fixId)).toEqual(Object.keys(EXPECTED));
  });

  it('uses the official key and explains every wrong option', () => {
    for (const fix of N1_2024_07_KEY_FIXES) {
      expect(fix.newKey).toBe(EXPECTED[fixId(fix)]);
      expect(fix.oldKey).toBe(1);
      expect(fix.reason.length).toBeGreaterThan(20);
      const wrong = [1, 2, 3, 4].filter((option) => option !== fix.newKey);
      for (const option of wrong) expect(fix.wrongReasons?.[option]).toBeTruthy();
    }
  });
});
