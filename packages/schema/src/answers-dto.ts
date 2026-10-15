import { z } from 'zod';
import {
  LevelSchema,
  MondaiTypeSchema,
  QuestionOriginSchema,
  SkillSchema,
} from './enums.js';
import { RichBlockSchema, RichTextSchema } from './richtext.js';

export const ExamAnswerKeySchema = z
  .object({
    examId: z.string().uuid(),
    version: z.number().int().positive(),
    keys: z.array(z.number().int().min(1).max(4)),
    skills: z.array(SkillSchema),
    mondaiTypes: z.array(MondaiTypeSchema),
    sectionRanges: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])),
  })
  .strict();
export type ExamAnswerKey = z.infer<typeof ExamAnswerKeySchema>;

export const StaffQuestionOptionSchema = z.object({
  label: z.string(),
  content: RichTextSchema,
  isCorrect: z.boolean().optional(),
});
export type StaffQuestionOption = z.infer<typeof StaffQuestionOptionSchema>;

export const StaffQuestionSchema = z.object({
  tempId: z.string().optional(),
  questionId: z.string().uuid().optional(),
  number: z.string().optional(),
  stem: RichTextSchema,
  options: z.array(StaffQuestionOptionSchema).min(3).max(4),
  correctOption: z.number().int().min(1).max(4),
  explanationId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});
export type StaffQuestion = z.infer<typeof StaffQuestionSchema>;

export const StaffQuestionDraftSchema = z.object({
  level: LevelSchema,
  sectionCode: z.string(),
  mondaiType: MondaiTypeSchema,
  skill: SkillSchema,
  instructions: RichTextSchema,
  passage: z.array(RichBlockSchema).nullable().optional(),
  mediaIds: z.array(z.string()).default([]),
  questions: z.array(StaffQuestionSchema),
  sourceRef: z.string().optional(),
  sourcePage: z.number().int().positive().optional(),
  rights: z.record(z.string(), z.unknown()).optional(),
});
export type StaffQuestionDraft = z.infer<typeof StaffQuestionDraftSchema>;

export const EvidenceRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const ExplanationDraftSchema = z.object({
  questionId: z.string().uuid(),
  contentVersion: z.number().int().positive(),
  correctReason: RichTextSchema,
  wrongReasonsByOption: z.record(z.string(), RichTextSchema).optional(),
  translation: RichTextSchema.optional(),
  grammarTags: z.array(z.string()).optional(),
  vocabTags: z.array(z.string()).optional(),
  transcript: RichTextSchema.optional(),
  evidenceRanges: z.array(EvidenceRangeSchema).optional(),
  language: z.string().default('vi'),
  origin: QuestionOriginSchema.default('self_authored'),
  humanReviewed: z.boolean().default(false),
});
export type ExplanationDraft = z.infer<typeof ExplanationDraftSchema>;
