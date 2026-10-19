'use client';

import React, { useState, useMemo } from 'react';
import type { ExamWithUserStatus, LibraryFilterState } from '../types';
import { INITIAL_LIBRARY_FILTERS } from '../types';
import { LibraryFilters } from './library-filters';
import { ExamCard } from './exam-card';
import { Button } from '@jlpt/ui';

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

      // 5. User status filter (LIB-08, LIB-12, LIB-13)
      if (filters.userStatus !== 'ALL') {
        if (filters.userStatus === 'below_target') {
          const isBelow =
            exam.userStatus === 'below_target' ||
            (exam.bestScore !== undefined &&
              exam.bestScore !== null &&
              exam.bestScore < (exam.targetScore ?? 90));
          if (!isBelow) return false;
        } else if (filters.userStatus === 'not_started') {
          const isNotStarted = !exam.userStatus || exam.userStatus === 'not_started';
          if (!isNotStarted) return false;
        } else {
          const status = exam.userStatus || 'not_started';
          if (status !== filters.userStatus) {
            return false;
          }
        }
      }

      // 6. Favorites filter (LIB-11)
      if (filters.onlyFavorites && !exam.isFavorite) {
        return false;
      }

      // 7. Search query (LIB-06)
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

  // Next recommendation (LIB-14)
  const recommendedExam = useMemo(() => {
    return (
      exams.find((e) => e.isRecommendedNext) ||
      exams.find((e) => !e.userStatus || e.userStatus === 'not_started') ||
      exams[0]
    );
  }, [exams]);

  return (
    <div className={`jlpt-library-view space-y-6 ${className}`}>
      {/* Next Recommendation Banner (LIB-14) */}
      {recommendedExam && (
        <section
          data-testid="next-recommendation-banner"
          aria-label="Đề xuất đề thi tiếp theo"
          className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  ★ Đề xuất tiếp theo (LIB-14)
                </span>
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">
                  {recommendedExam.level}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {recommendedExam.title}
              </h3>
              <p className="text-xs text-blue-100 max-w-xl">
                Dựa trên tiến độ học tập của bạn, đề thi này giúp tối ưu hóa khả năng làm quen đề mới và lấp lỗ hổng kiến thức hiệu quả.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/phong-thi?examId=${recommendedExam.id}`}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Bắt đầu làm ngay
              </a>
              <a
                href={`/de-thi/${recommendedExam.slug}`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Xem chi tiết
              </a>
            </div>
          </div>
        </section>
      )}

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
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => setFilters(INITIAL_LIBRARY_FILTERS)}
            className="px-4 py-2 text-xs font-semibold"
          >
            Xóa toàn bộ bộ lọc
          </Button>
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
