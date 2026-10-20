'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import type { StudySession } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface TodaySessionRunnerProps {
  session: StudySession | null;
  onCompleteSession: (sessionId: string, clientEventId: string, timeSpentSeconds: number) => Promise<void>;
}

export function TodaySessionRunner({
  session,
  onCompleteSession,
}: TodaySessionRunnerProps): React.JSX.Element {
  const { t } = useI18n();

  const [isRunning, setIsRunning] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  if (!session) {
    return (
      <Card data-testid="today-session-empty">
        <CardHeader>
          <CardTitle>{t('planner.session.todayTitle')}</CardTitle>
        </CardHeader>
        <CardContent style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {t('planner.session.noSessionToday')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = session.status === 'completed';

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleComplete = async () => {
    setIsRunning(false);
    setSubmitting(true);
    try {
      const clientEventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      await onCompleteSession(session.id, clientEventId, secondsSpent);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card data-testid="today-session-card">
      <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CardTitle>{t('planner.session.todayTitle')}</CardTitle>
        <Badge variant={isCompleted ? 'success' : 'primary'}>
          {isCompleted ? `✓ ${t('planner.session.statusCompleted')}` : t('planner.session.statusPending')}
        </Badge>
      </CardHeader>

      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {session.skill && <Badge variant="secondary">{t(`planner.skills.${session.skill}`)}</Badge>}
            {session.sessionType && <Badge variant="default">{session.sessionType}</Badge>}
          </div>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            {session.topic || t('planner.session.defaultTopic')}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            {t('planner.session.targetDuration', { minutes: String(session.durationMinutes) })}
          </p>
        </div>

        {/* Stopwatch & Action */}
        {!isCompleted ? (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                {t('planner.session.studyTimer')}
              </span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'monospace' }}>
                {formatTimer(secondsSpent)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant={isRunning ? 'outline' : 'primary'}
                onClick={() => setIsRunning(!isRunning)}
                data-testid="timer-toggle-button"
              >
                {isRunning ? `⏸ ${t('planner.session.pauseTimer')}` : `▶ ${t('planner.session.startTimer')}`}
              </Button>

              <Button
                variant="success"
                onClick={handleComplete}
                loading={submitting}
                data-testid="complete-session-button"
              >
                ✓ {t('planner.session.markComplete')}
              </Button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              color: 'var(--color-success, #16a34a)',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            🎉 {t('planner.session.congratulationsCompleted')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
