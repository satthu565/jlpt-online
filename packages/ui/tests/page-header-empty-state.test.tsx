import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PageHeader } from '../src/components/page-header.js';
import { EmptyState } from '../src/components/empty-state.js';
import { countInlineStyles, compareToBaseline } from '../scripts/check-inline-styles.js';

describe('PageHeader', () => {
  it('renders the title as h1 by default with description and actions', () => {
    const html = renderToString(
      <PageHeader title="Thư viện đề" description="Đề thật N1–N5" actions={<button type="button">Lọc</button>} />,
    );
    expect(html).toMatch(/<h1[^>]*>Thư viện đề<\/h1>/);
    expect(html).toContain('Đề thật N1–N5');
    expect(html).toContain('Lọc');
  });

  it('can render the title as h2 for nested sections', () => {
    expect(renderToString(<PageHeader as="h2" title="Mục con" />)).toMatch(/<h2[^>]*>Mục con<\/h2>/);
  });
});

describe('EmptyState', () => {
  it('announces loading politely and spins the icon', () => {
    const html = renderToString(<EmptyState variant="loading" title="Đang tải" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('animate-spin');
    expect(html).toContain('data-variant="loading"');
  });

  it('uses role=alert for errors and renders the action', () => {
    const html = renderToString(
      <EmptyState variant="error" title="Không tải được" action={<button type="button">Thử lại</button>} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Thử lại');
  });

  it('reserves height so replacing it does not shift the layout', () => {
    expect(renderToString(<EmptyState title="Trống" minHeight="lg" />)).toContain('min-h-96');
  });
});

describe('check-inline-styles', () => {
  it('counts style={{ and skips lines marked ui-allow-style', () => {
    const src = [
      '<div style={{ color: "red" }} />',
      '// ui-allow-style: width computed at runtime',
      '<div style={{ width: `${pct}%` }} />',
      '<div style={{ a: 1 }}><span style={{ b: 2 }} /></div>',
    ].join('\n');
    expect(countInlineStyles(src)).toBe(3);
  });

  it('flags only files above their baseline; new files are allowed 0', () => {
    const over = compareToBaseline({ 'a.tsx': 2, 'b.tsx': 5, 'new.tsx': 1 }, { 'a.tsx': 3, 'b.tsx': 4 });
    expect(over).toEqual([
      { file: 'b.tsx', current: 5, allowed: 4 },
      { file: 'new.tsx', current: 1, allowed: 0 },
    ]);
  });
});
