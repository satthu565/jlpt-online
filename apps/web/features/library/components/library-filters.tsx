'use client';

import React from 'react';
import { Search, Calendar, Clock, FileText, Layers, Star } from 'lucide-react';
import type { Level, ExamKind, Session } from '@jlpt/schema';
import type { LibraryFilterState, UserExamStatus } from '../types';
import { Button, Card, Checkbox, Input, ListBox, Select } from '@jlpt/ui/components/exam-controls';
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
              fullWidth
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
            onPress={onSearchSubmit}
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
            variant="ghost"
            onPress={() => onFilterChange({ ...filters, level: 'ALL' })}
            aria-pressed={filters.level === 'ALL'}
            className={`px-4 py-1 text-xs font-bold h-7.5 min-h-0 rounded-full transition-all ${
              filters.level === 'ALL'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
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
                onPress={() => onFilterChange({ ...filters, level: isSelected ? 'ALL' : lvl })}
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
          <span
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Năm thi</span>
          </span>
          <Select
            id={`${idPrefix}-filter-year-select`}
            fullWidth
            aria-label="Năm thi"
            selectedKey={filters.year.toString()}
            onSelectionChange={(key) => {
              const v = String(key);
              onFilterChange({ ...filters, year: v === 'ALL' ? 'ALL' : Number.parseInt(v, 10) });
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="ALL" textValue="Tất cả các năm">
                  Tất cả các năm
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {availableYears.map((yr) => (
                  <ListBox.Item key={yr} id={yr.toString()} textValue={`Năm ${yr}`}>
                    Năm {yr}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Dropdown 2: Kỳ thi */}
        <div>
          <span
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Kỳ thi</span>
          </span>
          <Select
            id={`${idPrefix}-filter-session-select`}
            fullWidth
            aria-label="Kỳ thi"
            selectedKey={filters.session}
            onSelectionChange={(key) => {
              const v = String(key);
              onFilterChange({ ...filters, session: v as Session | 'ALL' });
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="ALL" textValue="Tất cả các kỳ">
                  Tất cả các kỳ
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="7" textValue="Kỳ tháng 7">
                  Kỳ tháng 7
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="12" textValue="Kỳ tháng 12">
                  Kỳ tháng 12
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Dropdown 3: Thể loại đề */}
        <div>
          <span
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
          >
            <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
            <span>Thể loại đề</span>
          </span>
          <Select
            id={`${idPrefix}-filter-kind-select`}
            fullWidth
            aria-label="Thể loại đề"
            selectedKey={filters.kind}
            onSelectionChange={(key) => {
              const v = String(key);
              onFilterChange({ ...filters, kind: v as ExamKind | 'ALL' });
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="ALL" textValue="Tất cả thể loại">
                  Tất cả thể loại
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="original" textValue="Đề thi thật (Original)">
                  Đề thi thật (Original)
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="practice" textValue="Đề luyện tự biên soạn">
                  Đề luyện tự biên soạn
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="mixed" textValue="Đề trộn ngân hàng">
                  Đề trộn ngân hàng
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {/* Dropdown 4: Trạng thái của bạn */}
        {showStatusFilter && (
          <div>
            <span
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
            >
              <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
              <span>Trạng thái của bạn</span>
            </span>
            <Select
              id={`${idPrefix}-filter-status-select`}
              fullWidth
              aria-label="Trạng thái của bạn"
              selectedKey={filters.userStatus}
              onSelectionChange={(key) => {
                const v = String(key);
                onFilterChange({ ...filters, userStatus: v as UserExamStatus | 'ALL' });
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="ALL" textValue="Mọi trạng thái">
                    Mọi trạng thái
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="not_started" textValue="Chưa từng làm">
                    Chưa từng làm
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="in_progress" textValue="Đang làm dở">
                    Đang làm dở
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="completed" textValue="Đã hoàn thành">
                    Đã hoàn thành
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="below_target" textValue="Chưa đạt mục tiêu">
                    Chưa đạt mục tiêu
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        )}
      </div>

      {/* TẦNG 4: CHECKBOX YÊU THÍCH & NÚT ĐẶT LẠI BỘ LỌC */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <Checkbox
          id={`${idPrefix}-filter-favorites`}
          data-testid="filter-only-favorites"
          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          isSelected={Boolean(filters.onlyFavorites)}
          onChange={(checked) =>
            onFilterChange({
              ...filters,
              onlyFavorites: checked,
            })
          }
        >
          <Checkbox.Content className="flex flex-row items-center gap-2">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
              Chỉ hiện các đề đã yêu thích
            </span>
          </Checkbox.Content>
        </Checkbox>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={onResetFilters}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold p-0 h-auto min-h-0"
        >
          Đặt lại bộ lọc
        </Button>
      </div>
    </Card>
  );
}
