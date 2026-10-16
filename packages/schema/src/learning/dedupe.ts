import { z } from 'zod';

export const DuplicateMatchTypeSchema = z.enum([
  'EXACT',
  'NEAR_DUPLICATE',
  'SIMILAR',
  'DISTINCT',
]);
export type DuplicateMatchType = z.infer<typeof DuplicateMatchTypeSchema>;

export const QuestionSimilarityResultSchema = z.object({
  questionIdA: z.string(),
  questionIdB: z.string(),
  sourceA: z.string().optional(),
  sourceB: z.string().optional(),
  stemSimilarity: z.number().min(0).max(1),
  optionsSimilarity: z.number().min(0).max(1),
  overallSimilarity: z.number().min(0).max(1),
  matchType: DuplicateMatchTypeSchema,
  isCrossSource: z.boolean(),
});
export type QuestionSimilarityResult = z.infer<typeof QuestionSimilarityResultSchema>;

export const QuestionClusterSchema = z.object({
  clusterId: z.string(),
  canonicalQuestionId: z.string(),
  memberQuestionIds: z.array(z.string()),
  sources: z.array(z.string()),
  highestSimilarity: z.number().min(0).max(1),
  matchType: DuplicateMatchTypeSchema,
});
export type QuestionCluster = z.infer<typeof QuestionClusterSchema>;

export const CrossSourceDuplicateReportSchema = z.object({
  totalExamined: z.number().int().nonnegative(),
  duplicatePairCount: z.number().int().nonnegative(),
  clusters: z.array(QuestionClusterSchema),
  pairs: z.array(QuestionSimilarityResultSchema),
});
export type CrossSourceDuplicateReport = z.infer<typeof CrossSourceDuplicateReportSchema>;
