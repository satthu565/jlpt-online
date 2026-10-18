import { z } from 'zod';
import { LevelSchema, SkillSchema } from './enums.js';

export const ConversionMethodSchema = z.enum([
  'linear_reference',
  'lookup_table',
  'scaled_brackets',
]);
export type ConversionMethod = z.infer<typeof ConversionMethodSchema>;

export const RawToScaledMappingSchema = z.object({
  raw: z.number().int().nonnegative(),
  scaled: z.number().int().nonnegative(),
});
export type RawToScaledMapping = z.infer<typeof RawToScaledMappingSchema>;

export const ScoringSectionConfigSchema = z.object({
  code: z.string(),
  label: z.string(),
  skills: z.array(SkillSchema),
  maxScaled: z.number().int().positive(),
  minPass: z.number().int().nonnegative(),
  conversionMethod: ConversionMethodSchema.default('linear_reference'),
  rawToScaledTable: z.array(RawToScaledMappingSchema).optional(),
});
export type ScoringSectionConfig = z.infer<typeof ScoringSectionConfigSchema>;

export const LevelScoringConfigSchema = z.object({
  level: LevelSchema,
  totalMax: z.number().int().positive(),
  totalPass: z.number().int().positive(),
  sections: z.array(ScoringSectionConfigSchema),
});
export type LevelScoringConfig = z.infer<typeof LevelScoringConfigSchema>;

export const JlptScoringTableConfigSchema = z.object({
  version: z.string(),
  name: z.string(),
  effectiveFrom: z.string(),
  source: z.string().optional(),
  isOfficial: z.boolean().default(true),
  levels: z.record(LevelSchema, LevelScoringConfigSchema),
});
export type JlptScoringTableConfig = z.infer<typeof JlptScoringTableConfigSchema>;

export const EstimatedSectionScoreSchema = z.object({
  code: z.string(),
  label: z.string(),
  raw: z.number().int().nonnegative(),
  rawMax: z.number().int().nonnegative(),
  scaled: z.number().int().min(0),
  maxScaled: z.number().int().positive(),
  minPass: z.number().int().nonnegative(),
  passed: z.boolean(),
  margin: z.number().int(),
});
export type EstimatedSectionScore = z.infer<typeof EstimatedSectionScoreSchema>;

export const ScoreOutcomeSchema = z.enum(['PASS', 'FAIL']);
export type ScoreOutcome = z.infer<typeof ScoreOutcomeSchema>;

export const ScoreFailReasonSchema = z.enum([
  'PASSED',
  'FAILED_TOTAL_AND_SECTION',
  'FAILED_SECTION_FLOOR',
  'FAILED_TOTAL_SCORE',
]);
export type ScoreFailReason = z.infer<typeof ScoreFailReasonSchema>;

export const EstimatedScoreSummarySchema = z.object({
  outcome: ScoreOutcomeSchema,
  reason: ScoreFailReasonSchema,
  message: z.string(),
});
export type EstimatedScoreSummary = z.infer<typeof EstimatedScoreSummarySchema>;

export const EstimatedScoreResultSchema = z.object({
  level: LevelSchema,
  tableVersion: z.string(),
  isEstimated: z.literal(true),
  label: z.literal('ước lượng'),
  disclaimer: z.string(),
  totalScaled: z.number().int().min(0),
  totalMax: z.number().int().positive(),
  totalPass: z.number().int().positive(),
  passed: z.boolean(),
  isTotalPassed: z.boolean(),
  isAllSectionsPassed: z.boolean(),
  failedSections: z.array(z.string()),
  sections: z.array(EstimatedSectionScoreSchema),
  summary: EstimatedScoreSummarySchema,
});
export type EstimatedScoreResult = z.infer<typeof EstimatedScoreResultSchema>;
