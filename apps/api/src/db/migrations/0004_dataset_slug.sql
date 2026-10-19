ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "datasets_slug_idx" ON "datasets" USING btree ("slug");--> statement-breakpoint
INSERT INTO "datasets" ("id", "slug", "name", "version")
VALUES ('018e0000-0000-7000-8000-0000000000d1', 'jlpt-official', 'Tập ngữ liệu đề thi JLPT N1–N5', '1.0.0')
ON CONFLICT ("id") DO UPDATE SET "slug" = EXCLUDED."slug";
