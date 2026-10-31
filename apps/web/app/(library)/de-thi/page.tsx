'use client';

import { AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { ExamApiClient, ExamApiError } from '../../../features/exam/api/exam-api';
import type { ExamWithUserStatus } from '../../../features/library/types';
import { INITIAL_LIBRARY_FILTERS } from '../../../features/library/types';
import { LibraryView, ExamHero, LibraryFilters } from '../../../features/library';
import { useAuth } from '../../../lib/auth-context';
import { Card } from '@jlpt/ui/components/card';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';

// Khung chờ có cùng bố cục với bộ lọc và lưới đề để danh sách hiện ra không đẩy nội dung (CLS).
function LibrarySkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6" data-testid="library-loading" role="status" aria-live="polite">
      <span className="sr-only">Đang tải thư viện đề thi đã xuất bản...</span>
      <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
      <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-56 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

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

      const statusMap = new Map((userStatusRes.items || []).map((s) => [s.examId, s]));

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
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="exam-library-page">
      {loading ? (
        <>
          <ExamHero
            title="Thư viện đề thi JLPT N1–N5"
            minimal
            background="gradient"
            subtitle="Tổng hợp đề thi thật chính thức và đề thi thử nghiệm chuẩn cấu trúc đề thi năng lực tiếng Nhật quốc tế từ N1 đến N5."
          >
            <LibraryFilters
              filters={INITIAL_LIBRARY_FILTERS}
              onFilterChange={() => {}}
              onResetFilters={() => {}}
              idPrefix="library-loading"
            />
          </ExamHero>
          <div className="container py-8">
            <LibrarySkeleton />
          </div>
        </>
      ) : error ? (
        <>
          <ExamHero
            title="Thư viện đề thi JLPT N1–N5"
            minimal
            background="gradient"
            subtitle="Tổng hợp đề thi thật chính thức và đề thi thử nghiệm chuẩn cấu trúc đề thi năng lực tiếng Nhật quốc tế từ N1 đến N5."
          />
          <div className="container py-8">
            <Card
              className="p-8 text-center border border-slate-200 dark:border-slate-800"
              data-testid="library-error"
            >
              <AlertTriangle
                className="mx-auto mb-3 size-10 text-[var(--color-danger)]"
                role="img"
                aria-label="Lỗi tải đề thi"
              />
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
          </div>
        </>
      ) : (
        <LibraryView exams={exams} showHero />
      )}
    </div>
  );
}
