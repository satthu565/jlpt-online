'use client';

import React, { use } from 'react';
import { findExamSummaryBySlug } from '../../../../features/exam/fixtures/exam-fixtures';
import { ExamDetailView } from '../../../../features/library';

export interface ExamDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function ExamDetailPage({ params }: ExamDetailPageProps): React.JSX.Element {
  const { slug } = use(params);
  const exam = findExamSummaryBySlug(slug);

  if (!exam) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Không tìm thấy đề thi
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Đề thi với mã &ldquo;{slug}&rdquo; không tồn tại hoặc đã được gỡ xuống theo chính sách bản quyền.
        </p>
        <a
          href="/de-thi"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
        >
          Trở về thư viện đề thi
        </a>
      </div>
    );
  }

  // Public HTML rendering: completely free of candidate PII (Acceptance 3)
  return (
    <div className="py-8 px-4">
      <ExamDetailView exam={exam} />
    </div>
  );
}
