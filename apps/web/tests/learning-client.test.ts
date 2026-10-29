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
