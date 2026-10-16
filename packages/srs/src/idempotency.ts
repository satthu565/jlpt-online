import type { Card, Grade } from 'ts-fsrs';
import type { ReviewScheduleResult, SRSReviewRatingString, TimezoneScheduleOptions } from './types.js';
import { scheduleReview } from './fsrs.js';

export interface ProcessReviewInput {
  clientReviewId: string;
  card: Card;
  rating: Grade | SRSReviewRatingString;
  reviewedAt: Date;
  options?: TimezoneScheduleOptions;
}

export class SrsReviewRegistry {
  private readonly processedReviews = new Map<string, ReviewScheduleResult>();

  public processReview(input: ProcessReviewInput): ReviewScheduleResult {
    const existing = this.processedReviews.get(input.clientReviewId);
    if (existing) {
      return {
        ...existing,
        isIdempotentReplay: true,
      };
    }

    const result = scheduleReview(
      input.card,
      input.rating,
      input.reviewedAt,
      input.options,
    );

    this.processedReviews.set(input.clientReviewId, result);
    return result;
  }

  public has(clientReviewId: string): boolean {
    return this.processedReviews.has(clientReviewId);
  }

  public clear(): void {
    this.processedReviews.clear();
  }
}
