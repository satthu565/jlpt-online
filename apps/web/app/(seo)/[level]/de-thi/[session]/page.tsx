import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { examApiClient } from '../../../../../features/exam/api/exam-api';
import { LibraryView } from '../../../../../features/library';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import type { ExamSummary } from '@jlpt/schema';

export interface SessionExamsPageProps {
  params: Promise<{ level: string; session: string }>;
}

export async function generateStaticParams() {
  const params: Array<{ level: string; session: string }> = [];
  try {
    const res = await examApiClient.getExams({ limit: 100 });
    for (const e of res.items || []) {
      if (e.year && e.session) {
        const sessionSlug = `${e.year}-${e.session.padStart(2, '0')}`;
        params.push({
          level: e.level.toLowerCase(),
          session: sessionSlug,
        });
        // Also without padStart for single digits (e.g. 2024-7)
        if (e.session.length === 1) {
          params.push({
            level: e.level.toLowerCase(),
            session: `${e.year}-${e.session}`,
          });
        }
      }
    }
  } catch {
    // Graceful fallback during static build or offline
  }
  return params;
}

export async function generateMetadata({ params }: SessionExamsPageProps): Promise<Metadata> {
  const { level, session } = await params;
  const upper = level.toUpperCase();
  const canonicalUrl = `https://jlpt.vn/${level.toLowerCase()}/de-thi/${session}`;

  return {
    title: `Đề thi JLPT ${upper} Kỳ ${session} - JLPT Online`,
    description: `Đề thi chính thức JLPT ${upper} kỳ ${session} chuẩn cấu trúc JEES & Japan Foundation, có đồng hồ tính giờ và chấm điểm tự động.`,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SessionExamsPage({ params }: SessionExamsPageProps): Promise<React.JSX.Element> {
  const { level, session } = await params;
  const upper = level.toUpperCase();

  // Parse session: e.g. "2023-12" -> year = 2023, session = "12"
  const parts = session.split('-');
  const yearNum = Number(parts[0]);
  const sessionNum = parts[1]?.replace(/^0+/, ''); // strip leading zero

  let matchingExams: ExamSummary[] = [];
  try {
    const res = await examApiClient.getExams({ level: upper });
    matchingExams = (res.items || []).filter((e) => {
      if (e.level.toUpperCase() !== upper) return false;
      if (yearNum && e.year !== yearNum) return false;
      if (sessionNum && e.session !== sessionNum && e.session !== parts[1]) return false;
      return true;
    });
  } catch {
    // Graceful fallback during static build or offline
  }

  if (matchingExams.length === 0) {
    notFound();
  }

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
        item: `https://jlpt.vn/${level.toLowerCase()}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Đề thi ${upper}`,
        item: `https://jlpt.vn/${level.toLowerCase()}/de-thi`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: `Kỳ ${session}`,
        item: `https://jlpt.vn/${level.toLowerCase()}/de-thi/${session}`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-7xl py-8 px-4 space-y-6" data-testid="session-exams-page">
      <JsonLd id={`breadcrumb-schema-${level}-${session}`} data={breadcrumbStructuredData} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
        <a href={`/${level.toLowerCase()}`} className="hover:underline">{upper}</a> &gt;{' '}
        <a href={`/${level.toLowerCase()}/de-thi`} className="hover:underline">Đề thi {upper}</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Kỳ {session}</span>
      </nav>

      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Đề thi JLPT {upper} - Kỳ thi {session}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Đề thi chi tiết của kỳ thi năng lực tiếng Nhật JLPT {upper} đợt {session}.
        </p>
      </div>

      <LibraryView exams={matchingExams} initialLevel={upper} />
    </div>
  );
}
