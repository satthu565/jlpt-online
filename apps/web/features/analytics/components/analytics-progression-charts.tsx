'use client';

import React from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

export interface ProgressionDataPoint {
  attemptNumber: number;
  score: number;
  accuracy: number;
  durationMin: number;
  label?: string;
}

const DEFAULT_POINTS: ProgressionDataPoint[] = [
  { attemptNumber: 1, score: 82, accuracy: 49, durationMin: 165 },
  { attemptNumber: 2, score: 91, accuracy: 54, durationMin: 161 },
  { attemptNumber: 3, score: 87, accuracy: 51, durationMin: 163 },
  { attemptNumber: 4, score: 100, accuracy: 59, durationMin: 158 },
  { attemptNumber: 5, score: 96, accuracy: 57, durationMin: 153 },
  { attemptNumber: 6, score: 107, accuracy: 63, durationMin: 152 },
  { attemptNumber: 7, score: 103, accuracy: 61, durationMin: 148 },
  { attemptNumber: 8, score: 115, accuracy: 68, durationMin: 151 },
  { attemptNumber: 9, score: 112, accuracy: 66, durationMin: 145 },
  { attemptNumber: 10, score: 126, accuracy: 73, durationMin: 142 },
];

export interface AnalyticsProgressionChartsProps {
  points?: ProgressionDataPoint[];
  thresholdScore?: number;
}

export function AnalyticsProgressionCharts({
  points = DEFAULT_POINTS,
  thresholdScore = 95,
}: AnalyticsProgressionChartsProps): React.JSX.Element {
  const currentPoints = points.length >= 2 ? points : DEFAULT_POINTS;

  // Chart SVG bounds
  const width = 620;
  const height = 235;
  const paddingX = 45;
  const paddingY = 25;
  const bottomY = 195;
  const maxScore = 180;
  const minScore = 0;

  const count = currentPoints.length;
  const xStep = (width - paddingX * 2) / Math.max(1, count - 1);

  const getX = (index: number) => paddingX + index * xStep;
  const getY = (score: number) =>
    paddingY + (1 - (score - minScore) / (maxScore - minScore)) * (bottomY - paddingY);

  const polylineCoords = currentPoints.map((p, i) => `${getX(i).toFixed(1)},${getY(p.score).toFixed(1)}`).join(' ');
  const areaPath = `M ${getX(0).toFixed(1)} ${bottomY} L ${currentPoints
    .map((p, i) => `${getX(i).toFixed(1)} ${getY(p.score).toFixed(1)}`)
    .join(' L ')} L ${getX(count - 1).toFixed(1)} ${bottomY} Z`;

  const thresholdY = getY(thresholdScore);

  const firstScore = currentPoints[0]!.score;
  const lastScore = currentPoints[currentPoints.length - 1]!.score;
  const diffScore = lastScore - firstScore;

  // Mini-chart 1: Accuracy
  const minAcc = 30;
  const maxAcc = 85;
  const getAccY = (acc: number) => 15 + (1 - (acc - minAcc) / (maxAcc - minAcc)) * 65;
  const accCoords = currentPoints.map((p, i) => `${(20 + i * (260 / (count - 1))).toFixed(1)},${getAccY(p.accuracy).toFixed(1)}`).join(' ');

  // Mini-chart 2: Time
  const minTime = 130;
  const maxTime = 175;
  const getTimeY = (time: number) => 15 + (1 - (time - minTime) / (maxTime - minTime)) * 65;
  const timeCoords = currentPoints.map((p, i) => `${(20 + i * (260 / (count - 1))).toFixed(1)},${getTimeY(p.durationMin).toFixed(1)}`).join(' ');

  return (
    <Card id="progress" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Biểu đồ tiến bộ
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Hiệu suất qua các bài thi gần đây · Hiển thị 3 chỉ số đồng thời
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold">
          3 chỉ số đồng thời
        </Badge>
      </div>

      {/* Main Line Chart */}
      <div className="w-full overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-56 sm:h-64 min-w-[500px] overflow-visible"
          role="img"
          aria-label="Biểu đồ tiến bộ điểm thi thử"
        >
          <defs>
            <linearGradient id="chartGradientFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 45, 90, 135, 180].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Target threshold line */}
          <line
            x1={paddingX}
            y1={thresholdY}
            x2={width - paddingX}
            y2={thresholdY}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          <text
            x={width - paddingX}
            y={thresholdY - 5}
            textAnchor="end"
            className="text-[9px] font-bold fill-amber-500"
          >
            Ngưỡng đạt {thresholdScore}đ
          </text>

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGradientFade)" />

          {/* Main polyline */}
          <polyline
            points={polylineCoords}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Circles & X-labels */}
          {currentPoints.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.score);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400 stroke-2 cursor-pointer hover:r-6 transition-all"
                >
                  <title>{`Đề ${p.attemptNumber}: ${p.score}/180 điểm (Đúng ${p.accuracy}%)`}</title>
                </circle>
                <text
                  x={cx}
                  y={bottomY + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  {p.attemptNumber}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 my-2">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-indigo-600" />
            <span>Điểm thi thử</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span>Xu hướng tăng</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-t border-dashed border-amber-500" />
            <span>Ngưỡng đỗ ({thresholdScore}đ)</span>
          </div>
        </div>
      </div>

      {/* Main Footer Insight */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 mb-4">
        <span>Điểm trung bình đang cải thiện ổn định</span>
        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
          ↗ {diffScore >= 0 ? `+${diffScore}` : diffScore} điểm qua {count} đề
        </strong>
      </div>

      {/* 2 Mini-charts: Accuracy & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mini 1: Accuracy */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs mb-2">
            <strong className="text-slate-800 dark:text-slate-200">Tỷ lệ trả lời đúng</strong>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
              {currentPoints[0]!.accuracy}% → {currentPoints[currentPoints.length - 1]!.accuracy}%
            </span>
          </div>
          <svg viewBox="0 0 300 95" className="w-full h-20 overflow-visible" role="img" aria-label="Biểu đồ tỷ lệ đúng">
            <polyline
              points={accCoords}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {currentPoints.map((p, i) => (
              <circle
                key={i}
                cx={(20 + i * (260 / (count - 1))).toFixed(1)}
                cy={getAccY(p.accuracy).toFixed(1)}
                r="3"
                className="fill-white stroke-emerald-500 stroke-2"
              />
            ))}
            <text x="20" y="90" className="text-[9px] fill-slate-400">Đề 1</text>
            <text x="280" y="90" textAnchor="end" className="text-[9px] fill-slate-400">Đề {count}</text>
          </svg>
        </div>

        {/* Mini 2: Completion Time */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs mb-2">
            <strong className="text-slate-800 dark:text-slate-200">Thời gian hoàn thành</strong>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
              {currentPoints[0]!.durationMin} → {currentPoints[currentPoints.length - 1]!.durationMin} phút
            </span>
          </div>
          <svg viewBox="0 0 300 95" className="w-full h-20 overflow-visible" role="img" aria-label="Biểu đồ thời gian làm bài">
            <polyline
              points={timeCoords}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {currentPoints.map((p, i) => (
              <circle
                key={i}
                cx={(20 + i * (260 / (count - 1))).toFixed(1)}
                cy={getTimeY(p.durationMin).toFixed(1)}
                r="3"
                className="fill-white stroke-amber-500 stroke-2"
              />
            ))}
            <text x="20" y="90" className="text-[9px] fill-slate-400">Đề 1</text>
            <text x="280" y="90" textAnchor="end" className="text-[9px] fill-slate-400">Đề {count}</text>
          </svg>
        </div>
      </div>
    </Card>
  );
}
