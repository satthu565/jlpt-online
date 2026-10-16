import { describe, it, expect } from 'vitest';
import {
  signMediaToken,
  verifyMediaToken,
  generateAttemptTokenExp,
  generateReviewTokenExp,
  validateMediaAccess,
  buildMediaSnapshotUrl,
  buildMediaAssetUrl,
} from '../src/index.js';

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

  it('handles invalid token formats and bad signatures gracefully', async () => {
    expect(await verifyMediaToken('invalid-token-no-dots', secret)).toBeNull();
    expect(await verifyMediaToken('part1.part2.part3', secret)).toBeNull();
    expect(await verifyMediaToken('.part2', secret)).toBeNull();
    expect(await verifyMediaToken('part1.', secret)).toBeNull();

    // Invalid base64 or non-JSON payload
    const badPayloadToken = `not_json_b64.fake_sig`;
    expect(await verifyMediaToken(badPayloadToken, secret)).toBeNull();
  });

  it('generates token expiration times according to A11 specs', () => {
    const now = 1700000000;
    // Attempt: totalDurationSec + 30 min (1800s)
    const attemptExp = generateAttemptTokenExp(3600, now);
    expect(attemptExp).toBe(now + 3600 + 1800);

    // Default now argument
    const defaultExp = generateAttemptTokenExp(3600);
    expect(defaultExp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Review: 2 hours (7200s)
    const reviewExp = generateReviewTokenExp(now);
    expect(reviewExp).toBe(now + 7200);

    const defaultReviewExp = generateReviewTokenExp();
    expect(defaultReviewExp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  describe('validateMediaAccess', () => {
    const examId = '0192f0c0-0000-7000-8000-000000000001';
    const version = 1;

    it('validates snapshot path when examId and version match', async () => {
      const token = await signMediaToken(
        { e: examId, v: version, k: 'attempt', exp: Math.floor(Date.now() / 1000) + 3600 },
        secret,
      );

      const res = await validateMediaAccess(
        token,
        secret,
        `exams/${examId}/v${version}/snapshot.json`,
      );
      expect(res.valid).toBe(true);
      expect(res.payload?.e).toBe(examId);
    });

    it('rejects snapshot path if examId or version does not match', async () => {
      const token = await signMediaToken(
        { e: examId, v: version, k: 'attempt', exp: Math.floor(Date.now() / 1000) + 3600 },
        secret,
      );

      const wrongExam = await validateMediaAccess(
        token,
        secret,
        `exams/other-exam/v${version}/snapshot.json`,
      );
      expect(wrongExam.valid).toBe(false);
      expect(wrongExam.reason).toBe('EXAM_MISMATCH');

      const wrongVersion = await validateMediaAccess(
        token,
        secret,
        `exams/${examId}/v2/snapshot.json`,
      );
      expect(wrongVersion.valid).toBe(false);
      expect(wrongVersion.reason).toBe('VERSION_MISMATCH');
    });

    it('validates media asset when present in manifest', async () => {
      const token = await signMediaToken(
        { e: examId, v: version, k: 'attempt', exp: Math.floor(Date.now() / 1000) + 3600 },
        secret,
      );

      const manifestMedia = ['media/abc123.mp3', 'media/xyz789.webp'];

      const res1 = await validateMediaAccess(token, secret, 'media/abc123.mp3', { manifestMedia });
      expect(res1.valid).toBe(true);

      const res2 = await validateMediaAccess(token, secret, 'm/abc123.mp3', { manifestMedia });
      expect(res2.valid).toBe(true);

      const res3 = await validateMediaAccess(token, secret, 'm/not-found.mp3', { manifestMedia });
      expect(res3.valid).toBe(false);
      expect(res3.reason).toBe('MEDIA_NOT_IN_MANIFEST');
    });

    it('rejects access if token is invalid or expired', async () => {
      const res = await validateMediaAccess('bad.token', secret, 'm/any.mp3');
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('TOKEN_INVALID_OR_EXPIRED');
    });

    it('allows generic resource path if token is valid', async () => {
      const token = await signMediaToken(
        { k: 'review', exp: Math.floor(Date.now() / 1000) + 3600 },
        secret,
      );
      const res = await validateMediaAccess(token, secret, 'other/path/resource.txt');
      expect(res.valid).toBe(true);
    });
  });

  describe('URL builders', () => {
    it('builds media snapshot and asset URLs with token', () => {
      const snapUrl = buildMediaSnapshotUrl(
        'https://media.example.com',
        'exam-123',
        2,
        'my-token.123',
      );
      expect(snapUrl).toBe('https://media.example.com/exams/exam-123/v2/snapshot.json?t=my-token.123');

      const assetUrl1 = buildMediaAssetUrl('https://media.example.com/', 'audio.mp3', 'tok');
      expect(assetUrl1).toBe('https://media.example.com/m/audio.mp3?t=tok');

      const assetUrl2 = buildMediaAssetUrl('https://media.example.com', 'media/image.png', 'tok');
      expect(assetUrl2).toBe('https://media.example.com/media/image.png?t=tok');
    });
  });
});

