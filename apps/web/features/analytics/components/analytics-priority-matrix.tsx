'use client';

import React, { useState } from 'react';
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
  why: string;
  plan: string;
}

const DEFAULT_PRIORITIES: PriorityItem[] = [
  {
    name: 'Đọc hiểu đoạn dài',
    kind: 'Dạng câu',
    frequency: 88,
    mastery: 38,
    sample: 40,
    miss: 25,
    why: 'Xuất hiện tương đối thường xuyên trong kho đề, nhưng bạn còn yếu ở khả năng tìm ý chính và nắm mối liên hệ giữa các đoạn.',
    plan: 'Luyện 15 câu đọc dài, gạch chân từ nối và tự tóm tắt câu chủ đề sau mỗi đoạn.',
  },
  {
    name: '～ようにする',
    kind: 'Ngữ pháp',
    frequency: 82,
    mastery: 42,
    sample: 24,
    miss: 14,
    why: 'Mẫu ngữ pháp được gắn nhãn nhiều trong đề và bạn hay nhầm cách sử dụng với ～ようになる.',
    plan: 'Đối chiếu hai cấu trúc, học 5 câu ví dụ và luyện 10 câu phân biệt.',
  },
  {
    name: 'Sắp xếp câu',
    kind: 'Dạng câu',
    frequency: 74,
    mastery: 51,
    sample: 45,
    miss: 22,
    why: 'Tỷ lệ sai gần một nửa ở một tập câu tương đối lớn.',
    plan: 'Ôn trợ từ, cụm bổ nghĩa danh từ và luyện 15 câu sắp xếp.',
  },
  {
    name: 'Kanji cơ bản',
    kind: 'Kanji',
    frequency: 87,
    mastery: 85,
    sample: 80,
    miss: 12,
    why: 'Gặp nhiều nhưng hiện đã làm tốt; phù hợp để duy trì hơn là dồn quá nhiều thời gian.',
    plan: 'Ôn lại từ đã sai bằng flashcards trong 10 phút.',
  },
  {
    name: '～わけではない',
    kind: 'Ngữ pháp',
    frequency: 35,
    mastery: 39,
    sample: 18,
    miss: 11,
    why: 'Độ thành thạo thấp nhưng ít xuất hiện hơn trong kho đề; mẫu vẫn cần kiểm chứng thêm.',
    plan: 'Học phủ định một phần và luyện 8 câu trong ngữ cảnh.',
  },
];

export interface AnalyticsPriorityMatrixProps {
  priorities?: PriorityItem[];
  onOpenStudyModal: (mode: string, param?: string) => void;
}

export function AnalyticsPriorityMatrix({
  priorities = DEFAULT_PRIORITIES,
  onOpenStudyModal,
}: AnalyticsPriorityMatrixProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const selectedPriority = priorities[selectedIndex] || priorities[0]!;

  return (
    <Card id="priority-matrix" className="scroll-mt-20 p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
            05 · Tôi nên ưu tiên học gì để tăng điểm?
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
                    left: `${Math.min(92, Math.max(8, p.mastery))}%`,
                    top: `${Math.min(92, Math.max(8, 100 - p.frequency))}%`,
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
                Sai: {selectedPriority.miss}/{selectedPriority.sample}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenStudyModal('priority', selectedPriority.name)}
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
