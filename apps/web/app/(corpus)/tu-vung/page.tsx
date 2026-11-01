import React from 'react';
import type { Metadata } from 'next';
import { VocabExplorer } from '../../../features/corpus';
import { ExamHero } from '../../../features/library';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { SITE_NAME, absoluteUrl, localizedUrl } from '../../../lib/site';

export const metadata: Metadata = {
  title: `Thư viện Từ vựng JLPT N1–N5 theo ngữ cảnh & cấp độ - ${SITE_NAME}`,
  description: 'Tra cứu hơn 20,000 từ vựng tiếng Nhật từ N5 đến N1 kèm cách đọc Hiragana, ví dụ câu thực tế trong đề thi và phát âm audio.',
  alternates: {
    canonical: absoluteUrl('/tu-vung'),
    languages: {
      vi: localizedUrl('vi', '/tu-vung'),
      ja: localizedUrl('ja', '/tu-vung'),
      en: localizedUrl('en', '/tu-vung'),
    },
  },
  openGraph: {
    title: `Thư viện Từ vựng JLPT N1–N5 - ${SITE_NAME}`,
    description: 'Kho từ vựng tiếng Nhật chuẩn JLPT phân loại theo cấp độ và tần suất xuất hiện.',
    url: absoluteUrl('/tu-vung'),
    siteName: SITE_NAME,
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
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Từ vựng', item: absoluteUrl('/tu-vung') },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="vocab-corpus-page">
      <JsonLd id="vocab-schema" data={structuredData} />
      <JsonLd id="vocab-breadcrumbs" data={breadcrumbs} />

      <ExamHero
        title="Thư viện Từ vựng JLPT N1–N5 theo ngữ cảnh & tần suất"
        subtitle="Tra cứu từ vựng tiếng Nhật thực tế trong đề thi JLPT qua các năm, nghe phát âm chuẩn và lưu trực tiếp vào sổ tay cá nhân."
        minimal
        background="gradient"
      />

      <div className="container py-8 space-y-6">
        {/* Breadcrumbs */}
        <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
          <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
          <span className="text-slate-900 dark:text-slate-100 font-semibold">Từ vựng</span>
        </nav>

        <VocabExplorer />

        <p className="text-xs text-slate-500">
          Dữ liệu từ điển: JMdict và KANJIDIC2 của EDRDG, giấy phép CC BY-SA 4.0 —{' '}
          <a href="/gioi-thieu#nguon-du-lieu">xem nguồn và giấy phép</a>.
        </p>
      </div>
    </div>
  );
}
