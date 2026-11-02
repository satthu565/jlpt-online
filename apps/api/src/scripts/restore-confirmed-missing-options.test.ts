import { describe, expect, it } from 'vitest';
import { CONFIRMED_MISSING_OPTION_RESTORATIONS } from './restore-confirmed-missing-options.js';

describe('confirmed missing option restorations', () => {
  it('covers every confirmed question with all four printed options', () => {
    const ids = CONFIRMED_MISSING_OPTION_RESTORATIONS.map(
      ([slug, questionNumber, optionIndex]) => `${slug}:Q${questionNumber}:${optionIndex}`,
    );

    expect(ids).toHaveLength(88);
    expect(new Set(ids).size).toBe(88);
    const ranges = [
      ['n1-2024-07', 52, 62],
      ['n2-2023-12', 72, 82],
    ] as const;
    for (const [slug, first, last] of ranges) {
      for (let questionNumber = first; questionNumber <= last; questionNumber += 1) {
      expect(
        CONFIRMED_MISSING_OPTION_RESTORATIONS.filter(
            ([examSlug, number]) => examSlug === slug && number === questionNumber,
        ).map(([, , optionIndex]) => optionIndex),
      ).toEqual([1, 2, 3, 4]);
      }
    }
  });

  it('only replaces the known placeholder belonging to the same option index', () => {
    for (const [, , optionIndex, oldText, newText] of CONFIRMED_MISSING_OPTION_RESTORATIONS) {
      expect(oldText).toBe('選択肢' + optionIndex);
      expect(newText).not.toContain('選択肢');
      expect(newText.trim()).toBe(newText);
    }
  });
});
