ALTER TABLE "entry_meanings" ADD COLUMN IF NOT EXISTS "gloss_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entry_meanings_entry_locale_sense_order_idx" ON "entry_meanings" ("entry_id", "locale", "sense_index", "gloss_order");
