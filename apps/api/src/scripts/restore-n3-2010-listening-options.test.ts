import { describe, expect, it } from 'vitest';
import {
  Q79_IMAGE_KEY,
  Q79_IMAGE_SHA256,
  RESTORATIONS,
  SOURCE_FILES,
  getOptionState,
} from './restore-n3-2010-listening-options.js';

describe('N3 12/2010 listening option restoration', () => {
  it('covers Q75-86 exactly and preserves verified answer keys', () => {
    expect(RESTORATIONS.map((item) => item.question)).toEqual([
      75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
    ]);
    expect(RESTORATIONS.map((item) => item.answer)).toEqual([2, 2, 1, 3, 2, 4, 4, 2, 1, 4, 3, 1]);
  });

  it('pins every owner-supplied source and the Q79 image identity', () => {
    expect(Object.keys(SOURCE_FILES)).toHaveLength(13);
    expect(Object.values(SOURCE_FILES).every((value) => value.length === 64)).toBe(true);
    expect(Q79_IMAGE_KEY).toBe(`media/${Q79_IMAGE_SHA256}.png`);
  });

  it('recognizes pending, applied, and invalid option states', () => {
    const expected = RESTORATIONS[0].options;
    expect(getOptionState(['選択肢1', '選択肢2', '選択肢3', '選択肢4'], expected)).toBe('pending');
    expect(getOptionState([...expected], expected)).toBe('applied');
    expect(getOptionState(['x', 'y', 'z', 'w'], expected)).toBe('invalid');
  });

  it('uses numeric labels for the picture-based Q79 choices', () => {
    expect(RESTORATIONS.find((item) => item.question === 79)?.options).toEqual(['1', '2', '3', '4']);
  });
});
