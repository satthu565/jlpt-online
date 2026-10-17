'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlannerDashboard,
  defaultPlannerClient,
  type StudyPlan,
  type StudySession,
  type CreateStudyPlanInput,
} from '../../../features/planner';
import { useI18n } from '../../../lib/i18n';
import { Alert, Button, Spinner } from '@jlpt/ui';
import Link from 'next/link';

const DEFAULT_STUDY_PLAN: StudyPlan = {
  id: '0192f000-plan-7000-8000-000000000001',
  userId: 'user-default',
  targetLevel: 'N3',
  targetDate: '2026-12-06',
  status: 'active',
  currentVersion: 1,
  daysRemaining: 51,
  totalSessions: 60,
  completedSessions: 18,
  completionRate: 30,
  currentStreak: 5,
  isFinalSprint: false,
  createdAt: new Date().toISOString(),
  config: {
    dailyMinutes: 30,
    durationDays: 60,
    timezone: 'Asia/Ho_Chi_Minh',
    focusSkills: ['vocabulary', 'grammar', 'reading', 'listening'],
    mockExamIntervalDays: 7,
    finalSprintDays: 14,
    skillDistribution: {
      vocabulary: 25,
      grammar: 25,
      reading: 25,
      listening: 25,
    },
  },
};

const DEFAULT_TODAY_SESSION: StudySession = {
  id: '0192f000-sess-7000-8000-000000000001',
  planId: '0192f000-plan-7000-8000-000000000001',
  scheduledDate: new Date().toISOString().split('T')[0] ?? '',
  durationMinutes: 30,
  status: 'pending',
  skill: 'grammar',
  sessionType: 'lesson',
  topic: 'Mẫu ngữ pháp N3: 〜ばかりか, 〜を皮切りに, 〜に伴って',
};

export default function PlannerPage(): React.JSX.Element {
  const { t } = useI18n();

  const [plan, setPlan] = useState<StudyPlan | null>(DEFAULT_STUDY_PLAN);
  const [todaySession, setTodaySession] = useState<StudySession | null>(DEFAULT_TODAY_SESSION);
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
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('planner.page.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('planner.page.subtitle')}
        </p>
      </div>

      {isUnauthorized && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Bạn cần đăng nhập để xem và quản lý kế hoạch học tập cá nhân.</span>
            <Link href="/dang-nhap?redirect=/ke-hoach">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadPlannerData}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {loading && !plan && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
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
  );
}
