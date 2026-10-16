'use client';

import React, { useState, useEffect } from 'react';
import {
  PlannerDashboard,
  defaultPlannerClient,
  type StudyPlan,
  type StudySession,
} from '../../../features/planner';
import { useI18n } from '../../../lib/i18n';

// Sample fallback study plan for offline/demo
const SAMPLE_PLAN: StudyPlan = {
  id: 'plan-demo-1',
  userId: 'user-demo',
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

const SAMPLE_TODAY_SESSION: StudySession = {
  id: 'session-today-1',
  planId: 'plan-demo-1',
  scheduledDate: new Date().toISOString().split('T')[0] ?? '',
  durationMinutes: 30,
  status: 'pending',
  skill: 'grammar',
  sessionType: 'lesson',
  topic: 'Mẫu ngữ pháp N3: 〜ばかりか, 〜を皮切りに, 〜に伴って',
};

export default function PlannerPage(): React.JSX.Element {
  const { t } = useI18n();

  const [plan, setPlan] = useState<StudyPlan | null>(SAMPLE_PLAN);
  const [todaySession, setTodaySession] = useState<StudySession | null>(SAMPLE_TODAY_SESSION);
  const [loading, setLoading] = useState(false);

  const loadPlannerData = async () => {
    setLoading(true);
    try {
      const res = await defaultPlannerClient.getTodaySession();
      if (res.plan) {
        setPlan(res.plan);
      }
      if (res.session) {
        setTodaySession(res.session);
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlannerData();
  }, []);

  const handleCreatePlan = async (input: any) => {
    try {
      const created = await defaultPlannerClient.createStudyPlan(input);
      setPlan(created);
    } catch {
      // Mock create plan
      const mock: StudyPlan = {
        id: `plan-${Date.now()}`,
        userId: 'demo',
        targetLevel: input.targetLevel,
        targetDate: input.targetDate,
        status: 'active',
        currentVersion: 1,
        daysRemaining: Math.ceil((new Date(input.targetDate).getTime() - Date.now()) / (1000 * 3600 * 24)),
        totalSessions: input.durationDays || 60,
        completedSessions: 0,
        completionRate: 0,
        currentStreak: 1,
        isFinalSprint: false,
        createdAt: new Date().toISOString(),
        config: {
          dailyMinutes: input.dailyMinutes || 30,
          durationDays: input.durationDays || 60,
          timezone: input.timezone || 'Asia/Ho_Chi_Minh',
          focusSkills: input.focusSkills || ['vocabulary', 'grammar'],
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
      setPlan(mock);
    }
  };

  const handleCompleteSession = async (
    sessionId: string,
    clientEventId: string,
    timeSpentSeconds: number,
  ) => {
    try {
      await defaultPlannerClient.completeSession(sessionId, {
        clientEventId,
        timeSpentSeconds,
      });
    } catch {
      // Local state update
    }

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
  };

  const handleReplan = async (planId: string, reason?: string) => {
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
    } catch {
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              currentVersion: prev.currentVersion + 1,
            }
          : null,
      );
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1000px', margin: '0 auto' }}>
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
