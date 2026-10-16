import { describe, it, expect, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/index.js';

describe('@jlpt/api-client tests', () => {
  it('instantiates client and calls health endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const health = await client.getHealth<{ status: string }>();
    expect(health).toEqual({ status: 'ok' });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/v1/health');
  });

  it('calls createAttempt with body and headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        attemptId: '0192f0c0-0000-7000-8000-000000000001',
        lease: '0192f0c0-0000-7000-8000-000000000002',
        status: 'in_progress',
      }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      fetchFn: mockFetch as unknown as typeof fetch,
      authToken: 'test-token',
    });

    const res = await client.createAttempt({
      examId: '0192f0c0-0000-7000-8000-000000000000',
      mode: 'real',
    });

    expect(res).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/attempts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('appends query parameters in listExams', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], nextCursor: null }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await client.listExams({ level: 'N1', limit: 10 });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:4000/api/v1/exams?level=N1&limit=10');
  });

  it('throws ApiError with standard envelope properties on 4xx/5xx', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: 'LEASE_INVALID',
          message: 'Bài thi đang được mở ở tab khác.',
          details: { openLeaseId: '123' },
          requestId: 'req_01J',
        },
      }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:4000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getAttempt('0192f0c0-0000-7000-8000-000000000001')).rejects.toThrow(
      ApiError,
    );

    try {
      await client.getAttempt('0192f0c0-0000-7000-8000-000000000001');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('LEASE_INVALID');
      expect(apiErr.status).toBe(409);
      expect(apiErr.message).toBe('Bài thi đang được mở ở tab khác.');
      expect(apiErr.details).toEqual({ openLeaseId: '123' });
      expect(apiErr.requestId).toBe('req_01J');
    }
  });
});
