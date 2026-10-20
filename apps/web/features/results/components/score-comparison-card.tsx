import React from 'react';
import type { Result } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';

export interface ScoreComparisonCardProps {
  currentResult: Result;
  previousResult: Result | null | undefined;
  className?: string;
}

export function ScoreComparisonCard({
  currentResult,
  previousResult,
  className = '',
}: ScoreComparisonCardProps): React.JSX.Element | null {
  if (!previousResult) {
    return (
      <Card className={`jlpt-score-comparison p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ℹ️</span>
          <span>Đây là lần đầu tiên bạn làm đề thi này. Hãy tiếp tục luyện tập để theo dõi biểu đồ tiến bộ ở các lần sau!</span>
        </div>
      </Card>
    );
  }

  const scoreDiff = currentResult.scoring.total - previousResult.scoring.total;
  const accuracyDiff = Math.round(currentResult.accuracy - previousResult.accuracy);
  const correctDiff = currentResult.totals.correct - previousResult.totals.correct;
  const isImproved = scoreDiff > 0;

  return (
    <Card className={`jlpt-score-comparison p-6 border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            So sánh với lần làm trước (SCORE-10)
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isImproved
              ? `🎉 Bạn đã tiến bộ +${scoreDiff} điểm so với lần trước!`
              : scoreDiff === 0
              ? 'Điểm số của bạn tương đương với lần làm trước.'
              : `Điểm số giảm ${Math.abs(scoreDiff)} điểm so với lần trước.`}
          </h3>
        </div>

        <span
          className={`px-3 py-1 rounded-xl text-xs font-extrabold font-mono ${
            scoreDiff >= 0
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} điểm
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Score Comparison */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="block text-xs text-slate-500 mb-1">Điểm quy đổi</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              {currentResult.scoring.total}đ
            </span>
            <span className="text-xs text-slate-400">
              Lần trước: {previousResult.scoring.total}đ
            </span>
          </div>
        </div>

        {/* Accuracy Comparison */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="block text-xs text-slate-500 mb-1">Tỷ lệ chính xác</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              {Math.round(currentResult.accuracy)}%
            </span>
            <span className={`text-xs font-semibold ${accuracyDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {accuracyDiff >= 0 ? `+${accuracyDiff}%` : `${accuracyDiff}%`}
            </span>
          </div>
        </div>

        {/* Correct questions comparison */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="block text-xs text-slate-500 mb-1">Số câu làm đúng</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
              {currentResult.totals.correct} câu
            </span>
            <span className={`text-xs font-semibold ${correctDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {correctDiff >= 0 ? `+${correctDiff}` : correctDiff} câu
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
