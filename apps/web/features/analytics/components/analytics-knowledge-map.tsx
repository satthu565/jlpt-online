'use client';

import React, { useState } from 'react';
import { BrainCircuit, Layers, Info } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';

export interface KnowledgeGroup {
  key: string;
  name: string;
  count: number;
  color: string;
  detail: string;
}

const DEFAULT_GROUPS: KnowledgeGroup[] = [
  {
    key: 'vocab',
    name: 'Từ vựng & Kanji',
    count: 409,
    color: '#6277ed',
    detail: 'Cách đọc chữ Hán, cách viết từ, nghĩa theo ngữ cảnh, từ gần nghĩa, cách dùng từ.',
  },
  {
    key: 'grammar',
    name: 'Ngữ pháp',
    count: 285,
    color: '#17ac83',
    detail: 'Chọn mẫu ngữ pháp, sắp xếp thành câu, ngữ pháp trong ngữ cảnh đoạn văn.',
  },
  {
    key: 'reading',
    name: 'Đọc hiểu',
    count: 198,
    color: '#edac52',
    detail: 'Đọc đoạn ngắn, đoạn vừa, đoạn dài, tìm kiếm thông tin và suy luận.',
  },
  {
    key: 'listening',
    name: 'Nghe hiểu',
    count: 348,
    color: '#7c8aef',
    detail: 'Hiểu nhiệm vụ, ý chính, tình huống, phản hồi nhanh và thông tin tổng hợp.',
  },
];

export interface AnalyticsKnowledgeMapProps {
  level: Level;
  groups?: KnowledgeGroup[];
}

export function AnalyticsKnowledgeMap({
  level,
  groups = DEFAULT_GROUPS,
}: AnalyticsKnowledgeMapProps): React.JSX.Element {
  const [selectedKey, setSelectedKey] = useState<string>('vocab');

  const totalQuestions = groups.reduce((acc, g) => acc + g.count, 0);
  const selectedGroup = groups.find((g) => g.key === selectedKey) || groups[0]!;

  // Build conic-gradient segments
  let accumulatedPct = 0;
  const gradientStops = groups.map((g) => {
    const start = accumulatedPct;
    accumulatedPct += (g.count / totalQuestions) * 100;
    return `${g.color} ${start.toFixed(1)}% ${accumulatedPct.toFixed(1)}%`;
  });
  const conicStyle = {
    background: `conic-gradient(${gradientStops.join(', ')})`,
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Exam Intelligence Intro Banner */}
      <div
        id="content-analytics"
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/30 border border-indigo-100/80 dark:border-indigo-900/40"
      >
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            EXAM INTELLIGENCE · DEMO DATA
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 mb-1.5">
            JLPT kiểm tra gì qua các năm?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Khám phá nội dung đề, tần suất kiến thức và xu hướng lặp lại. Các biểu đồ này thống kê bộ đề có gắn nhãn, giúp người học định hướng trọng tâm.
          </p>
        </div>
        <div className="size-14 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <BrainCircuit className="size-7" aria-hidden="true" />
        </div>
      </div>

      {/* 01 · Bản đồ kiến thức JLPT */}
      <section id="knowledge-map" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Donut + Legend */}
        <Card className="lg:col-span-7 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                01 · Bản đồ kiến thức JLPT {level}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Nhóm kiến thức và dạng câu trong kho đề
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {totalQuestions.toLocaleString()} câu · phân loại
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* Conic Donut */}
            <div className="relative size-44 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={conicStyle}>
              {/* ui-allow-style: dynamic conic gradient on background */}
              <div className="size-28 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {totalQuestions}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">câu gắn nhãn</span>
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="flex-1 w-full space-y-1.5">
              {groups.map((g) => {
                const isSelected = selectedKey === g.key;
                const pct = Math.round((g.count / totalQuestions) * 100);
                return (
                  <div
                    key={g.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedKey(g.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedKey(g.key);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} /> {/* ui-allow-style: dynamic group color mark */}
                      <span>{g.name}</span>
                    </div>
                    <span className="font-bold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {selectedGroup.name} · {selectedGroup.count} câu
            </span>
            <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {selectedGroup.detail}
            </p>
          </div>
        </Card>

        {/* Right: Cấu trúc kiến thức trọng tâm */}
        <Card className="lg:col-span-5 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Cấu trúc kiến thức trọng tâm
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Hướng dẫn phân bố nội dung và độ phủ
                </p>
              </div>
              <Layers className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>

            <div className="space-y-4 my-2">
              {groups.map((g) => {
                const pct = Math.round((g.count / totalQuestions) * 100);
                return (
                  <div key={g.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {g.count} / {totalQuestions} câu
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: g.color }} /* ui-allow-style: dynamic coverage meter percentage & color */
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <Info className="size-3.5 shrink-0 text-indigo-500 mt-0.5" aria-hidden="true" />
            <span>
              Đây là <strong>phân bố trong bộ câu hỏi được gắn nhãn</strong>, không phải tỷ lệ chuẩn hóa hay cấu trúc cố định của đề JLPT chính thức.
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
