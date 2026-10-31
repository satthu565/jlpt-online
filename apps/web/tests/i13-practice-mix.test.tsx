import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'mock-token-123' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/shared-exams/mock-token-123',
}));

import { Providers } from '../app/providers';
import PracticeAndMixPage from '../app/(practice)/luyen-tap/page';
import SharedExamPage from '../app/(share)/shared-exams/[token]/page';
import { PracticeRunner } from '../features/practice/components/practice-runner';
import { PracticeGenerator } from '../features/practice/components/practice-generator';
import { MixGenerator } from '../features/mix/components/mix-generator';
import { QuickMixCard } from '../features/mix/components/quick-mix-card';
import { GeneratedExamCard } from '../features/mix/components/generated-exam-card';
import { ShareExamModal } from '../features/mix/components/share-exam-modal';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';
import { translate, type Locale } from '../lib/i18n';

const h = React.createElement;

describe('I13: Real Practice & Mix Exams Integration Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Acceptance 1: Practice runner and generator integration', () => {
    it('renders practice generator with all pool options and target levels', () => {
      const html = renderToString(
        h(Providers, null, h(PracticeGenerator, { onGenerate: vi.fn() })),
      );

      // Verify pools exist
      expect(html).toContain('practice-pool-unseen');
      expect(html).toContain('practice-pool-wrong');
      expect(html).toContain('practice-pool-marked');
      expect(html).toContain('practice-pool-random');

      // Verify level selectors
      expect(html).toContain('practice-level-N1');
      expect(html).toContain('practice-level-N5');

      // Verify count slider and time limit select
      expect(html).toContain('practice-question-count-slider');
      expect(html).toContain('practice-time-limit-select');
    });

    it('renders PracticeRunner with real snapshot without hardcoded answer leaks', () => {
      const html = renderToString(
        h(Providers, null, h(PracticeRunner, { snapshot: SAMPLE_N5_EXAM_SNAPSHOT })),
      );

      expect(html).toContain('practice-runner-container');
      expect(html).toContain('practice-check-answer-btn');
      expect(html).toContain('data-testid="practice-option-1"');
      expect(html).toContain('data-testid="practice-option-2"');

      // Ensures no hardcoded mock explanation string leaks before user checks
      expect(html).not.toContain('Phương án 1 là câu trả lời chính xác dựa theo cấu trúc');
    });

    it('PracticeRunner handles empty sections gracefully', () => {
      const html = renderToString(
        h(
          Providers,
          null,
          h(PracticeRunner, {
            snapshot: {
              ...SAMPLE_N5_EXAM_SNAPSHOT,
              sections: [],
            },
          }),
        ),
      );

      expect(html).toContain('Không có câu hỏi trong đề luyện tập.');
    });

    it('PracticeRunner positions at first unanswered question when resuming with initialAnswers', () => {
      // In SAMPLE_N5_EXAM_SNAPSHOT, question 1 is index 0, question 2 is index 1
      const html = renderToString(
        h(
          Providers,
          null,
          h(PracticeRunner, {
            snapshot: SAMPLE_N5_EXAM_SNAPSHOT,
            initialAnswers: [2, 0],
            initialSeq: 1,
          }),
        ),
      );

      // Question 1 was answered (value 2), so runner should position at Question 2
      expect(html).toMatch(/Câu\s*(<!-- -->)?\s*2\s*(<!-- -->)?\s*\//);
    });
  });

  describe('Acceptance 2: Mixed exam generator and sharing', () => {
    it('renders mix generator with 7 algorithm modes', () => {
      const html = renderToString(
        h(Providers, null, h(MixGenerator, { onGenerate: vi.fn() })),
      );

      expect(html).toContain('mix-generator-form');
      expect(html).toContain('Ngẫu nhiên (Random)');
      expect(html).toContain('Cân bằng (Balanced)');
      expect(html).toContain('Điểm yếu (Weakness)');
      expect(html).toContain('Câu mới (Unseen)');
      expect(html).toContain('Thử thách (Challenge)');
      expect(html).toContain('Ôn tập (Revision)');
      expect(html).toContain('Tùy chỉnh (Custom)');
    });

    it('renders QuickMixCard with 1-click level options', () => {
      const html = renderToString(
        h(Providers, null, h(QuickMixCard, { onQuickMix: vi.fn() })),
      );

      expect(html).toContain('quick-mix-card');
      expect(html).toContain('quick-mix-level-N5');
      expect(html).toContain('quick-mix-level-N1');
      expect(html).toContain('quick-mix-submit-btn');
    });

    it('renders GeneratedExamCard with real examId links and share button', () => {
      const dummyExam = {
        id: '0192f000-0000-7000-8000-0000000000aa',
        examId: '0192f000-0000-7000-8000-0000000000bb',
        version: 1,
        seed: 424242,
        engineVersion: '1.0.0',
        configHash: 'hash-abc',
        selectionGroupIds: [],
        sourceSummary: { '2023-12': 10 },
        warnings: [],
        blueprintConformant: true,
      };

      const html = renderToString(
        h(Providers, null, h(GeneratedExamCard, { generatedExam: dummyExam, onRegenerate: vi.fn() })),
      );

      expect(html).toContain('generated-exam-card');
      expect(html).toContain('href="/phong-thi?examId=0192f000-0000-7000-8000-0000000000bb"');
      expect(html).toContain('share-exam-btn');
      expect(html).toContain('regenerate-exam-btn');
    });

    it('renders ShareExamModal without mock fallback strings', () => {
      const html = renderToString(
        h(
          Providers,
          null,
          h(ShareExamModal, {
            isOpen: true,
            examId: '0192f000-0000-7000-8000-0000000000bb',
            onClose: vi.fn(),
          }),
        ),
      );

      expect(html).toContain('share-exam-modal-content');
      expect(html).not.toContain('sh_0192f000');
    });
  });

  describe('Acceptance 3 & 4: Shared exam recipient page (/shared-exams/[token])', () => {
    it('renders shared exam page container with #main-content and responsive layout', () => {
      const html = renderToString(h(Providers, null, h(SharedExamPage)));

      expect(html).toContain('id="main-content"');
      expect(html).toContain('max-w-3xl');
      expect(html).toContain('shared-exam-loading');
    });
  });

  describe('Acceptance 6 & 7: Tri-locale i18n & Zero raw translation keys', () => {
    const locales: Locale[] = ['vi', 'ja', 'en'];
    const requiredKeys = [
      'practice.page.title',
      'practice.page.subtitle',
      'practice.tabs.practice',
      'practice.tabs.mix',
      'practice.tabs.quick',
      'practice.inProgress.title',
      'practice.inProgress.resume',
      'practice.shared.title',
      'practice.shared.start',
      'practice.shared.notFound',
      'practice.shared.backToPractice',
    ];

    it('verifies all required practice and shared keys exist in all 3 locales', () => {
      for (const loc of locales) {
        for (const key of requiredKeys) {
          const val = translate(loc, key);
          expect(val).toBeDefined();
          expect(val).not.toBe(key);
          expect(val.length).toBeGreaterThan(0);
        }
      }
    });

    it('renders PracticeAndMixPage without any raw translation keys in HTML output', () => {
      const html = renderToString(h(Providers, null, h(PracticeAndMixPage)));

      expect(html).not.toMatch(/practice\.\w+\.\w+/);
      expect(html).not.toMatch(/account\.profile\.\w+/);
      expect(html).toContain('id="main-content"');
    });

    it('renders PracticeAndMixPage with ExamHero gradient background and without countdown badge', () => {
      const html = renderToString(h(Providers, null, h(PracticeAndMixPage)));

      expect(html).toContain('from-sky-100');
      expect(html).not.toContain('/images/hero-jlpt-bg.webp');
      expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
      expect(html).toContain('data-testid="practice-page-container"');
    });
  });
});
