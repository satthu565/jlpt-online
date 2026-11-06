import { describe, expect, it } from 'vitest';
import {
  buildExplanation,
  CORRECTION_ID,
  fixId,
  getFixState,
  getStarSlot,
  moveStar,
  N1_GRAMMAR_FIXES,
} from './fix-n1-grammar-star-keys.js';

const blank = { t: 'blank' };
const star = { t: 'star' };

describe('N1 grammar star/key correction manifest', () => {
  it('has unique targets with valid option numbers', () => {
    const ids = N1_GRAMMAR_FIXES.map(fixId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const fix of N1_GRAMMAR_FIXES) {
      expect(fix.oldKey).toBeGreaterThanOrEqual(1);
      expect(fix.oldKey).toBeLessThanOrEqual(4);
      expect(fix.newKey).toBeGreaterThanOrEqual(1);
      expect(fix.newKey).toBeLessThanOrEqual(4);
      if (fix.starSlot !== undefined) {
        expect(fix.starSlot).toBeGreaterThanOrEqual(1);
        expect(fix.starSlot).toBeLessThanOrEqual(4);
      }
    }
  });

  it('gives a reason for every wrong option', () => {
    for (const fix of N1_GRAMMAR_FIXES) {
      const wrong = [1, 2, 3, 4].filter((n) => n !== fix.newKey);
      expect(Object.keys(fix.wrongReasons).map(Number).sort()).toEqual(wrong);
    }
  });
});

describe('star slot helpers', () => {
  it('reads and moves the star while keeping surrounding text', () => {
    const stem = [{ t: 'text', text: 'あ' }, blank, star, blank, blank, { t: 'text', text: 'い' }];
    expect(getStarSlot(stem)).toBe(2);
    expect(moveStar(stem, 3)).toEqual([
      { t: 'text', text: 'あ' },
      blank,
      blank,
      star,
      blank,
      { t: 'text', text: 'い' },
    ]);
    expect(getStarSlot(moveStar(stem, 3))).toBe(3);
  });

  it('keeps separator text between slots', () => {
    const sep = { t: 'text', text: '　' };
    const stem = [blank, sep, blank, sep, star, sep, blank];
    expect(moveStar(stem, 2)).toEqual([blank, sep, star, sep, blank, sep, blank]);
  });

  it('rejects stems without four slots', () => {
    expect(getStarSlot([blank])).toBeNull();
    expect(() => moveStar([blank, star], 1)).toThrow();
  });
});

describe('explanation rebuild', () => {
  const fix = N1_GRAMMAR_FIXES[0]!;
  const options = new Map<number, string>([
    [1, 'どこかに'],
    [2, '悪人で'],
    [3, 'あろうと'],
    [4, 'どんな'],
  ]);

  it('rewrites the correct answer and wrong-option reasons', () => {
    const rebuilt = buildExplanation({ translationVi: 'Dịch cũ', contentVersion: 1 }, fix, options, 2);
    expect(rebuilt.contentVersion).toBe(2);
    expect(rebuilt.humanReviewed).toBe(true);
    expect(rebuilt.correctionId).toBe(CORRECTION_ID);
    expect(JSON.stringify(rebuilt.correctReason)).toContain('[3] あろうと');
    expect(rebuilt.wrongReasonsByOption).not.toHaveProperty('3');
    expect(rebuilt.wrongReasonsByOption).toHaveProperty('2');
    expect(String(rebuilt.explanationMarkdown)).toContain('Dịch cũ'.slice(0, 0));
    expect(JSON.stringify(rebuilt.blocks)).toContain('Dịch cũ');
  });

  it('reports pending until key, publication, star and note all match', () => {
    const starFix = N1_GRAMMAR_FIXES.find((x) => x.starSlot !== undefined)!;
    expect(getFixState(starFix, starFix.oldKey, starFix.oldKey, 2, undefined)).toBe('pending');
    expect(getFixState(starFix, starFix.newKey, starFix.newKey, 2, CORRECTION_ID)).toBe('pending');
    expect(getFixState(starFix, starFix.newKey, starFix.newKey, starFix.starSlot!, CORRECTION_ID)).toBe(
      'applied',
    );
  });
});
