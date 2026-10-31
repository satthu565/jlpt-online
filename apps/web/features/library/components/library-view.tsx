'use client';

import { FolderOpen, Sparkles } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import type { ExamWithUserStatus, LibraryFilterState } from '../types';
import { INITIAL_LIBRARY_FILTERS } from '../types';
import { LibraryFilters } from './library-filters';
import { ExamHero } from './exam-hero';
import { ExamCard } from './exam-card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { useExamFavorites } from '../hooks/use-exam-favorites';
import { useI18n } from '../../../lib/i18n';

export interface LibraryViewProps {
  exams: ExamWithUserStatus[];
  initialLevel?: string;
  className?: string;
  showHero?: boolean;
}

export function LibraryView({
  exams: allExams,
  initialLevel,
  className = '',
  showHero = false,
}: LibraryViewProps): React.JSX.Element {
  const favorites = useExamFavorites();
  const { t } = useI18n();

  // In-progress exam for logged-in user
  const inProgressExam = useMemo(() => {
    return allExams.find((e) => e.userStatus === 'in_progress') || null;
  }, [allExams]);

  // User study progress metrics
  const userStats = useMemo(() => {
    const completed = allExams.filter((e) => e.userStatus === 'completed').length;
    const inProgress = allExams.filter((e) => e.userStatus === 'in_progress').length;
    return { completed, inProgress };
  }, [allExams]);

  // An exam with no questions (for example an empty generated mix) cannot be taken; never offer it.
  const exams = useMemo(
    () =>
      allExams
        .filter((e) => (e.totalQuestions ?? 0) > 0)
        .map((exam) => ({ ...exam, isFavorite: favorites.ids.has(exam.id) })),
    [allExams, favorites.ids],
  );

  const [filters, setFilters] = useState<LibraryFilterState>(() => ({
    ...INITIAL_LIBRARY_FILTERS,
    level: (initialLevel as LibraryFilterState['level']) || 'ALL',
  }));

  const availableYears = useMemo(() => {
    const yrs = Array.from(
      new Set(
        allExams
          .map((e) => e.year)
          .filter((y): y is number => typeof y === 'number' && !Number.isNaN(y)),
      ),
    ).sort((a, b) => b - a);
    return yrs.length > 0 ? yrs : [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  }, [allExams]);

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

  const handleSearchScroll = () => {
    const el = document.getElementById('danh-sach-de-thi');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hasActiveFilters =
    Boolean(filters.searchQuery.trim()) ||
    filters.level !== 'ALL' ||
    filters.year !== 'ALL' ||
    filters.session !== 'ALL' ||
    filters.kind !== 'ALL' ||
    filters.userStatus !== 'ALL' ||
    Boolean(filters.onlyFavorites);

  return (
    <div className={`jlpt-library-view ${className}`}>
      {/* SECTION 1: HERO (đồng bộ với trang chủ khi showHero bật) */}
      {showHero && (
        <ExamHero
          title="Thư viện đề thi JLPT N1–N5"
            minimal
          subtitle="Tổng hợp đề thi thật chính thức và đề thi thử nghiệm chuẩn cấu trúc đề thi năng lực tiếng Nhật quốc tế từ N1 đến N5."
          inProgressExam={inProgressExam}
          userStats={userStats}
          favoritesCount={favorites.ids.size}
        >
          <LibraryFilters
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters(INITIAL_LIBRARY_FILTERS)}
            availableYears={availableYears}
            onSearchSubmit={handleSearchScroll}
            idPrefix="library"
          />
        </ExamHero>
      )}

      <div className={showHero ? 'container py-8 space-y-6' : 'space-y-6'} id="danh-sach-de-thi">
        {favorites.error && (
          <Alert variant="error" role="alert">
            <p>{favorites.error}</p>
            <Button
              size="sm"
              variant="outline"
              disabled={favorites.pendingIds.size > 0}
              onClick={favorites.reload}
            >
              {t('library.favoriteRetry')}
            </Button>
          </Alert>
        )}

        {/* Next Recommendation Banner */}
        {recommendedExam && !hasActiveFilters && (
          <section
            data-testid="next-recommendation-banner"
            aria-label="Đề xuất đề thi tiếp theo"
            className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                    <Sparkles className="inline size-4 align-[-2px]" aria-hidden="true" /> Đề xuất tiếp theo
                  </span>
                  <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">
                    {recommendedExam.level}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {recommendedExam.title}
                </h2>
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

        {/* Filters bar (render tại đây khi không dùng hero) */}
        {!showHero && (
          <LibraryFilters
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters(INITIAL_LIBRARY_FILTERS)}
            availableYears={availableYears}
            onSearchSubmit={handleSearchScroll}
            idPrefix="library"
          />
        )}

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Đang lọc:</span>
            {Boolean(filters.searchQuery.trim()) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Từ khóa: &quot;{filters.searchQuery}&quot; ✕
              </Button>
            )}
            {filters.level !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, level: 'ALL' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Cấp độ: {filters.level} ✕
              </Button>
            )}
            {filters.year !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, year: 'ALL' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Năm: {filters.year} ✕
              </Button>
            )}
            {filters.session !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, session: 'ALL' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Kỳ thi: Tháng {filters.session} ✕
              </Button>
            )}
            {filters.kind !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, kind: 'ALL' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Thể loại:{' '}
                {filters.kind === 'original'
                  ? 'Đề thật'
                  : filters.kind === 'practice'
                    ? 'Tự luyện'
                    : 'Đề trộn'}{' '}
                ✕
              </Button>
            )}
            {filters.userStatus !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, userStatus: 'ALL' }))}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              >
                Trạng thái:{' '}
                {filters.userStatus === 'not_started'
                  ? 'Chưa làm'
                  : filters.userStatus === 'in_progress'
                    ? 'Đang làm'
                    : filters.userStatus === 'completed'
                      ? 'Hoàn thành'
                      : 'Chưa đạt mục tiêu'}{' '}
                ✕
              </Button>
            )}
            {filters.onlyFavorites && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFilters((prev) => ({ ...prev, onlyFavorites: false }))}
                className="rounded-full text-xs h-7 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
              >
                ⭐ Đã yêu thích ✕
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilters(INITIAL_LIBRARY_FILTERS)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Xóa tất cả
            </Button>
          </div>
        )}

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

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] text-center py-16 p-8">
            <FolderOpen
              className="mx-auto mb-3 size-10 text-slate-400"
              role="img"
              aria-label="Không có kết quả"
            />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              Không tìm thấy đề thi phù hợp
            </h3>
            <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
              Không có đề thi nào thỏa mãn các điều kiện tìm kiếm và lọc bạn đã chọn. Hãy thử nới
              lỏng bộ lọc hoặc tìm với từ khóa khác.
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
              <ExamCard
                key={exam.id}
                exam={exam}
                onToggleFavorite={favorites.toggleFavorite}
                favoritePending={favorites.pendingIds.has(exam.id)}
                favoriteDisabled={favorites.isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
