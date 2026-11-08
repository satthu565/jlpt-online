'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import { HistoryView } from '../../../features/results/components/history-view';
import type { ExamHistoryItem } from '../../../features/results/types';
import { ExamHero } from '../../../features/library';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import Link from 'next/link';

export default function ExamHistoryPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const [historyItems, setHistoryItems] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const loadHistory = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setIsUnauthorized(true);
      setHistoryItems([]);
      return;
    }

    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const sourceQuery = new URLSearchParams(window.location.search);
      const fromNotebook = ['sourceAttemptId', 'sourceExamId', 'sourceExam'].some((key) => sourceQuery.has(key));
      const [attemptsRes, examsRes] = await Promise.all([
        client.listMyAttempts(undefined, fromNotebook ? 100 : 20),
        client.getExams().catch(() => ({ items: [] })),
      ]);

      const params = new URLSearchParams(window.location.search);
      if (params.has('sourceAttemptId') || params.has('sourceExamId') || params.has('sourceExam')) {
        const seen = new Set<string>();
        let cursor = attemptsRes.nextCursor;
        while (cursor && !seen.has(cursor) && (!params.get('sourceAttemptId') || !attemptsRes.items.some((attempt) => attempt.id === params.get('sourceAttemptId')))) {
          seen.add(cursor);
          const page = await client.listMyAttempts(cursor, 100);
          const ids = new Set(attemptsRes.items.map((attempt) => attempt.id));
          const freshItems = page.items.filter((attempt) => !ids.has(attempt.id));
          if (freshItems.length === 0) break;
          attemptsRes.items.push(...freshItems);
          cursor = page.nextCursor;
        }
      }

      const examsMap = new Map(examsRes.items.map((e) => [e.id, e]));

      const mapped: ExamHistoryItem[] = attemptsRes.items.map((item) => {
        const exam = examsMap.get(item.examId);
        return {
          ...item,
          examTitle: exam?.title || `Đề thi JLPT (${item.examId.slice(0, 8)})`,
          examLevel: exam?.level || 'N3',
          accuracy: item.score !== null ? Math.min(100, Math.round((item.score / 180) * 100)) : undefined,
        };
      });

      setHistoryItems(mapped);
    } catch (err: unknown) {
      if (
        err instanceof ExamApiError &&
        (err.status === 401 || err.status === 403 || err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN')
      ) {
        setIsUnauthorized(true);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('401') ||
          msg.includes('403') ||
          msg.includes('UNAUTHENTICATED') ||
          msg.includes('Yêu cầu đăng nhập') ||
          msg.includes('Authentication required')
        ) {
          setIsUnauthorized(true);
        } else {
          setError('Không thể tải lịch sử làm bài thi. Vui lòng thử lại sau.');
        }
      }
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="exam-history-page">
      <ExamHero
        title="Lịch sử làm bài thi"
        subtitle="Theo dõi tiến độ, điểm số và xem lại chi tiết bài làm của các kỳ thi bạn đã tham gia."
        minimal
        background="gradient"
      />

      <div className="container py-8">
        {(!user || isUnauthorized) && (
          <Alert className="mb-6" variant="warning">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>Bạn cần đăng nhập để xem và lưu lịch sử làm bài thi cá nhân.</span>
              <Link href="/dang-nhap?redirect=/lich-su">
                <Button size="sm" variant="primary">
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          </Alert>
        )}

        {error && !isUnauthorized && (
          <Alert className="mb-6" variant="error" onClose={() => setError(null)}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={loadHistory}>
                Thử lại
              </Button>
            </div>
          </Alert>
        )}

        {loading ? (
          <div data-testid="history-loading">
            <EmptyState
              variant="loading"
              title="Đang tải lịch sử các lần thi..."
              description="Vui lòng chờ trong giây lát"
              minHeight="md"
            />
          </div>
        ) : (
          <HistoryView historyItems={historyItems} isGuest={!user || isUnauthorized} />
        )}
      </div>
    </div>
  );
}
