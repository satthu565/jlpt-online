import { z } from 'zod';
import { LevelSchema, MondaiTypeSchema, SkillSchema } from '../enums.js';

export const SpeedAccuracyQuadrantSchema = z.enum([
  'FAST_AND_ACCURATE',
  'SLOW_AND_ACCURATE',
  'FAST_AND_INACCURATE',
  'SLOW_AND_INACCURATE',
]);
export type SpeedAccuracyQuadrant = z.infer<typeof SpeedAccuracyQuadrantSchema>;

export const SkillSpeedAccuracySchema = z.object({
  skill: SkillSchema,
  averageTimeSpentSec: z.number().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100),
  questionCount: z.number().int().nonnegative(),
  quadrant: SpeedAccuracyQuadrantSchema,
});
export type SkillSpeedAccuracy = z.infer<typeof SkillSpeedAccuracySchema>;

export const MondaiSpeedAccuracySchema = z.object({
  mondaiType: MondaiTypeSchema,
  averageTimeSpentSec: z.number().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100),
  questionCount: z.number().int().nonnegative(),
});
export type MondaiSpeedAccuracy = z.infer<typeof MondaiSpeedAccuracySchema>;

export const SpeedAccuracyReportSchema = z.object({
  averageTimeSpentSec: z.number().nonnegative(),
  correctAverageTimeSpentSec: z.number().nonnegative(),
  wrongAverageTimeSpentSec: z.number().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100),
  quadrant: SpeedAccuracyQuadrantSchema,
  quadrantLabel: z.string(),
  timeSpentCorrelation: z.number().min(-1).max(1),
  bySkill: z.array(SkillSpeedAccuracySchema),
  byMondai: z.array(MondaiSpeedAccuracySchema).optional(),
});
export type SpeedAccuracyReport = z.infer<typeof SpeedAccuracyReportSchema>;

export const AnswerChangePatternSchema = z.enum([
  'CORRECT_TO_WRONG',
  'WRONG_TO_CORRECT',
  'WRONG_TO_WRONG',
  'NO_CHANGE',
]);
export type AnswerChangePattern = z.infer<typeof AnswerChangePatternSchema>;

export const AnswerChangeDetailSchema = z.object({
  questionIndex: z.number().int().nonnegative(),
  pattern: AnswerChangePatternSchema,
  initialOption: z.number().int().min(0).max(4),
  finalOption: z.number().int().min(0).max(4),
  correctOption: z.number().int().min(1).max(4),
  changeCount: z.number().int().nonnegative(),
  timeSpentMs: z.number().int().nonnegative().optional(),
});
export type AnswerChangeDetail = z.infer<typeof AnswerChangeDetailSchema>;

export const SecondGuessingTendencySchema = z.enum(['HARMFUL', 'BENEFICIAL', 'NEUTRAL']);
export type SecondGuessingTendency = z.infer<typeof SecondGuessingTendencySchema>;

export const AnswerChangeAnalysisSchema = z.object({
  totalQuestions: z.number().int().nonnegative(),
  questionsWithChanges: z.number().int().nonnegative(),
  totalChanges: z.number().int().nonnegative(),
  correctToWrongCount: z.number().int().nonnegative(),
  wrongToCorrectCount: z.number().int().nonnegative(),
  wrongToWrongCount: z.number().int().nonnegative(),
  netScoreImpact: z.number().int(),
  secondGuessingTendency: SecondGuessingTendencySchema,
  advice: z.string(),
  details: z.array(AnswerChangeDetailSchema),
});
export type AnswerChangeAnalysis = z.infer<typeof AnswerChangeAnalysisSchema>;

export const UnseenProgressPointSchema = z.object({
  period: z.string(),
  unseenAccuracy: z.number().min(0).max(100),
  sampleSize: z.number().int().nonnegative(),
});
export type UnseenProgressPoint = z.infer<typeof UnseenProgressPointSchema>;

export const UnseenProgressReportSchema = z.object({
  unseenQuestionCount: z.number().int().nonnegative(),
  unseenCorrectCount: z.number().int().nonnegative(),
  unseenAccuracy: z.number().min(0).max(100),
  historicalTrend: z.array(UnseenProgressPointSchema),
  progressDelta: z.number(),
  trendDirection: z.enum(['improving', 'stable', 'declining', 'insufficient_history']),
});
export type UnseenProgressReport = z.infer<typeof UnseenProgressReportSchema>;

export const TrueProgressComparisonSchema = z.object({
  unseenAccuracy: z.number().min(0).max(100),
  unseenCount: z.number().int().nonnegative(),
  familiarAccuracy: z.number().min(0).max(100),
  familiarCount: z.number().int().nonnegative(),
  familiarityDelta: z.number(),
  familiarityInflationIndex: z.number().min(0),
  isInflatedByFamiliarity: z.boolean(),
  assessment: z.string(),
  recommendedMode: z.enum(['unseen_practice', 'balanced_practice', 'challenge']),
});
export type TrueProgressComparison = z.infer<typeof TrueProgressComparisonSchema>;

export const PassProbabilityStatusSchema = z.enum(['UNCALIBRATED_ESTIMATE', 'CALIBRATED']);
export type PassProbabilityStatus = z.infer<typeof PassProbabilityStatusSchema>;

export const SkillReadinessSchema = z.object({
  skill: SkillSchema,
  estimatedScore: z.number().min(0).max(60),
  minPass: z.number().min(0).max(60),
  passedStandard: z.boolean(),
  probabilityPassingSection: z.number().min(0).max(1),
});
export type SkillReadiness = z.infer<typeof SkillReadinessSchema>;

export const PassProbabilityEstimateSchema = z.object({
  level: LevelSchema,
  isCalibrated: z.boolean(),
  status: PassProbabilityStatusSchema,
  passProbability: z.number().min(0).max(1),
  confidenceInterval: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  marginOfError: z.number().min(0).max(1),
  sampleExamsCount: z.number().int().nonnegative(),
  sampleQuestionsCount: z.number().int().nonnegative(),
  disclaimer: z.string(),
  skillBreakdown: z.array(SkillReadinessSchema),
  predictedTotalScore: z.number().min(0).max(180),
  passingThreshold: z.number().int().positive(),
});
export type PassProbabilityEstimate = z.infer<typeof PassProbabilityEstimateSchema>;
