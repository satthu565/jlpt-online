ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "datasets_slug_idx" ON "datasets" USING btree ("slug");
