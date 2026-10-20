'use client';

import React from 'react';
import type { PriorityRecommendation } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';

export interface NextPriorityWidgetProps {
  recommendation: PriorityRecommendation;
  className?: string;
}

export function NextPriorityWidget({
  recommendation,
  className = '',
}: NextPriorityWidgetProps): React.JSX.Element {
  const { prioritySkill, skillLabel, currentAccuracy, targetAccuracy, reason, suggestedAction } =
    recommendation;

  return (
    <Card
      data-testid="next-priority-widget"
      className={`border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-900 dark:to-indigo-950/30 p-6 space-y-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
            Khuyến nghị học tập cá nhân hóa
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
            <span>💡</span> Kỹ năng nên ưu tiên học tiếp: <span className="text-indigo-600 dark:text-indigo-400">{skillLabel}</span>
          </h3>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 block">Độ chính xác hiện tại:</span>
          <strong
            data-testid="priority-current-accuracy"
            className="text-base font-mono font-bold text-rose-600 dark:text-rose-400"
          >
            {currentAccuracy}% / Mục tiêu {targetAccuracy}%
          </strong>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/40">
          <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Lý do cần ưu tiên:
          </span>
          <p data-testid="priority-reason-text" className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {reason}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-indigo-100/60 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
          <span className="font-bold text-indigo-950 dark:text-indigo-200 block mb-1">
            Hành động đề xuất (Actionable Step):
          </span>
          <p data-testid="priority-action-text" className="text-indigo-900 dark:text-indigo-300 leading-relaxed">
            {suggestedAction}
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <a href={`/luyen-tap?skill=${prioritySkill}`}>
          <Button variant="primary" size="sm" data-testid="practice-priority-skill-btn">
            Luyện tập kỹ năng này ngay →
          </Button>
        </a>
      </div>
    </Card>
  );
}
