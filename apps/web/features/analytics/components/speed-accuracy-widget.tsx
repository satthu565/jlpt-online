'use client';

import { Zap } from 'lucide-react';
import React from 'react';
import type { SpeedAccuracySummary } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { SKILL_LABELS } from '../utils/calculator';
import type { Skill } from '@jlpt/schema';

export interface SpeedAccuracyWidgetProps {
  summary: SpeedAccuracySummary;
  className?: string;
}

export function SpeedAccuracyWidget({
  summary,
  className = '',
}: SpeedAccuracyWidgetProps): React.JSX.Element {
  const {
    avgTimePerQuestionSec,
    avgTimePerSectionSec,
    accuracyPercentage,
    quadrant,
    quadrantLabel,
    assessment,
  } = summary;

  const quadrantBadgeVariant = {
    FAST_AND_ACCURATE: 'success',
    SLOW_AND_ACCURATE: 'primary',
    FAST_AND_INACCURATE: 'warning',
    SLOW_AND_INACCURATE: 'danger',
  }[quadrant] as 'success' | 'primary' | 'warning' | 'danger';

  return (
    <Card
      data-testid="speed-accuracy-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="size-4" aria-hidden="true" /> Phân tích tốc độ & thời gian trung bình
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Đánh giá mối tương quan giữa thời gian làm bài trung bình mỗi câu và tỷ lệ làm đúng.
          </p>
        </div>

        <div>
          <Badge variant={quadrantBadgeVariant} size="sm">
            {quadrantLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Metric 1: Average time per question */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">
            Thời gian trung bình mỗi câu:
          </span>
          <strong
            data-testid="avg-time-per-question"
            className="text-3xl font-extrabold text-blue-900 dark:text-blue-300 font-mono block"
          >
            {avgTimePerQuestionSec} giây
          </strong>
          <span className="text-[11px] text-slate-400">
            (Tiêu chuẩn JLPT khuyến nghị: 45s - 65s/câu)
          </span>
        </div>

        {/* Metric 2: Overall Accuracy */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">
            Độ chính xác tương ứng:
          </span>
          <strong
            data-testid="speed-accuracy-pct"
            className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono block"
          >
            {accuracyPercentage}%
          </strong>
          <span className="text-[11px] text-slate-400">
            Phân loại theo ma trận 4 góc phần tư (Speed-Accuracy Quadrant)
          </span>
        </div>
      </div>

      {/* Average time per section breakdown */}
      {Object.keys(avgTimePerSectionSec).length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            Thời gian trung bình theo từng phần / kỹ năng:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="section-times-breakdown">
            {Object.entries(avgTimePerSectionSec).map(([sec, secTime]) => {
              const label = SKILL_LABELS[sec as Skill] || sec;
              return (
                <div
                  key={sec}
                  data-testid={`section-time-${sec}`}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-xs flex justify-between items-center"
                >
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">
                    {label}
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {secTime}s / câu
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quadrant assessment narrative */}
      <div
        data-testid="speed-assessment-text"
        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
      >
        <span className="font-bold block mb-1">Nhận xét tốc độ làm bài:</span>
        {assessment}
      </div>
    </Card>
  );
}
