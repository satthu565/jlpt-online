import React from 'react';
import type { Metadata } from 'next';
import { FrequencyStatsView } from '../../../features/corpus';
import { ExamHero } from '../../../features/library';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { SITE_NAME, absoluteUrl, localizedUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: `Thống kê Từ vựng thường gặp & Xu hướng đề thi JLPT - ${SITE_NAME}`,
  description: 'Thống kê tần suất xuất hiện của từ vựng tiếng Nhật trong đề thi JLPT qua các năm, so sánh mức độ phân bổ giữa các cấp độ N1-N5 và xuất báo cáo CSV.',
  alternates: {
    canonical: absoluteUrl('/thong-ke-tu-vung'),
    languages: {
      vi: localizedUrl('vi', '/thong-ke-tu-vung'),
      ja: localizedUrl('ja', '/thong-ke-tu-vung'),
      en: localizedUrl('en', '/thong-ke-tu-vung'),
    },
  },
  openGraph: {
    title: `Thống kê Từ vựng thường gặp JLPT - ${SITE_NAME}`,
    description: 'Báo cáo dữ liệu tần suất từ vựng và xu hướng đề thi năng lực tiếng Nhật.',
    url: absoluteUrl('/thong-ke-tu-vung'),
    siteName: SITE_NAME,
    type: 'article',
    locale: 'vi_VN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VocabFrequencyStatsPage(): React.JSX.Element {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Thống kê từ vựng', item: absoluteUrl('/thong-ke-tu-vung') },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="vocab-stats-page">
      <JsonLd id="vocab-stats-breadcrumbs" data={breadcrumbs} />

      <ExamHero
        title="Thống kê Từ thường gặp & Phân tích Xu hướng đề thi JLPT"
        subtitle="Khám phá ma trận từ vựng cốt lõi dựa trên kho ngữ liệu tổng hợp các kỳ thi năng lực tiếng Nhật từ năm 2010 đến nay."
        minimal
        background="gradient"
      />

      <div className="container py-8 space-y-6">
        {/* Breadcrumbs */}
        <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
          <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
          <span className="text-slate-900 dark:text-slate-100 font-semibold">Thống kê từ vựng thường gặp</span>
        </nav>

        <FrequencyStatsView />
      </div>
    </div>
  );
}
