import { z } from 'zod';
import { LevelSchema, MondaiTypeSchema, SkillSchema } from './enums.js';

export const BlueprintSourceRefSchema = z.object({
  url: z.string().url(),
  accessedAt: z.string(),
});
export type BlueprintSourceRef = z.infer<typeof BlueprintSourceRefSchema>;

export const BlueprintMondaiSchema = z.object({
  type: MondaiTypeSchema,
  skill: SkillSchema,
  questionCount: z.number().int().positive(),
});
export type BlueprintMondai = z.infer<typeof BlueprintMondaiSchema>;

export const BlueprintSectionSchema = z.object({
  code: z.string(),
  title: z.string(),
  durationSec: z.number().int().positive(),
  mondai: z.array(BlueprintMondaiSchema),
});
export type BlueprintSection = z.infer<typeof BlueprintSectionSchema>;

export const ScoringSectionSchema = z.object({
  code: z.string(),
  label: z.string(),
  skills: z.array(SkillSchema),
  maxScaled: z.number().int().positive(),
  minPass: z.number().int().nonnegative(),
});
export type ScoringSection = z.infer<typeof ScoringSectionSchema>;

export const BlueprintScoringSchema = z.object({
  method: z.literal('linear_reference'),
  rounding: z.literal('round'),
  scoringSections: z.array(ScoringSectionSchema),
  totalMax: z.number().int().positive(),
  totalPass: z.number().int().positive(),
});
export type BlueprintScoring = z.infer<typeof BlueprintScoringSchema>;

export const BlueprintSchema = z.object({
  level: LevelSchema,
  version: z.number().int().positive(),
  effectiveFrom: z.string(),
  sourceRef: z.array(BlueprintSourceRefSchema),
  sections: z.array(BlueprintSectionSchema),
  scoring: BlueprintScoringSchema,
});
export type Blueprint = z.infer<typeof BlueprintSchema>;
