'use client';

import React, { use, useState, useEffect } from 'react';
import { ExamApiClient, ExamApiError } from '../../../../features/exam/api/exam-api';
import { ReviewView, type AttemptReviewData } from '../../../../features/results';
import { SAMPLE_N5_EXAM_SNAPSHOT } from '../../../../features/exam/fixtures/sample-exam';
import { ALL_SAMPLE_EXAMS, resolveExamSnapshotFromUrl } from '../../../../features/exam/fixtures/exam-fixtures';
import { Alert, Button, Card } from '@jlpt/ui';
import type { PublicExamSnapshot } from '@jlpt/schema';

export interface ResultReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ResultReviewPage({ params }: ResultReviewPageProps): React.JSX.Element {
  const { id: attemptId } = use(params);

  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
  const [errorInfo, setErrorInfo] = useState<{
    code: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const client = new ExamApiClient();

    async function fetchReview() {
      try {
        setLoading(true);
        setErrorInfo(null);

        // Fetch from API
        const reviewRes = await client.reviewAttempt(attemptId);
        if (!isMounted) return;

        // Find corresponding snapshot from snapshotUrl (SCORE-07, SCORE-08)
        let snapshot = resolveExamSnapshotFromUrl(reviewRes.snapshotUrl);
        if (!snapshot && reviewRes.snapshotUrl) {
          try {
            const res = await fetch(reviewRes.snapshotUrl);
            if (res.ok) {
              snapshot = (await res.json()) as PublicExamSnapshot;
            }
          } catch {
            // Ignore fetch failure
          }
        }
        if (!snapshot) {
          snapshot = SAMPLE_N5_EXAM_SNAPSHOT;
        }

        setReviewData({
          attemptId,
          examId: snapshot.examId,
          mode: 'real',
          snapshot,
          answers: reviewRes.answers,
          flags: reviewRes.flags,
          correct: reviewRes.correct,
          result: reviewRes.result,
        });
      } catch (err: unknown) {
        if (!isMounted) return;

        if (err instanceof ExamApiError) {
          // Acceptance 4 & Contract A9: Handle ATTEMPT_NOT_SUBMITTED (409) & LEASE_INVALID
          if (err.code === 'ATTEMPT_NOT_SUBMITTED') {
            setErrorInfo({
              code: 'ATTEMPT_NOT_SUBMITTED',
              message: 'Bài thi này chưa được nộp. Theo quy chế bảo mật JLPT, bạn chỉ có thể xem lại kết quả sau khi đã hoàn thành và nộp bài.',
            });
            return;
          }
          if (err.status === 404 || err.code === 'NOT_FOUND') {
            setErrorInfo({
              code: 'NOT_FOUND',
              message: 'Không tìm thấy kết quả bài thi hoặc bạn không có quyền truy cập.',
            });
            return;
          }
          if (err.status === 403 || err.status === 401 || err.code === 'FORBIDDEN') {
            setErrorInfo({
              code: 'FORBIDDEN',
              message: 'Bạn không có quyền truy cập vào kết quả bài thi này.',
            });
            return;
          }
          setErrorInfo({
            code: err.code || 'API_ERROR',
            message: err.message || 'Có lỗi xảy ra khi tải kết quả bài thi.',
          });
          return;
        }

        setErrorInfo({
          code: 'NOT_FOUND',
          message: 'Không tìm thấy kết quả bài thi hoặc bạn không có quyền truy cập.',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReview();
    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center text-slate-500">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        Đang tải kết quả và dữ liệu đối chiếu bài thi...
      </div>
    );
  }

  // Review Authorization Error State (Acceptance 4)
  if (errorInfo) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 border border-slate-200 dark:border-slate-800 text-center">
          <div className="text-4xl mb-3" role="img" aria-label="Cảnh báo quyền xem lại">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Không thể xem lại bài thi
          </h2>
          <Alert variant="error" className="mb-6 text-left">
            {errorInfo.message}
          </Alert>

          <div className="flex justify-center gap-3">
            {errorInfo.code === 'ATTEMPT_NOT_SUBMITTED' ? (
              <a href={`/phong-thi?attemptId=${attemptId}`}>
                <Button variant="primary" size="md">
                  Về phòng thi tiếp tục làm bài
                </Button>
              </a>
            ) : (
              <a href="/de-thi">
                <Button variant="primary" size="md">
                  Về thư viện đề thi
                </Button>
              </a>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
          Không tìm thấy dữ liệu bài thi
        </h2>
        <a href="/de-thi">
          <Button variant="primary" size="sm">
            Trở về thư viện
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Breadcrumbs */}
      <nav aria-label="Đường dẫn điều hướng" className="text-xs text-slate-500 mb-6">
        <a href="/" className="hover:underline">Trang chủ</a> &gt;{' '}
        <a href="/lich-su" className="hover:underline">Lịch sử bài thi</a> &gt;{' '}
        <span className="text-slate-900 dark:text-slate-100 font-semibold">
          Kết quả bài thi #{attemptId.slice(0, 8)}
        </span>
      </nav>

      {/* Review View (SCORE-07..10, AUDIO-07) */}
      <ReviewView reviewData={reviewData} />
    </div>
  );
}
