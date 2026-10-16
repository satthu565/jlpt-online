import type { StoredAttempt, OutboxEntry, SyncState } from '../types.js';
import type { ExamStorageAdapter } from '../storage/indexeddb.js';
import type { ExamApiClient } from '../api/exam-api.js';

export interface ExamSyncEngineOptions {
  attemptId: string;
  examId: string;
  lease: string;
  initialAnswers: number[];
  initialFlags: number[];
  initialTimeSpentMs?: number[];
  initialSeq?: number;
  initialLastAckedSeq?: number;
  storage: ExamStorageAdapter;
  apiClient: ExamApiClient;
  debounceMs?: number; // Default 3000ms (3 seconds)
  maxWaitMs?: number;  // Default 10000ms (10 seconds max wait)
  onSyncStateChange?: (state: SyncState, meta?: { lastAckedSeq: number; currentSeq: number; error?: string }) => void;
  onLeaseConflict?: () => void;
}

export class ExamSyncEngine {
  private attemptId: string;
  private examId: string;
  private lease: string;
  private storage: ExamStorageAdapter;
  private apiClient: ExamApiClient;

  private answers: number[];
  private flags: number[];
  private timeSpentMs: number[];

  private currentSeq: number;
  private lastAckedSeq: number;

  private debounceMs: number;
  private maxWaitMs: number;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private firstChangeTime: number | null = null;

  private inFlight = false;
  private hasPendingChanges = false;
  private isStopped = false;

  private syncState: SyncState = 'saved';
  private lastError?: string;

  private onSyncStateChange?: (state: SyncState, meta?: { lastAckedSeq: number; currentSeq: number; error?: string }) => void;
  private onLeaseConflict?: () => void;

  constructor(options: ExamSyncEngineOptions) {
    this.attemptId = options.attemptId;
    this.examId = options.examId;
    this.lease = options.lease;
    this.storage = options.storage;
    this.apiClient = options.apiClient;

    this.answers = [...options.initialAnswers];
    this.flags = [...options.initialFlags];
    this.timeSpentMs = options.initialTimeSpentMs ? [...options.initialTimeSpentMs] : new Array(this.answers.length).fill(0);

    this.currentSeq = options.initialSeq ?? 0;
    this.lastAckedSeq = options.initialLastAckedSeq ?? 0;

    this.debounceMs = options.debounceMs ?? 3000;
    this.maxWaitMs = options.maxWaitMs ?? 10000;

    this.onSyncStateChange = options.onSyncStateChange;
    this.onLeaseConflict = options.onLeaseConflict;

    this.updateSyncState(this.lastAckedSeq >= this.currentSeq ? 'saved' : 'offline_saved');
  }

  private updateSyncState(state: SyncState, error?: string): void {
    this.syncState = state;
    this.lastError = error;
    if (this.onSyncStateChange) {
      this.onSyncStateChange(state, {
        lastAckedSeq: this.lastAckedSeq,
        currentSeq: this.currentSeq,
        error,
      });
    }
  }

  getSyncState(): SyncState {
    return this.syncState;
  }

  getCurrentSeq(): number {
    return this.currentSeq;
  }

  getLastAckedSeq(): number {
    return this.lastAckedSeq;
  }

  isInFlight(): boolean {
    return this.inFlight;
  }

  getAnswers(): number[] {
    return [...this.answers];
  }

  getFlags(): number[] {
    return [...this.flags];
  }

  /**
   * Records an answer change:
   * 1. Updates in-memory state and increments sequence number.
   * 2. Writes to IndexedDB FIRST ("IndexedDB ghi trước gửi").
   * 3. Sets state to 'saving' (or 'offline_saved' until ACKed).
   * 4. Schedules debounced sync (3s debounce, max 10s wait, at most 1 in flight).
   */
  async recordAnswerChange(
    questionIndex: number,
    optionValue: number,
    timeSpentMsDelta?: number,
  ): Promise<void> {
    if (this.isStopped) return;

    this.currentSeq += 1;
    this.answers[questionIndex] = optionValue;
    if (timeSpentMsDelta !== undefined) {
      this.timeSpentMs[questionIndex] = (this.timeSpentMs[questionIndex] || 0) + timeSpentMsDelta;
    }

    const change = {
      i: questionIndex,
      v: optionValue,
      at: Date.now(),
    };

    // 1. IndexedDB ghi trước gửi
    await this.persistToStorage([change]);

    // 2. Mark pending and schedule sync
    this.hasPendingChanges = true;
    this.scheduleSync();
  }

  /**
   * Records a flag (bookmark) change
   */
  async recordFlagChange(questionIndex: number, flagged: boolean): Promise<void> {
    if (this.isStopped) return;

    this.currentSeq += 1;
    this.flags[questionIndex] = flagged ? 1 : 0;

    // 1. IndexedDB ghi trước gửi
    await this.persistToStorage([]);

    // 2. Mark pending and schedule sync
    this.hasPendingChanges = true;
    this.scheduleSync();
  }

  private async persistToStorage(changes: Array<{ i: number; v: number; at: number }>): Promise<void> {
    const storedAttempt: StoredAttempt = {
      attemptId: this.attemptId,
      examId: this.examId,
      lease: this.lease,
      mode: 'real',
      status: 'in_progress',
      currentSection: 0,
      answers: [...this.answers],
      flags: [...this.flags],
      timeSpentMs: [...this.timeSpentMs],
      lastAckedSeq: this.lastAckedSeq,
      currentSeq: this.currentSeq,
      clientStartedAt: new Date().toISOString(),
      sectionDeadlines: {},
      updatedAt: new Date().toISOString(),
    };

    await this.storage.saveAttempt(storedAttempt);

    const outboxEntry: Omit<OutboxEntry, 'id'> = {
      attemptId: this.attemptId,
      lease: this.lease,
      seq: this.currentSeq,
      answers: [...this.answers],
      flags: [...this.flags],
      timeSpentMs: [...this.timeSpentMs],
      changes,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retries: 0,
    };

    await this.storage.enqueueOutbox(outboxEntry);
    this.updateSyncState('saving');
  }

  /**
   * Schedules debounced sync with max 10s wait
   */
  private scheduleSync(): void {
    const now = Date.now();

    if (this.firstChangeTime === null) {
      this.firstChangeTime = now;
    }

    const elapsedSinceFirst = now - this.firstChangeTime;
    const remainingMaxWait = Math.max(0, this.maxWaitMs - elapsedSinceFirst);

    // If max wait has elapsed, flush immediately
    if (remainingMaxWait === 0) {
      this.flush();
      return;
    }

    // Clear previous debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set debounce timer capped by remaining max wait
    const delay = Math.min(this.debounceMs, remainingMaxWait);
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, delay);

    // Also set max wait timer if not already set
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => {
        this.flush();
      }, remainingMaxWait);
    }
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.firstChangeTime = null;
  }

  /**
   * Flushes pending changes to server:
   * Rule: "một request đang chờ" (at most 1 in-flight request at a time).
   * If a request is in flight, the flush will automatically be executed
   * immediately when the in-flight request completes.
   */
  async flush(): Promise<void> {
    if (this.isStopped) return;

    this.clearTimers();

    if (this.inFlight) {
      // Mark that there are pending changes so next sync runs when current completes
      this.hasPendingChanges = true;
      return;
    }

    if (!this.hasPendingChanges && this.lastAckedSeq >= this.currentSeq) {
      return;
    }

    const syncSeq = this.currentSeq;
    const snapshotAnswers = [...this.answers];
    const snapshotFlags = [...this.flags];
    const snapshotTimeSpentMs = [...this.timeSpentMs];

    this.inFlight = true;
    this.hasPendingChanges = false;
    this.updateSyncState('saving');

    try {
      // Fetch pending outbox from IndexedDB to send changes delta
      const pendingOutbox = await this.storage.getPendingOutbox(this.attemptId);
      const changes = pendingOutbox.flatMap((item) => item.changes || []);

      const ack = await this.apiClient.updateAnswerSheet(this.attemptId, {
        lease: this.lease,
        seq: syncSeq,
        answers: snapshotAnswers,
        flags: snapshotFlags,
        timeSpentMs: snapshotTimeSpentMs,
        changes,
      });

      // Server ACK received!
      if (ack.lastSeq >= this.lastAckedSeq) {
        this.lastAckedSeq = ack.lastSeq;
        // Mark acked in IndexedDB
        await this.storage.markOutboxAcked(this.attemptId, ack.lastSeq);
      }

      this.inFlight = false;

      // Check if there are further changes made while this request was in flight
      if (this.hasPendingChanges || this.currentSeq > this.lastAckedSeq) {
        // Trigger next sync immediately without waiting
        this.flush();
      } else {
        // "Chưa ACK không báo đã lưu" -> Now that ACK is received, report 'saved'!
        this.updateSyncState('saved');
      }
    } catch (err: unknown) {
      this.inFlight = false;

      const error = err as { code?: string; message?: string; status?: number };
      const isConflict = error.code === 'LEASE_INVALID' || error.status === 409;

      if (isConflict) {
        this.isStopped = true;
        this.clearTimers();
        this.updateSyncState('conflict', error.message || 'Phiên làm bài bị xung đột lease.');
        if (this.onLeaseConflict) {
          this.onLeaseConflict();
        }
        return;
      }

      // Network or other error: keep changes in IndexedDB, show error or offline_saved
      this.updateSyncState('error', error.message || 'Lỗi kết nối máy chủ.');

      // Schedule retry with backoff if not stopped
      if (!this.isStopped) {
        this.debounceTimer = setTimeout(() => {
          this.flush();
        }, 5000);
      }
    }
  }

  stop(): void {
    this.isStopped = true;
    this.clearTimers();
  }
}
