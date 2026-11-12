'use client';

import React, { useState, useMemo } from 'react';
import type { AttemptRecord, QuestionAttemptRecord } from '../types';
import type { Level } from '@jlpt/schema';
import { buildPracticeHref } from '../practice-link';
import { MONDAI_LABELS } from './analytics-error-analysis';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';

export interface PriorityItem {
  name: string;
  kind: string;
  frequency: number; // 0..100
  mastery: number; // 0..100
  sample: number;
  miss: number;
  blank?: number;
  mondaiType?: string;
  why: string;
  plan: string;
}

const SKILL_OF_MONDAI: Record<string, string> = {
  grammar_form: 'grammar',
  sentence_composition: 'grammar',
  text_grammar: 'grammar',
  contextual: 'vocabulary',
  paraphrase: 'vocabulary',
  usage: 'vocabulary',
  word_formation: 'vocabulary',
  kanji_reading: 'kanji',
  orthography: 'kanji',
  comprehension_short: 'reading',
  comprehension_mid: 'reading',
  comprehension_long: 'reading',
  thematic: 'reading',
  integrated_reading: 'reading',
  info_retrieval: 'reading',
  task_based: 'listening',
  point: 'listening',
  summary: 'listening',
  utterance: 'listening',
  quick_response: 'listening',
  integrated_listening: 'listening',
};

export interface AnalyticsPriorityMatrixProps {
  priorities?: PriorityItem[];
  attempts?: AttemptRecord[];
  questionAttempts?: QuestionAttemptRecord[];
  level?: Level;
  /** Real answered / wrong counts per mondai type of the signed-in user (current level). */
  mondaiStats?: Record<string, { wrong: number; total: number; blank?: number }>;
  /** Number of bank questions per mondai type at this level, used as the frequency axis. */
  bankMondai?: Array<{ type: string; count: number }>;
  onOpenStudyModal: (mode: string, param?: string, href?: string) => void;
}

/** Dot position in percent; nudged out of the quadrant label areas so the labels stay readable. */
function dotPos(p: { mastery: number; frequency: number }): { x: number; y: number } {
  const x = Math.min(92, Math.max(8, p.mastery));
  let y = Math.min(92, Math.max(8, 100 - p.frequency));
  const inTopLabel = x < 34 || (x >= 50 && x < 84);
  const inBottomLabel = x < 34 || x > 66;
  if (y < 24 && inTopLabel) y = 24;
  if (y > 76 && inBottomLabel) y = 76;
  return { x, y };
}

/** Positions for all dots; dots that would overlap are spread sideways (then downwards). */
function layoutDots(items: Array<{ mastery: number; frequency: number }>): Array<{ x: number; y: number }> {
  const placed: Array<{ x: number; y: number }> = [];
  for (const item of items) {
    const pos = dotPos(item);
    let guard = 0;
    while (placed.some((q) => Math.abs(q.x - pos.x) < 9 && Math.abs(q.y - pos.y) < 12) && guard < 20) {
      pos.x += 9;
      if (pos.x > 92) {
        pos.x = 8;
        pos.y = Math.min(92, pos.y + 12);
      }
      guard += 1;
    }
    placed.push(pos);
  }
  return placed;
}

export function AnalyticsPriorityMatrix({
  priorities: propPriorities,
  attempts: _attempts = [],
  questionAttempts = [],
  level = 'N3',
  mondaiStats,
  bankMondai,
  onOpenStudyModal,
}: AnalyticsPriorityMatrixProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const priorities = useMemo<PriorityItem[]>(() => {
    if (propPriorities && propPriorities.length > 0) return propPriorities;

    const rows = new Map<string, { total: number; wrong: number; blank: number; skill: string }>();
    if (questionAttempts && questionAttempts.length > 0) {
      questionAttempts.forEach((q) => {
        const key = q.mondaiType || q.skill;
        if (!key) return;
        const entry = rows.get(key) || { total: 0, wrong: 0, blank: 0, skill: q.skill };
        entry.total += 1;
        if (!q.isCorrect) entry.wrong += 1;
        rows.set(key, entry);
      });
    } else if (mondaiStats) {
      Object.entries(mondaiStats).forEach(([key, v]) => {
        rows.set(key, { total: v.total, wrong: v.wrong, blank: v.blank ?? 0, skill: SKILL_OF_MONDAI[key] || 'vocabulary' });
      });
    }

    const bankMax = Math.max(1, ...(bankMondai ?? []).map((m) => m.count));
    const bankCount = new Map((bankMondai ?? []).map((m) => [m.type, m.count]));

    return Array.from(rows.entries())
      .filter(([, entry]) => entry.total >= 5)
      .map(([type, entry]) => {
        const mastery = Math.round(((entry.total - entry.wrong) / entry.total) * 100);
        const name = MONDAI_LABELS[type] || type;
        const skill = entry.skill;
        const kind = skill === 'reading' || skill === 'listening' ? 'Dạng câu' : skill === 'grammar' ? 'Ngữ pháp' : 'Từ vựng';
        const frequency = bankMondai ? Math.round(((bankCount.get(type) ?? 0) / bankMax) * 100) : 50;
        return {
          name,
          kind,
          frequency,
          mastery,
          sample: entry.total,
          miss: entry.wrong,
          blank: entry.blank,
          mondaiType: type,
          why: `Bạn đã làm ${entry.total} câu dạng này và sai ${entry.wrong} câu${entry.blank > 0 ? ` (trong đó bỏ trống ${entry.blank})` : ''}, độ thành thạo ${mastery}%. Dạng này chiếm ${frequency}% so với dạng xuất hiện nhiều nhất trong kho đề ${level}.`,
          plan: `Luyện tập chuyên sâu 15 câu dạng "${name}" và phân tích kỹ lời giải chi tiết.`,
        };
      })
      .sort((x, y) => x.mastery - y.mastery || y.miss - x.miss)
      .slice(0, 5);
  }, [propPriorities, questionAttempts, mondaiStats, bankMondai, level]);

  if (priorities.length === 0) {
    return (
      <Card id="priority-matrix" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
          13 · Tôi nên ưu tiên học gì để tăng điểm?
        </h2>
        <p className="mt-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa đủ dữ liệu: cần ít nhất 5 câu đã làm ở mỗi dạng ({level}) để xếp hạng dạng câu nên ưu tiên.
        </p>
      </Card>
    );
  }

  const selectedPriority = priorities[selectedIndex] || priorities[0]!;
  const dots = layoutDots(priorities);

  return (
    <Card id="priority-matrix" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            13 · Tôi nên ưu tiên học gì để tăng điểm?
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Kết hợp tần suất xuất hiện trong kho đề + mức yếu cá nhân + số câu đã làm
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          Gợi ý hành động
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2D Matrix Plot */}
        <div className="lg:col-span-6 space-y-2">
          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Tần suất trong kho đề ↑
          </div>

          <div className="relative aspect-[1.4] w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-2 grid-rows-2">
            {/* Quadrant 1: High freq, low mastery */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border-r border-b border-slate-200 dark:border-slate-800 flex flex-col justify-start">
              <strong className="text-xs font-bold text-amber-900 dark:text-amber-200">Ưu tiên cao</strong>
              <small className="text-[10px] text-amber-700 dark:text-amber-400">Gặp nhiều · còn yếu</small>
            </div>

            {/* Quadrant 2: High freq, high mastery */}
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-slate-200 dark:border-slate-800 flex flex-col justify-start">
              <strong className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Duy trì</strong>
              <small className="text-[10px] text-emerald-700 dark:text-emerald-400">Gặp nhiều · đã vững</small>
            </div>

            {/* Quadrant 3: Low freq, low mastery */}
            <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-end">
              <strong className="text-xs font-bold text-slate-700 dark:text-slate-300">Theo dõi</strong>
              <small className="text-[10px] text-slate-500 dark:text-slate-400">Gặp ít · còn yếu</small>
            </div>

            {/* Quadrant 4: Low freq, high mastery */}
            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-end">
              <strong className="text-xs font-bold text-slate-600 dark:text-slate-400">Ưu tiên thấp hơn</strong>
              <small className="text-[10px] text-slate-400 dark:text-slate-500">Gặp ít · đã vững</small>
            </div>

            {/* Positioned Dots */}
            {priorities.map((p, i) => {
              const isSelected = selectedIndex === i;
              const isHighPriority = p.frequency >= 65 && p.mastery < 60;
              const isMaintain = p.frequency >= 65;
              const dotBg = isHighPriority
                ? '#e3a044'
                : isMaintain
                  ? '#27a477'
                  : '#7894b4';

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(i);
                    }
                  }}
                  title={`${p.name}: tần suất ${p.frequency}%, thành thạo ${p.mastery}%`}
                  className={`absolute size-7 rounded-full text-white font-extrabold text-xs flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer shadow-md border-2 border-white dark:border-slate-900 transition-all ${
                    isSelected ? 'ring-4 ring-indigo-500/40 scale-110 z-10' : 'hover:scale-105 z-0'
                  }`}
                  // ui-allow-style: dynamic scatter dot coordinates and background color
                  style={{
                    left: `${dots[i]!.x}%`,
                    top: `${dots[i]!.y}%`,
                    backgroundColor: dotBg,
                  }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
            Mức độ thành thạo cá nhân →
          </div>
        </div>

        {/* Right: Priority List & Detail */}
        <div className="lg:col-span-6 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            Danh sách ưu tiên dành cho bạn
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Chọn một mục trên ma trận hoặc danh sách để xem lý do và bài luyện đề xuất.
          </p>

          <div className="space-y-1.5">
            {priorities.map((p, i) => {
              const isSelected = selectedIndex === i;
              const isHighPriority = p.frequency >= 65 && p.mastery < 60;
              const isMaintain = p.frequency >= 65;
              const label = isHighPriority
                ? 'Ưu tiên cao'
                : isMaintain
                  ? 'Duy trì'
                  : 'Theo dõi';
              const labelColor = isHighPriority
                ? 'text-amber-600 dark:text-amber-400'
                : isMaintain
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400';

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedIndex(i);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="truncate">
                      <strong className="block text-slate-900 dark:text-slate-100 truncate">{p.name}</strong>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {p.kind} · {p.sample} câu đã làm
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold ${labelColor} shrink-0 ml-2`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Priority Detail Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
            <strong className="text-slate-900 dark:text-slate-100 block font-bold">
              Vì sao ưu tiên {selectedPriority.name}?
            </strong>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              {selectedPriority.why}
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              <strong>Đề xuất:</strong> {selectedPriority.plan}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                Tần suất: {selectedPriority.frequency}%
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                Thành thạo: {selectedPriority.mastery}%
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                Sai: {selectedPriority.miss}/{selectedPriority.sample}{selectedPriority.blank ? ` (bỏ trống ${selectedPriority.blank})` : ''}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() =>
              onOpenStudyModal(
                'priority',
                selectedPriority.name,
                selectedPriority.mondaiType
                  ? buildPracticeHref({
                      level,
                      pool: 'wrong',
                      mondaiTypes: [selectedPriority.mondaiType],
                      count: Math.min(15, Math.max(5, selectedPriority.miss)),
                      label: selectedPriority.name,
                    })
                  : undefined,
              )
            }
            className="w-full justify-center"
          >
            Luyện nội dung ưu tiên
            <ArrowRight className="size-4 inline ml-1.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        <ShieldCheck className="size-3.5 shrink-0 text-emerald-500 mt-0.5" aria-hidden="true" />
        <span>
          Ưu tiên mang tính định hướng ôn luyện dựa trên dữ liệu làm bài thực tế. Điểm chuẩn hóa chính thức của JLPT phụ thuộc vào độ khó từng kỳ thi.
        </span>
      </div>
    </Card>
  );
}
