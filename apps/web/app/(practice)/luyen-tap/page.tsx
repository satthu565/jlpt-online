'use client';

import React, { useState } from 'react';
import { PracticeGenerator, PracticeRunner, type PracticeFilterState, type PracticeShortageInfo } from '../../../features/practice';
import { MixGenerator, QuickMixCard, GeneratedExamCard, type MixFormState, type MixShortageInfo } from '../../../features/mix';
import { SAMPLE_N3_EXAM_SNAPSHOT, SAMPLE_N2_EXAM_SNAPSHOT } from '../../../features/exam/fixtures/exam-fixtures';
import type { GeneratedExam, Level } from '@jlpt/schema';
import { Button } from '@jlpt/ui';

export default function PracticeAndMixPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'practice' | 'mix' | 'quick'>('practice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceShortage, setPracticeShortage] = useState<PracticeShortageInfo | null>(null);
  const [mixShortage, setMixShortage] = useState<MixShortageInfo | null>(null);

  // Active practice runner session
  const [activePracticeExam, setActivePracticeExam] = useState<typeof SAMPLE_N3_EXAM_SNAPSHOT | null>(null);

  // Active generated mix exam
  const [generatedMixExam, setGeneratedMixExam] = useState<GeneratedExam | null>(null);

  const handleGeneratePractice = async (config: PracticeFilterState) => {
    setIsGenerating(true);
    setPracticeShortage(null);

    // Simulate shortage UX if question count > 20 in 'wrong' pool for testing/demonstration
    if (config.pool === 'wrong' && config.questionCount > 15) {
      setTimeout(() => {
        setIsGenerating(false);
        setPracticeShortage({
          isShortage: true,
          requested: config.questionCount,
          available: 8,
          pool: config.pool,
          level: config.level,
        });
      }, 400);
      return;
    }

    try {
      // In real mode, call POST /practice-exams; in mock, use sample snapshot
      setTimeout(() => {
        setIsGenerating(false);
        setActivePracticeExam(config.level === 'N2' ? SAMPLE_N2_EXAM_SNAPSHOT : SAMPLE_N3_EXAM_SNAPSHOT);
      }, 500);
    } catch {
      setIsGenerating(false);
      setActivePracticeExam(SAMPLE_N3_EXAM_SNAPSHOT);
    }
  };

  const handleGenerateMix = async (config: MixFormState) => {
    setIsGenerating(true);
    setMixShortage(null);

    // Simulate shortage if custom weights cannot be satisfied
    if (config.mode === 'Custom' && config.sourceWeights['2023-12'] === 1) {
      setTimeout(() => {
        setIsGenerating(false);
        setMixShortage({
          isShortage: true,
          mode: config.mode,
          level: config.level,
          missingMondaiTypes: ['kanji_reading', 'text_grammar'],
          requested: 35,
          available: 22,
          message: 'Kỳ thi 12/2023 đơn lẻ không đủ số câu cho toàn bộ blueprint N3.',
          suggestions: ['Thêm nguồn đề 07/2024 hoặc ngân hàng đề thi JLPT Online.'],
        });
      }, 400);
      return;
    }

    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedMixExam({
        id: '0192f000-mix0-7000-8000-000000000001',
        examId: SAMPLE_N3_EXAM_SNAPSHOT.examId,
        version: 1,
        seed: config.seed ?? 42,
        engineVersion: '1.2.0',
        configHash: 'hash_' + config.mode.toLowerCase() + '_' + config.level,
        selectionGroupIds: ['0192f000-1000-7000-8000-000000000001'],
        sourceSummary: {
          '2023-12': { count: 14, ratio: 0.4, requestedRatio: 0.4 },
          '2024-07': { count: 14, ratio: 0.4, requestedRatio: 0.4 },
          bank_official: { count: 7, ratio: 0.2, requestedRatio: 0.2 },
        },
        warnings: [],
        blueprintConformant: true,
      });
    }, 500);
  };

  const handleQuickMix = async (level: Level) => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedMixExam({
        id: '0192f000-quick-7000-8000-000000000001',
        examId: level === 'N2' ? SAMPLE_N2_EXAM_SNAPSHOT.examId : SAMPLE_N3_EXAM_SNAPSHOT.examId,
        version: 1,
        seed: 12345,
        engineVersion: '1.2.0',
        configHash: 'quick_' + level.toLowerCase(),
        selectionGroupIds: ['0192f000-1000-7000-8000-000000000001'],
        sourceSummary: {
          '2023-12': { count: 15, ratio: 0.5, requestedRatio: 0.5 },
          bank_official: { count: 15, ratio: 0.5, requestedRatio: 0.5 },
        },
        warnings: [],
        blueprintConformant: true,
      });
      setActiveTab('mix');
    }, 500);
  };

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          Luyện tập chuyên đề & Trộn đề thông minh
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
          Tùy biến các bài thi thử theo điểm yếu, câu chưa làm, câu làm sai hoặc tạo bộ đề tổng hợp bất biến.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Các chế độ ôn luyện"
        style={{
          display: 'flex',
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
          📚 Luyện theo nguồn câu hỏi (Practice)
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
          🔀 Trộn đề đa nguồn (7 Chế độ)
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
          ⚡ Trộn nhanh 1 chạm
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
                  ← Đổi cấu hình luyện tập
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
                setActivePracticeExam(SAMPLE_N3_EXAM_SNAPSHOT);
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
                onRegenerate={(newSeed) => {
                  setGeneratedMixExam((prev) => (prev ? { ...prev, seed: newSeed } : null));
                }}
              />
              <div className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeneratedMixExam(null)}
                >
                  Tạo cấu hình trộn đề khác
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
