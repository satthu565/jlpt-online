import { describe, expect, it } from 'vitest';
import {
  EXPECTED_ANSWERS,
  EXPECTED_PDF_SHA256,
  NEW_PASSAGE,
  OLD_PASSAGE,
  getRestorationState,
  validateNewPassage,
} from './restore-n2-2020-q48-51-passage.js';

describe('N2 12/2020 Q48-51 passage restoration', () => {
  it('pins the owner-supplied full PDF and verified answer sequence', () => {
    expect(EXPECTED_PDF_SHA256).toHaveLength(64);
    expect(EXPECTED_ANSWERS).toEqual([3, 1, 3, 4]);
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
});
