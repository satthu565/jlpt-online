'use client';

import React, { useMemo } from 'react';
import { TrendingUp, BookOpen, Clock, Sparkles } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import type { AttemptRecord } from '../types';

export interface AnalyticsActivityHeatmapProps {
  attempts: AttemptRecord[];
  weakestSkill?: { name: string; accuracy: number } | null;
  currentStreakDays?: number;
  maxStreakDays?: number;
}

const HEAT_LEVEL_CLASSES = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-emerald-100 dark:bg-emerald-950/60',
  'bg-emerald-300 dark:bg-emerald-800',
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-emerald-700 dark:bg-emerald-500',
];

export function AnalyticsActivityHeatmap({
  attempts,
  currentStreakDays = 0,
  weakestSkill,
}: AnalyticsActivityHeatmapProps): React.JSX.Element {
  // Generate 14 weeks x 7 days grid
  const { grid, activeDaysCount } = useMemo(() => {
    // Map dates from attempts
    const dateCounts = new Map<string, number>();
    attempts.forEach((a) => {
      if (a.submittedAt && a.status !== 'in_progress') {
        const d = a.submittedAt.slice(0, 10);
        dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
      }
    });

    const now = new Date();
    const cols = 14;
    const rows = 7;
    const weeks: { dateStr: string; level: number }[][] = [];
    let count = 0;

    // Start 14*7 days ago
    for (let c = 0; c < cols; c++) {
      const week: { dateStr: string; level: number }[] = [];
      for (let r = 0; r < rows; r++) {
        const daysAgo = (cols - 1 - c) * 7 + (rows - 1 - r);
        const day = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const dStr = day.toISOString().slice(0, 10);
        const realCount = dateCounts.get(dStr);

        let lvl = 0;
        if (realCount !== undefined) {
          lvl = Math.min(4, Math.max(1, realCount));
          count++;
        }

        week.push({ dateStr: dStr, level: lvl });
      }
      weeks.push(week);
    }

    return { grid: weeks, activeDaysCount: count };
  }, [attempts]);

  const { maxStreakDays, insights } = useMemo(() => {
    const submitted = attempts
      .filter((a) => a.status !== 'in_progress')
      .sort((x, y) => new Date(x.submittedAt).getTime() - new Date(y.submittedAt).getTime());

    const days = Array.from(new Set(submitted.map((a) => a.submittedAt.slice(0, 10)))).sort();
    let longest = 0;
    let run = 0;
    let prev: number | null = null;
    for (const d of days) {
      const t = Date.parse(`${d}T00:00:00Z`);
      run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      prev = t;
    }

    const first = submitted[0];
    const last = submitted[submitted.length - 1];
    const progress =
      submitted.length >= 2 && first && last
        ? (() => {
            const delta = last.totalScore - first.totalScore;
            return {
              title: delta > 0 ? 'Điểm đang tăng' : delta < 0 ? 'Điểm đang giảm' : 'Điểm chưa đổi',
              body: `Điểm bài đầu (${first.totalScore}) và bài gần nhất (${last.totalScore}) chênh lệch ${delta > 0 ? '+' : ''}${delta} điểm qua ${submitted.length} bài đã nộp.`,
            };
          })()
        : { title: 'Chưa đủ dữ liệu về điểm', body: 'Cần ít nhất 2 bài đã nộp để so sánh điểm giữa các lần làm.' };

    const timed = submitted.filter((a) => a.durationSec > 0);
    const firstTimed = timed[0];
    const lastTimed = timed[timed.length - 1];
    const speed =
      timed.length >= 2 && firstTimed && lastTimed
        ? (() => {
            const diff = Math.round((lastTimed.durationSec - firstTimed.durationSec) / 60);
            return {
              title: diff < 0 ? 'Làm bài nhanh hơn' : diff > 0 ? 'Làm bài chậm hơn' : 'Thời gian làm bài không đổi',
              body: `Thời gian làm bài ${diff < 0 ? 'giảm' : 'tăng'} ${Math.abs(diff)} phút giữa bài đầu và bài gần nhất (${timed.length} bài có đo thời gian).`,
            };
          })()
        : { title: 'Chưa đủ dữ liệu về thời gian', body: 'Cần ít nhất 2 bài đã nộp có đo thời gian để so sánh.' };

    const skill = weakestSkill
      ? {
          title: `${weakestSkill.name} cần được chú ý`,
          body: `Tỷ lệ đúng ${weakestSkill.accuracy}% là thấp nhất trong các kỹ năng bạn đã làm.`,
        }
      : { title: 'Chưa đủ dữ liệu về kỹ năng', body: 'Làm thêm bài để hệ thống xác định kỹ năng cần ưu tiên.' };

    return { maxStreakDays: longest, insights: { progress, skill, speed } };
  }, [attempts, weakestSkill]);

  const monthRange = (() => {
    const first = grid[0]?.[0]?.dateStr;
    const lastWeek = grid[grid.length - 1];
    const last = lastWeek?.[lastWeek.length - 1]?.dateStr;
    if (!first || !last) return '';
    return `Tháng ${Number(first.slice(5, 7))} — Tháng ${Number(last.slice(5, 7))}`;
  })();

  return (
    <section id="activity" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* Left: Nhịp độ học tập (Heatmap) */}
      <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Nhịp độ học tập
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Đều đặn một chút mỗi ngày sẽ tạo nên khác biệt bền vững
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              🔥 {currentStreakDays} ngày liên tiếp
            </Badge>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mb-2">
            <span>14 tuần gần nhất</span>
            <span suppressHydrationWarning>{monthRange}</span>
          </div>

          {/* 14-week Grid */}
          <div className="grid grid-cols-14 gap-1 sm:gap-1.5 overflow-x-auto pb-2">
            {grid.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1 sm:gap-1.5">
                {week.map((cell, dIdx) => (
                  <span
                    key={dIdx}
                    suppressHydrationWarning
                    title={`${cell.dateStr}: ${cell.level} hoạt động`}
                    className={`aspect-square rounded-[3px] transition-transform hover:scale-125 ${
                      HEAT_LEVEL_CLASSES[cell.level]
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Heat Legend */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-3">
            <span>Ít hoạt động</span>
            <div className="flex items-center gap-1">
              <span>Ít</span>
              {HEAT_LEVEL_CLASSES.map((cls, idx) => (
                <span key={idx} className={`size-2.5 rounded-[2px] ${cls}`} />
              ))}
              <span>Nhiều</span>
            </div>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <div>
            <strong className="block text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {activeDaysCount} <span className="text-xs font-normal text-slate-400">ngày</span>
            </strong>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Ngày có luyện tập</span>
          </div>
          <div>
            <strong className="block text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {currentStreakDays} <span className="text-xs font-normal text-slate-400">ngày</span>
            </strong>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Chuỗi hiện tại</span>
          </div>
          <div>
            <strong className="block text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {maxStreakDays} <span className="text-xs font-normal text-slate-400">ngày</span>
            </strong>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Chuỗi dài nhất</span>
          </div>
        </div>
      </Card>

      {/* Right: Góc nhìn dành cho bạn (Notes) */}
      <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Góc nhìn dành cho bạn
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Nhận xét tổng hợp từ kết quả luyện tập gần đây
              </p>
            </div>
            <Sparkles className="size-5 text-amber-500 shrink-0" aria-hidden="true" />
          </div>

          <div className="space-y-3.5 my-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {insights.progress.title}
                </strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {insights.progress.body}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {insights.skill.title}
                </strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {insights.skill.body}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {insights.speed.title}
                </strong>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {insights.speed.body}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-2">
          Hệ thống tự động cập nhật nhận xét sau mỗi lần nộp bài thi mới.
        </p>
      </Card>
    </section>
  );
}
