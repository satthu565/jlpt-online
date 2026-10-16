import { describe, it, expect } from 'vitest';
import { signMediaToken, verifyMediaToken } from '../src/index.js';

describe('@jlpt/media-token tests', () => {
  const secret = 'super-secret-key-32-bytes-minimum-length-for-hmac!';

  it('signs and verifies a valid token', async () => {
    const payload = {
      mediaKey: 'n5/audio/q01.mp3',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = await signMediaToken(payload, secret);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verified = await verifyMediaToken(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.mediaKey).toBe(payload.mediaKey);
  });

  it('signs and verifies A11 contract format { a, e, v, k, exp }', async () => {
    const payload = {
      a: '0192f0c0-0000-7000-8000-000000000001',
      e: '0192f0c0-0000-7000-8000-000000000002',
      v: 1,
      k: 'attempt' as const,
      exp: Math.floor(Date.now() / 1000) + 7200,
    };

    const token = await signMediaToken(payload, secret);
    const verified = await verifyMediaToken(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.a).toBe(payload.a);
    expect(verified?.e).toBe(payload.e);
    expect(verified?.v).toBe(payload.v);
    expect(verified?.k).toBe(payload.k);
  });

  it('rejects an expired token', async () => {
    const payload = {
      mediaKey: 'n5/audio/q02.mp3',
      exp: Math.floor(Date.now() / 1000) - 100, // expired
    };

    const token = await signMediaToken(payload, secret);
    const verified = await verifyMediaToken(token, secret);
    expect(verified).toBeNull();
  });

  it('rejects tampered token', async () => {
    const payload = {
      mediaKey: 'n5/audio/q03.mp3',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = await signMediaToken(payload, secret);
    const tampered = token + 'tampered';
    const verified = await verifyMediaToken(tampered, secret);
    expect(verified).toBeNull();
  });
});
