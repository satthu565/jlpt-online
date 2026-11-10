'use client';

import React from 'react';
import { FileText, ChevronRight, ArrowRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import type { AttemptRecord } from '../types';

export interface HistoryItemDisplay {
  id: string;
  title: string;
  date: string;
  score: number;
  maxScore: number;
  duration: string;
  passed: boolean;
  threshold: number;
}

export interface AnalyticsExamHistoryProps {
  attempts: AttemptRecord[];
  targetThreshold?: number;
  onOpenExamDetail: (attempt: AttemptRecord) => void;
  onOpenAllHistoryModal: () => void;
}

const DEFAULT_HISTORY_ITEMS: HistoryItemDisplay[] = [
  {
    id: 'h1',
    title: 'JLPT N3 – 12/2024',
    date: '08/11/2026',
    score: 126,
    maxScore: 180,
    duration: '142 phút',
    passed: true,
    threshold: 95,
  },
  {
    id: 'h2',
    title: 'JLPT N3 – 07/2024',
    date: '05/11/2026',
    score: 112,
    maxScore: 180,
    duration: '151 phút',
    passed: true,
    threshold: 95,
  },
  {
    id: 'h3',
    title: 'JLPT N3 – 12/2023',
    date: '02/11/2026',
    score: 115,
    maxScore: 180,
    duration: '145 phút',
    passed: true,
    threshold: 95,
  },
  {
    id: 'h4',
    title: 'JLPT N3 – 07/2022',
    date: '30/10/2026',
    score: 88,
    maxScore: 180,
    duration: '160 phút',
    passed: false,
    threshold: 95,
  },
];

export function AnalyticsExamHistory({
  attempts,
  targetThreshold = 95,
  onOpenExamDetail,
  onOpenAllHistoryModal,
}: AnalyticsExamHistoryProps): React.JSX.Element {
  const displayItems: HistoryItemDisplay[] =
    attempts.length > 0
      ? attempts.slice(0, 5).map((att) => {
          const dateStr = new Date(att.submittedAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const mins = Math.round(att.durationSec / 60);
          return {
            id: att.id,
            title: att.examTitle || `Đề thi JLPT ${att.level}`,
            date: dateStr,
            score: att.totalScore,
            maxScore: att.maxScore || 180,
            duration: mins > 0 ? `${mins} phút` : 'Đang cập nhật',
            passed: att.passed,
            threshold: targetThreshold,
          };
        })
      : DEFAULT_HISTORY_ITEMS;

  return (
    <Card id="history" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Lịch sử làm đề
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Những bài thi bạn vừa hoàn thành
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAllHistoryModal}
          className="text-xs font-bold shrink-0"
        >
          Xem tất cả
          <ArrowRight className="size-3.5 inline ml-1.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-3">
        {displayItems.map((item, idx) => {
          const rawAttempt = attempts.find((a) => a.id === item.id) || {
            id: item.id,
            examId: 'demo-exam',
            examTitle: item.title,
            level: 'N3' as const,
            mode: 'real' as const,
            totalScore: item.score,
            maxScore: item.maxScore,
            accuracy: Math.round((item.score / item.maxScore) * 100),
            passed: item.passed,
            durationSec: 142 * 60,
            submittedAt: '2026-11-08T10:00:00Z',
          };

          return (
            <div
              key={item.id || idx}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs"
            >
              <div className="flex items-center gap-3 min-w-0 pr-3">
                <span className="size-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileText className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <strong className="block text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </strong>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {item.date} · {item.duration}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  {rawAttempt.status === 'in_progress' ? (
                    <>
                      <strong className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                        ﾄ紳ng lﾃm d盻・                      </strong>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                        Chﾆｰa n盻冪 bﾃi
                      </span>
                    </>
                  ) : (
                    <>
                      <strong className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block">
                        {item.score}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                          /{item.maxScore}
                        </span>
                      </strong>
                      <span
                        className={`text-[10px] font-bold block ${
                          item.passed
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.passed ? '竊・Trﾃｪn ngﾆｰ盻｡ng t盻貧g' : '竊・Dﾆｰ盻嬖 ngﾆｰ盻｡ng t盻貧g'}
                      </span>
                    </>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenExamDetail(rawAttempt)}
                  className="size-8 p-0 text-slate-400 hover:text-slate-600"
                  aria-label="Xem chi tiết đề thi"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
