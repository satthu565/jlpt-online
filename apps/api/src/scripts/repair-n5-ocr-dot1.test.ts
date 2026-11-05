import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonical, parsePlan, patchState } from './repair-n5-ocr-dot1.js';

const raw = readFileSync(new URL('./n5-ocr-dot1-plan.json', import.meta.url), 'utf8');
const plan = parsePlan(raw);
describe('N5 OCR source corrections', () => {
  it('rejects modified manifests and stale target content', () => {
    expect(() => parsePlan(raw + ' ')).toThrow('integrity');
    expect(parsePlan(raw.replace(/\r?\n/g, '\r\n'))).toEqual(plan);
    expect(() => patchState({ text: 'another edit' }, { before: 'old', after: 'new' })).toThrow();
    for (const p of plan.patches) {
      expect(canonical(p.before)).not.toBe(canonical(p.after));
      expect(patchState(p.before, p)).toBe('pending');
      expect(patchState(p.after, p)).toBe('applied');
    }
  });
  it('preserves question identities, option ordering, blank and star positions', () => {
    for (const p of plan.patches) {
      expect(p.questionId).toMatch(/^[a-f0-9-]{36}$/);
      if (p.field === 'options') {
        const values = p.after as { order_index: number }[];
        expect(values.map((v) => v.order_index)).toEqual((p.before as { order_index: number }[]).map((v) => v.order_index));
      }
      if (p.field === 'stem') for (const type of ['blank', 'star']) {
        const count = (v: unknown) => (v as { t: string }[]).filter((s) => s.t === type).length;
        expect(count(p.after)).toBe(count(p.before));
      }
    }
  });
  it('limits the key correction to the independently sourced 2012 grammar key', () => {
    const keys = plan.patches.filter((p) => p.field === 'correct_option');
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ slug: 'n5-2012-12', num: 41, before: 1, after: 2 });
    expect(plan.patches.some((p) => p.slug === 'n5-2010-2011' && p.num === 27)).toBe(false);
  });
  it('restores all three 2025 reading passages and their dependent explanations', () => {
    for (const num of [39, 40, 41, 42, 43]) {
      for (const field of ['stem', 'explanation', 'explanation_vi']) expect(plan.patches.some((p) => p.slug === 'n5-2025-07' && p.num === num && p.field === field)).toBe(true);
    }
    const letter = plan.patches.find((p) => p.slug === 'n5-2025-07' && p.num === 41 && p.field === 'passage');
    expect(JSON.stringify(letter?.after)).toContain('マルタ');
    expect(JSON.stringify(letter?.after)).not.toContain('カルロス');
  });
  it('uses the complete four-panel image rendered from the source', () => {
    const image = plan.images[0]!;
    const p = plan.patches.find((p) => p.slug === image.slug && p.num === image.num && p.field === 'passage');
    expect(JSON.stringify(p?.after)).toContain('media/' + image.sha256 + '.png');
    expect(image.page).toBe(18);
    expect(image.width).toBe(1049);
    expect(image.height).toBe(852);
  });
});
