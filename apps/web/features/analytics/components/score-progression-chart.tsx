'use client';

import { TrendingUp } from 'lucide-react';
import React from 'react';
import type { AttemptRecord } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

export interface ScoreProgressionChartProps {
  attempts: AttemptRecord[];
  passScore?: number;
  className?: string;
}

export function ScoreProgressionChart({
  attempts,
  passScore = 95,
  className = '',
}: ScoreProgressionChartProps): React.JSX.Element {
  if (attempts.length === 0) {
    return (
      <Card
        data-testid="score-progression-empty"
        className={`p-6 text-center text-xs text-slate-500 ${className}`}
      >
        Chưa có bài thi nào được ghi nhận để biểu diễn biểu đồ điểm.
      </Card>
    );
  }

  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );

  const svgWidth = 560;
  const svgHeight = 150;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 20;
  const padBottom = 28;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const maxScoreScale = 180;

  const points = sortedAttempts.map((att, idx) => {
    const x =
      sortedAttempts.length > 1
        ? padLeft + (idx / (sortedAttempts.length - 1)) * chartW
        : padLeft + chartW / 2;
    const y = padTop + (1 - Math.min(1, Math.max(0, att.totalScore / maxScoreScale))) * chartH;
    return { x, y, attempt: att, idx };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints =
    points.length > 1
      ? `${points[0]!.x.toFixed(1)},${(padTop + chartH).toFixed(1)} ${polylinePoints} ${points[points.length - 1]!.x.toFixed(1)},${(padTop + chartH).toFixed(1)}`
      : '';

  const passY = padTop + (1 - passScore / maxScoreScale) * chartH;

  return (
    <Card
      data-testid="score-progression-chart"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            Biểu đồ tiến độ điểm số theo thời gian
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi xu hướng điểm số và mức độ tăng trưởng qua từng lượt thi thử.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-3 h-0.5 bg-rose-500 inline-block border-b border-dashed border-rose-500" />
            <span>Ngưỡng đỗ ({passScore}đ)</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>Điểm đạt được</span>
          </span>
        </div>
      </div>

      {/* Visual SVG Line Trendline */}
      <div className="surface surface--secondary rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80">
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36 min-w-[360px] overflow-visible"
            aria-label="Biểu đồ đường xu hướng điểm số"
          >
            <defs>
              <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid baseline & Y-axis labels */}
            <line
              x1={padLeft}
              y1={padTop + chartH}
              x2={padLeft + chartW}
              y2={padTop + chartH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            <text x={padLeft - 8} y={padTop + chartH + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              0đ
            </text>
            <text x={padLeft - 8} y={padTop + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              180đ
            </text>

            {/* Pass score benchmark dashed line */}
            <line
              x1={padLeft}
              y1={passY}
              x2={padLeft + chartW}
              y2={passY}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={padLeft + chartW + 4}
              y={passY + 3}
              textAnchor="start"
              fontSize="10"
              fill="#f43f5e"
              fontWeight="bold"
            >
              {passScore}đ
            </text>

            {/* Shaded Area under Curve */}
            {areaPoints ? (
              <polygon points={areaPoints} fill="url(#scoreAreaGrad)" />
            ) : null}

            {/* Connecting Trend Line */}
            {points.length > 1 ? (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data Points and Labels */}
            {points.map((p) => {
              const isPassed = p.attempt.totalScore >= passScore;
              return (
                <g key={p.idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill={isPassed ? '#10b981' : '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={Math.max(14, p.y - 8)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={isPassed ? '#059669' : '#1d4ed8'}
                  >
                    {p.attempt.totalScore}đ
                  </text>
                  <text
                    x={p.x}
                    y={padTop + chartH + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                  >
                    #{p.idx + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Visual Timeline Bar Chart List */}
      <div className="space-y-3 pt-1" data-testid="score-timeline-bars">
        {sortedAttempts.map((attempt, idx) => {
          const score = attempt.totalScore;
          const max = attempt.maxScore || 180;
          const pct = Math.min(100, Math.round((score / max) * 100));
          const isPassed = score >= passScore;
          const formattedDate = new Date(attempt.submittedAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });

          return (
            <div
              key={attempt.id || idx}
              data-testid={`score-item-${idx}`}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{attempt.examTitle}</span>
                  <Badge variant="neutral" size="sm">
                    {attempt.level}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">{formattedDate}</span>
                  <span
                    data-testid={`score-value-${idx}`}
                    className={`font-mono font-bold text-sm ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {score} / {max}đ ({attempt.accuracy}%)
                  </span>
                </div>
              </div>

              {/* Progress bar with pass threshold marker */}
              <div className="relative w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${isPassed ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  // ui-allow-style: chiều rộng theo số liệu, tính lúc chạy
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
