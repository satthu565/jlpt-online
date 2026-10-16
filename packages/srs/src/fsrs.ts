import {
  fsrs,
  createEmptyCard,
  Rating,
  generatorParameters,
  type Card,
  type Grade,
} from 'ts-fsrs';
import type { ReviewScheduleResult, SRSReviewRatingString, TimezoneScheduleOptions } from './types.js';
import { alignIntervalToMidnight } from './timezone.js';

export function parseRating(rating: SRSReviewRatingString | Rating | Grade): Grade {
  if (typeof rating === 'string') {
    switch (rating) {
      case 'again':
        return Rating.Again as Grade;
      case 'hard':
        return Rating.Hard as Grade;
      case 'good':
        return Rating.Good as Grade;
      case 'easy':
        return Rating.Easy as Grade;
      default:
        throw new Error(`Invalid SRS review rating string: ${rating}`);
    }
  }
  return rating as Grade;
}

export function initializeFsrsCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function scheduleReview(
  card: Card,
  grade: Grade | SRSReviewRatingString | Rating,
  reviewTime: Date = new Date(),
  options: TimezoneScheduleOptions = {},
): ReviewScheduleResult {
  const numericGrade = parseRating(grade);
  const timezone = options.timezone ?? 'Asia/Ho_Chi_Minh';
  const cutoffHour = options.cutoffHour ?? 0;
  const enableFuzz = options.enableFuzz ?? false;
  const requestRetention = options.requestRetention ?? 0.9;
  const maximumInterval = options.maximumInterval ?? 36500;

  const f = fsrs(
    generatorParameters({
      enable_fuzz: enableFuzz,
      request_retention: requestRetention,
      maximum_interval: maximumInterval,
    }),
  );

  const rawItem = f.next(card, reviewTime, numericGrade);
  const scheduledDays = rawItem.card.scheduled_days;
  const shouldAlignMidnight = options.alignToMidnight ?? true;

  let finalDue: Date;
  if (scheduledDays > 0 && shouldAlignMidnight) {
    // Multi-day interval: align to local midnight boundary of target day
    finalDue = alignIntervalToMidnight(reviewTime, scheduledDays, timezone, cutoffHour);
  } else {
    // Intraday interval or raw interval: keep precise timestamp
    finalDue = rawItem.card.due;
  }

  const updatedCard: Card = {
    ...rawItem.card,
    due: finalDue,
  };

  return {
    card: updatedCard,
    log: rawItem.log,
    nextDueAt: finalDue,
    intervalDays: scheduledDays,
  };
}
