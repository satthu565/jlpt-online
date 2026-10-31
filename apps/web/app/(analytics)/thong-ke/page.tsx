'use client';

import { BarChart3 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnalyticsDashboard } from '../../../features/analytics';
import type { AttemptRecord, QuestionAttemptRecord } from '../../../features/analytics/types';
import type { Level, Skill, MondaiType } from '@jlpt/schema';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import { useI18n } from '../../../lib/i18n';

export default function AnalyticsPage(): React.JSX.Element {
  const { user, session } = useAuth();
  const token = session?.token;
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttemptRecord[]>([]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const [attemptsRes, analyticsRes] = await Promise.all([
        fetch(`${baseUrl}/me/attempts`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/me/analytics?targetLevel=${encodeURIComponent(user.targetLevel || 'N3')}`, {
          headers,
          credentials: 'include',
        }),
      ]);

      if (attemptsRes.status === 401 || attemptsRes.status === 403 || analyticsRes.status === 401 || analyticsRes.status === 403) {
        setError(t('auth.sessionExpired') || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
        setIsLoading(false);
        return;
      }

      let loadedAttempts: AttemptRecord[] = [];
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const rawItems = Array.isArray(attemptsData) ? attemptsData : (attemptsData.items || []);
        loadedAttempts = rawItems.map((att: Record<string, unknown>) => {
          const score = typeof att['score'] === 'number' ? att['score'] : 0;
          return {
            id: String(att['id']),
            examId: String(att['examId'] || ''),
            examTitle: String(att['examTitle'] || `Đề thi JLPT ${att['mode'] === 'real' ? 'chính thức' : 'luyện tập'} (${String(att['id']).slice(0, 8)})`),
            level: ((att['level'] || user.targetLevel || 'N3') as Level),
            mode: att['mode'] === 'real' ? 'real' : 'practice',
            totalScore: score,
            maxScore: 180,
            accuracy: Math.round((score / 180) * 1000) / 10,
            passed: Boolean(att['passed']),
            durationSec: typeof att['durationSec'] === 'number' ? att['durationSec'] : 0,
            submittedAt: String(att['submittedAt'] || att['startedAt'] || new Date().toISOString()),
          };
        });
      }

      let loadedQuestionAttempts: QuestionAttemptRecord[] = [];
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (Array.isArray(analyticsData.questionHistory)) {
          loadedQuestionAttempts = analyticsData.questionHistory.map((q: Record<string, unknown>, idx: number) => ({
            questionId: String(q['questionId'] || `q-${idx}`),
            questionNumber: String(q['questionNumber'] || idx + 1),
            stemPreview: typeof q['stemPreview'] === 'string' ? q['stemPreview'] : undefined,
            level: ((q['level'] || user.targetLevel || 'N3') as Level),
            skill: ((q['skill'] || 'vocabulary') as Skill),
            mondaiType: q['mondaiType'] as MondaiType | undefined,
            isCorrect: Boolean(q['isCorrect']),
            timeSpentMs: typeof q['timeSpentMs'] === 'number' ? q['timeSpentMs'] : 60000,
            exposureCount: typeof q['exposureCount'] === 'number' ? q['exposureCount'] : 0,
            errorCategory: q['errorCategory'] as QuestionAttemptRecord['errorCategory'],
            submittedAt: String(q['submittedAt'] || new Date().toISOString()),
          }));
        }
      }

      setAttempts(loadedAttempts);
      setQuestionAttempts(loadedQuestionAttempts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ phân tích';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user, token, t]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  if (!user) {
    return (
      <div className="container py-12 w-full">
        <Alert variant="warning" className="mb-6" data-testid="analytics-auth-required">
          {t('analytics.auth.required')}
        </Alert>
        <div className="text-center">
          <Link
            href="/dang-nhap?redirect=/thong-ke"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            {t('analytics.auth.signIn')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 w-full space-y-6" data-testid="analytics-page-container">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('analytics.page.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t('analytics.page.subtitle')}
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3" data-testid="analytics-loading-spinner">
          <Spinner size="lg" aria-label={t('analytics.status.syncing')} />
          <p className="text-sm text-slate-500">{t('analytics.status.syncing')}</p>
        </div>
      )}

      {error && !isLoading && (
        <Alert variant="error" className="my-4" data-testid="analytics-error-alert">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchAnalyticsData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {!isLoading && !error && attempts.length === 0 && questionAttempts.length === 0 && (
        <div
          data-testid="analytics-empty-state"
          className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center space-y-4"
        >
          <BarChart3 className="mx-auto size-10" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {t('analytics.empty.title')}
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t('analytics.empty.description')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Link
              href="/de-thi"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              {t('analytics.empty.toExams')}
            </Link>
            <Link
              href="/luyen-tap"
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {t('analytics.empty.toPractice')}
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && (attempts.length > 0 || questionAttempts.length > 0) && (
        <AnalyticsDashboard
          attempts={attempts}
          questionAttempts={questionAttempts}
          targetLevel={(user?.targetLevel as Level) || 'N3'}
          targetScore={120}
        />
      )}
    </div>
  );
}
