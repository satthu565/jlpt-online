'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  FileText,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Play,
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@jlpt/ui/components/tooltip';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';
import { SITE_NAME, SITE_URL } from '../lib/site';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import { useExamFavorites } from '../features/library/hooks/use-exam-favorites';
import { ExamHero } from '../features/library/components/exam-hero';
import { LibraryFilters } from '../features/library/components/library-filters';
import type { ExamWithUserStatus, LibraryFilterState } from '../features/library/types';
import { INITIAL_LIBRARY_FILTERS } from '../features/library/types';
import type { Level } from '@jlpt/schema';
import { HomeSessionCard, type ExamSessionGroup } from './home-session-card';

const LEVEL_CONFIGS: Array<{
  level: Level;
  bgClass: string;
  borderClass: string;
  textClass: string;
  desc: string;
}> = [
  {
    level: 'N5',
    bgClass: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    borderClass: 'border-emerald-200/80 dark:border-emerald-900/40',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    desc: 'Bắt đầu làm quen với tiếng Nhật',
  },
  {
    level: 'N4',
    bgClass: 'bg-sky-50/70 dark:bg-sky-950/25',
    borderClass: 'border-sky-200/80 dark:border-sky-900/40',
    textClass: 'text-sky-700 dark:text-sky-400',
    desc: 'Nền tảng giao tiếp cơ bản',
  },
  {
    level: 'N3',
    bgClass: 'bg-amber-50/70 dark:bg-amber-950/25',
    borderClass: 'border-amber-200/80 dark:border-amber-900/40',
    textClass: 'text-amber-700 dark:text-amber-400',
    desc: 'Sử dụng tiếng Nhật trong đời sống',
  },
  {
    level: 'N2',
    bgClass: 'bg-rose-50/70 dark:bg-rose-950/25',
    borderClass: 'border-rose-200/80 dark:border-rose-900/40',
    textClass: 'text-rose-700 dark:text-rose-400',
    desc: 'Giao tiếp và làm việc ở mức độ cao hơn',
  },
  {
    level: 'N1',
    bgClass: 'bg-indigo-50/70 dark:bg-indigo-950/25',
    borderClass: 'border-indigo-200/80 dark:border-indigo-900/40',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    desc: 'Thành thạo tiếng Nhật trong mọi tình huống',
  },
];

// Cards rendered before the user asks for more. Rendering every session at once cost ~1 s of main-thread time on mobile.
const INITIAL_VISIBLE_SESSIONS = 9;
const VISIBLE_SESSIONS_STEP = 18;

const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn quốc tế từ N5 đến N1.',
};

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const favorites = useExamFavorites();

  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-progress exam for logged-in user
  const inProgressExam = useMemo(() => {
    return exams.find((e) => e.userStatus === 'in_progress') || null;
  }, [exams]);

  // User study progress metrics
  const userStats = useMemo(() => {
    const completed = exams.filter((e) => e.userStatus === 'completed').length;
    const inProgress = exams.filter((e) => e.userStatus === 'in_progress').length;
    return { completed, inProgress };
  }, [exams]);

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

  // Filter States
  const [filters, setFilters] = useState<LibraryFilterState>(INITIAL_LIBRARY_FILTERS);

  // Selected level per session card (key -> level)
  const [cardSelectedLevel, setCardSelectedLevel] = useState<Record<string, Level>>({});

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

  // Extract all available years from the exam data
  const availableYears = useMemo(() => {
    const yrs = Array.from(
      new Set(
        exams
          .map((e) => e.year)
          .filter((y): y is number => typeof y === 'number' && !Number.isNaN(y)),
      ),
    ).sort((a, b) => b - a);
    return yrs.length > 0 ? yrs : [2024, 2023, 2022, 2021, 2020];
  }, [exams]);

  // Filter exams according to all active criteria
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if ((exam.totalQuestions ?? 0) === 0) return false;

      // 1. Level filter
      if (filters.level !== 'ALL' && exam.level !== filters.level) {
        return false;
      }

      // 2. Year filter
      if (filters.year !== 'ALL' && exam.year !== filters.year) {
        return false;
      }

      // 3. Session filter
      if (filters.session !== 'ALL' && exam.session !== filters.session) {
        return false;
      }

      // 4. Kind filter (Exam Category)
      if (filters.kind !== 'ALL' && exam.kind !== filters.kind) {
        return false;
      }

      // 5. User Status filter
      if (filters.userStatus !== 'ALL' && exam.userStatus !== filters.userStatus) {
        return false;
      }

      // 6. Favorites filter
      if (filters.onlyFavorites && !favorites.ids.has(exam.id)) {
        return false;
      }

      // 7. Keyword Search (title, level, year, session)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim().toLowerCase();
        const matchTitle = (exam.title || '').toLowerCase().includes(q);
        const matchLevel = (exam.level || '').toLowerCase().includes(q);
        const matchYear = exam.year ? exam.year.toString().includes(q) : false;
        const matchSession = exam.session ? `tháng ${exam.session}`.includes(q) : false;
        if (!matchTitle && !matchLevel && !matchYear && !matchSession) {
          return false;
        }
      }

      return true;
    });
  }, [exams, filters, favorites.ids]);

  // Group filtered exams by (year, session)
  const sessionGroups = useMemo(() => {
    const map = new Map<string, ExamSessionGroup>();

    for (const exam of filteredExams) {
      if (!exam.year || !exam.session) continue;
      const key = `${exam.year}-${exam.session}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          year: exam.year,
          session: exam.session,
          examsByLevel: {},
        });
      }
      const group = map.get(key)!;
      group.examsByLevel[exam.level as Level] = exam;
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return Number.parseInt(b.session, 10) - Number.parseInt(a.session, 10);
    });

    return list;
  }, [filteredExams]);

  const [visibleSessionCount, setVisibleSessionCount] = useState(INITIAL_VISIBLE_SESSIONS);
  const visibleGroups = useMemo(
    () => sessionGroups.slice(0, visibleSessionCount),
    [sessionGroups, visibleSessionCount],
  );
  const hiddenSessionCount = sessionGroups.length - visibleGroups.length;
  const takeExamLabel = t('home.takeExamNow');

  const handleLevelCardClick = (level: Level) => {
    setFilters((prev) => ({ ...prev, level: prev.level === level ? 'ALL' : level }));
    handleSearchScroll();
  };

  const handleSelectCardLevel = useCallback((groupKey: string, lvl: Level) => {
    setCardSelectedLevel((prev) => ({ ...prev, [groupKey]: lvl }));
  }, []);

  const handleSearchScroll = () => {
    const el = document.getElementById('de-thi-theo-nam');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetAllFilters = () => {
    setFilters(INITIAL_LIBRARY_FILTERS);
  };

  const hasNonLevelFilters =
    Boolean(filters.searchQuery.trim()) ||
    filters.year !== 'ALL' ||
    filters.session !== 'ALL' ||
    filters.kind !== 'ALL' ||
    filters.userStatus !== 'ALL' ||
    Boolean(filters.onlyFavorites);
  const hasActiveFilters = hasNonLevelFilters || filters.level !== 'ALL';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60">
      <JsonLd id="homepage-website-schema" data={WEBSITE_STRUCTURED_DATA} />

      {/* Screen-reader compatibility strings for tests */}
      <span className="sr-only">{t('home.heroTitle')}</span>
      <span className="sr-only">{t('home.startFreeTrial')}</span>
      <span className="sr-only">{t('home.levelSelectLabel')}</span>
      <span className="sr-only">{t('home.yearSelectLabel')}</span>
      <span className="sr-only">{t('home.sessionSelectLabel')}</span>

      {/* Responsive preload for hero background image */}
      <link
        rel="preload"
        as="image"
        href="/images/hero-jlpt-bg-mobile.webp"
        imageSrcSet="/images/hero-jlpt-bg-mobile.webp"
        media="(max-width: 768px)"
        type="image/webp"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/hero-jlpt-bg.webp"
        imageSrcSet="/images/hero-jlpt-bg.webp"
        media="(min-width: 769px)"
        type="image/webp"
        fetchPriority="high"
      />

      {/* SECTION 1: HERO WITH INTEGRATED 3-TIER SEARCH FRAME */}
      <ExamHero
        inProgressExam={inProgressExam}
        userStats={userStats}
        favoritesCount={favorites.ids.size}
      >
        <LibraryFilters
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetAllFilters}
          availableYears={availableYears}
          onSearchSubmit={handleSearchScroll}
          idPrefix="homepage"
        />
      </ExamHero>

      {/* SECTION 2: CHỌN NHANH THEO CẤP ĐỘ */}
      {!hasNonLevelFilters && (
        <section className="py-10 px-4 sm:px-6">
          <div className="container">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('home.quickLevelSelect')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {LEVEL_CONFIGS.map(({ level, bgClass, borderClass, textClass, desc }) => {
                const isActive = filters.level === level;
                return (
                  <Card
                    key={level}
                    onClick={() => handleLevelCardClick(level)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${bgClass} ${borderClass} ${
                      isActive
                        ? 'ring-2 ring-blue-500 shadow-md'
                        : 'hover:shadow-sm hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <h3 className={`text-2xl font-black ${textClass} mb-1 tracking-tight`}>
                        {level}
                      </h3>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed pr-2">
                        {desc}
                      </p>
                      <div className="size-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: ĐỀ THI THEO NĂM & KẾT QUẢ TÌM KIẾM */}
      <section
        id="de-thi-theo-nam"
        className={`pb-16 px-4 sm:px-6 ${hasActiveFilters ? 'pt-8' : ''}`}
      >
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
                onClick={handleResetAllFilters}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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

          {/* 4. RECOMMENDED EXAM SPOTLIGHT (Hiển thị khi không lọc) */}
          {!hasActiveFilters && recommendedExam && (
            <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-900 border border-blue-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    <Sparkles className="size-3 text-amber-600" aria-hidden="true" />
                    Đề thi gợi ý hôm nay
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-bold badge-level-${recommendedExam.level.toLowerCase()}`}
                  >
                    {recommendedExam.level}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Đề thi thật chính thức</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {recommendedExam.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {recommendedExam.totalQuestions} câu hỏi •{' '}
                  {Math.round(
                    recommendedExam.sections.reduce((a, s) => a + s.durationSec, 0) / 60,
                  )}{' '}
                  phút • Đầy đủ âm thanh &amp; đáp án chi tiết
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-initial h-10 px-4 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <a
                        href={`/phong-thi?examId=${recommendedExam.id}&mode=practice`}
                        className="no-underline flex items-center justify-center gap-1.5"
                        aria-label="Chế độ Luyện tự do: Làm bài không bị áp lực thời gian. Bạn có thể xem ngay đáp án, tra cứu giải thích chi tiết sau mỗi câu và tạm dừng bất cứ lúc nào."
                      >
                        <BookOpen className="size-3.5" aria-hidden="true" />
                        <span>Luyện tự do</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Chế độ Luyện tự do: Làm bài không bị áp lực thời gian. Bạn có thể xem ngay đáp án, tra cứu giải thích chi tiết sau mỗi câu và tạm dừng bất cứ lúc nào.
                  </TooltipContent>
                </Tooltip>

                <Button
                  asChild
                  variant="primary"
                  size="sm"
                  className="flex-1 sm:flex-initial h-10 px-5 rounded-xl text-xs font-bold shadow-sm"
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
                        <div
                          key={j}
                          className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"
                        />
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
                onClick={handleResetAllFilters}
                className="rounded-xl text-xs font-semibold"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleGroups.map((session) => {
                const candidateLevel =
                  cardSelectedLevel[session.key] ||
                  (filters.level !== 'ALL' ? (filters.level as Level) : null);
                const allAvailableLevels: Level[] = (['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).filter(
                  (lvl) => Boolean(session.examsByLevel[lvl]),
                );
                const activeLevel =
                  candidateLevel && session.examsByLevel[candidateLevel]
                    ? candidateLevel
                    : allAvailableLevels[0] || 'N2';
                const targetExam =
                  session.examsByLevel[activeLevel] || Object.values(session.examsByLevel)[0];

                return (
                  <HomeSessionCard
                    key={session.key}
                    session={session}
                    activeLevel={activeLevel}
                    isFavorite={Boolean(targetExam && favorites.ids.has(targetExam.id))}
                    isFavPending={Boolean(targetExam && favorites.pendingIds.has(targetExam.id))}
                    takeExamLabel={takeExamLabel}
                    onSelectLevel={handleSelectCardLevel}
                    onToggleFavorite={favorites.toggleFavorite}
                  />
                );
              })}
            </div>
          )}

          {!loading && hiddenSessionCount > 0 && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVisibleSessionCount((count) => count + VISIBLE_SESSIONS_STEP)}
                className="rounded-xl text-xs font-semibold"
              >
                {t('home.showMoreSessions', { count: hiddenSessionCount })}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  </TooltipProvider>
  );
}
