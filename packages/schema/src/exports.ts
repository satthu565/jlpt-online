import { z } from 'zod';
import { LevelSchema, AttemptModeSchema } from './enums.js';
import { ResultSchema } from './attempts.js';

export const ScoreReportSectionItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  scaledScore: z.number().int().nonnegative(),
  maxScore: z.number().int().positive(),
  passThreshold: z.number().int().nonnegative(),
  passed: z.boolean(),
});
export type ScoreReportSectionItem = z.infer<typeof ScoreReportSectionItemSchema>;

export const ScoreReportDataSchema = z.object({
  attemptId: z.string().uuid(),
  userId: z.string().uuid(),
  candidateName: z.string(),
  candidateEmail: z.string().email().optional(),
  examTitle: z.string(),
  level: LevelSchema,
  mode: AttemptModeSchema.default('practice'),
  examDate: z.string(),
  scaledScore: z.number().int().nonnegative(),
  maxScore: z.number().int().positive(),
  passThreshold: z.number().int().positive(),
  passed: z.boolean(),
  sections: z.array(ScoreReportSectionItemSchema),
  disclaimer: z.string(),
  generatedAt: z.string().datetime(),
  locale: z.enum(['ja', 'vi', 'en']).default('ja'),
  tenantId: z.string().optional(),
  rawResult: ResultSchema.optional(),
});
export type ScoreReportData = z.infer<typeof ScoreReportDataSchema>;

export const ScoreReportOptionsSchema = z.object({
  data: ScoreReportDataSchema,
  requestingActor: z.object({
    userId: z.string().uuid(),
    role: z.string().optional(),
    tenantId: z.string().optional(),
  }),
  format: z.enum(['pdf', 'xlsx', 'csv', 'json']).default('pdf'),
});
export type ScoreReportOptions = z.infer<typeof ScoreReportOptionsSchema>;

export const ScoreReportResultSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  attemptId: z.string().uuid(),
  userId: z.string().uuid(),
  passed: z.boolean(),
  checksumSha256: z.string(),
});
export type ScoreReportResult = z.infer<typeof ScoreReportResultSchema>;

export class ScoreReportIsolationError extends Error {
  constructor(
    message: string,
    public readonly attemptUserId: string,
    public readonly requestingUserId: string,
  ) {
    super(message);
    this.name = 'ScoreReportIsolationError';
  }
}

/**
 * Asserts strict tenant and user isolation for score report access.
 * Non-admin users can ONLY access their own score reports (SCORE-12).
 */
export function assertScoreReportIsolation(
  data: { userId: string; tenantId?: string },
  requestingActor: { userId: string; role?: string; tenantId?: string },
): void {
  const isOwner = requestingActor.userId === data.userId;
  const isAdmin = requestingActor.role === 'admin' || requestingActor.role === 'superadmin';

  if (!isOwner && !isAdmin) {
    throw new ScoreReportIsolationError(
      `Quyền riêng tư bị từ chối: Báo cáo kết quả thuộc về người dùng khác (${data.userId}). Không cho phép truy cập trái phép đa người dùng (SCORE-12).`,
      data.userId,
      requestingActor.userId,
    );
  }

  if (requestingActor.tenantId && data.tenantId && requestingActor.tenantId !== data.tenantId && !isAdmin) {
    throw new ScoreReportIsolationError(
      `Quyền riêng tư bị từ chối: Báo cáo kết quả thuộc tổ chức/lớp học khác (${data.tenantId}).`,
      data.userId,
      requestingActor.userId,
    );
  }
}
