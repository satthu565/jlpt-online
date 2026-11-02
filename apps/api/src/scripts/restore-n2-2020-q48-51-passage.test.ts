import { describe, expect, it } from 'vitest';
import {
  EXPECTED_ANSWERS,
  EXPECTED_INFO_IMAGE_KEY,
  EXPECTED_INFO_IMAGE_SHA256,
  EXPECTED_PDF_SHA256,
  INFO_QUESTIONS,
  NEW_PASSAGE,
  OLD_PASSAGE,
  getRestorationState,
  validateNewPassage,
} from './restore-n2-2020-q48-51-passage.js';

describe('N2 12/2020 Q48-51 passage restoration', () => {
  it('pins the owner-supplied PDF/image and verified answer sequences', () => {
    expect(EXPECTED_PDF_SHA256).toHaveLength(64);
    expect(EXPECTED_INFO_IMAGE_SHA256).toHaveLength(64);
    expect(EXPECTED_INFO_IMAGE_KEY).toBe(`media/${EXPECTED_INFO_IMAGE_SHA256}.png`);
    expect(EXPECTED_ANSWERS).toEqual([3, 1, 3, 4]);
    expect(INFO_QUESTIONS.map((item) => item.correctOption)).toEqual([4, 3]);
  });

  it('contains blanks 48-51 exactly once and in order', () => {
    expect(() => validateNewPassage()).not.toThrow();
    expect(JSON.stringify(NEW_PASSAGE)).toContain('ロボット・セラピー');
    expect(JSON.stringify(NEW_PASSAGE)).toContain('医療分野');
  });

  it('distinguishes pending, applied, and invalid passage states', () => {
    expect(getRestorationState(OLD_PASSAGE)).toBe('pending');
    expect(getRestorationState(NEW_PASSAGE)).toBe('applied');
    expect(getRestorationState([])).toBe('invalid');
  });

  it('restores Problem 14 with the corrected one-way discount option order', () => {
    expect(INFO_QUESTIONS[0].options[3]).toContain('①か③');
    expect(INFO_QUESTIONS[1].options[2]).toBe('2400円から100円割引された金額');
    expect(INFO_QUESTIONS[1].options[3]).toBe('2400円から200円割引された金額');
  });
});
