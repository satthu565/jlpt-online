import { describe, it, expect } from 'vitest';
import { signMediaToken, verifyMediaToken } from '../src/index.js';

describe('@jlpt/media-token smoke test', () => {
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
