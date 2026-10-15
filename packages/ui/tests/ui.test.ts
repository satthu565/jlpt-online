import { describe, it, expect } from 'vitest';
import { RichTextView } from '../src/index.js';

describe('@jlpt/ui smoke test', () => {
  it('RichTextView is defined', () => {
    expect(RichTextView).toBeDefined();
    expect(typeof RichTextView).toBe('function');
  });
});
