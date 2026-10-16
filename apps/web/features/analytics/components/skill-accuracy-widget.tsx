'use client';

import React, { useState } from 'react';
import type { SkillAccuracyStat, MondaiAccuracyStat } from '../types';
import { Card } from '@jlpt/ui';

export interface SkillAccuracyWidgetProps {
  skills: SkillAccuracyStat[];
  mondais?: MondaiAccuracyStat[];
  className?: string;
}

export function SkillAccuracyWidget({
  skills,
  mondais = [],
  className = '',
}: SkillAccuracyWidgetProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<'skills' | 'mondais'>('skills');

  return (
    <Card
      data-testid="skill-accuracy-widget"
      className={`border border-slate-200 dark:border-slate-800 p-6 space-y-5 bg-white dark:bg-slate-900 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📊</span> Độ chính xác từng kỹ năng & dạng câu (STAT-03, STAT-04)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tỷ lệ làm đúng phân bổ theo từng kỹ năng JLPT chuẩn và các dạng mondai.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          <button
            type="button"
            data-testid="tab-skills-btn"
            onClick={() => setViewMode('skills')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'skills'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Theo kỹ năng (STAT-03)
          </button>
          <button
            type="button"
            data-testid="tab-mondais-btn"
            onClick={() => setViewMode('mondais')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'mondais'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Theo dạng câu (STAT-04)
          </button>
        </div>
      </div>

      {viewMode === 'skills' ? (
        <div className="space-y-3" data-testid="skills-accuracy-list">
          {skills.map((s) => {
            const isHigh = s.accuracy >= 75;
            const isMedium = s.accuracy >= 50 && s.accuracy < 75;

            return (
              <div
                key={s.skill}
                data-testid={`skill-item-${s.skill}`}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {s.skillLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      {s.correct} / {s.total} câu
                    </span>
                    <strong
                      data-testid={`skill-acc-${s.skill}`}
                      className={`font-mono ${isHigh ? 'text-emerald-600 dark:text-emerald-400' : isMedium ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {s.accuracy}%
                    </strong>
                  </div>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${isHigh ? 'bg-emerald-500' : isMedium ? 'bg-blue-600' : 'bg-rose-500'}`}
                    style={{ width: `${s.accuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="mondais-accuracy-list">
          {mondais.length === 0 ? (
            <div className="col-span-2 text-center py-4 text-xs text-slate-500">
              Chưa có dữ liệu phân loại theo dạng bài mondai.
            </div>
          ) : (
            mondais.map((m) => (
              <div
                key={m.mondaiType}
                data-testid={`mondai-item-${m.mondaiType}`}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {m.label}
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {m.accuracy}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Kỹ năng: {m.skill}</span>
                  <span>{m.correct}/{m.total} câu</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
