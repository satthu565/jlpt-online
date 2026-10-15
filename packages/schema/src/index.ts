import { z } from 'zod';

export const LevelSchema = z.enum(['N1', 'N2', 'N3', 'N4', 'N5']);
export type Level = z.infer<typeof LevelSchema>;

export const SessionSchema = z.enum(['7', '12']);
export type Session = z.infer<typeof SessionSchema>;

export const ExamKindSchema = z.enum(['original', 'practice', 'mixed', 'custom']);
export type ExamKind = z.infer<typeof ExamKindSchema>;

export const QuestionOriginSchema = z.enum([
  'official_past_exam',
  'self_authored',
  'third_party',
  'ai_generated',
]);
export type QuestionOrigin = z.infer<typeof QuestionOriginSchema>;

export const ReviewStatusSchema = z.enum([
  'draft',
  'in_review',
  'approved',
  'rejected',
  'hidden',
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const SkillSchema = z.enum(['kanji', 'vocabulary', 'grammar', 'reading', 'listening']);
export type Skill = z.infer<typeof SkillSchema>;

export const RichTextSegmentSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('text'), text: z.string() }),
  z.object({ t: z.literal('ruby'), text: z.string(), rt: z.string() }),
  z.object({ t: z.literal('underline'), text: z.string() }),
  z.object({ t: z.literal('blank') }),
  z.object({ t: z.literal('star') }),
  z.object({ t: z.literal('br') }),
  z.object({ t: z.literal('image'), url: z.string() }),
]);
export type RichTextSegment = z.infer<typeof RichTextSegmentSchema>;

export const RichTextSchema = z.array(RichTextSegmentSchema);
export type RichText = z.infer<typeof RichTextSchema>;
