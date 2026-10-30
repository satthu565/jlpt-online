'use client';

import { Search, Star } from 'lucide-react';
import React from 'react';
import type { Level, ExamKind, Session } from '@jlpt/schema';
import type { LibraryFilterState, UserExamStatus } from '../types';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';

export interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onFilterChange: (newFilters: LibraryFilterState) => void;
  onResetFilters: () => void;
  availableYears?: number[];
  showStatusFilter?: boolean;
  className?: string;
}

export function LibraryFilters({
  filters,
  onFilterChange,
  onResetFilters,
  availableYears = [2024, 2023, 2022, 2021, 2020],
  showStatusFilter = true,
  className = '',
}: LibraryFiltersProps): React.JSX.Element {
  const levels: Array<Level | 'ALL'> = ['ALL', 'N1', 'N2', 'N3', 'N4', 'N5'];
  const sessions: Array<{ id: Session | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Tất cả các kỳ' },
    { id: '7', label: 'Kỳ tháng 7' },
    { id: '12', label: 'Kỳ tháng 12' },
  ];
  const kinds: Array<{ id: ExamKind | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Tất cả thể loại' },
    { id: 'original', label: 'Đề thi thật (Original)' },
    { id: 'practice', label: 'Đề luyện tự biên soạn' },
    { id: 'mixed', label: 'Đề trộn ngân hàng' },
  ];
  const statuses: Array<{ id: UserExamStatus | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Mọi trạng thái' },
    { id: 'not_started', label: 'Chưa từng làm' },
    { id: 'in_progress', label: 'Đang làm dở' },
    { id: 'completed', label: 'Đã hoàn thành' },
    { id: 'below_target', label: 'Chưa đạt mục tiêu' },
  ];

  return (
    <div
      className={`jlpt-library-filters bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 ${className}`}
      role="search"
      aria-label="Bộ lọc thư viện đề thi"
    >
      {/* Search Input */}
      <div>
        <label
          htmlFor="library-search-input"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
        >
          Tìm kiếm đề thi
        </label>
        <div className="relative">
          <Input
            id="library-search-input"
            type="search"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Nhập tên đề thi, từ khóa hoặc cấp độ..."
            className="w-full px-4 py-2.5 pl-10 text-sm"
          />
          <Search className="pointer-events-none absolute left-3.5 top-3 size-4 text-slate-400" aria-hidden="true" />
        </div>
      </div>

      {/* Level Buttons Filter */}
      <div>
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Cấp độ JLPT
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo cấp độ">
          {levels.map((lvl) => (
            <Button
              key={lvl}
              type="button"
              size="sm"
              variant={filters.level === lvl ? 'primary' : 'secondary'}
              onClick={() => onFilterChange({ ...filters, level: lvl })}
              aria-pressed={filters.level === lvl}
              className="text-xs font-bold"
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : lvl}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Year Filter Buttons (1-touch selection) */}
      <div>
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Năm thi
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc nhanh theo năm thi">
          <Button
            type="button"
            size="sm"
            variant={filters.year === 'ALL' ? 'primary' : 'secondary'}
            onClick={() => onFilterChange({ ...filters, year: 'ALL' })}
            aria-pressed={filters.year === 'ALL'}
            className="text-xs font-semibold px-2.5 py-1 h-auto min-h-0"
          >
            Tất cả các năm
          </Button>
          {availableYears.map((yr) => (
            <Button
              key={yr}
              type="button"
              size="sm"
              variant={filters.year === yr ? 'primary' : 'secondary'}
              onClick={() => onFilterChange({ ...filters, year: yr })}
              aria-pressed={filters.year === yr}
              className="text-xs font-semibold px-2.5 py-1 h-auto min-h-0"
            >
              {yr}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Session Filter Buttons */}
      <div>
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Kỳ thi
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc nhanh theo kỳ thi">
          {sessions.map((sess) => (
            <Button
              key={sess.id}
              type="button"
              size="sm"
              variant={filters.session === sess.id ? 'primary' : 'secondary'}
              onClick={() => onFilterChange({ ...filters, session: sess.id })}
              aria-pressed={filters.session === sess.id}
              className="text-xs font-semibold px-2.5 py-1 h-auto min-h-0"
            >
              {sess.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Dropdown Filters Row: Year, Session, Kind, User Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Year Filter Select */}
        <div>
          <label
            htmlFor="filter-year-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Năm thi (danh sách)
          </label>
          <Select
            id="filter-year-select"
            value={filters.year}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                year: e.target.value === 'ALL' ? 'ALL' : Number.parseInt(e.target.value, 10),
              })
            }
            className="w-full text-xs"
          >
            <option value="ALL">Tất cả các năm</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Năm {yr}
              </option>
            ))}
          </Select>
        </div>

        {/* Session Filter Select */}
        <div>
          <label
            htmlFor="filter-session-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Kỳ thi (danh sách)
          </label>
          <Select
            id="filter-session-select"
            value={filters.session}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                session: e.target.value as Session | 'ALL',
              })
            }
            className="w-full text-xs"
          >
            {sessions.map((sess) => (
              <option key={sess.id} value={sess.id}>
                {sess.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Kind Filter */}
        <div>
          <label
            htmlFor="filter-kind-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Thể loại đề
          </label>
          <Select
            id="filter-kind-select"
            value={filters.kind}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                kind: e.target.value as ExamKind | 'ALL',
              })
            }
            className="w-full text-xs"
          >
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </Select>
        </div>

        {/* User Status Filter */}
        {showStatusFilter && (
          <div>
            <label
              htmlFor="filter-status-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Trạng thái của bạn
            </label>
            <Select
              id="filter-status-select"
              value={filters.userStatus}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  userStatus: e.target.value as UserExamStatus | 'ALL',
                })
              }
              className="w-full text-xs"
            >
              {statuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Favorite filter toggle & Reset filters button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Input
            type="checkbox"
            checked={Boolean(filters.onlyFavorites)}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                onlyFavorites: e.target.checked,
              })
            }
            data-testid="filter-only-favorites"
            className="h-4 w-4 min-h-0 cursor-pointer rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="inline-flex items-center gap-1"><Star className="size-3.5" aria-hidden="true" /> Chỉ hiện các đề đã yêu thích</span>
        </label>

        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onResetFilters}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium p-0 h-auto min-h-0"
        >
          Đặt lại bộ lọc
        </Button>
      </div>
    </div>
  );
}