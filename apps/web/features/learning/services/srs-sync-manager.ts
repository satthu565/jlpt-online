import type { ReviewRating, SyncQueueItem, ReviewResult, ReviewSubmission } from '../types';
import { isReviewUuid, newReviewId } from './srs-review-id';
import { LearningClient, defaultLearningClient } from './learning-client';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'pending_sync' | 'offline' | 'error';

export interface SrsSyncSnapshot {
  state: SyncState;
  pendingCount: number;
  syncedCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
}

type SyncListener = (snapshot: SrsSyncSnapshot) => void;

const STORAGE_KEY = 'jlpt_srs_review_sync_queue_v1';

export class SrsSyncManager {
  private queue: SyncQueueItem[] = [];
  private state: SyncState = 'idle';
  private lastSyncedAt?: string;
  private errorMessage?: string;
  private listeners: Set<SyncListener> = new Set();
  private isProcessing = false;
  private client: LearningClient;

  private readonly storageKey: string;
  private readonly handleOnline = () => { void this.processQueue(); };

  constructor(client: LearningClient = defaultLearningClient, options: { storageKey?: string } = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEY;
    this.client = client;
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  public dispose(): void {
    if (typeof window !== 'undefined') window.removeEventListener('online', this.handleOnline);
    this.listeners.clear();
  }

  public setClient(client: LearningClient) {
    this.client = client;
  }

  public subscribe(listener: SyncListener): () => void {
    if (typeof window !== 'undefined') window.addEventListener('online', this.handleOnline);
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public getSnapshot(): SrsSyncSnapshot {
    const pendingCount = this.queue.filter(
      (q) => q.status === 'pending' || q.status === 'syncing' || q.status === 'failed',
    ).length;
    const syncedCount = this.queue.filter((q) => q.status === 'synced').length;
    return {
      state: this.state,
      pendingCount,
      syncedCount,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
    };
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.queue = JSON.parse(raw);
        this.queue = this.queue.map(item => item.status === 'syncing' ? { ...item, status: 'pending' } : item);
        const hasPending = this.queue.some((q) => q.status === 'pending' || q.status === 'failed');
        if (hasPending) {
          this.state = 'pending_sync';
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch {
      // Storage full or quota exceeded
    }
  }

  /**
   * Queue a review for synchronization (works offline & mobile)
   */
  public async queueReview(cardId: string, rating: ReviewRating): Promise<string> {
    const clientReviewId = newReviewId();
    this.queueSubmission({
      cardId, rating, clientReviewId, reviewedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    });
    return clientReviewId;
  }

  /** Retains the study event ID when saving/retrying, so a crash cannot duplicate a review. */
  public queueSubmission(review: ReviewSubmission): void {
    this.queueSubmissions([review]);
  }

  public queueSubmissions(reviews: ReviewSubmission[]): void {
    const known = new Set(this.queue.map(item => item.id));
    const added: SyncQueueItem[] = [];
    for (const review of reviews) {
      if (known.has(review.clientReviewId)) continue;
      known.add(review.clientReviewId);
      added.push({
        id: review.clientReviewId, cardId: review.cardId, rating: review.rating,
        reviewedAt: review.reviewedAt, timezone: review.timezone, status: 'pending', attempts: 0,
      });
    }
    if (!added.length) return;
    const next = [...this.queue, ...added];
    if (typeof window !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(next));
    this.queue = next;
    this.state = 'pending_sync';
    this.notify();
  }

  /**
   * Process all pending reviews in the queue
   */
  public async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing) {
      return { synced: 0, failed: 0 };
    }

    // Old rev-* IDs never passed PostgreSQL's UUID lookup. Keep their local IDs for
    // study checkpoint recovery, but persist a stable UUID before the first retry.
    const normalized = this.queue.map(item => !isReviewUuid(item.id) && !item.serverReviewId
      ? { ...item, serverReviewId: newReviewId() } : item);
    if (normalized.some((item, index) => item !== this.queue[index])) {
      try {
        if (typeof window !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(normalized));
        this.queue = normalized;
      } catch {
        this.state = 'error';
        this.notify();
        return { synced: 0, failed: this.getSnapshot().pendingCount };
      }
    }

    const pending = this.queue.filter((q) => q.status === 'pending' || q.status === 'failed');
    if (pending.length === 0) {
      this.state = this.queue.length > 0 ? 'synced' : 'idle';
      this.notify();
      return { synced: 0, failed: 0 };
    }

    // Check online status
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.state = 'offline';
      this.notify();
      return { synced: 0, failed: pending.length };
    }

    this.isProcessing = true;
    this.state = 'syncing';
    this.notify();

    let synced = 0;
    let failed = 0;

    const blockedCards = new Set<string>();
    for (const item of pending) {
      if (blockedCards.has(item.cardId)) continue;
      item.status = 'syncing';
      item.attempts += 1;
      this.notify();

      try {
        const result: ReviewResult = await this.client.submitReview({
          cardId: item.cardId,
          clientReviewId: item.serverReviewId ?? item.id,
          rating: item.rating,
          reviewedAt: item.reviewedAt,
          timezone: item.timezone,
        });

        item.status = 'synced';
        synced += 1;
        this.lastSyncedAt = result.reviewedAt || new Date().toISOString();
      } catch (err: unknown) {
        failed += 1;
        item.status = 'failed';
        blockedCards.add(item.cardId);
        item.error = err instanceof Error ? err.message : 'Lỗi đồng bộ';
      }
    }

    this.isProcessing = false;

    // Prune items synced successfully after keeping last 20
    const syncedItems = this.queue.filter((q) => q.status === 'synced');
    if (syncedItems.length > 20) {
      const keepIds = new Set(syncedItems.slice(-20).map((i) => i.id));
      this.queue = this.queue.filter((q) => q.status !== 'synced' || keepIds.has(q.id));
    }

    this.saveToStorage();

    const remainingPending = this.queue.filter((q) => q.status === 'pending' || q.status === 'failed').length;
    if (remainingPending > 0) {
      this.state = failed > 0 ? 'error' : 'pending_sync';
      this.errorMessage = failed > 0 ? `Còn ${remainingPending} lượt ôn tập chưa thể đồng bộ.` : undefined;
    } else {
      this.state = 'synced';
      this.errorMessage = undefined;
    }

    this.notify();
    return { synced, failed };
  }

  public clearQueue() {
    this.queue = [];
    this.state = 'idle';
    this.saveToStorage();
    this.notify();
  }
}

export const defaultSrsSyncManager = new SrsSyncManager();
