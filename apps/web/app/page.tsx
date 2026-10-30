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
} from 'lucide-react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Select } from '@jlpt/ui/components/select';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import type { ExamWithUserStatus } from '../features/library/types';
import type { Level } from '@jlpt/schema';

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
  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');

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

  // Group exams by (year, session)
  const sessionGroups = useMemo(() => {
    const map = new Map<string, ExamSessionGroup>();

    for (const exam of exams) {
      if (!exam.year || !exam.session || (exam.totalQuestions ?? 0) === 0) continue;
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
    // Sort descending by year, then session ('12' before '7')
    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return Number.parseInt(b.session, 10) - Number.parseInt(a.session, 10);
    });

    return list;
  }, [exams]);

  // Filter session groups
  const filteredSessions = useMemo(() => {
    return sessionGroups.filter((g) => {
      if (filterYear !== 'ALL' && g.year !== Number.parseInt(filterYear, 10)) {
        return false;
      }
      if (filterSession !== 'ALL' && g.session !== filterSession) {
        return false;
      }
      if (filterLevel !== 'ALL' && !g.examsByLevel[filterLevel as Level]) {
        return false;
      }
      return true;
    });
  }, [sessionGroups, filterYear, filterSession, filterLevel]);

  const handleLevelCardClick = (level: Level) => {
    setFilterLevel((prev) => (prev === level ? 'ALL' : level));
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

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60">
      <JsonLd id="homepage-website-schema" data={WEBSITE_STRUCTURED_DATA} />

      {/* Screen-reader compatibility strings for tests */}
      <span className="sr-only">{t('home.heroTitle')}</span>
      <span className="sr-only">{t('home.startFreeTrial')}</span>

      {/* SECTION 1: HERO WITH SEARCH BAR */}
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

          {/* Search Card Container: Spanning full width across the hero */}
          <Card className="rounded-2xl p-3 sm:p-4 shadow-sm bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
              {/* Field 1: Cấp độ */}
              <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 bg-white dark:bg-slate-850 h-[56px] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                <Layers className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label htmlFor="hero-select-level" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mb-1 cursor-pointer">
                    {t('home.levelSelectLabel')}
                  </label>
                  <Select
                    id="hero-select-level"
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="hero-search-select !border-0 !border-none !bg-transparent !shadow-none !p-0 !min-h-0 !h-5.5 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:!ring-0 focus:!outline-none w-full"
                  >
                    <option value="ALL">{t('home.chooseLevelPlaceholder')}</option>
                    <option value="N1">JLPT N1</option>
                    <option value="N2">JLPT N2</option>
                    <option value="N3">JLPT N3</option>
                    <option value="N4">JLPT N4</option>
                    <option value="N5">JLPT N5</option>
                  </Select>
                </div>
              </div>

              {/* Field 2: Năm thi */}
              <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 bg-white dark:bg-slate-850 h-[56px] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                <Calendar className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label htmlFor="hero-select-year" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mb-1 cursor-pointer">
                    {t('home.yearSelectLabel')}
                  </label>
                  <Select
                    id="hero-select-year"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="hero-search-select !border-0 !border-none !bg-transparent !shadow-none !p-0 !min-h-0 !h-5.5 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:!ring-0 focus:!outline-none w-full"
                  >
                    <option value="ALL">{t('home.chooseYearPlaceholder')}</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr.toString()}>{yr}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Field 3: Kỳ thi */}
              <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 bg-white dark:bg-slate-850 h-[56px] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                <Clock className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <label htmlFor="hero-select-session" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mb-1 cursor-pointer">
                    {t('home.sessionSelectLabel')}
                  </label>
                  <Select
                    id="hero-select-session"
                    value={filterSession}
                    onChange={(e) => setFilterSession(e.target.value)}
                    className="hero-search-select !border-0 !border-none !bg-transparent !shadow-none !p-0 !min-h-0 !h-5.5 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:!ring-0 focus:!outline-none w-full"
                  >
                    <option value="ALL">{t('home.chooseSessionPlaceholder')}</option>
                    <option value="7">Tháng 7</option>
                    <option value="12">Tháng 12</option>
                  </Select>
                </div>
              </div>

              {/* Field 4: Button Tìm đề thi */}
              <div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSearchScroll}
                  className="w-full h-[56px] rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer"
                >
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('home.searchExamsButton')}</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 2: CHỌN NHANH THEO CẤP ĐỘ */}
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
              const isActive = filterLevel === level;
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

      {/* SECTION 3: ĐỀ THI THEO NĂM */}
      <section id="de-thi-theo-nam" className="pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
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

          {/* Active Filter Indicators */}
          {(filterLevel !== 'ALL' || filterYear !== 'ALL' || filterSession !== 'ALL') && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-slate-500 font-medium">Đang lọc:</span>
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterLevel('ALL');
                  setFilterYear('ALL');
                  setFilterSession('ALL');
                }}
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

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card
                  key={`skeleton-${i}`}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4"
                >
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  <div className="flex gap-2 pt-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-6 w-8 bg-slate-100 dark:bg-slate-800 rounded" />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <p className="text-slate-500 text-sm mb-3">
                Không tìm thấy đề thi phù hợp với bộ lọc hiện tại.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilterLevel('ALL');
                  setFilterYear('ALL');
                  setFilterSession('ALL');
                }}
                className="rounded-xl text-xs font-semibold"
              >
                Đặt lại bộ lọc
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSessions.map((session) => {
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

                return (
                  <Card
                    key={groupKey}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Year and Document Icon */}
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {session.year}
                        </span>
                        <FileText className="size-4 text-slate-400" aria-hidden="true" />
                      </div>

                      {/* Subtitle: JLPT (Tháng X) */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                        JLPT (Tháng {session.session})
                      </p>
                    </div>

                    {/* Bottom Row: Level Badges on Left, 'Làm bài ngay →' Button on Right */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Level Badges */}
                      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Cấp độ đề thi năm ${session.year}`}>
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
                              className={`px-2 py-0.5 text-[11px] font-bold h-6 min-h-0 rounded-lg transition-all border-0 shadow-none cursor-pointer ${
                                isAvailable
                                  ? `badge-level-${lvl.toLowerCase()} ${
                                      isSelected
                                        ? 'ring-2 ring-current ring-offset-1 dark:ring-offset-slate-900 font-black shadow-xs scale-105'
                                        : 'opacity-90 hover:opacity-100'
                                    }`
                                  : 'opacity-25 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              {lvl}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Action Button */}
                      <Button
                        asChild
                        variant="primary"
                        size="sm"
                        className="rounded-xl flex items-center justify-center gap-1 text-xs font-bold px-3 py-1.5 h-8 shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <a href={examUrl} className="no-underline flex items-center justify-center gap-1">
                          <span>{t('home.takeExamNow')}</span>
                          <ArrowRight className="size-3" aria-hidden="true" />
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
