import { z } from 'zod';

export const ReviewTargetTypeSchema = z.enum([
  'group_version',
  'question_version',
  'exam_version',
]);
export type ReviewTargetType = z.infer<typeof ReviewTargetTypeSchema>;

export const SubmitReviewSchema = z
  .object({
    targetType: ReviewTargetTypeSchema,
    targetId: z.string().uuid('targetId phải là định dạng UUID hợp lệ'),
    targetVersion: z.coerce.number().int().positive('targetVersion phải là số nguyên dương'),
  })
  .strict();
export type SubmitReviewDto = z.infer<typeof SubmitReviewSchema>;

export const ReviewDecisionSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    comments: z.string().optional(),
  })
  .strict();
export type ReviewDecisionDto = z.infer<typeof ReviewDecisionSchema>;

export const ReviewParamsSchema = z
  .object({
    targetType: ReviewTargetTypeSchema,
    targetId: z.string().uuid('targetId phải là định dạng UUID hợp lệ'),
    version: z.coerce.number().int().positive('version phải là số nguyên dương'),
  })
  .strict();
export type ReviewParamsDto = z.infer<typeof ReviewParamsSchema>;

export interface ContentReviewRecord {
  id: string;
  targetType: string;
  targetId: string;
  targetVersion: number;
  reviewerId: string;
  lastEditorId: string;
  status: string;
  comments: string | null;
  reviewedAt: Date;
}
