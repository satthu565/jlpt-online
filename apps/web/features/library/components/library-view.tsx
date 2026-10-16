'use client';

import React, { useState, useMemo } from 'react';
import type { ExamWithUserStatus, LibraryFilterState } from '../types';
import { INITIAL_LIBRARY_FILTERS } from '../types';
import { LibraryFilters } from './library-filters';
import { ExamCard } from './exam-card';

export interface LibraryViewProps {
  exams: ExamWithUserStatus[];
  initialLevel?: string;
  className?: string;
}

export function LibraryView({
  exams,
  initialLevel,
  className = '',
}: LibraryViewProps): React.JSX.Element {
  const [filters, setFilters] = useState<LibraryFilterState>(() => ({
    ...INITIAL_LIBRARY_FILTERS,
    level: (initialLevel as LibraryFilterState['level']) || 'ALL',
  }));

  // Filter exams according to criteria (LIB-01..06, LIB-08)
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // 1. Level filter (LIB-02)
      if (filters.level !== 'ALL' && exam.level !== filters.level) {
        return false;
      }

      // 2. Year filter (LIB-03)
      if (filters.year !== 'ALL' && exam.year !== filters.year) {
        return false;
      }

      // 3. Session filter (LIB-04)
      if (filters.session !== 'ALL' && exam.session !== filters.session) {
        return false;
      }

      // 4. Kind filter (LIB-05)
      if (filters.kind !== 'ALL' && exam.kind !== filters.kind) {
        return false;
      }

      // 5. User status filter (LIB-08)
      if (filters.userStatus !== 'ALL') {
        const status = exam.userStatus || 'not_started';
        if (status !== filters.userStatus) {
          return false;
        }
      }

      // 6. Search query (LIB-06)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const titleMatch = exam.title.toLowerCase().includes(q);
        const levelMatch = exam.level.toLowerCase().includes(q);
        const sourceMatch = exam.sourceLabel ? exam.sourceLabel.toLowerCase().includes(q) : false;
        const yearMatch = exam.year ? exam.year.toString().includes(q) : false;

        if (!titleMatch && !levelMatch && !sourceMatch && !yearMatch) {
          return false;
        }
      }

      return true;
    });
  }, [exams, filters]);

  return (
    <div className={`jlpt-library-view space-y-6 ${className}`}>
      {/* Filters bar */}
      <LibraryFilters
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={() => setFilters(INITIAL_LIBRARY_FILTERS)}
      />

      {/* Results header: Total matching exams */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Hiển thị <strong>{filteredExams.length}</strong> / {exams.length} đề thi
        </span>
        {filters.level !== 'ALL' && (
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            Đang lọc cấp độ: {filters.level}
          </span>
        )}
      </div>

      {/* Exams Grid (LIB-01) */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div className="text-4xl mb-3" role="img" aria-label="Không có kết quả">
            📂
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            Không tìm thấy đề thi phù hợp
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
            Không có đề thi nào thỏa mãn các điều kiện tìm kiếm và lọc bạn đã chọn. Hãy thử nới lỏng bộ lọc hoặc tìm với từ khóa khác.
          </p>
          <button
            type="button"
            onClick={() => setFilters(INITIAL_LIBRARY_FILTERS)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            Xóa toàn bộ bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}
