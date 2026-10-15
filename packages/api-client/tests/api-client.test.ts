import { describe, it, expect, vi } from 'vitest';
import { ApiClient } from '../src/index.js';

describe('@jlpt/api-client smoke test', () => {
  it('instantiates client and calls health endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const health = await client.getHealth();
    expect(health).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/v1/health');
  });
});
