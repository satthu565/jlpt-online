import { describe, it, expect } from 'vitest';
import {
  alignIntervalToMidnight,
  getStartOfLocalDay,
  getEndOfLocalDay,
  isCardDue,
  filterDueCards,
  scheduleReview,
  initializeFsrsCard,
  State,
} from '../src/index.js';

describe('SRS Timezone Midnight (Acceptance 1)', () => {
  it('correctly calculates local midnight in Asia/Ho_Chi_Minh (UTC+7)', () => {
    // 2026-10-15 14:00 UTC = 2026-10-15 21:00 ICT
    const baseDate = new Date('2026-10-15T14:00:00.000Z');
    // Align +1 day -> target local date is 2026-10-16.
    // Midnight of 2026-10-16 in Asia/Ho_Chi_Minh is 2026-10-15T17:00:00.000Z
    const alignedMidnight = alignIntervalToMidnight(baseDate, 1, 'Asia/Ho_Chi_Minh');

    expect(alignedMidnight.toISOString()).toBe('2026-10-15T17:00:00.000Z');
  });

  it('correctly calculates local midnight in Asia/Tokyo (UTC+9)', () => {
    // 2026-10-15 14:00 UTC = 2026-10-15 23:00 JST
    const baseDate = new Date('2026-10-15T14:00:00.000Z');
    // Align +1 day -> target local date is 2026-10-16.
    // Midnight of 2026-10-16 in Asia/Tokyo is 2026-10-15T15:00:00.000Z
    const alignedMidnight = alignIntervalToMidnight(baseDate, 1, 'Asia/Tokyo');

    expect(alignedMidnight.toISOString()).toBe('2026-10-15T15:00:00.000Z');
  });

  it('correctly calculates local midnight in America/New_York (UTC-4)', () => {
    // 2026-10-15 14:00 UTC = 2026-10-15 10:00 EDT
    const baseDate = new Date('2026-10-15T14:00:00.000Z');
    // Align +2 days -> target local date is 2026-10-17.
    // Midnight of 2026-10-17 in America/New_York (EDT, UTC-4) is 2026-10-17T04:00:00.000Z
    const alignedMidnight = alignIntervalToMidnight(baseDate, 2, 'America/New_York');

    expect(alignedMidnight.toISOString()).toBe('2026-10-17T04:00:00.000Z');
  });

  it('respects cutoff hour (e.g. 04:00 AM) for late-night learners', () => {
    // 2026-10-16 02:00 ICT = 2026-10-15 19:00 UTC (after midnight, but before 04:00 AM cutoff)
    const lateNightDate = new Date('2026-10-15T19:00:00.000Z');

    // With cutoffHour = 4, this session is counted as part of Oct 15 logical day.
    // Scheduled +1 day should therefore be Oct 16 at 04:00 ICT (Oct 15 21:00 UTC)
    const alignedCutoff = alignIntervalToMidnight(
      lateNightDate,
      1,
      'Asia/Ho_Chi_Minh',
      4,
    );

    expect(alignedCutoff.toISOString()).toBe('2026-10-15T21:00:00.000Z');
  });

  it('accurately detects due cards across timezone midnight transitions', () => {
    const timezone = 'Asia/Ho_Chi_Minh';
    // Current time: 2026-10-16 10:00 ICT = 2026-10-16 03:00 UTC
    const now = new Date('2026-10-16T03:00:00.000Z');

    // Card A: Due yesterday (2026-10-15 10:00 UTC) -> OVERDUE
    const cardA = { id: 'card-a', due: '2026-10-15T10:00:00.000Z' };

    // Card B: Due at today midnight ICT (2026-10-15 17:00:00Z) -> DUE TODAY
    const cardB = { id: 'card-b', due: '2026-10-15T17:00:00.000Z' };

    // Card C: Due at 23:59:00 ICT tonight (2026-10-16 16:59:00Z) -> DUE TODAY
    const cardC = { id: 'card-c', due: '2026-10-16T16:59:00.000Z' };

    // Card D: Due tomorrow at midnight ICT (2026-10-16 17:00:00Z) -> NOT DUE YET
    const cardD = { id: 'card-d', due: '2026-10-16T17:00:00.000Z' };

    expect(isCardDue(cardA.due, now, timezone)).toBe(true);
    expect(isCardDue(cardB.due, now, timezone)).toBe(true);
    expect(isCardDue(cardC.due, now, timezone)).toBe(true);
    expect(isCardDue(cardD.due, now, timezone)).toBe(false);

    const dueList = filterDueCards([cardA, cardB, cardC, cardD], now, timezone);
    expect(dueList.map((c) => c.id)).toEqual(['card-a', 'card-b', 'card-c']);
  });

  it('integrates timezone midnight alignment into scheduleReview', () => {
    // Start with a card in Review state with scheduledDays > 0
    const t0 = new Date('2026-10-15T08:00:00.000Z');
    const newCard = initializeFsrsCard(t0);

    // Review with Easy so it immediately transitions to Review state with multi-day interval
    const result = scheduleReview(newCard, 'easy', t0, {
      timezone: 'Asia/Ho_Chi_Minh',
      enableFuzz: false,
    });

    expect(result.card.state).toBe(State.Review);
    expect(result.intervalDays).toBeGreaterThanOrEqual(4);

    // The resulting card.due must be aligned exactly to midnight ICT (ends in 17:00:00.000Z)
    expect(result.card.due.toISOString()).toMatch(/T17:00:00\.000Z$/);
  });
});
