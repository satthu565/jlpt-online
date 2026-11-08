import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json' with { type: 'json' };
import NotebookPage from '../app/(learning)/so-tay/page';
import { NotebookView } from '../features/learning/components/notebook-view';

const renderWithProviders = (ui: React.ReactElement): string => {
  return renderToStaticMarkup(<Providers messages={viMessages}>{ui}</Providers>)
    .replace(/&amp;/g, '&');
};

describe('NotebookPage Hero styling and synchronization', () => {
  it('renders ExamHero with gradient background, minimal mode, title and subtitle', () => {
    const html = renderWithProviders(<NotebookPage />);

    // Gradient background, no photo background
    expect(html).toContain('from-sky-100');
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');

    // Title and subtitle preserved
    expect(html).toContain('Sổ tay từ vựng & Ngữ pháp cá nhân');
    expect(html).toContain('Quản lý từ vựng, mẫu ngữ pháp, luyện flashcards thông minh SRS và làm mini-quiz.');

    // Minimal mode: no countdown, no badge, no login prompt in hero
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).not.toContain('Kho đề thi JLPT chính thức 2010 – 2026');

    // Unauthenticated guest alert and empty notebook card render right below hero
    expect(html).toContain('Bạn cần đăng nhập để xem và lưu sổ tay học tập cá nhân.');
    expect(html).toContain('Sổ tay của bạn đang trống');
    // Tablist is hidden for unauthenticated guests
    expect(html).not.toContain('role="tablist"');
  });

  it('renders HeroUI Select dropdowns for notebook filters', () => {
    const html = renderWithProviders(
      <NotebookView
        items={[]}
        totalCount={0}
        onAddItem={async () => {}}
        onUpdateItem={async () => {}}
        onDeleteItem={async () => {}}
        onExportCsv={async () => {}}
      />
    );

    // HeroUI Select renders data-slot="select"
    expect(html).toContain('data-slot="select"');
    expect(html).toContain('notebook-kind-filter');
    expect(html).toContain('notebook-mastered-filter');
    expect(html).toContain('notebook-level-filter');
    expect(html).toContain('Tất cả cấp độ');
  });
});
