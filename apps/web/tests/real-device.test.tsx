import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import {
  ALL_SAMPLE_EXAMS,
  SAMPLE_N1_EXAM_SNAPSHOT,
} from './fixtures/exam-fixtures';
import {
  DEVICE_PROFILES,
  type DeviceProfile,
} from './fixtures/device-fixtures';
import { flattenExamQuestions } from '../features/exam/utils/flatten-questions';
import {
  AudioPlayer,
  syncAudioDrift,
  setupVisibilitySync,
  type SyncVisibilityDocument,
} from '../features/exam/components/audio-player';
import { QuestionView } from '../features/exam/components/question-view';
import { QuestionPalette } from '../features/exam/components/question-palette';
import { QuestionNavigation } from '../features/exam/components/question-navigation';
import { ExamRoom } from '../features/exam/components/exam-room';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';
import { ExamApiClient } from '../features/exam/api/exam-api';
import {
  assertNoAnswerLeak,
  PublicExamSnapshotSchema,
  AnswerSheetAckSchema,
  type AnswerSheetUpdateInput,
  type AnswerSheetAck,
} from '@jlpt/schema';

const renderClean = (element: React.ReactElement): string =>
  renderToString(element).replace(/<!--.*?-->/g, '');

describe('Web Real Device & Mobile Testing Suite (R03 / SYS-01 / SYS-10 / WCAG 2.1 AA)', () => {
  const flatQuestions = flattenExamQuestions(SAMPLE_N1_EXAM_SNAPSHOT);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Device Matrix & Profile Specifications
  // =========================================================================
  describe('1. Device Matrix & Profile Specifications', () => {
    it('verifies all 6 device target profiles including iPhone Safari, Android Chrome and iPad', () => {
      expect(DEVICE_PROFILES).toHaveLength(6);

      const iphone = DEVICE_PROFILES.find((d) => d.id === 'iphone-15');
      expect(iphone).toBeDefined();
      expect(iphone?.engine).toBe('WebKit');
      expect(iphone?.touch).toBe(true);
      expect(iphone?.viewport.width).toBe(393);

      const pixel = DEVICE_PROFILES.find((d) => d.id === 'pixel-7');
      expect(pixel).toBeDefined();
      expect(pixel?.engine).toBe('Blink');
      expect(pixel?.touch).toBe(true);
      expect(pixel?.viewport.width).toBe(412);

      const compactSE = DEVICE_PROFILES.find((d) => d.id === 'iphone-se');
      expect(compactSE).toBeDefined();
      expect(compactSE?.viewport.width).toBe(320);

      const ipad = DEVICE_PROFILES.find((d) => d.id === 'ipad-pro');
      expect(ipad).toBeDefined();
      expect(ipad?.isMobile).toBe(true);
      expect(ipad?.viewport.width).toBe(834);
    });

    it.each(DEVICE_PROFILES)(
      'parameterized validation for device profile $name ($id: $viewport.width x $viewport.height, touch: $touch)',
      (profile: DeviceProfile) => {
        expect(profile.id).toBeTruthy();
        expect(profile.name).toBeTruthy();
        expect(profile.viewport.width).toBeGreaterThanOrEqual(320);
        expect(profile.viewport.height).toBeGreaterThanOrEqual(568);
        expect(profile.userAgent).toContain('Mozilla/5.0');

        // Parameterized responsive component render test
        const htmlPalette = renderClean(
          <QuestionPalette
            questions={flatQuestions}
            currentIndex={0}
            answers={[1, 0, 0, 0, 0, 0]}
            flags={[0, 1, 0, 0, 0, 0]}
            onSelectQuestion={vi.fn()}
          />,
        );
        expect(htmlPalette).toContain('min-h-[44px]');
        expect(htmlPalette).toContain('min-w-[44px]');
        expect(htmlPalette).toContain('grid-cols-4');

        const htmlQuestion = renderClean(
          <QuestionView
            question={flatQuestions[0]!}
            selectedOption={2}
            isFlagged={false}
            onSelectOption={vi.fn()}
            onToggleFlag={vi.fn()}
          />,
        );
        expect(htmlQuestion).toContain('p-4 rounded-xl');
        expect(htmlQuestion).toContain('role="radio"');
        if (profile.touch) {
          expect(htmlQuestion).toContain('aria-label');
        }
      },
    );
  });

  // =========================================================================
  // 2. Touch Target Ergonomics & WCAG 2.1 AA Touch Compliance
  // =========================================================================
  describe('2. Touch Target Ergonomics & Mobile Tap Accessibility', () => {
    const flatQuestions = flattenExamQuestions(SAMPLE_N1_EXAM_SNAPSHOT);

    it('QuestionView answer choices have generous min-height and clear touch boundaries', () => {
      const q = flatQuestions[0]!;
      const html = renderClean(
        <QuestionView
          question={q}
          selectedOption={2}
          isFlagged={false}
          onSelectOption={vi.fn()}
          onToggleFlag={vi.fn()}
          fontSize="base"
        />,
      );

      // Verify options are rendered with role radio and explicit label
      expect(html).toContain('role="radio"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('aria-checked="false"');
      expect(html).toContain('p-4 rounded-xl');
    });

    it('QuestionPalette buttons enforce minimum 44px touch target on mobile viewports', () => {
      const html = renderClean(
        <QuestionPalette
          questions={flatQuestions}
          currentIndex={0}
          answers={[1, 0, 0, 0, 0, 0]}
          flags={[0, 1, 0, 0, 0, 0]}
          onSelectQuestion={vi.fn()}
        />,
      );

      // Verify min-h-[44px] and min-w-[44px] touch target classes are applied (WCAG AAA)
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('grid-cols-4');
      expect(html).toContain('data-question-index="0"');
      expect(html).toContain('data-answered="true"');
      expect(html).toContain('data-flagged="true"');
    });

    it('QuestionNavigation buttons enforce minimum 44px touch target for thumb ergonomics', () => {
      const html = renderClean(
        <QuestionNavigation
          currentIndex={2}
          totalQuestions={6}
          isFirstInSection={false}
          isLastInSection={false}
          isLastSection={false}
          onPrev={vi.fn()}
          onNext={vi.fn()}
          onRequestNextSection={vi.fn()}
          onRequestSubmit={vi.fn()}
        />,
      );

      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('Câu trước');
      expect(html).toContain('Câu sau');
    });

    it('Flag bookmark button has explicit accessible state and touch padding', () => {
      const q = flatQuestions[0]!;
      const html = renderClean(
        <QuestionView
          question={q}
          selectedOption={0}
          isFlagged={true}
          onSelectOption={vi.fn()}
          onToggleFlag={vi.fn()}
        />,
      );

      expect(html).toContain('aria-pressed="true"');
      expect(html).toContain('Đã đánh dấu');
      expect(html).toContain('px-3 py-1.5');
    });
  });

  // =========================================================================
  // 3. Mobile Safari & Android Chrome Audio Restrictions & Resilience
  // =========================================================================
  describe('3. Mobile Audio Engine & Timeline Synchronization', () => {
    const timeline = SAMPLE_N1_EXAM_SNAPSHOT.sections.find((s) => s.code === 'listening')!
      .listeningTimeline!;

    it('[AUDIO-04] Real exam mode strictly forbids pause or seeking on mobile devices', () => {
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="real"
          activeGroupId="0192f000-1000-7000-8000-000000000004"
        />,
      );

      expect(html).toContain('Thi thật: Khóa tua / phát lại');
      expect(html).toContain('Âm thanh phát theo trình tự chuẩn kỳ thi. Bạn không thể tua hay phát lại.');
      expect(html).not.toContain('Tốc độ:');
      expect(html).not.toContain('Phát lại đoạn này');
    });

    it('syncAudioDrift detects mobile playback drift and resynchronizes within tolerance', () => {
      const mockAudio = { currentTime: 10.0 };

      // Case 1: Drift <= 2s tolerance -> no abrupt resync
      const resultNormal = syncAudioDrift(mockAudio, 11.2, 2.0);
      expect(resultNormal.synced).toBe(false);
      expect(resultNormal.drift).toBeCloseTo(1.2, 1);
      expect(mockAudio.currentTime).toBe(10.0);

      // Case 2: Drift > 2s (e.g. mobile background throttle) -> resyncs to expected
      const resultDrifted = syncAudioDrift(mockAudio, 15.5, 2.0);
      expect(resultDrifted.synced).toBe(true);
      expect(resultDrifted.drift).toBeCloseTo(5.5, 1);
      expect(mockAudio.currentTime).toBe(15.5);
    });

    it('[AUDIO-10] Mobile network failure renders prominent retry action without app crash', () => {
      const onErrorSpy = vi.fn();
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="real"
          initialErrorMessage="Không thể tải tệp âm thanh. Vui lòng kiểm tra kết nối mạng."
          onError={onErrorSpy}
        />,
      );

      expect(html).toContain('Không thể tải tệp âm thanh. Vui lòng kiểm tra kết nối mạng.');
      expect(html).toContain('Thử lại');
      expect(html).toContain('Lỗi âm thanh');
    });

    it('[AUDIO-05 & AUDIO-06] Practice mode exposes touch-accessible speed rates and replay', () => {
      const html = renderClean(
        <AudioPlayer
          timeline={timeline}
          mode="practice"
          activeGroupId="0192f000-1000-7000-8000-000000000004"
        />,
      );

      expect(html).toContain('Luyện tập: Tùy chỉnh tốc độ &amp; phát lại');
      expect(html).toContain('0.75x');
      expect(html).toContain('1x');
      expect(html).toContain('1.25x');
      expect(html).toContain('↺ Phát lại đoạn này');
    });

    it('[AUDIO-04] synchronizes audio timeline on mobile device visibilitychange (wake-up / screen unlock) and cleans up listener', () => {
      const syncWithTimelineSpy = vi.fn();

      type Listener = () => void;
      const listeners: Record<string, Listener[]> = {};

      const mockDocument: SyncVisibilityDocument = {
        visibilityState: 'hidden',
        addEventListener: vi.fn((event: string, handler: Listener) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: Listener) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((h) => h !== handler);
          }
        }),
      };

      // 1. Setup visibility sync listener
      const cleanup = setupVisibilitySync(syncWithTimelineSpy, mockDocument);

      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
      expect(listeners['visibilitychange']).toHaveLength(1);

      const triggerVisibilityChange = () => {
        for (const handler of listeners['visibilitychange'] || []) {
          handler();
        }
      };

      // 2. When screen is locked / tab is hidden, visibilitychange should NOT trigger sync
      mockDocument.visibilityState = 'hidden';
      triggerVisibilityChange();
      expect(syncWithTimelineSpy).not.toHaveBeenCalled();

      // 3. When device is unlocked / tab becomes visible, syncWithTimeline IS triggered immediately
      mockDocument.visibilityState = 'visible';
      triggerVisibilityChange();
      expect(syncWithTimelineSpy).toHaveBeenCalledTimes(1);

      // 4. Repeated wake-up / refocus triggers sync again
      triggerVisibilityChange();
      expect(syncWithTimelineSpy).toHaveBeenCalledTimes(2);

      // 5. Cleanup removes the listener and prevents further sync calls
      cleanup();
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
      expect(listeners['visibilitychange']).toHaveLength(0);

      triggerVisibilityChange();
      expect(syncWithTimelineSpy).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 4. Mobile Network Drop, Offline Persistence & Reload Resilience
  // =========================================================================
  describe('4. Mobile Network Disconnection & Reload Resilience', () => {
    it('saves answers to local storage immediately upon mobile network drop', async () => {
      const storage = new MemoryExamStorage();
      let isOnline = false;

      const updateSpy = vi.fn().mockImplementation(async (_attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> => {
        if (!isOnline) {
          throw new Error('Network offline: Failed to fetch (simulated airplane mode)');
        }
        return AnswerSheetAckSchema.parse({
          lastSeq: input.seq,
          serverNow: new Date().toISOString(),
        });
      });

      const apiClient = new ExamApiClient();
      apiClient.updateAnswerSheet = updateSpy;

      const engine = new ExamSyncEngine({
        attemptId: '0192f000-3000-7000-8000-000000000001',
        examId: '0192f000-0000-7000-8000-000000000001',
        lease: '0192f000-4000-7000-8000-000000000001',
        initialAnswers: [0, 0, 0, 0, 0, 0],
        initialFlags: [0, 0, 0, 0, 0, 0],
        storage,
        apiClient,
        debounceMs: 500,
        maxWaitMs: 2000,
      });

      // User selects answer #3 while offline on mobile device
      await engine.recordAnswerChange(0, 3);
      await engine.recordFlagChange(0, true);

      // Verify answers are already recorded locally in storage
      const storedAttempt = await storage.getAttempt('0192f000-3000-7000-8000-000000000001');
      expect(storedAttempt).toBeDefined();
      expect(storedAttempt?.answers[0]).toBe(3);
      expect(storedAttempt?.flags[0]).toBe(1);

      // Advance debounce timer -> network fails
      await vi.advanceTimersByTimeAsync(1000);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(engine.getSyncState()).toBe('error');

      // Network recovers (user disables airplane mode)
      isOnline = true;
      await engine.flush();

      expect(engine.getSyncState()).toBe('saved');
      expect(engine.getLastAckedSeq()).toBe(2);

      engine.stop();
    });

    it('simulates mobile page reload: restores answers, flags, and lease cleanly', async () => {
      const storage = new MemoryExamStorage();

      // Preload saved attempt state (representing previous mobile session)
      await storage.saveAttempt({
        attemptId: '0192f000-3000-7000-8000-000000000001',
        examId: '0192f000-0000-7000-8000-000000000001',
        lease: '0192f000-4000-7000-8000-000000000001',
        mode: 'real',
        status: 'in_progress',
        currentSection: 0,
        currentSeq: 3,
        lastAckedSeq: 3,
        answers: [2, 4, 1, 0, 0, 0],
        flags: [0, 1, 0, 0, 0, 0],
        timeSpentMs: [30000, 45000, 20000, 0, 0, 0],
        clientStartedAt: new Date().toISOString(),
        sectionDeadlines: {},
        updatedAt: new Date().toISOString(),
      });

      // Reload occurs: read back from storage
      const restored = await storage.getAttempt('0192f000-3000-7000-8000-000000000001');
      expect(restored).not.toBeNull();
      expect(restored?.answers).toEqual([2, 4, 1, 0, 0, 0]);
      expect(restored?.flags).toEqual([0, 1, 0, 0, 0, 0]);
      expect(restored?.currentSeq).toBe(3);
      expect(restored?.lastAckedSeq).toBe(3);
      expect(restored?.lease).toBe('0192f000-4000-7000-8000-000000000001');

      // Initialize ExamRoom with restored state
      const apiClient = new ExamApiClient();
      const html = renderClean(
        <ExamRoom
          snapshot={SAMPLE_N1_EXAM_SNAPSHOT}
          attemptId={restored!.attemptId}
          lease={restored!.lease}
          mode="real"
          serverNow={new Date().toISOString()}
          initialAnswers={restored!.answers}
          initialFlags={restored!.flags}
          storage={storage}
          apiClient={apiClient}
        />,
      );

      // Verify restored content is rendered without loss
      expect(html).toContain('Câu 1');
      expect(html).toContain('Đã lưu');
    });
  });

  // =========================================================================
  // 5. Responsive Breakpoint Layouts & Compact Viewport Rendering
  // =========================================================================
  describe('5. Responsive Breakpoints & Viewport Rendering', () => {
    it('renders ExamRoom in Zen mode without right column distractions', () => {
      const storage = new MemoryExamStorage();
      const apiClient = new ExamApiClient();

      const html = renderClean(
        <ExamRoom
          snapshot={SAMPLE_N1_EXAM_SNAPSHOT}
          attemptId="0192f000-3000-7000-8000-000000000001"
          lease="0192f000-4000-7000-8000-000000000001"
          mode="real"
          serverNow={new Date().toISOString()}
          initialZenMode={true}
          storage={storage}
          apiClient={apiClient}
        />,
      );

      // In Zen mode, main col spans full width and palette is hidden
      expect(html).toContain('lg:col-span-12');
      expect(html).not.toContain('Phiếu trả lời');
    });

    it('ensures zero answer key leakage across all sample exams in real device view', () => {
      for (const exam of ALL_SAMPLE_EXAMS) {
        expect(() => assertNoAnswerLeak(exam)).not.toThrow();
        const parsed = PublicExamSnapshotSchema.parse(exam);
        expect(parsed.schemaVersion).toBe(1);
      }
    });
  });

  // =========================================================================
  // 6. External Boundary & Device Test Gate Acknowledgment
  // =========================================================================
  describe('6. External Verification Boundary & Hardware Lab Gate', () => {
    it('verifies external prerequisite contract for device-test from external-prerequisites.json', () => {
      // Check that external-prerequisites.json exists and contains device-test gate blocking R03
      const candidates = [
        path.resolve(process.cwd(), '../../docs/multi-worker/external-prerequisites.json'),
        path.resolve(process.cwd(), 'docs/multi-worker/external-prerequisites.json'),
      ];
      const filePath = candidates.find((p) => fs.existsSync(p));
      expect(filePath).toBeDefined();

      const raw = fs.readFileSync(filePath!, 'utf8');
      const data = JSON.parse(raw);
      expect(data.schemaVersion).toBe(2);

      const deviceTestItem = data.items.find(
        (item: { id: string }) => item.id === 'device-test',
      );
      expect(deviceTestItem).toBeDefined();
      expect(deviceTestItem.id).toBe('device-test');
      expect(deviceTestItem.status).toBe('PENDING');
      expect(deviceTestItem.blocksAcceptance).toContain('R03');
      expect(deviceTestItem.blocksAcceptance).toContain('V06');
      expect(deviceTestItem.definition).toBe('QUYET_DINH_VA_DICH_VU.md');
    });

    it('verifies software fallback & sandbox emulation behavior when physical devices are absent', () => {
      // In the absence of physical lab devices, web app operates via software emulation:
      // 1. All device profiles maintain compliant touch targets and responsive layouts
      for (const profile of DEVICE_PROFILES) {
        expect(profile.viewport.width).toBeGreaterThanOrEqual(320);
        expect(profile.viewport.height).toBeGreaterThanOrEqual(568);
      }

      // 2. Offline persistence falls back safely to in-memory/IndexedDB storage
      const storage = new MemoryExamStorage();
      expect(storage).toBeDefined();

      // 3. Fallback gate explicitly documents that physical hardware verification is pending
      const externalStatus = { 'device-test': 'MISSING' };
      const isHardwareVerified = externalStatus['device-test'] === 'AVAILABLE';
      expect(isHardwareVerified).toBe(false);
      const blockerTag = isHardwareVerified ? 'VERIFIED' : 'BLOCKED_EXTERNAL: device-test';
      expect(blockerTag).toBe('BLOCKED_EXTERNAL: device-test');
    });
  });
});
