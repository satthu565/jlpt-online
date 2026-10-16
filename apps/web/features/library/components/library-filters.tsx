'use client';

import React from 'react';
import type { Level, ExamKind, Session } from '@jlpt/schema';
import type { LibraryFilterState, UserExamStatus } from '../types';

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
    { id: 'not_started', label: 'Chưa làm' },
    { id: 'in_progress', label: 'Đang làm dở' },
    { id: 'completed', label: 'Đã hoàn thành' },
  ];

  return (
    <div
      className={`jlpt-library-filters bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 ${className}`}
      role="search"
      aria-label="Bộ lọc thư viện đề thi"
    >
      {/* Search Input (LIB-06) */}
      <div>
        <label
          htmlFor="library-search-input"
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
        >
          Tìm kiếm đề thi (LIB-06)
        </label>
        <div className="relative">
          <input
            id="library-search-input"
            type="search"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Nhập tên đề thi, từ khóa hoặc cấp độ..."
            className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3.5 top-3 text-slate-400 text-sm" aria-hidden="true">
            🔍
          </span>
        </div>
      </div>

      {/* Level Buttons Filter (LIB-02) */}
      <div>
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Cấp độ JLPT (LIB-02)
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo cấp độ">
          {levels.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onFilterChange({ ...filters, level: lvl })}
              aria-pressed={filters.level === lvl}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filters.level === lvl
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {lvl === 'ALL' ? 'Tất cả cấp độ' : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown Filters Row: Year, Session, Kind, User Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Year Filter (LIB-03) */}
        <div>
          <label
            htmlFor="filter-year-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Năm thi (LIB-03)
          </label>
          <select
            id="filter-year-select"
            value={filters.year}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                year: e.target.value === 'ALL' ? 'ALL' : Number.parseInt(e.target.value, 10),
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả các năm</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                Năm {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Session Filter (LIB-04) */}
        <div>
          <label
            htmlFor="filter-session-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Kỳ thi (LIB-04)
          </label>
          <select
            id="filter-session-select"
            value={filters.session}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                session: e.target.value as Session | 'ALL',
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {sessions.map((sess) => (
              <option key={sess.id} value={sess.id}>
                {sess.label}
              </option>
            ))}
          </select>
        </div>

        {/* Kind Filter (LIB-05) */}
        <div>
          <label
            htmlFor="filter-kind-select"
            className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
          >
            Thể loại đề (LIB-05)
          </label>
          <select
            id="filter-kind-select"
            value={filters.kind}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                kind: e.target.value as ExamKind | 'ALL',
              })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        {/* User Status Filter (LIB-08) */}
        {showStatusFilter && (
          <div>
            <label
              htmlFor="filter-status-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              Trạng thái của bạn (LIB-08)
            </label>
            <select
              id="filter-status-select"
              value={filters.userStatus}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  userStatus: e.target.value as UserExamStatus | 'ALL',
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {statuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reset filters button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
}
