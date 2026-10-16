import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  SAMPLE_EXAM_SUMMARIES,
  findExamSummaryBySlug,
  SAMPLE_N5_EXAM_SNAPSHOT,
} from '../features/exam/fixtures/exam-fixtures';
import { LibraryView } from '../features/library/components/library-view';
import { ExamCard } from '../features/library/components/exam-card';
import { ExamDetailView } from '../features/library/components/exam-detail-view';
import { ScoreSummaryCard } from '../features/results/components/score-summary-card';
import { ScoreComparisonCard } from '../features/results/components/score-comparison-card';
import { ReviewPalette } from '../features/results/components/review-palette';
import { ReviewView } from '../features/results/components/review-view';
import { HistoryView } from '../features/results/components/history-view';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import type { Result, PublicExamSnapshot } from '@jlpt/schema';
import type { ExamHistoryItem } from '../features/results/types';
import type { ExamWithUserStatus } from '../features/library/types';

const renderClean = (element: React.ReactElement): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

const SAMPLE_RESULT: Result = {
  totals: { correct: 4, wrong: 1, blank: 0, total: 5 },
  accuracy: 80,
  durationSec: 2100,
  bySection: [
    { code: 'language_vocab', correct: 2, total: 2 },
    { code: 'language_grammar_reading', correct: 1, total: 2 },
    { code: 'listening', correct: 1, total: 1 },
  ],
  bySkill: [
    { skill: 'kanji', correct: 1, total: 1 },
    { skill: 'vocabulary', correct: 1, total: 1 },
    { skill: 'grammar', correct: 1, total: 1 },
    { skill: 'reading', correct: 0, total: 1 },
    { skill: 'listening', correct: 1, total: 1 },
  ],
  scoring: {
    method: 'linear_reference',
    sections: [
      {
        code: 'language_vocab',
        label: 'Kiến thức ngôn ngữ (Từ vựng)',
        raw: 2,
        rawMax: 2,
        scaled: 60,
        maxScaled: 60,
        minPass: 19,
        passed: true,
      },
      {
        code: 'language_grammar_reading',
        label: 'Ngữ pháp & Đọc hiểu',
        raw: 1,
        rawMax: 2,
        scaled: 40,
        maxScaled: 60,
        minPass: 19,
        passed: true,
      },
      {
        code: 'listening',
        label: 'Nghe hiểu',
        raw: 1,
        rawMax: 1,
        scaled: 60,
        maxScaled: 60,
        minPass: 19,
        passed: true,
      },
    ],
    total: 160,
    totalMax: 180,
    totalPass: 80,
    passEstimate: true,
  },
  flags: [],
};

const SAMPLE_PREVIOUS_RESULT: Result = {
  ...SAMPLE_RESULT,
  totals: { correct: 3, wrong: 2, blank: 0, total: 5 },
  accuracy: 60,
  scoring: {
    ...SAMPLE_RESULT.scoring,
    total: 130,
  },
};

describe('E2E Library, Results, Review & Persisted History Suite (N03)', () => {
  // =========================================================================
  // LIB-01..07, LIB-15: Public Exam Library
  // =========================================================================
  describe('LIB-01..07, LIB-15: Public Exam Library Listing and Metadata', () => {
    it('[LIB-01] LibraryView displays exam list for N1–N5', () => {
      const html = renderClean(<LibraryView exams={SAMPLE_EXAM_SUMMARIES} />);

      expect(html).toContain('Đề thi chính thức JLPT N1');
      expect(html).toContain('Đề thi chính thức JLPT N2');
      expect(html).toContain('Đề thi thử chuẩn cấu trúc JLPT N3');
      expect(html).toContain('Đề luyện tổng hợp JLPT N4');
      expect(html).toContain('Đề thi thử JLPT N5 Mẫu Chuẩn');
    });

    it('[LIB-02] LibraryView supports level filtering', () => {
      const html = renderClean(<LibraryView exams={SAMPLE_EXAM_SUMMARIES} initialLevel="N1" />);

      expect(html).toContain('Đang lọc cấp độ: N1');
      expect(html).toContain('Đề thi chính thức JLPT N1');
      // Should not show other levels in filtered list
      expect(html).not.toContain('Đề thi chính thức JLPT N2');
      expect(html).not.toContain('Đề thi thử chuẩn cấu trúc JLPT N3');
    });

    it('[LIB-05] ExamCard distinguishes original, practice, and mixed exam kinds', () => {
      const originalExam = SAMPLE_EXAM_SUMMARIES.find((e) => e.kind === 'original')!;
      const practiceExam = SAMPLE_EXAM_SUMMARIES.find((e) => e.kind === 'practice')!;
      const mixedExam = SAMPLE_EXAM_SUMMARIES.find((e) => e.kind === 'mixed')!;

      const htmlOriginal = renderClean(<ExamCard exam={originalExam} />);
      expect(htmlOriginal).toContain('Đề thi thật chính thức');

      const htmlPractice = renderClean(<ExamCard exam={practiceExam} />);
      expect(htmlPractice).toContain('Đề luyện tự biên soạn');

      const htmlMixed = renderClean(<ExamCard exam={mixedExam} />);
      expect(htmlMixed).toContain('Đề trộn đa nguồn');
    });

    it('[LIB-07] ExamCard renders questions count, duration, and section times', () => {
      const exam = SAMPLE_EXAM_SUMMARIES[0]!;
      const html = renderClean(<ExamCard exam={exam} />);

      expect(html).toContain(`${exam.totalQuestions} câu`);
      expect(html).toContain(`${exam.sections.length} phần`);
      expect(html).toContain('phút');
      for (const sec of exam.sections) {
        expect(html).toContain(sec.title);
      }
    });

    it('[LIB-08] ExamCard displays user status: not_started, in_progress, completed', () => {
      const notStartedExam: ExamWithUserStatus = { ...SAMPLE_EXAM_SUMMARIES[0]!, userStatus: 'not_started' };
      const inProgressExam: ExamWithUserStatus = { ...SAMPLE_EXAM_SUMMARIES[1]!, userStatus: 'in_progress' };
      const completedExam: ExamWithUserStatus = { ...SAMPLE_EXAM_SUMMARIES[2]!, userStatus: 'completed', bestScore: 145 };

      expect(renderClean(<ExamCard exam={notStartedExam} />)).toContain('Chưa làm');
      expect(renderClean(<ExamCard exam={inProgressExam} />)).toContain('Đang làm dở');
      expect(renderClean(<ExamCard exam={completedExam} />)).toContain('Đã hoàn thành (145đ)');
    });

    it('[LIB-15] ExamCard and ExamDetailView display source attribution, version, and license', () => {
      const exam = SAMPLE_EXAM_SUMMARIES[0]!;
      const htmlCard = renderClean(<ExamCard exam={exam} />);
      expect(htmlCard).toContain(exam.sourceLabel!);
      expect(htmlCard).toContain(exam.licenseLabel!);
      expect(htmlCard).toContain(`v${exam.publishedVersion}`);

      const detailedExam = findExamSummaryBySlug(exam.slug)!;
      const htmlDetail = renderClean(<ExamDetailView exam={detailedExam} />);
      expect(htmlDetail).toContain(detailedExam.sourceLabel!);
      expect(htmlDetail).toContain(detailedExam.licenseLabel!);
      expect(htmlDetail).toContain(`v${detailedExam.publishedVersion}`);
      expect(htmlDetail).toContain('Cấu trúc các phần thi');
    });

    // =========================================================================
    // Acceptance 3: Public HTML không PII
    // =========================================================================
    it('[Acceptance 3] Public library HTML does NOT leak candidate PII', () => {
      const htmlLib = renderClean(<LibraryView exams={SAMPLE_EXAM_SUMMARIES} />);

      // PII strings check: must never contain personal email, user identity
      expect(htmlLib).not.toContain('@example.com');
      expect(htmlLib).not.toContain('user_');
      expect(htmlLib).not.toContain('userId');
      expect(htmlLib).not.toContain('emailVerified');

      const slug = SAMPLE_EXAM_SUMMARIES[0]!.slug;
      const detailedExam = findExamSummaryBySlug(slug)!;
      const htmlDetail = renderClean(<ExamDetailView exam={detailedExam} />);

      expect(htmlDetail).not.toContain('@example.com');
      expect(htmlDetail).not.toContain('userId');
    });
  });

  // =========================================================================
  // SCORE-07..10 & AUDIO-07: Results, Review and Audio replay
  // =========================================================================
  describe('SCORE-07..10 & AUDIO-07: Exam Review, Answers and Progress Comparison', () => {
    const snapshot: PublicExamSnapshot = SAMPLE_N5_EXAM_SNAPSHOT;
    const flat = flattenExamQuestions(snapshot);

    it('[SCORE-07 & SCORE-08] ReviewView renders full submitted exam with correct answers', () => {
      const html = renderClean(
        <ReviewView
          reviewData={{
            attemptId: '0192f000-5000-7000-8000-000000000099',
            examId: snapshot.examId,
            mode: 'real',
            snapshot,
            answers: [1, 1, 3, 2, 1],
            flags: [0, 0, 0, 0, 0],
            correct: [1, 1, 4, 1, 1],
            result: SAMPLE_RESULT,
          }}
        />,
      );

      // Verify header and score highlights
      expect(html).toContain('Đề thi thử JLPT N5 Mẫu Chuẩn');
      expect(html).toContain('160');
      expect(html).toContain('80%');
      expect(html).toContain('ĐỖ (PASS)');

      // Verify correct answers and user choices are identified (SCORE-07)
      expect(html).toContain('Đáp án đúng');
      expect(html).toContain('Bạn đã chọn');
      expect(html).toContain('Làm đúng');
      expect(html).toContain('Làm sai');
    });

    it('[AUDIO-07] ReviewQuestionItem renders dedicated audio replay player for listening question', () => {
      const listeningQ = flat.find((q) => q.sectionCode === 'listening')!;
      expect(listeningQ).toBeDefined();

      const html = renderClean(
        <ReviewView
          reviewData={{
            attemptId: '0192f000-5000-7000-8000-000000000099',
            examId: snapshot.examId,
            mode: 'real',
            snapshot,
            answers: [1, 1, 3, 2, 1],
            flags: [0, 0, 0, 0, 0],
            correct: [1, 1, 4, 1, 1],
            result: SAMPLE_RESULT,
          }}
        />,
      );

      // AUDIO-07 assertion: listening question must provide replay button
      expect(html).toContain('Nghe lại audio câu');
    });

    it('[SCORE-09] ReviewPalette filters questions by status (correct, wrong, blank, flagged)', () => {
      const html = renderClean(
        <ReviewPalette
          questions={flat}
          answers={[1, 1, 3, 0, 1]}
          correct={[1, 1, 4, 1, 1]}
          flags={[0, 1, 0, 0, 0]}
          activeFilter="all"
          onFilterChange={() => {}}
          onSelectQuestion={() => {}}
        />,
      );

      expect(html).toContain('Tất cả');
      expect(html).toContain('Làm đúng');
      expect(html).toContain('Làm sai');
      expect(html).toContain('Bỏ trống');
      expect(html).toContain('Có gắn cờ');
    });

    it('[SCORE-10] ScoreComparisonCard computes progress delta against previous attempt', () => {
      const html = renderClean(
        <ScoreComparisonCard
          currentResult={SAMPLE_RESULT}
          previousResult={SAMPLE_PREVIOUS_RESULT}
        />,
      );

      // Score diff: 160 - 130 = +30
      expect(html).toContain('+30 điểm');
      expect(html).toContain('Bạn đã tiến bộ +30 điểm so với lần trước!');
      expect(html).toContain('160đ');
      expect(html).toContain('Lần trước: 130đ');
      expect(html).toContain('+20%'); // Accuracy: 80% vs 60%
    });

    it('ScoreSummaryCard renders pass/fail status, total points, and sectional breakdown', () => {
      const html = renderClean(
        <ScoreSummaryCard
          result={SAMPLE_RESULT}
          examTitle="Đề thi N5 tháng 12/2023"
          level="N5"
          mode="real"
        />,
      );
      expect(html).toContain('N5');
      expect(html).toContain('Đề thi N5 tháng 12/2023');
      expect(html).toContain('Thi thật tiêu chuẩn');
      expect(html).toContain('/ 180');
    });
  });

  // =========================================================================
  // STAT-01 & SCORE-11: Persisted History
  // =========================================================================
  describe('STAT-01 & SCORE-11: Persisted History Table', () => {
    it('HistoryView renders all persisted attempts with scores and review links', () => {
      const historyItems: ExamHistoryItem[] = [
        {
          id: '0192f000-5000-7000-8000-000000000001',
          examId: '0192f000-0000-7000-8000-000000000005',
          examVersion: 1,
          mode: 'real',
          status: 'submitted',
          startedAt: '2026-10-14T08:00:00Z',
          submittedAt: '2026-10-14T09:30:00Z',
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
          startedAt: '2026-10-11T10:00:00Z',
          submittedAt: '2026-10-11T11:20:00Z',
          score: 95,
          passed: true,
          examTitle: 'Đề thi thử chuẩn cấu trúc JLPT N3 - Số 1',
          examLevel: 'N3',
          accuracy: 62,
        },
      ];

      const html = renderClean(<HistoryView historyItems={historyItems} />);

      expect(html).toContain('Lịch sử các lần làm bài thi (STAT-01)');
      expect(html).toContain('Đề thi thử JLPT N5 Mẫu Chuẩn');
      expect(html).toContain('Đề thi thử chuẩn cấu trúc JLPT N3 - Số 1');
      expect(html).toContain('135đ');
      expect(html).toContain('95đ');
      expect(html).toContain('ĐỖ');
      expect(html).toContain('Xem lại bài làm');
    });

    it('HistoryView renders empty state when user has not taken any exams', () => {
      const html = renderClean(<HistoryView historyItems={[]} />);

      expect(html).toContain('Chưa có lịch sử làm bài thi');
      expect(html).toContain('Khám phá thư viện đề thi');
    });
  });
});
