'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  ArrowRight,
  AlertTriangle,
  Star,
  Sparkles,
  BookOpen,
  Play,
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { ExamApiClient, ExamApiError } from '../../exam/api/exam-api';
import { useExamFavorites } from '../hooks/use-exam-favorites';
import type { ExamWithUserStatus } from '../types';
import type { Level } from '@jlpt/schema';

export interface ExamSessionGroup {
  key: string;
  year: number;
  session: string;
  examsByLevel: Partial<Record<Level, ExamWithUserStatus>>;
}

export interface HomeExamCatalogProps {
  searchQuery: string;
  filterLevel: string;
  filterYear: string;
  filterSession: string;
  filterKind: string;
  filterStatus: string;
  onlyFavorites: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onClearSearch: () => void;
  onClearLevel: () => void;
  onClearYear: () => void;
  onClearSession: () => void;
  onClearKind: () => void;
  onClearStatus: () => void;
  onClearFavorites: () => void;
  onUserProgress?: (data: {
    inProgressExam: ExamWithUserStatus | null;
    userStats: { completed: number; inProgress: number };
    availableYears: number[];
  }) => void;
}

export function HomeExamCatalogSkeleton(): React.JSX.Element {
  const { t } = useI18n();
  return (
    <section id="de-thi-theo-nam" className="pb-16 px-4 sm:px-6">
      <div className="container">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('home.examsByYear')}
            </h2>
          </div>
          <a
            href="/de-thi"
            className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>{t('home.viewAllExams')}</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={`skeleton-${i}`}
              className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4"
            >
              <div className="flex gap-6">
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-24" />
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0" />
                <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeExamCatalog({
  searchQuery,
  filterLevel,
  filterYear,
  filterSession,
  filterKind,
  filterStatus,
  onlyFavorites,
  hasActiveFilters,
  onResetFilters,
  onClearSearch,
  onClearLevel,
  onClearYear,
  onClearSession,
  onClearKind,
  onClearStatus,
  onClearFavorites,
  onUserProgress,
}: HomeExamCatalogProps): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const favorites = useExamFavorites();
  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardSelectedLevel, setCardSelectedLevel] = useState<Record<string, Level>>({});

  const onUserProgressRef = useRef(onUserProgress);
  useEffect(() => {
    onUserProgressRef.current = onUserProgress;
  });

  const loadExams = useCallback(async () => {
    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);

      const [examsRes, userStatusRes] = await Promise.all([
        client.getExams(),
        user
          ? client.getUserExamStatus().catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);

      const statusMap = new Map((userStatusRes.items || []).map((s) => [s.examId, s]));

      const mappedExams: ExamWithUserStatus[] = examsRes.items.map((e) => {
        const userStat = statusMap.get(e.id);
        return {
          ...e,
          userStatus: userStat?.status || 'not_started',
          attemptsCount: userStat?.attempts || 0,
        };
      });

      setExams(mappedExams);

      if (onUserProgressRef.current) {
        const inProgressExam = mappedExams.find((e) => e.userStatus === 'in_progress') || null;
        const completed = mappedExams.filter((e) => e.userStatus === 'completed').length;
        const inProgress = mappedExams.filter((e) => e.userStatus === 'in_progress').length;
        const yrs = Array.from(
          new Set(
            mappedExams
              .map((e) => e.year)
              .filter((y): y is number => typeof y === 'number' && !Number.isNaN(y)),
          ),
        ).sort((a, b) => b - a);

        onUserProgressRef.current({
          inProgressExam,
          userStats: { completed, inProgress },
          availableYears: yrs.length > 0 ? yrs : [2024, 2023, 2022, 2021, 2020],
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof ExamApiError
          ? err.message
          : 'Không thể kết nối đến máy chủ để tải danh sách đề thi. Vui lòng kiểm tra kết nối mạng và thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleSelectCardLevel = (groupKey: string, level: Level) => {
    setCardSelectedLevel((prev) => ({ ...prev, [groupKey]: level }));
  };

  // Recommended Spotlight Exam (most relevant / recent official exam)
  const recommendedExam = useMemo(() => {
    if (exams.length === 0) return null;
    return (
      exams.find((e) => e.kind === 'original' && e.year === 2024 && e.level === 'N3') ||
      exams.find((e) => e.kind === 'original' && e.year === 2024) ||
      exams.find((e) => e.kind === 'original') ||
      exams[0]
    );
  }, [exams]);

  // Filter exams according to all active criteria
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if ((exam.totalQuestions ?? 0) === 0) return false;

      // 1. Level filter
      if (filterLevel !== 'ALL' && exam.level !== filterLevel) {
        return false;
      }

      // 2. Year filter
      if (filterYear !== 'ALL' && exam.year?.toString() !== filterYear) {
        return false;
      }

      // 3. Session filter
      if (filterSession !== 'ALL') {
        const sessionNorm = exam.session ? String(parseInt(exam.session, 10)) : '';
        const filterNorm = String(parseInt(filterSession, 10));
        if (sessionNorm !== filterNorm) return false;
      }

      // 4. Kind filter
      if (filterKind !== 'ALL' && exam.kind !== filterKind) {
        return false;
      }

      // 5. User Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'below_target') {
          if (exam.userStatus !== 'below_target') return false;
        } else if (exam.userStatus !== filterStatus) {
          return false;
        }
      }

      // 6. Favorites only
      if (onlyFavorites && !favorites.ids.has(exam.id)) {
        return false;
      }

      // 7. Search keyword
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = exam.title.toLowerCase().includes(query);
        const levelMatch = exam.level.toLowerCase().includes(query);
        const yearMatch = exam.year?.toString().includes(query) ?? false;
        if (!titleMatch && !levelMatch && !yearMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    exams,
    filterLevel,
    filterYear,
    filterSession,
    filterKind,
    filterStatus,
    onlyFavorites,
    searchQuery,
    favorites.ids,
  ]);

  // Group exams by session and year
  const sessionGroups: ExamSessionGroup[] = useMemo(() => {
    const groupsMap = new Map<string, ExamSessionGroup>();

    for (const exam of filteredExams) {
      const year = exam.year || 2024;
      const rawSession = exam.session || '7';
      const sessionParsed = parseInt(rawSession, 10);
      const session = Number.isNaN(sessionParsed) ? '7' : sessionParsed.toString();

      const groupKey = `${year}-${session}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          year,
          session,
          examsByLevel: {},
        });
      }

      const group = groupsMap.get(groupKey)!;
      group.examsByLevel[exam.level] = exam;
    }

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year; // descending by year
      }
      return parseInt(b.session, 10) - parseInt(a.session, 10); // descending by session
    });
  }, [filteredExams]);

  return (
    <section id="de-thi-theo-nam" className={`pb-16 px-4 sm:px-6 ${hasActiveFilters ? 'pt-8' : ''}`}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {hasActiveFilters ? (
                <>
                  <span>Kết quả tìm kiếm</span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                    ({sessionGroups.length} kỳ thi phù hợp)
                  </span>
                </>
              ) : (
                t('home.examsByYear')
              )}
            </h2>
          </div>
          <a
            href="/de-thi"
            className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>{t('home.viewAllExams')}</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        {/* Active Filter Indicators */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Đang lọc:</span>
            {Boolean(searchQuery.trim()) && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearSearch}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Từ khóa: &quot;{searchQuery}&quot; ✕
              </Button>
            )}
            {filterLevel !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearLevel}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Cấp độ: {filterLevel} ✕
              </Button>
            )}
            {filterYear !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearYear}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Năm: {filterYear} ✕
              </Button>
            )}
            {filterSession !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearSession}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Kỳ thi: Tháng {filterSession} ✕
              </Button>
            )}
            {filterKind !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearKind}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Thể loại: {filterKind === 'original' ? 'Đề thật' : filterKind === 'practice' ? 'Tự luyện' : 'Đề trộn'} ✕
              </Button>
            )}
            {filterStatus !== 'ALL' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearStatus}
                className="rounded-full text-xs h-7 px-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              >
                Trạng thái: {filterStatus === 'not_started' ? 'Chưa làm' : filterStatus === 'in_progress' ? 'Đang làm' : 'Hoàn thành'} ✕
              </Button>
            )}
            {onlyFavorites && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearFavorites}
                className="rounded-full text-xs h-7 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                ⭐ Đã yêu thích ✕
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Xóa tất cả
            </Button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <Alert variant="error" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadExams}
                className="ml-auto text-xs"
              >
                Thử lại
              </Button>
            </div>
          </Alert>
        )}

        {/* Recommended Exam Spotlight (Hiển thị khi không lọc) */}
        {!hasActiveFilters && recommendedExam && (
          <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900 border border-blue-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  <Sparkles className="size-3 text-amber-600" aria-hidden="true" />
                  Đề thi gợi ý hôm nay
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold badge-level-${recommendedExam.level.toLowerCase()}`}>
                  {recommendedExam.level}
                </span>
                <span className="text-xs text-slate-500 font-medium">Đề thi thật chính thức</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {recommendedExam.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recommendedExam.totalQuestions} câu hỏi • {Math.round(recommendedExam.sections.reduce((a, s) => a + s.durationSec, 0) / 60)} phút • Đầy đủ âm thanh &amp; đáp án chi tiết
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <div className="relative group/tip flex-1 sm:flex-initial">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <a
                    href={`/phong-thi?examId=${recommendedExam.id}&mode=practice`}
                    className="no-underline flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    <span>Luyện tự do</span>
                  </a>
                </Button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tip:block group-focus-within/tip:block z-50 w-64 p-3 text-xs rounded-xl shadow-lg bg-slate-900 text-slate-100 dark:bg-slate-800 dark:text-slate-100 border border-slate-700 leading-relaxed"
                >
                  <p className="font-bold text-blue-400 mb-1 flex items-center gap-1.5">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    <span>Chế độ Luyện tự do</span>
                  </p>
                  <p className="text-slate-300 dark:text-slate-300">
                    Làm bài không bị áp lực thời gian. Bạn có thể xem ngay đáp án, tra cứu giải thích chi tiết sau mỗi câu và tạm dừng bất cứ lúc nào.
                  </p>
                </div>
              </div>

              <Button
                asChild
                variant="primary"
                size="sm"
                className="flex-1 sm:flex-initial h-10 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <a
                  href={`/phong-thi?examId=${recommendedExam.id}`}
                  className="no-underline flex items-center justify-center gap-1.5"
                >
                  <Play className="size-3.5 fill-current" aria-hidden="true" />
                  <span>Vào thi ngay</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Cards Grid (3 Columns) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={`skeleton-${i}`}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4"
              >
                <div className="flex gap-6">
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                </div>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="flex gap-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0" />
                  <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : sessionGroups.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <p className="text-slate-500 text-sm mb-3">
              Không tìm thấy đề thi phù hợp với bộ lọc hiện tại.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs font-semibold"
            >
              Đặt lại bộ lọc
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessionGroups.map((session) => {
              const groupKey = session.key;
              const candidateLevel = cardSelectedLevel[groupKey] || (filterLevel !== 'ALL' ? (filterLevel as Level) : null);
              const allAvailableLevels: Level[] = (['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).filter(
                (lvl) => Boolean(session.examsByLevel[lvl]),
              );
              const activeLevel = candidateLevel && session.examsByLevel[candidateLevel]
                ? candidateLevel
                : allAvailableLevels[0] || 'N2';

              const targetExam = session.examsByLevel[activeLevel] || Object.values(session.examsByLevel)[0];
              const examUrl = targetExam ? `/phong-thi?examId=${targetExam.id}` : `/de-thi`;
              const isFavorite = Boolean(targetExam && favorites.ids.has(targetExam.id));
              const isFavPending = Boolean(targetExam && favorites.pendingIds.has(targetExam.id));

              return (
                <Card
                  key={groupKey}
                  className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Năm thi | Kỳ thi & Document Icon */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-6">
                        {/* Năm thi */}
                        <div>
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            <Calendar className="size-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                            <span>Năm thi</span>
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                            {session.year}
                          </span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

                        {/* Kỳ thi */}
                        <div>
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            <Clock className="size-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                            <span>Kỳ thi</span>
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                            Tháng {session.session}
                          </span>
                        </div>
                      </div>

                      {/* Document Icon */}
                      <FileText className="size-5 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
                    </div>

                    {/* Horizontal Divider */}
                    <div className="my-4 border-b border-slate-100 dark:border-slate-800" />

                    {/* Chọn cấp độ */}
                    <div>
                      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                        Chọn cấp độ
                      </span>
                      <div className="flex items-center gap-2" role="group" aria-label={`Cấp độ đề thi năm ${session.year}`}>
                        {(['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).map((lvl) => {
                          const examForLevel = session.examsByLevel[lvl];
                          const isAvailable = Boolean(examForLevel);
                          const isSelected = activeLevel === lvl;

                          return (
                            <Button
                              key={lvl}
                              type="button"
                              size="sm"
                              disabled={!isAvailable}
                              variant="ghost"
                              onClick={() => isAvailable && handleSelectCardLevel(groupKey, lvl)}
                              aria-pressed={isSelected}
                              className={`flex-1 h-10 min-h-0 p-0 text-xs font-bold rounded-xl transition-all border-2 flex items-center justify-center ${
                                isAvailable
                                  ? `badge-level-${lvl.toLowerCase()} cursor-pointer ${
                                      isSelected
                                        ? 'border-current font-black shadow-xs'
                                        : 'border-transparent opacity-85 hover:opacity-100'
                                    }`
                                  : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {lvl}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row: Favorite Button + "Làm bài ngay →" */}
                  <div className="flex items-center gap-2.5 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    {/* Favorite Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!targetExam || isFavPending}
                      onClick={() => targetExam && favorites.toggleFavorite(targetExam.id)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? 'Bỏ lưu đề yêu thích' : 'Lưu vào đề yêu thích'}
                      title={isFavorite ? 'Bỏ lưu đề yêu thích' : 'Lưu vào đề yêu thích'}
                      className={`size-10 min-h-0 p-0 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                        isFavorite
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-500 hover:bg-amber-100'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-300 dark:hover:border-amber-600'
                      }`}
                    >
                      <Star
                        className={`size-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`}
                        aria-hidden="true"
                      />
                    </Button>

                    {/* Take Exam Now Action Button */}
                    <Button
                      asChild
                      variant="primary"
                      size="sm"
                      className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <a href={examUrl} className="no-underline flex items-center justify-center gap-2">
                        <span>{t('home.takeExamNow')}</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>

                  {/* 5. QUICK SUB-ACTIONS: Luyện tự do & Luyện kỹ năng */}
                  <div className="flex items-center justify-between text-[11px] pt-2.5 mt-2.5 border-t border-dashed border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <a
                      href={targetExam ? `/phong-thi?examId=${targetExam.id}&mode=practice` : '/luyen-tap'}
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      title="Luyện tập tự do không tính giờ nghiêm ngặt"
                    >
                      <span>🎯 Luyện tự do</span>
                    </a>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <a
                      href="/luyen-tap"
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      title="Luyện đề trộn hoặc từng kỹ năng Từ vựng, Nghe, Đọc"
                    >
                      <span>⚡ Đề trộn &amp; Kỹ năng</span>
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
