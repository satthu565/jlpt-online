import { z } from 'zod';
import { FSRSRatingSchema } from '../enums.js';

export const SRSReviewRatingSchema = FSRSRatingSchema;
export type SRSReviewRating = z.infer<typeof SRSReviewRatingSchema>;

export const SRSCardStateSchema = z.enum(['new', 'learning', 'review', 'relearning']);
export type SRSCardState = z.infer<typeof SRSCardStateSchema>;

export const SRSCardSchema = z.object({
  id: z.string().uuid(),
  due: z.string().datetime(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsedDays: z.number().nonnegative(),
  scheduledDays: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: SRSCardStateSchema,
  lastReview: z.string().datetime().optional(),
});
export type SRSCard = z.infer<typeof SRSCardSchema>;

export const SRSReviewLogSchema = z.object({
  rating: SRSReviewRatingSchema,
  state: SRSCardStateSchema,
  due: z.string().datetime(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsedDays: z.number().nonnegative(),
  lastElapsedDays: z.number().nonnegative(),
  scheduledDays: z.number().nonnegative(),
  review: z.string().datetime(),
});
export type SRSReviewLog = z.infer<typeof SRSReviewLogSchema>;

export const SRSScheduleOptionsSchema = z.object({
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  cutoffHour: z.number().int().min(0).max(23).default(0),
  desiredRetention: z.number().min(0.7).max(0.99).default(0.9),
  maxInterval: z.number().int().positive().default(36500),
});
export type SRSScheduleOptions = z.infer<typeof SRSScheduleOptionsSchema>;

export const SRSScheduleResultSchema = z.object({
  card: SRSCardSchema,
  log: SRSReviewLogSchema,
  nextDueAt: z.string().datetime(),
  intervalDays: z.number().int().nonnegative(),
});
export type SRSScheduleResult = z.infer<typeof SRSScheduleResultSchema>;

export const SRSDueCardItemSchema = z.object({
  cardId: z.string().uuid(),
  front: z.unknown(),
  back: z.unknown(),
  dueAt: z.string().datetime(),
  state: SRSCardStateSchema,
  reps: z.number().int().nonnegative(),
  itemType: z.enum(['vocab', 'grammar', 'kanji']).optional(),
});
export type SRSDueCardItem = z.infer<typeof SRSDueCardItemSchema>;

export const SRSDueCardsResponseSchema = z.object({
  items: z.array(SRSDueCardItemSchema),
  totalCount: z.number().int().nonnegative(),
  timezone: z.string(),
  asOf: z.string().datetime(),
});
export type SRSDueCardsResponse = z.infer<typeof SRSDueCardsResponseSchema>;
