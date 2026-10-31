'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ExamEventLobby,
  defaultCommunityClient,
  type ExamEvent,
  type EventLobbyInfo,
  type LeaderboardRank,
} from '../../../features/community';
import { ExamHero } from '../../../features/library';
import { useI18n } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { Trophy } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60">
      <ExamHero
        title={t('community.events.pageTitle')}
        subtitle={t('community.events.pageSubtitle')}
        minimal
        background="gradient"
      />

      <div className="container py-8 w-full">
        {(!user || isUnauthorized) && (
          <Alert variant="warning" className="mb-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>Bạn cần đăng nhập để tham gia và ghi nhận kết quả thi sự kiện đồng loạt.</span>
              <Link href="/dang-nhap?redirect=/su-kien">
                <Button size="sm" variant="primary">Đăng nhập ngay</Button>
              </Link>
            </div>
          </Alert>
        )}

        {error && !isUnauthorized && (
          <Alert variant="error" onClose={() => setError(null)} className="mb-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={loadEvent}>
                {t('common.buttons.retry')}
              </Button>
            </div>
          </Alert>
        )}

        {loading && (
          <EmptyState
            variant="loading"
            title={t('common.status.loading')}
            description="Đang tải sự kiện thi..."
            minHeight="sm"
          />
        )}

        {!loading && events.length === 0 && (
          <EmptyState
            variant="empty"
            icon={Trophy}
            title={t('community.events.emptyTitle')}
            description={t('community.events.emptySubtitle')}
            action={
              <Link href="/de-thi">
                <Button variant="primary">{t('community.events.practiceNow')}</Button>
              </Link>
            }
            minHeight="md"
          />
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
    </div>
  );
}
