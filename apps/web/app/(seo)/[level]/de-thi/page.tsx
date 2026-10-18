import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { examApiClient } from '../../../../features/exam/api/exam-api';
import { LibraryView } from '../../../../features/library';
import { JsonLd } from '@jlpt/ui';
import type { ExamSummary } from '@jlpt/schema';

export interface LevelExamsPageProps {
  params: Promise<{ level: string }>;
}

const VALID_LEVELS = ['n1', 'n2', 'n3', 'n4', 'n5'];

export function generateStaticParams() {
  return VALID_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: LevelExamsPageProps): Promise<Metadata> {
  const { level } = await params;
  const normalized = level.toLowerCase();
  const upper = normalized.toUpperCase();
  if (!VALID_LEVELS.includes(normalized)) {
    return { title: 'Cấp độ không tồn tại - JLPT Online' };
  }

  const canonicalUrl = `https://jlpt.vn/${normalized}/de-thi`;

  return {
    title: `Danh sách đề thi JLPT ${upper} theo năm và kỳ - JLPT Online`,
    description: `Tổng hợp đề thi chính thức JLPT ${upper} qua các năm và đề thi thử nghiệm có đồng hồ thi chuẩn quốc tế và đáp án chi tiết.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `https://jlpt.vn/${normalized}/de-thi`,
        ja: `https://jlpt.vn/ja/${normalized}/de-thi`,
        en: `https://jlpt.vn/en/${normalized}/de-thi`,
      },
    },
    openGraph: {
      title: `Đề thi JLPT ${upper} qua các năm - JLPT Online`,
      description: `Luyện thi thử JLPT ${upper} trực tuyến với ngân hàng đề phong phú.`,
      url: canonicalUrl,
      siteName: 'JLPT Online',
      type: 'website',
      locale: 'vi_VN',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LevelExamsPage({ params }: LevelExamsPageProps): Promise<React.JSX.Element> {
  const { level } = await params;
  const normalized = level.toLowerCase();
  const upper = normalized.toUpperCase();

  if (!VALID_LEVELS.includes(normalized)) {
    notFound();
  }

  // Fetch exams for this level from API
  let exams: ExamSummary[] = [];
  try {
    const res = await examApiClient.getExams({ level: upper });
    exams = res.items || [];
  } catch {
    // Graceful fallback during static build or offline
  }

  // Schema.org Breadcrumbs (SEO-07)
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: 'https://jlpt.vn',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: upper,
        item: `https://jlpt.vn/${normalized}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Đề thi ${upper}`,
        item: `https://jlpt.vn/${normalized}/de-thi`,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6" data-testid="level-exams-page">
      <JsonLd id={`breadcrumb-schema-${normalized}-exams`} data={breadcrumbStructuredData} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <a href={`/${normalized}`} className="hover:underline">{upper}</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Đề thi {upper}</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Danh sách đề thi JLPT {upper} theo năm và kỳ
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Bộ sưu tập đề thi chính thức và đề thi mẫu JLPT {upper} được phân loại theo từng năm và kỳ thi (tháng 7 và tháng 12).
        </p>
      </div>

      {/* Library View with Level Pre-Selected and Client-Side Filters (LIB-01..08, SEO-02) */}
      <LibraryView exams={exams} initialLevel={upper} />
    </div>
  );
}
