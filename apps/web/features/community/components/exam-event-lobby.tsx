'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import type { EventLobbyInfo, LeaderboardRank } from '../types';
import { useI18n } from '../../../lib/i18n';

export interface ExamEventLobbyProps {
  lobbyInfo: EventLobbyInfo;
  onRegister: () => Promise<void>;
  onStartExam: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  leaderboard?: LeaderboardRank[];
}

export function ExamEventLobby({
  lobbyInfo,
  onRegister,
  onStartExam,
  onRefresh,
  leaderboard = [],
}: ExamEventLobbyProps): React.JSX.Element {
  const { t } = useI18n();

  const [countdownSeconds, setCountdownSeconds] = useState(lobbyInfo.startsInSeconds || 0);
  const [registering, setRegistering] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCountdownSeconds(lobbyInfo.startsInSeconds || 0);
  }, [lobbyInfo.startsInSeconds]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    try {
      await onRegister();
      if (onRefresh) await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('community.events.registerError'));
    } finally {
      setRegistering(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await onStartExam();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('community.events.startError'));
    } finally {
      setStarting(false);
    }
  };

  const event = lobbyInfo.event;
  const isStarted = countdownSeconds === 0 && lobbyInfo.canStart;

  return (
    <div className="event-lobby" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Event Card */}
      <Card data-testid="event-lobby-card">
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Badge variant="primary">{event.level}</Badge>
              <Badge variant={event.userRegistered || lobbyInfo.isRegistered ? 'success' : 'secondary'}>
                {event.userRegistered || lobbyInfo.isRegistered
                  ? `✓ ${t('community.events.registeredBadge')}`
                  : t('community.events.unregisteredBadge')}
              </Badge>
            </div>
            <CardTitle style={{ fontSize: '1.75rem', margin: 0 }}>
              {event.title}
            </CardTitle>
          </div>

          <Badge variant="default">
            👥 {t('community.events.participantCount', { count: String(lobbyInfo.participantCount), capacity: String(event.capacity) })}
          </Badge>
        </CardHeader>

        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Synchronized Live Countdown */}
          <div
            style={{
              padding: '2rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-muted)',
              textAlign: 'center',
            }}
          >
            {countdownSeconds > 0 ? (
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  ⏳ {t('community.events.startsIn')}
                </span>
                <span
                  style={{
                    fontSize: '3rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    color: 'var(--color-primary)',
                    letterSpacing: '2px',
                  }}
                  data-testid="lobby-countdown"
                >
                  {formatCountdown(countdownSeconds)}
                </span>
                <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('community.events.startsAtTime', { time: new Date(event.startsAt).toLocaleString() })}
                </span>
              </div>
            ) : isStarted ? (
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', display: 'block', marginBottom: '1rem' }}>
                  🔔 {t('community.events.examLiveNow')}
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStart}
                  loading={starting}
                  data-testid="start-exam-button"
                  style={{ minWidth: '200px' }}
                >
                  🚀 {t('community.events.enterExamRoom')}
                </Button>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🏁 {t('community.events.eventEnded')}
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          {!lobbyInfo.isRegistered && !event.userRegistered && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                onClick={handleRegister}
                loading={registering}
                data-testid="register-event-button"
              >
                📝 {t('community.events.registerNow')}
              </Button>
            </div>
          )}

          {/* Embargo Notice */}
          {lobbyInfo.isEmbargoed && (
            <Alert variant="warning" data-testid="embargo-notice">
              🛡️ <strong>{t('community.events.embargoTitle')}</strong>: {t('community.events.embargoDescription', {
                releaseTime: new Date(event.resultReleaseAt).toLocaleString(),
              })}
            </Alert>
          )}

          {/* Post-Embargo Leaderboard */}
          {!lobbyInfo.isEmbargoed && leaderboard.length > 0 && (
            <div data-testid="event-leaderboard">
              <h3 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                🏆 {t('community.events.officialLeaderboard')}
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>#</th>
                      <th style={{ padding: '0.5rem' }}>{t('community.events.participant')}</th>
                      <th style={{ padding: '0.5rem' }}>{t('community.events.score')}</th>
                      <th style={{ padding: '0.5rem' }}>{t('community.events.timeSpent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item) => (
                      <tr key={item.rank} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 700 }}>
                          {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : item.rank}
                        </td>
                        <td style={{ padding: '0.5rem' }}>{item.displayName}</td>
                        <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {item.score}/180
                        </td>
                        <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                          {Math.floor(item.timeSpentSeconds / 60)} phút
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
