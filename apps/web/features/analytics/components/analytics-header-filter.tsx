'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { Level } from '@jlpt/schema';
import { Button } from '@jlpt/ui/components/button';
import { HeroSelect } from '@jlpt/ui/components/hero-select';

export interface AnalyticsHeaderFilterProps {
  level: Level;
  onLevelChange: (level: Level) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  scopeFirstOnly: boolean;
  onToggleScope: () => void;
}

const LEVEL_OPTIONS = [
  { value: 'N1', label: 'JLPT N1' },
  { value: 'N2', label: 'JLPT N2' },
  { value: 'N3', label: 'JLPT N3' },
  { value: 'N4', label: 'JLPT N4' },
  { value: 'N5', label: 'JLPT N5' },
];

const PERIOD_OPTIONS = [
  { value: '30', label: '30 ngày gần nhất' },
  { value: '7', label: '7 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
  { value: 'all', label: 'Toàn bộ thời gian' },
];

export function AnalyticsHeaderFilter({
  level,
  onLevelChange,
  period,
  onPeriodChange,
  scopeFirstOnly,
  onToggleScope,
}: AnalyticsHeaderFilterProps): React.JSX.Element {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <div className="text-[11px] font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase mb-1">
          THỐNG KÊ CÁ NHÂN
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Hành trình chinh phục JLPT 👋
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Phân tích đề JLPT qua các năm, đo năng lực cá nhân và xác định chính xác kiến thức cần ưu tiên — tất cả trên một trang.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-32">
          <HeroSelect
            aria-label="Chọn cấp độ JLPT"
            value={level}
            onChange={(val) => onLevelChange(val as Level)}
            options={LEVEL_OPTIONS}
            size="sm"
          />
        </div>

        <div className="w-44">
          <HeroSelect
            aria-label="Chọn khoảng thời gian"
            value={period}
            onChange={onPeriodChange}
            options={PERIOD_OPTIONS}
            size="sm"
          />
        </div>

        <Button
          variant={scopeFirstOnly ? 'secondary' : 'outline'}
          size="sm"
          onClick={onToggleScope}
          className="whitespace-nowrap font-medium"
        >
          <SlidersHorizontal className="size-3.5 inline mr-1.5" aria-hidden="true" />
          {scopeFirstOnly ? 'Chỉ lượt đầu' : 'Bao gồm làm lại'}
        </Button>
      </div>
    </header>
  );
}
