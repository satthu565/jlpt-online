import React from 'react';
import type { Metadata } from 'next';
import { FrequencyStatsView } from '../../../features/corpus';
import { JsonLd } from '@jlpt/ui';

export const metadata: Metadata = {
  title: 'Thống kê Từ vựng thường gặp & Xu hướng đề thi JLPT - JLPT Online',
  description: 'Thống kê tần suất xuất hiện của từ vựng tiếng Nhật trong đề thi JLPT qua các năm, so sánh mức độ phân bổ giữa các cấp độ N1-N5 và xuất báo cáo CSV.',
  alternates: {
    canonical: 'https://jlpt.vn/thong-ke-tu-vung',
    languages: {
      vi: 'https://jlpt.vn/thong-ke-tu-vung',
      ja: 'https://jlpt.vn/ja/thong-ke-tu-vung',
      en: 'https://jlpt.vn/en/thong-ke-tu-vung',
    },
  },
  openGraph: {
    title: 'Thống kê Từ vựng thường gặp JLPT - JLPT Online',
    description: 'Báo cáo dữ liệu tần suất từ vựng và xu hướng đề thi năng lực tiếng Nhật.',
    url: 'https://jlpt.vn/thong-ke-tu-vung',
    siteName: 'JLPT Online',
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
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Thống kê từ vựng', item: 'https://jlpt.vn/thong-ke-tu-vung' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6" data-testid="vocab-stats-page">
      <JsonLd id="vocab-stats-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Thống kê từ vựng thường gặp</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Thống kê Từ thường gặp & Phân tích Xu hướng đề thi JLPT
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Khám phá ma trận từ vựng cốt lõi dựa trên kho ngữ liệu tổng hợp các kỳ thi năng lực tiếng Nhật từ năm 2010 đến nay.
        </p>
      </div>

      <FrequencyStatsView />
    </div>
  );
}
