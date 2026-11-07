'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlannerDashboard,
  defaultPlannerClient,
  type StudyPlan,
  type StudySession,
  type CreateStudyPlanInput,
  type TodaySessionResponse,
} from '../../../features/planner';
import { ExamHero } from '../../../features/library';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import Link from 'next/link';

const ACTIVE_PLAN_STORAGE_KEY = 'jlpt_active_plan_id';

export default function PlannerPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [todaySession, setTodaySession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPlannerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res: TodaySessionResponse = await defaultPlannerClient.getTodaySession();

      let activePlan: StudyPlan | null = null;
      if (res?.plan && res.plan.status === 'active') {
        activePlan = res.plan;
      } else if (!res?.plan) {
        const foundPlanId =
          res?.sessions?.[0]?.planId ||
          (typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_PLAN_STORAGE_KEY) : null);
        if (foundPlanId) {
          try {
            const fetched = await defaultPlannerClient.getStudyPlan(foundPlanId);
            if (fetched && fetched.status === 'active') {
              activePlan = fetched;
            } else {
              if (typeof window !== 'undefined') {
                localStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY);
              }
            }
          } catch {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY);
            }
          }
        }
      }

      if (activePlan) {
        setPlan(activePlan);
        if (typeof window !== 'undefined') {
          localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, activePlan.id);
        }
      } else {
        setPlan(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY);
        }
      }

      let sess: StudySession | null = null;
      if (activePlan) {
        if (res?.session) {
          sess = res.session;
        } else if (res?.sessions && res.sessions.length > 0) {
          sess = res.sessions[0]!;
        } else if (activePlan.sessions && activePlan.sessions.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10);
          sess = activePlan.sessions.find((s) => s.scheduledDate === todayStr) || activePlan.sessions[0]!;
        }
      }

      if (sess && activePlan) {
        const skill = sess.skill || activePlan?.config?.focusSkills?.[0] || 'vocabulary';
        const sessionType = sess.sessionType || (activePlan?.isFinalSprint ? 'final_sprint' : 'lesson');
        const topic =
          sess.topic ||
          (activePlan?.isFinalSprint
            ? 'Tổng ôn nước rút: Đề thi thử & xem lại kiến thức trọng tâm'
            : `Buổi học theo lộ trình: Kỹ năng ${t(`planner.skills.${skill}`)}`);
        setTodaySession({
          ...sess,
          skill,
          sessionType,
          topic,
        });
      } else {
        setTodaySession(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập')
      ) {
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
    if (!user) {
      if (typeof window !== 'undefined') {
        window.location.assign('/dang-nhap?redirect=/ke-hoach');
      }
      return;
    }
    try {
      const created = await defaultPlannerClient.createStudyPlan(input);
      if (created?.id && typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, created.id);
      }
      setPlan(created);
      if (created?.sessions && created.sessions.length > 0) {
        const first = created.sessions[0]!;
        const skill = first.skill || created.config?.focusSkills?.[0] || 'vocabulary';
        setTodaySession({
          ...first,
          skill,
          sessionType: first.sessionType || 'lesson',
          topic: first.topic || `Buổi học ngày 1: Kỹ năng ${t(`planner.skills.${skill}`)}`,
        });
      } else {
        await loadPlannerData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('UNAUTHENTICATED') ||
        msg.includes('Yêu cầu đăng nhập') ||
        msg.includes('Authentication required')
      ) {
        setIsUnauthorized(true);
        if (typeof window !== 'undefined') {
          window.location.assign('/dang-nhap?redirect=/ke-hoach');
        }
        return;
      }
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

  const handleResetPlan = async (planId: string) => {
    setError(null);
    try {
      await defaultPlannerClient.archiveStudyPlan(planId);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_PLAN_STORAGE_KEY);
      }
      setPlan(null);
      setTodaySession(null);
      setSuccessMessage(t('planner.reset.success'));
    } catch (archiveErr) {
      const msg = archiveErr instanceof Error ? archiveErr.message : String(archiveErr);
      setError(msg || 'Không thể đặt lại kế hoạch học tập.');
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
      await loadPlannerData();
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

      {successMessage && (
        <Alert className="mb-6" variant="success" onClose={() => setSuccessMessage(null)}>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span>{successMessage}</span>
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
          onResetPlan={handleResetPlan}
        />
      </div>
    </div>
  );
}
