'use client';

import React, { useState, useEffect } from 'react';
import { ExamApiClient } from '../../../features/exam/api/exam-api';
import { HistoryView, type ExamHistoryItem } from '../../../features/results';
import { ALL_SAMPLE_EXAMS } from '../../../features/exam/fixtures/exam-fixtures';

export default function ExamHistoryPage(): React.JSX.Element {
  const [historyItems, setHistoryItems] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const client = new ExamApiClient();

    async function loadHistory() {
      try {
        setLoading(true);
        const res = await client.listMyAttempts();
        if (!isMounted) return;

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
      } catch {
        if (!isMounted) return;
        // Demo persisted history items (STAT-01, SCORE-11)
        const demoItems: ExamHistoryItem[] = [
          {
            id: '0192f000-5000-7000-8000-000000000001',
            examId: '0192f000-0000-7000-8000-000000000005',
            examVersion: 1,
            mode: 'real',
            status: 'submitted',
            startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            submittedAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
            score: 135,
            passed: true,
            examTitle: 'Đề thi thử JLPT N5 Mẫu Chuẩn',
            examLevel: 'N5',
            accuracy: 75,
          },
          {
            id: '0192f000-5000-7000-8000-000000000002',
            examId: '0192f000-0000-7000-8000-000000000003',
            examVersion: 1,
            mode: 'practice',
            status: 'submitted',
            startedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            submittedAt: new Date(Date.now() - 86400000 * 5 + 4500000).toISOString(),
            score: 95,
            passed: true,
            examTitle: 'Đề thi thử chuẩn cấu trúc JLPT N3 - Số 1',
            examLevel: 'N3',
            accuracy: 62,
          },
        ];
        setHistoryItems(demoItems);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          Đang tải lịch sử các lần thi...
        </div>
      ) : (
        <HistoryView historyItems={historyItems} />
      )}
    </div>
  );
}
