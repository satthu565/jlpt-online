import { describe, expect, it } from 'vitest';
import { N1_2024_07_LISTENING_ENTRIES } from './n1-2024-07-listening-content.js';
import { buildListeningExplanation, transcriptNodes } from './improve-n1-2024-07-listening.js';

// Official listening key sheet, website Q67-Q96.
const KEYS = [
  3, 2, 1, 2, 3, 4, 3, 1, 1, 1, 3, 2, 1, 4, 1, 4, 1, 3, 3, 3, 3, 2, 1, 1, 2, 1, 2, 3, 4, 3,
];

describe('N1 7/2024 listening explanations', () => {
  it('covers Q67-Q96 exactly once', () => {
    expect(N1_2024_07_LISTENING_ENTRIES.map((entry) => entry.number)).toEqual(
      Array.from({ length: 30 }, (_, index) => 67 + index),
    );
  });

  it('explains every wrong option of full entries', () => {
    for (const entry of N1_2024_07_LISTENING_ENTRIES) {
      if (!entry.reason) continue;
      const key = KEYS[entry.number - 67]!;
      const optionCount = entry.number >= 83 && entry.number <= 93 ? 3 : 4;
      for (let option = 1; option <= optionCount; option += 1) {
        if (option !== key) expect(entry.wrong?.[option], `Q${entry.number} option ${option}`).toBeTruthy();
      }
    }
  });

  it('builds explanation content that keeps the transcript and adds the translation', () => {
    const entry = N1_2024_07_LISTENING_ENTRIES.find((item) => item.number === 68)!;
    const content = buildListeningExplanation(
      { transcript: [{ t: 'text', text: 'old' }], blocks: [] },
      entry,
      ['a', 'b', 'c', 'd'],
      2,
      3,
    );
    expect(content.translationVi).toBe(entry.translation);
    expect(JSON.stringify(content.transcript)).toContain('やわらかせんべい');
    expect(String(content.explanationMarkdown)).toContain('Script bài nghe');
  });

  it('adds only the translation for entries without a new explanation', () => {
    const entry = N1_2024_07_LISTENING_ENTRIES.find((item) => item.number === 78)!;
    const existing = { blocks: [{ type: 'paragraph', content: [] }], correctReason: [{ t: 'text', text: 'x' }] };
    const content = buildListeningExplanation(existing, entry, ['a', 'b', 'c', 'd'], 2, 3);
    expect(content.correctReason).toEqual(existing.correctReason);
    expect((content.blocks as unknown[]).length).toBe(2);
  });

  it('turns script lines into text and break nodes', () => {
    expect(transcriptNodes(['a', 'b'])).toEqual([{ t: 'text', text: 'a' }, { t: 'br' }, { t: 'text', text: 'b' }]);
  });
});
