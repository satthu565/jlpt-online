'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import type { StudyPlan, StudySession, CreateStudyPlanInput } from '../types';
import { TodaySessionRunner } from './today-session-runner';
import { ReplanModal } from './replan-modal';
import { CreatePlanModal } from './create-plan-modal';
import { ReminderSettingsCard } from './reminder-settings-card';
import { useI18n } from '../../../lib/i18n';

export interface PlannerDashboardProps {
  plan: StudyPlan | null;
  todaySession: StudySession | null;
  loading?: boolean;
  onCreatePlan: (input: CreateStudyPlanInput) => Promise<void>;
  onCompleteSession: (sessionId: string, clientEventId: string, timeSpentSeconds: number) => Promise<void>;
  onReplan: (planId: string, reason?: string) => Promise<void>;
}

export function PlannerDashboard({
  plan,
  todaySession,
  loading = false,
  onCreatePlan,
  onCompleteSession,
  onReplan,
}: PlannerDashboardProps): React.JSX.Element {
  const { t } = useI18n();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        {t('common.status.loading')}
      </div>
    );
  }

  if (!plan) {
    return (
      <Card data-testid="planner-no-plan-card">
        <CardContent style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {t('planner.empty.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            {t('planner.empty.description')}
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-plan-button"
          >
            + {t('planner.actions.createPlan')}
          </Button>

          {isCreateModalOpen && (
            <CreatePlanModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSubmit={async (input) => {
                await onCreatePlan(input);
                setIsCreateModalOpen(false);
              }}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="planner-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Final Sprint Warning Banner */}
      {plan.isFinalSprint && (
        <Alert variant="warning" data-testid="final-sprint-banner">
          🔥 <strong>{t('planner.finalSprint.title')}</strong>: {t('planner.finalSprint.description')}
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Top Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Target Level & Countdown */}
        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {t('planner.overview.target')}
            </span>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {plan.targetLevel}
              </span>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                ({plan.targetDate})
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('planner.overview.daysRemaining', { count: String(plan.daysRemaining) })}
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {t('planner.overview.streak')}
            </span>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-warning)' }}>
                🔥 {plan.currentStreak}
              </span>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                {t('planner.overview.daysUnit')}
              </span>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {t('planner.overview.streakMotivation')}
            </p>
          </CardContent>
        </Card>

        {/* Progress & Completion Rate */}
        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {t('planner.overview.completionRate')}
            </span>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {plan.completionRate}%
              </span>
              <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                ({plan.completedSessions}/{plan.totalSessions})
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--bg-muted)',
                borderRadius: '4px',
                marginTop: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(plan.completionRate, 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-success)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan Version & Replan Trigger */}
        <Card>
          <CardHeader style={{ paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {t('planner.overview.version')}
            </span>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Badge variant="secondary">v{plan.currentVersion}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReplanModalOpen(true)}
                aria-label={t('planner.actions.replan')}
                data-testid="replan-button"
              >
                ⚖️ {t('planner.actions.replan')}
              </Button>
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {t('planner.overview.replanHint')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Today's Session Runner & Reminders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div>
          <TodaySessionRunner
            session={todaySession}
            onCompleteSession={async (sessionId, clientEventId, timeSpent) => {
              await onCompleteSession(sessionId, clientEventId, timeSpent);
              setFeedback({
                type: 'success',
                message: t('planner.session.completedSuccess'),
              });
            }}
          />
        </div>

        <div>
          <ReminderSettingsCard plan={plan} />
        </div>
      </div>

      {/* Replan Modal */}
      {isReplanModalOpen && (
        <ReplanModal
          isOpen={isReplanModalOpen}
          planId={plan.id}
          onClose={() => setIsReplanModalOpen(false)}
          onConfirm={async (reason) => {
            await onReplan(plan.id, reason);
            setIsReplanModalOpen(false);
            setFeedback({
              type: 'info',
              message: t('planner.replan.replanSuccess'),
            });
          }}
        />
      )}
    </div>
  );
}
