import { Rating, State, type Card, type RecordLogItem, type Grade } from 'ts-fsrs';

export { Rating, State, type Card, type RecordLogItem, type Grade };

export type SRSReviewRatingString = 'again' | 'hard' | 'good' | 'easy';

export interface TimezoneScheduleOptions {
  timezone?: string;
  alignToMidnight?: boolean;
  cutoffHour?: number;
  enableFuzz?: boolean;
  requestRetention?: number;
  maximumInterval?: number;
}

export interface DueQueryOptions {
  timezone?: string;
  cutoffHour?: number;
  limit?: number;
  asOf?: Date;
}

export interface ReviewScheduleResult {
  card: Card;
  log: RecordLogItem['log'];
  nextDueAt: Date;
  intervalDays: number;
  isIdempotentReplay?: boolean;
}
