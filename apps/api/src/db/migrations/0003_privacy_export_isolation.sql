ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_status_check" CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_export_jobs_user_status_idx" ON "data_export_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deletion_requests_user_status_idx" ON "deletion_requests" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_snapshots_name_period_idx" ON "report_snapshots" USING btree ("report_name","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_requested_by_status_idx" ON "export_jobs" USING btree ("requested_by","status");
