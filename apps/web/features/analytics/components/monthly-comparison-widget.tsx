'use client';

import { CalendarDays } from 'lucide-react';
import React from 'react';
import type { MonthlyProgressStat } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

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
          <CalendarDays className="size-4" aria-hidden="true" /> So sánh kết quả theo từng tháng
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
          <Table data-testid="monthly-comparison-table" className="text-left">
            <TableHeader>
              <TableRow className="text-[11px]">
                <TableHead>Tháng</TableHead>
                <TableHead className="text-center">Số bài đã thi</TableHead>
                <TableHead className="text-right">Điểm TB</TableHead>
                <TableHead className="text-right">Độ chính xác TB</TableHead>
                <TableHead className="text-right">Thời lượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyStats.map((item) => (
                <TableRow key={item.monthKey} data-testid={`monthly-row-${item.monthKey}`}>
                  <TableCell className="font-bold">
                    {item.monthLabel}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {item.attemptCount} bài
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {item.avgScore} / 180đ
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {item.avgAccuracy}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.totalDurationMin} phút
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
