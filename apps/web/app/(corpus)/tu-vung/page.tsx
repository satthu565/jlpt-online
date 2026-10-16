import React from 'react';
import type { Metadata } from 'next';
import { VocabExplorer } from '../../../features/corpus';
import { JsonLd } from '@jlpt/ui';

export const metadata: Metadata = {
  title: 'Thư viện Từ vựng JLPT N1–N5 theo ngữ cảnh & cấp độ - JLPT Online',
  description: 'Tra cứu hơn 20,000 từ vựng tiếng Nhật từ N5 đến N1 kèm cách đọc Hiragana, ví dụ câu thực tế trong đề thi và phát âm audio.',
  alternates: {
    canonical: 'https://jlpt.vn/tu-vung',
    languages: {
      vi: 'https://jlpt.vn/tu-vung',
      ja: 'https://jlpt.vn/ja/tu-vung',
      en: 'https://jlpt.vn/en/tu-vung',
    },
  },
  openGraph: {
    title: 'Thư viện Từ vựng JLPT N1–N5 - JLPT Online',
    description: 'Kho từ vựng tiếng Nhật chuẩn JLPT phân loại theo cấp độ và tần suất xuất hiện.',
    url: 'https://jlpt.vn/tu-vung',
    siteName: 'JLPT Online',
    type: 'website',
    locale: 'vi_VN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function VocabCorpusPage(): React.JSX.Element {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: 'Thư viện Từ vựng JLPT N1–N5',
    description: 'Kho từ vựng tiếng Nhật chuẩn JLPT theo cấp độ và ví dụ thực tế.',
    learningResourceType: 'Vocabulary Index',
    educationalLevel: ['JLPT N1', 'JLPT N2', 'JLPT N3', 'JLPT N4', 'JLPT N5'],
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Từ vựng', item: 'https://jlpt.vn/tu-vung' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6" data-testid="vocab-corpus-page">
      <JsonLd id="vocab-schema" data={structuredData} />
      <JsonLd id="vocab-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Từ vựng</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Thư viện Từ vựng JLPT N1–N5 theo ngữ cảnh & tần suất
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Tra cứu từ vựng tiếng Nhật thực tế trong đề thi JLPT qua các năm, nghe phát âm chuẩn và lưu trực tiếp vào sổ tay cá nhân.
        </p>
      </div>

      <VocabExplorer />
    </div>
  );
}
