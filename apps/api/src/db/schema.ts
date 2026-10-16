import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const exams = pgTable('exams', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  level: text('level').notNull(),
  title: text('title').notNull(),
  kind: text('kind').notNull(),
  year: integer('year'),
  session: text('session'),
  totalQuestions: integer('total_questions').notNull().default(0),
  description: text('description').notNull().default(''),
  publishedVersion: integer('published_version'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const examVersions = pgTable(
  'exam_versions',
  {
    examId: uuid('exam_id').notNull(),
    version: integer('version').notNull(),
    snapshotKey: text('snapshot_key').notNull(),
    manifestKey: text('manifest_key').notNull(),
    blueprintId: uuid('blueprint_id').notNull(),
    blueprintVersion: integer('blueprint_version').notNull(),
    scoring: jsonb('scoring').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    publishedBy: uuid('published_by').notNull(),
  },
  (t) => [primaryKey({ columns: [t.examId, t.version] })],
);

export const examAnswerKeys = pgTable(
  'exam_answer_keys',
  {
    examId: uuid('exam_id').notNull(),
    version: integer('version').notNull(),
    keys: smallint('keys').array().notNull(),
    skills: text('skills').array().notNull(),
    mondaiTypes: text('mondai_types').array().notNull(),
    sectionRanges: jsonb('section_ranges').notNull(),
  },
  (t) => [primaryKey({ columns: [t.examId, t.version] })],
);

export const examAttempts = pgTable(
  'exam_attempts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id'),
    guestId: uuid('guest_id'),
    examId: uuid('exam_id').notNull(),
    examVersion: integer('exam_version').notNull(),
    mode: text('mode').notNull(),
    status: text('status').notNull(),
    submittedBy: text('submitted_by'),
    currentSection: smallint('current_section'),
    currentDeadline: timestamp('current_deadline', { withTimezone: true }),
    sectionTimes: jsonb('section_times').default('[]').notNull(),
    leaseId: uuid('lease_id').notNull(),
    resultFlags: text('result_flags').array().default([]).notNull(),
    attemptMonth: date('attempt_month').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    result: jsonb('result'),
  },
  (t) => [
    uniqueIndex('exam_attempts_user_exam_open_idx')
      .on(t.userId, t.examId)
      .where(sql`status = 'in_progress' AND user_id IS NOT NULL`),
    index('exam_attempts_current_deadline_idx')
      .on(t.currentDeadline)
      .where(sql`status = 'in_progress'`),
  ],
);

export const attemptAnswerSheets = pgTable('attempt_answer_sheets', {
  attemptId: uuid('attempt_id').primaryKey(),
  answers: smallint('answers').array().notNull(),
  flags: smallint('flags').array().default([]).notNull(),
  timeSpentMs: integer('time_spent_ms').array(),
  lastSeq: integer('last_seq').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attemptEvents = pgTable(
  'attempt_events',
  {
    id: uuid('id').notNull(),
    attemptMonth: date('attempt_month').notNull(),
    attemptId: uuid('attempt_id').notNull(),
    seq: integer('seq'),
    type: text('type').notNull(),
    payload: jsonb('payload').default('{}').notNull(),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptMonth, t.id] })],
);

export const userAnswers = pgTable(
  'user_answers',
  {
    attemptId: uuid('attempt_id').notNull(),
    questionIndex: smallint('question_index').notNull(),
    questionId: uuid('question_id').notNull(),
    optionValue: smallint('option_value').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    flagged: boolean('flagged').notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionIndex] })],
);

export const outbox = pgTable(
  'outbox',
  {
    id: uuid('id').primaryKey(),
    topic: text('topic').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [
    index('outbox_created_at_unpublished_idx')
      .on(t.createdAt)
      .where(sql`published_at IS NULL`),
  ],
);

export const processedEvents = pgTable(
  'processed_events',
  {
    eventId: uuid('event_id').notNull(),
    consumer: text('consumer').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.consumer] })],
);

export const deadLetterEvents = pgTable('dead_letter_events', {
  id: uuid('id').primaryKey(),
  eventId: uuid('event_id').notNull(),
  topic: text('topic').notNull(),
  payload: jsonb('payload').notNull(),
  reason: text('reason').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  nextAt: timestamp('next_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const blueprints = pgTable('blueprints', {
  id: uuid('id').primaryKey(),
  level: text('level').notNull(),
  version: integer('version').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  sourceRef: jsonb('source_ref').notNull(),
  sections: jsonb('sections').notNull(),
  scoring: jsonb('scoring').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey(),
  sha256: text('sha256').notNull().unique(),
  key: text('key').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  durationSec: integer('duration_sec'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
