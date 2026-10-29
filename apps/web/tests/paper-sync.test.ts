import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';
import { ExamApiClient, ExamApiError } from '../features/exam/api/exam-api';
import type { AnswerSheetUpdateInput } from '@jlpt/schema';

afterEach(() => vi.restoreAllMocks());

function createEngine(storage = new MemoryExamStorage(), apiClient = new ExamApiClient()) {
  const engine = new ExamSyncEngine({ attemptId: 'attempt', examId: 'exam', lease: 'lease', initialAnswers: [0, 0], initialFlags: [0, 0], storage, apiClient, getContext: () => ({ mode: 'practice', currentSection: 2, sectionDeadlines: { 2: '2026-10-24T10:00:00.000Z' } }) });
  return { engine, storage, apiClient };
}

describe('Paper exam persistence', () => {
  it('stops retries after the server closes an attempt while retaining unacknowledged local answers', async () => {
    vi.useFakeTimers();
    const { engine, apiClient, storage } = createEngine();
    apiClient.updateAnswerSheet = vi.fn(async () => { throw new ExamApiError('Attempt finalized', 'ATTEMPT_CLOSED', 409); });
    try {
      await engine.recordAnswerChange(0, 2);
      await engine.flush();
      expect(engine.getSyncState()).toBe('closed');
      expect(engine.getLastAckedSeq()).toBe(0);
      expect((await storage.getAttempt('attempt'))?.answers).toEqual([2, 0]);
      expect(await storage.getPendingOutbox('attempt')).toHaveLength(1);
      await engine.retry();
      await vi.advanceTimersByTimeAsync(15000);
      expect(apiClient.updateAnswerSheet).toHaveBeenCalledTimes(1);
      await expect(engine.drain()).rejects.toThrow('Attempt finalized');
      await engine.recordAnswerChange(1, 4);
      expect((await storage.getAttempt('attempt'))?.answers).toEqual([2, 0]);
    } finally { engine.stop(); vi.useRealTimers(); }
  });
  it('reports a local write failure honestly and can retry without losing the in-memory answer', async () => {
    const { engine, apiClient, storage } = createEngine();
    vi.spyOn(storage, 'saveAttempt').mockRejectedValueOnce(new Error('quota exceeded'));
    apiClient.updateAnswerSheet = vi.fn(async (_id: string, input: AnswerSheetUpdateInput) => ({ lastSeq: input.seq, serverNow: new Date().toISOString() }));
    try {
      await expect(engine.recordAnswerChange(0, 3)).rejects.toThrow('quota exceeded');
      expect(engine.getSyncState()).toBe('local_error');
      expect(await storage.getAttempt('attempt')).toBeNull();
      await engine.retry();
      expect(engine.getSyncState()).toBe('saved');
      expect((await storage.getAttempt('attempt'))?.answers).toEqual([3, 0]);
    } finally { engine.stop(); }
  });

  it('keeps each rapid write paired with its own sequence and retains section context', async () => {
    const { engine, storage } = createEngine();
    try {
      await Promise.all([engine.recordAnswerChange(0, 2), engine.recordAnswerChange(1, 3), engine.recordFlagChange(0, true)]);
      const outbox = await storage.getPendingOutbox('attempt');
      expect(outbox.map((entry) => entry.seq)).toEqual([1, 2, 3]);
      expect(outbox[0]?.answers).toEqual([2, 0]);
      expect(outbox[1]?.answers).toEqual([2, 3]);
      expect(outbox[2]?.flags).toEqual([1, 0]);
      expect(await storage.getAttempt('attempt')).toMatchObject({ currentSeq: 3, currentSection: 2, mode: 'practice' });
    } finally { engine.stop(); }
  });

  it('waits for pending local writes and the server ACK before allowing a section to close', async () => {
    const { engine, apiClient } = createEngine();
    apiClient.updateAnswerSheet = vi.fn(async (_id: string, input: AnswerSheetUpdateInput) => ({ lastSeq: input.seq, serverNow: new Date().toISOString() }));
    try {
      const write = engine.recordAnswerChange(0, 4);
      await engine.drain();
      await write;
      expect(engine.getSyncState()).toBe('saved');
      expect(engine.getLastAckedSeq()).toBe(engine.getCurrentSeq());
    } finally { engine.stop(); }
  });

  it('retains local answers and refuses a successful close when the server never acknowledges', async () => {
    const { engine, apiClient, storage } = createEngine();
    apiClient.updateAnswerSheet = vi.fn(async () => { throw new Error('network unavailable'); });
    try {
      await engine.recordAnswerChange(1, 2);
      await expect(engine.drain()).rejects.toThrow('network unavailable');
      expect((await storage.getAttempt('attempt'))?.answers).toEqual([0, 2]);
      expect(engine.getSyncState()).not.toBe('saved');
    } finally { engine.stop(); }
  });
});
