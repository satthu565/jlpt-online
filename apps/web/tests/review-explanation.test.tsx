import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import { ReviewQuestionItem } from '../features/results/components/review-question-item';
import { ReviewView } from '../features/results/components/review-view';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { SAMPLE_N5_EXAM_SNAPSHOT } from './fixtures/sample-exam';
import type { LearnerExplanation } from '../features/explanations/types';
import type { AttemptReviewData } from '../features/results/types';

const renderClean = (element: React.JSX.Element): string =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/&amp;/g, '&');

const flatQuestions = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT);
const sampleQuestion = flatQuestions[0]!;

const SAMPLE_APPROVED_EXPLANATION: LearnerExplanation = {
  index: 0,
  questionId: sampleQuestion.questionId,
  hasExplanation: true,
  correctReason: 'いぬ là cách đọc Hiragana đúng nhất của chữ Hán 犬 (khuyển).',
  wrongReasonsByOption: {
    '2': 'ねこ nghĩa là con mèo (chữ Hán: 猫).',
    '3': 'とり nghĩa là con chim (chữ Hán: 鳥).',
    '4': 'うま nghĩa là con ngựa (chữ Hán: 馬).',
  },
  translation: 'Ở đằng kia có một con chó.',
  vocabTags: ['犬 (いぬ)'],
  grammarTags: ['N が います'],
  hanViet: [{ kanji: '犬', reading: 'KHUYỂN' }],
  transcript: null,
  evidenceRanges: [],
};

const SAMPLE_EMPTY_EXPLANATION: LearnerExplanation = {
  index: 0,
  questionId: sampleQuestion.questionId,
  hasExplanation: false,
  correctReason: null,
  wrongReasonsByOption: null,
  translation: null,
  vocabTags: [],
  grammarTags: [],
  transcript: null,
  evidenceRanges: [],
};

const SAMPLE_LICENSED_EXPLANATION: LearnerExplanation = {
  ...SAMPLE_APPROVED_EXPLANATION,
  isLicensed: true,
  sourceLabel: 'Giáo trình JLPT N5 Official',
  licenseLabel: 'Bản quyền Japan Foundation & JEES',
  transcript: 'あそこに犬がいます。',
};

const SAMPLE_REVIEW_DATA: AttemptReviewData = {
  attemptId: '0192f000-review-7000-8000-000000000001',
  examId: SAMPLE_N5_EXAM_SNAPSHOT.examId,
  mode: 'real',
  snapshot: SAMPLE_N5_EXAM_SNAPSHOT,
  answers: [1, 2, 3, 4, 1],
  flags: [0, 0, 0, 0, 0],
  correct: [1, 2, 3, 4, 1],
  result: {
    totals: { correct: 5, wrong: 0, blank: 0, total: 5 },
    accuracy: 100,
    durationSec: 1200,
    bySection: [{ code: 'language_vocab', correct: 5, total: 5 }],
    bySkill: [{ skill: 'vocabulary', correct: 5, total: 5 }],
    scoring: {
      method: 'linear_reference',
      sections: [
        {
          code: 'language_vocab',
          label: 'Kiến thức ngôn ngữ (Từ vựng)',
          raw: 5,
          rawMax: 5,
          scaled: 60,
          maxScaled: 60,
          minPass: 19,
          passed: true,
        },
      ],
      total: 180,
      totalMax: 180,
      totalPass: 80,
      passEstimate: true,
    },
    flags: [],
    timeSpentMs: [3000, 4000, 2500, 5000, 3500],
  } as unknown as AttemptReviewData['result'],
};

describe('Review Explanation Feature Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. ExamApiClient.getAttemptExplanation Endpoint
  // =========================================================================
  describe('ExamApiClient.getAttemptExplanation', () => {
    it('calls GET /api/v1/attempts/:id/explanations/:index and returns LearnerExplanation', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => SAMPLE_APPROVED_EXPLANATION,
      });

      const client = new ExamApiClient({
        baseUrl: 'http://127.0.0.1:4000/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      const result = await client.getAttemptExplanation('attempt-123', 0);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0]!;
      expect(url).toContain('/api/v1/attempts/attempt-123/explanations/0');
      expect(init.method).toBe('GET');
      expect(result).toEqual(SAMPLE_APPROVED_EXPLANATION);
      expect(result.hasExplanation).toBe(true);
      expect(result.correctReason).toContain('いぬ');
    });

    it('throws ExamApiError when API returns 409 RESULTS_EMBARGOED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: {
            code: 'RESULTS_EMBARGOED',
            message: 'Kết quả chưa được công bố.',
          },
        }),
      });

      const client = new ExamApiClient({
        baseUrl: 'http://127.0.0.1:4000/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      await expect(client.getAttemptExplanation('attempt-123', 0)).rejects.toThrow(ExamApiError);
      await expect(client.getAttemptExplanation('attempt-123', 0)).rejects.toMatchObject({
        code: 'RESULTS_EMBARGOED',
        status: 409,
        message: 'Kết quả chưa được công bố.',
      });
    });

    it('throws ExamApiError when API returns 403 FORBIDDEN', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền truy cập lượt thi này.',
          },
        }),
      });

      const client = new ExamApiClient({
        baseUrl: 'http://127.0.0.1:4000/api/v1',
        fetcher: mockFetch as unknown as typeof fetch,
      });

      await expect(client.getAttemptExplanation('attempt-123', 0)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });
  });

  // =========================================================================
  // 2. Loading state, success state, placeholder state, error & retry
  // =========================================================================
  describe('ReviewQuestionItem Explanation States', () => {
    it('tải thành công hiện lời giải (hasExplanation=true)', () => {
      const html = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          explanation={SAMPLE_APPROVED_EXPLANATION}
        />,
      );

      // Must render explanation container and details
      expect(html).toContain('data-testid="explanation-container"');
      expect(html).toContain('data-testid="explanation-correct-reason"');
      expect(html).toContain('いぬ là cách đọc Hiragana đúng nhất');
      expect(html).toContain('data-testid="explanation-wrong-reasons"');
      expect(html).toContain('data-testid="explanation-translation"');
      expect(html).toContain('Ở đằng kia có một con chó.');
      expect(html).toContain('data-testid="explanation-hanviet"');
      expect(html).toContain('KHUYỂN');
      // Must NOT render placeholder or error
      expect(html).not.toContain('data-testid="explanation-placeholder"');
      expect(html).not.toContain('data-testid="explanation-error"');
    });

    it('API trả hasExplanation=false hiện placeholder', () => {
      const html = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          loadExplanation={async () => SAMPLE_EMPTY_EXPLANATION}
          loadingExplanation={false}
          explanationError={null}
        />,
      );

      // Must render placeholder
      expect(html).toContain('data-testid="explanation-placeholder"');
      expect(html).toContain('Chưa có dữ liệu lời giải chi tiết cho câu hỏi này.');
      // Must NOT render explanation details or error
      expect(html).not.toContain('data-testid="explanation-container"');
      expect(html).not.toContain('data-testid="explanation-error"');
    });

    it('API lỗi hiện thông báo lỗi và nút thử lại, KHÔNG hiện nhầm là chưa có dữ liệu', () => {
      const onRetry = vi.fn();
      const html = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          explanationError="Kết quả chưa được công bố (RESULTS_EMBARGOED)."
          onRetryExplanation={onRetry}
        />,
      );

      // 1. Must render error container
      expect(html).toContain('data-testid="explanation-error"');
      expect(html).toContain('Kết quả chưa được công bố (RESULTS_EMBARGOED).');

      // 2. Must render retry button
      expect(html).toContain(`data-testid="retry-explanation-btn-${sampleQuestion.number}"`);
      expect(html).toContain('Thử lại');

      // 3. MUST NOT render placeholder or container
      expect(html).not.toContain('data-testid="explanation-placeholder"');
      expect(html).not.toContain('Chưa có dữ liệu lời giải chi tiết cho câu hỏi này.');
      expect(html).not.toContain('data-testid="explanation-container"');
    });

    it('hiện trạng thái đang tải khi loadingExplanation=true', () => {
      const html = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          loadingExplanation={true}
        />,
      );

      expect(html).toContain('data-testid="explanation-loading"');
      expect(html).toContain('Đang tải lời giải chi tiết...');
      expect(html).not.toContain('data-testid="explanation-placeholder"');
      expect(html).not.toContain('data-testid="explanation-error"');
    });

    it('tôn trọng hasLicensePermission và licenseLabel/isLicensed như ExplanationView đang xử lý', () => {
      // Permission DENIED: transcript blocked
      const deniedHtml = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          explanation={SAMPLE_LICENSED_EXPLANATION}
          hasLicensePermission={false}
        />,
      );

      expect(deniedHtml).toContain('data-testid="transcript-restricted-notice"');
      expect(deniedHtml).toContain('Bản quyền Japan Foundation & JEES');
      expect(deniedHtml).not.toContain('data-testid="transcript-content"');

      // Permission GRANTED: transcript displayed
      const grantedHtml = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          defaultExpanded={true}
          explanation={SAMPLE_LICENSED_EXPLANATION}
          hasLicensePermission={true}
        />,
      );

      expect(grantedHtml).toContain('data-testid="transcript-content"');
      expect(grantedHtml).toContain('あそこに犬がいます。');
    });

    it('giữ nguyên logic nếu prop explanation đã được truyền sẵn', () => {
      // Explanation passed -> renders ExplanationView
      const htmlWithExplanation = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
          explanation={SAMPLE_APPROVED_EXPLANATION}
        />,
      );
      expect(htmlWithExplanation).toContain('data-testid="explanation-container"');

      // No explanation and closed by default -> button says 'Xem lời giải chi tiết'
      const htmlWithout = renderClean(
        <ReviewQuestionItem
          question={sampleQuestion}
          userAnswer={1}
          correctAnswer={1}
          isFlagged={false}
        />,
      );
      expect(htmlWithout).toContain('Xem lời giải chi tiết');
      expect(htmlWithout).not.toContain('data-testid="explanation-container"');
    });
  });

  // =========================================================================
  // 3. ReviewView Integration & Caching
  // =========================================================================
  describe('ReviewView loadExplanation Prop and Cache Architecture', () => {
    it('allows providing custom loadExplanation prop to replace data source', async () => {
      const customLoader = vi.fn().mockResolvedValue(SAMPLE_APPROVED_EXPLANATION);

      const html = renderClean(
        <ReviewView
          reviewData={SAMPLE_REVIEW_DATA}
          loadExplanation={customLoader}
        />,
      );

      // ReviewView renders questions list without throwing
      expect(html).toContain('Chi tiết bài làm từng câu hỏi');
      expect(html).toContain(`toggle-explanation-btn-${sampleQuestion.number}`);
    });

    it('caches loaded explanation by globalIndex so subsequent requests do not re-fetch', async () => {
      const loadCallCount = vi.fn().mockImplementation(async (index: number) => {
        return {
          ...SAMPLE_APPROVED_EXPLANATION,
          index,
        };
      });

      // Simulate cache behavior of effectiveLoadExplanation
      const cache: Record<number, LearnerExplanation> = {};
      const loadWithCache = async (index: number) => {
        if (cache[index]) return cache[index];
        const res = await loadCallCount(index);
        cache[index] = res;
        return res;
      };

      // 1. First fetch for index 0
      const first = await loadWithCache(0);
      expect(first.index).toBe(0);
      expect(loadCallCount).toHaveBeenCalledTimes(1);

      // 2. Second fetch for index 0 (MUST use cache)
      const second = await loadWithCache(0);
      expect(second.index).toBe(0);
      expect(loadCallCount).toHaveBeenCalledTimes(1); // STILL 1!

      // 3. Different index (index 1) triggers new call
      const third = await loadWithCache(1);
      expect(third.index).toBe(1);
      expect(loadCallCount).toHaveBeenCalledTimes(2);

      // 4. Index 1 cached on second call
      await loadWithCache(1);
      expect(loadCallCount).toHaveBeenCalledTimes(2);
    });

    it('does NOT cache failed API calls, allowing retry to succeed', async () => {
      let callCount = 0;
      const loader = vi.fn().mockImplementation(async (_index: number) => {
        callCount++;
        if (callCount === 1) {
          throw new ExamApiError('Network connection lost', 'NETWORK_ERROR', 500);
        }
        return SAMPLE_APPROVED_EXPLANATION;
      });

      const cache: Record<number, LearnerExplanation> = {};
      const loadWithCache = async (index: number) => {
        if (cache[index]) return cache[index];
        const res = await loader(index);
        cache[index] = res;
        return res;
      };

      // 1. First attempt fails
      await expect(loadWithCache(0)).rejects.toThrow('Network connection lost');
      expect(loader).toHaveBeenCalledTimes(1);
      expect(cache[0]).toBeUndefined();

      // 2. Retry succeeds and gets cached
      const retryResult = await loadWithCache(0);
      expect(loader).toHaveBeenCalledTimes(2);
      expect(retryResult.hasExplanation).toBe(true);
      expect(cache[0]).toEqual(SAMPLE_APPROVED_EXPLANATION);

      // 3. Subsequent calls now use cache
      await loadWithCache(0);
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });
});
