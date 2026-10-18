import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { users } from '../../db/schema.js';

export const jlptExamSchedules = pgTable(
  'jlpt_exam_schedules',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    examDate: text('exam_date').notNull(), // Format 'YYYY-MM-DD'
    registrationDeadline: timestamp('registration_deadline', { withTimezone: true }).notNull(),
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    locations: jsonb('locations').default([]).notNull(), // [{ city: string, name: string, address: string, link?: string }]
    officialUrl: text('official_url').notNull(),
    levels: text('levels').array().default([]).notNull(), // ['N1', 'N2', 'N3', 'N4', 'N5']
    status: text('status').default('draft').notNull(), // 'draft' | 'published' | 'archived'
    notes: text('notes').default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedBy: uuid('published_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('jlpt_exam_schedules_status_idx').on(t.status),
    index('jlpt_exam_schedules_exam_date_idx').on(t.examDate),
  ],
);

export const JlptLocationSchema = z.object({
  city: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  link: z.string().url().optional(),
});
export type JlptLocation = z.infer<typeof JlptLocationSchema>;

export const CreateJlptScheduleInputSchema = z.object({
  title: z.string().min(1, 'Tiêu đề kỳ thi không được để trống'),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày thi phải theo định dạng YYYY-MM-DD'),
  registrationDeadline: z.string().datetime({ message: 'Hạn đăng ký phải theo định dạng ISO datetime' }),
  registrationOpensAt: z.string().datetime().optional(),
  locations: z.array(JlptLocationSchema).min(1, 'Cần ít nhất một địa điểm thi'),
  officialUrl: z.string().url('Link đăng ký chính thức phải là URL hợp lệ'),
  levels: z.array(z.enum(['N1', 'N2', 'N3', 'N4', 'N5'])).min(1).default(['N1', 'N2', 'N3', 'N4', 'N5']),
  notes: z.string().optional(),
});
export type CreateJlptScheduleInput = z.infer<typeof CreateJlptScheduleInputSchema>;

export const UpdateJlptScheduleInputSchema = CreateJlptScheduleInputSchema.partial();
export type UpdateJlptScheduleInput = z.infer<typeof UpdateJlptScheduleInputSchema>;

export interface JlptScheduleResponse {
  id: string;
  title: string;
  examDate: string;
  registrationDeadline: string;
  registrationOpensAt: string | null;
  locations: JlptLocation[];
  officialUrl: string;
  levels: string[];
  status: 'draft' | 'published' | 'archived';
  notes: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
