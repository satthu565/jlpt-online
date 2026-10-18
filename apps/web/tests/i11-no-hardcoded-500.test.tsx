import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Providers } from '../app/providers';

import VocabCorpusPage from '../app/(corpus)/tu-vung/page';
import GrammarCorpusPage from '../app/(corpus)/ngu-phap/page';
import VocabFrequencyStatsPage from '../app/(corpus)/thong-ke-tu-vung/page';
import DiscussionsPage from '../app/(community)/thao-luan/page';
import { CorpusClient } from '../features/corpus/services/corpus-client';
import { CommunityClient } from '../features/community/services/community-client';

const h = React.createElement;

describe('I11: No Hardcoded 500 Errors in Vocab, Grammar, and Discussion Pages', () => {
  it('renders /tu-vung without hardcoded jlpt-official or sample cards leaking in initial render', () => {
    const html = renderToString(h(Providers, null, h(VocabCorpusPage)));
    expect(html).not.toContain('/api/v1/datasets/jlpt-official');
    expect(html).not.toContain('jlpt-official');
  });

  it('renders /ngu-phap without hardcoded jlpt-official in initial render', () => {
    const html = renderToString(h(Providers, null, h(GrammarCorpusPage)));
    expect(html).not.toContain('/api/v1/datasets/jlpt-official');
    expect(html).not.toContain('jlpt-official');
  });

  it('renders /thong-ke-tu-vung without hardcoded export links to jlpt-official', () => {
    const html = renderToString(h(Providers, null, h(VocabFrequencyStatsPage)));
    expect(html).not.toContain('/api/v1/datasets/jlpt-official/export');
  });

  it('renders /thao-luan without hardcoded q-default-1 in initial render or input value', () => {
    const html = renderToString(h(Providers, null, h(DiscussionsPage)));
    expect(html).not.toContain('q-default-1');
    expect(html).not.toContain('/api/v1/questions/q-default-1');
  });

  it('CorpusClient supports listDatasets and queries real datasetId without hardcoded jlpt-official', async () => {
    const mockData = {
      items: [
        {
          id: '0192f000-0000-7000-8000-000000000001',
          slug: 'jlpt-official-n1-n5',
          name: 'JLPT Official Corpus',
          isOfficial: true,
        },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
      text: async () => JSON.stringify(mockData),
    });

    const client = new CorpusClient({ fetchFn: mockFetch as unknown as typeof fetch });
    const datasets = await client.listDatasets();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/datasets'),
      expect.anything(),
    );
    expect(datasets.items).toHaveLength(1);
    expect(datasets.items[0]?.id).toBe('0192f000-0000-7000-8000-000000000001');
  });

  it('CommunityClient supports getDiscussableQuestions to fetch real question IDs for discussion', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [
            {
              id: '0192f000-0000-7000-8000-000000000002',
              stem: '日本語能力試験の文法問題',
              level: 'N5',
            },
          ],
        }),
    });

    const client = new CommunityClient({ fetchFn: mockFetch as unknown as typeof fetch });
    const questions = await client.getDiscussableQuestions();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/questions/discussions'),
      expect.anything(),
    );
    expect(questions.items).toHaveLength(1);
    expect(questions.items[0]?.id).toBe('0192f000-0000-7000-8000-000000000002');
  });
});
