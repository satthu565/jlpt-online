'use client';

import React from 'react';
import type { StudyTimeSummary } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { SKILL_LABELS } from '../utils/calculator';
import type { Skill } from '@jlpt/schema';

export interface StudyTimeWidgetProps {
  summary: StudyTimeSummary;
  className?: string;
}

export function StudyTimeWidget({
  summary,
  className = '',
}: StudyTimeWidgetProps): React.JSX.Element {
  const totalHours = Number((summary.totalMinutes / 60).toFixed(1));
  const skills: Skill[] = ['kanji', 'vocabulary', 'grammar', 'reading', 'listening'];

  return (
    <Card
      data-testid="study-time-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>⏱️</span> Thống kê thời gian ôn tập (STAT-08)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Tổng lượng thời gian dành cho việc luyện đề và phân bổ theo từng nhóm kỹ năng.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
          <span className="text-[11px] text-slate-500 block">Tổng thời gian ôn luyện:</span>
          <strong
            data-testid="total-study-hours"
            className="text-2xl font-extrabold text-blue-950 dark:text-blue-100 font-mono"
          >
            {totalHours} giờ
          </strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">({summary.totalMinutes} phút)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-500 block">Số phiên học & thi:</span>
          <strong
            data-testid="total-study-sessions"
            className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 font-mono"
          >
            {summary.totalSessions} lượt
          </strong>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
          <span className="text-[11px] text-slate-500 block">Thời lượng TB/phiên:</span>
          <strong
            data-testid="avg-session-minutes"
            className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 font-mono"
          >
            {summary.avgSessionMinutes} phút
          </strong>
        </div>
      </div>

      {/* Skill Time Breakdown */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
          Phân bổ thời gian theo kỹ năng:
        </span>
        <div className="space-y-1.5" data-testid="skill-time-distribution">
          {skills.map((s) => {
            const min = summary.bySkillMinutes[s] ?? 0;
            const pct =
              summary.totalMinutes > 0
                ? Math.round((min / summary.totalMinutes) * 100)
                : 0;

            return (
              <div
                key={s}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {SKILL_LABELS[s]}
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {min} phút ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
