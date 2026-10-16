'use client';

import React from 'react';
import { AnalyticsDashboard } from '../../../features/analytics';
import type { AttemptRecord, QuestionAttemptRecord } from '../../../features/analytics/types';
import type { Level } from '@jlpt/schema';
import { useAuth } from '../../../lib/auth-context';

export default function AnalyticsPage(): React.JSX.Element {
  const { user } = useAuth();

  // Hand-verified sample attempts history
  const sampleAttempts: AttemptRecord[] = [
    {
      id: 'att-01',
      examId: '0192f000-0000-7000-8000-000000000003',
      examTitle: 'Đề thi chính thức JLPT N3 - 12/2023',
      level: 'N3',
      mode: 'real',
      totalScore: 92,
      maxScore: 180,
      accuracy: 51.1,
      passed: false,
      durationSec: 5400,
      submittedAt: '2026-08-15T09:30:00Z',
    },
    {
      id: 'att-02',
      examId: '0192f000-0000-7000-8000-000000000004',
      examTitle: 'Đề thi chính thức JLPT N3 - 07/2024',
      level: 'N3',
      mode: 'real',
      totalScore: 110,
      maxScore: 180,
      accuracy: 61.1,
      passed: true,
      durationSec: 5200,
      submittedAt: '2026-09-10T14:15:00Z',
    },
    {
      id: 'att-03',
      examId: '0192f000-mix0-7000-8000-000000000001',
      examTitle: 'Đề trộn tổng hợp N3 Balanced',
      level: 'N3',
      mode: 'practice',
      totalScore: 128,
      maxScore: 180,
      accuracy: 71.1,
      passed: true,
      durationSec: 4800,
      submittedAt: '2026-10-12T10:00:00Z',
    },
  ];

  // Question attempt records with strict separation between Unseen (exposureCount = 0) and Familiar (exposureCount > 0)
  const sampleQuestionAttempts: QuestionAttemptRecord[] = [
    // Unseen fresh questions (exposureCount = 0)
    {
      questionId: 'q-u1',
      questionNumber: '1',
      stemPreview: 'この法律の改正には慎重な審議が求められる。',
      level: 'N3',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      isCorrect: true,
      timeSpentMs: 42000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:05:00Z',
    },
    {
      questionId: 'q-u2',
      questionNumber: '2',
      stemPreview: '新政策の実施に伴い、様々な問題が惹起された。',
      level: 'N3',
      skill: 'vocabulary',
      mondaiType: 'contextual',
      isCorrect: false,
      timeSpentMs: 65000,
      exposureCount: 0,
      errorCategory: 'vocab_nuance',
      submittedAt: '2026-10-12T10:07:00Z',
    },
    {
      questionId: 'q-u3',
      questionNumber: '3',
      stemPreview: '計画を成功させるためには、事前の準備が不可欠だ。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'sentence_composition',
      isCorrect: true,
      timeSpentMs: 50000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:09:00Z',
    },
    {
      questionId: 'q-u4',
      questionNumber: '4',
      stemPreview: '彼の説明は要領を得ず、理解するのが難しかった。',
      level: 'N3',
      skill: 'reading',
      mondaiType: 'comprehension_short',
      isCorrect: false,
      timeSpentMs: 110000,
      exposureCount: 0,
      errorCategory: 'time_pressure',
      submittedAt: '2026-10-12T10:14:00Z',
    },
    {
      questionId: 'q-u5',
      questionNumber: '5',
      stemPreview: '会議で今後のスケジュールについて話し合います。',
      level: 'N3',
      skill: 'listening',
      mondaiType: 'task_based',
      isCorrect: true,
      timeSpentMs: 70000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:20:00Z',
    },
    {
      questionId: 'q-u6',
      questionNumber: '6',
      stemPreview: '経済の回復に伴い、雇用の状況も改善しつつある。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: true,
      timeSpentMs: 45000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:25:00Z',
    },
    {
      questionId: 'q-u7',
      questionNumber: '7',
      stemPreview: '技術の進歩は私たちの生活を大きく変えた。',
      level: 'N3',
      skill: 'reading',
      mondaiType: 'comprehension_mid',
      isCorrect: true,
      timeSpentMs: 85000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:30:00Z',
    },
    {
      questionId: 'q-u8',
      questionNumber: '8',
      stemPreview: '環境問題に対する関心が高まっている。',
      level: 'N3',
      skill: 'vocabulary',
      mondaiType: 'paraphrase',
      isCorrect: true,
      timeSpentMs: 40000,
      exposureCount: 0,
      submittedAt: '2026-10-12T10:35:00Z',
    },
    {
      questionId: 'q-u9',
      questionNumber: '9',
      stemPreview: '留学生の増加に対応するため、支援体制を整える。',
      level: 'N3',
      skill: 'kanji',
      mondaiType: 'orthography',
      isCorrect: false,
      timeSpentMs: 55000,
      exposureCount: 0,
      errorCategory: 'kanji_confusion',
      submittedAt: '2026-10-12T10:40:00Z',
    },
    {
      questionId: 'q-u10',
      questionNumber: '10',
      stemPreview: '資料を整理してからレポートを書き始めた。',
      level: 'N3',
      skill: 'listening',
      mondaiType: 'point',
      isCorrect: false,
      timeSpentMs: 68000,
      exposureCount: 0,
      errorCategory: 'listening_distractor',
      submittedAt: '2026-10-12T10:45:00Z',
    },

    // Familiar repeated questions (exposureCount > 0)
    {
      questionId: 'q-f1',
      questionNumber: '11',
      stemPreview: '事故の知らせを聞いて、現場に急行した。',
      level: 'N3',
      skill: 'kanji',
      mondaiType: 'kanji_reading',
      isCorrect: true,
      timeSpentMs: 30000,
      exposureCount: 1,
      submittedAt: '2026-10-12T10:50:00Z',
    },
    {
      questionId: 'q-f2',
      questionNumber: '12',
      stemPreview: 'どんな困難があっても、決して諦めない。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: true,
      timeSpentMs: 32000,
      exposureCount: 2,
      submittedAt: '2026-10-12T10:52:00Z',
    },
    {
      questionId: 'q-f3',
      questionNumber: '13',
      stemPreview: 'この製品は環境に配慮して作られている。',
      level: 'N3',
      skill: 'vocabulary',
      mondaiType: 'contextual',
      isCorrect: true,
      timeSpentMs: 35000,
      exposureCount: 1,
      submittedAt: '2026-10-12T10:55:00Z',
    },
    {
      questionId: 'q-f4',
      questionNumber: '14',
      stemPreview: '雨が降りそうなので、傘を持っていったほうがいい。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'sentence_composition',
      isCorrect: true,
      timeSpentMs: 28000,
      exposureCount: 1,
      submittedAt: '2026-10-12T10:58:00Z',
    },
    {
      questionId: 'q-f5',
      questionNumber: '15',
      stemPreview: '友人に勧められて、新しい趣味を始めた。',
      level: 'N3',
      skill: 'reading',
      mondaiType: 'comprehension_short',
      isCorrect: true,
      timeSpentMs: 45000,
      exposureCount: 2,
      submittedAt: '2026-10-12T11:02:00Z',
    },
    // Repeated wrong question (missed multiple times)
    {
      questionId: 'q-rep1',
      questionNumber: '16',
      stemPreview: '契約を締結するにあたり、条件を慎重に確認する。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: false,
      timeSpentMs: 70000,
      exposureCount: 2,
      errorCategory: 'grammar_trap',
      submittedAt: '2026-10-12T11:05:00Z',
    },
    {
      questionId: 'q-rep1',
      questionNumber: '16',
      stemPreview: '契約を締結するにあたり、条件を慎重に確認する。',
      level: 'N3',
      skill: 'grammar',
      mondaiType: 'grammar_form',
      isCorrect: false,
      timeSpentMs: 75000,
      exposureCount: 1,
      errorCategory: 'grammar_trap',
      submittedAt: '2026-09-10T14:30:00Z',
    },
  ];

  return (
    <div className="container" style={{ padding: '3rem 1rem', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
          }}
        >
          Bảng điều khiển học tập & Phân tích chuyên sâu (Analytics Dashboard)
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9375rem' }}>
          Đánh giá tiến độ thực chất, kiểm soát bẫy lạm phát điểm quen thuộc, và định hướng kỹ năng cần ưu tiên bứt phá.
        </p>
      </div>

      <AnalyticsDashboard
        attempts={sampleAttempts}
        questionAttempts={sampleQuestionAttempts}
        targetLevel={(user?.targetLevel as Level) || 'N3'}
        targetScore={120}
      />
    </div>
  );
}
