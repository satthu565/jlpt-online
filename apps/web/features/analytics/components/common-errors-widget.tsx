'use client';

import React from 'react';
import { Card } from '@jlpt/ui';

export interface CommonErrorItem {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface CommonErrorsWidgetProps {
  errors: CommonErrorItem[];
  className?: string;
}

export function CommonErrorsWidget({
  errors,
  className = '',
}: CommonErrorsWidgetProps): React.JSX.Element {
  return (
    <Card
      data-testid="common-errors-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🔍</span> Phân tích lỗi sai thường gặp (STAT-06)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Nhận diện các kiểu bẫy và lỗ hổng kiến thức dẫn đến mất điểm nhiều nhất.
        </p>
      </div>

      {errors.length === 0 ? (
        <div
          data-testid="common-errors-empty"
          className="text-center py-6 text-xs text-slate-500"
        >
          Chưa phát hiện mẫu hình lỗi sai lặp lại nổi bật.
        </div>
      ) : (
        <div className="space-y-3" data-testid="common-errors-list">
          {errors.map((err) => (
            <div
              key={err.category}
              data-testid={`common-error-item-${err.category}`}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {err.label}
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {err.count} lỗi ({err.percentage}%)
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full"
                  style={{ width: `${err.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
