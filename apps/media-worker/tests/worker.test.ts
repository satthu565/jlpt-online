import { describe, it, expect } from 'vitest';
import worker from '../src/index.js';

describe('@jlpt/media-worker smoke test', () => {
  it('GET /healthz returns 200 and status ok', async () => {
    const req = new Request('http://localhost/healthz');
    const res = await worker.fetch(req, {}, {} as ExecutionContext);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body).toEqual({ status: 'ok' });
  });

  it('unknown route returns 404', async () => {
    const req = new Request('http://localhost/unknown');
    const res = await worker.fetch(req, {}, {} as ExecutionContext);

    expect(res.status).toBe(404);
  });
});
