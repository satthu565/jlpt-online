import { BookOpen, Target, Timer } from 'lucide-react';
import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { JsonLd } from '@jlpt/ui/components/json-ld';

export interface LevelPageProps {
  params: Promise<{ level: string }>;
}

interface LevelDetail {
  code: string;
  name: string;
  title: string;
  description: string;
  color: 'danger' | 'warning' | 'primary' | 'info' | 'neutral';
  passingTotal: number;
  maxTotal: number;
  passingSectionMin: number;
  vocabTarget: number;
  kanjiTarget: number;
  studyHours: string;
  sections: Array<{ name: string; durationMin: number }>;
}

const LEVEL_DATA: Record<string, LevelDetail> = {
  n1: {
    code: 'N1',
    name: 'n1',
    title: 'JLPT N1 - Cấp độ Cao cấp (Advanced)',
    description: 'Năng lực hiểu tiếng Nhật trong các tình huống đa dạng, đọc văn bản trừu tượng và thảo luận chuyên sâu.',
    color: 'danger',
    passingTotal: 100,
    maxTotal: 180,
    passingSectionMin: 19,
    vocabTarget: 10000,
    kanjiTarget: 2000,
    studyHours: '900 - 1200',
    sections: [
      { name: 'Kiến thức ngôn ngữ & Đọc hiểu (言語知識・読解)', durationMin: 110 },
      { name: 'Nghe hiểu (聴解)', durationMin: 60 },
    ],
  },
  n2: {
    code: 'N2',
    name: 'n2',
    title: 'JLPT N2 - Cấp độ Trung cao cấp (Upper-Intermediate)',
    description: 'Năng lực hiểu tiếng Nhật dùng trong các tình huống hàng ngày và trong nhiều hoàn cảnh rộng hơn ở mức độ nhất định.',
    color: 'warning',
    passingTotal: 90,
    maxTotal: 180,
    passingSectionMin: 19,
    vocabTarget: 6000,
    kanjiTarget: 1000,
    studyHours: '600 - 800',
    sections: [
      { name: 'Kiến thức ngôn ngữ & Đọc hiểu (言語知識・読解)', durationMin: 105 },
      { name: 'Nghe hiểu (聴解)', durationMin: 50 },
    ],
  },
  n3: {
    code: 'N3',
    name: 'n3',
    title: 'JLPT N3 - Cấp độ Trung cấp (Intermediate)',
    description: 'Cầu nối giữa sơ cấp và trung cao cấp, hiểu tiếng Nhật dùng trong các tình huống đời sống hàng ngày ở mức độ nhất định.',
    color: 'primary',
    passingTotal: 95,
    maxTotal: 180,
    passingSectionMin: 19,
    vocabTarget: 3750,
    kanjiTarget: 650,
    studyHours: '450 - 600',
    sections: [
      { name: 'Kiến thức ngôn ngữ (Từ vựng)', durationMin: 30 },
      { name: 'Kiến thức ngôn ngữ (Ngữ pháp) & Đọc hiểu', durationMin: 70 },
      { name: 'Nghe hiểu', durationMin: 40 },
    ],
  },
  n4: {
    code: 'N4',
    name: 'n4',
    title: 'JLPT N4 - Cấp độ Sơ trung cấp (Elementary)',
    description: 'Hiểu tiếng Nhật căn bản, đọc hiểu văn bản về đời sống thường ngày viết bằng từ vựng và chữ Hán cơ bản.',
    color: 'info',
    passingTotal: 90,
    maxTotal: 180,
    passingSectionMin: 19,
    vocabTarget: 1500,
    kanjiTarget: 300,
    studyHours: '300 - 400',
    sections: [
      { name: 'Kiến thức ngôn ngữ (Từ vựng)', durationMin: 25 },
      { name: 'Kiến thức ngôn ngữ (Ngữ pháp) & Đọc hiểu', durationMin: 55 },
      { name: 'Nghe hiểu', durationMin: 35 },
    ],
  },
  n5: {
    code: 'N5',
    name: 'n5',
    title: 'JLPT N5 - Cấp độ Cơ bản Sơ cấp (Beginner)',
    description: 'Hiểu tiếng Nhật căn bản ở mức độ sơ cấp: Hiragana, Katakana, và các chữ Hán cơ bản sử dụng trong đời sống.',
    color: 'neutral',
    passingTotal: 80,
    maxTotal: 180,
    passingSectionMin: 19,
    vocabTarget: 800,
    kanjiTarget: 100,
    studyHours: '150 - 250',
    sections: [
      { name: 'Kiến thức ngôn ngữ (Từ vựng)', durationMin: 20 },
      { name: 'Kiến thức ngôn ngữ (Ngữ pháp) & Đọc hiểu', durationMin: 40 },
      { name: 'Nghe hiểu', durationMin: 30 },
    ],
  },
};

export function generateStaticParams() {
  return [
    { level: 'n1' },
    { level: 'n2' },
    { level: 'n3' },
    { level: 'n4' },
    { level: 'n5' },
  ];
}

export async function generateMetadata({ params }: LevelPageProps): Promise<Metadata> {
  const { level } = await params;
  const normalized = level.toLowerCase();
  const detail = LEVEL_DATA[normalized];
  if (!detail) {
    return { title: 'Cấp độ không tồn tại - JLPT Online' };
  }

  const canonicalUrl = `https://jlpt.vn/${normalized}`;

  return {
    title: `${detail.title} - Luyện thi chuẩn quốc tế`,
    description: `${detail.description} Điểm đậu tiêu chuẩn: ${detail.passingTotal}/${detail.maxTotal} điểm, ${detail.vocabTarget} từ vựng và ${detail.kanjiTarget} kanji.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `https://jlpt.vn/${normalized}`,
        ja: `https://jlpt.vn/ja/${normalized}`,
        en: `https://jlpt.vn/en/${normalized}`,
      },
    },
    openGraph: {
      title: `${detail.title} - JLPT Online`,
      description: detail.description,
      url: canonicalUrl,
      siteName: 'JLPT Online',
      type: 'article',
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: detail.title,
      description: detail.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LevelIntroductionPage({ params }: LevelPageProps): Promise<React.JSX.Element> {
  const { level } = await params;
  const normalized = level.toLowerCase();
  const detail = LEVEL_DATA[normalized];

  if (!detail) {
    notFound();
  }

  // Schema.org Course & Breadcrumbs Structured Data (SEO-07)
  const courseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: detail.title,
    description: detail.description,
    provider: {
      '@type': 'Organization',
      name: 'JLPT Online',
      sameAs: 'https://jlpt.vn',
    },
    educationalCredentialAwarded: `JLPT ${detail.code} Certificate`,
    timeRequired: `PT${detail.studyHours.split('-')[0]?.trim()}H`,
  };

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
        name: detail.code,
        item: `https://jlpt.vn/${normalized}`,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-6xl py-8 px-4 space-y-8" data-testid="level-intro-page">
      {/* Structured data JSON-LD */}
      <JsonLd id={`course-schema-${normalized}`} data={courseStructuredData} />
      <JsonLd id={`breadcrumb-schema-${normalized}`} data={breadcrumbStructuredData} />

      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">{detail.code}</span>
      </nav>

      {/* Hero Level Banner */}
      <div className="p-8 rounded-3xl bg-surface border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={detail.color} size="md">
            JLPT {detail.code}
          </Badge>
          <span className="text-xs text-slate-400">Tiêu chuẩn quốc tế JEES & Japan Foundation</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {detail.title}
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {detail.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <a className="no-underline" href={`/${normalized}/de-thi`}>
            <Button size="md" variant="primary" data-testid="level-view-exams-btn">
              <BookOpen className="size-4" aria-hidden="true" /> Xem danh sách đề thi {detail.code}
            </Button>
          </a>
          <a className="no-underline" href={`/luyen-tap?level=${detail.code}`}>
            <Button size="md" variant="outline" data-testid="level-start-practice-btn">
              <Target className="size-4" aria-hidden="true" /> Luyện tập theo chuyên đề {detail.code}
            </Button>
          </a>
        </div>
      </div>

      {/* Benchmarks & Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="level-stats-grid">
        <Card className="p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Điểm đậu tiêu chuẩn
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {detail.passingTotal} / {detail.maxTotal}
          </p>
          <span className="text-[11px] text-slate-500">
            Điểm liệt: tối thiểu {detail.passingSectionMin}đ/phần
          </span>
        </Card>

        <Card className="p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Lượng từ vựng mục tiêu
          </span>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            ~{detail.vocabTarget.toLocaleString()} từ
          </p>
          <span className="text-[11px] text-slate-500">
            Bao gồm từ ghép và thành ngữ
          </span>
        </Card>

        <Card className="p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Chữ Hán (Kanji)
          </span>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            ~{detail.kanjiTarget.toLocaleString()} chữ
          </p>
          <span className="text-[11px] text-slate-500">
            Kanji thường dụng trong đề
          </span>
        </Card>

        <Card className="p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
            Thời gian ôn luyện ước tính
          </span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            ~{detail.studyHours} giờ
          </p>
          <span className="text-[11px] text-slate-500">
            Tùy thuộc nền tảng ban đầu
          </span>
        </Card>
      </div>

      {/* Exam Structure */}
      <Card className="p-6 border border-slate-200 dark:border-slate-800 space-y-4">
        <CardHeader>
          <CardTitle as="h2" className="text-xl font-bold">
            Cấu trúc bài thi & Phân bổ thời gian JLPT {detail.code}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.sections.map((sec, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-sm">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {sec.name}
                </span>
              </div>
              <Badge variant="neutral" size="md">
                <Timer className="inline size-4 align-[-2px]" aria-hidden="true" /> {sec.durationMin} phút
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
