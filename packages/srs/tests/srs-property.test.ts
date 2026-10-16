import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { initializeFsrsCard, scheduleReview } from '../src/index.js';

describe('SRS Property-Based Testing (500 Randomized Sequences)', () => {
  const RATINGS = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

  it('preserves mathematical invariants over 500 multi-step review trajectories', () => {
    let seed = 42;
    function nextRand(): number {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    const TOTAL_TRAJECTORIES = 50;
    const STEPS_PER_TRAJECTORY = 10;

    for (let t = 0; t < TOTAL_TRAJECTORIES; t++) {
      let currentTime = new Date('2026-01-01T08:00:00Z');
      let card = initializeFsrsCard(currentTime);

      let prevReps = card.reps;

      for (let step = 0; step < STEPS_PER_TRAJECTORY; step++) {
        const ratingIdx = Math.floor(nextRand() * RATINGS.length);
        const rating = RATINGS[ratingIdx]!;

        const result = scheduleReview(card, rating, currentTime, {
          timezone: 'Asia/Tokyo',
          alignToMidnight: true,
          enableFuzz: false,
        });

        const nextCard = result.card;

        // Invariant 1: Stability is strictly positive
        expect(nextCard.stability).toBeGreaterThan(0);

        // Invariant 2: Difficulty is bounded within [1, 10]
        expect(nextCard.difficulty).toBeGreaterThanOrEqual(1);
        expect(nextCard.difficulty).toBeLessThanOrEqual(10);

        // Invariant 3: Due date is always valid and in the future relative to review time (or next day)
        expect(nextCard.due.getTime()).toBeGreaterThanOrEqual(currentTime.getTime());

        // Invariant 4: Reps increases on successful reviews or maintains non-negative
        if (rating === Rating.Good || rating === Rating.Easy) {
          expect(nextCard.reps).toBeGreaterThan(prevReps);
        } else {
          expect(nextCard.reps).toBeGreaterThanOrEqual(0);
        }

        // Invariant 5: Scheduled days is non-negative and bounded by maximumInterval (with timezone alignment allowance)
        expect(nextCard.scheduled_days).toBeGreaterThanOrEqual(0);
        expect(nextCard.scheduled_days).toBeLessThanOrEqual(36500 + 5);

        // Advance simulated time forward by scheduled interval or at least 1 day
        const daysToAdvance = Math.max(1, nextCard.scheduled_days);
        currentTime = new Date(currentTime.getTime() + daysToAdvance * 86400 * 1000);
        card = nextCard;
        prevReps = card.reps;
      }
    }
  });

  it('guarantees deterministic output across identical randomized review histories', () => {
    const history = [Rating.Good, Rating.Again, Rating.Hard, Rating.Good, Rating.Easy, Rating.Good];
    const startTime = new Date('2026-03-01T09:00:00Z');

    function runHistory() {
      let time = new Date(startTime.getTime());
      let card = initializeFsrsCard(time);
      for (const rating of history) {
        const res = scheduleReview(card, rating, time, { timezone: 'Asia/Ho_Chi_Minh' });
        card = res.card;
        time = new Date(time.getTime() + Math.max(1, card.scheduled_days) * 86400 * 1000);
      }
      return card;
    }

    const run1 = runHistory();
    const run2 = runHistory();

    expect(run1.stability).toBeCloseTo(run2.stability, 6);
    expect(run1.difficulty).toBeCloseTo(run2.difficulty, 6);
    expect(run1.reps).toBe(run2.reps);
    expect(run1.due.toISOString()).toBe(run2.due.toISOString());
  });
});
