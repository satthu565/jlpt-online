import { describe, expect, it, vi } from 'vitest';
import { LearningClient } from '../features/learning/services/learning-client';

describe('LearningClient notebook requests', () => {
  it('does not send JSON content-type on DELETE without a body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch });

    await client.deleteNotebookItem('01a17370-ac04-7f6e-85b2-eba679f70019');

    const [, options] = fetchFn.mock.calls[0]!;
    const headers = new Headers(options.headers);
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('keeps JSON content-type for POST requests with a body', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'item-id' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as unknown as typeof fetch });

    await client.createNotebookItem({ kind: 'vocab', term: '学生', meaning: 'Học sinh' });

    const [, options] = fetchFn.mock.calls[0]!;
    const headers = new Headers(options.headers);
    expect(options.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});

describe('LearningClient SRS enrollment', () => {
  it('pages through the notebook and skips mastered items', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `item-${index}`, mastered: index !== 0,
    }));
    const fetchFn = vi.fn(async (url: string, _options?: RequestInit) => {
      const data = (url.includes('/notebook-items?') && !url.includes('offset=100')) ? { items: firstPage }
        : url.includes('offset=100') ? { items: [{ id: 'last/item', mastered: false }] }
        : { id: 'card' };
      return new Response(JSON.stringify(data), { status: 200 });
    });
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as typeof fetch });
    await client.prepareNotebookCards();

    const posts = fetchFn.mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(posts.map(([url]) => url)).toEqual([
      '/api/v1/me/notebook-items/item-0/cards',
      '/api/v1/me/notebook-items/last%2Fitem/cards',
    ]);
    expect(JSON.parse(posts[0]![1]!.body as string)).toEqual({ template: 'term_to_meaning' });
    expect(fetchFn.mock.calls.some(([url]) => url.includes('offset=100'))).toBe(true);
  });

  it('surfaces card creation errors so the user can retry', async () => {
    const fetchFn = vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('/cards') ? { message: 'Card creation failed' } : { items: [{ id: 'one', mastered: false }] },
    ), { status: url.includes('/cards') ? 503 : 200 }));
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as typeof fetch });
    await expect(client.prepareNotebookCards()).rejects.toThrow('Card creation failed');
  });

  it('does not create cards for an empty notebook', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] })));
    const client = new LearningClient({ baseUrl: '/api/v1', fetchFn: fetchFn as typeof fetch });
    await client.prepareNotebookCards();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
