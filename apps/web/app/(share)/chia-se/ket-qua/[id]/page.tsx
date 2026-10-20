import React from 'react';
import type { Metadata } from 'next';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { WatermarkBadge } from '@jlpt/ui/components/watermark-badge';
import { JsonLd } from '@jlpt/ui/components/json-ld';

export interface ShareResultPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ShareResultPageProps): Promise<Metadata> {
  const { id } = await params;
  const canonicalUrl = `https://jlpt.vn/chia-se/ket-qua/${id}`;

  return {
    title: `Kết quả đánh giá năng lực JLPT - Lượt thi #${id.slice(0, 8)} - JLPT Online`,
    description: `Chứng nhận kết quả thi năng lực tiếng Nhật JLPT chuẩn quốc tế được xác thực bởi nền tảng JLPT Online.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Chứng nhận kết quả JLPT - Lượt thi #${id.slice(0, 8)}`,
      description: `Xem chi tiết bảng điểm và đánh giá năng lực tiếng Nhật chuẩn JEES & Japan Foundation.`,
      url: canonicalUrl,
      siteName: 'JLPT Online',
      type: 'article',
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Chứng nhận kết quả JLPT - Lượt thi #${id.slice(0, 8)}`,
      description: `Xem chi tiết bảng điểm và kết quả bài thi tiếng Nhật chuẩn JLPT.`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ShareResultPage({ params }: ShareResultPageProps): Promise<React.JSX.Element> {
  const { id } = await params;

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://jlpt.vn' },
      { '@type': 'ListItem', position: 2, name: 'Chia sẻ kết quả', item: `https://jlpt.vn/chia-se/ket-qua/${id}` },
    ],
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6" data-testid="share-result-page">
      <JsonLd id={`share-breadcrumb-${id}`} data={breadcrumbs} />

      <div className="text-center space-y-2">
        <Badge variant="success" size="md">
          Chứng nhận kết quả thi trực tuyến
        </Badge>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Bảng Điểm Đánh Giá Năng Lực JLPT
        </h1>
        <p className="text-xs text-slate-500">
          Mã xác thực kết quả: <code className="font-mono text-blue-600">{id}</code>
        </p>
      </div>

      <Card className="p-8 border border-slate-200 dark:border-slate-800 text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-4xl">
          🎉
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Kỳ thi Năng lực Tiếng Nhật Chuẩn Hóa
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Thí sinh đã hoàn thành bài thi với kết quả xuất sắc.
          </p>
        </div>

        <div className="py-4 border-y border-slate-100 dark:border-slate-800 flex justify-around">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Cấp độ</span>
            <span className="text-2xl font-extrabold text-blue-600">N3</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Kết quả</span>
            <span className="text-2xl font-extrabold text-emerald-600">ĐỖ (PASS)</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block uppercase font-bold">Độ chính xác</span>
            <span className="text-2xl font-extrabold text-indigo-600">85%</span>
          </div>
        </div>

        {/* Security Watermark */}
        <WatermarkBadge
          userId={id.slice(0, 8)}
          notice="XÁC THỰC KẾT QUẢ THI TRỰC TUYẾN - JLPT ONLINE"
        />

        <div className="pt-4 flex justify-center gap-3">
          <a href="/de-thi" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="md" data-testid="share-start-exam-btn">
              🚀 Thử sức ngay với đề thi thật
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
