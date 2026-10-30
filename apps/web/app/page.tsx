'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  BrainCircuit,
  Timer,
  AlertTriangle,
  Calendar,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { Alert } from '@jlpt/ui/components/alert';
import { JsonLd } from '@jlpt/ui/components/json-ld';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth-context';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import type { ExamWithUserStatus } from '../features/library/types';
import dynamic from 'next/dynamic';

const LEVELS: Array<{ id: string; level: string; color: 'danger' | 'warning' | 'primary' | 'info' | 'neutral'; descKey: string }> = [
  { id: 'n1', level: 'N1', color: 'danger', descKey: 'home.levelCards.n1' },
  { id: 'n2', level: 'N2', color: 'warning', descKey: 'home.levelCards.n2' },
  { id: 'n3', level: 'N3', color: 'primary', descKey: 'home.levelCards.n3' },
  { id: 'n4', level: 'N4', color: 'info', descKey: 'home.levelCards.n4' },
  { id: 'n5', level: 'N5', color: 'neutral', descKey: 'home.levelCards.n5' },
];

const FEATURES: Array<{ icon: LucideIcon; titleKey: string; bodyKey: string }> = [
  { icon: Timer, titleKey: 'home.features.examEngineTitle', bodyKey: 'home.features.examEngine' },
  { icon: BrainCircuit, titleKey: 'home.features.smartSRSTitle', bodyKey: 'home.features.smartSRS' },
  { icon: BarChart3, titleKey: 'home.features.analyticsTitle', bodyKey: 'home.features.analytics' },
];

const WEBSITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'JLPT Online',
  url: 'https://jlpt.vn',
  description: 'Nền tảng thi và luyện thi tiếng Nhật trực tuyến chuẩn quốc tế từ N5 đến N1.',
};

function LibrarySkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6" data-testid="library-loading" role="status" aria-live="polite">
      <span className="sr-only">Đang tải danh sách đề thi...</span>
      <div className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

const LibraryView = dynamic(
  () => import('../features/library/components/library-view').then((m) => m.LibraryView),
  {
    ssr: false,
    loading: () => <LibrarySkeleton />,
  },
);

function getNextJlptInfo(): { sessionName: string; daysRemaining: number } {
  const now = new Date();
  const year = now.getFullYear();

  function getFirstSunday(y: number, m: number): Date {
    const d = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const dayOfWeek = d.getUTCDay();
    const offset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    d.setUTCDate(1 + offset);
    return d;
  }

  const julyExam = getFirstSunday(year, 6);
  const decExam = getFirstSunday(year, 11);

  let targetExam = julyExam;
  let sessionName = `Tháng 7/${year}`;

  if (now > julyExam) {
    if (now > decExam) {
      targetExam = getFirstSunday(year + 1, 6);
      sessionName = `Tháng 7/${year + 1}`;
    } else {
      targetExam = decExam;
      sessionName = `Tháng 12/${year}`;
    }
  }

  const diffTime = targetExam.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  return { sessionName, daysRemaining };
}

export default function HomePage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jlptInfo = useMemo(() => getNextJlptInfo(), []);

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

  const inProgressExam = useMemo(() => {
    return exams.find((e) => e.userStatus === 'in_progress');
  }, [exams]);

  return (
    <div>
      <JsonLd id="homepage-website-schema" data={WEBSITE_STRUCTURED_DATA} />

      {/* Hero Section */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-14 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <Badge variant="primary" size="md">
              JLPT Online V1–V4
            </Badge>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/60 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Calendar className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>
                {t('home.nextExamCountdown')}: <strong>{jlptInfo.sessionName}</strong> ({t('home.daysRemaining', { days: jlptInfo.daysRemaining })})
              </span>
            </div>
          </div>

          <h1 className="mb-4 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
            {t('home.heroTitle')}
          </h1>
          <p className="mb-8 text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-[var(--text-secondary)] max-w-2xl mx-auto">
            {t('home.heroSubtitle')}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="primary">
              <a href="#danh-sach-de" className="no-underline">
                {t('home.startFreeTrial')}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/de-thi" className="no-underline">
                {t('home.viewLibrary')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Exam Catalog Section */}
      <section id="danh-sach-de" className="border-b border-[var(--border-subtle)] bg-[var(--bg-page)] px-4 py-12">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Section Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('home.examCatalogTitle')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                  {t('home.examCatalogSubtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Resume in-progress exam notice if user has an unfinished attempt */}
          {inProgressExam && (
            <div data-testid="resume-exam-banner">
              <Alert variant="warning" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">
                    Bài thi đang làm dở
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
                    {t('home.resumeExamNotice', { title: inProgressExam.title })}
                  </p>
                </div>
                <Button asChild size="sm" variant="primary" className="shrink-0">
                  <a href={`/phong-thi?examId=${inProgressExam.id}`} className="no-underline inline-flex items-center gap-1.5">
                    <span>{t('home.resumeExamAction')}</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </a>
                </Button>
              </Alert>
            </div>
          )}

          {/* Exam List or Skeleton or Error */}
          <div className="min-h-[400px]">
            {loading ? (
              <LibrarySkeleton />
            ) : error ? (
              <Card
                className="p-8 text-center border border-slate-200 dark:border-slate-800"
                data-testid="library-error"
              >
                <AlertTriangle className="mx-auto mb-3 size-10 text-[var(--color-danger)]" role="img" aria-label="Lỗi tải đề thi" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Không thể tải danh sách đề thi
                </h3>
                <Alert variant="error" className="mb-6 text-left max-w-md mx-auto">
                  {error}
                </Alert>
                <div className="flex justify-center">
                  <Button variant="primary" size="md" onClick={loadExams}>
                    Thử lại
                  </Button>
                </div>
              </Card>
            ) : (
              <LibraryView exams={exams} />
            )}
          </div>
        </div>
      </section>

      {/* Levels Curriculum Overview Section */}
      <section id="levels" className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">{t('home.levelsTitle')}</h2>
            <p className="m-0 text-[1.0625rem] text-[var(--text-secondary)]">{t('home.levelsSubtitle')}</p>
          </div>

          <div className="responsive-grid-5">
            {LEVELS.map(({ id, level, color, descKey }) => (
              <Card key={id} elevated className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={color} size="md">
                      {level}
                    </Badge>
                    <span className="text-[0.8125rem] text-[var(--text-muted)]">JLPT</span>
                  </div>
                  <CardTitle as="h3" className="mt-2">
                    {t('home.levelHeading', { level })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="m-0 text-sm text-[var(--text-secondary)]">{t(descKey)}</p>
                </CardContent>
                <CardFooter className="mt-auto flex w-full flex-col gap-1.5">
                  <Button asChild variant="primary" size="sm" className="w-full">
                    <a href={`/${id}`} className="no-underline">{t('home.exploreLevel', { level })}</a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={`/${id}/de-thi`} className="no-underline">{t('home.viewLevelExams', { level })}</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="bg-[var(--bg-page)] px-4 py-16">
        <div className="container mx-auto max-w-7xl grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
          {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <Card key={titleKey}>
              <span className="mb-3 flex size-11 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[var(--color-primary)]" aria-hidden="true">
                <Icon className="size-6" />
              </span>
              <CardTitle as="h3" className="mb-2">
                {t(titleKey)}
              </CardTitle>
              <CardContent>
                <p className="m-0 text-sm text-[var(--text-secondary)]">{t(bodyKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}