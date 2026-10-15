import { describe, it, expect } from 'vitest';
import { normalizeJapaneseText, validatePackageManifest } from '../src/index.js';

describe('@jlpt/content-tools smoke test', () => {
  it('normalizes Japanese strings in NFC', () => {
    const text = 'がっこう';
    expect(normalizeJapaneseText(text)).toBe('がっこう');
  });

  it('validates package manifest', () => {
    const valid = validatePackageManifest({ title: 'N5 Mock Exam 2026', level: 'N5' });
    expect(valid.valid).toBe(true);

    const invalid = validatePackageManifest({ level: 'N6' });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });
});
