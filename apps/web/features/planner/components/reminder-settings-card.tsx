'use client';

import { Bell, Settings } from 'lucide-react';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import type { StudyPlan } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface ReminderSettingsCardProps {
  plan: StudyPlan;
}

export function ReminderSettingsCard({ plan }: ReminderSettingsCardProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Card data-testid="reminder-settings-card">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{t('planner.reminders.cardTitle')}</CardTitle>
        <Badge variant="primary"><Bell className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('planner.reminders.activeBadge')}</Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="m-0 text-[var(--text-secondary)] text-[0.9375rem]">
          {t('planner.reminders.description')}
        </p>

        <div className="p-4 rounded-[6px] bg-[var(--bg-muted)] flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">{t('planner.reminders.dailyTime')}:</span>
            <strong className="text-[var(--text-primary)]">20:00 ({plan.config.timezone})</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">{t('planner.reminders.recommendedSession')}:</span>
            <strong className="text-[var(--text-primary)]">{plan.config.dailyMinutes} {t('planner.overview.minutesUnit')}</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-muted)]">{t('planner.reminders.mockInterval')}:</span>
            <strong className="text-[var(--text-primary)]">
              {t('planner.reminders.everyXDays', { days: String(plan.config.mockExamIntervalDays) })}
            </strong>
          </div>
        </div>

        <div className="flex justify-end">
          <a className="no-underline"
            href="/tai-khoan#notifications"
          >
            <Button variant="ghost" size="sm">
              <Settings className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('planner.reminders.customizeInSettings')}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
