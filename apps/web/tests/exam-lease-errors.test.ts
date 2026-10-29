import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamApiClient } from '../features/exam/api/exam-api';
import { ExamSyncEngine } from '../features/exam/sync/sync-engine';
import { MemoryExamStorage } from '../features/exam/storage/indexeddb';

describe('Exam lease conflict classification', () => {
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    ['plain 409', 'Conflict', 'API_ERROR', false],
    ['JSON without a code', JSON.stringify({ error: { message: 'Section unavailable' } }), 'API_ERROR', false],
    ['section conflict', JSON.stringify({ error: { code: 'SECTION_NOT_STARTED' } }), 'SECTION_NOT_STARTED', false],
    ['actual takeover', JSON.stringify({ error: { code: 'LEASE_INVALID' } }), 'LEASE_INVALID', true],
  ])('handles %s without inventing a lease takeover', async (_name, body, code, conflict) => {
    vi.useFakeTimers();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(body, { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ lastSeq: 1, serverNow: new Date().toISOString() })));
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    const storage = new MemoryExamStorage();
    const onLeaseConflict = vi.fn();
    const engine = new ExamSyncEngine({
      attemptId: 'attempt', examId: 'exam', lease: 'current-lease',
      initialAnswers: [0], initialFlags: [0], storage, apiClient: client, onLeaseConflict,
    });
    await engine.recordAnswerChange(0, 2);
    await engine.flush();
    expect(engine.getSyncState()).toBe(conflict ? 'conflict' : 'error');
    expect(onLeaseConflict).toHaveBeenCalledTimes(conflict ? 1 : 0);
    expect((await storage.getPendingOutbox('attempt'))).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledTimes(conflict ? 1 : 2);
    if (!conflict) {
      expect(engine.getSyncState()).toBe('saved');
      expect((await storage.getPendingOutbox('attempt'))).toHaveLength(0);
    }
    engine.stop();

    const errorClient = new ExamApiClient({
      baseUrl: '/api/v1', fetcher: async () => new Response(body, { status: 409 }),
    });
    await expect(errorClient.getAttempt('attempt')).rejects.toMatchObject({ status: 409, code });
  });

  it('retries an untyped 409 error without stopping the exam', async () => {
    const client = new ExamApiClient();
    client.updateAnswerSheet = vi.fn().mockRejectedValue({ status: 409, message: 'Conflict' });
    const onLeaseConflict = vi.fn();
    const engine = new ExamSyncEngine({
      attemptId: 'attempt', examId: 'exam', lease: 'current-lease',
      initialAnswers: [0], initialFlags: [0], storage: new MemoryExamStorage(), apiClient: client, onLeaseConflict,
    });
    await engine.recordAnswerChange(0, 2);
    await engine.flush();
    expect(engine.getSyncState()).toBe('error');
    expect(onLeaseConflict).not.toHaveBeenCalled();
    await engine.recordAnswerChange(0, 3);
    expect(engine.getAnswers()).toEqual([3]);
    engine.stop();
  });
});
