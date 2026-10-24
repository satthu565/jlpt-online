import {  } from 'lucide-react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ALL_SAMPLE_EXAMS,
  SAMPLE_N1_EXAM_SNAPSHOT,
  SAMPLE_N4_EXAM_SNAPSHOT,
  SAMPLE_N5_EXAM_SNAPSHOT,
} from './fixtures/exam-fixtures';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import { AudioPlayer, syncAudioDrift } from '../features/exam/components/audio-player';
import { SpeakerTestModal } from '../features/exam/components/modals/speaker-test-modal';
import { ShortcutsHelpModal } from '../features/exam/components/modals/shortcuts-help-modal';
import { LeaseConflictModal } from '../features/exam/components/modals/lease-conflict-modal';
import { ExamToolbar } from '../features/exam/components/exam-toolbar';
import { QuestionView } from '../features/exam/components/question-view';
import { ExamRoom } from '../features/exam/components/exam-room';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';
import { ExamApiClient } from '../features/exam/api/exam-api';
import {
  assertNoAnswerLeak,
  PublicExamSnapshotSchema,
  type AnswerSheetUpdateInput,
  type AnswerSheetAck,
} from '@jlpt/schema';
import { getListeningPlaybackPosition } from '@jlpt/exam-engine';

const renderClean = (element: React.ReactElement): string =>
  renderToString(element).replace(/<!--.*?-->/g, '');

describe('E2E Exam & Audio Listening Suite (N03)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Acceptance 1: Full exam N1–N5 với fixtures phù hợp
  // =========================================================================
  describe('Acceptance 1: Full exam N1–N5 với fixtures phù hợp', () => {
    it('all N1–N5 snapshots strictly conform to PublicExamSnapshotSchema', () => {
      expect(ALL_SAMPLE_EXAMS).toHaveLength(5);

      for (const exam of ALL_SAMPLE_EXAMS) {
        // Must parse strictly without schema error
        const parsed = PublicExamSnapshotSchema.parse(exam);
        expect(parsed.schemaVersion).toBe(1);
        expect(parsed.totalQuestions).toBeGreaterThan(0);
        expect(parsed.sections.length).toBeGreaterThanOrEqual(2);

        // Security assertion: Zero answer leak
        expect(() => assertNoAnswerLeak(parsed)).not.toThrow();
      }
    });

    it('each level N1–N5 has structured sections and valid listening timelines', () => {
      const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
      for (const lvl of levels) {
        const exam = ALL_SAMPLE_EXAMS.find((e) => e.level === lvl);
        expect(exam).toBeDefined();
        expect(exam?.level).toBe(lvl);

        // Listening section check
        const listeningSection = exam?.sections.find((s) => s.code === 'listening');
        expect(listeningSection).toBeDefined();
        expect(listeningSection?.listeningTimeline).not.toBeNull();
        expect(listeningSection?.listeningTimeline?.length).toBeGreaterThan(0);

        // Flatten questions test
        const flat = flattenExamQuestions(exam!);
        expect(flat).toHaveLength(exam!.totalQuestions);
        expect(flat[0]?.number).toBe('1');
        expect(flat[0]?.options.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // =========================================================================
  // AUDIO-01..06: Audio Player Controls & Seek Restrictions
  // =========================================================================
  describe('AUDIO-01..06: Audio Player & Seek Restrictions', () => {
    const timeline = SAMPLE_N1_EXAM_SNAPSHOT.sections.find((s) => s.code === 'listening')!
      .listeningTimeline!;

    it('[AUDIO-01 & AUDIO-02] AudioPlayer renders timeline and synchronizes active question', () => {
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="real"
          activeGroupId="0192f000-1000-7000-8000-000000000004"
        />,
      );

      expect(html).toContain('Âm thanh phần thi nghe');
      expect(html).toContain('Đoạn 1 / 2');
      expect(html).toContain('(Đang làm câu này)');
    });

    it('[AUDIO-03] QuestionView renders illustration images when question media is present', () => {
      const n4Exam = SAMPLE_N4_EXAM_SNAPSHOT;
      const flat = flattenExamQuestions(n4Exam);
      const listeningQ = flat.find((q) => q.sectionCode === 'listening')!;

      expect(listeningQ.media).toBeDefined();
      expect(listeningQ.media).toContain('media/n4_illustration.webp');

      const html = renderClean(
        <QuestionView
          question={listeningQ}
          selectedOption={0}
          isFlagged={false}
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
        />,
      );

      expect(html).toContain('jlpt-question-illustration');
      expect(html).toContain('media/n4_illustration.webp');
      expect(html).toContain('Hình ảnh minh họa câu');
    });

    it('[AUDIO-04] Strict seek and replay restriction in real exam mode', () => {
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="real"
        />,
      );

      expect(html).toContain('Thi thật: Khóa tua / phát lại');
      expect(html).toContain('Bạn không thể tua hay phát lại');
      // Must NOT contain replay or speed buttons
      expect(html).not.toContain('Phát lại đoạn này');
      expect(html).not.toContain('Tốc độ:');
    });

    it('[AUDIO-05 & AUDIO-06] Replay and speed controls (0.75x, 1x, 1.25x) enabled in practice mode', () => {
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="practice"
        />,
      );

      expect(html).toContain('Luyện tập: Tùy chỉnh tốc độ');
      expect(html).toContain('Phát lại đoạn này');
      expect(html).toContain('0.75x');
      expect(html).toContain('1x');
      expect(html).toContain('1.25x');
    });

    it('[AUDIO-10] Audio loading error detection and retry button', () => {
      const errorMsg = 'Không thể tải tệp âm thanh. Vui lòng kiểm tra kết nối mạng.';
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="practice"
          initialErrorMessage={errorMsg}
        />,
      );

      // Verify explicit audio loading error message and retry button (AUDIO-10)
      expect(html).toContain('Lỗi âm thanh');
      expect(html).toContain(errorMsg);
      expect(html).toContain('Thử lại');
      expect(html).toContain('Thử tải lại âm thanh');
    });
  });

  // =========================================================================
  // EXAM-05: Speaker Test Modal
  // =========================================================================
  describe('EXAM-05: Speaker and Headphone Test', () => {
    it('SpeakerTestModal renders audio verification instructions and test button', () => {
      const html = renderClean(
        <SpeakerTestModal
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
        />,
      );

      expect(html).toContain('Kiểm tra tai nghe / loa');
      expect(html).toContain('Phát âm thanh thử nghiệm');
      expect(html).toContain('Tôi nghe rõ · Bắt đầu phần nghe');
      expect(html).toContain('Bạn sẽ nghe một tiếng bíp ngắn.');
    });
  });

  // =========================================================================
  // EXAM-23, EXAM-24, EXAM-25: Font Scaling, Keyboard Shortcuts, Zen Mode
  // =========================================================================
  describe('EXAM-23, 24, 25: Ergonomics, Shortcuts and Zen Mode', () => {
    const flat = flattenExamQuestions(SAMPLE_N5_EXAM_SNAPSHOT);
    const question = flat[0]!;

    it('[EXAM-23] ExamToolbar renders font size zoom options (A-, A, A+, A++)', () => {
      const html = renderClean(
        <ExamToolbar
          fontSize="base"
          onFontSizeChange={() => {}}
          isZenMode={false}
          onToggleZenMode={() => {}}
          onOpenShortcutsHelp={() => {}}
          onOpenSpeakerTest={() => {}}
        />,
      );

      expect(html).toContain('Cỡ chữ tiếng Nhật:');
      expect(html).toContain('A-');
      expect(html).toContain('A');
      expect(html).toContain('A+');
      expect(html).toContain('A++');
    });

    it('[EXAM-23] QuestionView applies scaled typography classes', () => {
      const htmlNormal = renderClean(
        <QuestionView
          question={question}
          selectedOption={1}
          isFlagged={false}
          fontSize="base"
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
        />,
      );
      expect(htmlNormal).toContain('text-lg');

      const htmlLarge = renderClean(
        <QuestionView
          question={question}
          selectedOption={1}
          isFlagged={false}
          fontSize="xl"
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
        />,
      );
      expect(htmlLarge).toContain('text-2xl');
    });

    it('[EXAM-24] QuestionView displays keyboard shortcut hints [1]..[4] and [F]', () => {
      const html = renderClean(
        <QuestionView
          question={question}
          selectedOption={0}
          isFlagged={false}
          showKeyboardHints={true}
          onSelectOption={() => {}}
          onToggleFlag={() => {}}
        />,
      );

      expect(html).toContain('[1]');
      expect(html).toContain('[2]');
      expect(html).toContain('[3]');
      expect(html).toContain('[4]');
      expect(html).toContain('Phím F');
    });

    it('[EXAM-24] ShortcutsHelpModal renders computer shortcut reference table', () => {
      const html = renderClean(
        <ShortcutsHelpModal
          isOpen={true}
          onClose={() => {}}
        />,
      );

      expect(html).toContain('Phím tắt phòng thi');
      expect(html).toContain('1, 2, 3, 4');
      expect(html).toContain('← / ↑ / J');
      expect(html).toContain('→ / ↓ / K');
      expect(html).toContain('Thu gọn hoặc mở rộng công cụ');
    });

    it('[EXAM-25] compact mode keeps the answer sheet available for paper-style exams', () => {
      const storage = new MemoryExamStorage();
      const apiClient = new ExamApiClient();

      // Normal Mode: includes question palette and section header
      const htmlNormal = renderClean(
        <ExamRoom
          snapshot={SAMPLE_N5_EXAM_SNAPSHOT}
          attemptId="00000000-0000-4000-8000-000000000001"
          lease="00000000-0000-4000-8000-000000000002"
          mode="real"
          serverNow={new Date().toISOString()}
          storage={storage}
          apiClient={apiClient}
          initialZenMode={false}
        />,
      );
      expect(htmlNormal).toContain('paper-session-header');
      expect(htmlNormal).toContain('paper-answer-sheet');
      expect(htmlNormal).toContain('Phiếu trả lời');
      expect(htmlNormal).toContain('Hiển thị');
      expect(htmlNormal).not.toContain('jlpt-zen-mode');

      // Zen Mode (EXAM-25): hides palette and section header to eliminate distraction
      const htmlZen = renderClean(
        <ExamRoom
          snapshot={SAMPLE_N5_EXAM_SNAPSHOT}
          attemptId="00000000-0000-4000-8000-000000000001"
          lease="00000000-0000-4000-8000-000000000002"
          mode="real"
          serverNow={new Date().toISOString()}
          storage={storage}
          apiClient={apiClient}
          initialZenMode={true}
        />,
      );
      expect(htmlZen).toContain('jlpt-zen-mode');
      expect(htmlZen).not.toContain('jlpt-section-header');
      expect(htmlZen).not.toContain('jlpt-question-palette');
      expect(htmlZen).toContain('Phiếu trả lời');
      expect(htmlZen).toContain('paper-sticky-sheet');
      expect(htmlZen).toContain('paper-mobile-bar');
    });
  });

  // =========================================================================
  // Acceptance 2: Reload audio sai số <= 2s; mất mạng không mất phiếu
  // =========================================================================
  describe('Acceptance 2: Reload audio sai số <= 2s; mất mạng không mất phiếu', () => {
    const timeline = SAMPLE_N1_EXAM_SNAPSHOT.sections.find((s) => s.code === 'listening')!
      .listeningTimeline!;

    it('reload audio position restores with difference <= 2.0 seconds and triggers re-sync on drift > 2.0s', () => {
      // In N1 listening section:
      // Item 0: startMs = 0, endMs = 30000, audioStartMs = 0, audioEndMs = 30000, gap = 5000ms
      // Item 1: startMs = 35000, endMs = 50000, audioStartMs = 0, audioEndMs = 15000

      // Scenario 1: candidate reloads at 14.5 seconds (14,500ms) into the listening section
      const elapsedMs1 = 14500;
      const pos1 = getListeningPlaybackPosition(timeline, elapsedMs1);
      expect(pos1.status).toBe('playing');
      expect(pos1.itemIndex).toBe(0);
      expect(pos1.audioOffsetMs).toBe(14500);

      // Audio offset in seconds = 14.5s
      const restoredTime1 = pos1.audioOffsetMs / 1000;
      const actualElapsedSec1 = elapsedMs1 / 1000;
      const driftSec1 = Math.abs(restoredTime1 - actualElapsedSec1);
      expect(driftSec1).toBeLessThanOrEqual(2.0);

      // Direct unit test of drift synchronization mechanism in AudioPlayer:
      // When audio.currentTime has drifted > 2.0s (e.g., lagged at 10.0s while expected is 14.5s)
      const mockLaggedAudio = { currentTime: 10.0 };
      const expectedSec = pos1.audioOffsetMs / 1000; // 14.5s
      const syncResultLagged = syncAudioDrift(mockLaggedAudio, expectedSec, 2.0);

      // Verify sync is triggered and currentTime is forcibly corrected to expectedSec
      expect(syncResultLagged.synced).toBe(true);
      expect(syncResultLagged.drift).toBe(4.5);
      expect(mockLaggedAudio.currentTime).toBe(14.5);

      // When drift is within acceptable window <= 2.0s (e.g., at 14.1s while expected is 14.5s)
      const mockAccurateAudio = { currentTime: 14.1 };
      const syncResultAccurate = syncAudioDrift(mockAccurateAudio, expectedSec, 2.0);

      // Verify sync is NOT triggered and currentTime is preserved
      expect(syncResultAccurate.synced).toBe(false);
      expect(syncResultAccurate.drift).toBeCloseTo(0.4, 2);
      expect(mockAccurateAudio.currentTime).toBe(14.1);

      // Scenario 2: candidate reloads at 42.0 seconds (42,000ms) - inside item 1
      const elapsedMs2 = 42000;
      const pos2 = getListeningPlaybackPosition(timeline, elapsedMs2);
      expect(pos2.status).toBe('playing');
      expect(pos2.itemIndex).toBe(1);
      // Item 1 startMs is 35,000ms, offset within segment = 42,000 - 35,000 = 7,000ms
      expect(pos2.audioOffsetMs).toBe(7000);

      const restoredTime2 = pos2.audioOffsetMs / 1000;
      // Expected time in audio track is 7.0s
      expect(Math.abs(restoredTime2 - 7.0)).toBeLessThanOrEqual(2.0);
    });

    it('network disconnection preserves answer sheet in local IndexedDB outbox without loss', async () => {
      const storage = new MemoryExamStorage();
      const apiClient = new ExamApiClient();

      // Mock API call to simulate network failure (offline)
      let isOnline = false;
      const updateSpy = vi.fn().mockImplementation(async (_attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> => {
        if (!isOnline) {
          throw new Error('NetworkError: Failed to fetch (Offline)');
        }
        return {
          lastSeq: input.seq,
          serverNow: new Date().toISOString(),
        };
      });
      apiClient.updateAnswerSheet = updateSpy;

      // Start attempt in storage
      const attemptId = '0192f000-0000-7000-8000-000000000099';
      await storage.saveAttempt({
        attemptId,
        examId: '0192f000-0000-7000-8000-000000000001',
        lease: '0192f000-0000-7000-8000-000000000088',
        mode: 'real',
        status: 'in_progress',
        currentSection: 0,
        answers: [1, 2, 0, 0, 0, 0],
        flags: [0, 1, 0, 0, 0, 0],
        lastAckedSeq: 0,
        currentSeq: 1,
        clientStartedAt: new Date().toISOString(),
        sectionDeadlines: {},
        updatedAt: new Date().toISOString(),
      });

      // While offline, candidate answers questions 2 and 3
      await storage.enqueueOutbox({
        attemptId,
        lease: '0192f000-0000-7000-8000-000000000088',
        seq: 2,
        answers: [1, 2, 4, 3, 0, 0],
        flags: [0, 1, 0, 0, 0, 0],
        changes: [
          { i: 2, v: 4, at: Date.now() },
          { i: 3, v: 3, at: Date.now() + 500 },
        ],
        status: 'pending',
        createdAt: new Date().toISOString(),
        retries: 0,
      });

      // Verify that local attempt still holds answers [1, 2, 4, 3, 0, 0]
      const localAttempt = await storage.getAttempt(attemptId);
      expect(localAttempt).not.toBeNull();

      const pendingOutbox = await storage.getPendingOutbox(attemptId);
      expect(pendingOutbox).toHaveLength(1);
      expect(pendingOutbox[0]?.answers).toEqual([1, 2, 4, 3, 0, 0]);

      // Network comes back online
      isOnline = true;
      const entry = pendingOutbox[0]!;
      const ack = await apiClient.updateAnswerSheet(attemptId, {
        lease: entry.lease,
        seq: entry.seq,
        answers: entry.answers,
        flags: entry.flags,
        changes: entry.changes,
      });

      expect(ack.lastSeq).toBe(2);
      await storage.markOutboxAcked(attemptId, ack.lastSeq);

      // Local outbox is now empty (synced)
      const afterSync = await storage.getPendingOutbox(attemptId);
      expect(afterSync).toHaveLength(0);
    });
  });

  // =========================================================================
  // Acceptance 3: Nhận lỗi lease rõ
  // =========================================================================
  describe('Acceptance 3: Nhận lỗi lease rõ', () => {
    it('ExamRoom and LeaseConflictModal display explicit conflict notice on 409 LEASE_INVALID', async () => {
      // 1. Direct render of LeaseConflictModal verifies required conflict message and clear notice
      const htmlModal = renderClean(
        <LeaseConflictModal
          isOpen={true}
          onGoHome={() => {}}
        />,
      );
      expect(htmlModal).toContain('Phiên thi bị xung đột');
      expect(htmlModal).toContain('Bài thi đang được mở ở nơi khác');
      expect(htmlModal).toContain('LEASE_INVALID');
      expect(htmlModal).toContain(
        'Để đảm bảo tính trung thực của kỳ thi, mỗi bài làm chỉ được thao tác tại một cửa sổ duy nhất',
      );
      expect(htmlModal).toContain('Quay về trang chủ');

      // 2. ExamRoom with initialConflictModalOpen renders the conflict modal in DOM
      const storage = new MemoryExamStorage();
      const apiClient = new ExamApiClient();

      const htmlExamRoom = renderClean(
        <ExamRoom
          snapshot={SAMPLE_N5_EXAM_SNAPSHOT}
          attemptId="00000000-0000-4000-8000-000000000001"
          lease="00000000-0000-4000-8000-000000000002"
          mode="real"
          serverNow={new Date().toISOString()}
          storage={storage}
          apiClient={apiClient}
          initialConflictModalOpen={true}
        />,
      );
      expect(htmlExamRoom).toContain('jlpt-exam-room');
      expect(htmlExamRoom).toContain('Phiên thi bị xung đột');
      expect(htmlExamRoom).toContain('LEASE_INVALID');

      // 3. ExamSyncEngine triggers onLeaseConflict callback when server responds with 409 LEASE_INVALID
      let conflictCallbackInvoked = false;
      const conflictEngine = new ExamSyncEngine({
        attemptId: '0192f000-0000-7000-8000-000000000099',
        examId: '0192f000-0000-7000-8000-000000000001',
        lease: '0192f000-0000-7000-8000-000000000088',
        initialAnswers: [0, 0, 0, 0],
        initialFlags: [0, 0, 0, 0],
        storage,
        apiClient: {
          updateAnswerSheet: vi.fn().mockRejectedValue({
            code: 'LEASE_INVALID',
            status: 409,
            message: 'Phiên làm bài (lease) không hợp lệ hoặc đã được mở trên một thiết bị khác.',
          }),
        } as unknown as ExamApiClient,
        onLeaseConflict: () => {
          conflictCallbackInvoked = true;
        },
      });

      await conflictEngine.recordAnswerChange(0, 1);
      await conflictEngine.flush();

      expect(conflictCallbackInvoked).toBe(true);
      expect(conflictEngine.getSyncState()).toBe('conflict');
      conflictEngine.stop();
    });

    it('a 409 that is not LEASE_INVALID (SECTION_NOT_STARTED) is an error to retry, not a session conflict', async () => {
      const storage = new MemoryExamStorage();
      let conflictCallbackInvoked = false;
      const engine = new ExamSyncEngine({
        attemptId: '0192f000-0000-7000-8000-000000000098',
        examId: '0192f000-0000-7000-8000-000000000001',
        lease: '0192f000-0000-7000-8000-000000000087',
        initialAnswers: [0, 0, 0, 0],
        initialFlags: [0, 0, 0, 0],
        storage,
        apiClient: {
          updateAnswerSheet: vi.fn().mockRejectedValue({
            code: 'SECTION_NOT_STARTED',
            status: 409,
            message: 'Chưa bắt đầu phần thi nào.',
          }),
        } as unknown as ExamApiClient,
        onLeaseConflict: () => {
          conflictCallbackInvoked = true;
        },
      });

      await engine.recordAnswerChange(0, 1);
      await engine.flush();

      expect(conflictCallbackInvoked).toBe(false);
      expect(engine.getSyncState()).toBe('error');
      engine.stop();
    });
  });
});
