CREATE TABLE IF NOT EXISTS "tenant_plans" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"plan_code" text NOT NULL,
	"status" text NOT NULL,
	"total_seats" integer NOT NULL,
	"used_seats" integer NOT NULL,
	"max_classes" integer NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "explanation_versions" ADD COLUMN IF NOT EXISTS "ai_generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_user_idx" ON "org_memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classes_org_name_idx" ON "classes" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "class_memberships_class_student_idx" ON "class_memberships" USING btree ("class_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignment_learners_assignment_learner_idx" ON "assignment_learners" USING btree ("assignment_id","learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignment_attempts_assignment_attempt_idx" ON "assignment_attempts" USING btree ("assignment_id","attempt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_class_window_idx" ON "assignments" USING btree ("class_id","opens_at","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_registrations_event_user_idx" ON "event_registrations" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_attempts_event_user_idx" ON "event_attempts" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_attempts_event_attempt_idx" ON "event_attempts" USING btree ("event_id","attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_result_publications_event_idx" ON "event_result_publications" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comment_reports_comment_reporter_idx" ON "comment_reports" USING btree ("comment_id","reported_by");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "retention_policies_domain_idx" ON "retention_policies" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "explanation_versions_question_version_locale_idx" ON "explanation_versions" USING btree ("question_id","version","locale");--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_role_check" CHECK (role IN ('owner', 'admin', 'teacher', 'member'));--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_level_check" CHECK (level IN ('N1', 'N2', 'N3', 'N4', 'N5'));--> statement-breakpoint
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_status_check" CHECK (status IN ('active', 'suspended', 'left', 'completed'));--> statement-breakpoint
ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_uses_check" CHECK (max_uses > 0 AND used_count >= 0 AND used_count <= max_uses);--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_window_check" CHECK (opens_at <= due_at);--> statement-breakpoint
ALTER TABLE "assignment_learners" ADD CONSTRAINT "assignment_learners_status_check" CHECK (status IN ('assigned', 'submitted', 'graded', 'late', 'excused'));--> statement-breakpoint
ALTER TABLE "exam_events" ADD CONSTRAINT "exam_events_timeline_check" CHECK (opens_at <= starts_at AND starts_at < ends_at AND ends_at <= result_release_at);--> statement-breakpoint
ALTER TABLE "exam_events" ADD CONSTRAINT "exam_events_capacity_check" CHECK (registered_count >= 0 AND (capacity IS NULL OR registered_count <= capacity));--> statement-breakpoint
ALTER TABLE "tenant_plans" ADD CONSTRAINT "tenant_plans_status_check" CHECK (status IN ('trial', 'active', 'suspended', 'expired'));--> statement-breakpoint
ALTER TABLE "tenant_plans" ADD CONSTRAINT "tenant_plans_seats_check" CHECK (used_seats >= 0 AND used_seats <= total_seats AND total_seats >= 0);--> statement-breakpoint
ALTER TABLE "tenant_plans" ADD CONSTRAINT "tenant_plans_classes_check" CHECK (max_classes >= 0);--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_days_check" CHECK (retention_days > 0);--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_approval_check" CHECK ((policy_approved = false) OR (policy_approved = true AND approved_by IS NOT NULL));--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_status_check" CHECK (status IN ('requested', 'in_progress', 'completed', 'blocked_retention', 'rejected'));--> statement-breakpoint
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_status_check" CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired'));--> statement-breakpoint
ALTER TABLE "ai_content_versions" ADD CONSTRAINT "ai_content_versions_approval_check" CHECK (approval_status IN ('pending', 'approved', 'rejected'));
