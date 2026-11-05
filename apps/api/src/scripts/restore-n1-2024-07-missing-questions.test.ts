import { describe, expect, it } from 'vitest';
import { N1_2024_07_MISSING_GROUPS } from './n1-2024-07-missing-content.js';
import { restoredQuestionNumbers, shiftedOrderIndex } from './restore-n1-2024-07-missing-questions.js';

// Official key sheet: 25=4; 41-44=3,2,4,1; 57-59=4,4,1; 60-61=4,4; 62-64=3,3,1; 65-66=1,2.
const OFFICIAL_KEYS: Record<number, number> = {
  25: 4,
  41: 3,
  42: 2,
  43: 4,
  44: 1,
  57: 4,
  58: 4,
  59: 1,
  60: 4,
  61: 4,
  62: 3,
  63: 3,
  64: 1,
  65: 1,
  66: 2,
};

function collectBlankLabels(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectBlankLabels);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const own = record.t === 'blank' && typeof record.label === 'string' ? [record.label] : [];
  return own.concat(Object.values(record).flatMap(collectBlankLabels));
}

describe('N1 7/2024 missing question manifest', () => {
  it('restores exactly the 15 missing source questions in order', () => {
    expect(restoredQuestionNumbers()).toEqual(Object.keys(OFFICIAL_KEYS).map(Number));
  });

  it('uses the official key and gives four options and wrong-option notes', () => {
    for (const group of N1_2024_07_MISSING_GROUPS) {
      for (const question of group.questions) {
        expect(question.correctOption).toBe(OFFICIAL_KEYS[question.number]);
        expect(question.options).toHaveLength(4);
        for (const option of [1, 2, 3, 4].filter((value) => value !== question.correctOption)) {
          expect(question.wrong[option]).toBeTruthy();
        }
      }
    }
  });

  it('keeps passage blanks 41-44 exactly once and in order', () => {
    const group = N1_2024_07_MISSING_GROUPS.find((item) => item.mondaiType === 'text_grammar')!;
    expect(collectBlankLabels(group.passage)).toEqual(['41', '42', '43', '44']);
  });

  it('shifts existing items so every source number lands on its own index', () => {
    expect(shiftedOrderIndex(23)).toBe(23); // Q24
    expect(shiftedOrderIndex(24)).toBe(25); // old Q25 -> source Q26
    expect(shiftedOrderIndex(38)).toBe(39); // old Q39 -> source Q40
    expect(shiftedOrderIndex(39)).toBe(44); // old Q40 -> source Q45
    expect(shiftedOrderIndex(50)).toBe(55); // old Q51 -> source Q56
    expect(shiftedOrderIndex(51)).toBe(66); // first listening item -> Q67
    expect(shiftedOrderIndex(80)).toBe(95); // last listening item -> Q96
  });
});
