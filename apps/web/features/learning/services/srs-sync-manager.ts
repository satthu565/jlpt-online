import type { ReviewRating, SyncQueueItem, ReviewResult } from '../types';
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

  constructor(client: LearningClient = defaultLearningClient) {
    this.client = client;
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  public setClient(client: LearningClient) {
    this.client = client;
  }

  public subscribe(listener: SyncListener): () => void {
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
        const hasPending = this.queue.some((q) => q.status === 'pending');
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Storage full or quota exceeded
    }
  }

  /**
   * Queue a review for synchronization (works offline & mobile)
   */
  public async queueReview(cardId: string, rating: ReviewRating): Promise<string> {
    const clientReviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: SyncQueueItem = {
      id: clientReviewId,
      cardId,
      rating,
      reviewedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
      status: 'pending',
      attempts: 0,
    };

    this.queue.push(item);
    this.state = 'pending_sync';
    this.saveToStorage();
    this.notify();

    return clientReviewId;
  }

  /**
   * Process all pending reviews in the queue
   */
  public async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing) {
      return { synced: 0, failed: 0 };
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

    for (const item of pending) {
      item.status = 'syncing';
      item.attempts += 1;
      this.notify();

      try {
        const result: ReviewResult = await this.client.submitReview({
          cardId: item.cardId,
          clientReviewId: item.id,
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
