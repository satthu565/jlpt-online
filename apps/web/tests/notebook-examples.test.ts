import { describe, expect, it, vi } from 'vitest';
import { LearningClient, LearningClientError } from '../features/learning/services/learning-client';
import { loadMoreNotebookExamples } from '../features/learning/services/notebook-examples';
import type { NotebookItem } from '../features/learning/types';

const item: NotebookItem = {
  id: 'saved', userId: 'user', term: '早い', meaning: 'early', kind: 'vocab', mastered: false,
  tags: ['source_qid:source'], version: 1, createdAt: '', updatedAt: '',
};

describe('additional notebook examples', () => {
  it('uses authentication and preserves nested API errors without falling back', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: {
      code: 'FORBIDDEN', message: 'Access denied.',
    } }), { status: 403 }));
    const client = new LearningClient({ baseUrl: 'https://example.test/api/v1', fetchFn, authToken: 'test-token' });
    await expect(loadMoreNotebookExamples(item, client)).rejects.toMatchObject({
      status: 403, code: 'FORBIDDEN', message: 'Access denied.',
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('早い')), expect.objectContaining({
      credentials: 'include', headers: { Authorization: 'Bearer test-token' },
    }));
  });

  it('retains complete rich text options, excluding the saved question and duplicate matches', async () => {
    const question = {
      id: 'other', level: 'N4', skill: 'vocabulary', stem: [{ t: 'text', text: '朝が早い。' }],
      options: [{ content: [{ t: 'text', text: 'とても' }, { t: 'underline', children: [{ t: 'text', text: '早い' }] }] }],
    };
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([
      { ...question, id: 'source' }, question, question,
    ])));
    const result = await loadMoreNotebookExamples(item, new LearningClient({ fetchFn }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ questionId: 'other', stem: '朝が早い。', options: [{ orderIndex: 1, text: 'とても早い' }] });
  });

  it('returns empty only after successful searches and filters saved-source fallbacks', async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('[]'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ examples: [{ questionId: 'source', isSavedSource: true }] })));
    expect(await loadMoreNotebookExamples(item, new LearningClient({ fetchFn }))).toEqual([]);
  });

  it('propagates network failures and legacy error bodies', async () => {
    const networkFetch = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(loadMoreNotebookExamples(item, new LearningClient({ fetchFn: networkFetch }))).rejects.toThrow('Failed to fetch');
    const client = new LearningClient({ fetchFn: async () => new Response(JSON.stringify({ message: 'Slow down', code: 'RATE_LIMITED' }), { status: 429 }) });
    await expect(client.getWordQuestionExamples('早い')).rejects.toBeInstanceOf(LearningClientError);
    await expect(client.getWordQuestionExamples('早い')).rejects.toMatchObject({ status: 429, message: 'Slow down' });
  });
});
