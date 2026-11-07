import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HeroSelect } from '../src/components/hero-select.js';

describe('HeroSelect Component (@heroui/react integration)', () => {
  const options = [
    { value: 'all', label: 'Tất cả' },
    { value: 'vocab', label: 'Từ vựng' },
    { value: 'grammar', label: 'Ngữ pháp' },
    { value: 'kanji', label: 'Hán tự', disabled: true },
  ];

  it('renders HeroSelect with selected option and data-slot', () => {
    const html = renderToString(
      <HeroSelect
        id="test-kind-filter"
        aria-label="Loại mục"
        value="vocab"
        options={options}
      />
    );

    expect(html).toContain('data-slot="select"');
    expect(html).toContain('Từ vựng');
    expect(html).toContain('aria-label="Loại mục"');
  });

  it('renders with label and required asterisk', () => {
    const html = renderToString(
      <HeroSelect
        id="test-modal-kind"
        label="Phân loại"
        value="grammar"
        required
        options={options}
      />
    );

    expect(html).toContain('Phân loại');
    expect(html).toContain('*');
    expect(html).toContain('Ngữ pháp');
  });

  it('renders disabled state attribute', () => {
    const html = renderToString(
      <HeroSelect
        aria-label="Bị vô hiệu hóa"
        value="all"
        disabled
        options={options}
      />
    );

    expect(html).toContain('data-disabled="true"');
  });
});
