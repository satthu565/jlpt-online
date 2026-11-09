'use client';

import { Trophy, ShieldCheck } from 'lucide-react';
import React from 'react';
import type { TargetProgressSummary } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import type { Level } from '@jlpt/schema';

export interface SectionalBenchmark {
  name: string;
  shortLabel: string;
  estimatedScore: number;
  maxScore: number;
  isSafe: boolean;
  questionCount: number;
}

export interface TargetProgressTrackerProps {
  summary: TargetProgressSummary;
  className?: string;
  selectedLevel?: Level | 'ALL';
  onSelectLevel?: (level: Level | 'ALL') => void;
  sectionalBenchmarks?: SectionalBenchmark[];
}

export function TargetProgressTracker({
  summary,
  className = '',
  selectedLevel,
  onSelectLevel,
  sectionalBenchmarks = [],
}: TargetProgressTrackerProps): React.JSX.Element {
  const {
    targetLevel,
    targetScore,
    currentBestScore,
    gapToTarget,
    progressPercentage,
    passProbability,
    readinessLabel,
  } = summary;

  const isAchieved = currentBestScore >= targetScore;
  const levels: (Level | 'ALL')[] = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];

  return (
    <Card
      data-testid="target-progress-tracker"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      {/* Header with Title and Level Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="size-5 text-amber-500" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Mục tiêu &amp; Dự báo kết quả JLPT
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi khoảng cách điểm số, xác suất vượt qua kỳ thi và điều kiện chống điểm liệt.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSelectLevel && (
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs gap-1" role="tablist" aria-label="Bộ lọc cấp độ JLPT">
              {levels.map((lvl) => {
                const isActive = (selectedLevel ?? targetLevel) === lvl;
                return (
                  <Button
                    key={lvl}
                    type="button"
                    variant={isActive ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onSelectLevel(lvl)}
                    className="px-2.5 py-1 h-auto text-xs font-bold rounded-lg"
                  >
                    {lvl === 'ALL' ? 'Tất cả' : lvl}
                  </Button>
                );
              })}
            </div>
          )}

          <Badge variant={isAchieved ? 'success' : passProbability >= 70 ? 'primary' : 'warning'} size="sm">
            {readinessLabel}
          </Badge>
        </div>
      </div>

      {/* Target Metrics Grid */}
      <div className="surface surface--secondary rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Cấp độ mục tiêu:</span>
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
            JLPT {targetLevel}
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Điểm mục tiêu:</span>
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
            {targetScore} / 180đ
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Điểm cao nhất hiện tại:</span>
          <strong
            data-testid="target-best-score"
            className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono"
          >
            {currentBestScore} / 180đ
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Khoảng cách tới đích:</span>
          <strong
            data-testid="target-gap"
            className={`text-sm font-mono font-bold ${
              gapToTarget === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {gapToTarget === 0 ? 'Đã đạt mục tiêu!' : `Còn thiếu ${gapToTarget}đ`}
          </strong>
        </div>
      </div>

      {/* Progress Bar towards target */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Mức độ hoàn thành mục tiêu:
          </span>
          <strong data-testid="target-progress-percentage" className="font-mono text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </strong>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${isAchieved ? 'bg-emerald-500' : 'bg-blue-600'}`}
            // ui-allow-style: chiều rộng theo số liệu, tính lúc chạy
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Pass Probability Metric */}
      <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-blue-950 dark:text-blue-200 block">
            Xác suất đỗ ước tính (Pass Probability):
          </span>
          <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            Tính toán dựa trên phân phối điểm các lần thi gần nhất và ngưỡng đỗ chuẩn của JLPT ({targetLevel}: ≥ 90–100đ).
          </span>
        </div>
        <div
          data-testid="pass-probability-value"
          className="text-2xl font-black text-blue-900 dark:text-blue-300 font-mono"
        >
          {passProbability}%
        </div>
      </div>

      {/* Sectional Cutoff Benchmarks (Chống điểm liệt JLPT) */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Kiểm tra ngưỡng chống điểm liệt từng phần (Chuẩn JLPT ≥ 19/60đ)
          </span>
          <span className="text-[11px] text-slate-400">Tối thiểu: 19 điểm/phần</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(sectionalBenchmarks.length > 0 ? sectionalBenchmarks : [
            { name: 'Kiến thức ngôn ngữ (Từ vựng/Kanji/Ngữ pháp)', shortLabel: 'lang', estimatedScore: Math.round((currentBestScore / 3)), maxScore: 60, isSafe: Math.round((currentBestScore / 3)) >= 19, questionCount: 0 },
            { name: 'Đọc hiểu', shortLabel: 'reading', estimatedScore: Math.round((currentBestScore / 3)), maxScore: 60, isSafe: Math.round((currentBestScore / 3)) >= 19, questionCount: 0 },
            { name: 'Nghe hiểu', shortLabel: 'listening', estimatedScore: Math.round((currentBestScore / 3)), maxScore: 60, isSafe: Math.round((currentBestScore / 3)) >= 19, questionCount: 0 },
          ]).map((sec) => (
            <div
              key={sec.shortLabel}
              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                sec.isSafe
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {sec.name}
                </span>
                <Badge variant={sec.isSafe ? 'success' : 'danger'} size="sm">
                  {sec.isSafe ? 'An toàn' : 'Nguy cơ'}
                </Badge>
              </div>

              <div className="flex items-baseline justify-between pt-0.5">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {sec.estimatedScore} / {sec.maxScore}đ
                </span>
                <span className="text-[10px] text-slate-500">
                  {sec.questionCount > 0 ? `${sec.questionCount} câu đã làm` : 'Chưa có câu'}
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${sec.isSafe ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  // ui-allow-style: chiều rộng theo số liệu, tính lúc chạy
                  style={{ width: `${Math.min(100, Math.round((sec.estimatedScore / sec.maxScore) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
