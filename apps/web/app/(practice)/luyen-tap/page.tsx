'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PracticeGenerator,
  PracticeRunner,
  type PracticeFilterState,
  type PracticeShortageInfo,
} from '../../../features/practice';
import {
  MixGenerator,
  QuickMixCard,
  GeneratedExamCard,
  type MixFormState,
  type MixShortageInfo,
} from '../../../features/mix';
import { ExamApiClient } from '../../../features/exam';
import type { GeneratedExam, Level, PublicExamSnapshot } from '@jlpt/schema';
import { Button, Alert, Spinner, Badge } from '@jlpt/ui';
import Link from 'next/link';
import { useI18n } from '../../../lib/i18n';

interface InProgressPracticeItem {
  id: string;
  examId: string;
  title: string;
  level: string;
  startedAt: string;
  answeredCount: number;
  totalQuestions: number;
  lastSeq: number;
}

export default function PracticeAndMixPage(): React.JSX.Element {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'practice' | 'mix' | 'quick'>('practice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceShortage, setPracticeShortage] = useState<PracticeShortageInfo | null>(null);
  const [mixShortage, setMixShortage] = useState<MixShortageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Active practice runner session
  const [activePracticeExam, setActivePracticeExam] = useState<PublicExamSnapshot | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | undefined>(undefined);
  const [activeLease, setActiveLease] = useState<string | undefined>(undefined);
  const [initialAnswers, setInitialAnswers] = useState<number[] | undefined>(undefined);

  // In-progress practice sessions
  const [inProgressSessions, setInProgressSessions] = useState<InProgressPracticeItem[]>([]);
  const [loadingInProgress, setLoadingInProgress] = useState(false);

  // Active generated mix exam
  const [generatedMixExam, setGeneratedMixExam] = useState<GeneratedExam | null>(null);

  // Recent generated exams
  const [recentMixExams, setRecentMixExams] = useState<GeneratedExam[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '');
  const apiClient = useMemo(() => new ExamApiClient({ baseUrl }), [baseUrl]);

  const loadInProgressSessions = async () => {
    setLoadingInProgress(true);
    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const res = await fetch(`${baseUrl}/me/practice-sessions/in-progress`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setInProgressSessions(data.items || []);
      }
    } catch {
      // Ignore if not logged in
    } finally {
      setLoadingInProgress(false);
    }
  };

  const loadRecentMixExams = async () => {
    setLoadingRecent(true);
    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const res = await fetch(`${baseUrl}/generated-exams`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRecentMixExams(data.items || (Array.isArray(data) ? data : []));
      }
    } catch {
      // Ignore if not logged in or endpoint unseeded
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'practice') {
      loadInProgressSessions();
    } else if (activeTab === 'mix') {
      loadRecentMixExams();
    }
  }, [activeTab]);

const SKILL_MONDAI_TYPES: Record<string, string[]> = {
  kanji: ['kanji_reading', 'orthography'],
  vocabulary: ['word_formation', 'contextual', 'paraphrase', 'usage'],
  grammar: ['grammar_form', 'sentence_composition', 'text_grammar'],
  reading: [
    'comprehension_short',
    'comprehension_mid',
    'comprehension_long',
    'integrated_reading',
    'thematic',
    'info_retrieval',
  ],
  listening: [
    'task_based',
    'point',
    'summary',
    'utterance',
    'quick_response',
    'integrated_listening',
  ],
};

  const handleGeneratePractice = async (config: PracticeFilterState) => {
    setIsGenerating(true);
    setPracticeShortage(null);
    setError(null);
    setIsUnauthorized(false);

    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const derivedMondaiTypes =
        config.mondaiTypes && config.mondaiTypes.length > 0
          ? config.mondaiTypes
          : config.skills && config.skills.length > 0
            ? config.skills.flatMap((s) => SKILL_MONDAI_TYPES[s] || [])
            : Object.values(SKILL_MONDAI_TYPES).flat();

      const payload = {
        ...config,
        mondaiTypes: derivedMondaiTypes,
      };

      const res = await fetch(`${baseUrl}/practice-exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.shortage || data.code === 'SHORTAGE' || data.code === 'POOL_SHORTAGE' || data.isShortage) {
          setPracticeShortage({
            isShortage: true,
            requested: data.requested || config.questionCount,
            available: data.available ?? 0,
            pool: config.pool,
            level: config.level,
            message: data.message || t('practice.shortage.defaultMessage'),
            suggestedPools: data.suggestedPools,
          });
        } else {
          setError(data.message || t('practice.errors.createPracticeFailed', { status: res.status }));
        }
        return;
      }

      const targetExamId = data.examId || (data.exam && data.exam.id) || data.id;
      if (!targetExamId) {
        setError(t('practice.errors.noExamData'));
        return;
      }

      // Initialize real attempt for practice exam
      const initRes = await apiClient.initAttempt({
        examId: targetExamId,
        mode: 'practice',
      });

      if (initRes.currentSection === null) {
        await apiClient.nextSection(initRes.attemptId, { lease: initRes.lease });
      }

      const snapshot = await apiClient.fetchSnapshot(initRes.snapshotUrl);
      setActivePracticeExam(snapshot);
      setActiveAttemptId(initRes.attemptId);
      setActiveLease(initRes.lease);
      setInitialAnswers(undefined);
      await loadInProgressSessions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('practice.errors.connectError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResumePractice = async (attemptId: string) => {
    setIsGenerating(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const resumeRes = await apiClient.resumeAttempt(attemptId);
      if (resumeRes.currentSection === null) {
        await apiClient.nextSection(attemptId, { lease: resumeRes.lease });
      }
      const snapshot = await apiClient.fetchSnapshot(resumeRes.snapshotUrl);
      setActivePracticeExam(snapshot);
      setActiveAttemptId(attemptId);
      setActiveLease(resumeRes.lease);
      setInitialAnswers(resumeRes.answers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tiếp tục phiên luyện tập dở dang.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMix = async (config: MixFormState) => {
    setIsGenerating(true);
    setMixShortage(null);
    setError(null);
    setIsUnauthorized(false);

    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const derivedMixMondaiTypes =
        config.mondaiTypes && config.mondaiTypes.length > 0
          ? config.mondaiTypes
          : config.skills && config.skills.length > 0
            ? config.skills.flatMap((s) => SKILL_MONDAI_TYPES[s] || [])
            : Object.values(SKILL_MONDAI_TYPES).flat();

      const payload = {
        ...config,
        mondaiTypes: derivedMixMondaiTypes,
      };

      const res = await fetch(`${baseUrl}/mixed-exams`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.shortage || data.code === 'SHORTAGE' || data.code === 'POOL_SHORTAGE' || data.isShortage) {
          setMixShortage({
            isShortage: true,
            mode: config.mode,
            level: config.level,
            missingMondaiTypes: data.missingMondaiTypes || [],
            requested: data.requested || 0,
            available: data.available || 0,
            message: data.message || t('practice.shortage.mixDefaultMessage'),
            suggestions: data.suggestions || [],
          });
        } else {
          setError(data.message || t('practice.errors.createMixFailed', { status: res.status }));
        }
        return;
      }

      const generated = data.generatedExam || data;
      setGeneratedMixExam(generated);
      await loadRecentMixExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('practice.errors.connectError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickMix = async (level: Level) => {
    setIsGenerating(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const res = await fetch(`${baseUrl}/mixed-exams/quick`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ level }),
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || t('practice.errors.quickMixFailed', { status: res.status }));
        return;
      }

      const generated = data.generatedExam || data;
      setGeneratedMixExam(generated);
      setActiveTab('mix');
      await loadRecentMixExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('practice.errors.connectError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (newSeed: number) => {
    if (!generatedMixExam) return;
    setIsGenerating(true);
    setError(null);

    try {
      let tokenHeader: string | null = null;
      if (typeof window !== 'undefined') {
        tokenHeader = localStorage.getItem('jlpt_auth_token') || sessionStorage.getItem('jlpt_auth_token');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tokenHeader) {
        headers['Authorization'] = `Bearer ${tokenHeader}`;
      }

      const res = await fetch(`${baseUrl}/generated-exams/${encodeURIComponent(generatedMixExam.id)}/regenerate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newSeed }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedMixExam(data.generatedExam || data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || t('practice.errors.regenerateFailed'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('practice.errors.regenerateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full" data-testid="practice-page-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          {t('practice.page.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
          {t('practice.page.subtitle')}
        </p>
      </div>

      {isUnauthorized && (
        <Alert variant="warning" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span>{t('practice.auth.required')}</span>
            <Link href="/dang-nhap?redirect=/luyen-tap">
              <Button size="sm" variant="primary">{t('practice.auth.signInButton')}</Button>
            </Link>
          </div>
        </Alert>
      )}

      {error && !isUnauthorized && (
        <Alert variant="error" onClose={() => setError(null)} style={{ marginBottom: '1.5rem' }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label={t('practice.tabs.ariaLabel')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '2rem',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'practice'}
          data-testid="tab-practice"
          onClick={() => {
            setActiveTab('practice');
            setActivePracticeExam(null);
            loadInProgressSessions();
          }}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'practice' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'practice' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('practice.tabs.practice')}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mix'}
          data-testid="tab-mix"
          onClick={() => setActiveTab('mix')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'mix' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'mix' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('practice.tabs.mix')}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quick'}
          data-testid="tab-quick"
          onClick={() => setActiveTab('quick')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'quick' ? 'var(--color-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'quick' ? '2px solid var(--color-primary)' : '2px solid transparent',
            marginBottom: '-1px',
            minHeight: '44px',
          }}
        >
          {t('practice.tabs.quick')}
        </button>
      </div>

      {/* Tab 1: Practice Generator, In-progress, & Runner */}
      {activeTab === 'practice' && (
        <div id="practice-panel" role="tabpanel" className="space-y-6">
          {activePracticeExam ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActivePracticeExam(null);
                    setActiveAttemptId(undefined);
                    setActiveLease(undefined);
                    setInitialAnswers(undefined);
                    loadInProgressSessions();
                  }}
                  data-testid="change-practice-config-btn"
                >
                  {t('practice.runner.changeConfig')}
                </Button>
              </div>
              <PracticeRunner
                snapshot={activePracticeExam}
                attemptId={activeAttemptId}
                lease={activeLease}
                initialAnswers={initialAnswers}
                apiClient={apiClient}
                onFinish={() => {
                  loadInProgressSessions();
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* In-progress practice sessions list (PRA-17) */}
              {loadingInProgress && (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Spinner size="sm" />
                  <span>{t('practice.inProgress.loading')}</span>
                </div>
              )}

              {inProgressSessions.length > 0 && (
                <div
                  data-testid="in-progress-practice-section"
                  className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-blue-950 dark:text-blue-100 flex items-center gap-2">
                        <span>⏳</span> {t('practice.inProgress.title')}
                      </h3>
                      <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                        {t('practice.inProgress.subtitle')}
                      </p>
                    </div>
                    <Badge variant="primary" size="sm">
                      {inProgressSessions.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-1">
                    {inProgressSessions.map((session) => (
                      <div
                        key={session.id}
                        data-testid={`in-progress-item-${session.id}`}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {session.title}
                            </span>
                            <Badge variant="neutral" size="sm">
                              {session.level}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            {t('practice.inProgress.answered', {
                              answered: session.answeredCount,
                              total: session.totalQuestions,
                            })}
                          </span>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          loading={isGenerating}
                          onClick={() => handleResumePractice(session.id)}
                          data-testid={`resume-practice-btn-${session.id}`}
                        >
                          {t('practice.inProgress.resume')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PracticeGenerator
                onGenerate={handleGeneratePractice}
                isGenerating={isGenerating}
                shortage={practiceShortage}
                onProceedWithShortage={() => {
                  setPracticeShortage(null);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Mix Generator & Generated Exam Card */}
      {activeTab === 'mix' && (
        <div id="mix-panel" role="tabpanel" className="space-y-6">
          {generatedMixExam && (
            <div className="space-y-4">
              <GeneratedExamCard
                generatedExam={generatedMixExam}
                onRegenerate={handleRegenerate}
              />
              <div className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeneratedMixExam(null)}
                >
                  {t('practice.mix.changeConfig')}
                </Button>
              </div>
            </div>
          )}

          {!generatedMixExam && (
            <MixGenerator
              onGenerate={handleGenerateMix}
              isGenerating={isGenerating}
              shortage={mixShortage}
            />
          )}

          {/* List of previously generated exams if any */}
          {loadingRecent && (
            <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
              <Spinner size="sm" />
              <span>{t('practice.recent.loading')}</span>
            </div>
          )}
          {recentMixExams.length > 0 && !generatedMixExam && (
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
                {t('practice.recent.title', { count: recentMixExams.length })}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentMixExams.slice(0, 4).map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary transition cursor-pointer"
                    onClick={() => setGeneratedMixExam(exam)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm">{exam.configHash || exam.id.slice(0, 8)}</span>
                      <span className="text-xs text-slate-500">Seed: {exam.seed}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {t('practice.recent.version', { version: exam.engineVersion })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Quick Mix */}
      {activeTab === 'quick' && (
        <div id="quick-panel" role="tabpanel">
          <QuickMixCard onQuickMix={handleQuickMix} isLoading={isGenerating} />
        </div>
      )}
    </div>
  );
}
