import { describe, it, expect } from 'vitest';
import {
  initializeFsrsCard,
  SrsReviewRegistry,
} from '../src/index.js';

describe('SRS Idempotency and Deduplication', () => {
  it('replays identical clientReviewId without double-incrementing reps or altering interval', () => {
    const registry = new SrsReviewRegistry();
    const t0 = new Date('2026-10-15T09:00:00.000Z');
    const card = initializeFsrsCard(t0);
    const clientReviewId = '550e8400-e29b-41d4-a716-446655440000';

    // First attempt: processes review
    const firstResult = registry.processReview({
      clientReviewId,
      card,
      rating: 'good',
      reviewedAt: t0,
    });

    expect(firstResult.isIdempotentReplay).toBeFalsy();
    expect(firstResult.card.reps).toBe(1);

    // Second attempt with exact same clientReviewId (e.g. network retry or cross-device replay)
    const secondResult = registry.processReview({
      clientReviewId,
      card,
      rating: 'good',
      reviewedAt: t0,
    });

    expect(secondResult.isIdempotentReplay).toBe(true);
    expect(secondResult.card.reps).toBe(1);
    expect(secondResult.card.due.getTime()).toBe(firstResult.card.due.getTime());
    expect(secondResult.intervalDays).toBe(firstResult.intervalDays);
  });
});
