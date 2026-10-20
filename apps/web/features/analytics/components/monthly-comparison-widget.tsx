'use client';

import React from 'react';
import type { MonthlyProgressStat } from '../types';
import { Card } from '@jlpt/ui/components/card';

export interface MonthlyComparisonWidgetProps {
  monthlyStats: MonthlyProgressStat[];
  className?: string;
}

export function MonthlyComparisonWidget({
  monthlyStats,
  className = '',
}: MonthlyComparisonWidgetProps): React.JSX.Element {
  return (
    <Card
      data-testid="monthly-comparison-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>📅</span> So sánh kết quả theo từng tháng (STAT-07)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Theo dõi mức độ tăng trưởng điểm trung bình và thời lượng ôn luyện qua từng tháng.
        </p>
      </div>

      {monthlyStats.length === 0 ? (
        <div
          data-testid="monthly-comparison-empty"
          className="text-center py-6 text-xs text-slate-500"
        >
          Chưa có dữ liệu bài thi qua các tháng để đối sánh.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            data-testid="monthly-comparison-table"
            className="w-full text-xs text-left border-collapse"
          >
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Tháng</th>
                <th className="py-2.5 px-3 text-center">Số bài đã thi</th>
                <th className="py-2.5 px-3 text-right">Điểm TB</th>
                <th className="py-2.5 px-3 text-right">Độ chính xác TB</th>
                <th className="py-2.5 px-3 text-right">Thời lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthlyStats.map((item) => (
                <tr
                  key={item.monthKey}
                  data-testid={`monthly-row-${item.monthKey}`}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                    {item.monthLabel}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 font-mono">
                    {item.attemptCount} bài
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.avgScore} / 180đ
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.avgAccuracy}%
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500 font-mono">
                    {item.totalDurationMin} phút
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
