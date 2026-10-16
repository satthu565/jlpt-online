import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine.js';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb.js';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api.js';
import {
  AnswerSheetUpdateInputSchema,
  AnswerSheetAckSchema,
  type AnswerSheetUpdateInput,
  type AnswerSheetAck,
} from '@jlpt/schema';

describe('ExamSyncEngine & Autosave Outbox (Acceptance 2, 3, 4 & EXAM-17)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debounces answer changes by 3 seconds before sending request (Acceptance 2)', async () => {
    const storage = new MemoryExamStorage();
    const updateSpy = vi.fn().mockImplementation(async (_attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> => {
      // Validate real contract
      AnswerSheetUpdateInputSchema.parse(input);
      return AnswerSheetAckSchema.parse({
        lastSeq: input.seq,
        serverNow: new Date().toISOString(),
      });
    });

    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = updateSpy;

    const engine = new ExamSyncEngine({
      attemptId: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      lease: '33333333-3333-4333-8333-333333333333',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      storage,
      apiClient,
      debounceMs: 3000,
      maxWaitMs: 10000,
    });

    // Make 1 answer change
    await engine.recordAnswerChange(0, 2);

    expect(updateSpy).not.toHaveBeenCalled();

    // Advance 2 seconds (not yet 3s)
    await vi.advanceTimersByTimeAsync(2000);
    expect(updateSpy).not.toHaveBeenCalled();

    // Advance remaining 1 second (total 3s)
    await vi.advanceTimersByTimeAsync(1000);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    const firstCall = updateSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const callArgs = firstCall![1] as AnswerSheetUpdateInput;
    expect(callArgs.answers[0]).toBe(2);
    expect(callArgs.seq).toBe(1);
    expect(engine.getSyncState()).toBe('saved');

    engine.stop();
  });

  it('enforces max 10s wait when rapid answer changes reset debounce timer (Acceptance 2)', async () => {
    const storage = new MemoryExamStorage();
    const updateSpy = vi.fn().mockImplementation(async (_attemptId: string, input: AnswerSheetUpdateInput): Promise<AnswerSheetAck> => {
      AnswerSheetUpdateInputSchema.parse(input);
      return AnswerSheetAckSchema.parse({
        lastSeq: input.seq,
        serverNow: new Date().toISOString(),
      });
    });

    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = updateSpy;

    const engine = new ExamSyncEngine({
      attemptId: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      lease: '33333333-3333-4333-8333-333333333333',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      storage,
      apiClient,
      debounceMs: 3000,
      maxWaitMs: 10000,
    });

    // First change at t = 0
    await engine.recordAnswerChange(0, 1);

    // Rapid changes at t = 2s, 4s, 6s, 8s (each resets the 3s debounce)
    await vi.advanceTimersByTimeAsync(2000); // t = 2s
    await engine.recordAnswerChange(1, 2);

    await vi.advanceTimersByTimeAsync(2000); // t = 4s
    await engine.recordAnswerChange(2, 3);

    await vi.advanceTimersByTimeAsync(2000); // t = 6s
    await engine.recordAnswerChange(3, 4);

    await vi.advanceTimersByTimeAsync(2000); // t = 8s
    await engine.recordAnswerChange(0, 4);

    expect(updateSpy).not.toHaveBeenCalled();

    // Advance to t = 10s (maxWait reached!)
    await vi.advanceTimersByTimeAsync(2000); // t = 10s
    expect(updateSpy).toHaveBeenCalledTimes(1);

    const firstCall = updateSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    const callArgs = firstCall![1] as AnswerSheetUpdateInput;
    expect(callArgs.answers).toEqual([4, 2, 3, 4]);
    expect(callArgs.seq).toBe(5);

    engine.stop();
  });

  it('ensures at most ONE request is in flight at any given time (Acceptance 2)', async () => {
    const storage = new MemoryExamStorage();
    let resolveFirstRequest: (ack: AnswerSheetAck) => void;
    const slowFirstPromise = new Promise<AnswerSheetAck>((resolve) => {
      resolveFirstRequest = resolve;
    });

    let callCount = 0;
    const updateSpy = vi.fn().mockImplementation(async (_attemptId: string, input: AnswerSheetUpdateInput) => {
      callCount++;
      if (callCount === 1) {
        return slowFirstPromise;
      }
      return AnswerSheetAckSchema.parse({
        lastSeq: input.seq,
        serverNow: new Date().toISOString(),
      });
    });

    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = updateSpy;

    const engine = new ExamSyncEngine({
      attemptId: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      lease: '33333333-3333-4333-8333-333333333333',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      storage,
      apiClient,
      debounceMs: 3000,
      maxWaitMs: 10000,
    });

    // Change 1 -> fires at 3s
    await engine.recordAnswerChange(0, 1);
    await vi.advanceTimersByTimeAsync(3000);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(engine.isInFlight()).toBe(true);

    // While request 1 is in flight, user makes change 2 and change 3
    await engine.recordAnswerChange(1, 2);
    await engine.recordAnswerChange(2, 3);

    // Advance 5s while request 1 is still pending
    await vi.advanceTimersByTimeAsync(5000);
    // MUST NOT send parallel request while one is in flight!
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Resolve first request
    resolveFirstRequest!({
      lastSeq: 1,
      serverNow: new Date().toISOString(),
    });
    // Wait for in-flight async storage & next flush
    await vi.waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    const secondCallRaw = updateSpy.mock.calls[1];
    expect(secondCallRaw).toBeDefined();
    const secondCall = secondCallRaw![1] as AnswerSheetUpdateInput;
    expect(secondCall.seq).toBe(3);
    expect(secondCall.answers).toEqual([1, 2, 3, 0]);

    engine.stop();
  });

  it('persists to IndexedDB before network; never reports saved before ACK (Acceptance 3)', async () => {
    const storage = new MemoryExamStorage();
    let resolveNetwork: (ack: AnswerSheetAck) => void;
    const networkPromise = new Promise<AnswerSheetAck>((resolve) => {
      resolveNetwork = resolve;
    });

    const updateSpy = vi.fn().mockReturnValue(networkPromise);
    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = updateSpy;

    const engine = new ExamSyncEngine({
      attemptId: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      lease: '33333333-3333-4333-8333-333333333333',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      storage,
      apiClient,
      debounceMs: 3000,
      maxWaitMs: 10000,
    });

    // Initial state
    expect(engine.getSyncState()).toBe('saved');

    // 1. User selects answer 3
    await engine.recordAnswerChange(0, 3);

    // 2. Verify: IndexedDB MUST have saved the state immediately, BEFORE network fires
    const stored = await storage.getAttempt('11111111-1111-4111-8111-111111111111');
    expect(stored).not.toBeNull();
    expect(stored?.answers[0]).toBe(3);
    expect(stored?.currentSeq).toBe(1);

    const pendingOutbox = await storage.getPendingOutbox('11111111-1111-4111-8111-111111111111');
    const firstOutboxItem = pendingOutbox[0];
    expect(firstOutboxItem).toBeDefined();
    expect(firstOutboxItem!.seq).toBe(1);
    expect(firstOutboxItem!.status).toBe('pending');

    // State is 'saving' or 'offline_saved', NOT 'saved'
    expect(engine.getSyncState()).not.toBe('saved');

    // Advance debounce
    await vi.advanceTimersByTimeAsync(3000);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // While awaiting ACK, syncState must STILL NOT be 'saved'
    expect(engine.getSyncState()).toBe('saving');

    // Server returns ACK
    resolveNetwork!({
      lastSeq: 1,
      serverNow: new Date().toISOString(),
    });
    // Wait for async persistence to finish and update state
    await vi.waitFor(() => {
      expect(engine.getSyncState()).toBe('saved');
    });

    expect(engine.getLastAckedSeq()).toBe(1);

    // Verify storage outbox marked as acked
    const remainingPending = await storage.getPendingOutbox('11111111-1111-4111-8111-111111111111');
    expect(remainingPending.length).toBe(0);

    engine.stop();
  });

  it('halts sync and invokes callback when server returns LEASE_INVALID 409 (Acceptance 4)', async () => {
    const storage = new MemoryExamStorage();
    const conflictSpy = vi.fn();

    const apiClient = new ExamApiClient();
    apiClient.updateAnswerSheet = vi.fn().mockRejectedValue(
      new ExamApiError('Bài thi đang được mở ở nơi khác.', 'LEASE_INVALID', 409),
    );

    const engine = new ExamSyncEngine({
      attemptId: '11111111-1111-4111-8111-111111111111',
      examId: '22222222-2222-4222-8222-222222222222',
      lease: '33333333-3333-4333-8333-333333333333',
      initialAnswers: [0, 0, 0, 0],
      initialFlags: [0, 0, 0, 0],
      storage,
      apiClient,
      onLeaseConflict: conflictSpy,
    });

    await engine.recordAnswerChange(0, 1);
    await vi.advanceTimersByTimeAsync(3000);

    expect(conflictSpy).toHaveBeenCalledTimes(1);
    expect(engine.getSyncState()).toBe('conflict');

    // Further changes should be ignored since lease is invalid
    await engine.recordAnswerChange(1, 2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(apiClient.updateAnswerSheet).toHaveBeenCalledTimes(1);

    engine.stop();
  });
});
