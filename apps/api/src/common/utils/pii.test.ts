import { describe, it, expect } from 'vitest';
import { maskPii } from './pii.js';

describe('maskPii với dữ liệu nhị phân', () => {
  it('trả nguyên Buffer, không duyệt từng byte', () => {
    const buf = Buffer.alloc(8 * 1024 * 1024, 1);
    const started = performance.now();
    const out = maskPii(buf);
    expect(out).toBe(buf);
    expect(performance.now() - started).toBeLessThan(50);
  });

  it('trả nguyên Uint8Array và ArrayBuffer', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(maskPii(bytes)).toBe(bytes);
    expect(maskPii(bytes.buffer)).toBe(bytes.buffer);
  });

  it('vẫn che trường nhạy cảm khi object chứa Buffer', () => {
    const file = Buffer.from('PK');
    const out = maskPii({ password: 'x', file, email: 'john.doe@example.com' });
    expect(out.password).toBe('[REDACTED]');
    expect(out.file).toBe(file);
    expect(out.email).toBe('j***@example.com');
  });
});
