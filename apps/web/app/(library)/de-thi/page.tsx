'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import type { ExamWithUserStatus } from '../../../features/library/types';
import { useAuth } from '../../../lib/auth-context';
import { Card } from '@jlpt/ui/components/card';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';

const LibraryView = dynamic(
  () => import('../../../features/library/components/library-view').then((m) => m.LibraryView),
  {
    ssr: false,
    loading: () => (
      <div className="py-20 text-center text-slate-500" data-testid="library-loading">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        Đang tải thư viện đề thi đã xuất bản...
      </div>
    ),
  },
);

export default function ExamLibraryPage(): React.JSX.Element {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamWithUserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);

      // Fetch published exams and user status in parallel
      const [examsRes, userStatusRes] = await Promise.all([
        client.getExams(),
        user
          ? client.getUserExamStatus().catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] }),
      ]);

      const statusMap = new Map(
        (userStatusRes.items || []).map((s) => [s.examId, s]),
      );

      const mappedExams: ExamWithUserStatus[] = examsRes.items.map((e) => {
        const userStat = statusMap.get(e.id);
        return {
          ...e,
          userStatus: userStat?.status || 'not_started',
          attemptsCount: userStat?.attempts || 0,
        };
      });

      setExams(mappedExams);
    } catch (err: unknown) {
      const msg =
        err instanceof ExamApiError
          ? err.message
          : 'Không thể kết nối đến máy chủ để tải thư viện đề thi. Vui lòng kiểm tra kết nối mạng và thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6" data-testid="exam-library-page">
      {/* Page header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Thư viện đề thi JLPT N1–N5
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Tổng hợp đề thi thật chính thức và đề thi thử nghiệm chuẩn cấu trúc đề thi năng lực tiếng Nhật quốc tế từ N1 đến N5.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500" data-testid="library-loading">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          Đang tải thư viện đề thi đã xuất bản...
        </div>
      ) : error ? (
        <Card className="p-8 text-center border border-slate-200 dark:border-slate-800" data-testid="library-error">
          <div className="text-4xl mb-3" role="img" aria-label="Lỗi tải đề thi">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Không thể tải thư viện đề thi
          </h2>
          <Alert variant="error" className="mb-6 text-left max-w-md mx-auto">
            {error}
          </Alert>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="md" onClick={loadExams}>
              Thử lại
            </Button>
          </div>
        </Card>
      ) : (
        /* Library View with full filters and search (LIB-01..08, LIB-15) */
        <LibraryView exams={exams} />
      )}
    </div>
  );
}
