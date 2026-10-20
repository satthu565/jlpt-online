'use client';

import { CalendarDays, Flame, Scale } from 'lucide-react';
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
      <div className="text-center p-12 text-[var(--text-muted)]">
        {t('common.status.loading')}
      </div>
    );
  }

  if (!plan) {
    return (
      <Card data-testid="planner-no-plan-card">
        <CardContent className="py-14 px-8 text-center">
          <CalendarDays className="mx-auto mb-4 size-12" aria-hidden="true" />
          <h2 className="text-[1.75rem] font-extrabold mt-0 mx-0 mb-2 text-[var(--text-primary)]">
            {t('planner.empty.title')}
          </h2>
          <p className="text-[var(--text-secondary)] max-w-[500px] mt-0 mx-auto mb-6">
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
    <div className="planner-dashboard flex flex-col gap-6">
      {/* Final Sprint Warning Banner */}
      {plan.isFinalSprint && (
        <Alert variant="warning" data-testid="final-sprint-banner">
          <Flame className="inline size-4 align-[-2px]" aria-hidden="true" /> <strong>{t('planner.finalSprint.title')}</strong>: {t('planner.finalSprint.description')}
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* Top Overview Cards */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4"
      >
        {/* Target Level & Countdown */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-[var(--text-muted)]">
              {t('planner.overview.target')}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-[2rem] font-extrabold text-[var(--color-primary)]">
                {plan.targetLevel}
              </span>
              <span className="text-[0.9375rem] text-[var(--text-secondary)]">
                ({plan.targetDate})
              </span>
            </div>
            <p className="mt-2 mx-0 mb-0 text-sm text-[var(--text-secondary)]">
              {t('planner.overview.daysRemaining', { count: String(plan.daysRemaining) })}
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-[var(--text-muted)]">
              {t('planner.overview.streak')}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-[2rem] font-extrabold text-[var(--color-warning)]">
                <Flame className="inline size-7 align-[-4px]" aria-hidden="true" />{' '}
                <span data-testid="streak-count">{plan.currentStreak}</span>
              </span>
              <span className="text-[0.9375rem] text-[var(--text-secondary)]">
                {t('planner.overview.daysUnit')}
              </span>
            </div>
            <p className="mt-2 mx-0 mb-0 text-sm text-[var(--text-secondary)]">
              {t('planner.overview.streakMotivation')}
            </p>
          </CardContent>
        </Card>

        {/* Progress & Completion Rate */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-[var(--text-muted)]">
              {t('planner.overview.completionRate')}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-[2rem] font-extrabold text-[var(--color-success)]">
                {plan.completionRate}%
              </span>
              <span className="text-[0.9375rem] text-[var(--text-secondary)]">
                ({plan.completedSessions}/{plan.totalSessions})
              </span>
            </div>
            <div className="w-full h-[8px] bg-[var(--bg-muted)] rounded-[4px] mt-2 overflow-hidden">
              <div
                className="h-full rounded-[4px] bg-[var(--color-success)] transition-[width] duration-300"
                    // ui-allow-style: chiều rộng theo tỉ lệ hoàn thành, tính lúc chạy
                    style={{ width: `${Math.min(plan.completionRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan Version & Replan Trigger */}
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-[var(--text-muted)]">
              {t('planner.overview.version')}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">v{plan.currentVersion}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReplanModalOpen(true)}
                aria-label={t('planner.actions.replan')}
                data-testid="replan-button"
              >
                <Scale className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('planner.actions.replan')}
              </Button>
            </div>
            <p className="mt-2 mx-0 mb-0 text-[0.8125rem] text-[var(--text-muted)]">
              {t('planner.overview.replanHint')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Today's Session Runner & Reminders */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
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
