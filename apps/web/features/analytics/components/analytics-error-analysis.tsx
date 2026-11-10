'use client';

import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';

export interface ErrorItem {
  name: string;
  incorrect: number;
  total: number;
  reason: string;
}

const DEFAULT_ERROR_TYPES: ErrorItem[] = [
  {
    name: 'Đọc hiểu đoạn dài',
    incorrect: 25,
    total: 40,
    reason: 'Đọc chậm, bỏ qua từ nối và câu kết luận',
  },
  {
    name: 'Tìm kiếm thông tin',
    incorrect: 17,
    total: 25,
    reason: 'Không xác định đúng điều kiện trong bảng / thông báo',
  },
  {
    name: 'Sắp xếp câu',
    incorrect: 22,
    total: 45,
    reason: 'Nhầm quan hệ bổ nghĩa và vị trí trợ từ',
  },
  {
    name: 'Nghe hiểu khái quát',
    incorrect: 22,
    total: 50,
    reason: 'Bỏ lỡ ý chính hoặc ý trái chiều',
  },
  {
    name: 'Từ vựng theo ngữ cảnh',
    incorrect: 13,
    total: 55,
    reason: 'Nhầm các từ có nghĩa gần nhau',
  },
];

const ERROR_REASONS: [string, number][] = [
  ['Thiếu kiến thức từ / mẫu câu', 31],
  ['Hiểu sai ngữ cảnh, phủ định', 26],
  ['Không kịp thời gian', 21],
  ['Nhầm lựa chọn gần nghĩa', 14],
  ['Chưa xác định được', 8],
];

export interface AnalyticsErrorAnalysisProps {
  errorTypes?: ErrorItem[];
  onOpenStudyModal: (mode: string, param?: string) => void;
}

export function AnalyticsErrorAnalysis({
  errorTypes = DEFAULT_ERROR_TYPES,
  onOpenStudyModal,
}: AnalyticsErrorAnalysisProps): React.JSX.Element {
  return (
    <section id="error-analysis" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left Card: Tôi thường sai ở đâu? */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                04 · Tôi thường sai ở đâu?
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Những dạng câu có nhiều lỗi nhất trong bài làm của bạn
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              Lần làm đầu
            </Badge>
          </div>

          <div className="space-y-4 my-2">
            {errorTypes.map((e, i) => {
              const pct = Math.round((e.incorrect / e.total) * 100);
              const isHigh = pct > 55;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <strong className="font-bold text-slate-800 dark:text-slate-200">{e.name}</strong>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {pct}% sai · {e.incorrect}/{e.total} câu
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    {/* ui-allow-style: dynamic error rate progress bar */}
                    <div
                      className={`h-full rounded-full ${
                        isHigh ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }} /* ui-allow-style: dynamic error rate progress bar */
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{e.reason}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenStudyModal('error', e.name)}
                    className="h-auto p-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    Xem nguyên nhân và luyện tập →
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <AlertCircle className="size-3.5 shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
          <span>
            Tỷ lệ sai cần được đọc cùng số lượng câu đã làm; không kết luận vội từ một nhóm có quá ít câu.
          </span>
        </div>
      </Card>

      {/* Right Card: Vì sao tôi thường sai? */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Vì sao tôi thường sai?
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Phân loại nguyên nhân từ bước xem lại bài làm
            </p>
          </div>

          <div className="space-y-3.5 my-2">
            {ERROR_REASONS.map(([name, p], idx) => {
              const widthPct = Math.min(100, Math.round((p / 35) * 100));
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{p}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    {/* ui-allow-style: dynamic reason track width */}
                    <div
                      className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full"
                      style={{ width: `${widthPct}%` }} /* ui-allow-style: dynamic reason track width */
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 block mb-1">
              Gợi ý cách ghi nhận nguyên nhân:
            </strong>
            Sau khi xem lời giải, người học tự chọn lý do sai; hệ thống có thể gợi ý nhưng không khẳng định nguyên nhân chỉ từ đúng/sai thuần túy.
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => onOpenStudyModal('review')}
          className="w-full justify-center mt-4"
        >
          Ôn lại câu sai
          <ArrowRight className="size-4 inline ml-1.5" aria-hidden="true" />
        </Button>
      </Card>
    </section>
  );
}
