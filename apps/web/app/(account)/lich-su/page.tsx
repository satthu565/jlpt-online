'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import { HistoryView } from '../../../features/results/components/history-view';
import type { ExamHistoryItem } from '../../../features/results/types';
import { Button } from '@jlpt/ui/components/button';
import { PageHeader } from '@jlpt/ui/components/page-header';
import { EmptyState } from '@jlpt/ui/components/empty-state';
import { KeyRound, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ExamHistoryPage(): React.JSX.Element {
  const [historyItems, setHistoryItems] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isAuthError: boolean; message: string } | null>(null);

  const loadHistory = useCallback(async () => {
    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);

      const [attemptsRes, examsRes] = await Promise.all([
        client.listMyAttempts(),
        client.getExams().catch(() => ({ items: [] })),
      ]);

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
        setError({
          isAuthError: true,
          message: 'Vui lòng đăng nhập để xem lịch sử làm bài thi của bạn.',
        });
      } else {
        setError({
          isAuthError: false,
          message: 'Không thể tải lịch sử làm bài thi. Vui lòng thử lại sau.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="container py-8" data-testid="exam-history-page">
      <PageHeader
        title="Lịch sử làm bài thi"
        description="Theo dõi tiến độ, điểm số và xem lại chi tiết bài làm của các kỳ thi bạn đã tham gia."
        className="mb-8"
      />

      {loading ? (
        <div data-testid="history-loading">
          <EmptyState
            variant="loading"
            title="Đang tải lịch sử các lần thi..."
            description="Vui lòng chờ trong giây lát"
            minHeight="md"
          />
        </div>
      ) : error ? (
        <div data-testid="history-error">
          <EmptyState
            variant="error"
            icon={error.isAuthError ? KeyRound : AlertTriangle}
            title={error.isAuthError ? 'Yêu cầu đăng nhập' : 'Không thể tải lịch sử'}
            description={error.message}
            action={
              error.isAuthError ? (
                <Link href="/dang-nhap?redirect=/lich-su">
                  <Button variant="primary" size="md">
                    Đăng nhập ngay
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" size="md" onClick={loadHistory}>
                  Thử lại
                </Button>
              )
            }
            minHeight="md"
          />
        </div>
      ) : (
        <HistoryView historyItems={historyItems} />
      )}
    </div>
  );
}
