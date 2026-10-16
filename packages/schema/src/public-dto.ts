import { z } from 'zod';
import { ExamKindSchema, LevelSchema, MondaiTypeSchema, SessionSchema } from './enums.js';
import { RichBlockSchema, RichTextSchema } from './richtext.js';

export const FORBIDDEN_ANSWER_FIELDS = [
  'correct',
  'correctOption',
  'isCorrect',
  'answer',
  'answerKey',
  'answers',
  'keys',
  'explanation',
  'explanations',
] as const;

export const PublicOptionSchema = z
  .object({
    label: z.string(),
    content: RichTextSchema,
  })
  .strict();
export type PublicOption = z.infer<typeof PublicOptionSchema>;

export const PublicQuestionSchema = z
  .object({
    index: z.number().int().nonnegative(),
    questionId: z.string().uuid(),
    number: z.string(),
    stem: RichTextSchema,
    options: z.array(PublicOptionSchema).min(3).max(4),
  })
  .strict();
export type PublicQuestion = z.infer<typeof PublicQuestionSchema>;

export const PublicQuestionGroupSchema = z
  .object({
    groupId: z.string().uuid(),
    mondaiType: MondaiTypeSchema,
    instructions: RichTextSchema,
    passage: z.array(RichBlockSchema).nullable(),
    media: z.array(z.string()),
    questions: z.array(PublicQuestionSchema),
  })
  .strict();
export type PublicQuestionGroup = z.infer<typeof PublicQuestionGroupSchema>;

export const ListeningTimelineItemSchema = z
  .object({
    groupId: z.string().uuid(),
    mediaKey: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    audioStartMs: z.number().int().nonnegative(),
    audioEndMs: z.number().int().nonnegative(),
    gapAfterMs: z.number().int().nonnegative(),
  })
  .strict();
export type ListeningTimelineItem = z.infer<typeof ListeningTimelineItemSchema>;

export const PublicSectionSchema = z
  .object({
    index: z.number().int().nonnegative(),
    code: z.string(),
    title: z.string(),
    durationSec: z.number().int().positive(),
    questionRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
    groups: z.array(PublicQuestionGroupSchema),
    listeningTimeline: z.array(ListeningTimelineItemSchema).nullable(),
  })
  .strict();
export type PublicSection = z.infer<typeof PublicSectionSchema>;

export const PublicExamSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    examId: z.string().uuid(),
    version: z.number().int().positive(),
    level: LevelSchema,
    title: z.string(),
    kind: ExamKindSchema,
    totalQuestions: z.number().int().positive(),
    sections: z.array(PublicSectionSchema),
  })
  .strict();
export type PublicExamSnapshot = z.infer<typeof PublicExamSnapshotSchema>;

export const ExamManifestSchema = z
  .object({
    examId: z.string().uuid(),
    version: z.number().int().positive(),
    media: z.array(z.string()),
  })
  .strict();
export type ExamManifest = z.infer<typeof ExamManifestSchema>;

export const ExamSummarySectionSchema = z.object({
  title: z.string(),
  durationSec: z.number().int().positive(),
});

export const ExamSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  level: LevelSchema,
  title: z.string(),
  kind: ExamKindSchema,
  year: z.number().int().nullable().optional(),
  session: SessionSchema.nullable().optional(),
  totalQuestions: z.number().int().nonnegative(),
  sections: z.array(ExamSummarySectionSchema),
  sourceLabel: z.string().nullable().optional(),
  licenseLabel: z.string().nullable().optional(),
  guestTrial: z.boolean(),
  publishedVersion: z.number().int().positive(),
});
export type ExamSummary = z.infer<typeof ExamSummarySchema>;

export const ExamDetailPublicSchema = ExamSummarySchema.extend({
  description: z.string().default(''),
});
export type ExamDetailPublic = z.infer<typeof ExamDetailPublicSchema>;

export function assertNoAnswerLeak(data: unknown, path = ''): void {
  if (data === null || typeof data !== 'object') return;

  if (Array.isArray(data)) {
    data.forEach((item, index) => assertNoAnswerLeak(item, `${path}[${index}]`));
    return;
  }

  const obj = data as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const lower = key.toLowerCase();
    for (const forbidden of FORBIDDEN_ANSWER_FIELDS) {
      if (lower === forbidden.toLowerCase()) {
        throw new Error(
          `Security violation: forbidden answer field "${key}" detected at path "${path}.${key}" in public DTO`,
        );
      }
    }
    assertNoAnswerLeak(obj[key], path ? `${path}.${key}` : key);
  }
}
