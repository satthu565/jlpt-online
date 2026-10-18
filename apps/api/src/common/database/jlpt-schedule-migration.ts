import type { DbClientInstance } from '../../db/client.js';

/**
 * Ensures the jlpt_exam_schedules table exists.
 * Idempotent SQL execution for both PostgreSQL and PGlite.
 * Each statement is executed separately to support PGlite prepared statement parser.
 */
export async function ensureJlptExamSchedulesTable(client: DbClientInstance): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "jlpt_exam_schedules" (
      "id" uuid PRIMARY KEY,
      "title" text NOT NULL,
      "exam_date" text NOT NULL,
      "registration_deadline" timestamp with time zone NOT NULL,
      "registration_opens_at" timestamp with time zone,
      "locations" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "official_url" text NOT NULL,
      "levels" text[] NOT NULL DEFAULT '{"N1","N2","N3","N4","N5"}',
      "status" text NOT NULL DEFAULT 'draft',
      "notes" text DEFAULT '',
      "published_at" timestamp with time zone,
      "published_by" uuid REFERENCES "users"("id"),
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS "jlpt_exam_schedules_status_idx" ON "jlpt_exam_schedules" ("status")
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS "jlpt_exam_schedules_exam_date_idx" ON "jlpt_exam_schedules" ("exam_date")
  `);
}
