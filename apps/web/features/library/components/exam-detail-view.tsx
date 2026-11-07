'use client';

import React from 'react';
import { BookOpen, Check, GraduationCap, Play } from 'lucide-react';
import type { ExamSummary } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { Badge } from '@jlpt/ui/components/badge';

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
        <a href="/" className="text-slate-500 no-underline hover:underline">Trang chủ</a> &gt;{' '}
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

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
          {exam.title}
        </h1>


        {/* Key Metrics */}
        <div className="surface surface--secondary rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 mb-6">
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

        {/* Sections Breakdown */}
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

        {/* Source attribution and License details */}
        {(exam.sourceLabel || exam.licenseLabel) && (
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 space-y-1 mb-6">
            {exam.sourceLabel && (
              <div>
                <strong className="text-slate-700 dark:text-slate-300">Nguồn trích dẫn:</strong>{' '}
                {exam.sourceLabel}
              </div>
        )}
          )}
          {exam.licenseLabel && (
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Giấy phép &amp; Bản quyền:</strong>{' '}
              {exam.licenseLabel}
            </div>
          )}
        </div>

        {/* Chọn chế độ làm bài */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Chọn hình thức làm bài
          </h2>
          <Alert variant="warning" title="Trước khi vào thi">
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              <li>Nhấp vào phương án 1, 2, 3 hoặc 4 để chọn; nhấp lại vào phương án đã chọn để bỏ chọn.</li>
              <li>
                Khi hoàn thành hoặc chuyển sang phần thi tiếp theo, phần thi trước đó <strong>bị khóa hoàn toàn</strong>: bạn không thể xem lại hay sửa đáp án.
              </li>
            </ul>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="relative overflow-hidden p-5 flex flex-col gap-4 border border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                  <GraduationCap className="size-6" aria-hidden="true" />
                </span>
                <div className="flex flex-col items-start gap-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Thi thật (chuẩn JLPT)</h3>
                  <Badge variant="danger" size="sm">Mô phỏng đề thi thật JLPT</Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {['Bấm giờ nghiêm ngặt từng phần', 'Hết giờ tự động nộp bài', 'Không xem đáp án hay giải thích khi đang thi', 'Kết quả tính vào thống kê'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <a href={`/phong-thi?examId=${exam.id}&mode=real&start=1`} className="text-decoration-none mt-auto">
                <Button variant="primary" size="md" className="w-full gap-2">
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  Bắt đầu thi thật
                </Button>
              </a>
            </Card>
            <Card className="relative overflow-hidden p-5 flex flex-col gap-4 border border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
                  <BookOpen className="size-6" aria-hidden="true" />
                </span>
                <div className="flex flex-col items-start gap-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Luyện tập tự do</h3>
                  <Badge variant="info" size="sm">Ôn luyện linh hoạt, không áp lực</Badge>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {['Thời gian linh hoạt, làm từng phần được', 'Phần nghe có thể nghe lại và đổi tốc độ', 'Không ảnh hưởng chỉ số xếp hạng chính thức', 'Không bị tính vào thống kê thi thật'].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <a href={`/phong-thi?examId=${exam.id}&mode=practice&start=1`} className="text-decoration-none mt-auto">
                <Button variant="outline" size="md" className="w-full gap-2 border-sky-500 text-sky-700 dark:text-sky-300">
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  Luyện tập tự do
                </Button>
              </a>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
