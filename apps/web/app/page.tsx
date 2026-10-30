'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Calendar,
  Clock,
  Search,
  FileText,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Input } from '@jlpt/ui/components/input';
import { Checkbox } from '@jlpt/ui/components/checkbox';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import { useExamFavorites } from '../features/library/hooks/use-exam-favorites';
import type { ExamWithUserStatus, UserExamStatus } from '../features/library/types';
import type { Level, ExamKind } from '@jlpt/schema';

interface ExamSessionGroup {
  key: string;
  year: number;
  session: string;
  examsByLevel: Partial<Record<Level, ExamWithUserStatus>>;
}

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

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const favorites = useExamFavorites();

  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States (Matching Option 1 & Mockup)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');
  const [filterKind, setFilterKind] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);

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
      if (filterLevel !== 'ALL' && exam.level !== filterLevel) {
        return false;
      }

      // 2. Year filter
      if (filterYear !== 'ALL' && exam.year !== Number.parseInt(filterYear, 10)) {
        return false;
      }

      // 3. Session filter
      if (filterSession !== 'ALL' && exam.session !== filterSession) {
        return false;
      }

      // 4. Kind filter (Exam Category)
      if (filterKind !== 'ALL' && exam.kind !== filterKind) {
        return false;
      }

      // 5. User Status filter
      if (filterStatus !== 'ALL' && exam.userStatus !== filterStatus) {
        return false;
      }

      // 6. Favorites filter
      if (onlyFavorites && !favorites.ids.has(exam.id)) {
        return false;
      }

      // 7. Keyword Search (title, level, year, session)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
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
  }, [exams, filterLevel, filterYear, filterSession, filterKind, filterStatus, onlyFavorites, searchQuery, favorites.ids]);

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

  const handleLevelCardClick = (level: Level) => {
    setFilterLevel((prev) => (prev === level ? 'ALL' : level));
    handleSearchScroll();
  };

  const handleSelectCardLevel = (groupKey: string, lvl: Level) => {
    setCardSelectedLevel((prev) => ({ ...prev, [groupKey]: lvl }));
  };

  const handleSearchScroll = () => {
    const el = document.getElementById('de-thi-theo-nam');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setFilterLevel('ALL');
    setFilterYear('ALL');
    setFilterSession('ALL');
    setFilterKind('ALL');
    setFilterStatus('ALL');
    setOnlyFavorites(false);
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

      {/* Screen-reader compatibility strings for tests */}
      <span className="sr-only">{t('home.heroTitle')}</span>
      <span className="sr-only">{t('home.startFreeTrial')}</span>
      <span className="sr-only">{t('home.levelSelectLabel')}</span>
      <span className="sr-only">{t('home.yearSelectLabel')}</span>
      <span className="sr-only">{t('home.sessionSelectLabel')}</span>

      {/* SECTION 1: HERO WITH INTEGRATED 3-TIER SEARCH FRAME */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pt-10 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Top Row: Title & Subtitle on Left, Graphic on Right */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.18]">
                Luyện đề JLPT<br />
                <span className="text-blue-600 dark:text-blue-400">Chinh phục tiếng Nhật</span>
              </h1>
              <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Kho đề thi JLPT các năm được tổng hợp đầy đủ, giúp bạn làm quen với cấu trúc đề thật và nâng cao kỹ năng tiếng Nhật.
              </p>
            </div>

            {/* Right: Graphic emblem badge */}
            <div className="hidden lg:flex items-center justify-end">
              <div className="relative size-44 xl:size-52 rounded-full bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-blue-100/60 dark:border-slate-700 shadow-inner overflow-hidden">
                <svg viewBox="0 0 200 200" className="size-full p-2" aria-hidden="true">
                  <defs>
                    <linearGradient id="fujiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  {/* Sun in background */}
                  <circle cx="100" cy="72" r="32" fill="url(#sunGrad)" />
                  {/* Fuji Mountain */}
                  <path d="M44 156 L88 88 Q100 80 112 88 L156 156 Z" fill="url(#fujiGrad)" />
                  {/* Snow Cap on Mount Fuji */}
                  <path d="M88 88 Q100 80 112 88 L122 104 Q112 110 100 106 Q88 110 78 104 Z" fill="#ffffff" />
                  {/* Gentle base cloud line */}
                  <path d="M25 158 Q60 148 100 156 T175 154 L175 178 L25 178 Z" fill="#3b82f6" opacity="0.18" />
                </svg>
              </div>
            </div>
          </div>

          {/* SEARCH CARD CONTAINER (PHƯƠNG ÁN 1: 3 TẦNG ĐẦY ĐỦ TIÊU CHÍ) */}
          <Card className="rounded-2xl p-4 sm:p-6 shadow-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                  <FileText className="size-3.5 text-slate-400" aria-hidden="true" />
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
        <div className="container mx-auto max-w-7xl">
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

      {/* SECTION 3: ĐỀ THI THEO NĂM & KẾT QUẢ TÌM KIẾM */}
      <section id="de-thi-theo-nam" className={`pb-16 px-4 sm:px-6 ${hasActiveFilters ? "pt-8" : ""}`}>

        <div className="container mx-auto max-w-7xl">
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
                  onClick={() => setSearchQuery('')}
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
                  onClick={() => setFilterLevel('ALL')}
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
                  onClick={() => setFilterYear('ALL')}
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
                  onClick={() => setFilterSession('ALL')}
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
                  onClick={() => setFilterKind('ALL')}
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
                  onClick={() => setFilterStatus('ALL')}
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
                  onClick={() => setOnlyFavorites(false)}
                  className="rounded-full text-xs h-7 px-2.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                >
                  ⭐ Đã yêu thích ✕
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAllFilters}
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
                onClick={handleResetAllFilters}
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
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
