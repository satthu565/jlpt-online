'use client';

import { Check, PartyPopper } from 'lucide-react';
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
        <CardContent className="text-center p-8">
          <p className="text-[var(--text-secondary)] m-0">
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
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{t('planner.session.todayTitle')}</CardTitle>
        <Badge variant={isCompleted ? 'success' : 'primary'}>
          {isCompleted ? `${t('planner.session.statusCompleted')}` : t('planner.session.statusPending')}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex gap-2 mb-2">
            {session.skill && <Badge variant="secondary">{t(`planner.skills.${session.skill}`)}</Badge>}
            {session.sessionType && <Badge variant="default">{session.sessionType}</Badge>}
          </div>
          <h3 className="text-xl mt-0 mx-0 mb-2 text-[var(--text-primary)]">
            {session.topic || t('planner.session.defaultTopic')}
          </h3>
          <p className="m-0 text-[var(--text-secondary)] text-[0.9375rem]">
            {t('planner.session.targetDuration', { minutes: String(session.durationMinutes) })}
          </p>
        </div>

        {/* Stopwatch & Action */}
        {!isCompleted ? (
          <div className="p-5 rounded-[8px] bg-[var(--bg-muted)] flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--text-muted)] block">
                {t('planner.session.studyTimer')}
              </span>
              <span className="text-[1.75rem] font-extrabold font-mono">
                {formatTimer(secondsSpent)}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                variant={isRunning ? 'outline' : 'primary'}
                onClick={() => setIsRunning(!isRunning)}
                data-testid="timer-toggle-button"
              >
                {isRunning ? `${t('planner.session.pauseTimer')}` : `${t('planner.session.startTimer')}`}
              </Button>

              <Button
                variant="success"
                onClick={handleComplete}
                loading={submitting}
                data-testid="complete-session-button"
              >
                <Check className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('planner.session.markComplete')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-[8px] bg-[rgba(22,163,74,0.1)] text-[var(--color-success,#16a34a)] font-semibold text-center">
            <PartyPopper className="inline size-4 align-[-2px]" aria-hidden="true" /> {t('planner.session.congratulationsCompleted')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
