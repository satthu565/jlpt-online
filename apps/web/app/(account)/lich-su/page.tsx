'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import { HistoryView } from '../../../features/results/components/history-view';
import type { ExamHistoryItem } from '../../../features/results/types';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Card } from '@jlpt/ui/components/card';

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
    <div className="max-w-5xl mx-auto py-8 px-4" data-testid="exam-history-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Lịch sử làm bài thi
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Theo dõi tiến độ, điểm số và xem lại chi tiết bài làm của các kỳ thi bạn đã tham gia.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500" data-testid="history-loading">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          Đang tải lịch sử các lần thi...
        </div>
      ) : error ? (
        <Card className="p-8 text-center border border-slate-200 dark:border-slate-800" data-testid="history-error">
          <div className="text-4xl mb-3" role="img" aria-label="Lỗi tải lịch sử">
            {error.isAuthError ? '🔑' : '⚠️'}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            {error.isAuthError ? 'Yêu cầu đăng nhập' : 'Không thể tải lịch sử'}
          </h2>
          <Alert variant={error.isAuthError ? 'info' : 'error'} className="mb-6 text-left max-w-md mx-auto">
            {error.message}
          </Alert>
          <div className="flex justify-center gap-3">
            {error.isAuthError ? (
              <a href="/dang-nhap?redirect=/lich-su">
                <Button variant="primary" size="md">
                  Đăng nhập ngay
                </Button>
              </a>
            ) : (
              <Button variant="primary" size="md" onClick={loadHistory}>
                Thử lại
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <HistoryView historyItems={historyItems} />
      )}
    </div>
  );
}
