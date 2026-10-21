import { describe, expect, it } from 'vitest';
import { MondaiTypeSchema } from '@jlpt/schema';
import { MONDAI_LABEL_VI, mondaiLabel } from '../features/exam/mondai-labels';

describe('mondai labels', () => {
  it('names every mondai type in Vietnamese, never the internal code', () => {
    for (const type of MondaiTypeSchema.options) {
      expect(MONDAI_LABEL_VI[type]).toBeTruthy();
      expect(MONDAI_LABEL_VI[type]).not.toContain('_');
    }
    expect(mondaiLabel('kanji_reading')).toBe('Đọc kanji');
    expect(mondaiLabel('not_a_type')).toBe('');
    expect(mondaiLabel(undefined)).toBe('');
  });
});
