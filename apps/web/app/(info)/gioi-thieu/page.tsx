import { BookOpen, Target } from 'lucide-react';
import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { ExamHero } from '../../../features/library';

export const metadata: Metadata = {
  title: 'Giới thiệu Nền tảng Luyện thi JLPT Online Chuẩn Quốc tế',
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn hóa cấu trúc JEES & Japan Foundation từ N5 đến N1.',
  alternates: {
    canonical: 'https://jlpt.vn/gioi-thieu',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage(): React.JSX.Element {
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Giới thiệu', item: 'https://jlpt.vn/gioi-thieu' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="about-page">
      <ExamHero
        title="Về Nền tảng Luyện thi Tiếng Nhật Trực tuyến JLPT Online"
        subtitle="Hệ thống luyện thi và thi thử mô phỏng chính xác phòng thi thực tế với công nghệ đo thời gian máy chủ và phân tích điểm số tự động."
        minimal
        background="gradient"
      />

      <div className="container py-8 space-y-6">
        <JsonLd id="about-breadcrumbs" data={breadcrumbs} />

        {/* Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
            <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">Giới thiệu</span>
          </nav>
          <Badge variant="primary" size="md">
            JLPT Online V1–V4
          </Badge>
        </div>

        <Card className="p-6 md:p-8 border border-slate-200 dark:border-slate-800 space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Sứ mệnh & Mục tiêu
        </h2>
        <p>
          JLPT Online được xây dựng nhằm mang lại trải nghiệm thi thử công bằng, minh bạch và chính xác nhất cho các bạn học viên ôn luyện kỳ thi Năng lực Tiếng Nhật (JLPT) từ cấp độ sơ cấp N5 đến cao cấp N1.
        </p>
        <p>
          Hệ thống đảm bảo tính nghiêm ngặt với quy chế thi chống rò rỉ đáp án (Zero Answer Leak), đồng hồ máy chủ độc lập không phụ thuộc client, và hệ thống phân tích điểm số chi tiết từng chuyên đề (Từ vựng, Ngữ pháp, Đọc hiểu, Nghe hiểu).
        </p>

        <div className="pt-4 flex flex-wrap gap-3">
          <a className="no-underline" href="/n3">
            <Button variant="primary" size="md">
              <Target className="size-4" aria-hidden="true" /> Khám phá cấp độ JLPT N3
            </Button>
          </a>
          <a className="no-underline" href="/de-thi">
            <Button variant="outline" size="md">
              <BookOpen className="size-4" aria-hidden="true" /> Xem thư viện đề thi
            </Button>
          </a>
        </div>
      </Card>

      <Card className="space-y-3 p-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300" id="nguon-du-lieu">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nguồn dữ liệu và giấy phép</h2>
        <p>
          Từ điển (cách đọc, từ loại, nghĩa) và dữ liệu kanji lấy từ{' '}
          <a href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project">JMdict</a> và{' '}
          <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project">KANJIDIC2</a> của Electronic Dictionary
          Research and Development Group (EDRDG), dùng theo giấy phép{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0</a>.
        </p>
        <p className="text-xs text-slate-500" lang="en">
          This publication has included material from the JMdict and KANJIDIC2 dictionary files in accordance with the
          licence provisions of the Electronic Dictionaries Research Group. See{' '}
          <a href="https://www.edrdg.org/edrdg/licence.html">www.edrdg.org/edrdg/licence.html</a>.
        </p>
      </Card>
      </div>
    </div>
  );
}
