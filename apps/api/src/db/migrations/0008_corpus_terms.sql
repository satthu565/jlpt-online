CREATE TABLE IF NOT EXISTS "corpus_terms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL REFERENCES "datasets"("id") ON DELETE cascade,
	"term" text NOT NULL,
	"reading" text,
	"level" text NOT NULL,
	"exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE cascade,
	"question_id" uuid REFERENCES "questions"("id") ON DELETE cascade,
	"section" text,
	"skill" text,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "corpus_terms_unique_idx" ON "corpus_terms" ("dataset_id", "term", "exam_id", "question_id") NULLS NOT DISTINCT;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corpus_terms_term_idx" ON "corpus_terms" ("term");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corpus_terms_level_idx" ON "corpus_terms" ("level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corpus_terms_dataset_idx" ON "corpus_terms" ("dataset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corpus_terms_exam_idx" ON "corpus_terms" ("exam_id");
