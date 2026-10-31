'use client';

import React from 'react';
import { Search, Calendar, Clock, FileText, Layers, Star } from 'lucide-react';
import type { Level, ExamKind, Session } from '@jlpt/schema';
import type { LibraryFilterState, UserExamStatus } from '../types';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Checkbox } from '@jlpt/ui/components/checkbox';
import { useI18n } from '../../../lib/i18n';

export interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onFilterChange: (newFilters: LibraryFilterState) => void;
  onResetFilters: () => void;
  availableYears?: number[];
  showStatusFilter?: boolean;
  className?: string;
  onSearchSubmit?: () => void;
  searchButtonText?: string;
  idPrefix?: string;
}

export function LibraryFilters({
  filters,
  onFilterChange,
  onResetFilters,
  availableYears = [2024, 2023, 2022, 2021, 2020],
  showStatusFilter = true,
  className = '',
  onSearchSubmit,
  searchButtonText,
  idPrefix = 'library',
}: LibraryFiltersProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Card
      className={`rounded-2xl p-4 sm:p-5 shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 space-y-3 ${className}`}
      role="search"
      aria-label="Bộ lọc thư viện đề thi"
    >
      {/* TẦNG 1: TÌM KIẾM TỪ KHÓA & NÚT TÌM KIẾM */}
      <div>
        <label
          htmlFor={`${idPrefix}-search-input`}
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
        >
          Tìm kiếm đề thi
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Input
              id={`${idPrefix}-search-input`}
              type="search"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchSubmit?.();
              }}
              placeholder="Nhập tên đề thi, từ khóa hoặc cấp độ..."
              className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 transition-colors"
            />
            <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" aria-hidden="true" />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onSearchSubmit}
            className="h-11 px-6 rounded-xl font-bold text-sm shrink-0 flex items-center justify-center gap-2 shadow-sm"
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <span>{searchButtonText || t('home.searchExamsButton')}</span>
          </Button>
        </div>
      </div>

      {/* TẦNG 2: CẤP ĐỘ JLPT (DẢI PILLS MÀU CHUẨN THIẾT KẾ) */}
      <div>
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Cấp độ JLPT
        </span>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo cấp độ">
          <Button
            type="button"
            size="sm"
            variant={filters.level === 'ALL' ? 'primary' : 'ghost'}
            onClick={() => onFilterChange({ ...filters, level: 'ALL' })}
            aria-pressed={filters.level === 'ALL'}
            className={`px-4 py-1 text-xs font-bold h-7.5 min-h-0 rounded-full transition-all ${
              filters.level === 'ALL'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả cấp độ
          </Button>
          {(['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).map((lvl) => {
            const isSelected = filters.level === lvl;
            return (
              <Button
                key={lvl}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onFilterChange({ ...filters, level: isSelected ? 'ALL' : lvl })}
                aria-pressed={isSelected}
                className={`px-3.5 py-1 text-xs font-bold h-7.5 min-h-0 rounded-full transition-all border-0 shadow-none cursor-pointer badge-level-${lvl.toLowerCase()} ${
                  isSelected
                    ? 'ring-2 ring-current ring-offset-1 dark:ring-offset-slate-900 font-black shadow-xs scale-105'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                {lvl}
              </Button>
            );
          })}
        </div>
      </div>

      {/* TẦNG 3: 4 TIÊU CHÍ (NĂM THI, KỲ THI, THỂ LOẠI ĐỀ, TRẠNG THÁI CỦA BẠN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dropdown 1: Năm thi */}
        <div>
          <label
            htmlFor={`${idPrefix}-filter-year-select`}
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Năm thi</span>
          </label>
          <Select
            id={`${idPrefix}-filter-year-select`}
            value={filters.year.toString()}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                year: e.target.value === 'ALL' ? 'ALL' : Number.parseInt(e.target.value, 10),
              })
            }
            className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
          >
            <option value="ALL">Tất cả các năm</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr.toString()}>
                Năm {yr}
              </option>
            ))}
          </Select>
        </div>

        {/* Dropdown 2: Kỳ thi */}
        <div>
          <label
            htmlFor={`${idPrefix}-filter-session-select`}
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Kỳ thi</span>
          </label>
          <Select
            id={`${idPrefix}-filter-session-select`}
            value={filters.session}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                session: e.target.value as Session | 'ALL',
              })
            }
            className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
          >
            <option value="ALL">Tất cả các kỳ</option>
            <option value="7">Kỳ tháng 7</option>
            <option value="12">Kỳ tháng 12</option>
          </Select>
        </div>

        {/* Dropdown 3: Thể loại đề */}
        <div>
          <label
            htmlFor={`${idPrefix}-filter-kind-select`}
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Thể loại đề</span>
          </label>
          <Select
            id={`${idPrefix}-filter-kind-select`}
            value={filters.kind}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                kind: e.target.value as ExamKind | 'ALL',
              })
            }
            className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
          >
            <option value="ALL">Tất cả thể loại</option>
            <option value="original">Đề thi thật (Original)</option>
            <option value="practice">Đề luyện tự biên soạn</option>
            <option value="mixed">Đề trộn ngân hàng</option>
          </Select>
        </div>

        {/* Dropdown 4: Trạng thái của bạn */}
        {showStatusFilter && (
          <div>
            <label
              htmlFor={`${idPrefix}-filter-status-select`}
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
            >
              <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
              <span>Trạng thái của bạn</span>
            </label>
            <Select
              id={`${idPrefix}-filter-status-select`}
              value={filters.userStatus}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  userStatus: e.target.value as UserExamStatus | 'ALL',
                })
              }
              className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="not_started">Chưa từng làm</option>
              <option value="in_progress">Đang làm dở</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="below_target">Chưa đạt mục tiêu</option>
            </Select>
          </div>
        )}
      </div>

      {/* TẦNG 4: CHECKBOX YÊU THÍCH & NÚT ĐẶT LẠI BỘ LỌC */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <label
          htmlFor={`${idPrefix}-filter-favorites`}
          className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
        >
          <Checkbox
            id={`${idPrefix}-filter-favorites`}
            data-testid="filter-only-favorites"
            checked={Boolean(filters.onlyFavorites)}
            onCheckedChange={(checked) =>
              onFilterChange({
                ...filters,
                onlyFavorites: Boolean(checked),
              })
            }
          />
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
            Chỉ hiện các đề đã yêu thích
          </span>
        </label>

        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onResetFilters}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold p-0 h-auto min-h-0"
        >
          Đặt lại bộ lọc
        </Button>
      </div>
    </Card>
  );
}
