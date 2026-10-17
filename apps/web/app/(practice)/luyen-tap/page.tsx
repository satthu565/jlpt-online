'use client';

import React, { useState, useEffect } from 'react';
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
import type { GeneratedExam, Level, PublicExamSnapshot } from '@jlpt/schema';
import { Button, Alert, Spinner } from '@jlpt/ui';
import Link from 'next/link';
import { useI18n } from '../../../lib/i18n';

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

  // Active generated mix exam
  const [generatedMixExam, setGeneratedMixExam] = useState<GeneratedExam | null>(null);

  // Recent generated exams
  const [recentMixExams, setRecentMixExams] = useState<GeneratedExam[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/$/, '');

  const loadRecentMixExams = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`${baseUrl}/generated-exams`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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
    if (activeTab === 'mix') {
      loadRecentMixExams();
    }
  }, [activeTab]);

  const handleGeneratePractice = async (config: PracticeFilterState) => {
    setIsGenerating(true);
    setPracticeShortage(null);
    setError(null);
    setIsUnauthorized(false);

    try {
      const res = await fetch(`${baseUrl}/practice-exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.shortage || data.code === 'SHORTAGE' || data.isShortage) {
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

      if (data.snapshot) {
        setActivePracticeExam(data.snapshot);
      } else if (data.exam && data.exam.snapshot) {
        setActivePracticeExam(data.exam.snapshot);
      } else {
        setError(t('practice.errors.noExamData'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('practice.errors.connectError'));
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
      const res = await fetch(`${baseUrl}/mixed-exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.shortage || data.code === 'SHORTAGE' || data.isShortage) {
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
      const res = await fetch(`${baseUrl}/mixed-exams/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${baseUrl}/generated-exams/${encodeURIComponent(generatedMixExam.id)}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
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
          data-testid="tab-practice-btn"
          onClick={() => {
            setActiveTab('practice');
            setActivePracticeExam(null);
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
          data-testid="tab-mix-btn"
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
          data-testid="tab-quick-mix-btn"
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

      {/* Tab 1: Practice Generator & Runner */}
      {activeTab === 'practice' && (
        <div id="practice-panel" role="tabpanel">
          {activePracticeExam ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePracticeExam(null)}
                >
                  {t('practice.runner.changeConfig')}
                </Button>
              </div>
              <PracticeRunner snapshot={activePracticeExam} />
            </div>
          ) : (
            <PracticeGenerator
              onGenerate={handleGeneratePractice}
              isGenerating={isGenerating}
              shortage={practiceShortage}
              onProceedWithShortage={() => {
                setPracticeShortage(null);
              }}
            />
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
