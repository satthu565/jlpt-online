import { z } from 'zod';
import {
  AttemptModeSchema,
  AttemptStatusSchema,
  MondaiTypeSchema,
  ResultFlagSchema,
  SkillSchema,
} from './enums.js';

export const AttemptInitInputSchema = z.object({
  examId: z.string().uuid(),
  mode: AttemptModeSchema,
  assignmentId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
});
export type AttemptInitInput = z.infer<typeof AttemptInitInputSchema>;

export const AttemptInitResponseSchema = z.object({
  attemptId: z.string().uuid(),
  lease: z.string().uuid(),
  serverNow: z.string().datetime(),
  snapshotUrl: z.string().url(),
  mediaToken: z.string(),
  mediaTokenExp: z.number().int().positive(),
  status: z.literal('in_progress'),
  currentSection: z.number().int().nullable(),
});
export type AttemptInitResponse = z.infer<typeof AttemptInitResponseSchema>;

export const NextSectionInputSchema = z.object({
  lease: z.string().uuid(),
});
export type NextSectionInput = z.infer<typeof NextSectionInputSchema>;

export const NextSectionResponseSchema = z.object({
  sectionIndex: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  deadline: z.string().datetime(),
  serverNow: z.string().datetime(),
});
export type NextSectionResponse = z.infer<typeof NextSectionResponseSchema>;

export const AnswerChangeSchema = z.object({
  i: z.number().int().nonnegative(),
  v: z.number().int().min(0).max(4),
  at: z.number().int().positive(),
});
export type AnswerChange = z.infer<typeof AnswerChangeSchema>;

export const AnswerSheetUpdateInputSchema = z.object({
  lease: z.string().uuid(),
  seq: z.number().int().positive(),
  answers: z.array(z.number().int().min(0).max(4)),
  flags: z.array(z.number().int().min(0).max(1)),
  timeSpentMs: z.array(z.number().int().nonnegative()).optional(),
  changes: z.array(AnswerChangeSchema),
});
export type AnswerSheetUpdateInput = z.infer<typeof AnswerSheetUpdateInputSchema>;

export const AnswerSheetAckSchema = z.object({
  lastSeq: z.number().int().positive(),
  serverNow: z.string().datetime(),
});
export type AnswerSheetAck = z.infer<typeof AnswerSheetAckSchema>;

export const AttemptSubmitInputSchema = z.object({
  lease: z.string().uuid(),
  seq: z.number().int().positive(),
  answers: z.array(z.number().int().min(0).max(4)),
  flags: z.array(z.number().int().min(0).max(1)),
  timeSpentMs: z.array(z.number().int().nonnegative()).optional(),
});
export type AttemptSubmitInput = z.infer<typeof AttemptSubmitInputSchema>;

export const ResultTotalsSchema = z.object({
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  blank: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const ResultSectionStatsSchema = z.object({
  code: z.string(),
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const ResultSkillStatsSchema = z.object({
  skill: SkillSchema,
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const ResultScoringSectionSchema = z.object({
  code: z.string(),
  label: z.string(),
  raw: z.number().int().nonnegative(),
  rawMax: z.number().int().nonnegative(),
  scaled: z.number().int().nonnegative(),
  maxScaled: z.number().int().nonnegative(),
  minPass: z.number().int().nonnegative(),
  passed: z.boolean(),
});

export const ResultScoringSchema = z.object({
  method: z.literal('linear_reference'),
  sections: z.array(ResultScoringSectionSchema),
  total: z.number().int().nonnegative(),
  totalMax: z.number().int().nonnegative(),
  totalPass: z.number().int().nonnegative(),
  passEstimate: z.boolean(),
  disclaimer: z.string().optional(),
  isEstimated: z.boolean().optional(),
  label: z.string().optional(),
  failedSections: z.array(z.string()).optional(),
});

export const ResultMondaiStatsSchema = z.object({
  mondaiType: MondaiTypeSchema,
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative().optional(),
  blank: z.number().int().nonnegative().optional(),
  accuracy: z.number().min(0).max(100).optional(),
});
export type ResultMondaiStats = z.infer<typeof ResultMondaiStatsSchema>;

export const ResultTargetEvaluationSchema = z.object({
  targetScore: z.number().int().positive(),
  actualScore: z.number().int().nonnegative(),
  reached: z.boolean(),
  margin: z.number().int(),
  percentageOfTarget: z.number(),
  passThreshold: z.number().int().nonnegative(),
  passedStandard: z.boolean(),
});
export type ResultTargetEvaluation = z.infer<typeof ResultTargetEvaluationSchema>;

export const ResultSchema = z.object({
  totals: ResultTotalsSchema,
  accuracy: z.number().min(0).max(100),
  durationSec: z.number().int().nonnegative(),
  bySection: z.array(ResultSectionStatsSchema),
  bySkill: z.array(ResultSkillStatsSchema),
  byMondai: z.array(ResultMondaiStatsSchema).optional(),
  targetEvaluation: ResultTargetEvaluationSchema.optional(),
  scoring: ResultScoringSchema,
  flags: z.array(ResultFlagSchema),
});
export type Result = z.infer<typeof ResultSchema>;

export const AttemptSubmitResponseSchema = z.object({
  result: ResultSchema,
});
export type AttemptSubmitResponse = z.infer<typeof AttemptSubmitResponseSchema>;

export const ReviewAttemptResponseSchema = z.object({
  snapshotUrl: z.string().url(),
  mediaToken: z.string(),
  answers: z.array(z.number().int().min(0).max(4)),
  flags: z.array(z.number().int().min(0).max(1)),
  correct: z.array(z.number().int().min(0).max(4)),
  result: ResultSchema,
});
export type ReviewAttemptResponse = z.infer<typeof ReviewAttemptResponseSchema>;

export const ResumeAttemptResponseSchema = z.object({
  lease: z.string().uuid(),
  lastSeq: z.number().int().nonnegative(),
  answers: z.array(z.number().int().min(0).max(4)),
  flags: z.array(z.number().int().min(0).max(1)),
  status: AttemptStatusSchema,
  currentSection: z.number().int().nullable(),
  deadline: z.string().datetime().nullable(),
  serverNow: z.string().datetime(),
  snapshotUrl: z.string().url(),
  mediaToken: z.string(),
  mediaTokenExp: z.number().int().positive(),
});
export type ResumeAttemptResponse = z.infer<typeof ResumeAttemptResponseSchema>;

export const MediaTokenResponseSchema = z.object({
  mediaToken: z.string(),
  mediaTokenExp: z.number().int().positive(),
});
export type MediaTokenResponse = z.infer<typeof MediaTokenResponseSchema>;

export const AttemptDetailResponseSchema = z.object({
  status: AttemptStatusSchema,
  mode: AttemptModeSchema,
  currentSection: z.number().int().nullable(),
  deadline: z.string().datetime().nullable(),
  serverNow: z.string().datetime(),
  result: ResultSchema.optional(),
});
export type AttemptDetailResponse = z.infer<typeof AttemptDetailResponseSchema>;

export const CheckAnswerInputSchema = z.object({
  lease: z.string().uuid(),
  index: z.number().int().nonnegative(),
});
export type CheckAnswerInput = z.infer<typeof CheckAnswerInputSchema>;

export const CheckAnswerResponseSchema = z.object({
  index: z.number().int().nonnegative(),
  correct: z.boolean(),
  explanation: z.string().optional(),
});
export type CheckAnswerResponse = z.infer<typeof CheckAnswerResponseSchema>;

export const AttemptSummarySchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  examVersion: z.number().int().positive(),
  mode: AttemptModeSchema,
  status: AttemptStatusSchema,
  startedAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
  score: z.number().nullable(),
  passed: z.boolean().nullable(),
});
export type AttemptSummary = z.infer<typeof AttemptSummarySchema>;
