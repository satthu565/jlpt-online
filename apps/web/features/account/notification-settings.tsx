'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Alert } from '@jlpt/ui/components/alert';
import { Moon } from 'lucide-react';
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
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {feedback && (
            <Alert variant={feedback.type} onClose={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          )}

          {/* Toggle options */}
          <div className="flex flex-col gap-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Input
                type="checkbox"
                checked={emailUpdates}
                onChange={(e) => setEmailUpdates(e.target.checked)}
                data-testid="toggle-email-updates"
                className="mt-1 size-4 min-h-0"
              />
              <div>
                <span className="font-semibold block text-[var(--text-primary)]">
                  {t('account.notifications.emailUpdates')}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('account.notifications.emailUpdatesDesc')}
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Input
                type="checkbox"
                checked={examReminders}
                onChange={(e) => setExamReminders(e.target.checked)}
                data-testid="toggle-exam-reminders"
                className="mt-1 size-4 min-h-0"
              />
              <div>
                <span className="font-semibold block text-[var(--text-primary)]">
                  {t('account.notifications.examReminders')}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('account.notifications.examRemindersDesc')}
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Input
                type="checkbox"
                checked={studyStreakAlerts}
                onChange={(e) => setStudyStreakAlerts(e.target.checked)}
                data-testid="toggle-streak-alerts"
                className="mt-1 size-4 min-h-0"
              />
              <div>
                <span className="font-semibold block text-[var(--text-primary)]">
                  {t('account.notifications.streakAlerts')}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('account.notifications.streakAlertsDesc')}
                </span>
              </div>
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="p-5 rounded-lg bg-[var(--bg-muted)] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Moon className="size-4 text-[var(--color-primary)]" />
              <span className="font-bold text-[var(--text-primary)]">
                {t('account.notifications.quietHoursTitle')}
              </span>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              {t('account.notifications.quietHoursDesc')}
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quiet-start-input" className="block text-xs font-semibold mb-1 text-[var(--text-primary)]">
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
                <label htmlFor="quiet-end-input" className="block text-xs font-semibold mb-1 text-[var(--text-primary)]">
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

          <div className="flex justify-end">
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
