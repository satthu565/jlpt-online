ALTER TABLE "entry_meanings" ADD COLUMN IF NOT EXISTS "sense_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_meanings" ADD COLUMN IF NOT EXISTS "pos" text;
