import { z } from 'zod';

export type RichTextSegment =
  | { t: 'text'; text: string }
  | { t: 'ruby'; text: string; rt: string }
  | { t: 'underline'; text?: string; children?: RichTextSegment[] }
  | { t: 'emphasis'; children?: RichTextSegment[] }
  | { t: 'blank'; label?: string }
  | { t: 'star' }
  | { t: 'br' }
  | {
      t: 'image';
      mediaKey?: string;
      alt?: string;
      width?: number;
      height?: number;
      url?: string;
    };

export const RichTextSegmentSchema: z.ZodType<RichTextSegment> = z.lazy(() =>
  z.discriminatedUnion('t', [
    z.object({
      t: z.literal('text'),
      text: z.string(),
    }),
    z.object({
      t: z.literal('ruby'),
      text: z.string(),
      rt: z.string(),
    }),
    z.object({
      t: z.literal('underline'),
      text: z.string().optional(),
      children: z.array(RichTextSegmentSchema).optional(),
    }),
    z.object({
      t: z.literal('emphasis'),
      children: z.array(RichTextSegmentSchema).optional(),
    }),
    z.object({
      t: z.literal('blank'),
      label: z.string().optional(),
    }),
    z.object({
      t: z.literal('star'),
    }),
    z.object({
      t: z.literal('br'),
    }),
    z.object({
      t: z.literal('image'),
      mediaKey: z.string().optional(),
      alt: z.string().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      url: z.string().optional(),
    }),
  ]),
);

export const RichTextSchema = z.array(RichTextSegmentSchema);
export type RichText = z.infer<typeof RichTextSchema>;

export type RichBlock =
  | { type: 'paragraph'; content: RichText }
  | { type: 'image'; mediaKey: string; alt: string; width: number; height: number }
  | { type: 'table'; rows: RichText[][] };

export const RichBlockSchema: z.ZodType<RichBlock> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    content: RichTextSchema,
  }),
  z.object({
    type: z.literal('image'),
    mediaKey: z.string(),
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('table'),
    rows: z.array(z.array(RichTextSchema)),
  }),
]);
