'use client';

import { BarChart3, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnalyticsDashboard } from '../../../features/analytics';
import type { AttemptRecord, QuestionAttemptRecord } from '../../../features/analytics/types';
import type { Level, Skill, MondaiType } from '@jlpt/schema';
import { ExamHero } from '../../../features/library';
import { useAuth } from '../../../lib/auth-context';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Spinner } from '@jlpt/ui/components/spinner';
import { useI18n } from '../../../lib/i18n';

// Sample realistic demo data for visitors exploring the analytics dashboard
const DEMO_ATTEMPTS: AttemptRecord[] = [
  {
    id: 'demo-att-1',
    examId: 'jlpt-n3-2021-07',
    examTitle: 'Đề thi JLPT N3 chính thức (07/2021)',
    level: 'N3',
    mode: 'real',
    totalScore: 92,
    maxScore: 180,
    accuracy: 51.1,
    passed: false,
    durationSec: 5400,
    submittedAt: '2026-07-15T09:30:00Z',
  },
  {
    id: 'demo-att-2',
    examId: 'jlpt-n3-2022-12',
    examTitle: 'Đề thi JLPT N3 chính thức (12/2022)',
    level: 'N3',
    mode: 'real',
    totalScore: 108,
    maxScore: 180,
    accuracy: 60.0,
    passed: true,
    durationSec: 5200,
    submittedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'demo-att-3',
    examId: 'jlpt-n3-2023-07',
    examTitle: 'Đề thi JLPT N3 chính thức (07/2023)',
    level: 'N3',
    mode: 'real',
    totalScore: 122,
    maxScore: 180,
    accuracy: 67.8,
    passed: true,
    durationSec: 4900,
    submittedAt: '2026-09-25T14:15:00Z',
  },
  {
    id: 'demo-att-4',
    examId: 'jlpt-n3-2024-12',
    examTitle: 'Đề thi JLPT N3 chính thức (12/2024)',
    level: 'N3',
    mode: 'practice',
    totalScore: 136,
    maxScore: 180,
    accuracy: 75.6,
    passed: true,
    durationSec: 4650,
    submittedAt: '2026-10-30T16:00:00Z',
  },
];

const DEMO_QUESTIONS: QuestionAttemptRecord[] = [
  // 12 Unseen questions
  { questionId: 'demo-q1', questionNumber: '1', stemPreview: '彼女の意見には賛成しかねる。', level: 'N3', skill: 'grammar', isCorrect: true, timeSpentMs: 45000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q2', questionNumber: '2', stemPreview: '会議の書類をあらかじめ印刷しておいた。', level: 'N3', skill: 'vocabulary', isCorrect: true, timeSpentMs: 35000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q3', questionNumber: '3', stemPreview: 'この製品は環境に配慮して作られている。', level: 'N3', skill: 'kanji', isCorrect: true, timeSpentMs: 25000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q4', questionNumber: '4', stemPreview: '試験の結果を気に病むことはない。', level: 'N3', skill: 'vocabulary', isCorrect: true, timeSpentMs: 40000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q5', questionNumber: '5', stemPreview: '筆者が最も主張したいことは何か。', level: 'N3', skill: 'reading', isCorrect: true, timeSpentMs: 110000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q6', questionNumber: '6', stemPreview: 'このグラフから読み取れる傾向はどれか。', level: 'N3', skill: 'reading', isCorrect: false, timeSpentMs: 130000, exposureCount: 0, errorCategory: 'time_pressure', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q7', questionNumber: '7', stemPreview: '男の人はこれからまず何をしますか。', level: 'N3', skill: 'listening', isCorrect: false, timeSpentMs: 60000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q8', questionNumber: '8', stemPreview: '女の人が一番困っている理由は何ですか。', level: 'N3', skill: 'listening', isCorrect: false, timeSpentMs: 60000, exposureCount: 0, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q9', questionNumber: '9', stemPreview: '天候のせいで旅行が中止になりかねない。', level: 'N3', skill: 'grammar', isCorrect: true, timeSpentMs: 38000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q10', questionNumber: '10', stemPreview: '計画を慎重に進める必要がある。', level: 'N3', skill: 'kanji', isCorrect: true, timeSpentMs: 30000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q11', questionNumber: '11', stemPreview: '午後からの会議について相談があるのですが。', level: 'N3', skill: 'listening', isCorrect: true, timeSpentMs: 50000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-q12', questionNumber: '12', stemPreview: '本文の内容と一致しているものはどれか。', level: 'N3', skill: 'reading', isCorrect: true, timeSpentMs: 95000, exposureCount: 0, submittedAt: '2026-10-30T16:00:00Z' },

  // 6 Familiar repeat questions (demonstrating genuine retention)
  { questionId: 'demo-f1', questionNumber: '13', stemPreview: '男の人は明日何時に集合しますか。', level: 'N3', skill: 'listening', isCorrect: true, timeSpentMs: 48000, exposureCount: 2, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-f2', questionNumber: '14', stemPreview: '彼の話は信じるに足らない。', level: 'N3', skill: 'grammar', isCorrect: true, timeSpentMs: 32000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-f3', questionNumber: '15', stemPreview: '約束の時間を勘違いしていた。', level: 'N3', skill: 'vocabulary', isCorrect: true, timeSpentMs: 28000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-f4', questionNumber: '16', stemPreview: '男の人はなぜ遅刻したと言っていますか。', level: 'N3', skill: 'listening', isCorrect: false, timeSpentMs: 55000, exposureCount: 2, errorCategory: 'listening_distractor', submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-f5', questionNumber: '17', stemPreview: '筆者が考える幸福の条件とは何か。', level: 'N3', skill: 'reading', isCorrect: true, timeSpentMs: 85000, exposureCount: 1, submittedAt: '2026-10-30T16:00:00Z' },
  { questionId: 'demo-f6', questionNumber: '18', stemPreview: '経済状況の悪化に伴って求人が減った。', level: 'N3', skill: 'grammar', isCorrect: true, timeSpentMs: 30000, exposureCount: 2, submittedAt: '2026-10-30T16:00:00Z' },
];

export default function AnalyticsPage(): React.JSX.Element {
  const { user, session, isLoading: authLoading } = useAuth();
  const token = session?.token;
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttemptRecord[]>([]);
  const [skillAggregates, setSkillAggregates] = useState<Array<{ skill: string; accuracyRate: number; sampleSize: number }>>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  const fetchAnalyticsData = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setIsLoading(false);
      setIsUnauthorized(true);
      setAttempts([]);
      setQuestionAttempts([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const [attemptsRes, analyticsRes, examsRes] = await Promise.all([
        fetch(`${baseUrl}/me/attempts`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/me/analytics?targetLevel=${encodeURIComponent(user.targetLevel || 'N3')}`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${baseUrl}/exams?limit=100`, {
          headers,
          credentials: 'include',
        }),
      ]);

      if (attemptsRes.status === 401 || attemptsRes.status === 403 || analyticsRes.status === 401 || analyticsRes.status === 403) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      const examsMap = new Map<string, { title: string; level: Level }>();
      if (examsRes && examsRes.ok) {
        try {
          const examsData = await examsRes.json();
          const examItems = Array.isArray(examsData) ? examsData : (examsData.items || []);
          examItems.forEach((ex: Record<string, unknown>) => {
            if (ex['id']) {
              examsMap.set(String(ex['id']), {
                title: String(ex['title'] || ''),
                level: (ex['level'] as Level) || 'N3',
              });
            }
          });
        } catch {
          // Ignore exams parse error
        }
      }

      let loadedAttempts: AttemptRecord[] = [];
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const rawItems = Array.isArray(attemptsData) ? attemptsData : (attemptsData.items || []);
        loadedAttempts = rawItems.map((att: Record<string, unknown>) => {
          const examId = String(att['examId'] || '');
          const examMeta = examsMap.get(examId);

          const status = String(att['status'] || (att['submittedAt'] ? 'submitted' : 'in_progress')) as 'submitted' | 'in_progress';
          const isSubmitted = status === 'submitted' || Boolean(att['submittedAt']);

          const score = typeof att['score'] === 'number' ? att['score'] : 0;
          const level = (examMeta?.level || att['level'] || user.targetLevel || 'N3') as Level;
          const examTitle = examMeta?.title || String(att['examTitle'] || `ﾄ雪ｻ・thi JLPT ${level} (${String(att['id']).slice(0, 8)})`);

          let durationSec = typeof att['durationSec'] === 'number' ? att['durationSec'] : 0;
          if (!durationSec && att['startedAt'] && att['submittedAt']) {
            const start = new Date(att['startedAt'] as string).getTime();
            const end = new Date(att['submittedAt'] as string).getTime();
            if (end > start) {
              durationSec = Math.round((end - start) / 1000);
            }
          }

          const rawSections = Array.isArray(att['sections']) ? (att['sections'] as Record<string, unknown>[]) : [];
          const parsedSections = rawSections.map((s) => ({
            code: String(s['code'] || ''),
            name: String(s['label'] || s['name'] || s['code'] || ''),
            score: typeof s['scaled'] === 'number' ? s['scaled'] : (typeof s['score'] === 'number' ? s['score'] : 0),
            maxScore: typeof s['maxScaled'] === 'number' ? s['maxScaled'] : (typeof s['maxScore'] === 'number' ? s['maxScore'] : 60),
            minCutoff: typeof s['minPass'] === 'number' ? s['minPass'] : (typeof s['minCutoff'] === 'number' ? s['minCutoff'] : 19),
            passed: Boolean(s['passed']),
          }));

          const accuracy = isSubmitted && score > 0 ? Math.round((score / 180) * 1000) / 10 : 0;

          return {
            id: String(att['id']),
            examId,
            examTitle,
            level,
            mode: att['mode'] === 'real' ? 'real' : 'practice',
            status,
            totalScore: score,
            maxScore: 180,
            accuracy,
            passed: Boolean(att['passed']),
            durationSec,
            submittedAt: String(att['submittedAt'] || att['startedAt'] || new Date().toISOString()),
            sections: parsedSections,
          };
        });
      }

      let loadedQuestionAttempts: QuestionAttemptRecord[] = [];
      let loadedSkills: Array<{ skill: string; accuracyRate: number; sampleSize: number }> = [];
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (Array.isArray(analyticsData.skills)) {
          loadedSkills = analyticsData.skills.map((s: Record<string, unknown>) => ({
            skill: String(s['skill'] || ''),
            accuracyRate: typeof s['accuracyRate'] === 'number' ? s['accuracyRate'] : 0,
            sampleSize: typeof s['sampleSize'] === 'number' ? s['sampleSize'] : 0,
          }));
        }
        if (Array.isArray(analyticsData.questionHistory)) {
          loadedQuestionAttempts = analyticsData.questionHistory.map((q: Record<string, unknown>, idx: number) => ({
            questionId: String(q['questionId'] || `q-${idx}`),
            questionNumber: String(q['questionNumber'] || idx + 1),
            stemPreview: typeof q['stemPreview'] === 'string' ? q['stemPreview'] : undefined,
            level: ((q['level'] || user.targetLevel || 'N3') as Level),
            skill: ((q['skill'] || 'vocabulary') as Skill),
            mondaiType: q['mondaiType'] as MondaiType | undefined,
            isCorrect: Boolean(q['isCorrect']),
            timeSpentMs: typeof q['timeSpentMs'] === 'number' ? q['timeSpentMs'] : 60000,
            exposureCount: typeof q['exposureCount'] === 'number' ? q['exposureCount'] : 0,
            errorCategory: q['errorCategory'] as QuestionAttemptRecord['errorCategory'],
            submittedAt: String(q['submittedAt'] || new Date().toISOString()),
          }));
        }
      }

      setSkillAggregates(loadedSkills);
      setAttempts(loadedAttempts);
      setQuestionAttempts(loadedQuestionAttempts);
      if (loadedAttempts.length > 0) {
        setIsDemoMode(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ phân tích';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user, token]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const isGuest = !user || isUnauthorized;
  const showDemo = isDemoMode;
  const currentAttempts = showDemo ? DEMO_ATTEMPTS : attempts;
  const currentQuestionAttempts = showDemo ? DEMO_QUESTIONS : questionAttempts;
  const hasData = currentAttempts.length > 0 || currentQuestionAttempts.length > 0;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/60" data-testid="analytics-page">
      <ExamHero
        title={t('analytics.page.title')}
        subtitle={t('analytics.page.subtitle')}
        minimal
        background="gradient"
      />

      <div className="container py-8 w-full space-y-6" data-testid="analytics-page-container">
        {isGuest && (
          <Alert variant="warning" className="mb-6" data-testid="analytics-auth-required">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span>{t('analytics.auth.required')}</span>
              <div className="flex items-center gap-2">
                {!showDemo && (
                  <Button size="sm" variant="outline" onClick={() => setIsDemoMode(true)}>
                    <Sparkles className="size-3.5 inline mr-1" aria-hidden="true" />
                    Xem demo mẫu
                  </Button>
                )}
                <Link href="/dang-nhap?redirect=/thong-ke">
                  <Button size="sm" variant="primary">
                    {t('analytics.auth.signIn')}
                  </Button>
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {showDemo && (
          <Alert variant="info" className="mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs">
                ✨ <strong>Chế độ xem trước dữ liệu mẫu (Demo):</strong> Bạn đang trải nghiệm đầy đủ các biểu đồ và phân tích của một học viên ôn thi JLPT N3 thực tế.
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsDemoMode(false)}>
                  Thoát chế độ demo
                </Button>
                <Link href="/dang-nhap?redirect=/thong-ke">
                  <Button size="sm" variant="primary">
                    Đăng nhập tài khoản thật
                  </Button>
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {error && !isGuest && (
          <Alert variant="error" className="my-4" data-testid="analytics-error-alert">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={fetchAnalyticsData}>
                {t('common.buttons.retry')}
              </Button>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3" data-testid="analytics-loading-spinner">
            <Spinner size="lg" aria-label={t('analytics.status.syncing')} />
            <p className="text-sm text-slate-500">{t('analytics.status.syncing')}</p>
          </div>
        )}

        {!isLoading && isGuest && !showDemo && (
          <div
            data-testid="analytics-empty-state"
            className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800"
          >
            <BarChart3 className="mx-auto size-10 text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Đăng nhập để xem thống kê học tập
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Đăng nhập hoặc đăng ký tài khoản để theo dõi biểu đồ tiến độ ôn luyện, phân tích điểm số các kỹ năng JLPT và nhận đề xuất học tập cá nhân hóa.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="primary" size="md" onClick={() => setIsDemoMode(true)}>
                <Sparkles className="size-4 inline mr-1.5" aria-hidden="true" />
                Xem trước dữ liệu mẫu (Demo)
              </Button>
              <Link href="/dang-nhap?redirect=/thong-ke" className="self-center">
                <Button variant="outline" size="md">
                  Đăng nhập hoặc Đăng ký
                </Button>
              </Link>
              <Link href="/de-thi" className="self-center">
                <Button variant="ghost" size="md">
                  Khám phá thư viện đề thi
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !isGuest && !error && !hasData && !showDemo && (
          <div
            data-testid="analytics-empty-state"
            className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] p-12 text-center flex flex-col items-center justify-center space-y-4 border border-slate-200 dark:border-slate-800"
          >
            <BarChart3 className="mx-auto size-10 text-slate-400" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t('analytics.empty.title')}
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {t('analytics.empty.description')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button variant="outline" size="md" onClick={() => setIsDemoMode(true)}>
                <Sparkles className="size-4 inline mr-1.5" aria-hidden="true" />
                Xem trước dữ liệu mẫu (Demo)
              </Button>
              <Link href="/de-thi" className="self-center">
                <Button variant="primary" size="md">
                  {t('analytics.empty.toExams')}
                </Button>
              </Link>
              <Link href="/luyen-tap" className="self-center">
                <Button variant="ghost" size="md">
                  {t('analytics.empty.toPractice')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {(!isLoading && hasData) && (
          <AnalyticsDashboard
            attempts={currentAttempts}
            questionAttempts={currentQuestionAttempts}
            skillAggregates={skillAggregates}
            targetLevel={(user?.targetLevel as Level) || 'N3'}
            targetScore={120}
            userName={user?.name || user?.email?.split('@')[0] || 'Nguyễn An'}
          />
        )}
      </div>
    </div>
  );
}
