'use client';

import React from 'react';
import { SAMPLE_EXAM_SUMMARIES } from '../../../features/exam/fixtures/exam-fixtures';
import { LibraryView } from '../../../features/library';

export default function ExamLibraryPage(): React.JSX.Element {
  // Public HTML rendering: completely free of candidate PII (Acceptance 3)
  const exams = SAMPLE_EXAM_SUMMARIES;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Thư viện đề thi JLPT N1–N5
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Tổng hợp đề thi thật chính thức và đề thi thử nghiệm chuẩn cấu trúc đề thi năng lực tiếng Nhật quốc tế từ N1 đến N5.
        </p>
      </div>

      {/* Library View with full filters and search (LIB-01..08, LIB-15) */}
      <LibraryView exams={exams} />
    </div>
  );
}
