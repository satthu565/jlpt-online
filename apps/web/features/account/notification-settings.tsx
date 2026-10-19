'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Alert } from '@jlpt/ui';
import { useI18n } from '../../lib/i18n';

export interface NotificationPreferences {
  emailUpdates: boolean;
  examReminders: boolean;
  studyStreakAlerts: boolean;
  quietHours: {
    start: string;
    end: string;
  };
  timezone: string;
}

export interface NotificationSettingsProps {
  initialPreferences?: NotificationPreferences;
  onLoad?: () => Promise<NotificationPreferences>;
  onSave: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

export function NotificationSettings({
  initialPreferences,
  onLoad,
  onSave,
}: NotificationSettingsProps): React.JSX.Element {
  const { t } = useI18n();

  const [emailUpdates, setEmailUpdates] = useState(initialPreferences?.emailUpdates ?? true);
  const [examReminders, setExamReminders] = useState(initialPreferences?.examReminders ?? true);
  const [studyStreakAlerts, setStudyStreakAlerts] = useState(initialPreferences?.studyStreakAlerts ?? true);
  const [quietStart, setQuietStart] = useState(initialPreferences?.quietHours?.start ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(initialPreferences?.quietHours?.end ?? '07:00');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (onLoad) {
      onLoad()
        .then((prefs) => {
          setEmailUpdates(prefs.emailUpdates);
          setExamReminders(prefs.examReminders);
          setStudyStreakAlerts(prefs.studyStreakAlerts);
          if (prefs.quietHours) {
            setQuietStart(prefs.quietHours.start);
            setQuietEnd(prefs.quietHours.end);
          }
        })
        .catch(() => {});
    }
  }, [onLoad]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await onSave({
        emailUpdates,
        examReminders,
        studyStreakAlerts,
        quietHours: {
          start: quietStart,
          end: quietEnd,
        },
      });
      setFeedback({ type: 'success', message: t('account.notifications.saveSuccess') });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : t('account.notifications.saveError'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="notification-settings-card">
      <CardHeader>
        <CardTitle>{t('account.notifications.title')}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {feedback && (
            <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          )}

          {/* Toggle options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                data-testid="toggle-email-updates"
                style={{ marginTop: '0.25rem', width: '1rem', height: '1rem', minHeight: 'auto' }}
              />
              <div>
                <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  {t('account.notifications.emailUpdates')}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('account.notifications.emailUpdatesDesc')}
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Input
                type="checkbox"
                checked={examReminders}
                onChange={(e) => setExamReminders(e.target.checked)}
                data-testid="toggle-exam-reminders"
                style={{ marginTop: '0.25rem', width: '1rem', height: '1rem', minHeight: 'auto' }}
              />
              <div>
                <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  {t('account.notifications.examReminders')}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('account.notifications.examRemindersDesc')}
                </span>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Input
                type="checkbox"
                checked={studyStreakAlerts}
                onChange={(e) => setStudyStreakAlerts(e.target.checked)}
                data-testid="toggle-streak-alerts"
                style={{ marginTop: '0.25rem', width: '1rem', height: '1rem', minHeight: 'auto' }}
              />
              <div>
                <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                  {t('account.notifications.streakAlerts')}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('account.notifications.streakAlertsDesc')}
                </span>
              </div>
            </label>
          </div>

          {/* Quiet Hours */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <span style={{ fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>
                🌙 {t('account.notifications.quietHoursTitle')}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {t('account.notifications.quietHoursDesc')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="quiet-start-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {t('account.notifications.quietStart')}
                </label>
                <Input
                  id="quiet-start-input"
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  data-testid="quiet-start-input"
                />
              </div>

              <div>
                <label htmlFor="quiet-end-input" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {t('account.notifications.quietEnd')}
                </label>
                <Input
                  id="quiet-end-input"
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  data-testid="quiet-end-input"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              data-testid="save-notifications-button"
            >
              {t('account.notifications.saveButton')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
