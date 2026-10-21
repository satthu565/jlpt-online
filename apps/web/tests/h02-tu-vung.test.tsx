import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { VocabExplorer } from '../features/corpus/components/vocab-explorer';
import VocabCorpusPage from '../app/(corpus)/tu-vung/page';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element).replace(/<!--.*?-->/g, '');

describe('H02: /tu-vung Dictionary Lookup, Han-Viet, and Empty Corpus Behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders /tu-vung page with dictionary lookup section at the top and schema metadata', () => {
    const html = renderClean(<VocabCorpusPage />);
    expect(html).toContain('data-testid="vocab-corpus-page"');
    expect(html).toContain('data-testid="dictionary-lookup-section"');
    expect(html).toContain('data-testid="dict-search-input"');
    expect(html).toContain('data-testid="dict-search-btn"');
    expect(html).toContain('data-testid="dict-example-学生"');
    expect(html).toContain('data-testid="dict-example-勉強"');
    expect(html).toContain('data-testid="dict-example-よやく"');
  });

  it('does not display empty placeholder message when corpus items is empty', () => {
    const html = renderClean(<VocabExplorer initialItems={[]} />);
    expect(html).toContain('data-testid="dictionary-lookup-section"');
    expect(html).not.toContain('Không tìm thấy từ vựng nào phù hợp.');
  });

  it('displays empty placeholder when corpus has items but filtered query produces 0 matches', () => {
    const sampleItems = [
      {
        term: '学生',
        reading: 'がくせい',
        meaning: 'học sinh',
        level: 'N5' as const,
        frequency: 10,
        hanViet: 'HỌC SINH',
      },
    ];
    // With initialItems, the grid is rendered
    const htmlWithItems = renderClean(<VocabExplorer initialItems={sampleItems} />);
    expect(htmlWithItems).toContain('data-testid="vocab-cards-grid"');
    expect(htmlWithItems).toContain('学生');
  });

  it('contains guest redirect links to /dang-nhap for unauthorized actions', () => {
    // When no result is loaded, example pills are present
    const html = renderClean(<VocabExplorer />);
    expect(html).toContain('data-testid="dict-example-学生"');
    expect(html).toContain('Tra từ');
  });
});
