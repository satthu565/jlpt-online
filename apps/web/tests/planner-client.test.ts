import { describe, expect, it, vi } from 'vitest';
import { PlannerClient } from '../features/planner/services/planner-client';

describe('PlannerClient requests', () => {
  it('does not send JSON Content-Type on DELETE without a body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ archived: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new PlannerClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch });

    const result = await client.archiveStudyPlan('plan-123');

    expect(result).toEqual({ archived: true });
    const [, options] = fetchFn.mock.calls[0]!;
    const headers = new Headers(options.headers);
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('falls back to POST /archive when DELETE fails', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ archived: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const client = new PlannerClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch });

    const result = await client.archiveStudyPlan('plan-123');

    expect(result).toEqual({ archived: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const [, firstOptions] = fetchFn.mock.calls[0]!;
    const [, secondOptions] = fetchFn.mock.calls[1]!;
    expect(firstOptions.method).toBe('DELETE');
    expect(secondOptions.method).toBe('POST');
  });

  it('keeps JSON Content-Type for POST requests with a body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'plan-123' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new PlannerClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch });

    await client.createStudyPlan({
      targetLevel: 'N3',
      targetDate: '2026-12-06',
    });

    const [, options] = fetchFn.mock.calls[0]!;
    const headers = new Headers(options.headers);
    expect(options.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
