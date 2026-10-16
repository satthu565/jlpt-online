'use client';

import React from 'react';
import type { ExamWithUserStatus } from '../types';
import { Card, Badge, Button } from '@jlpt/ui';

export interface ExamCardProps {
  exam: ExamWithUserStatus;
  className?: string;
}

export function ExamCard({
  exam,
  className = '',
}: ExamCardProps): React.JSX.Element {
  const totalDurationSec = exam.sections.reduce((acc, s) => acc + s.durationSec, 0);
  const totalMinutes = Math.round(totalDurationSec / 60);

  // Level badge color
  const levelVariant = {
    N1: 'danger',
    N2: 'warning',
    N3: 'primary',
    N4: 'info',
    N5: 'neutral',
  }[exam.level] as 'danger' | 'warning' | 'primary' | 'info' | 'neutral';

  // Kind badge label (LIB-05)
  const kindLabel = {
    original: 'Đề thi thật chính thức',
    practice: 'Đề luyện tự biên soạn',
    mixed: 'Đề trộn đa nguồn',
    custom: 'Đề tùy biến',
  }[exam.kind] || 'Đề thi';

  // User status badge (LIB-08)
  const renderStatusBadge = () => {
    if (!exam.userStatus || exam.userStatus === 'not_started') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
          Chưa làm
        </span>
      );
    }
    if (exam.userStatus === 'in_progress') {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium">
          Đang làm dở
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
        Đã hoàn thành {exam.bestScore !== undefined && exam.bestScore !== null ? `(${exam.bestScore}đ)` : ''}
      </span>
    );
  };

  return (
    <Card
      className={`jlpt-exam-card flex flex-col justify-between hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div>
        {/* Top bar: Level, Kind, Year/Session, User Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Badge variant={levelVariant} size="sm">
              {exam.level}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              {kindLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {exam.year && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {exam.year}{exam.session ? `/${exam.session}` : ''}
              </span>
            )}
            {renderStatusBadge()}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
          {exam.title}
        </h3>

        {/* Exam stats: Question count, Duration, Sections (LIB-07) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            Số câu: <strong className="text-slate-900 dark:text-slate-100">{exam.totalQuestions} câu</strong>
          </div>
          <div>
            Thời gian: <strong className="text-slate-900 dark:text-slate-100">{totalMinutes} phút</strong>
          </div>
          <div>
            Phần thi: <strong className="text-slate-900 dark:text-slate-100">{exam.sections.length} phần</strong>
          </div>
        </div>

        {/* Sections Breakdown (LIB-07) */}
        <div className="space-y-1 mb-4 text-xs">
          {exam.sections.map((sec, idx) => (
            <div key={idx} className="flex justify-between text-slate-600 dark:text-slate-400">
              <span className="truncate max-w-[200px]">{sec.title}</span>
              <span className="font-mono">{Math.round(sec.durationSec / 60)} phút</span>
            </div>
          ))}
        </div>

        {/* Source attribution and License details (LIB-15) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mb-4">
          {exam.sourceLabel && (
            <div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Nguồn đề:</span>{' '}
              {exam.sourceLabel}
            </div>
          )}
          {exam.licenseLabel && (
            <div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Bản quyền:</span>{' '}
              {exam.licenseLabel}
            </div>
          )}
          <div>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Phiên bản:</span> v{exam.publishedVersion}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2">
        <a href={`/phong-thi?examId=${exam.id}`} className="flex-1 text-decoration-none">
          <Button variant="primary" size="sm" className="w-full">
            Vào thi ngay
          </Button>
        </a>
        <a href={`/de-thi/${exam.slug}`} className="text-decoration-none">
          <Button variant="outline" size="sm">
            Chi tiết
          </Button>
        </a>
      </div>
    </Card>
  );
}
