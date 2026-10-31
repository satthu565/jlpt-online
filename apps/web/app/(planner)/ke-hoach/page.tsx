'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlannerDashboard,
  defaultPlannerClient,
  type StudyPlan,
  type StudySession,
  type CreateStudyPlanInput,
} from '../../../features/planner';
import { ExamHero } from '../../../features/library';
import { useI18n } from '../../../lib/i18n';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import Link from 'next/link';

export default function PlannerPage(): React.JSX.Element {
  const { t } = useI18n();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [todaySession, setTodaySession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const loadPlannerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res = await defaultPlannerClient.getTodaySession();
      if (res && res.plan) {
        setPlan(res.plan);
      } else {
        setPlan(null);
      }
      if (res && res.session) {
        setTodaySession(res.session);
      } else {
        setTodaySession(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('Yêu cầu đăng nhập')) {
        setIsUnauthorized(true);
        setPlan(null);
        setTodaySession(null);
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPlannerData();
  }, [loadPlannerData]);

  const handleCreatePlan = async (input: CreateStudyPlanInput) => {
    setError(null);
    try {
      const created = await defaultPlannerClient.createStudyPlan(input);
      setPlan(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể tạo kế hoạch học tập.');
      throw err;
    }
  };

  const handleCompleteSession = async (
    sessionId: string,
    clientEventId: string,
    timeSpentSeconds: number,
  ) => {
    setError(null);
    try {
      await defaultPlannerClient.completeSession(sessionId, {
        clientEventId,
        timeSpentSeconds,
      });
      setTodaySession((prev) => (prev ? { ...prev, status: 'completed' } : null));
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              completedSessions: prev.completedSessions + 1,
              completionRate: Math.round(((prev.completedSessions + 1) / prev.totalSessions) * 100),
              currentStreak: prev.currentStreak + 1,
            }
          : null,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể cập nhật phiên học tập.');
    }
  };

  const handleReplan = async (planId: string, reason?: string) => {
    setError(null);
    try {
      const res = await defaultPlannerClient.replan(planId, { reason });
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              currentVersion: res.newVersion,
            }
          : null,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể điều chỉnh kế hoạch học tập.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="planner-page">
      <ExamHero
        title={t('planner.page.title')}
        subtitle={t('planner.page.subtitle')}
        minimal
        background="gradient"
      />
      <div className="container py-8 w-full">

      {isUnauthorized && (
        <Alert className="mb-6" variant="warning">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>Bạn cần đăng nhập để xem và quản lý kế hoạch học tập cá nhân.</span>
            <Link href="/dang-nhap?redirect=/ke-hoach">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert className="mb-6" variant="error" onClose={() => setError(null)}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadPlannerData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {loading && !plan && (
        <div className="flex justify-center py-12 px-0 items-center gap-3">
          <Spinner size="md" />
          <span className="text-[var(--text-secondary)]">{t('common.status.loading')}</span>
        </div>
      )}

        <PlannerDashboard
          plan={plan}
          todaySession={todaySession}
          loading={loading}
          onCreatePlan={handleCreatePlan}
          onCompleteSession={handleCompleteSession}
          onReplan={handleReplan}
        />
      </div>
    </div>
  );
}
