import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { VocabDetailView } from '../../../../features/corpus/components/vocab-detail-view';
import type { DictionaryEntryDetailDto } from '../../../../features/corpus/types';
import { SITE_NAME, absoluteUrl } from '../../../../lib/site';

export interface VocabDetailPageProps {
  params: Promise<{ term: string }>;
}

function getApiBaseUrl(): string {
  const internal = process.env.API_INTERNAL_URL || process.env.INTERNAL_API_URL || process.env.STAGING_API_URL;
  if (internal) {
    const clean = internal.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  const apiUrl = process.env.API_URL;
  if (apiUrl) {
    const clean = apiUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicUrl && !publicUrl.startsWith('/')) {
    const clean = publicUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  return 'http://127.0.0.1:4000/api/v1';
}

async function fetchVocabEntry(rawTerm: string): Promise<DictionaryEntryDetailDto | null> {
  const term = decodeURIComponent(rawTerm).trim();
  if (!term) return null;

  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/dictionary/entries/${encodeURIComponent(term)}`, {
      cache: 'no-store',
    });
    if (res.status === 404 || !res.ok) {
      return null;
    }
    return (await res.json()) as DictionaryEntryDetailDto;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: VocabDetailPageProps): Promise<Metadata> {
  const { term: rawTerm } = await params;
  const entry = await fetchVocabEntry(rawTerm);
  if (!entry) {
    return {
      title: `Không tìm thấy từ vựng - ${SITE_NAME}`,
    };
  }

  const term = entry.entry;
  const canonicalUrl = absoluteUrl(`/tu-vung/${encodeURIComponent(term)}`);
  return {
    title: `${term} - nghĩa, cách đọc, Hán Việt | ${SITE_NAME}`,
    description: `Chi tiết từ vựng tiếng Nhật ${term}: cách đọc, từ loại, nghĩa tiếng Anh JMdict và phân tách âm Hán Việt chữ Hán.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${term} - nghĩa, cách đọc, Hán Việt | ${SITE_NAME}`,
      description: `Chi tiết từ vựng tiếng Nhật ${term}: cách đọc, từ loại, nghĩa tiếng Anh JMdict và phân tách âm Hán Việt chữ Hán.`,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'vi_VN',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function VocabDetailPage({
  params,
}: VocabDetailPageProps): Promise<React.JSX.Element> {
  const { term: rawTerm } = await params;
  const entry = await fetchVocabEntry(rawTerm);

  if (!entry) {
    notFound();
  }

  const term = entry.entry;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term,
    description: entry.meanings?.join('; ') || '',
    inDefinedTermSet: absoluteUrl('/tu-vung'),
    termCode: term,
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Từ vựng', item: absoluteUrl('/tu-vung') },
      { '@type': 'ListItem', position: 3, name: term, item: absoluteUrl(`/tu-vung/${encodeURIComponent(term)}`) },
    ],
  };

  return (
    <div className="container py-8 space-y-6" data-testid="vocab-detail-page">
      <JsonLd id="vocab-detail-schema" data={structuredData} />
      <JsonLd id="vocab-detail-breadcrumbs" data={breadcrumbs} />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <a href="/tu-vung" className="hover:underline">Từ vựng</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold font-japanese">{term}</span>
      </nav>

      {/* Main Detail Content */}
      <VocabDetailView entry={entry} />
    </div>
  );
}
