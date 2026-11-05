import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonical, patchState } from './repair-n3-content.js';

const plan = JSON.parse(readFileSync(new URL('./n3-content-repair-plan.json', import.meta.url), 'utf8'));
describe('reviewed N3 repair manifest', () => {
  it('rejects stale content rather than overwriting an unrelated edit', () => {
    expect(() => patchState({ text: 'concurrent edit' }, { before: { text: 'old' }, after: { text: 'new' } })).toThrow();
    expect(patchState({ text: 'new', contentVersion: 4 }, { before: { text: 'old' }, after: { contentVersion: 1, text: 'new' } })).toBe('applied');
  });
  it('every patch has distinct old/new content and remains rerunnable', () => {
    expect(plan.patches).toHaveLength(91);
    for (const p of plan.patches) {
      expect(canonical(p.before)).not.toBe(canonical(p.after));
      expect(patchState(p.before, p)).toBe('pending');
      expect(patchState(p.after, p)).toBe('applied');
      expect(p.field).not.toBe('correct_option');
    }
  });
  it('preserves hiragana in the kanji question and removes split-node duplication', () => {
    const p = plan.patches.find((p: { slug: string; num: number; field: string }) => p.slug === 'n3-2014-07' && p.num === 9 && p.field === 'stem');
    expect(p.after[1].children[0].text).toBe('\u3051\u3057\u3066');
    expect(p.after[2].text).toBe('\u304d\u308c\u3044\u306b\u3057\u305f\u3002');
  });
  it('preserves question structure and option ordering', () => {
    for (const p of plan.patches) {
      if (p.field === 'options') expect(p.after.map((o: { order_index: number }) => o.order_index)).toEqual(p.before.map((o: { order_index: number }) => o.order_index));
      if (p.field === 'stem') {
        for (const t of ['blank', 'star']) expect(p.after.filter((s: { t: string }) => s.t === t)).toHaveLength(p.before.filter((s: { t: string }) => s.t === t).length);
      }
    }
  });
  it('rebuilds the three quick responses from source in the correct sequence', () => {
    const expected = [[93, 2, '\u3044\u308d\u3044\u308d'], [94, 3, '\u4eca\u5ea6'], [95, 1, '\u4f50\u85e4']] as const;
    for (const [num, answer, text] of expected) {
      const p = plan.patches.find((p: { slug: string; num: number; field: string }) => p.slug === 'n3-2021-07' && p.num === num && p.field === 'explanation_vi');
      expect(p.answerBefore).toBe(answer);
      expect(JSON.stringify(p.after.transcript)).toContain(text);
      expect(p.after.correctReason[0].text).toContain(`[${answer}]`);
      expect(Object.keys(p.after.wrongReasonsByOption)).not.toContain(String(answer));
    }
  });
  it('uses a single complete replacement image and keeps restaurant answer 1', () => {
    expect(plan.images).toHaveLength(18);
    for (const image of plan.images) {
      const p = plan.patches.find((p: { slug: string; num: number; field: string }) => p.slug === image.slug && p.num === image.num && p.field === 'passage');
      expect(p.after).toHaveLength(1);
      expect(p.after[0].mediaKey).toBe(`media/${image.sha256}.png`);
      expect(p.after[0].width).toBe(image.width);
      expect(image.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const p = plan.patches.find((p: { slug: string; num: number; field: string }) => p.slug === 'n3-2012-12' && p.num === 79 && p.field === 'explanation_vi');
    expect(p.after.correctReason[0].text).toContain('[1]');
    expect(JSON.stringify(p.after)).not.toContain('\u5bb6\u5177');
  });
});
