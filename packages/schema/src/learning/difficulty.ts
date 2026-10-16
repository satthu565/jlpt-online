import { z } from 'zod';
import { LevelSchema } from '../enums.js';

export const ItemDifficultyScaleSchema = z.enum(['easy', 'medium', 'hard', 'very_hard']);
export type ItemDifficultyScale = z.infer<typeof ItemDifficultyScaleSchema>;

export const DifficultySourceSchema = z.enum(['estimated', 'empirical', 'expert']);
export type DifficultySource = z.infer<typeof DifficultySourceSchema>;

export const DifficultyLabelSchema = z.object({
  level: LevelSchema,
  scale: ItemDifficultyScaleSchema,
  score: z.number().min(0).max(100),
  source: DifficultySourceSchema,
  confidence: z.enum(['uncalibrated', 'moderate', 'high']),
});
export type DifficultyLabel = z.infer<typeof DifficultyLabelSchema>;

export const EmpiricalStatusSchema = z.enum(['INSUFFICIENT_DATA', 'CALIBRATED']);
export type EmpiricalStatus = z.infer<typeof EmpiricalStatusSchema>;

export const EmpiricalDifficultyStatsSchema = z.object({
  questionId: z.string().uuid(),
  totalAttempts: z.number().int().nonnegative(),
  correctAttempts: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  blankAttempts: z.number().int().nonnegative(),
  errorRate: z.number().min(0).max(1),
  difficultyIndex: z.number().min(0).max(100),
  standardError: z.number().min(0),
  confidenceInterval: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  hasConclusion: z.boolean(),
  status: EmpiricalStatusSchema,
  sampleSize: z.number().int().nonnegative(),
  requiredSampleSize: z.number().int().positive(),
  updatedAt: z.string().datetime(),
});
export type EmpiricalDifficultyStats = z.infer<typeof EmpiricalDifficultyStatsSchema>;

export const DistractorStatsSchema = z.object({
  optionIndex: z.number().int().min(1).max(4),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  isCorrect: z.boolean(),
  isFunctional: z.boolean(),
  isExcessive: z.boolean(),
});
export type DistractorStats = z.infer<typeof DistractorStatsSchema>;

export const DiscriminationRatingSchema = z.enum([
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'FLAWED_KEY',
]);
export type DiscriminationRating = z.infer<typeof DiscriminationRatingSchema>;

export const ItemQualityFlagSchema = z.enum([
  'WELL_FORMED',
  'FLAWED_KEY',
  'POOR_DISCRIMINATION',
  'NON_FUNCTIONAL_DISTRACTOR',
  'DECEPTIVE_DISTRACTOR',
]);
export type ItemQualityFlag = z.infer<typeof ItemQualityFlagSchema>;

export const ItemQualityValidationSchema = z.object({
  questionId: z.string().uuid(),
  sampleSize: z.number().int().nonnegative(),
  requiredSampleSize: z.number().int().positive(),
  hasConclusion: z.boolean(),
  status: EmpiricalStatusSchema,
  distractorAnalysis: z.array(DistractorStatsSchema),
  discriminationIndex: z.number().min(-1).max(1),
  discriminationRating: DiscriminationRatingSchema,
  qualityFlags: z.array(ItemQualityFlagSchema),
  recommendation: z.string(),
});
export type ItemQualityValidation = z.infer<typeof ItemQualityValidationSchema>;
