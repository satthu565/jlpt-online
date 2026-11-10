'use client';

import React, { useState } from 'react';
import { BrainCircuit, Layers, Info } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import type { BankLevelStats } from '../bank';

export interface KnowledgeGroup {
  key: string;
  name: string;
  count: number;
  color: string;
  detail: string;
}

export const LEVEL_KNOWLEDGE_MAP: Record<Level, KnowledgeGroup[]> = {
  N1: [
    {
      key: 'vocab',
      name: 'Từ vựng & Kanji',
      count: 770,
      color: '#6277ed',
      detail: 'Cách đọc chữ Hán, nghĩa từ vựng, từ gần nghĩa, cách dùng từ trong ngữ cảnh cao cấp N1.',
    },
    {
      key: 'grammar',
      name: 'Ngữ pháp',
      count: 610,
      color: '#17ac83',
      detail: 'Ngữ pháp câu, sắp xếp thành câu có dấu sao, ngữ pháp theo đoạn văn N1.',
    },
    {
      key: 'reading',
      name: 'Đọc hiểu',
      count: 800,
      color: '#edac52',
      detail: 'Đọc hiểu đoạn ngắn, đoạn trung, đoạn dài, bài luận so sánh, tìm kiếm thông tin N1.',
    },
    {
      key: 'listening',
      name: 'Nghe hiểu',
      count: 1027,
      color: '#7c8aef',
      detail: 'Hiểu chủ đề, nhiệm vụ, tóm tắt ý chính, phản hồi nhanh, nghe hiểu tổng hợp N1.',
    },
  ],
  N2: [
    {
      key: 'vocab',
      name: 'Từ vựng & Kanji',
      count: 995,
      color: '#6277ed',
      detail: 'Chữ Hán, từ ghép, từ đồng nghĩa, ngữ cảnh sử dụng từ chuẩn N2.',
    },
    {
      key: 'grammar',
      name: 'Ngữ pháp',
      count: 680,
      color: '#17ac83',
      detail: 'Chọn mẫu ngữ pháp, ghép câu ngôi sao, ngữ pháp đoạn văn N2.',
    },
    {
      key: 'reading',
      name: 'Đọc hiểu',
      count: 650,
      color: '#edac52',
      detail: 'Đoạn văn ngắn, đoạn văn vừa, đoạn văn dài, bài văn nghị luận, tìm thông tin N2.',
    },
    {
      key: 'listening',
      name: 'Nghe hiểu',
      count: 908,
      color: '#7c8aef',
      detail: 'Nghe hiểu vấn đề, ý chính, phản xạ nhanh, tổng hợp thông tin N2.',
    },
  ],
  N3: [
    {
      key: 'vocab',
      name: 'Từ vựng & Kanji',
      count: 1040,
      color: '#6277ed',
      detail: 'Cách đọc Hán tự, cách viết Hiragana/Kanji, ngữ cảnh từ vựng, từ gần nghĩa N3.',
    },
    {
      key: 'grammar',
      name: 'Ngữ pháp',
      count: 695,
      color: '#17ac83',
      detail: 'Chọn hình thức ngữ pháp, sắp xếp câu dấu sao, ngữ pháp đoạn văn N3.',
    },
    {
      key: 'reading',
      name: 'Đọc hiểu',
      count: 485,
      color: '#edac52',
      detail: 'Đọc hiểu đoạn ngắn, đoạn vừa, đoạn dài, trích xuất dữ liệu và biểu bảng N3.',
    },
    {
      key: 'listening',
      name: 'Nghe hiểu',
      count: 827,
      color: '#7c8aef',
      detail: 'Nghe hiểu nhiệm vụ, nội dung then chốt, đàm thoại tình huống, trả lời nhanh N3.',
    },
  ],
  N4: [
    {
      key: 'vocab',
      name: 'Từ vựng & Kanji',
      count: 520,
      color: '#6277ed',
      detail: 'Đọc và viết chữ Hán cơ bản, từ vựng đời sống thường ngày N4.',
    },
    {
      key: 'grammar_reading',
      name: 'Ngữ pháp & Đọc hiểu',
      count: 515,
      color: '#17ac83',
      detail: 'Mẫu câu sơ cấp, nối câu, đọc đoạn văn ngắn và trích xuất thông tin N4.',
    },
    {
      key: 'listening',
      name: 'Nghe hiểu',
      count: 274,
      color: '#7c8aef',
      detail: 'Nghe hiểu chỉ dẫn, hành động tiếp theo, phản xạ giao tiếp cơ bản N4.',
    },
  ],
  N5: [
    {
      key: 'vocab',
      name: 'Từ vựng & Kanji',
      count: 340,
      color: '#6277ed',
      detail: 'Chữ Hán nhập môn, số đếm, từ vựng sinh hoạt hàng ngày N5.',
    },
    {
      key: 'grammar_reading',
      name: 'Ngữ pháp & Đọc hiểu',
      count: 276,
      color: '#17ac83',
      detail: 'Trợ từ, thể động từ sơ cấp, đọc hiểu mẩu tin và thông báo ngắn N5.',
    },
    {
      key: 'listening',
      name: 'Nghe hiểu',
      count: 217,
      color: '#7c8aef',
      detail: 'Hội thoại ngắn, số liệu, giờ giấc, đồ vật và chỉ đường N5.',
    },
  ],
};

export interface AnalyticsKnowledgeMapProps {
  level: Level;
  groups?: KnowledgeGroup[];
  /** Live counts of the exam bank; when absent the built-in snapshot is shown. */
  bank?: BankLevelStats;
}

export function AnalyticsKnowledgeMap({
  level,
  groups,
  bank,
}: AnalyticsKnowledgeMapProps): React.JSX.Element {
  const snapshot = LEVEL_KNOWLEDGE_MAP[level] || LEVEL_KNOWLEDGE_MAP.N3;
  const activeGroups =
    groups ||
    (bank && bank.questionsCount > 0
      ? snapshot.map((g) => ({ ...g, count: bank.bySkill[g.key as keyof BankLevelStats['bySkill']] ?? 0 }))
      : snapshot);
  const [selectedKey, setSelectedKey] = useState<string>(activeGroups[0]?.key || 'vocab');

  const totalQuestions = activeGroups.reduce((acc, g) => acc + g.count, 0);
  const selectedGroup =
    activeGroups.find((g) => g.key === selectedKey) || activeGroups[0]!;

  // Build conic-gradient segments
  let accumulatedPct = 0;
  const gradientStops = activeGroups.map((g) => {
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
            EXAM INTELLIGENCE · PHÂN TÍCH KHO ĐỀ THI
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 mb-1.5">
            JLPT kiểm tra gì qua các năm?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Khám phá nội dung đề, phân bổ các nhóm kỹ năng và khối lượng kiến thức trọng tâm trong kho đề thi thực tế của Gokakuya.
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
              {totalQuestions.toLocaleString()} câu · kho đề
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            {/* Conic Donut */}
            <div className="relative size-44 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={conicStyle}>
              {/* ui-allow-style: dynamic conic gradient on background */}
              <div className="size-28 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center shadow-inner">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {totalQuestions.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">câu trong kho</span>
              </div>
            </div>

            {/* Interactive Legend */}
            <div className="flex-1 w-full space-y-1.5">
              {activeGroups.map((g) => {
                const isSelected = selectedGroup.key === g.key;
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
              {selectedGroup.name} · {selectedGroup.count.toLocaleString()} câu
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
              {activeGroups.map((g) => {
                const pct = Math.round((g.count / totalQuestions) * 100);
                return (
                  <div key={g.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.name}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {g.count.toLocaleString()} / {totalQuestions.toLocaleString()} câu
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
              {bank && bank.questionsCount > 0
                ? `Đếm trực tiếp từ ${bank.examsCount} đề thi JLPT ${level} đã xuất bản trong ngân hàng đề của hệ thống.`
                : 'Chưa tải được số liệu trực tiếp; đang hiển thị số liệu tổng hợp sẵn.'}
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}
