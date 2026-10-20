'use client';

import { AlertTriangle, Check, Target } from 'lucide-react';
import React from 'react';
import type { TrueProgressComparison } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

export interface TrueProgressWidgetProps {
  progress: TrueProgressComparison;
  className?: string;
}

/**
 * Acceptance Criteria 3:
 * "Dashboard dữ liệu tính tay đúng, không trộn câu quen với câu mới"
 *
 * Strictly isolates performance on fresh unseen questions from familiar repeated questions
 * to uncover genuine mastery and familiarity inflation.
 */
export function TrueProgressWidget({
  progress,
  className = '',
}: TrueProgressWidgetProps): React.JSX.Element {
  const {
    unseenAccuracy,
    unseenCount,
    familiarAccuracy,
    familiarCount,
    familiarityDelta,
    familiarityInflationIndex,
    isInflatedByFamiliarity,
    assessment,
    recommendedMode,
  } = progress;

  const modeLabels: Record<string, string> = {
    unseen_practice: 'Luyện tập câu mới (Unseen Mode)',
    balanced_practice: 'Luyện tập cân bằng (Balanced Mode)',
    challenge: 'Thử thách nâng cao (Challenge Mode)',
  };

  return (
    <Card
      data-testid="true-progress-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="size-5" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Đối sánh tiến độ thực chất (Không trộn câu quen với câu mới)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Phân tách tuyệt đối giữa năng lực làm câu hỏi mới và kết quả làm lại các câu quen thuộc để phát hiện lạm phát điểm số.
          </p>
        </div>

        <div>
          {isInflatedByFamiliarity ? (
            <Badge variant="warning" size="sm">
              <AlertTriangle className="inline size-4 align-[-2px]" aria-hidden="true" /> Có dấu hiệu lạm phát điểm (+{familiarityDelta}%)
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> Tiến độ thực chất đáng tin cậy
            </Badge>
          )}
        </div>
      </div>

      {/* Side-by-side comparison: Unseen vs Familiar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Fresh Unseen Questions (Câu hỏi mới chưa từng làm) */}
        <div
          data-testid="unseen-stats-card"
          className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Câu hỏi mới (Fresh / Unseen)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-bold">
              Thực lực chuẩn thi
            </span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span
              data-testid="unseen-accuracy-value"
              className="text-3xl font-extrabold text-blue-950 dark:text-blue-100 font-mono"
            >
              {unseenAccuracy}%
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              chính xác trên <strong data-testid="unseen-count-value">{unseenCount}</strong> câu mới
            </span>
          </div>

          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Phản ánh chính xác khả năng ứng biến với đề thi thực tế khi bạn không biết trước câu hỏi.
          </p>
        </div>

        {/* 2. Familiar Repeated Questions (Câu quen thuộc đã từng làm) */}
        <div
          data-testid="familiar-stats-card"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Câu quen thuộc (Familiar / Retake)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-bold">
              Ghi nhớ ôn tập
            </span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span
              data-testid="familiar-accuracy-value"
              className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono"
            >
              {familiarAccuracy}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              chính xác trên <strong data-testid="familiar-count-value">{familiarCount}</strong> câu làm lại
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Kết quả của quá trình ghi nhớ và xem lại đáp án trong quá khứ.
          </p>
        </div>
      </div>

      {/* Delta & Inflation Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Chênh lệch do quen câu (Delta):</span>
          <strong
            data-testid="familiarity-delta-value"
            className={`font-mono text-sm ${familiarityDelta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}
          >
            {familiarityDelta > 0 ? `+${familiarityDelta}%` : `${familiarityDelta}%`}
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Chỉ số lạm phát quen thuộc:</span>
          <strong
            data-testid="familiarity-inflation-index-value"
            className="font-mono text-sm text-slate-800 dark:text-slate-200"
          >
            {familiarityInflationIndex}
          </strong>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 block">Chế độ đề xuất khắc phục:</span>
          <strong
            data-testid="recommended-mode-value"
            className="text-xs text-blue-600 dark:text-blue-400 font-bold"
          >
            {modeLabels[recommendedMode] || recommendedMode}
          </strong>
        </div>
      </div>

      {/* Assessment narrative */}
      <div
        data-testid="progress-assessment-text"
        className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
      >
        <span className="font-bold block mb-1">Đánh giá thực chất:</span>
        {assessment}
      </div>
    </Card>
  );
}
