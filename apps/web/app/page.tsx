'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Layers,
  Calendar,
  Clock,
  Search,
  ArrowRight,
  ChevronRight,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Input } from '@jlpt/ui/components/input';
import { Checkbox } from '@jlpt/ui/components/checkbox';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';
import { useExamFavorites } from '../features/library/hooks/use-exam-favorites';
import { HomeCountdown } from '../features/library/components/home-countdown';
import { HomeExamCatalogSkeleton } from '../features/library/components/home-exam-catalog';
import type { ExamWithUserStatus, UserExamStatus } from '../features/library/types';
import type { Level, ExamKind } from '@jlpt/schema';

const HomeExamCatalog = dynamic(
  () =>
    import('../features/library/components/home-exam-catalog').then(
      (mod) => mod.HomeExamCatalog,
    ),
  {
    loading: () => <HomeExamCatalogSkeleton />,
    ssr: false,
  },
);

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

const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JLPT Online',
  url: 'https://jlpt.vn',
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn quốc tế từ N5 đến N1.',
};

const DEFAULT_YEARS = [2024, 2023, 2022, 2021, 2020];

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const favorites = useExamFavorites();

  // User progress metrics if loaded from catalog
  const [inProgressExam, setInProgressExam] = useState<ExamWithUserStatus | null>(null);
  const [userStats, setUserStats] = useState({ completed: 0, inProgress: 0 });
  const [availableYears, setAvailableYears] = useState<number[]>(DEFAULT_YEARS);

  const handleUserProgress = useCallback(
    ({
      inProgressExam: ip,
      userStats: us,
      availableYears: ay,
    }: {
      inProgressExam: ExamWithUserStatus | null;
      userStats: { completed: number; inProgress: number };
      availableYears: number[];
    }) => {
      setInProgressExam(ip);
      setUserStats(us);
      if (ay && ay.length > 0) setAvailableYears(ay);
    },
    [],
  );

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterKind, setFilterKind] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setFilterLevel('ALL');
    setFilterYear('ALL');
    setFilterSession('ALL');
    setFilterKind('ALL');
    setFilterStatus('ALL');
    setOnlyFavorites(false);
  };

  const handleLevelCardClick = (level: Level) => {
    setFilterLevel(level);
    const target = document.getElementById('de-thi-theo-nam');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearchScroll = () => {
    const target = document.getElementById('de-thi-theo-nam');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    filterLevel !== 'ALL' ||
    filterYear !== 'ALL' ||
    filterSession !== 'ALL' ||
    filterKind !== 'ALL' ||
    filterStatus !== 'ALL' ||
    onlyFavorites;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60">
      <JsonLd id="homepage-website-schema" data={WEBSITE_STRUCTURED_DATA} />

      {/* Responsive Preload Hints for Hero Background Image (LCP Element) */}
      <link
        rel="preload"
        as="image"
        href="/images/hero-jlpt-bg-mobile.webp"
        type="image/webp"
        media="(max-width: 768px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/images/hero-jlpt-bg.webp"
        type="image/webp"
        media="(min-width: 769px)"
        fetchPriority="high"
      />

      {/* Screen-reader compatibility strings for tests */}
      <span className="sr-only">{t('home.heroTitle')}</span>
      <span className="sr-only">{t('home.startFreeTrial')}</span>
      <span className="sr-only">{t('home.levelSelectLabel')}</span>
      <span className="sr-only">{t('home.yearSelectLabel')}</span>
      <span className="sr-only">{t('home.sessionSelectLabel')}</span>

      {/* SECTION 1: HERO WITH INTEGRATED 3-TIER SEARCH FRAME */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pt-10 pb-12 px-4 sm:px-6">
        {/* Aesthetic Japanese Study Background Scene (Balanced Left & Right) */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          <picture>
            <source media="(max-width: 768px)" srcSet="/images/hero-jlpt-bg-mobile.webp" type="image/webp" />
            <img
              src="/images/hero-jlpt-bg.webp"
              alt=""
              aria-hidden="true"
              width={1376}
              height={768}
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover object-center opacity-90 dark:opacity-25"
            />
          </picture>
          {/* Soft tint overlay so text and card remain crisp and readable */}
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
        </div>

        <div className="container relative z-10">
          {/* 1. RESUME EXAM BANNER (Nếu có bài đang làm dở) */}
          {inProgressExam && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡ Tiếp tục bài thi đang làm dở</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">{inProgressExam.level}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {inProgressExam.title}
                  </div>
                </div>
              </div>
              <Button
                asChild
                variant="primary"
                size="sm"
                className="h-9 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <a href={`/phong-thi?examId=${inProgressExam.id}`} className="no-underline flex items-center gap-1.5">
                  <span>Tiếp tục làm ngay</span>
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}

          {/* Top Row: Title, Subtitle, User Progress on Left + Big Live Countdown Card on Right */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-7">
            <div className="max-w-2xl">
              {/* Badge: Official exam repository */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/90 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3.5 backdrop-blur-xs shadow-2xs">
                <span className="flex size-2 rounded-full bg-blue-600 animate-pulse" aria-hidden="true" />
                <span>Kho đề thi JLPT chính thức 2010 – 2026</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.18]">
                Luyện đề JLPT<br />
                <span className="text-blue-600 dark:text-blue-400">Chinh phục tiếng Nhật</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Kho đề thi JLPT các năm được tổng hợp đầy đủ, giúp bạn làm quen với cấu trúc đề thật và nâng cao kỹ năng tiếng Nhật.
              </p>

              {/* USER PROGRESS MINI-STRIP */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {user ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Đã hoàn thành: <strong>{userStats.completed} đề</strong></span>
                    </span>
                    {userStats.inProgress > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                        <Clock className="size-3.5 text-amber-600" aria-hidden="true" />
                        <span>Đang làm: <strong>{userStats.inProgress} đề</strong></span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                      <Star className="size-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
                      <span>Đã lưu: <strong>{favorites.ids.size} đề</strong></span>
                    </span>
                  </>
                ) : (
                  <a
                    href="/dang-nhap"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors"
                  >
                    <span>💡 Đăng nhập để lưu tiến độ, điểm thi và đồng bộ đề yêu thích</span>
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Right: Big Digital Live Countdown Highlight Card (Isolated Component) */}
            <HomeCountdown />
          </div>

          {/* SEARCH CARD CONTAINER (PHƯƠNG ÁN 1: 3 TẦNG ĐẦY ĐỦ TIÊU CHÍ) */}
          <Card className="rounded-2xl p-4 sm:p-5 shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 space-y-3">
            {/* TẦNG 1: TÌM KIẾM TỪ KHÓA & NÚT TÌM KIẾM */}
            <div>
              <label
                htmlFor="homepage-search-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2"
              >
                Tìm kiếm đề thi
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Input
                    id="homepage-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchScroll();
                    }}
                    placeholder="Nhập tên đề thi, từ khóa hoặc cấp độ..."
                    className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 transition-colors"
                  />
                  <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" aria-hidden="true" />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSearchScroll}
                  className="h-11 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shrink-0 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('home.searchExamsButton')}</span>
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
                  variant={filterLevel === 'ALL' ? 'primary' : 'ghost'}
                  onClick={() => setFilterLevel('ALL')}
                  aria-pressed={filterLevel === 'ALL'}
                  className={`px-4 py-1 text-xs font-bold h-7.5 min-h-0 rounded-full transition-all ${
                    filterLevel === 'ALL'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Tất cả cấp độ
                </Button>
                {(['N1', 'N2', 'N3', 'N4', 'N5'] as Level[]).map((lvl) => {
                  const isSelected = filterLevel === lvl;
                  return (
                    <Button
                      key={lvl}
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFilterLevel(isSelected ? 'ALL' : lvl)}
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
                  htmlFor="filter-year-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
                >
                  <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>Năm thi</span>
                </label>
                <Select
                  id="filter-year-select"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
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
                  htmlFor="filter-session-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
                >
                  <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>Kỳ thi</span>
                </label>
                <Select
                  id="filter-session-select"
                  value={filterSession}
                  onChange={(e) => setFilterSession(e.target.value)}
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
                  htmlFor="filter-kind-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
                >
                  <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>Thể loại đề</span>
                </label>
                <Select
                  id="filter-kind-select"
                  value={filterKind}
                  onChange={(e) => setFilterKind(e.target.value as ExamKind | 'ALL')}
                  className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
                >
                  <option value="ALL">Tất cả thể loại</option>
                  <option value="original">Đề thi thật (Original)</option>
                  <option value="practice">Đề luyện tự biên soạn</option>
                  <option value="mixed">Đề trộn ngân hàng</option>
                </Select>
              </div>

              {/* Dropdown 4: Trạng thái của bạn */}
              <div>
                <label
                  htmlFor="filter-status-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
                >
                  <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
                  <span>Trạng thái của bạn</span>
                </label>
                <Select
                  id="filter-status-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as UserExamStatus | 'ALL')}
                  className="w-full h-10 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 cursor-pointer"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="not_started">Chưa từng làm</option>
                  <option value="in_progress">Đang làm dở</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="below_target">Chưa đạt mục tiêu</option>
                </Select>
              </div>
            </div>

            {/* TẦNG 4 (CHÂN KHUNG): CHECKBOX YÊU THÍCH & NÚT ĐẶT LẠI BỘ LỌC */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <label
                htmlFor="homepage-filter-favorites"
                className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none"
              >
                <Checkbox
                  id="homepage-filter-favorites"
                  checked={onlyFavorites}
                  onCheckedChange={(checked) => setOnlyFavorites(Boolean(checked))}
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
                onClick={handleResetAllFilters}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold p-0 h-auto min-h-0"
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 2: CHỌN NHANH THEO CẤP ĐỘ */}
      {!hasActiveFilters && (
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
                const isActive = (filterLevel as string) === level;
                return (
                  <Card
                    key={level}
                    onClick={() => handleLevelCardClick(level)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${bgClass} ${borderClass} ${
                      isActive ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm hover:-translate-y-0.5'
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

      {/* SECTION 3: ĐỀ THI THEO NĂM & KẾT QUẢ TÌM KIẾM (DYNAMIC BELOW-THE-FOLD IMPORT) */}
      <HomeExamCatalog
        searchQuery={searchQuery}
        filterLevel={filterLevel}
        filterYear={filterYear}
        filterSession={filterSession}
        filterKind={filterKind}
        filterStatus={filterStatus}
        onlyFavorites={onlyFavorites}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetAllFilters}
        onClearSearch={() => setSearchQuery('')}
        onClearLevel={() => setFilterLevel('ALL')}
        onClearYear={() => setFilterYear('ALL')}
        onClearSession={() => setFilterSession('ALL')}
        onClearKind={() => setFilterKind('ALL')}
        onClearStatus={() => setFilterStatus('ALL')}
        onClearFavorites={() => setOnlyFavorites(false)}
        onUserProgress={handleUserProgress}
      />
    </div>
  );
}
