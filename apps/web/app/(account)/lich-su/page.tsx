'use client';

import React, { useState, useEffect } from 'react';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import { HistoryView, type ExamHistoryItem } from '../../../features/results';
import { ALL_SAMPLE_EXAMS } from '../../../features/exam/fixtures/exam-fixtures';
import { Alert, Button, Card } from '@jlpt/ui';

export default function ExamHistoryPage(): React.JSX.Element {
  const [historyItems, setHistoryItems] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ isAuthError: boolean; message: string } | null>(null);

  const loadHistory = async () => {
    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);
      const res = await client.listMyAttempts();

      const mapped: ExamHistoryItem[] = res.items.map((item) => {
        const snapshot = ALL_SAMPLE_EXAMS.find((e) => e.examId === item.examId);
        return {
          ...item,
          examTitle: snapshot?.title || `Đề thi JLPT (${item.examId.slice(0, 8)})`,
          examLevel: snapshot?.level || 'N3',
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
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          Đang tải lịch sử các lần thi...
        </div>
      ) : error ? (
        <Card className="p-8 text-center border border-slate-200 dark:border-slate-800">
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
              <a href="/dang-nhap">
                <Button variant="primary" size="md">
                  Đăng nhập ngay
                </Button>
              </a>
            ) : (
              <Button variant="primary" size="md" onClick={() => loadHistory()}>
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
