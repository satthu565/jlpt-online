'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ExamEventLobby,
  defaultCommunityClient,
  type ExamEvent,
  type EventLobbyInfo,
  type LeaderboardRank,
} from '../../../features/community';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Card, CardContent } from '@jlpt/ui/components/card';
import { Spinner } from '@jlpt/ui/components/spinner';
import Link from 'next/link';

export default function ExamEventPage(): React.JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const [events, setEvents] = useState<ExamEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [lobbyInfo, setLobbyInfo] = useState<EventLobbyInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRank[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res = await defaultCommunityClient.getExamEvents();
      const items = res.items || [];
      setEvents(items);

      const targetId = selectedEventId || items[0]?.id || '';
      if (targetId) {
        setSelectedEventId(targetId);
        const [lobby, lb] = await Promise.allSettled([
          defaultCommunityClient.getEventLobby(targetId),
          defaultCommunityClient.getEventLeaderboard(targetId),
        ]);

        if (lobby.status === 'fulfilled') {
          setLobbyInfo(lobby.value);
        }

        if (lb.status === 'fulfilled' && lb.value.items) {
          setLeaderboard(lb.value.items);
        }
      } else {
        setSelectedEventId('');
        setLobbyInfo(null);
        setLeaderboard([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('403') || msg.includes('UNAUTHENTICATED') || msg.includes('Yêu cầu đăng nhập')) {
        setIsUnauthorized(true);
        setEvents([]);
        setSelectedEventId('');
        setLobbyInfo(null);
        setLeaderboard([]);
      } else {
        setError(msg || t('common.status.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, t]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleRegister = async () => {
    setError(null);
    try {
      await defaultCommunityClient.registerExamEvent(selectedEventId);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === selectedEventId
            ? { ...ev, userRegistered: true, registeredCount: (ev.registeredCount || 0) + 1 }
            : ev,
        ),
      );
      if (lobbyInfo) {
        setLobbyInfo({ ...lobbyInfo, isRegistered: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể đăng ký kỳ thi sự kiện.');
      throw err;
    }
  };

  const handleStartExam = async () => {
    setError(null);
    try {
      const attempt = await defaultCommunityClient.startEventAttempt(selectedEventId);
      if (typeof window !== 'undefined') {
        window.location.href = `/phong-thi?attemptId=${encodeURIComponent(attempt.attemptId)}`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể bắt đầu làm bài thi.');
      throw err;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('community.events.pageTitle')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          {t('community.events.pageSubtitle')}
        </p>
      </div>

      {(!user || isUnauthorized) && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>Bạn cần đăng nhập để tham gia và ghi nhận kết quả thi sự kiện đồng loạt.</span>
            <Link href="/dang-nhap?redirect=/su-kien">
              <Button size="sm" variant="primary">Đăng nhập ngay</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadEvent}>
              {t('common.buttons.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0', alignItems: 'center', gap: '0.75rem' }}>
          <Spinner size="md" />
          <span style={{ color: 'var(--text-secondary)' }}>{t('common.status.loading')}</span>
        </div>
      )}

      {!loading && events.length === 0 && (
        <Card>
          <CardContent style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('community.events.emptyTitle')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
              {t('community.events.emptySubtitle')}
            </p>
            <Link href="/de-thi">
              <Button variant="primary">{t('community.events.practiceNow')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {lobbyInfo && (
        <ExamEventLobby
          lobbyInfo={lobbyInfo}
          leaderboard={leaderboard}
          onRegister={handleRegister}
          onStartExam={handleStartExam}
        />
      )}
    </div>
  );
}
