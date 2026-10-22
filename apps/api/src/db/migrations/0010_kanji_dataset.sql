CREATE TABLE IF NOT EXISTS "kanji_dataset" (
	"kanji" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"jlpt_level" text,
	"stroke_count" smallint,
	"han_viet" text,
	"meaning_vi" text,
	"dataset_version" text NOT NULL,
	"source" text DEFAULT 'dataset' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanji_dataset_jlpt_level_idx" ON "kanji_dataset" ("jlpt_level");
