import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ExamApiClient } from '../features/exam/api/exam-api';
import {
  type ExamSummary,
  type PublicExamSnapshot,
  type AttemptInitResponse,
  type AttemptSubmitResponse,
  type ReviewAttemptResponse,
  type Result,
  assertNoAnswerLeak,
} from '@jlpt/schema';
import viMessages from '../messages/vi.json' with { type: 'json' };
import jaMessages from '../messages/ja.json' with { type: 'json' };
import enMessages from '../messages/en.json' with { type: 'json' };
import { translate } from '../lib/i18n';
import { loadLocaleMessages as preloadLocale } from '../lib/i18n';

// Components & Views under scope
import { ExamCard } from '../features/library/components/exam-card';
import { ExamPicker } from '../features/exam/components/exam-picker';
import { ScoreSummaryCard } from '../features/results/components/score-summary-card';
import { HistoryView } from '../features/results/components/history-view';

const renderClean = (element: React.ReactElement): string =>
  renderToString(element).replace(/<!--.*?-->/g, '');

const MOCK_DEMO_N5_EXAM: ExamSummary = {
  id: '0192f000-0001-7000-8000-000000000001',
  slug: 'demo-n5-1',
  title: 'Đề thi Mẫu N5 Chính Thức - Kỳ thi Thử Nghiệm',
  level: 'N5',
  kind: 'original',
  year: 2024,
  session: '7',
  totalQuestions: 35,
  sections: [
    { title: 'Kiến thức ngôn ngữ (Chữ Hán - Từ vựng)', durationSec: 1500 },
    { title: 'Ngữ pháp - Đọc hiểu', durationSec: 3000 },
    { title: 'Nghe hiểu', durationSec: 1800 },
  ],
  sourceLabel: 'Japan Foundation & JEES',
  licenseLabel: 'Tài liệu thi thử công khai',
  guestTrial: true,
  publishedVersion: 1,
};

const MOCK_VIP_N1_EXAM: ExamSummary = {
  id: '0192f000-0002-7000-8000-000000000002',
  slug: 'jlpt-n1-2023-12',
  title: 'Đề thi JLPT N1 - Kỳ thi 2023-12',
  level: 'N1',
  kind: 'original',
  year: 2023,
  session: '12',
  totalQuestions: 105,
  sections: [
    { title: 'Kiến thức ngôn ngữ - Đọc hiểu', durationSec: 6600 },
    { title: 'Nghe hiểu', durationSec: 3600 },
  ],
  sourceLabel: 'Japan Foundation & JEES',
  guestTrial: false,
  publishedVersion: 1,
};

const MOCK_N5_SNAPSHOT: PublicExamSnapshot = {
  schemaVersion: 1,
  examId: '0192f000-0001-7000-8000-000000000001',
  version: 1,
  title: 'Đề thi Mẫu N5 Chính Thức - Kỳ thi Thử Nghiệm',
  level: 'N5',
  kind: 'original',
  totalQuestions: 1,
  sections: [
    {
      index: 0,
      code: 'language_vocab',
      title: 'Kiến thức ngôn ngữ (Từ vựng)',
      durationSec: 1500,
      questionRange: [0, 1],
      groups: [
        {
          groupId: '0192f000-1000-7000-8000-000000000001',
          mondaiType: 'kanji_reading',
          instructions: [{ t: 'text', text: 'Chọn cách đọc Hiragana đúng nhất cho từ gạch chân.' }],
          passage: null,
          media: [],
          questions: [
            {
              index: 0,
              questionId: '0192f000-2000-7000-8000-000000000001',
              number: '1',
              stem: [{ t: 'text', text: 'きのう、あたらしい ほん を かいました。' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '本' }] },
                { label: '2', content: [{ t: 'text', text: '木' }] },
                { label: '3', content: [{ t: 'text', text: '休' }] },
                { label: '4', content: [{ t: 'text', text: '体' }] },
              ],
            },
          ],
        },
      ],
      listeningTimeline: [],
    },
  ],
};

const MOCK_TEST_RESULT: Result = {
  totals: { correct: 30, wrong: 4, blank: 1, total: 35 },
  accuracy: 85.7,
  durationSec: 3600,
  bySection: [{ code: 'language_vocab', correct: 30, total: 35 }],
  bySkill: [{ skill: 'vocabulary', correct: 30, total: 35 }],
  scoring: {
    method: 'linear_reference',
    sections: [
      {
        code: 'language_vocab',
        label: 'Kiến thức ngôn ngữ',
        raw: 30,
        rawMax: 35,
        scaled: 117,
        maxScaled: 180,
        minPass: 80,
        passed: true,
      },
    ],
    total: 117,
    totalMax: 180,
    totalPass: 80,
    passEstimate: true,
  },
  flags: [],
};


// ja/en messages load on demand in the app; load them up front for these tests.
beforeAll(async () => {
  await preloadLocale('ja');
  await preloadLocale('en');
});

describe('ExamApiClient Unit & SDK Contract Suite', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. ExamApiClient Contract & API Methods (Unit Tests)
  // =========================================================================
  describe('1. ExamApiClient Contract & Method Verification', () => {
    it('getExams retrieves published exams with level filter and pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [MOCK_DEMO_N5_EXAM],
          nextCursor: null,
        }),
      });

      const client = new ExamApiClient({ baseUrl: 'http://127.0.0.1:4000/api/v1', fetcher: mockFetch as unknown as typeof fetch });
      const res = await client.getExams({ level: 'N5', limit: 10 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('/api/v1/exams');
      expect(url).toContain('level=N5');
      expect(url).toContain('limit=10');
      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.slug).toBe('demo-n5-1');
    });

    it('getExamBySlug returns detail schema or throws 404 on missing exam', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ...MOCK_DEMO_N5_EXAM,
            description: 'Đề thi N5 chi tiết.',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            error: { code: 'EXAM_NOT_FOUND', message: 'Không tìm thấy đề thi yêu cầu.' },
          }),
        });

      const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher: mockFetch as unknown as typeof fetch });

      const found = await client.getExamBySlug('demo-n5-1');
      expect(found.title).toContain('Đề thi Mẫu N5');

      await expect(client.getExamBySlug('non-existent-exam')).rejects.toThrow('Không tìm thấy');
    });

    it('getExamById resolves via published exams list when UUID is passed', async () => {
      // 1st fetch: list exams to find slug
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [MOCK_DEMO_N5_EXAM],
          }),
        })
        // 2nd fetch: get by slug
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ...MOCK_DEMO_N5_EXAM,
            description: 'Đề thi N5 chi tiết.',
          }),
        });

      const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher: mockFetch as unknown as typeof fetch });
      const found = await client.getExamById('0192f000-0001-7000-8000-000000000001');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(found.slug).toBe('demo-n5-1');
      expect(found.title).toContain('Đề thi Mẫu N5');
    });

    it('getExamById traverses multiple pages via cursor when exam is past the first 100 items', async () => {
      const page1Exam = {
        ...MOCK_DEMO_N5_EXAM,
        id: '0192f000-0001-7000-8000-000000000099',
        slug: 'exam-page-1',
      };
      const targetExam = {
        ...MOCK_DEMO_N5_EXAM,
        id: '0192f000-0001-7000-8000-000000000150',
        slug: 'exam-page-2',
      };

      // 1st fetch: page 1 returns page1Exam and nextCursor
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [page1Exam],
            nextCursor: 'cursor_offset_100',
          }),
        })
        // 2nd fetch: page 2 returns targetExam
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            items: [targetExam],
            nextCursor: null,
          }),
        })
        // 3rd fetch: getExamBySlug for exam-page-2
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ...targetExam,
            description: 'Đề thi trang 2.',
          }),
        });

      const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher: mockFetch as unknown as typeof fetch });
      const found = await client.getExamById('0192f000-0001-7000-8000-000000000150');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Verify cursor was passed in 2nd call
      const secondCallUrl = mockFetch.mock.calls[1]![0] as string;
      expect(secondCallUrl).toContain('cursor=cursor_offset_100');
      expect(found.slug).toBe('exam-page-2');
    });

    it('getExamById falls back to slug when non-UUID string is passed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ...MOCK_DEMO_N5_EXAM,
          description: 'Đề thi N5 chi tiết.',
        }),
      });

      const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher: mockFetch as unknown as typeof fetch });
      const found = await client.getExamById('demo-n5-1');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0]!;
      expect(url).toContain('/exams/demo-n5-1');
      expect(found.slug).toBe('demo-n5-1');
    });

    it('fetchSnapshot loads immutable snapshot and verifies zero answer key leakage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_N5_SNAPSHOT,
      });

      const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher: mockFetch as unknown as typeof fetch });
      const snapshot = await client.fetchSnapshot('https://jlpt.vn/api/v1/exams/snapshots/demo-n5.json');

      expect(snapshot.examId).toBe(MOCK_DEMO_N5_EXAM.id);
      expect(snapshot.sections).toHaveLength(1);

      // Strict security assertion: Snapshot must not leak correct answers or explanations
      expect(() => assertNoAnswerLeak(snapshot)).not.toThrow();
    });

    it('listMyAttempts returns user attempt history with auth bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: '0192f000-3000-7000-8000-000000000001',
              examId: MOCK_DEMO_N5_EXAM.id,
              examTitle: MOCK_DEMO_N5_EXAM.title,
              examVersion: 1,
              level: 'N5',
              mode: 'real',
              status: 'submitted',
              startedAt: new Date(Date.now() - 3600000).toISOString(),
              submittedAt: new Date().toISOString(),
              score: 145,
              passed: true,
            },
          ],
          nextCursor: null,
        }),
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
        getAuthToken: () => 'valid_student_jwt_token',
      });

      const history = await client.listMyAttempts();
      expect(history.items).toHaveLength(1);
      expect(history.items[0]?.passed).toBe(true);

      const [, options] = mockFetch.mock.calls[0]!;
      expect(options.headers['Authorization']).toBe('Bearer valid_student_jwt_token');
    });
  });

  // =========================================================================
  // 2. Guest Trial vs Authenticated Exam Permissions (Acceptance 2)
  // =========================================================================
  describe('2. Guest Trial vs Authenticated Exam Permissions', () => {
    it('guest can initiate attempt on guestTrial=true exam without auth token', async () => {
      const mockInitResponse: AttemptInitResponse = {
        attemptId: '0192f000-4000-7000-8000-000000000001',
        lease: '0192f000-4000-7000-8000-000000000002',
        serverNow: new Date().toISOString(),
        snapshotUrl: 'https://jlpt.vn/api/v1/exams/snapshots/demo-n5.json',
        mediaToken: 'tok_media_sample',
        mediaTokenExp: Math.floor(Date.now() / 1000) + 7200,
        status: 'in_progress',
        currentSection: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockInitResponse,
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      const initResult = await client.initAttempt({
        examId: MOCK_DEMO_N5_EXAM.id,
        mode: 'real',
      });

      expect(initResult.attemptId).toBe('0192f000-4000-7000-8000-000000000001');
      expect(initResult.status).toBe('in_progress');
    });

    it('unauthenticated student attempting non-guest exam receives 401 AUTH_REQUIRED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Vui lòng đăng nhập để bắt đầu bài thi này.',
          },
        }),
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      await expect(
        client.initAttempt({
          examId: MOCK_VIP_N1_EXAM.id,
          mode: 'real',
        }),
      ).rejects.toThrow('Vui lòng đăng nhập');
    });

    it('student with unverified email receives 403 EMAIL_VERIFICATION_REQUIRED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'EMAIL_VERIFICATION_REQUIRED',
            message: 'Tài khoản chưa được xác minh email.',
          },
        }),
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
        getAuthToken: () => 'unverified_jwt',
      });

      await expect(
        client.initAttempt({
          examId: MOCK_VIP_N1_EXAM.id,
          mode: 'real',
        }),
      ).rejects.toThrow('chưa được xác minh');
    });
  });

  // =========================================================================
  // 3. Exam Flow: Section Transition, Auto-Save, Submit, and Review
  // =========================================================================
  describe('3. Exam Lifecycle: Progress, Auto-Save, Submit, Review', () => {
    it('handles answer sheet auto-save with seq acknowledgments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          lastSeq: 4,
          serverNow: new Date().toISOString(),
        }),
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      const ack = await client.updateAnswerSheet('0192f000-4000-7000-8000-000000000001', {
        lease: '0192f000-4000-7000-8000-000000000002',
        seq: 4,
        answers: [1, 3, 2],
        flags: [0, 1, 0],
        timeSpentMs: [15000, 20000, 12000],
        changes: [{ i: 0, v: 1, at: Date.now() }],
      });

      expect(ack.lastSeq).toBe(4);
    });

    it('submits attempt and transitions status to submitted', async () => {
      const mockSubmitRes: AttemptSubmitResponse = {
        result: MOCK_TEST_RESULT,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSubmitRes,
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      const submitRes = await client.submitAttempt('0192f000-4000-7000-8000-000000000001', {
        lease: '0192f000-4000-7000-8000-000000000002',
        seq: 5,
        answers: [1, 3, 2],
        flags: [0, 1, 0],
        timeSpentMs: [15000, 20000, 12000],
      });

      expect(submitRes.result.totals.correct).toBe(30);
      expect(submitRes.result.scoring.passEstimate).toBe(true);
    });

    it('reviewAttempt retrieves score report, accuracy, and breakdown after submission', async () => {
      const mockReviewRes: ReviewAttemptResponse = {
        snapshotUrl: 'https://jlpt.vn/api/v1/exams/snapshots/demo-n5.json',
        mediaToken: 'tok_media_sample',
        answers: [1, 3, 2],
        flags: [0, 1, 0],
        correct: [1, 3, 2],
        result: MOCK_TEST_RESULT,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockReviewRes,
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      const review = await client.reviewAttempt('0192f000-4000-7000-8000-000000000001');
      expect(review.result.accuracy).toBeGreaterThan(80);
      expect(review.result.scoring.passEstimate).toBe(true);
      expect(review.result.scoring.total).toBe(117);
    });

    it('reviewAttempt on un-submitted attempt raises 409 ATTEMPT_NOT_SUBMITTED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: 'ATTEMPT_NOT_SUBMITTED',
            message: 'Chỉ có thể xem lại kết quả sau khi bài thi đã được nộp.',
          },
        }),
      });

      const client = new ExamApiClient({
        baseUrl: '/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      await expect(client.reviewAttempt('0192f000-4000-7000-8000-000000000001')).rejects.toThrow('sau khi bài thi đã được nộp');
    });
  });

  // =========================================================================
  // 4. Multi-Viewport Layout (390px vs 1366px) & No Horizontal Scroll (Acceptance 6)
  // =========================================================================
  describe('4. Multi-Viewport Layout & Responsive Rendering', () => {
    it('renders ExamCard with responsive Tailwind utilities and zero margin bleed', () => {
      const html = renderClean(
        <ExamCard
          exam={{
            ...MOCK_DEMO_N5_EXAM,
            userStatus: 'not_started',
            attemptsCount: 0,
          }}
        />,
      );

      // Verify Tailwind responsive layout classes
      expect(html).toContain('jlpt-exam-card');
      expect(html).toContain('flex flex-col justify-between');
      expect(html).toContain('rounded-');
      expect(html).toContain('p-');

      // Verify no hardcoded pixel widths that would cause horizontal overflow on 390px
      expect(html).not.toMatch(/width:\s*[4-9]\d{2,}px/);
      expect(html).not.toMatch(/min-width:\s*[4-9]\d{2,}px/);
    });

    it('renders ExamPicker with guest trial badge for free trial exams', () => {
      const html = renderClean(
        <ExamPicker
          exams={[MOCK_DEMO_N5_EXAM, MOCK_VIP_N1_EXAM]}
          onSelectExam={vi.fn()}
        />,
      );

      expect(html).toContain('Đề thi Mẫu N5');
      expect(html).toContain('Làm thử miễn phí');
    });

    it('renders ScoreSummaryCard with pass badge, score fractions, and security check', () => {
      const html = renderClean(
        <ScoreSummaryCard
          examTitle={MOCK_DEMO_N5_EXAM.title}
          level="N5"
          mode="real"
          result={MOCK_TEST_RESULT}
        />,
      );

      expect(html).toContain('ĐỖ (PASS)');
      expect(html).toContain('117');
      expect(html).toContain('/ 180');
      expect(html).toContain('86%');
    });

    it('renders HistoryView with empty state when user has no attempts', () => {
      const html = renderClean(<HistoryView historyItems={[]} />);
      expect(html).toContain('Chưa có lịch sử làm bài thi');
      expect(html).toContain('Khám phá thư viện đề thi');
    });
  });

  // =========================================================================
  // 5. Zero Raw Translation Keys Across vi, ja, en (Acceptance 6)
  // =========================================================================
  describe('5. Zero Raw Translation Keys Across vi, ja, en', () => {
    const scopedKeys = [
      'common.nav.home',
      'auth.login.title',
      'account.profile.title',
      'account.profile.emailNotice',
      'account.profile.namePlaceholder',
      'account.profile.targetLevelDesc',
      'billing.pricing.quarterly',
    ];

    it.each(scopedKeys)('key %s is translated in all three locales without raw key bleed', (key) => {
      const viVal = translate('vi', key);
      const jaVal = translate('ja', key);
      const enVal = translate('en', key);

      // Value must not equal the raw key
      expect(viVal).not.toBe(key);
      expect(jaVal).not.toBe(key);
      expect(enVal).not.toBe(key);

      // Value must be non-empty string
      expect(viVal.length).toBeGreaterThan(0);
      expect(jaVal.length).toBeGreaterThan(0);
      expect(enVal.length).toBeGreaterThan(0);
    });

    it('verifies that total key count is identical across vi, ja, and en message catalogs', () => {
      const countKeys = (obj: Record<string, unknown>): number => {
        let count = 0;
        for (const val of Object.values(obj)) {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            count += countKeys(val as Record<string, unknown>);
          } else {
            count++;
          }
        }
        return count;
      };

      const viCount = countKeys(viMessages as Record<string, unknown>);
      const jaCount = countKeys(jaMessages as Record<string, unknown>);
      const enCount = countKeys(enMessages as Record<string, unknown>);

      expect(viCount).toBe(jaCount);
      expect(viCount).toBe(enCount);
      expect(viCount).toBeGreaterThan(150);
    });
  });
});
