'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import { Alert } from '@jlpt/ui/components/alert';
import { useI18n } from '../../../../lib/i18n';
import Link from 'next/link';

interface SharedExamInfo {
  id: string;
  title: string;
  level: string;
  kind: string;
  totalQuestions: number;
  createdAt: string;
  expiresAt: string;
}

export default function SharedExamPage(): React.JSX.Element {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string | undefined;

  const [exam, setExam] = useState<SharedExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '');

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchSharedExam = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/shared-exams/${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setExam(data);
        } else {
          setError(t('practice.shared.notFound'));
        }
      } catch {
        if (isMounted) {
          setError(t('practice.shared.notFound'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSharedExam();

    return () => {
      isMounted = false;
    };
  }, [token, baseUrl]);

  const handleStartExam = async () => {
    if (!exam) return;
    setStarting(true);
    try {
      // Resolve backing exam ID by slug mixed-<generatedExamId>
      const examRes = await fetch(`${baseUrl}/exams/mixed-${encodeURIComponent(exam.id)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (examRes.ok) {
        const examDetail = await examRes.json();
        router.push(`/phong-thi?examId=${encodeURIComponent(examDetail.id || `mixed-${exam.id}`)}`);
      } else {
        router.push(`/phong-thi?examId=${encodeURIComponent(`mixed-${exam.id}`)}`);
      }
    } catch {
      router.push(`/phong-thi?examId=${encodeURIComponent(`mixed-${exam.id}`)}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6 w-full" data-testid="shared-exam-container">
      {loading && (
        <div
          data-testid="shared-exam-loading"
          className="flex flex-col items-center justify-center p-12 space-y-4 text-center"
        >
          <Spinner size="lg" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('practice.shared.loading')}
          </p>
        </div>
      )}

      {error && !loading && (
        <div data-testid="shared-exam-error" className="space-y-4">
          <Alert variant="error">
            {error}
          </Alert>
          <div className="text-center pt-2">
            <Link href="/luyen-tap">
              <Button variant="outline" size="sm">
                {t('practice.shared.backToPractice')}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && exam && (
        <Card
          data-testid="shared-exam-card"
          className="p-8 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="primary" size="sm">
                  {exam.level}
                </Badge>
                <span className="text-xs font-semibold text-slate-500">
                  {t('practice.shared.title')}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {exam.title}
              </h1>
            </div>
            <Badge variant="neutral" size="sm">
              JLPT {exam.level}
            </Badge>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t('practice.shared.subtitle')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Cấp độ thi</span>
              <strong className="text-sm text-slate-900 dark:text-slate-100">{exam.level}</strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Quy mô đề thi</span>
              <strong className="text-sm text-slate-900 dark:text-slate-100">
                {t('practice.shared.questions', { count: exam.totalQuestions })}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Thời hạn chia sẻ</span>
              <span className="text-slate-700 dark:text-slate-300">
                {new Date(exam.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link href="/luyen-tap" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                {t('practice.shared.backToPractice')}
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              loading={starting}
              onClick={handleStartExam}
              data-testid="start-shared-exam-btn"
              className="w-full sm:w-auto"
            >
              🚀 {t('practice.shared.start')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
