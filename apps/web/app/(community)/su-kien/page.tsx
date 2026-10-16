'use client';

import React, { useState, useEffect } from 'react';
import {
  ExamEventLobby,
  defaultCommunityClient,
  type ExamEvent,
  type EventLobbyInfo,
  type LeaderboardRank,
} from '../../../features/community';
import { useI18n } from '../../../lib/i18n';

// Sample fallback event & lobby
const SAMPLE_EVENT: ExamEvent = {
  id: 'event-mock-2026-10',
  examId: 'exam-n3-2023-07',
  title: 'Kỳ thi thử toàn quốc JLPT N3 - Tháng 10/2026',
  level: 'N3',
  opensAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  startsAt: new Date(Date.now() + 1800 * 1000).toISOString(), // 30 mins from now
  endsAt: new Date(Date.now() + 9000 * 1000).toISOString(),
  resultReleaseAt: new Date(Date.now() + 14400 * 1000).toISOString(),
  capacity: 500,
  registeredCount: 342,
  status: 'LOBBY_OPEN',
  userRegistered: true,
};

const SAMPLE_LOBBY_INFO: EventLobbyInfo = {
  event: SAMPLE_EVENT,
  serverTime: new Date().toISOString(),
  startsInSeconds: 1800,
  isRegistered: true,
  participantCount: 342,
  canStart: false,
  isEmbargoed: true,
};

const SAMPLE_LEADERBOARD: LeaderboardRank[] = [
  { rank: 1, userId: 'u-1', displayName: 'Minh Tuấn (Hà Nội)', score: 178, timeSpentSeconds: 6100, submittedAt: new Date().toISOString() },
  { rank: 2, userId: 'u-2', displayName: 'Thanh Thảo (TP.HCM)', score: 172, timeSpentSeconds: 6400, submittedAt: new Date().toISOString() },
  { rank: 3, userId: 'u-3', displayName: 'Quốc Bảo (Đà Nẵng)', score: 168, timeSpentSeconds: 6250, submittedAt: new Date().toISOString() },
];

export default function ExamEventPage(): React.JSX.Element {
  const { t } = useI18n();

  const [lobbyInfo, setLobbyInfo] = useState<EventLobbyInfo>(SAMPLE_LOBBY_INFO);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRank[]>(SAMPLE_LEADERBOARD);

  const loadEvent = async () => {
    try {
      const res = await defaultCommunityClient.getExamEvents();
      if (res.items?.[0]) {
        const lobby = await defaultCommunityClient.getEventLobby(res.items[0].id);
        setLobbyInfo(lobby);
        const lb = await defaultCommunityClient.getEventLeaderboard(res.items[0].id);
        if (lb.items?.length) {
          setLeaderboard(lb.items);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadEvent();
  }, []);

  const handleRegister = async () => {
    try {
      await defaultCommunityClient.registerExamEvent(lobbyInfo.event.id);
      setLobbyInfo((prev) => ({
        ...prev,
        isRegistered: true,
        participantCount: prev.participantCount + 1,
        event: {
          ...prev.event,
          userRegistered: true,
        },
      }));
    } catch {
      setLobbyInfo((prev) => ({
        ...prev,
        isRegistered: true,
        participantCount: prev.participantCount + 1,
        event: {
          ...prev.event,
          userRegistered: true,
        },
      }));
    }
  };

  const handleStartExam = async () => {
    try {
      await defaultCommunityClient.startEventAttempt(lobbyInfo.event.id);
      if (typeof window !== 'undefined') {
        window.location.href = `/phong-thi?event=${lobbyInfo.event.id}`;
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = `/phong-thi?event=${lobbyInfo.event.id}`;
      }
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
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

      <ExamEventLobby
        lobbyInfo={lobbyInfo}
        onRegister={handleRegister}
        onStartExam={handleStartExam}
        onRefresh={loadEvent}
        leaderboard={leaderboard}
      />
    </div>
  );
}
