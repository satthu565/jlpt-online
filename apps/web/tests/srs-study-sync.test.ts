import { describe, expect, it, vi } from 'vitest';
import { LearningClient } from '../features/learning/services/learning-client';
import { SrsSyncManager } from '../features/learning/services/srs-sync-manager';
import type { ReviewSubmission } from '../features/learning/types';

const review = (id: string, cardId = 'one'): ReviewSubmission => ({
  clientReviewId: id, cardId, rating: 3, reviewedAt: '2026-11-10T10:00:00Z', timezone: 'Asia/Ho_Chi_Minh',
});
describe('SRS durable study save', () => {
  it('deduplicates a retried save using the same review IDs', async () => {
    const submitReview = vi.fn().mockResolvedValue({ reviewedAt: '2026-11-10T10:00:00Z' });
    const manager = new SrsSyncManager({ submitReview } as unknown as LearningClient);
    manager.queueSubmissions([review('r1'), review('r2', 'two'), review('r1')]);
    manager.queueSubmissions([review('r1'), review('r2', 'two')]);
    expect(manager.getQueue()).toHaveLength(2);
    await manager.processQueue();
    expect(submitReview).toHaveBeenCalledTimes(2);
    manager.queueSubmissions([review('r1')]);
    await manager.processQueue();
    expect(submitReview).toHaveBeenCalledTimes(2);
  });
  it('does not submit a later review of a card before an earlier failed review', async () => {
    let fail = true;
    const submitted: string[] = [];
    const submitReview = vi.fn(async (input: ReviewSubmission) => {
      submitted.push(input.clientReviewId);
      if (fail && input.clientReviewId === 'r1') throw new Error('offline');
      return { reviewedAt: input.reviewedAt };
    });
    const manager = new SrsSyncManager({ submitReview } as unknown as LearningClient);
    manager.queueSubmissions([review('r1'), review('r2'), review('r3', 'two')]);
    await manager.processQueue();
    expect(submitted).toEqual(['r1', 'r3']);
    expect(manager.getSnapshot().pendingCount).toBe(2);
    fail = false;
    await manager.processQueue();
    expect(submitted).toEqual(['r1', 'r3', 'r1', 'r2']);
    expect(manager.getSnapshot().pendingCount).toBe(0);
  });
});
