import { z } from 'zod';
import {
  AIActionSchema,
  AsyncJobStatusSchema,
  ExportKindSchema,
  LevelSchema,
  MixModeSchema,
  MondaiTypeSchema,
  PaymentTermSchema,
  PracticePoolSchema,
  SkillSchema,
} from './enums.js';

export const PageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export const MoneySchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().default('VND'),
});
export type Money = z.infer<typeof MoneySchema>;

export const AsyncJobSchema = z.object({
  id: z.string().uuid(),
  status: AsyncJobStatusSchema,
  progress: z.number().min(0).max(100),
  artifacts: z.array(z.string()).default([]),
  errorCode: z.string().optional(),
  retryable: z.boolean().default(true),
});
export type AsyncJob = z.infer<typeof AsyncJobSchema>;

export const ExportRequestSchema = z.object({
  kind: ExportKindSchema,
  resourceId: z.string().uuid().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  locale: z.string().default('vi'),
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  targetLevel: LevelSchema.nullable().optional(),
  targetExamDate: z.string().nullable().optional(),
  targetScore: z.number().int().nullable().optional(),
  locale: z.string().default('vi'),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  completedExams: z.number().int().nonnegative().default(0),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UpdateProfileInputSchema = z.object({
  name: z.string().optional(),
  targetLevel: LevelSchema.optional(),
  targetExamDate: z.string().optional(),
  targetScore: z.number().int().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const ConsentRecordSchema = z.object({
  purpose: z.string(),
  policyVersion: z.string(),
  granted: z.boolean(),
  grantedAt: z.string().datetime(),
});
export type ConsentRecord = z.infer<typeof ConsentRecordSchema>;

export const ConsentInputSchema = z.object({
  purpose: z.string(),
  policyVersion: z.string(),
  granted: z.boolean(),
});
export type ConsentInput = z.infer<typeof ConsentInputSchema>;

export const NotificationPreferencesSchema = z.object({
  version: z.number().int().positive(),
  emailUpdates: z.boolean().default(true),
  examReminders: z.boolean().default(true),
  studyStreakAlerts: z.boolean().default(true),
  quietHours: z.object({ start: z.string(), end: z.string() }).optional(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const PracticeConfigSchema = z.object({
  level: LevelSchema,
  skills: z.array(SkillSchema),
  mondaiTypes: z.array(MondaiTypeSchema),
  questionCount: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]),
  sourceIds: z.array(z.string().uuid()).optional(),
  pool: PracticePoolSchema,
  timeLimitSec: z.number().int().positive().optional(),
  tagIds: z.array(z.string()).optional(),
  difficultyRange: z.tuple([z.number(), z.number()]).optional(),
});
export type PracticeConfig = z.infer<typeof PracticeConfigSchema>;

export const MixConfigSchema = z.object({
  level: LevelSchema,
  sourceSessions: z.array(z.string()),
  sourceWeights: z.record(z.string(), z.number().nonnegative()),
  skills: z.array(SkillSchema),
  mondaiTypes: z.array(MondaiTypeSchema),
  mode: MixModeSchema,
  seed: z.number().int().optional(),
  blueprintVersion: z.number().int().positive(),
  questionCount: z.number().int().positive().optional(),
  difficultyRange: z.tuple([z.number(), z.number()]).optional(),
  maxExposure: z.number().int().positive().optional(),
});
export type MixConfig = z.infer<typeof MixConfigSchema>;

export const GeneratedExamSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  version: z.number().int().positive(),
  seed: z.number().int(),
  engineVersion: z.string(),
  configHash: z.string(),
  selectionGroupIds: z.array(z.string().uuid()),
  sourceSummary: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()).default([]),
  blueprintConformant: z.boolean(),
});
export type GeneratedExam = z.infer<typeof GeneratedExamSchema>;

export const CardReviewSchema = z.object({
  clientReviewId: z.string().uuid(),
  cardId: z.string().uuid(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  reviewedAtUTC: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  expectedVersion: z.number().int().positive(),
});
export type CardReview = z.infer<typeof CardReviewSchema>;

export const StudyPlanConfigSchema = z.object({
  targetExamDate: z.string(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  minutesPerDay: z.number().int().positive(),
  days: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  skillWeights: z.record(SkillSchema, z.number().nonnegative()),
  daysOff: z.array(z.number().int().min(0).max(6)).default([]),
  goals: z.array(z.string()).default([]),
});
export type StudyPlanConfig = z.infer<typeof StudyPlanConfigSchema>;

export const StudyPlanSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  config: StudyPlanConfigSchema,
  scheduledSessions: z.array(
    z.object({
      id: z.string().uuid(),
      localDate: z.string(),
      skill: SkillSchema,
      targetMinutes: z.number().int().positive(),
      completed: z.boolean(),
    }),
  ),
  active: z.boolean(),
});
export type StudyPlan = z.infer<typeof StudyPlanSchema>;

export const AIRequestSchema = z.object({
  action: AIActionSchema,
  questionId: z.string().uuid().optional(),
  attemptId: z.string().uuid().optional(),
  notebookId: z.string().uuid().optional(),
  message: z.string().optional(),
  locale: z.string().default('vi'),
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

export const PaymentCreateSchema = z.object({
  planId: z.string(),
  term: PaymentTermSchema,
  quantity: z.number().int().positive().default(1),
  couponCode: z.string().optional(),
  returnPath: z.string(),
});
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;

export const AssignmentCreateSchema = z.object({
  examId: z.string().uuid().optional(),
  mixConfig: MixConfigSchema.optional(),
  dueAtUTC: z.string().datetime(),
  opensAtUTC: z.string().datetime(),
  attemptPolicy: z.record(z.string(), z.unknown()).default({}),
  learnerIds: z.array(z.string().uuid()).optional(),
});
export type AssignmentCreate = z.infer<typeof AssignmentCreateSchema>;

export const EventCreateSchema = z.object({
  examId: z.string().uuid(),
  opensAt: z.string().datetime(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  resultReleaseAt: z.string().datetime(),
  capacity: z.number().int().positive(),
  lateSyncWindowSec: z.literal(0).default(0),
  rankingScope: z.string().default('global'),
});
export type EventCreate = z.infer<typeof EventCreateSchema>;

export const ReportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  timezone: z.string().default('Asia/Ho_Chi_Minh'),
  groupBy: z.string().optional(),
  level: LevelSchema.optional(),
  tenantId: z.string().uuid().optional(),
  cohortMode: z.string().optional(),
});
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
