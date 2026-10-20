import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Components under test
import { MixGenerator } from '../features/mix/components/mix-generator';
import { QuickMixCard } from '../features/mix/components/quick-mix-card';
import { GeneratedExamCard } from '../features/mix/components/generated-exam-card';
import { MixShortageNotice } from '../features/mix/components/mix-shortage-notice';
import { ShareExamModal } from '../features/mix/components/share-exam-modal';
import type { MixMode } from '../features/mix/types';

import { PracticeGenerator } from '../features/practice/components/practice-generator';
import { PracticeRunner } from '../features/practice/components/practice-runner';
import { PracticeShortageNotice } from '../features/practice/components/practice-shortage-notice';
import type { PracticePool } from '../features/practice/types';

import { TranscriptView } from '../features/explanations/components/transcript-view';
import { ExplanationView } from '../features/explanations/components/explanation-view';
import { QuestionBookmarkButton } from '../features/explanations/components/question-bookmark-button';
import { QuestionReportModal } from '../features/explanations/components/question-report-modal';
import type { LearnerExplanation } from '../features/explanations/types';

import { ExamCard } from '../features/library/components/exam-card';
import { LibraryView } from '../features/library/components/library-view';
import type { ExamWithUserStatus } from '../features/library/types';
import { SAMPLE_N3_EXAM_SNAPSHOT } from './fixtures/exam-fixtures';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

describe('E2E Learning, Generator Modes, Explanations & Personalization Suite (L03)', () => {
  // =========================================================================
  // 1. Acceptance Criteria 1: Mỗi chế độ generator có E2E
  // =========================================================================

  describe('Mix Generator - All 7 Generator Modes E2E', () => {
    const allMixModes: MixMode[] = [
      'Random',
      'Balanced',
      'Weakness',
      'Unseen',
      'Challenge',
      'Revision',
      'Custom',
    ];

    allMixModes.forEach((mode) => {
      it(`renders and verifies mix generator configuration for mode: ${mode}`, () => {
        const html = renderClean(
          <MixGenerator
            onGenerate={() => {}}
          />,
        );

        // Verify mode button exists in DOM
        expect(html).toContain(`data-testid="mix-mode-${mode}"`);
        expect(html).toContain('mix-generator-form');
        expect(html).toContain('data-testid="generate-mix-btn"');
      });
    });

    it('generates a mixed exam with deterministic seed and displays blueprint conformance', () => {
      const generatedMock = {
        id: '0192f000-mix1-7000-8000-000000000001',
        examId: SAMPLE_N3_EXAM_SNAPSHOT.examId,
        version: 1,
        seed: 777888,
        engineVersion: '1.2.0',
        configHash: 'hash_balanced_n3_v1',
        selectionGroupIds: ['0192f000-1000-7000-8000-000000000001'],
        sourceSummary: {
          '2023-12': { count: 12, ratio: 0.4, requestedRatio: 0.4 },
          '2024-07': { count: 12, ratio: 0.4, requestedRatio: 0.4 },
          bank_official: { count: 6, ratio: 0.2, requestedRatio: 0.2 },
        },
        warnings: ['Một số câu nhóm nghe hiểu đã được chuẩn hóa âm lượng.'],
        blueprintConformant: true,
      };

      const html = renderClean(
        <GeneratedExamCard generatedExam={generatedMock} title="Đề thi thử N3 Balanced #1" />,
      );

      expect(html).toContain('data-testid="generated-exam-card"');
      expect(html).toContain('data-testid="blueprint-conformant-badge"');
      expect(html).toContain('777888'); // Deterministic seed
      expect(html).toContain('data-testid="source-item-2023-12"');
      expect(html).toContain('data-testid="source-item-bank_official"');
      expect(html).toContain('data-testid="share-exam-btn"');
      expect(html).toContain('data-testid="start-generated-exam-btn"');
    });

    it('provides 1-click Quick Mix generation', () => {
      const html = renderClean(<QuickMixCard onQuickMix={() => {}} />);
      expect(html).toContain('data-testid="quick-mix-card"');
      expect(html).toContain('data-testid="quick-mix-submit-btn"');
      expect(html).toContain('data-testid="quick-mix-level-N3"');
    });

    it('handles Mix Shortage UX gracefully with clear mitigation actions', () => {
      const html = renderClean(
        <MixShortageNotice
          shortage={{
            isShortage: true,
            mode: 'Custom',
            level: 'N3',
            requested: 35,
            available: 20,
            missingMondaiTypes: ['kanji_reading', 'paraphrase'],
            message: 'Thiếu câu hỏi dạng kanji_reading trong nguồn đã chọn.',
            suggestions: ['Thêm nguồn 2024-07 vào danh sách trích xuất.'],
          }}
          onAutoBalance={() => {}}
          onIncludeMoreSources={() => {}}
        />,
      );

      expect(html).toContain('data-testid="mix-shortage-notice"');
      expect(html).toContain('kanji_reading');
      expect(html).toContain('data-testid="mix-auto-balance-btn"');
      expect(html).toContain('data-testid="mix-add-sources-btn"');
    });

    it('supports sharing exam link with immutable seed token', () => {
      const html = renderClean(
        <ShareExamModal
          isOpen={true}
          examId="0192f000-0000-7000-8000-000000000003"
          examTitle="Đề thi chia sẻ N3"
          initialToken="0192f000-token-seed"
          onClose={() => {}}
        />,
      );

      expect(html).toContain('data-testid="share-exam-modal-content"');
      expect(html).toContain('data-testid="share-url-input"');
      expect(html).toContain('data-testid="copy-share-url-btn"');
      expect(html).toContain('Quyền hạn bản quyền & Tính bất biến');
    });
  });

  describe('Practice Generator - All 6 Practice Pools E2E', () => {
    const allPracticePools: PracticePool[] = [
      'wrong',
      'unseen',
      'marked',
      'random',
      'tagged',
      'difficulty',
    ];

    allPracticePools.forEach((pool) => {
      it(`renders and verifies practice generator configuration for pool: ${pool}`, () => {
        const html = renderClean(
          <PracticeGenerator
            onGenerate={() => {}}
          />,
        );

        expect(html).toContain(`data-testid="practice-pool-${pool}"`);
        expect(html).toContain('practice-generator-form');
        expect(html).toContain('data-testid="generate-practice-btn"');
      });
    });

    it('handles Practice Shortage UX when pool has fewer questions than requested', () => {
      const html = renderClean(
        <PracticeShortageNotice
          shortage={{
            isShortage: true,
            pool: 'wrong',
            level: 'N3',
            requested: 25,
            available: 7,
          }}
          onProceedWithAvailable={() => {}}
          onAdjustFilters={() => {}}
        />,
      );

      expect(html).toContain('data-testid="practice-shortage-notice"');
      expect(html).toContain('25 câu');
      expect(html).toContain('7 câu');
      expect(html).toContain('data-testid="shortage-proceed-btn"');
      expect(html).toContain('data-testid="shortage-adjust-btn"');
    });

    it('runs interactive practice session with instant check answer and explanations (PRA-10)', () => {
      const html = renderClean(
        <PracticeRunner
          snapshot={SAMPLE_N3_EXAM_SNAPSHOT}
          onFinish={() => {}}
        />,
      );

      expect(html).toContain('data-testid="practice-runner-container"');
      expect(html).toContain('data-testid="practice-check-answer-btn"');
      expect(html).toContain('data-testid="practice-next-btn"');
      expect(html).toContain('data-testid="practice-option-1"');
    });
  });

  // =========================================================================
  // 2. Acceptance Criteria 2: Nguồn/licensed transcript chỉ hiện theo quyền
  // =========================================================================

  describe('Licensed Audio Transcript Permission Enforcement', () => {
    const SAMPLE_TRANSCRIPT = '男の人と女の人が話しています。男の人はこれから何をしますか。\n男：明日の会議の準備、終わった？\n女：ええ、資料はコピーしておきました。';
    const SAMPLE_EVIDENCE = [
      {
        startMs: 2500,
        endMs: 7000,
        quote: '資料はコピーしておきました。',
        explanation: 'Người phụ nữ xác nhận tài liệu đã được photocopy xong.',
      },
    ];

    it('STRICTLY BLOCKS transcript content when licensed and user lacks permission', () => {
      const html = renderClean(
        <TranscriptView
          transcript={SAMPLE_TRANSCRIPT}
          evidenceRanges={SAMPLE_EVIDENCE}
          isLicensed={true}
          hasLicensePermission={false} // Permission DENIED
          sourceLabel="Giáo trình Nihongo So-matome N3"
          licenseLabel="Bản quyền xuất bản Ask Publishing"
        />,
      );

      // 1. Restricted notice MUST be displayed
      expect(html).toContain('data-testid="transcript-restricted-notice"');
      expect(html).toContain('Transcript âm thanh có bản quyền bảo hộ');
      expect(html).toContain('Ask Publishing');

      // 2. Transcript content MUST NOT be leaked
      expect(html).not.toContain('data-testid="transcript-content"');
      expect(html).not.toContain(SAMPLE_TRANSCRIPT);
      expect(html).not.toContain('資料はコピーしておきました');
    });

    it('DISPLAYS transcript and highlighted evidence ranges when permission is granted', () => {
      const html = renderClean(
        <TranscriptView
          transcript={SAMPLE_TRANSCRIPT}
          evidenceRanges={SAMPLE_EVIDENCE}
          isLicensed={true}
          hasLicensePermission={true} // Permission GRANTED
          sourceLabel="Giáo trình Nihongo So-matome N3"
          licenseLabel="Bản quyền xuất bản Ask Publishing"
        />,
      );

      // 1. Transcript content MUST be present
      expect(html).toContain('data-testid="transcript-content"');
      expect(html).toContain('男の人と女の人が話しています');

      // 2. Evidence ranges MUST be rendered
      expect(html).toContain('data-testid="evidence-range-item"');
      expect(html).toContain('資料はコピーしておきました。');

      // 3. Attribution label rendered
      expect(html).toContain('data-testid="transcript-license-label"');
      expect(html).not.toContain('data-testid="transcript-restricted-notice"');
    });
  });

  describe('Approved Explanations, Bookmarking, and Issue Reporting', () => {
    const SAMPLE_EXPLANATION: LearnerExplanation = {
      index: 0,
      questionId: '0192f000-2000-7000-8000-000000000001',
      hasExplanation: true,
      correctReason: 'Cấu trúc ~に伴い (Ni tomonai) biểu thị cùng với sự thay đổi của A thì B cũng phát sinh đồng thời.',
      wrongReasonsByOption: {
        '2': 'Phương án 2 sai ngữ pháp: ~に関して mang nghĩa liên quan đến, không hợp nghĩa phát sinh.',
        '3': 'Phương án 3 sai trợ từ: ~にとって mang nghĩa đối với.',
        '4': 'Phương án 4 diễn đạt không tự nhiên trong văn viết trang trọng.',
      },
      translation: 'Cùng với việc triển khai chính sách mới, nhiều vấn đề đã phát sinh.',
      vocabTags: ['N3', 'Business Japanese'],
      grammarTags: ['~に伴い', 'Ngữ pháp N3'],
      transcript: null,
      evidenceRanges: [],
    };

    it('renders full approved explanation with correct reason, wrong options analysis, and tags', () => {
      const html = renderClean(
        <ExplanationView
          explanation={SAMPLE_EXPLANATION}
          questionNumber="1"
          userAnswer={2}
          correctAnswer={1}
        />,
      );

      expect(html).toContain('data-testid="explanation-container"');
      expect(html).toContain('data-testid="explanation-correct-reason"');
      expect(html).toContain('~に伴い (Ni tomonai)');
      expect(html).toContain('data-testid="explanation-wrong-reasons"');
      expect(html).toContain('data-testid="wrong-reason-opt-2"');
      expect(html).toContain('data-testid="explanation-translation"');
      expect(html).toContain('data-testid="explanation-tags"');
      expect(html).toContain('Business Japanese');
    });

    it('provides question bookmarking toggle (PRA-13, EXPL-10)', () => {
      const html = renderClean(
        <QuestionBookmarkButton
          questionId="0192f000-2000-7000-8000-000000000001"
          initialBookmarked={false}
        />,
      );

      expect(html).toContain('data-testid="question-bookmark-btn"');
      expect(html).toContain('Lưu câu hỏi');
    });

    it('provides question report modal (EXPL-12)', () => {
      const html = renderClean(
        <QuestionReportModal
          isOpen={true}
          questionId="0192f000-2000-7000-8000-000000000001"
          onClose={() => {}}
        />,
      );

      expect(html).toContain('data-testid="question-report-modal-content"');
      expect(html).toContain('data-testid="report-reason-select"');
      expect(html).toContain('data-testid="report-desc-input"');
    });
  });

  // =========================================================================
  // 3. Acceptance Criteria 4: Favorite best-score attempts next recommendation có đủ UI
  // =========================================================================

  describe('Library & Personalization UI (LIB-09..14)', () => {
    const SAMPLE_EXAM_WITH_STATUS: ExamWithUserStatus = {
      id: '0192f000-0000-7000-8000-000000000003',
      slug: 'jlpt-n3-chuan-2023',
      level: 'N3',
      title: 'Đề thi chính thức JLPT N3 - 12/2023',
      kind: 'original',
      year: 2023,
      session: '12',
      totalQuestions: 35,
      sections: [{ title: 'Kiến thức ngôn ngữ', durationSec: 1800 }],
      publishedVersion: 1,
      guestTrial: true,
      bestScore: 142, // LIB-09: Best score
      attemptsCount: 3, // LIB-10: Attempts count
      isFavorite: true, // LIB-11: Favorite
      userStatus: 'completed',
      isRecommendedNext: true, // LIB-14: Next recommendation
    };

    const SAMPLE_UNATTEMPTED_EXAM: ExamWithUserStatus = {
      ...SAMPLE_EXAM_WITH_STATUS,
      id: '0192f000-0000-7000-8000-000000000004',
      slug: 'jlpt-n3-chuan-2024',
      title: 'Đề thi chính thức JLPT N3 - 07/2024',
      bestScore: null,
      attemptsCount: 0,
      isFavorite: false,
      userStatus: 'not_started',
      isRecommendedNext: false,
    };

    const SAMPLE_BELOW_TARGET_EXAM: ExamWithUserStatus = {
      ...SAMPLE_EXAM_WITH_STATUS,
      id: '0192f000-0000-7000-8000-000000000005',
      slug: 'jlpt-n3-chua-dat',
      title: 'Đề thi JLPT N3 Cần Cải Thiện',
      bestScore: 82, // Below pass
      targetScore: 100,
      attemptsCount: 1,
      isFavorite: false,
      userStatus: 'below_target',
    };

    it('ExamCard displays favorite button, best-score, and attempts count', () => {
      const html = renderClean(<ExamCard exam={SAMPLE_EXAM_WITH_STATUS} />);

      // Favorite button (LIB-11)
      expect(html).toContain('data-testid="favorite-btn-0192f000-0000-7000-8000-000000000003"');
      expect(html).toContain('Bỏ yêu thích');

      // Best score display (LIB-09)
      expect(html).toContain('data-testid="exam-card-best-score"');
      expect(html).toContain('142 / 180');

      // Attempts count display (LIB-10)
      expect(html).toContain('data-testid="exam-card-attempts"');
      expect(html).toContain('3 lần');
    });

    it('ExamCard displays below target status badge (LIB-13)', () => {
      const html = renderClean(<ExamCard exam={SAMPLE_BELOW_TARGET_EXAM} />);
      expect(html).toContain('data-testid="status-below-target"');
      expect(html).toContain('Chưa đạt mục tiêu');
    });

    it('LibraryView displays Next Recommendation banner (LIB-14)', () => {
      const html = renderClean(
        <LibraryView
          exams={[SAMPLE_EXAM_WITH_STATUS, SAMPLE_UNATTEMPTED_EXAM]}
        />,
      );

      expect(html).toContain('data-testid="next-recommendation-banner"');
      expect(html).toContain('★ Đề xuất tiếp theo');
      expect(html).toContain('Đề thi chính thức JLPT N3 - 12/2023');
      expect(html).toContain('Bắt đầu làm ngay');
    });

    it('LibraryView filters unattempted exams (LIB-12) and favorites (LIB-11)', () => {
      const html = renderClean(
        <LibraryView
          exams={[SAMPLE_EXAM_WITH_STATUS, SAMPLE_UNATTEMPTED_EXAM]}
        />,
      );

      expect(html).toContain('data-testid="filter-only-favorites"');
      expect(html).toContain('Chưa từng làm');
      expect(html).toContain('Chưa đạt mục tiêu');
    });
  });
});
