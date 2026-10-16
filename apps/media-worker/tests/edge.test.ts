import { describe, it, expect, beforeEach } from 'vitest';
import worker, { type Env } from '../src/index.js';
import { signMediaToken } from '@jlpt/media-token';

describe('Media Edge Worker (SYS-11 / A11 Contract)', () => {
  const SECRET = 'test-super-secret-media-key-for-worker-c06';
  const now = Math.floor(Date.now() / 1000);

  // Sample media content (audio bytes simulation: 100 bytes)
  const sampleAudioBytes = new Uint8Array(100);
  for (let i = 0; i < 100; i++) {
    sampleAudioBytes[i] = i;
  }

  const sampleSnapshot = JSON.stringify({
    examId: 'n3-2024-07',
    version: 1,
    title: 'JLPT N3 July 2024 Exam',
    sections: [],
  });

  let inMemoryCacheStore: Map<string, Response>;
  let mockCache: {
    match: (req: Request | string) => Promise<Response | undefined>;
    put: (req: Request | string, res: Response) => Promise<void>;
  };

  let env: Env;

  beforeEach(() => {
    inMemoryCacheStore = new Map();
    mockCache = {
      async match(req: Request | string) {
        const key = typeof req === 'string' ? req : req.url;
        const found = inMemoryCacheStore.get(key);
        return found ? found.clone() : undefined;
      },
      async put(req: Request | string, res: Response) {
        const key = typeof req === 'string' ? req : req.url;
        inMemoryCacheStore.set(key, res.clone());
      },
    };

    env = {
      ENVIRONMENT: 'test',
      MEDIA_TOKEN_SECRET: SECRET,
      NOW_UNIX_SEC: now,
      MEDIA_CACHE: mockCache,
      MEDIA_FIXTURES: {
        'exams/n3-2024-07/v1/snapshot.json': sampleSnapshot,
        'media/audio-sample-01.mp3': sampleAudioBytes,
      },
    };
  });

  describe('Health and System Routes', () => {
    it('GET /healthz returns 200 ok', async () => {
      const res = await worker.fetch(new Request('http://media.example.com/healthz'), env);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { status: string };
      expect(data).toEqual({ status: 'ok' });
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('GET /health returns 200 ok', async () => {
      const res = await worker.fetch(new Request('http://media.example.com/health'), env);
      expect(res.status).toBe(200);
    });

    it('rejects unsupported HTTP methods with 405', async () => {
      const res = await worker.fetch(
        new Request('http://media.example.com/m/audio-sample-01.mp3', { method: 'POST' }),
        env,
      );
      expect(res.status).toBe(405);
    });

    it('returns 404 for unrouted paths', async () => {
      const res = await worker.fetch(new Request('http://media.example.com/unknown/path'), env);
      expect(res.status).toBe(404);
    });
  });

  describe('Signed Media Token Validation (Security Gate)', () => {
    it('rejects access when token parameter is missing with 403 and no-store', async () => {
      const res = await worker.fetch(
        new Request('http://media.example.com/m/audio-sample-01.mp3'),
        env,
      );
      expect(res.status).toBe(403);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('MISSING_TOKEN');
    });

    it('rejects access when token signature is tampered', async () => {
      const validToken = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );
      const tamperedToken = `${validToken.split('.')[0]}.tampered_signature`;

      const res = await worker.fetch(
        new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${tamperedToken}`),
        env,
      );
      expect(res.status).toBe(403);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('rejects expired token', async () => {
      const expiredToken = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now - 100 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${expiredToken}`),
        env,
      );
      expect(res.status).toBe(403);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('rejects snapshot access when examId does not match token', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-other-exam', v: 1, exp: now + 3600 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/exams/n3-2024-07/v1/snapshot.json?t=${token}`),
        env,
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('EXAM_MISMATCH');
    });

    it('rejects snapshot access when version does not match token', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 2, exp: now + 3600 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/exams/n3-2024-07/v1/snapshot.json?t=${token}`),
        env,
      );
      expect(res.status).toBe(403);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('VERSION_MISMATCH');
    });
  });

  describe('Successful Access & Caching Headers', () => {
    it('serves snapshot with private max-age=3600 header', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/exams/n3-2024-07/v1/snapshot.json?t=${token}`),
        env,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
      expect(res.headers.get('Cache-Control')).toBe('private, max-age=3600');
      const text = await res.text();
      expect(JSON.parse(text)).toEqual(JSON.parse(sampleSnapshot));
    });

    it('serves media asset with private max-age=86400 immutable header', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`),
        env,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
      expect(res.headers.get('Cache-Control')).toBe('private, max-age=86400, immutable');
      expect(res.headers.get('Content-Length')).toBe('100');

      const arrayBuf = await res.arrayBuffer();
      expect(new Uint8Array(arrayBuf)).toEqual(sampleAudioBytes);
    });

    it('returns 404 for missing asset in storage with no-store', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const res = await worker.fetch(
        new Request(`http://media.example.com/m/non-existent-file.mp3?t=${token}`),
        env,
      );
      expect(res.status).toBe(404);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });
  });

  describe('Range 206 Partial Content Support', () => {
    it('serves exact byte range 0-15 with 206 Partial Content', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const req = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`, {
        headers: { Range: 'bytes=0-15' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe('bytes 0-15/100');
      expect(res.headers.get('Content-Length')).toBe('16');
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
      expect(res.headers.get('Content-Type')).toBe('audio/mpeg');

      const buf = new Uint8Array(await res.arrayBuffer());
      expect(buf.length).toBe(16);
      expect(buf).toEqual(sampleAudioBytes.slice(0, 16));
    });

    it('serves open-ended range bytes=80- with 206 Partial Content', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const req = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`, {
        headers: { Range: 'bytes=80-' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe('bytes 80-99/100');
      expect(res.headers.get('Content-Length')).toBe('20');

      const buf = new Uint8Array(await res.arrayBuffer());
      expect(buf.length).toBe(20);
      expect(buf).toEqual(sampleAudioBytes.slice(80, 100));
    });

    it('serves suffix range bytes=-25 with 206 Partial Content', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const req = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`, {
        headers: { Range: 'bytes=-25' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe('bytes 75-99/100');
      expect(res.headers.get('Content-Length')).toBe('25');

      const buf = new Uint8Array(await res.arrayBuffer());
      expect(buf.length).toBe(25);
      expect(buf).toEqual(sampleAudioBytes.slice(75, 100));
    });

    it('returns 416 Range Not Satisfiable when range is beyond content size', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const req = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`, {
        headers: { Range: 'bytes=200-300' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(416);
      expect(res.headers.get('Content-Range')).toBe('bytes */100');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('supports HEAD method with Range 206 headers without body', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const req = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token}`, {
        method: 'HEAD',
        headers: { Range: 'bytes=0-9' },
      });

      const res = await worker.fetch(req, env);
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe('bytes 0-9/100');
      expect(res.headers.get('Content-Length')).toBe('10');
      const text = await res.text();
      expect(text).toBe('');
    });
  });

  describe('Signed Check BEFORE Cache Invariant (Zero-Leak Security)', () => {
    it('populates cache on valid request, reuses on subsequent valid request, and NEVER leaks to unauthenticated caller', async () => {
      const token1 = await signMediaToken(
        { a: 'att-user-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );
      const token2 = await signMediaToken(
        { a: 'att-user-2', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      // Step 1: User 1 requests asset with valid token
      const req1 = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token1}`);
      const res1 = await worker.fetch(req1, env);
      expect(res1.status).toBe(200);
      expect(res1.headers.get('CF-Cache-Status')).toBe('MISS');

      // Verify asset is now stored in edge cache under clean URL without token
      const cleanUrl = 'http://media.example.com/m/audio-sample-01.mp3';
      const cached = await mockCache.match(cleanUrl);
      expect(cached).toBeDefined();

      // Step 2: User 2 requests same asset with their own valid token -> CACHE HIT!
      const req2 = new Request(`http://media.example.com/m/audio-sample-01.mp3?t=${token2}`);
      const res2 = await worker.fetch(req2, env);
      expect(res2.status).toBe(200);
      expect(res2.headers.get('CF-Cache-Status')).toBe('HIT');

      // Step 3: Unauthenticated attacker attempts to request the same asset with NO token -> 403 FORBIDDEN!
      const reqAttackNoToken = new Request('http://media.example.com/m/audio-sample-01.mp3');
      const resAttackNoToken = await worker.fetch(reqAttackNoToken, env);
      expect(resAttackNoToken.status).toBe(403);
      expect(resAttackNoToken.headers.get('Cache-Control')).toBe('no-store');

      // Step 4: Attacker with expired token -> 403 FORBIDDEN!
      const expiredToken = await signMediaToken(
        { a: 'att-user-expired', e: 'n3-2024-07', v: 1, exp: now - 300 },
        SECRET,
      );
      const reqAttackExpired = new Request(
        `http://media.example.com/m/audio-sample-01.mp3?t=${expiredToken}`,
      );
      const resAttackExpired = await worker.fetch(reqAttackExpired, env);
      expect(resAttackExpired.status).toBe(403);
      expect(resAttackExpired.headers.get('Cache-Control')).toBe('no-store');
    });
  });

  describe('Cloudflare R2 Bucket Integration', () => {
    it('fetches from R2Bucket binding when present', async () => {
      const token = await signMediaToken(
        { a: 'att-1', e: 'n3-2024-07', v: 1, exp: now + 3600 },
        SECRET,
      );

      const r2Data = new Uint8Array([10, 20, 30, 40, 50]);
      const mockR2Bucket: Partial<R2Bucket> = {
        async get(key: string) {
          if (key === 'media/r2-file.mp3') {
            return {
              key,
              size: r2Data.byteLength,
              httpEtag: '"mock-etag-r2"',
              async arrayBuffer() {
                return r2Data.buffer;
              },
            } as unknown as R2ObjectBody;
          }
          return null;
        },
      };

      const r2Env: Env = {
        ...env,
        MEDIA_BUCKET: mockR2Bucket as R2Bucket,
      };

      const res = await worker.fetch(
        new Request(`http://media.example.com/m/r2-file.mp3?t=${token}`),
        r2Env,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('ETag')).toBe('"mock-etag-r2"');
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(bytes).toEqual(r2Data);
    });
  });
});
