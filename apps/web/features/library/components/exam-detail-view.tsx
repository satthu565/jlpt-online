'use client';

import React from 'react';
import type { ExamSummary } from '@jlpt/schema';
import { Card, Button } from '@jlpt/ui';

export interface ExamDetailViewProps {
  exam: ExamSummary & { description?: string };
  className?: string;
}

export function ExamDetailView({
  exam,
  className = '',
}: ExamDetailViewProps): React.JSX.Element {
  const totalDurationSec = exam.sections.reduce((acc, s) => acc + s.durationSec, 0);
  const totalMinutes = Math.round(totalDurationSec / 60);

  const kindLabel = {
    original: 'Đề thi thật chính thức (Official)',
    practice: 'Đề thi thử biên soạn theo chuẩn JLPT',
    mixed: 'Đề trộn từ ngân hàng câu hỏi',
    custom: 'Đề tùy biến',
  }[exam.kind] || exam.kind;

  return (
    <div className={`jlpt-exam-detail max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Breadcrumb */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <a href="/de-thi" className="hover:underline">Thư viện đề thi</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">{exam.title}</span>
      </nav>

      {/* Hero Card */}
      <Card className="border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold px-3 py-1 rounded-lg bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 font-mono">
              {exam.level}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {kindLabel}
            </span>
          </div>

          {exam.year && (
            <span className="text-sm text-slate-500 font-mono">
              Kỳ thi: {exam.year}{exam.session ? ` / Tháng ${exam.session}` : ''}
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
          {exam.title}
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {exam.description || 'Đề thi được số hóa đầy đủ định dạng rich text, furigana ruby, bài đọc đối chiếu và âm thanh chuẩn theo khung năng lực tiếng Nhật quốc tế JLPT.'}
        </p>

        {/* Key Metrics (LIB-07) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 mb-6">
          <div>
            <span className="block text-xs text-slate-500 mb-0.5">Tổng số câu</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {exam.totalQuestions} câu
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 mb-0.5">Tổng thời gian</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {totalMinutes} phút
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 mb-0.5">Số phần thi</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {exam.sections.length} phần
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 mb-0.5">Phiên bản đề</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              v{exam.publishedVersion}
            </span>
          </div>
        </div>

        {/* Sections Breakdown (LIB-07) */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Cấu trúc các phần thi
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {exam.sections.map((sec, idx) => (
              <div key={idx} className="p-3.5 flex justify-between items-center text-xs bg-white dark:bg-slate-900">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Phần {idx + 1}: {sec.title}
                </span>
                <span className="font-mono text-slate-500">
                  {Math.round(sec.durationSec / 60)} phút ({sec.durationSec} giây)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source attribution and License details (LIB-15) */}
        <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-6">
          {exam.sourceLabel && (
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Nguồn trích dẫn:</strong>{' '}
              {exam.sourceLabel}
            </div>
          )}
          {exam.licenseLabel && (
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Giấy phép &amp; Bản quyền:</strong>{' '}
              {exam.licenseLabel}
            </div>
          )}
          <div>
            <strong className="text-slate-700 dark:text-slate-300">Chính sách:</strong> Dữ liệu đề thi công khai không chứa đáp án chuẩn trước khi hoàn thành bài thi.
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <a href={`/phong-thi?examId=${exam.id}&mode=real`} className="text-decoration-none">
            <Button variant="primary" size="md">
              Bắt đầu thi thật (Bấm giờ nghiêm ngặt)
            </Button>
          </a>
          <a href={`/phong-thi?examId=${exam.id}&mode=practice`} className="text-decoration-none">
            <Button variant="outline" size="md">
              Luyện tập tự do (Tùy chọn thời gian)
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
