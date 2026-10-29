import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VietnameseMeaningsEditor } from '../features/lexicon/vietnamese-meanings-editor';
import { apiClient } from '../lib/api-client';

describe('Vietnamese dictionary meanings editor', () => {
  it.each(['vi', 'en', 'ja'] as const)('shows all source senses and saved glosses in %s', (locale) => {
    const html = renderToStaticMarkup(
      <VietnameseMeaningsEditor
        locale={locale}
        item={{
          id: 'entry',
          term: '仕事',
          readings: ['しごと'],
          meanings: ['work', 'occupation'],
          meaningsVi: ['công việc'],
          partOfSpeech: 'n',
          hanViet: 'SĨ SỰ',
          meaningSenses: [
            {
              senseIndex: 0,
              english: ['work', 'job'],
              vietnamese: ['công việc', 'việc làm'],
              summary: 'Công việc',
              explanation: 'Việc cần thực hiện.',
              partOfSpeech: 'n',
            },
            {
              senseIndex: 2,
              english: ['occupation'],
              vietnamese: [],
              summary: null,
              explanation: null,
              partOfSpeech: 'n',
            },
          ],
        }}
        onSaved={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('work; job');
    expect(html).toContain('occupation');
    expect(html).toContain('công việc\nviệc làm');
    expect(html).toContain('Công việc');
    expect(html).toContain('Việc cần thực hiện.');
    expect(html).toContain('lexicon-vi-sense-2');
    expect(html).not.toMatch(/lexicon\.[A-Za-z]/);
  });

  it('sends sense indices and multiple Vietnamese glosses with editor permissions', async () => {
    const spy = vi.spyOn(apiClient, 'request').mockResolvedValueOnce({
      id: 'entry',
      meaningsVi: ['công việc'],
      meaningSenses: [],
    });
    try {
      await apiClient.updateVietnameseMeanings('entry', [
        {
          senseIndex: 2,
          meanings: ['công việc'],
          summary: 'Việc làm',
          explanation: 'Việc để kiếm sống.',
        },
      ]);
      expect(spy).toHaveBeenCalledWith('PATCH', '/api/v1/admin/lexicon/entries/entry/meanings-vi', {
        requiredRoles: ['admin', 'editor'],
        body: {
          senses: [
            {
              senseIndex: 2,
              meanings: ['công việc'],
              summary: 'Việc làm',
              explanation: 'Việc để kiếm sống.',
            },
          ],
        },
      });
    } finally {
      spy.mockRestore();
    }
  });
});
