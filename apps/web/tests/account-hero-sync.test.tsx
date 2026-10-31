import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json' with { type: 'json' };
import ExamHistoryPage from '../app/(account)/lich-su/page';
import AccountPage from '../app/(account)/tai-khoan/page';

const renderWithProviders = (ui: React.ReactElement): string => {
  return renderToString(<Providers messages={viMessages}>{ui}</Providers>)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');
};

describe('Account & History pages hero synchronization', () => {
  it('ExamHistoryPage renders ExamHero with minimal, gradient background, title, subtitle, and no countdown', () => {
    const html = renderWithProviders(<ExamHistoryPage />);

    // Container and layout
    expect(html).toContain('data-testid="exam-history-page"');
    expect(html).toContain('from-sky-100'); // CSS gradient background
    expect(html).not.toContain('/images/hero-jlpt-bg.webp'); // no photo background

    // Title and Subtitle
    expect(html).toContain('Lịch sử làm bài thi');
    expect(html).toContain('Theo dõi tiến độ, điểm số và xem lại chi tiết bài làm của các kỳ thi bạn đã tham gia.');

    // No countdown or badge
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).not.toContain('Kho đề thi JLPT chính thức');

    // Only one h1
    const h1Matches = html.match(/<h1[^>]*>/g);
    expect(h1Matches).toHaveLength(1);

    // Initial loading state exists below hero
    expect(html).toContain('data-testid="history-loading"');
  });

  it('AccountPage renders ExamHero with minimal, gradient background, title, subtitle, and no countdown', () => {
    const html = renderWithProviders(<AccountPage />);

    // Layout
    expect(html).toContain('from-sky-100'); // CSS gradient background
    expect(html).not.toContain('/images/hero-jlpt-bg.webp'); // no photo background

    // Title and Subtitle in Vietnamese
    expect(html).toContain('Quản lý tài khoản');
    expect(html).toContain('Xem thông tin cá nhân, trình độ ôn thi và các phiên hoạt động');

    // No countdown or badge
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).not.toContain('Kho đề thi JLPT chính thức');

    // Only one h1
    const h1Matches = html.match(/<h1[^>]*>/g);
    expect(h1Matches).toHaveLength(1);

    // Unauthenticated alert is rendered below hero
    expect(html).toContain('Vui lòng đăng nhập để xem thông tin hồ sơ');
    expect(html).toContain('role="tablist"');
  });
});
