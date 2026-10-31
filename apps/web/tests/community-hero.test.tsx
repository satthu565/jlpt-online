import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json' with { type: 'json' };
import ExamEventPage from '../app/(community)/su-kien/page';
import DiscussionsPage from '../app/(community)/thao-luan/page';

const renderWithProviders = (ui: React.ReactElement): string => {
  return renderToStaticMarkup(<Providers messages={viMessages}>{ui}</Providers>)
    .replace(/&amp;/g, '&');
};

describe('Community Pages Hero Integration (/su-kien and /thao-luan)', () => {
  it('ExamEventPage renders minimal gradient ExamHero and preserves page contents', () => {
    const html = renderWithProviders(<ExamEventPage />);

    // Renders gradient background instead of photo
    expect(html).toContain('from-sky-100');
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');

    // No countdown or badge
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).not.toContain('Kho đề thi JLPT chính thức 2010');

    // Title and subtitle in hero
    expect(html).toContain('Phòng chờ thi sự kiện trực tuyến');
    expect(html).toContain(
      'Tham gia thi thử trực tuyến đồng loạt với hàng nghìn thí sinh trên toàn quốc, chấm điểm chuẩn hóa và xếp hạng.',
    );

    // H1 present exactly once for page title
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/g);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches?.length).toBe(1);

    // Content container exists below hero
    expect(html).toContain('container py-8 w-full');
    expect(html).toContain('/dang-nhap?redirect=/su-kien');
  });

  it('DiscussionsPage renders minimal gradient ExamHero and preserves page contents', () => {
    const html = renderWithProviders(<DiscussionsPage />);

    // Renders gradient background instead of photo
    expect(html).toContain('from-sky-100');
    expect(html).not.toContain('/images/hero-jlpt-bg.webp');

    // No countdown or badge
    expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
    expect(html).not.toContain('Kho đề thi JLPT chính thức 2010');

    // Title and subtitle in hero
    expect(html).toContain('Thảo luận câu hỏi & Chia sẻ thành tích');
    expect(html).toContain(
      'Trao đổi phương pháp giải đề với giáo viên và học viên khác sau khi hoàn thành bài thi.',
    );

    // H1 present exactly once for page title
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/g);
    expect(h1Matches).not.toBeNull();
    expect(h1Matches?.length).toBe(1);

    // Content container exists below hero
    expect(html).toContain('container py-8 w-full');
    expect(html).toContain('/dang-nhap?redirect=/thao-luan');
    expect(html).toContain('data-testid="discussion-gated-card"');
  });
});
