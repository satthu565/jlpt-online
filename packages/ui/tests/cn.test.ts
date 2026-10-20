import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

// A hand-written merger once dropped one of these pairs (font size vs colour, border width vs colour),
// which removed borders and font sizes across the app.
describe('cn', () => {
  it('keeps classes from different groups that share a prefix', () => {
    expect(cn('text-sm text-[var(--muted)]')).toBe('text-sm text-[var(--muted)]');
    expect(cn('border border-[var(--separator)]')).toBe('border border-[var(--separator)]');
    expect(cn('font-semibold font-mono')).toBe('font-semibold font-mono');
  });

  it('lets the later class win inside one group', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
