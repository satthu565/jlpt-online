import { describe, expect, it, vi } from 'vitest';
import { ExamApiClient } from '../features/exam/api/exam-api';

describe('Exam favorites API', () => {
  it('saves, reloads and removes a favorite through the authenticated server endpoints', async () => {
    const examId = '0192f000-0001-7000-8000-000000000001';
    const ids = new Set<string>();
    const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') ids.add(examId);
      if (init?.method === 'DELETE') ids.delete(examId);
      const body = init?.method === 'GET'
        ? { items: [...ids].map(id => ({ examId: id, createdAt: '2026-10-25T00:00:00Z' })) }
        : { examId, favorited: ids.has(examId) };
      return new Response(JSON.stringify(body));
    });
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher, getAuthToken: () => 'test-token' });
    await client.setExamFavorite(examId, true);
    expect((await client.getFavoriteExams()).items.map(item => item.examId)).toEqual([examId]);
    await client.setExamFavorite(examId, false);
    expect((await client.getFavoriteExams()).items).toEqual([]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(['PUT', 'GET', 'DELETE', 'GET']);
    expect(fetcher.mock.calls[0]?.[0]).toBe(`/api/v1/me/favorite-exams/${examId}`);
    expect(fetcher.mock.calls[1]?.[0]).toBe('/api/v1/me/favorite-exams');
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe('{}');
    expect(fetcher.mock.calls[2]?.[1]?.body).toBe('{}');
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.credentials).toBe('include');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    }
  });

  it('propagates a failed save instead of reporting a saved favorite', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'SAVE_FAILED', message: 'Save failed' } }), { status: 500 }));
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    await expect(client.setExamFavorite('exam-id', true)).rejects.toMatchObject({ code: 'SAVE_FAILED', status: 500 });
  });
});
