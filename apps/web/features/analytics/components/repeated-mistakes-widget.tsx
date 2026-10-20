'use client';

import React from 'react';
import type { RepeatedMistakeItem } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';

export interface RepeatedMistakesWidgetProps {
  mistakes: RepeatedMistakeItem[];
  onReviewQuestion?: (questionId: string) => void;
  className?: string;
}

export function RepeatedMistakesWidget({
  mistakes,
  onReviewQuestion,
  className = '',
}: RepeatedMistakesWidgetProps): React.JSX.Element {
  return (
    <Card
      data-testid="repeated-mistakes-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>❌</span> Các câu làm sai nhiều lần
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Danh sách những câu hỏi bạn đã làm sai từ 2 lần trở lên qua các lượt thi.
          </p>
        </div>

        <div>
          <span
            data-testid="repeated-mistakes-count-badge"
            className="text-xs px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
          >
            {mistakes.length} câu làm sai nhiều lần
          </span>
        </div>
      </div>

      {mistakes.length === 0 ? (
        <div
          data-testid="repeated-mistakes-empty"
          className="text-center py-6 text-xs text-slate-500"
        >
          Tuyệt vời! Không có câu hỏi nào bạn làm sai từ 2 lần trở lên.
        </div>
      ) : (
        <div className="space-y-2.5" data-testid="repeated-mistakes-list">
          {mistakes.map((item, idx) => (
            <div
              key={item.questionId || idx}
              data-testid={`mistake-item-${item.questionId}`}
              className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                    Sai {item.wrongCount} / {item.totalAttempts} lần
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {item.level}
                  </span>
                  <span className="text-[11px] text-slate-500">{item.skill}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-japanese line-clamp-2">
                  {item.stemPreview}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a href={`/luyen-tap?pool=wrong&level=${item.level}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReviewQuestion?.(item.questionId)}
                  >
                    Luyện lại câu này
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
