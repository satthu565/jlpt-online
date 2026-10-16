CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"badge_icon" text,
	"criteria" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"share_token" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "ai_content_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid,
	"generated_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"task_type" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tracking_allowed" boolean DEFAULT false NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"properties" jsonb DEFAULT '{}' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_change_aggregates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"changed_from" smallint NOT NULL,
	"changed_to" smallint NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answer_options" (
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"order_index" smallint NOT NULL,
	"content" jsonb NOT NULL,
	CONSTRAINT "answer_options_question_id_question_version_order_index_pk" PRIMARY KEY("question_id","question_version","order_index")
);
--> statement-breakpoint
CREATE TABLE "article_versions" (
	"article_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_versions_article_id_version_pk" PRIMARY KEY("article_id","version")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "assignment_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"assignment_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assignment_learners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"assignment_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"exam_id" uuid,
	"title" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_answer_sheets" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"answers" smallint[] NOT NULL,
	"flags" smallint[] DEFAULT '{}' NOT NULL,
	"time_spent_ms" integer[],
	"last_seq" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_events" (
	"id" uuid NOT NULL,
	"attempt_month" date NOT NULL,
	"attempt_id" uuid NOT NULL,
	"seq" integer,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_events_attempt_month_id_pk" PRIMARY KEY("attempt_month","id")
);
--> statement-breakpoint
CREATE TABLE "backup_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"backup_type" text NOT NULL,
	"status" text NOT NULL,
	"size_bytes" integer,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blueprint_versions" (
	"blueprint_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"sections" jsonb NOT NULL,
	"scoring" jsonb NOT NULL,
	"changed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blueprint_versions_blueprint_id_version_pk" PRIMARY KEY("blueprint_id","version")
);
--> statement-breakpoint
CREATE TABLE "blueprints" (
	"id" uuid PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"version" integer NOT NULL,
	"kind" text DEFAULT 'synthetic' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"effective_from" text NOT NULL,
	"source_ref" jsonb NOT NULL,
	"note" text,
	"sections" jsonb NOT NULL,
	"scoring" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"client_review_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardSchedules" (
	"card_id" uuid PRIMARY KEY NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'learning' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"notebook_item_id" uuid NOT NULL,
	"front" jsonb NOT NULL,
	"back" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_enrollments" (
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "challenge_enrollments_user_id_challenge_id_pk" PRIMARY KEY("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_type" text NOT NULL,
	"target_goal" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"invite_hash" text NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_invitations_invite_hash_unique" UNIQUE("invite_hash")
);
--> statement-breakpoint
CREATE TABLE "class_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"comment_id" uuid NOT NULL,
	"reported_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"policy_version" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_licenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"license_type" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"target_version" integer NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"last_editor_id" uuid NOT NULL,
	"status" text NOT NULL,
	"comments" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus_aggregates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correct_answers" (
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"correct_option" smallint NOT NULL,
	"explanation_notes" text,
	CONSTRAINT "correct_answers_question_id_question_version_pk" PRIMARY KEY("question_id","question_version")
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coupon_code" text NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coupon_code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"discount_percent" integer,
	"discount_amount" integer,
	"max_redemptions" integer DEFAULT 1 NOT NULL,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"valid_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_export_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"download_url" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dataset_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL,
	"document_hash" text NOT NULL,
	"content" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"license_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dead_letter_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"reason" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement_definitions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "entitlement_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entitlement_code" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"source_ref" text
);
--> statement-breakpoint
CREATE TABLE "entry_meanings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL,
	"meaning" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_readings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"reading" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_result_publications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"released_at" timestamp with time zone NOT NULL,
	"released_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_answer_keys" (
	"exam_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"keys" smallint[] NOT NULL,
	"skills" text[] NOT NULL,
	"mondai_types" text[] NOT NULL,
	"section_ranges" jsonb NOT NULL,
	CONSTRAINT "exam_answer_keys_exam_id_version_pk" PRIMARY KEY("exam_id","version")
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"guest_id" uuid,
	"exam_id" uuid NOT NULL,
	"exam_version" integer NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"submitted_by" text,
	"current_section" smallint,
	"current_deadline" timestamp with time zone,
	"section_times" jsonb DEFAULT '[]' NOT NULL,
	"lease_id" uuid NOT NULL,
	"result_flags" text[] DEFAULT '{}' NOT NULL,
	"attempt_month" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "exam_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"level" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"result_release_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"registered_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_favorites" (
	"user_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_favorites_user_id_exam_id_pk" PRIMARY KEY("user_id","exam_id")
);
--> statement-breakpoint
CREATE TABLE "exam_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exam_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"exam_id" uuid NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"order_index" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "exam_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provenance" text NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "exam_versions" (
	"exam_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot_key" text NOT NULL,
	"manifest_key" text NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"blueprint_version" integer NOT NULL,
	"scoring" jsonb NOT NULL,
	"total_questions" integer NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"published_by" uuid NOT NULL,
	CONSTRAINT "exam_versions_exam_id_version_pk" PRIMARY KEY("exam_id","version")
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"level" text NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"year" integer,
	"session" text,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"published_version" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "experiment_assignments" (
	"experiment_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"variant" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experiment_assignments_experiment_id_subject_id_pk" PRIMARY KEY("experiment_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "experiment_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"variants" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_exposures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"experiment_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"exposed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "explanation_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL,
	"author_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"status" text NOT NULL,
	"storage_path" text,
	"requested_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "faq_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order_index" smallint DEFAULT 0 NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_exam_items" (
	"generated_exam_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" smallint NOT NULL,
	CONSTRAINT "generated_exam_items_generated_exam_id_order_index_pk" PRIMARY KEY("generated_exam_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "generated_exams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"config_json" jsonb NOT NULL,
	"seed" text NOT NULL,
	"engine_version" text NOT NULL,
	"selection_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grammar_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL,
	"grammar_id" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grammar_points" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pattern" text NOT NULL,
	"level" text NOT NULL,
	"meaning" text NOT NULL,
	"formation" text,
	"examples" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_artifacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"artifact_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" text NOT NULL,
	"logs" jsonb DEFAULT '[]' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"package_sha256" text NOT NULL,
	"file_name" text NOT NULL,
	"target_level" text,
	"error_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kanji_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kanji" text NOT NULL,
	"level" text,
	"stroke_count" smallint,
	"onyomi" text[] DEFAULT '{}' NOT NULL,
	"kunyomi" text[] DEFAULT '{}' NOT NULL,
	"meanings" jsonb DEFAULT '[]' NOT NULL,
	CONSTRAINT "kanji_entries_kanji_unique" UNIQUE("kanji")
);
--> statement-breakpoint
CREATE TABLE "kanji_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL,
	"kanji_id" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"published_version" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "landing_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"level" text NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"rank" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexical_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"license_id" uuid,
	"term" text NOT NULL,
	"level" text,
	"part_of_speech" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexicon_licenses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"license" text NOT NULL,
	"rights_terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sha256" text NOT NULL,
	"key" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"duration_sec" integer,
	"rights" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"moderator_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content_id" uuid NOT NULL,
	"score" integer,
	"flagged" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "near_duplicate_candidates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id_a" uuid NOT NULL,
	"question_id_b" uuid NOT NULL,
	"similarity_score" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notebook_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"entry_id" uuid NOT NULL,
	"mastered" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"status" text NOT NULL,
	"provider_response" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"notification_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "notification_preferences_user_id_channel_notification_type_pk" PRIMARY KEY("user_id","channel","notification_type")
);
--> statement-breakpoint
CREATE TABLE "operator_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"operator_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_resource" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"plan_id" text,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_ref" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_versions" (
	"plan_id" text NOT NULL,
	"version" integer NOT NULL,
	"price" integer NOT NULL,
	"entitlements" jsonb NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	CONSTRAINT "plan_versions_plan_id_version_pk" PRIMARY KEY("plan_id","version")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"interval" text NOT NULL,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"event_id" uuid NOT NULL,
	"consumer" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_event_id_consumer_pk" PRIMARY KEY("event_id","consumer")
);
--> statement-breakpoint
CREATE TABLE "pronunciation_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"accent" text
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config_ref" text
);
--> statement-breakpoint
CREATE TABLE "provider_cost_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"cost_cents" integer NOT NULL,
	"period" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_difficulty_stats" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"difficulty_index" integer DEFAULT 50 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_exposures" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"exposure_count" integer DEFAULT 1 NOT NULL,
	"last_exposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_exposures_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "question_group_versions" (
	"group_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"passage" jsonb NOT NULL,
	"audio_sha256" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_group_versions_group_id_version_pk" PRIMARY KEY("group_id","version")
);
--> statement-breakpoint
CREATE TABLE "question_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_id" uuid,
	"license_id" uuid,
	"level" text NOT NULL,
	"section_code" text NOT NULL,
	"title" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_marks" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"mark_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_marks_user_id_question_id_mark_type_pk" PRIMARY KEY("user_id","question_id","mark_type")
);
--> statement-breakpoint
CREATE TABLE "question_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"reported_by" uuid NOT NULL,
	"issue_type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_source_refs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_page" integer,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "question_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"question_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "question_versions" (
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"stem" jsonb NOT NULL,
	"explanation" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_versions_question_id_version_pk" PRIMARY KEY("question_id","version")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid,
	"level" text NOT NULL,
	"skill" text NOT NULL,
	"mondai_type" text NOT NULL,
	"origin" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"discrepancies_found" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"refund_request_id" uuid NOT NULL,
	"provider_refund_ref" text,
	"status" text NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refund_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"report_name" text NOT NULL,
	"period" text NOT NULL,
	"data" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"retention_days" integer NOT NULL,
	"policy_approved" boolean DEFAULT false NOT NULL,
	"approved_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "site_content_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"page_key" text NOT NULL,
	"version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "streak_days" (
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"activity_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "streak_days_user_id_local_date_pk" PRIMARY KEY("user_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "study_plan_versions" (
	"plan_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"weekly_schedule" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plan_versions_plan_id_version_pk" PRIMARY KEY("plan_id","version")
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"target_level" text NOT NULL,
	"target_date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_session_completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"client_event_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_spent_seconds" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_changes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"change_type" text NOT NULL,
	"old_plan_id" text,
	"new_plan_id" text,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resume_url" text,
	"qualifications" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"version" integer NOT NULL,
	"locale" text DEFAULT 'vi' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_request_id" uuid,
	"tokens_used" integer NOT NULL,
	"cost_micro_usd" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_reservations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"estimated_tokens" integer NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"user_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_user_id_achievement_id_pk" PRIMARY KEY("user_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"attempt_id" uuid NOT NULL,
	"question_index" smallint NOT NULL,
	"question_id" uuid NOT NULL,
	"option_value" smallint NOT NULL,
	"is_correct" boolean NOT NULL,
	"flagged" boolean NOT NULL,
	CONSTRAINT "user_answers_attempt_id_question_index_pk" PRIMARY KEY("attempt_id","question_index")
);
--> statement-breakpoint
CREATE TABLE "user_mondai_aggregates" (
	"user_id" uuid NOT NULL,
	"mondai_type" text NOT NULL,
	"accuracy_rate" integer NOT NULL,
	"sample_size" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_mondai_aggregates_user_id_mondai_type_pk" PRIMARY KEY("user_id","mondai_type")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"bio" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_question_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_skill_aggregates" (
	"user_id" uuid NOT NULL,
	"skill" text NOT NULL,
	"accuracy_rate" integer NOT NULL,
	"sample_size" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_skill_aggregates_user_id_skill_pk" PRIMARY KEY("user_id","skill")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"target_level" text,
	"locale" text DEFAULT 'vi' NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"target_exam_date" date,
	"target_score" integer,
	"blocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_occurrences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dataset_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_shares" ADD CONSTRAINT "achievement_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_content_versions" ADD CONSTRAINT "ai_content_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_provider_id_provider_accounts_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."provider_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_consents" ADD CONSTRAINT "analytics_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_change_aggregates" ADD CONSTRAINT "answer_change_aggregates_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_learner_id_users_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_learners" ADD CONSTRAINT "assignment_learners_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_learners" ADD CONSTRAINT "assignment_learners_learner_id_users_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answer_sheets" ADD CONSTRAINT "attempt_answer_sheets_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_events" ADD CONSTRAINT "attempt_events_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_versions" ADD CONSTRAINT "blueprint_versions_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprint_versions" ADD CONSTRAINT "blueprint_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blueprints" ADD CONSTRAINT "blueprints_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_reviews" ADD CONSTRAINT "card_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardSchedules" ADD CONSTRAINT "cardSchedules_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_notebook_item_id_notebook_items_id_fk" FOREIGN KEY ("notebook_item_id") REFERENCES "public"."notebook_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_invitations" ADD CONSTRAINT "class_invitations_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_licenses" ADD CONSTRAINT "content_licenses_source_id_exam_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."exam_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_last_editor_id_users_id_fk" FOREIGN KEY ("last_editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correct_answers" ADD CONSTRAINT "correct_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_code_coupons_code_fk" FOREIGN KEY ("coupon_code") REFERENCES "public"."coupons"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_reservations" ADD CONSTRAINT "coupon_reservations_coupon_code_coupons_code_fk" FOREIGN KEY ("coupon_code") REFERENCES "public"."coupons"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_reservations" ADD CONSTRAINT "coupon_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_documents" ADD CONSTRAINT "dataset_documents_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_license_id_lexicon_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."lexicon_licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_entitlement_code_entitlement_definitions_code_fk" FOREIGN KEY ("entitlement_code") REFERENCES "public"."entitlement_definitions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_meanings" ADD CONSTRAINT "entry_meanings_entry_id_lexical_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."lexical_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_readings" ADD CONSTRAINT "entry_readings_entry_id_lexical_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."lexical_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attempts" ADD CONSTRAINT "event_attempts_event_id_exam_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."exam_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attempts" ADD CONSTRAINT "event_attempts_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attempts" ADD CONSTRAINT "event_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_exam_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."exam_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_result_publications" ADD CONSTRAINT "event_result_publications_event_id_exam_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."exam_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_result_publications" ADD CONSTRAINT "event_result_publications_released_by_users_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_favorites" ADD CONSTRAINT "exam_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_favorites" ADD CONSTRAINT "exam_favorites_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_items" ADD CONSTRAINT "exam_items_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_items" ADD CONSTRAINT "exam_items_section_id_exam_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."exam_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_items" ADD CONSTRAINT "exam_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_sections" ADD CONSTRAINT "exam_sections_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_shares" ADD CONSTRAINT "exam_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_versions" ADD CONSTRAINT "exam_versions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_versions" ADD CONSTRAINT "exam_versions_blueprint_id_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_versions" ADD CONSTRAINT "exam_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experiment_id_experiment_definitions_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_exposures" ADD CONSTRAINT "experiment_exposures_experiment_id_experiment_definitions_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanation_versions" ADD CONSTRAINT "explanation_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanation_versions" ADD CONSTRAINT "explanation_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_exam_items" ADD CONSTRAINT "generated_exam_items_generated_exam_id_generated_exams_id_fk" FOREIGN KEY ("generated_exam_id") REFERENCES "public"."generated_exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_exam_items" ADD CONSTRAINT "generated_exam_items_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_exams" ADD CONSTRAINT "generated_exams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_occurrences" ADD CONSTRAINT "grammar_occurrences_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_occurrences" ADD CONSTRAINT "grammar_occurrences_grammar_id_grammar_points_id_fk" FOREIGN KEY ("grammar_id") REFERENCES "public"."grammar_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_artifacts" ADD CONSTRAINT "import_artifacts_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_job_attempts" ADD CONSTRAINT "import_job_attempts_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanji_occurrences" ADD CONSTRAINT "kanji_occurrences_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanji_occurrences" ADD CONSTRAINT "kanji_occurrences_kanji_id_kanji_entries_id_fk" FOREIGN KEY ("kanji_id") REFERENCES "public"."kanji_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexical_entries" ADD CONSTRAINT "lexical_entries_license_id_lexicon_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."lexicon_licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "near_duplicate_candidates" ADD CONSTRAINT "near_duplicate_candidates_question_id_a_questions_id_fk" FOREIGN KEY ("question_id_a") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "near_duplicate_candidates" ADD CONSTRAINT "near_duplicate_candidates_question_id_b_questions_id_fk" FOREIGN KEY ("question_id_b") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_items" ADD CONSTRAINT "notebook_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_job_id_notification_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."notification_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_actions" ADD CONSTRAINT "operator_actions_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_versions" ADD CONSTRAINT "plan_versions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_assets" ADD CONSTRAINT "pronunciation_assets_entry_id_lexical_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."lexical_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_assets" ADD CONSTRAINT "pronunciation_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_difficulty_stats" ADD CONSTRAINT "question_difficulty_stats_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_exposures" ADD CONSTRAINT "question_exposures_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_group_versions" ADD CONSTRAINT "question_group_versions_group_id_question_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."question_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_source_id_exam_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."exam_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_license_id_content_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."content_licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_marks" ADD CONSTRAINT "question_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_marks" ADD CONSTRAINT "question_marks_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_source_refs" ADD CONSTRAINT "question_source_refs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_source_refs" ADD CONSTRAINT "question_source_refs_source_id_exam_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."exam_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_group_id_question_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."question_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_attempts" ADD CONSTRAINT "refund_attempts_refund_request_id_refund_requests_id_fk" FOREIGN KEY ("refund_request_id") REFERENCES "public"."refund_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_days" ADD CONSTRAINT "streak_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_versions" ADD CONSTRAINT "study_plan_versions_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_session_completions" ADD CONSTRAINT "study_session_completions_session_id_study_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."study_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_plan_id_study_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."study_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_applications" ADD CONSTRAINT "teacher_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_ai_request_id_ai_requests_id_fk" FOREIGN KEY ("ai_request_id") REFERENCES "public"."ai_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_reservations" ADD CONSTRAINT "usage_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mondai_aggregates" ADD CONSTRAINT "user_mondai_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_history" ADD CONSTRAINT "user_question_history_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skill_aggregates" ADD CONSTRAINT "user_skill_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_occurrences" ADD CONSTRAINT "vocab_occurrences_dataset_id_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."datasets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_occurrences" ADD CONSTRAINT "vocab_occurrences_entry_id_lexical_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."lexical_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consents_user_purpose_version_idx" ON "consents" USING btree ("user_id","purpose","policy_version");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempts_user_exam_open_idx" ON "exam_attempts" USING btree ("user_id","exam_id") WHERE status = 'in_progress' AND user_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "exam_attempts_current_deadline_idx" ON "exam_attempts" USING btree ("current_deadline") WHERE status = 'in_progress';--> statement-breakpoint
CREATE INDEX "outbox_created_at_unpublished_idx" ON "outbox" USING btree ("created_at") WHERE published_at IS NULL;