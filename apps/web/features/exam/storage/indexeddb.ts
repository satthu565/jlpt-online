import type { StoredAttempt, OutboxEntry } from '../types';

export interface ExamStorageAdapter {
  saveAttempt(attempt: StoredAttempt): Promise<void>;
  getAttempt(attemptId: string): Promise<StoredAttempt | null>;
  enqueueOutbox(entry: Omit<OutboxEntry, 'id'>): Promise<number>;
  getPendingOutbox(attemptId: string): Promise<OutboxEntry[]>;
  markOutboxAcked(attemptId: string, maxSeq: number): Promise<void>;
  clearAttempt(attemptId: string): Promise<void>;
}

/**
 * In-memory fallback for environments without IndexedDB (e.g. Node tests, SSR)
 */
export class MemoryExamStorage implements ExamStorageAdapter {
  private attempts = new Map<string, StoredAttempt>();
  private outbox = new Map<number, OutboxEntry>();
  private nextOutboxId = 1;

  async saveAttempt(attempt: StoredAttempt): Promise<void> {
    this.attempts.set(attempt.attemptId, { ...attempt, updatedAt: new Date().toISOString() });
  }

  async getAttempt(attemptId: string): Promise<StoredAttempt | null> {
    const found = this.attempts.get(attemptId);
    return found ? { ...found } : null;
  }

  async enqueueOutbox(entry: Omit<OutboxEntry, 'id'>): Promise<number> {
    const id = this.nextOutboxId++;
    const fullEntry: OutboxEntry = { ...entry, id };
    this.outbox.set(id, fullEntry);
    return id;
  }

  async getPendingOutbox(attemptId: string): Promise<OutboxEntry[]> {
    const list: OutboxEntry[] = [];
    for (const item of this.outbox.values()) {
      if (item.attemptId === attemptId && item.status !== 'acked') {
        list.push({ ...item });
      }
    }
    return list.sort((a, b) => a.seq - b.seq);
  }

  async markOutboxAcked(attemptId: string, maxSeq: number): Promise<void> {
    const now = new Date().toISOString();
    for (const [id, item] of this.outbox.entries()) {
      if (item.attemptId === attemptId && item.seq <= maxSeq) {
        this.outbox.set(id, { ...item, status: 'acked', ackedAt: now });
      }
    }
    const current = this.attempts.get(attemptId);
    if (current && current.lastAckedSeq < maxSeq) {
      this.attempts.set(attemptId, { ...current, lastAckedSeq: maxSeq });
    }
  }

  async clearAttempt(attemptId: string): Promise<void> {
    this.attempts.delete(attemptId);
    for (const [id, item] of this.outbox.entries()) {
      if (item.attemptId === attemptId) {
        this.outbox.delete(id);
      }
    }
  }
}

/**
 * Browser IndexedDB storage implementation
 */
export class IndexedDBExamStorage implements ExamStorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private dbName: string;
  private version: number;

  constructor(dbName = 'jlpt_exam_storage', version = 1) {
    this.dbName = dbName;
    this.version = version;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available in current environment.'));
        return;
      }

      const req = window.indexedDB.open(this.dbName, this.version);

      req.onupgradeneeded = (ev) => {
        const db = (ev.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('attempts')) {
          db.createObjectStore('attempts', { keyPath: 'attemptId' });
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', {
            keyPath: 'id',
            autoIncrement: true,
          });
          outboxStore.createIndex('by_attempt', 'attemptId', { unique: false });
          outboxStore.createIndex('by_status', 'status', { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  async saveAttempt(attempt: StoredAttempt): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attempts', 'readwrite');
      const store = tx.objectStore('attempts');
      const req = store.put({ ...attempt, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAttempt(attemptId: string): Promise<StoredAttempt | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attempts', 'readonly');
      const store = tx.objectStore('attempts');
      const req = store.get(attemptId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async enqueueOutbox(entry: Omit<OutboxEntry, 'id'>): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      const req = store.add(entry);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingOutbox(attemptId: string): Promise<OutboxEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readonly');
      const store = tx.objectStore('outbox');
      const index = store.index('by_attempt');
      const req = index.getAll(IDBKeyRange.only(attemptId));

      req.onsuccess = () => {
        const all: OutboxEntry[] = req.result || [];
        const pending = all.filter((item) => item.status !== 'acked').sort((a, b) => a.seq - b.seq);
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async markOutboxAcked(attemptId: string, maxSeq: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['outbox', 'attempts'], 'readwrite');
      const outboxStore = tx.objectStore('outbox');
      const attemptStore = tx.objectStore('attempts');
      const index = outboxStore.index('by_attempt');
      const req = index.getAll(IDBKeyRange.only(attemptId));

      req.onsuccess = () => {
        const all: OutboxEntry[] = req.result || [];
        const now = new Date().toISOString();
        for (const item of all) {
          if (item.seq <= maxSeq && item.status !== 'acked') {
            item.status = 'acked';
            item.ackedAt = now;
            outboxStore.put(item);
          }
        }

        const getAttemptReq = attemptStore.get(attemptId);
        getAttemptReq.onsuccess = () => {
          const attempt = getAttemptReq.result as StoredAttempt | undefined;
          if (attempt && attempt.lastAckedSeq < maxSeq) {
            attempt.lastAckedSeq = maxSeq;
            attemptStore.put(attempt);
          }
        };
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAttempt(attemptId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attempts', 'outbox'], 'readwrite');
      const attemptStore = tx.objectStore('attempts');
      const outboxStore = tx.objectStore('outbox');

      attemptStore.delete(attemptId);

      const index = outboxStore.index('by_attempt');
      const req = index.getAll(IDBKeyRange.only(attemptId));
      req.onsuccess = () => {
        const all: OutboxEntry[] = req.result || [];
        for (const item of all) {
          if (item.id !== undefined) {
            outboxStore.delete(item.id);
          }
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * Returns default storage adapter based on environment
 */
export function createExamStorage(): ExamStorageAdapter {
  if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB) {
    return new IndexedDBExamStorage();
  }
  return new MemoryExamStorage();
}
