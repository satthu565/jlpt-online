import React from 'react';
import type { Metadata } from 'next';
import { GrammarExplorer } from '../../../features/corpus';
import { JsonLd } from '@jlpt/ui';

export const metadata: Metadata = {
  title: 'Thư viện Mẫu Ngữ pháp JLPT N1–N5 - Cấu trúc & Bài luyện - JLPT Online',
  description: 'Tổng hợp đầy đủ cấu trúc ngữ pháp tiếng Nhật N1 đến N5 kèm công thức kết hợp, ý nghĩa, câu ví dụ có phiên âm và liên kết luyện tập tương ứng.',
  alternates: {
    canonical: 'https://jlpt.vn/ngu-phap',
    languages: {
      vi: 'https://jlpt.vn/ngu-phap',
      ja: 'https://jlpt.vn/ja/ngu-phap',
      en: 'https://jlpt.vn/en/ngu-phap',
    },
  },
  openGraph: {
    title: 'Thư viện Mẫu Ngữ pháp JLPT N1–N5 - JLPT Online',
    description: 'Kho mẫu ngữ pháp tiếng Nhật kèm câu ví dụ và bài tập ôn luyện.',
    url: 'https://jlpt.vn/ngu-phap',
    siteName: 'JLPT Online',
    type: 'website',
    locale: 'vi_VN',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function GrammarCorpusPage(): React.JSX.Element {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: 'Thư viện Mẫu Ngữ pháp JLPT N1–N5',
    description: 'Tổng hợp mẫu ngữ pháp tiếng Nhật chuẩn cấu trúc đề thi JLPT.',
    learningResourceType: 'Grammar Reference',
    educationalLevel: ['JLPT N1', 'JLPT N2', 'JLPT N3', 'JLPT N4', 'JLPT N5'],
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Ngữ pháp', item: 'https://jlpt.vn/ngu-phap' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6" data-testid="grammar-corpus-page">
      <JsonLd id="grammar-schema" data={structuredData} />
      <JsonLd id="grammar-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Ngữ pháp</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Thư viện Mẫu Ngữ pháp JLPT N1–N5 & Bài tập vận dụng
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Tra cứu cấu trúc ngữ pháp, công thức kết hợp và câu ví dụ minh họa. Mỗi mẫu ngữ pháp đều được liên kết trực tiếp với các câu hỏi luyện tập tương ứng.
        </p>
      </div>

      <GrammarExplorer />
    </div>
  );
}
