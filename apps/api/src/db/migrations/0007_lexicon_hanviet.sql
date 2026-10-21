ALTER TABLE "lexical_entries" ADD COLUMN IF NOT EXISTS "han_viet" text;--> statement-breakpoint
ALTER TABLE "lexical_entries" ADD COLUMN IF NOT EXISTS "han_viet_confidence" text;--> statement-breakpoint
ALTER TABLE "lexical_entries" ADD COLUMN IF NOT EXISTS "han_viet_source" text;--> statement-breakpoint
ALTER TABLE "lexical_entries" ADD COLUMN IF NOT EXISTS "han_viet_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lexical_entries_term_idx" ON "lexical_entries" ("term");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lexical_entries_han_viet_confidence_idx" ON "lexical_entries" ("han_viet_confidence");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lexicon_hanviet_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid REFERENCES "lexical_entries"("id") ON DELETE set null,
	"term" text NOT NULL,
	"reading" text,
	"suggestion" text,
	"note" text,
	"user_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lexicon_hanviet_reports_entry_idx" ON "lexicon_hanviet_reports" ("entry_id");
