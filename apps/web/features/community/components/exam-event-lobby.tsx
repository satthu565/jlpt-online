'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@jlpt/ui/components/table';
import { Check, Users, Clock, Bell, Rocket, Flag, FileText, Shield, Trophy, Medal } from 'lucide-react';
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
    <div className="event-lobby max-w-3xl mx-auto flex flex-col gap-6 w-full">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Event Card */}
      <Card data-testid="event-lobby-card">
        <CardHeader className="flex flex-row justify-between items-start gap-4">
          <div>
            <div className="flex gap-2 mb-2 items-center">
              <Badge variant="primary">{event.level}</Badge>
              <Badge variant={event.userRegistered || lobbyInfo.isRegistered ? 'success' : 'secondary'} className="flex items-center gap-1">
                {(event.userRegistered || lobbyInfo.isRegistered) && <Check className="size-3" />}
                <span>
                  {event.userRegistered || lobbyInfo.isRegistered
                    ? t('community.events.registeredBadge')
                    : t('community.events.unregisteredBadge')}
                </span>
              </Badge>
            </div>
            <CardTitle className="text-2xl m-0">
              {event.title}
            </CardTitle>
          </div>

          <Badge variant="default" className="flex items-center gap-1.5 shrink-0">
            <Users className="size-3.5" />
            <span>
              {t('community.events.participantCount', { count: String(lobbyInfo.participantCount), capacity: String(event.capacity) })}
            </span>
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Synchronized Live Countdown */}
          <div className="p-8 rounded-lg bg-[var(--bg-muted)] text-center">
            {countdownSeconds > 0 ? (
              <div>
                <span className="text-sm text-[var(--text-muted)] flex items-center justify-center gap-1.5 mb-2">
                  <Clock className="size-4" />
                  <span>{t('community.events.startsIn')}</span>
                </span>
                <span
                  className="text-5xl font-black font-mono text-[var(--color-primary)] tracking-wider"
                  data-testid="lobby-countdown"
                >
                  {formatCountdown(countdownSeconds)}
                </span>
                <span className="block mt-2 text-sm text-[var(--text-secondary)]">
                  {t('community.events.startsAtTime', { time: new Date(event.startsAt).toLocaleString() })}
                </span>
              </div>
            ) : isStarted ? (
              <div>
                <span className="text-xl font-extrabold text-[var(--color-success,#16a34a)] flex items-center justify-center gap-2 mb-4">
                  <Bell className="size-5" />
                  <span>{t('community.events.examLiveNow')}</span>
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStart}
                  loading={starting}
                  data-testid="start-exam-button"
                  className="min-w-[200px] flex items-center justify-center gap-2 mx-auto"
                >
                  <Rocket className="size-5" />
                  <span>{t('community.events.enterExamRoom')}</span>
                </Button>
              </div>
            ) : (
              <div>
                <span className="text-xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
                  <Flag className="size-5" />
                  <span>{t('community.events.eventEnded')}</span>
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          {!lobbyInfo.isRegistered && !event.userRegistered && (
            <div className="flex justify-center">
              <Button
                variant="primary"
                onClick={handleRegister}
                loading={registering}
                data-testid="register-event-button"
                className="flex items-center gap-1.5"
              >
                <FileText className="size-4" />
                <span>{t('community.events.registerNow')}</span>
              </Button>
            </div>
          )}

          {/* Embargo Notice */}
          {lobbyInfo.isEmbargoed && (
            <Alert variant="warning" data-testid="embargo-notice">
              <div className="flex items-start gap-2">
                <Shield className="size-4 mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <strong>{t('community.events.embargoTitle')}</strong>: {t('community.events.embargoDescription', {
                    releaseTime: new Date(event.resultReleaseAt).toLocaleString(),
                  })}
                </div>
              </div>
            </Alert>
          )}

          {/* Post-Embargo Leaderboard */}
          {!lobbyInfo.isEmbargoed && leaderboard.length > 0 && (
            <div data-testid="event-leaderboard">
              <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" />
                <span>{t('community.events.officialLeaderboard')}</span>
              </h3>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>{t('community.events.participant')}</TableHead>
                    <TableHead>{t('community.events.score')}</TableHead>
                    <TableHead>{t('community.events.timeSpent')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((item) => (
                    <TableRow key={item.rank}>
                      <TableCell className="font-bold">
                        {item.rank === 1 ? (
                          <Medal className="h-4 w-4 text-amber-500 inline mr-1" aria-label="Hạng 1" />
                        ) : item.rank === 2 ? (
                          <Medal className="h-4 w-4 text-slate-400 inline mr-1" aria-label="Hạng 2" />
                        ) : item.rank === 3 ? (
                          <Medal className="h-4 w-4 text-amber-700 inline mr-1" aria-label="Hạng 3" />
                        ) : null}
                        <span>#{item.rank}</span>
                      </TableCell>
                      <TableCell>{item.displayName}</TableCell>
                      <TableCell className="font-semibold text-[var(--color-primary)]">
                        {item.score}/180
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        {Math.floor(item.timeSpentSeconds / 60)} phút
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
