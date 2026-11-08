'use client';

import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { AttemptSummary, Level } from '@jlpt/schema';
import { getLevelScoringConfig } from '@jlpt/exam-engine/score-estimation';
import { Alert } from '@jlpt/ui/components/alert';
import { Badge } from '@jlpt/ui/components/badge';
import { Button } from '@jlpt/ui/components/button';
import { ExamApiClient } from '../../exam/api/exam-api';
import { useAuth } from '../../../lib/auth-context';

const MAX_ATTEMPT_PAGES = 5;

/** Các lượt làm của người dùng hiện tại với một đề; rỗng nếu chưa đăng nhập hoặc không tải được. */
export function useExamAttempts(examId: string): AttemptSummary[] {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);

  useEffect(() => {
    if (!user) {
      setAttempts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const client = new ExamApiClient();
      const found: AttemptSummary[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < MAX_ATTEMPT_PAGES; page++) {
        const res = await client.listMyAttempts(cursor, 50);
        found.push(...res.items.filter((item) => item.examId === examId));
        if (!res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (!cancelled) setAttempts(found);
    })().catch(() => {
      if (!cancelled) setAttempts([]);
    });
    return () => {
      cancelled = true;
    };
  }, [user, examId]);

  return attempts;
}

const MODE_LABEL = { real: 'Thi thật', practice: 'Luyện tập' } as const;

export function ExamResumeBanner({ attempts }: { attempts: AttemptSummary[] }): React.JSX.Element | null {
  const open = attempts
    .filter((a) => a.status === 'in_progress')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!open) return null;
  return (
    <Alert variant="warning" title="Bạn có bài đang làm dở với đề này" data-testid="exam-resume-banner">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {MODE_LABEL[open.mode]}, bắt đầu lúc {new Date(open.startedAt).toLocaleString('vi-VN')}.
        </span>
        <a href={`/phong-thi?attemptId=${encodeURIComponent(open.id)}&mode=${open.mode}`} className="text-decoration-none">
          <Button variant="primary" size="sm" className="gap-2">
            <Play className="size-4 fill-current" aria-hidden="true" />
            Tiếp tục làm bài
          </Button>
        </a>
      </div>
    </Alert>
  );
}

export function ExamHistorySummary({ attempts }: { attempts: AttemptSummary[] }): React.JSX.Element | null {
  const submitted = attempts
    .filter((a) => a.status === 'submitted')
    .sort((a, b) => (b.submittedAt ?? b.startedAt).localeCompare(a.submittedAt ?? a.startedAt));
  const latest = submitted[0];
  if (!latest) return null;
  const scores = submitted.map((a) => a.score).filter((s): s is number => s !== null);
  const best = scores.length > 0 ? Math.max(...scores) : null;
  return (
    <div className="space-y-3" data-testid="exam-history-summary">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        Lịch sử của bạn với đề này
      </h2>
      <div className="surface surface--secondary rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 text-sm">
        <div>
          <span className="block text-xs text-slate-500 mb-0.5">Số lần đã làm</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-100">{`${submitted.length} lần`}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-500 mb-0.5">Điểm cao nhất</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-100">{best !== null ? `${best} / 180` : 'Chưa có điểm'}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-500 mb-0.5">Lần gần nhất</span>
          <span className="font-extrabold text-slate-900 dark:text-slate-100">
            {new Date(latest.submittedAt ?? latest.startedAt).toLocaleDateString('vi-VN')}
          </span>
          <span className="ml-2 text-xs text-slate-500">{MODE_LABEL[latest.mode]}</span>
        </div>
        <div className="flex flex-col items-start gap-1">
          {latest.passed !== null && (
            <Badge variant={latest.passed ? 'success' : 'danger'} size="sm">
              {latest.passed ? 'Đạt' : 'Chưa đạt'}
            </Badge>
          )}
          <a href={`/ket-qua/${encodeURIComponent(latest.id)}`} className="text-xs font-semibold underline">
            Xem kết quả
          </a>
        </div>
      </div>
    </div>
  );
}

export function PassCriteria({ level }: { level: Level }): React.JSX.Element | null {
  let config: ReturnType<typeof getLevelScoringConfig>;
  try {
    config = getLevelScoringConfig(level);
  } catch {
    return null;
  }
  return (
    <div className="space-y-3" data-testid="exam-pass-criteria">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
        Điều kiện đỗ {level}
      </h2>
      <div className="surface surface--secondary rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
        <div>
          Tổng điểm từ <strong>{config.totalPass} / {config.totalMax}</strong>, và mỗi phần phải đạt điểm sàn:
        </div>
        <ul className="list-disc pl-5 space-y-0.5">
          {config.sections.map((sec) => (
            <li key={sec.code}>
              {sec.label}: từ <strong>{sec.minPass} / {sec.maxScaled}</strong>
            </li>
          ))}
        </ul>
        <div className="text-slate-500">Điểm hiển thị sau khi làm bài là điểm ước lượng theo thang JLPT.</div>
      </div>
    </div>
  );
}

export function GuestSaveNote({ slug }: { slug: string }): React.JSX.Element | null {
  const { user, isLoading } = useAuth();
  if (isLoading || user) return null;
  return (
    <Alert variant="info" title="Bạn chưa đăng nhập" data-testid="exam-guest-note">
      Kết quả làm bài sẽ không được lưu vào lịch sử và thống kê của bạn.{' '}
      <a href={`/dang-nhap?redirect=${encodeURIComponent(`/de-thi/${slug}`)}`} className="font-semibold underline">
        Đăng nhập để lưu điểm và theo dõi tiến độ
      </a>
      .
    </Alert>
  );
}
