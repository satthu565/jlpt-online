import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json' with { type: 'json' };
import { SAMPLE_EXAM_SUMMARIES } from './fixtures/exam-fixtures';
import { LibraryView } from '../features/library/components/library-view';
import { ExamHero } from '../features/library/components/exam-hero';
import { LibraryFilters } from '../features/library/components/library-filters';
import { INITIAL_LIBRARY_FILTERS } from '../features/library/types';
import HomePage from '../app/page';
import ExamLibraryPage from '../app/(library)/de-thi/page';
import MembershipPage from '../app/(billing)/goi-thanh-vien/page';
import ClassroomPage from '../app/(classroom)/lop-hoc/page';

const renderWithProviders = (ui: React.ReactElement): string => {
  return renderToStaticMarkup(<Providers messages={viMessages}>{ui}</Providers>)
    .replace(/&amp;/g, '&');
};

describe('Synchronization of /de-thi with HomePage Hero and Filters', () => {
  it('ExamHero renders hero background image, title, subtitle, and countdown', () => {
    const html = renderWithProviders(
      <ExamHero
        title="Thư viện đề thi JLPT"
        subtitle="Tổng hợp đề thi thật chính thức N1-N5"
        badgeText="Kho đề thi JLPT chính thức 2010 – 2026"
      />,
    );

    // Hero background scene with image
    expect(html).toContain('/images/hero-jlpt-bg.webp');
    // Title and badge
    expect(html).toContain('Thư viện đề thi JLPT');
    expect(html).toContain('Tổng hợp đề thi thật chính thức N1-N5');
    expect(html).toContain('Kho đề thi JLPT chính thức 2010 – 2026');
    // Countdown card
    expect(html).toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).toContain('/lich-thi');
    expect(html).toContain('Ngày');
    expect(html).toContain('Giờ');
    expect(html).toContain('Phút');
    expect(html).toContain('Giây');
  });

  it('LibraryFilters renders 4-tier search and filter matching homepage layout', () => {
    let _changedFilters = INITIAL_LIBRARY_FILTERS;
    let _resetCalled = false;

    const html = renderWithProviders(
      <LibraryFilters
        filters={INITIAL_LIBRARY_FILTERS}
        onFilterChange={(f) => {
          _changedFilters = f;
        }}
        onResetFilters={() => {
          _resetCalled = true;
        }}
        availableYears={[2024, 2023, 2022]}
        idPrefix="test-filters"
      />,
    );

    // Tier 1: Search input and button
    expect(html).toContain('Tìm kiếm đề thi');
    expect(html).toContain('test-filters-search-input');
    expect(html).toContain('Nhập tên đề thi, từ khóa hoặc cấp độ...');

    // Tier 2: Level pills
    expect(html).toContain('Cấp độ JLPT');
    expect(html).toContain('Tất cả cấp độ');
    expect(html).toContain('N1');
    expect(html).toContain('N2');
    expect(html).toContain('N3');
    expect(html).toContain('N4');
    expect(html).toContain('N5');
    expect(html).toContain('badge-level-n1');

    // Tier 3: 4 dropdowns
    expect(html).toContain('Năm thi');
    expect(html).toContain('Kỳ thi');
    expect(html).toContain('Thể loại đề');
    expect(html).toContain('Trạng thái của bạn');
    expect(html).toContain('Tất cả các năm');
    expect(html).toContain('Tất cả các kỳ');
    expect(html).toContain('Tất cả thể loại');
    expect(html).toContain('Mọi trạng thái');
    expect(html).toContain('Chưa từng làm');
    expect(html).toContain('Chưa đạt mục tiêu');

    // Tier 4: Favorites and Reset
    expect(html).toContain('data-testid="filter-only-favorites"');
    expect(html).toContain('Chỉ hiện các đề đã yêu thích');
    expect(html).toContain('Đặt lại bộ lọc');
  });

  it('LibraryView with showHero=true renders Hero with background and exams below', () => {
    const html = renderWithProviders(
      <LibraryView exams={SAMPLE_EXAM_SUMMARIES} showHero={true} />,
    );

    // Hero background
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');
    expect(html).toContain('from-sky-100');
    expect(html).toContain('Thư viện đề thi JLPT');
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');

    // Integrated search filter
    expect(html).toContain('Tìm kiếm đề thi');
    expect(html).toContain('Cấp độ JLPT');
    expect(html).toContain('data-testid="filter-only-favorites"');

    // Exams grid below hero
    expect(html).toContain('id="danh-sach-de-thi"');
    expect(html).toContain('Đề thi chính thức JLPT N1');
    expect(html).toContain('Đề thi chính thức JLPT N2');
  });

  it('LibraryView with showHero=false (SEO/default) renders inline filters without hero', () => {
    const html = renderWithProviders(
      <LibraryView exams={SAMPLE_EXAM_SUMMARIES} showHero={false} />,
    );

    // No hero background image
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');
    // Still has filters and exams
    expect(html).toContain('Tìm kiếm đề thi');
    expect(html).toContain('Đề thi chính thức JLPT N1');
  });

  it('HomePage renders cleanly with shared ExamHero and LibraryFilters', () => {
    const html = renderWithProviders(<HomePage />);

    expect(html).toContain('/images/hero-jlpt-bg.webp');
    expect(html).toContain('Luyện đề JLPT');
    expect(html).toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).toContain('homepage-search-input');
    expect(html).toContain('de-thi-theo-nam');
  });

  it('ExamLibraryPage renders with hero background and exam library container', () => {
    const html = renderWithProviders(<ExamLibraryPage />);

    expect(html).toContain('data-testid="exam-library-page"');
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');
    expect(html).toContain('from-sky-100');
    expect(html).toContain('Thư viện đề thi JLPT');
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
  });

  it('MembershipPage renders with ExamHero gradient, title, subtitle, and no countdown', () => {
    const html = renderWithProviders(<MembershipPage />);

    expect(html).not.toContain('/images/hero-jlpt-bg.webp');
    expect(html).toContain('from-sky-100');
    expect(html).toContain(viMessages.billing.page.title);
    expect(html).toContain(viMessages.billing.page.subtitle);
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).toContain('data-testid="pricing-table"');
  });

  it('ClassroomPage renders with ExamHero gradient, title, subtitle, and no countdown', () => {
    const html = renderWithProviders(<ClassroomPage />);

    expect(html).not.toContain('/images/hero-jlpt-bg.webp');
    expect(html).toContain('from-sky-100');
    expect(html).toContain(viMessages.classroom.page.title);
    expect(html).toContain(viMessages.classroom.page.subtitle);
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).toContain('data-testid="classroom-invite-input"');
  });
});
