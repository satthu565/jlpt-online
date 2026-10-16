import { describe, it, expect } from 'vitest';
import {
  initializeFsrsCard,
  scheduleReview,
  Rating,
  State,
} from '../src/index.js';

describe('SRS Reference Vectors (Acceptance 1)', () => {
  it('correctly creates an empty FSRS card with initial state', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');
    const card = initializeFsrsCard(now);

    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.scheduled_days).toBe(0);
    expect(card.due.toISOString()).toBe('2026-10-15T00:00:00.000Z');
  });

  it('matches deterministic FSRS multi-step review trajectory', () => {
    const t0 = new Date('2026-10-15T00:00:00.000Z');
    const card0 = initializeFsrsCard(t0);

    // Step 1: First review with 'Good'
    // Starts in New, moves to Learning, reps = 1
    const res1 = scheduleReview(card0, 'good', t0, { enableFuzz: false, alignToMidnight: false });
    expect(res1.card.state).toBe(State.Learning);
    expect(res1.card.reps).toBe(1);
    expect(res1.card.lapses).toBe(0);
    expect(res1.card.scheduled_days).toBe(0);
    expect(res1.card.stability).toBeCloseTo(2.3065, 3);
    expect(res1.card.difficulty).toBeCloseTo(2.118, 2);

    // Step 2: Second review at due time with 'Good'
    // Moves to Review, reps = 2, scheduled_days = 2
    const t1 = res1.card.due;
    const res2 = scheduleReview(res1.card, 'good', t1, { enableFuzz: false, alignToMidnight: false });
    expect(res2.card.state).toBe(State.Review);
    expect(res2.card.reps).toBe(2);
    expect(res2.card.lapses).toBe(0);
    expect(res2.intervalDays).toBe(2);
    expect(res2.card.scheduled_days).toBe(2);
    expect(res2.card.stability).toBeCloseTo(2.3065, 3);
    expect(res2.card.difficulty).toBeCloseTo(2.111, 2);

    // Step 3: Third review with 'Easy'
    // Remains in Review, reps = 3, scheduled_days jumps to 19 days
    const t2 = res2.card.due;
    const res3 = scheduleReview(res2.card, 'easy', t2, { enableFuzz: false, alignToMidnight: false });
    expect(res3.card.state).toBe(State.Review);
    expect(res3.card.reps).toBe(3);
    expect(res3.card.lapses).toBe(0);
    expect(res3.intervalDays).toBe(19);
    expect(res3.card.stability).toBeGreaterThan(15);
    expect(res3.card.difficulty).toBeCloseTo(1.0, 1);

    // Step 4: Fourth review with 'Again' (lapse)
    // Moves to Relearning, reps = 4, lapses = 1, interval resets to 0
    const t3 = res3.card.due;
    const res4 = scheduleReview(res3.card, 'again', t3, { enableFuzz: false, alignToMidnight: false });
    expect(res4.card.state).toBe(State.Relearning);
    expect(res4.card.reps).toBe(4);
    expect(res4.card.lapses).toBe(1);
    expect(res4.intervalDays).toBe(0);
    expect(res4.card.difficulty).toBeGreaterThan(6.0);

    // Step 5: Fifth review with 'Good' (recovery from relearning)
    // Returns to Review, reps = 5, lapses = 1
    const t4 = res4.card.due;
    const res5 = scheduleReview(res4.card, 'good', t4, { enableFuzz: false, alignToMidnight: false });
    expect(res5.card.state).toBe(State.Review);
    expect(res5.card.reps).toBe(5);
    expect(res5.card.lapses).toBe(1);
    expect(res5.intervalDays).toBe(2);
  });

  it('evaluates all 4 rating choices correctly on initial card', () => {
    const now = new Date('2026-10-15T00:00:00.000Z');

    const cardAgain = scheduleReview(initializeFsrsCard(now), Rating.Again, now, { enableFuzz: false });
    expect(cardAgain.card.state).toBe(State.Learning);
    expect(cardAgain.card.difficulty).toBeGreaterThan(6.0);

    const cardHard = scheduleReview(initializeFsrsCard(now), Rating.Hard, now, { enableFuzz: false });
    expect(cardHard.card.state).toBe(State.Learning);
    expect(cardHard.card.difficulty).toBeGreaterThan(4.0);

    const cardGood = scheduleReview(initializeFsrsCard(now), Rating.Good, now, { enableFuzz: false });
    expect(cardGood.card.state).toBe(State.Learning);
    expect(cardGood.card.difficulty).toBeCloseTo(2.118, 2);

    const cardEasy = scheduleReview(initializeFsrsCard(now), Rating.Easy, now, { enableFuzz: false });
    // First-time easy review moves directly to Review
    expect(cardEasy.card.state).toBe(State.Review);
    expect(cardEasy.card.difficulty).toBeCloseTo(1.0, 1);
    expect(cardEasy.intervalDays).toBeGreaterThanOrEqual(4);
  });

  it('guarantees 100% determinism over 50 repeated runs', () => {
    const t0 = new Date('2026-10-15T08:00:00.000Z');
    const firstRun = scheduleReview(initializeFsrsCard(t0), 'good', t0, { enableFuzz: false });

    for (let i = 0; i < 50; i++) {
      const run = scheduleReview(initializeFsrsCard(t0), 'good', t0, { enableFuzz: false });
      expect(run.card.stability).toBe(firstRun.card.stability);
      expect(run.card.difficulty).toBe(firstRun.card.difficulty);
      expect(run.card.scheduled_days).toBe(firstRun.card.scheduled_days);
      expect(run.card.due.getTime()).toBe(firstRun.card.due.getTime());
    }
  });
});
