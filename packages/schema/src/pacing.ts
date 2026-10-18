import { z } from 'zod';
import { LevelSchema, MondaiTypeSchema } from './enums.js';

export const MondaiPacingSchema = z.object({
  mondaiType: MondaiTypeSchema,
  name: z.string(),
  questionCount: z.number().int().positive(),
  recommendedSecPerQuestion: z.number().int().positive(),
  recommendedTotalSec: z.number().int().positive(),
});
export type MondaiPacing = z.infer<typeof MondaiPacingSchema>;

export const PacingMilestoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  targetMondaiIndex: z.number().int().nonnegative(),
  targetQuestionIndex: z.number().int().positive(),
  targetElapsedSec: z.number().int().positive(),
  targetRemainingSec: z.number().int().nonnegative(),
  cumulativePercent: z.number().min(0).max(100),
});
export type PacingMilestone = z.infer<typeof PacingMilestoneSchema>;

export const SectionPacingModelSchema = z.object({
  level: LevelSchema,
  sectionCode: z.string(),
  sectionTitle: z.string(),
  totalDurationSec: z.number().int().positive(),
  bufferSec: z.number().int().nonnegative(),
  totalQuestions: z.number().int().positive(),
  mondaiPacing: z.array(MondaiPacingSchema),
  milestones: z.array(PacingMilestoneSchema),
});
export type SectionPacingModel = z.infer<typeof SectionPacingModelSchema>;

export const PaceStatusSchema = z.enum([
  'AHEAD',
  'ON_TRACK',
  'BEHIND',
  'CRITICAL',
]);
export type PaceStatus = z.infer<typeof PaceStatusSchema>;

export const PacingEvaluationSchema = z.object({
  paceStatus: PaceStatusSchema,
  currentQuestionIndex: z.number().int().positive(),
  expectedQuestionIndex: z.number().int().positive(),
  diffQuestions: z.number().int(),
  elapsedSec: z.number().int().nonnegative(),
  expectedElapsedSec: z.number().int().nonnegative(),
  diffSec: z.number().int(),
  remainingSec: z.number().int().nonnegative(),
  recommendedPacePerRemainingQuestionSec: z.number().nonnegative(),
  currentMilestone: PacingMilestoneSchema.optional(),
  message: z.string(),
});
export type PacingEvaluation = z.infer<typeof PacingEvaluationSchema>;
