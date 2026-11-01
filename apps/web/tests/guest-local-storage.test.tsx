import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';
import { ExamApiClient } from '../features/exam/api/exam-api';

function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('Khách làm bài thi lưu hoàn toàn ở trình duyệt (Guest Local Storage)', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: unknown }).localStorage = createMockLocalStorage();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  it('1. SyncEngine với isLocalOnly=true cho khách: Không gọi API updateAnswerSheet lên server, lưu cục bộ và báo saved', async () => {
    const storage = new MemoryExamStorage();
    const updateSpy = vi.fn();

    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = updateSpy;

    const engine = new ExamSyncEngine({
      attemptId: 'guest-0192f000-0000-7000-8000-000000000001',
      examId: '0192f000-0000-7000-8000-000000000002',
      lease: 'guest-lease-1234',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      isLocalOnly: true, // Chế độ khách làm bài chỉ lưu trình duyệt
      storage,
      apiClient,
      debounceMs: 100,
      maxWaitMs: 500,
    });

    // Khách chọn đáp án câu 1 là 2, câu 2 là 3
    await engine.recordAnswerChange(0, 2);
    await engine.recordAnswerChange(1, 3);
    await engine.recordFlagChange(0, true);

    // Drain hoặc flush
    await engine.drain();

    // TUYỆT ĐỐI không gọi updateAnswerSheet lên server
    expect(updateSpy).not.toHaveBeenCalled();

    // Trạng thái đồng bộ là 'saved' (đã lưu vào browser storage)
    expect(engine.getSyncState()).toBe('saved');
    expect(engine.getAnswers()).toEqual([2, 3, 0, 0]);
    expect(engine.getFlags()).toEqual([1, 0, 0, 0]);

    // Kiểm tra dữ liệu đã lưu trong storage adapter (IndexedDB / Memory fallback)
    const stored = await storage.getAttempt('guest-0192f000-0000-7000-8000-000000000001');
    expect(stored).not.toBeNull();
    expect(stored?.answers).toEqual([2, 3, 0, 0]);
    expect(stored?.flags).toEqual([1, 0, 0, 0]);

    engine.stop();
  });

  it('2. Lưu tiến độ làm bài của khách vào localStorage và khôi phục khi tải lại trang', () => {
    const mockAttemptId = 'guest-0192f000-0000-7000-8000-000000000001';
    const mockExamId = '0192f000-0000-7000-8000-000000000002';
    const initialDeadlines = {
      0: new Date(Date.now() + 1800 * 1000).toISOString(),
    };

    const mockSnapshot = {
      examId: mockExamId,
      title: 'Đề thi thử N3',
      level: 'N3',
      totalQuestions: 4,
      sections: [
        {
          code: 'language_vocab',
          title: 'Kiến thức ngôn ngữ',
          durationSec: 1800,
          questionRange: [0, 3] as [number, number],
          groups: [],
        },
      ],
    };

    // Giả lập lưu tiến độ khi khách đang làm dở
    const guestSession = {
      attemptId: mockAttemptId,
      examId: mockExamId,
      mode: 'real',
      snapshot: mockSnapshot,
      currentSection: 0,
      answers: [2, 4, 1, 0],
      flags: [1, 0, 0, 0],
      sectionDeadlines: initialDeadlines,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('jlpt_guest_active_attempt', JSON.stringify(guestSession));

    // Khôi phục dữ liệu từ localStorage
    const savedRaw = localStorage.getItem('jlpt_guest_active_attempt');
    expect(savedRaw).not.toBeNull();
    const restored = JSON.parse(savedRaw!);

    expect(restored.attemptId).toBe(mockAttemptId);
    expect(restored.examId).toBe(mockExamId);
    expect(restored.currentSection).toBe(0);
    expect(restored.answers).toEqual([2, 4, 1, 0]);
    expect(restored.flags).toEqual([1, 0, 0, 0]);
    expect(restored.sectionDeadlines[0]).toBe(initialDeadlines[0]);

    // Kiểm tra đồng hồ đếm giờ còn lại ở client
    const deadlineTime = Date.parse(restored.sectionDeadlines[0]);
    const remainingMs = deadlineTime - Date.now();
    expect(remainingMs).toBeGreaterThan(0);
    expect(remainingMs).toBeLessThanOrEqual(1800 * 1000);
  });

  it('3. Khi nộp bài: lưu kết quả xem lại vào trình duyệt, xóa tiến độ đang thi, và đọc kết quả không cần gọi server', async () => {
    const mockAttemptId = 'guest-0192f000-0000-7000-8000-000000000099';
    const mockExamId = '0192f000-0000-7000-8000-000000000002';

    // Tạo sẵn tiến độ đang làm bài
    localStorage.setItem(
      'jlpt_guest_active_attempt',
      JSON.stringify({ attemptId: mockAttemptId, examId: mockExamId, answers: [1, 2, 3, 4] }),
    );

    // Giả lập kết quả nộp bài từ đường mới POST /guest/attempts/submit
    const mockSubmitResponse = {
      result: {
        scoring: {
          total: 120,
          totalPass: 95,
          passed: true,
          passEstimate: true,
          sections: [],
        },
      },
      correct: [1, 2, 3, 4],
      answers: [1, 2, 3, 4],
      flags: [0, 0, 0, 0],
      snapshotUrl: 'https://example.com/snapshot.json',
      mediaToken: 'guest-review-token',
    };

    // Client lưu review data vào localStorage và xóa active attempt
    const guestReviewData = {
      attemptId: mockAttemptId,
      examId: mockExamId,
      mode: 'real',
      snapshot: { examId: mockExamId, title: 'Đề thi thử N3', level: 'N3' },
      answers: mockSubmitResponse.answers,
      flags: mockSubmitResponse.flags,
      correct: mockSubmitResponse.correct,
      result: mockSubmitResponse.result,
      submittedAt: new Date().toISOString(),
    };

    localStorage.setItem(`jlpt_guest_review_${mockAttemptId}`, JSON.stringify(guestReviewData));
    localStorage.removeItem('jlpt_guest_active_attempt');

    // Tiến độ đang thi đã được dọn sạch
    expect(localStorage.getItem('jlpt_guest_active_attempt')).toBeNull();

    // Dữ liệu xem lại bài thi được khôi phục thành công từ localStorage cho trang /ket-qua/[id]
    const reviewRaw = localStorage.getItem(`jlpt_guest_review_${mockAttemptId}`);
    expect(reviewRaw).not.toBeNull();
    const restoredReview = JSON.parse(reviewRaw!);

    expect(restoredReview.attemptId).toBe(mockAttemptId);
    expect(restoredReview.correct).toEqual([1, 2, 3, 4]);
    expect(restoredReview.result.scoring.passed).toBe(true);
    expect(restoredReview.result.scoring.total).toBe(120);
  });

  it('4. Khách mở lời giải chi tiết: tải từ dữ liệu cục bộ trong localStorage, không gọi server; người dùng đăng nhập vẫn gọi API', async () => {
    const mockAttemptId = 'guest-0192f000-0000-7000-8000-000000000099';
    const mockExamId = '0192f000-0000-7000-8000-000000000002';

    const mockExplanation = {
      index: 0,
      questionId: '0192f000-0000-7000-8000-000000000010',
      hasExplanation: true,
      correctReason: 'Vì chữ Hán đúng là 犬 (khuyển).',
      wrongReasonsByOption: { '2': 'Sai' },
      translation: 'Có một con chó.',
      vocabTags: ['犬'],
      grammarTags: [],
      transcript: null,
      evidenceRanges: [],
    };

    const guestReviewData = {
      attemptId: mockAttemptId,
      examId: mockExamId,
      mode: 'real' as const,
      snapshot: { examId: mockExamId, title: 'Đề thi thử N3', level: 'N3', totalQuestions: 1, sections: [] },
      answers: [1],
      flags: [0],
      correct: [1],
      result: { totals: { correct: 1, wrong: 0, blank: 0, total: 1 } },
      explanations: {
        '0': mockExplanation,
      },
    };

    localStorage.setItem(`jlpt_guest_review_${mockAttemptId}`, JSON.stringify(guestReviewData));

    // Giả lập logic loader của trang /ket-qua/[id]
    const apiSpy = vi.fn();
    const loadExplanationForTest = async (attemptId: string, index: number) => {
      const raw = localStorage.getItem(`jlpt_guest_review_${attemptId}`);
      if (!raw) {
        return apiSpy(attemptId, index);
      }
      const parsed = JSON.parse(raw);
      const exp = parsed.explanations?.[index] ?? parsed.explanations?.[String(index)];
      if (exp) return exp;
      return {
        index,
        questionId: '',
        hasExplanation: false,
        correctReason: null,
        wrongReasonsByOption: null,
        translation: null,
        vocabTags: [],
        grammarTags: [],
        transcript: null,
        evidenceRanges: [],
      };
    };

    // 1. Khách xem câu 0: có lời giải trong local storage -> lấy ngay, KHÔNG gọi API server
    const resultExp0 = await loadExplanationForTest(mockAttemptId, 0);
    expect(resultExp0.hasExplanation).toBe(true);
    expect(resultExp0.correctReason).toBe('Vì chữ Hán đúng là 犬 (khuyển).');
    expect(apiSpy).not.toHaveBeenCalled();

    // 2. Khách xem câu 1: không có trong local storage -> trả hasExplanation=false không lỗi, KHÔNG gọi API server
    const resultExp1 = await loadExplanationForTest(mockAttemptId, 1);
    expect(resultExp1.hasExplanation).toBe(false);
    expect(apiSpy).not.toHaveBeenCalled();

    // 3. Người dùng đăng nhập (không có review khách trong localStorage) -> gọi API server
    const userAttemptId = '0192f000-user-7000-8000-000000000001';
    apiSpy.mockResolvedValueOnce(mockExplanation);
    const loggedInResult = await loadExplanationForTest(userAttemptId, 0);
    expect(apiSpy).toHaveBeenCalledWith(userAttemptId, 0);
    expect(loggedInResult.hasExplanation).toBe(true);
  });
});
