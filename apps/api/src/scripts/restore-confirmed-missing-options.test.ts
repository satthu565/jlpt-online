import { describe, expect, it } from 'vitest';
import { CONFIRMED_MISSING_OPTION_RESTORATIONS } from './restore-confirmed-missing-options.js';

describe('confirmed missing option restorations', () => {
  it('covers all four printed options for N2 12/2023 questions 72 through 82', () => {
    const ids = CONFIRMED_MISSING_OPTION_RESTORATIONS.map(
      ([slug, questionNumber, optionIndex]) => `${slug}:Q${questionNumber}:${optionIndex}`,
    );

    expect(ids).toHaveLength(44);
    expect(new Set(ids).size).toBe(44);
    for (let questionNumber = 72; questionNumber <= 82; questionNumber += 1) {
      expect(
        CONFIRMED_MISSING_OPTION_RESTORATIONS.filter(
          ([slug, number]) => slug === 'n2-2023-12' && number === questionNumber,
        ).map(([, , optionIndex]) => optionIndex),
      ).toEqual([1, 2, 3, 4]);
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
