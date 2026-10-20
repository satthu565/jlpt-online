'use client';

import { ScrollText } from 'lucide-react';
import React from 'react';
import type { ExamHistoryItem } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';

export interface HistoryViewProps {
  historyItems: ExamHistoryItem[];
  className?: string;
}

export function HistoryView({
  historyItems,
  className = '',
}: HistoryViewProps): React.JSX.Element {
  return (
    <div className={`jlpt-history-view space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Lịch sử các lần làm bài thi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kết quả của bạn được lưu trữ vĩnh viễn theo tài khoản để theo dõi tiến độ học tập.
          </p>
        </div>

        <a href="/de-thi">
          <Button variant="outline" size="sm">
            + Làm thêm đề mới
          </Button>
        </a>
      </div>

      {historyItems.length === 0 ? (
        <Card className="text-center py-16 p-8 border border-slate-200 dark:border-slate-800">
          <ScrollText className="mx-auto mb-3 size-10" role="img" aria-label="Biểu tượng lịch sử" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            Chưa có lịch sử làm bài thi
          </h3>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
            Bạn chưa hoàn thành bài thi nào. Hãy vào Thư viện đề thi và bắt đầu thử sức ngay!
          </p>
          <a href="/de-thi">
            <Button variant="primary" size="md">
              Khám phá thư viện đề thi
            </Button>
          </a>
        </Card>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {historyItems.map((item) => {
            const isSubmitted = item.status === 'submitted';
            const isPassed = item.passed;
            const formattedDate = item.submittedAt
              ? new Date(item.submittedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date(item.startedAt).toLocaleDateString('vi-VN');

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Left: Exam title, Level badge, Date, Mode */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {item.examLevel && (
                      <Badge variant="primary" size="sm">
                        {item.examLevel}
                      </Badge>
                    )}
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.examTitle || `Đề thi JLPT (${item.examId.slice(0, 8)})`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono">
                    <span>Mã lần thi: #{item.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>Ngày: {formattedDate}</span>
                    <span>•</span>
                    <span className="capitalize">
                      Chế độ: {item.mode === 'real' ? 'Thi thật' : 'Luyện tập'}
                    </span>
                  </div>
                </div>

                {/* Right: Score, Result Badge, Review Action */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    {isSubmitted ? (
                      <div>
                        <div className="flex items-center gap-2 justify-end" data-testid="history-attempt-result">
                          <span className="text-base font-extrabold font-mono text-slate-900 dark:text-slate-100">
                            {item.score !== null ? `${item.score}đ` : 'Chờ chấm'}
                          </span>
                          {(item as { isEstimated?: boolean }).isEstimated && (
                            <span className="text-[10px] text-slate-500 font-normal" data-testid="history-estimate-label">
                              ({(item as { label?: string }).label || 'ước lượng'})
                            </span>
                          )}
                          <span
                            data-testid={isPassed ? 'history-badge-pass' : 'history-badge-fail'}
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              isPassed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {isPassed ? 'ĐỖ' : 'TRƯỢT'}
                          </span>
                        </div>
                        {item.accuracy !== undefined && (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Độ chính xác: {Math.round(item.accuracy)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                        Đang làm dở
                      </span>
                    )}
                  </div>

                  {isSubmitted ? (
                    <a href={`/ket-qua/${item.id}`} className="text-decoration-none">
                      <Button variant="outline" size="sm">
                        Xem lại bài làm
                      </Button>
                    </a>
                  ) : (
                    <a href={`/phong-thi?attemptId=${item.id}`} className="text-decoration-none">
                      <Button variant="primary" size="sm">
                        Tiếp tục làm bài
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
