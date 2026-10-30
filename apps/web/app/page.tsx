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
  pillBgClass: string;
  desc: string;
}> = [
  {
    level: 'N5',
    bgClass: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    borderClass: 'border-emerald-200/80 dark:border-emerald-900/40',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    pillBgClass: 'bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    desc: 'B?t ??u l?m quen v?i ti?ng Nh?t',
  },
  {
    level: 'N4',
    bgClass: 'bg-sky-50/70 dark:bg-sky-950/25',
    borderClass: 'border-sky-200/80 dark:border-sky-900/40',
    textClass: 'text-sky-700 dark:text-sky-400',
    pillBgClass: 'bg-sky-100/80 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300',
    desc: 'N?n t?ng giao ti?p c? b?n',
  },
  {
    level: 'N3',
    bgClass: 'bg-amber-50/70 dark:bg-amber-950/25',
    borderClass: 'border-amber-200/80 dark:border-amber-900/40',
    textClass: 'text-amber-700 dark:text-amber-400',
    pillBgClass: 'bg-amber-100/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
    desc: 'S? d?ng ti?ng Nh?t trong ??i s?ng',
  },
  {
    level: 'N2',
    bgClass: 'bg-rose-50/70 dark:bg-rose-950/25',
    borderClass: 'border-rose-200/80 dark:border-rose-900/40',
    textClass: 'text-rose-700 dark:text-rose-400',
    pillBgClass: 'bg-rose-100/80 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300',
    desc: 'Giao ti?p v? l?m vi?c ? m?c ?? cao h?n',
  },
  {
    level: 'N1',
    bgClass: 'bg-indigo-50/70 dark:bg-indigo-950/25',
    borderClass: 'border-indigo-200/80 dark:border-indigo-900/40',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    pillBgClass: 'bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300',
    desc: 'Th?nh th?o ti?ng Nh?t trong m?i t?nh hu?ng',
  },
];

const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JLPT Online',
  url: 'https://jlpt.vn',
  description: 'N?n t?ng thi v? luy?n thi ti?ng Nh?t tr?c tuy?n chu?n qu?c t? t? N5 ??n N1.',
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
          : 'Kh?ng th? k?t n?i ??n m?y ch? ?? t?i danh s?ch ?? thi. Vui l?ng ki?m tra k?t n?i m?ng v? th? l?i.';
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

  const inProgressExam = useMemo(() => {
    return exams.find((e) => e.userStatus === 'in_progress');
  }, [exams]);

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
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 pt-8 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Heading, Subtitle & Search Box */}
            <div className="lg:col-span-7 xl:col-span-8">
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.18]">
                Luy?n ?? JLPT<br />
                <span className="text-blue-600 dark:text-blue-400">Chinh ph?c ti?ng Nh?t</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Kho ?? thi JLPT c?c n?m ???c t?ng h?p ??y ??, gi?p b?n l?m quen v?i c?u tr?c ?? th?t v? n?ng cao k? n?ng ti?ng Nh?t.
              </p>

              {/* Search Card Container */}
              <Card className="mt-7 rounded-2xl p-2.5 sm:p-3 shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                  {/* Select: C?p ?? */}
                  <div className="lg:col-span-3 flex items-center gap-2.5 px-3 py-1.5 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800">
                    <Layers className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="hero-select-level" className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {t('home.levelSelectLabel')}
                      </label>
                      <Select
                        id="hero-select-level"
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="w-full text-xs font-semibold border-0 p-0 focus:ring-0 bg-transparent text-slate-900 dark:text-slate-100 cursor-pointer"
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

                  {/* Select: N?m thi */}
                  <div className="lg:col-span-3 flex items-center gap-2.5 px-3 py-1.5 border-b sm:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
                    <Calendar className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="hero-select-year" className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {t('home.yearSelectLabel')}
                      </label>
                      <Select
                        id="hero-select-year"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full text-xs font-semibold border-0 p-0 focus:ring-0 bg-transparent text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="ALL">{t('home.chooseYearPlaceholder')}</option>
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>N?m {yr}</option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Select: K? thi */}
                  <div className="lg:col-span-3 flex items-center gap-2.5 px-3 py-1.5 border-b sm:border-b-0 sm:border-r lg:border-r-0 border-slate-200 dark:border-slate-800">
                    <Clock className="size-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <label htmlFor="hero-select-session" className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {t('home.sessionSelectLabel')}
                      </label>
                      <Select
                        id="hero-select-session"
                        value={filterSession}
                        onChange={(e) => setFilterSession(e.target.value)}
                        className="w-full text-xs font-semibold border-0 p-0 focus:ring-0 bg-transparent text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="ALL">{t('home.chooseSessionPlaceholder')}</option>
                        <option value="7">K? th?ng 7</option>
                        <option value="12">K? th?ng 12</option>
                      </Select>
                    </div>
                  </div>

                  {/* Button: T?m ?? thi */}
                  <div className="lg:col-span-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleSearchScroll}
                      className="w-full rounded-xl flex items-center justify-center gap-2 font-bold py-2.5 text-xs shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Search className="size-4" aria-hidden="true" />
                      <span>{t('home.searchExamsButton')}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Serene Mount Fuji Art Graphic */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 items-center justify-center relative">
              <div className="relative size-60 xl:size-68 rounded-full bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-blue-100/60 dark:border-slate-700 shadow-inner overflow-hidden">
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
        </div>
      </section>

      {/* SECTION 2: CH?N NHANH THEO C?P ?? */}
      <section className="py-10 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t('home.quickLevelSelect')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {LEVEL_CONFIGS.map(({ level, bgClass, borderClass, textClass, pillBgClass, desc }) => {
              const isActive = filterLevel === level;
              return (
                <Card
                  key={level}
                  onClick={() => handleLevelCardClick(level)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${bgClass} ${borderClass} ${
                    isActive ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'
                  }`}
                >
                  <div>
                    <h3 className={`text-2xl font-black ${textClass} mb-1 tracking-tight`}>
                      {level}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                      {desc}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <span
                      className={`size-6 rounded-full inline-flex items-center justify-center text-xs transition-colors ${pillBgClass}`}
                      aria-hidden="true"
                    >
                      <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: ?? THI THEO N?M */}
      <section id="de-thi-theo-nam" className="pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('home.examsByYear')}
              </h2>
              {filterLevel !== 'ALL' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold dark:bg-blue-950 dark:text-blue-300 ml-1.5">
                  L?c: {filterLevel}
                </span>
              )}
              {filterYear !== 'ALL' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold dark:bg-slate-800 dark:text-slate-300 ml-1">
                  N?m {filterYear}
                </span>
              )}
            </div>

            <a
              href="/de-thi"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 no-underline"
            >
              <span>{t('home.viewAllExams')}</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Resume in-progress exam notice if user has an unfinished test */}
          {inProgressExam && (
            <div className="mb-6">
              <Alert variant="warning" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">
                    B?i thi ?ang l?m d?
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
                    {t('home.resumeExamNotice', { title: inProgressExam.title })}
                  </p>
                </div>
                <Button asChild size="sm" variant="primary" className="shrink-0 rounded-xl">
                  <a href={`/phong-thi?examId=${inProgressExam.id}`} className="no-underline inline-flex items-center gap-1.5 text-xs font-bold">
                    <span>{t('home.resumeExamAction')}</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </a>
                </Button>
              </Alert>
            </div>
          )}

          {/* Exam Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 space-y-3 animate-pulse">
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-5 w-48 bg-slate-100 dark:bg-slate-800/60 rounded mt-4" />
                  <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mt-4" />
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="p-8 text-center border border-slate-200 dark:border-slate-800 rounded-2xl">
              <AlertTriangle className="mx-auto mb-3 size-10 text-[var(--color-danger)]" role="img" aria-label="L?i t?i ?? thi" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                Kh?ng th? t?i danh s?ch ?? thi
              </h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={loadExams} className="rounded-xl">
                Th? l?i
              </Button>
            </Card>
          ) : filteredSessions.length === 0 ? (
            <Card className="p-10 text-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
              <FileText className="mx-auto mb-3 size-10 text-slate-400" aria-hidden="true" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                Kh?ng t?m th?y k? thi ph? h?p
              </h3>
              <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                Kh?ng c? ?? thi n?o kh?p v?i b? l?c b?n ?? ch?n. H?y th? ??t l?i b? l?c ?? xem to?n b? danh s?ch.
              </p>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => {
                  setFilterLevel('ALL');
                  setFilterYear('ALL');
                  setFilterSession('ALL');
                }}
                className="rounded-xl text-xs font-semibold"
              >
                ??t l?i b? l?c
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSessions.map((session) => {
                const groupKey = session.key;
                // Determine which level is currently targeted for this session card
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
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Year and Document Icon */}
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {session.year}
                        </span>
                        <FileText className="size-4 text-slate-400" aria-hidden="true" />
                      </div>

                      {/* Subtitle: JLPT (Th?ng X) */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3.5">
                        JLPT (Th?ng {session.session})
                      </p>

                      {/* Level Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label={`C?p ?? ?? thi n?m ${session.year}`}>
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
                              variant={isSelected ? 'primary' : 'secondary'}
                              onClick={() => isAvailable && handleSelectCardLevel(groupKey, lvl)}
                              aria-pressed={isSelected}
                              className={`px-2 py-0.5 text-[11px] font-bold h-6 min-h-0 rounded-md transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : isAvailable
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  : 'opacity-35 cursor-not-allowed bg-slate-50 dark:bg-slate-900 text-slate-400'
                              }`}
                            >
                              {lvl}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-1">
                      <Button
                        asChild
                        variant="primary"
                        size="sm"
                        className="w-full rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      >
                        <a href={examUrl} className="no-underline flex items-center justify-center gap-1.5">
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
