import { describe, it, expect } from 'vitest';
import { initializeFsrsCard, scheduleReview, Rating } from '../src/index.js';

describe('@jlpt/srs smoke test', () => {
  it('creates an empty FSRS card', () => {
    const card = initializeFsrsCard();
    expect(card).toBeDefined();
    expect(card.reps).toBe(0);
  });

  it('schedules next review with FSRS algorithm', () => {
    const now = new Date('2026-10-15T00:00:00Z');
    const card = initializeFsrsCard(now);
    const result = scheduleReview(card, Rating.Good, now);

    expect(result.card).toBeDefined();
    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(result.card.reps).toBe(1);
  });
});
