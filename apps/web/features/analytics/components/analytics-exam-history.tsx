'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, ArrowRight, Play } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import type { AttemptRecord } from '../types';

export interface AnalyticsExamHistoryProps {
  attempts: AttemptRecord[];
  targetThreshold?: number;
  /** @deprecated rows link straight to the result / exam room now */
  onOpenExamDetail?: (attempt: AttemptRecord) => void;
  /** @deprecated "Xem tất cả" links to the full history page now */
  onOpenAllHistoryModal?: () => void;
}

const MAX_DONE = 5;
const MAX_IN_PROGRESS = 3;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sortNewestFirst(list: AttemptRecord[]): AttemptRecord[] {
  return [...list].sort((x, y) => new Date(y.submittedAt).getTime() - new Date(x.submittedAt).getTime());
}

export function AnalyticsExamHistory({
  attempts,
  targetThreshold = 95,
}: AnalyticsExamHistoryProps): React.JSX.Element {
  const inProgress = sortNewestFirst(attempts.filter((a) => a.status === 'in_progress')).slice(0, MAX_IN_PROGRESS);
  const done = sortNewestFirst(attempts.filter((a) => a.status !== 'in_progress')).slice(0, MAX_DONE);

  return (
    <Card id="history" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Lịch sử làm đề
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Bài đã nộp (kèm điểm từng phần) và bài đang làm dở để tiếp tục
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs font-bold shrink-0"><Link href="/lich-su">
            Xem tất cả
            <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
          </Link></Button>
      </div>

      {inProgress.length === 0 && done.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa có bài thi nào. Hãy làm một đề để thấy lịch sử tại đây.
        </p>
      )}

      {inProgress.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Đang làm dở
          </h3>
          {inProgress.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs"
            >
              <div className="min-w-0">
                <strong className="block text-slate-900 dark:text-slate-100 truncate">{att.examTitle}</strong>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Bắt đầu {formatDate(att.submittedAt)} · {att.mode === 'real' ? 'Thi thử' : 'Luyện tập'}
                </span>
              </div>
              <Button asChild variant="primary" size="sm" className="shrink-0 text-xs font-bold"><Link href={`/phong-thi?attemptId=${encodeURIComponent(att.id)}`}>
                  <Play className="size-3.5 inline mr-1" aria-hidden="true" />
                  Tiếp tục
                </Link></Button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          {done.map((att) => {
            const mins = Math.round(att.durationSec / 60);
            const failedSections = (att.sections ?? []).filter((s) => s.passed === false || s.score < s.minCutoff);
            const passedTotal = att.passed;
            return (
              <div
                key={att.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <strong className="block text-slate-900 dark:text-slate-100 truncate">{att.examTitle}</strong>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(att.submittedAt)} · {att.mode === 'real' ? 'Thi thử' : 'Luyện tập'} ·{' '}
                        {mins > 0 ? `${mins} phút` : 'chưa đo thời gian'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                        {att.totalScore}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          /{att.maxScore || 180}
                        </span>
                      </strong>
                      <span
                        className={`text-[10px] font-bold block ${
                          passedTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {att.totalScore >= targetThreshold ? '↑ Đủ điểm tổng' : '↓ Dưới ngưỡng tổng'}
                      </span>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="size-8 p-0 text-slate-400 hover:text-slate-600" aria-label="Xem kết quả chi tiết"><Link href={`/ket-qua/${encodeURIComponent(att.id)}`}>
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link></Button>
                  </div>
                </div>

                {att.sections && att.sections.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {att.sections.map((s) => (
                      <span
                        key={s.code || s.name}
                        className={s.score < s.minCutoff ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}
                      >
                        {s.name}: {s.score}/{s.maxScore}
                      </span>
                    ))}
                    {failedSections.length > 0 && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        Dưới điểm liệt: {failedSections.map((s) => s.name).join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
