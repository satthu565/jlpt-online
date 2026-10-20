'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import { ExamApiClient, ExamApiError } from '../../../../features/exam/api/exam-api';
import { ExamDetailView } from '../../../../features/library';
import type { ExamDetailPublic } from '@jlpt/schema';
import { Card } from '@jlpt/ui/components/card';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';

export interface ExamDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function ExamDetailPage({ params }: ExamDetailPageProps): React.JSX.Element {
  const { slug } = use(params);

  const [exam, setExam] = useState<ExamDetailPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ notFound?: boolean; message: string } | null>(null);

  const loadExam = useCallback(async () => {
    const client = new ExamApiClient();
    try {
      setLoading(true);
      setError(null);
      const data = await client.getExamBySlug(slug);
      setExam(data);
    } catch (err: unknown) {
      if (err instanceof ExamApiError && (err.status === 404 || err.code === 'NOT_FOUND')) {
        setError({
          notFound: true,
          message: `Đề thi với mã "${slug}" không tồn tại hoặc đã được gỡ xuống.`,
        });
      } else {
        setError({
          notFound: false,
          message:
            err instanceof ExamApiError
              ? err.message
              : 'Không thể kết nối đến máy chủ để tải thông tin đề thi. Vui lòng thử lại sau.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500" data-testid="exam-detail-loading">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        Đang tải thông tin đề thi...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center" data-testid="exam-detail-error">
        <Card className="p-8 border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-4xl mb-3" role="img" aria-label="Lỗi đề thi">
            {error.notFound ? '🔍' : '⚠️'}
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {error.notFound ? 'Không tìm thấy đề thi' : 'Không thể tải đề thi'}
          </h1>
          <Alert variant={error.notFound ? 'info' : 'error'} className="mb-6 text-left max-w-md mx-auto">
            {error.message}
          </Alert>
          <div className="flex justify-center gap-3">
            {error.notFound ? (
              <a href="/de-thi">
                <Button variant="primary" size="md">
                  Trở về thư viện đề thi
                </Button>
              </a>
            ) : (
              <Button variant="primary" size="md" onClick={loadExam}>
                Thử lại
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-sm text-slate-500 mb-4">Không có dữ liệu đề thi.</p>
        <a href="/de-thi">
          <Button variant="primary" size="sm">
            Trở về thư viện
          </Button>
        </a>
      </div>
    );
  }

  // Public HTML rendering: completely free of candidate PII (Acceptance 3)
  return (
    <div className="py-8 px-4" data-testid="exam-detail-page">
      <ExamDetailView exam={exam} />
    </div>
  );
}
