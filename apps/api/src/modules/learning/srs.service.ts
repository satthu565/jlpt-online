import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { cardReviews, cardSchedules, cards } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];
import type {
  CardScheduleDto,
  ReviewResultDto,
  SubmitReviewDto,
} from './learning.types.js';

/**
 * Calculates local midnight in the specified timezone and returns corresponding UTC Date.
 * E.g., for Asia/Ho_Chi_Minh (UTC+7), local midnight 2026-10-18 00:00:00 is 2026-10-17 17:00:00Z.
 */
export function alignIntervalToMidnight(
  reviewTime: Date,
  intervalDays: number,
  timezone: string = 'Asia/Ho_Chi_Minh',
): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(reviewTime);
  const yearStr = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const monthStr = parts.find((p) => p.type === 'month')?.value ?? '01';
  const dayStr = parts.find((p) => p.type === 'day')?.value ?? '01';

  // Construct target local date by adding intervalDays
  const targetDate = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
  targetDate.setUTCDate(targetDate.getUTCDate() + intervalDays);

  const tYear = targetDate.getUTCFullYear();
  const tMonth = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const tDay = String(targetDate.getUTCDate()).padStart(2, '0');
  const localIsoMidnight = `${tYear}-${tMonth}-${tDay}T00:00:00`;

  // Determine timezone offset in milliseconds for that target date
  const offsetMs = getTimezoneOffsetMs(targetDate, timezone);
  const targetUtcMs = Date.parse(`${localIsoMidnight}Z`) - offsetMs;
  return new Date(targetUtcMs);
}

export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return tzDate.getTime() - utcDate.getTime();
}

export function isCardDue(dueAt: Date, timezone: string, now: Date = new Date()): boolean {
  if (dueAt.getTime() <= now.getTime()) {
    return true;
  }
  // Check if card is due today in the user's local timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const nowDay = formatter.format(now);
  const dueDay = formatter.format(dueAt);
  return dueDay <= nowDay;
}

@Injectable()
export class SrsService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Initializes or gets existing card schedule.
   */
  async initializeSchedule(cardId: string, initialDueAt?: Date): Promise<CardScheduleDto> {
    const existing = await this.dbClient.db
      .select()
      .from(cardSchedules)
      .where(eq(cardSchedules.cardId, cardId))
      .limit(1);

    if (existing.length > 0) {
      const s = existing[0]!;
      return {
        cardId: s.cardId,
        dueAt: s.dueAt.toISOString(),
        intervalDays: s.intervalDays,
        easeFactor: s.easeFactor,
        repetitions: s.repetitions,
        state: s.state as CardScheduleDto['state'],
      };
    }

    const due = initialDueAt ?? new Date();
    await this.dbClient.db.insert(cardSchedules).values({
      cardId,
      dueAt: due,
      intervalDays: 1,
      easeFactor: 250,
      repetitions: 0,
      state: 'learning',
    });

    return {
      cardId,
      dueAt: due.toISOString(),
      intervalDays: 1,
      easeFactor: 250,
      repetitions: 0,
      state: 'learning',
    };
  }

  /**
   * Submits card review with cross-device deduplication idempotency (Acceptance 1, VOC-11, VOC-18).
   * If a review with clientReviewId was already processed, returns existing outcome without duplicating schedule.
   */
  async processReview(
    userId: string,
    dto: SubmitReviewDto,
  ): Promise<ReviewResultDto> {
    const timezone = dto.timezone ?? 'Asia/Ho_Chi_Minh';
    const reviewTime = dto.reviewedAt ? new Date(dto.reviewedAt) : new Date();

    // 0. Verify card ownership (IDOR & resource authorization protection)
    const userCards = await this.dbClient.db
      .select()
      .from(cards)
      .where(and(eq(cards.id, dto.cardId), eq(cards.userId, userId)))
      .limit(1);

    if (userCards.length === 0) {
      throw new NotFoundException(`Card '${dto.cardId}' not found for user '${userId}'`);
    }

    // 1. Cross-Device Idempotency Check:
    // If clientReviewId was already submitted for this user and card, return current schedule without modifying!
    const existingReviews = await this.dbClient.db
      .select()
      .from(cardReviews)
      .where(
        and(
          eq(cardReviews.userId, userId),
          eq(cardReviews.clientReviewId, dto.clientReviewId),
        ),
      )
      .limit(1);

    const schedules = await this.dbClient.db
      .select()
      .from(cardSchedules)
      .where(eq(cardSchedules.cardId, dto.cardId))
      .limit(1);

    if (existingReviews.length > 0 && schedules.length > 0) {
      const s = schedules[0]!;
      const r = existingReviews[0]!;
      return {
        cardId: s.cardId,
        nextDueAt: s.dueAt.toISOString(),
        intervalDays: s.intervalDays,
        easeFactor: s.easeFactor,
        repetitions: s.repetitions,
        state: s.state,
        isIdempotentReplay: true,
        reviewedAt: r.reviewedAt.toISOString(),
      };
    }

    let currentSchedule = schedules.length > 0 ? schedules[0]! : null;
    if (!currentSchedule) {
      await this.initializeSchedule(dto.cardId);
      const fetched = await this.dbClient.db
        .select()
        .from(cardSchedules)
        .where(eq(cardSchedules.cardId, dto.cardId))
        .limit(1);
      currentSchedule = fetched[0]!;
    }

    // 2. Compute SRS progression
    let ef = currentSchedule.easeFactor;
    let reps = currentSchedule.repetitions;
    let interval = currentSchedule.intervalDays;
    let newState = currentSchedule.state;

    switch (dto.rating) {
      case 1: // Again / Lapse
        reps = 0;
        interval = 1;
        ef = Math.max(130, ef - 20);
        newState = 'relearning';
        break;

      case 2: // Hard
        interval = Math.max(1, Math.round(interval * 1.2));
        ef = Math.max(130, ef - 15);
        reps += 1;
        newState = 'review';
        break;

      case 3: // Good
        if (reps === 0) {
          interval = 1;
        } else if (reps === 1) {
          interval = 6;
        } else {
          interval = Math.max(1, Math.round(interval * (ef / 100)));
        }
        reps += 1;
        newState = 'review';
        break;

      case 4: // Easy
        if (reps === 0) {
          interval = 4;
        } else if (reps === 1) {
          interval = 10;
        } else {
          interval = Math.max(1, Math.round(interval * (ef / 100) * 1.3));
        }
        ef += 15;
        reps += 1;
        newState = 'review';
        break;
    }

    // 3. Align next due time to local midnight boundary in user's timezone
    const nextDue = alignIntervalToMidnight(reviewTime, interval, timezone);

    // 4. Update schedule and record review atomically within database transaction
    await this.dbClient.db.transaction(async (tx: DbTx) => {
      await tx
        .update(cardSchedules)
        .set({
          dueAt: nextDue,
          intervalDays: interval,
          easeFactor: ef,
          repetitions: reps,
          state: newState,
        })
        .where(eq(cardSchedules.cardId, dto.cardId));

      await tx.insert(cardReviews).values({
        id: generateUuidV7(),
        cardId: dto.cardId,
        userId,
        clientReviewId: dto.clientReviewId,
        rating: dto.rating,
        reviewedAt: reviewTime,
      });
    });

    return {
      cardId: dto.cardId,
      nextDueAt: nextDue.toISOString(),
      intervalDays: interval,
      easeFactor: ef,
      repetitions: reps,
      state: newState,
      isIdempotentReplay: false,
      reviewedAt: reviewTime.toISOString(),
    };
  }

  /**
   * Retrieves all cards due for review for the user, taking into account timezone midnight boundaries.
   */
  async getDueCards(userId: string, timezone = 'Asia/Ho_Chi_Minh', limit = 50) {
    const now = new Date();
    // Fetch user cards that have schedules
    const dueRows = await this.dbClient.db
      .select({
        cardId: cards.id,
        notebookItemId: cards.notebookItemId,
        front: cards.front,
        back: cards.back,
        status: cards.status,
        dueAt: cardSchedules.dueAt,
        intervalDays: cardSchedules.intervalDays,
        repetitions: cardSchedules.repetitions,
        state: cardSchedules.state,
      })
      .from(cards)
      .innerJoin(cardSchedules, eq(cards.id, cardSchedules.cardId))
      .where(and(eq(cards.userId, userId), eq(cards.status, 'active')));

    const filtered = dueRows
      .filter((r: (typeof dueRows)[number]) => isCardDue(r.dueAt, timezone, now))
      .slice(0, limit);

    return {
      items: filtered.map((r: (typeof dueRows)[number]) => ({
        cardId: r.cardId,
        notebookItemId: r.notebookItemId,
        front: r.front as Record<string, unknown>,
        back: r.back as Record<string, unknown>,
        dueAt: r.dueAt.toISOString(),
        intervalDays: r.intervalDays,
        repetitions: r.repetitions,
        state: r.state,
      })),
      totalCount: filtered.length,
      timezone,
      asOf: now.toISOString(),
    };
  }
}
