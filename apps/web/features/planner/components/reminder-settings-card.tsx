'use client';

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
      <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardTitle>{t('planner.reminders.cardTitle')}</CardTitle>
        <Badge variant="primary">🔔 {t('planner.reminders.activeBadge')}</Badge>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          {t('planner.reminders.description')}
        </p>

        <div
          style={{
            padding: '1rem',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('planner.reminders.dailyTime')}:</span>
            <strong style={{ color: 'var(--text-primary)' }}>20:00 ({plan.config.timezone})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('planner.reminders.recommendedSession')}:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{plan.config.dailyMinutes} {t('planner.overview.minutesUnit')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('planner.reminders.mockInterval')}:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {t('planner.reminders.everyXDays', { days: String(plan.config.mockExamIntervalDays) })}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href="/tai-khoan#notifications"
            style={{ textDecoration: 'none' }}
          >
            <Button variant="ghost" size="sm">
              ⚙️ {t('planner.reminders.customizeInSettings')}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
