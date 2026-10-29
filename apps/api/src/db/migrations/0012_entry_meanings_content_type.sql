ALTER TABLE "entry_meanings" ADD COLUMN IF NOT EXISTS "content_type" text DEFAULT 'gloss' NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_meanings" DROP CONSTRAINT IF EXISTS "entry_meanings_content_type_check";--> statement-breakpoint
ALTER TABLE "entry_meanings" ADD CONSTRAINT "entry_meanings_content_type_check" CHECK ("content_type" IN ('summary', 'gloss', 'explanation'));
