import { describe, it, expect } from 'vitest';
import { GET } from '../app/healthz/route.js';

describe('@jlpt/web health smoke test', () => {
  it('GET /healthz returns 200 and status ok', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body).toEqual({ status: 'ok' });
  });
});
