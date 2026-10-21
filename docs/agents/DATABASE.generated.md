<!-- File tự sinh bởi tools/agents/gen-project-map.mjs. Không sửa tay: chạy `pnpm docs:map`. -->

# Database (tự sinh)

Nguồn: `apps/api/src/db/schema.ts`. 142 bảng, 10 migration.
Quy ước và cách thêm bảng: [DATABASE.md](DATABASE.md).

## Migration

- `0000_legal_paibok.sql`
- `0001_curvy_invisible_woman.sql`
- `0002_tenant_retention_community.sql`
- `0003_privacy_export_isolation.sql`
- `0004_dataset_slug.sql`
- `0005_blueprint_effective_to.sql`
- `0006_section_listening_timeline.sql`
- `0007_lexicon_hanviet.sql`
- `0008_corpus_terms.sql`
- `0009_entry_meanings_senses.sql`

## Bảng

- [`accounts`](#accounts)
- [`achievement_definitions`](#achievement_definitions)
- [`achievement_shares`](#achievement_shares)
- [`ai_content_versions`](#ai_content_versions)
- [`ai_requests`](#ai_requests)
- [`analytics_consents`](#analytics_consents)
- [`analytics_events`](#analytics_events)
- [`answer_change_aggregates`](#answer_change_aggregates)
- [`answer_options`](#answer_options)
- [`article_versions`](#article_versions)
- [`articles`](#articles)
- [`assignment_attempts`](#assignment_attempts)
- [`assignment_learners`](#assignment_learners)
- [`assignments`](#assignments)
- [`attempt_answer_sheets`](#attempt_answer_sheets)
- [`attempt_events`](#attempt_events)
- [`backup_jobs`](#backup_jobs)
- [`blueprint_versions`](#blueprint_versions)
- [`blueprints`](#blueprints)
- [`card_reviews`](#card_reviews)
- [`card_schedules`](#card_schedules)
- [`cards`](#cards)
- [`challenge_enrollments`](#challenge_enrollments)
- [`challenges`](#challenges)
- [`class_invitations`](#class_invitations)
- [`class_memberships`](#class_memberships)
- [`classes`](#classes)
- [`comment_reports`](#comment_reports)
- [`comments`](#comments)
- [`consents`](#consents)
- [`content_licenses`](#content_licenses)
- [`content_reviews`](#content_reviews)
- [`corpus_aggregates`](#corpus_aggregates)
- [`corpus_terms`](#corpus_terms)
- [`correct_answers`](#correct_answers)
- [`coupon_redemptions`](#coupon_redemptions)
- [`coupon_reservations`](#coupon_reservations)
- [`coupons`](#coupons)
- [`data_export_jobs`](#data_export_jobs)
- [`dataset_documents`](#dataset_documents)
- [`datasets`](#datasets)
- [`dead_letter_events`](#dead_letter_events)
- [`deletion_requests`](#deletion_requests)
- [`discussion_threads`](#discussion_threads)
- [`entitlement_definitions`](#entitlement_definitions)
- [`entitlement_grants`](#entitlement_grants)
- [`entry_meanings`](#entry_meanings)
- [`entry_readings`](#entry_readings)
- [`event_attempts`](#event_attempts)
- [`event_registrations`](#event_registrations)
- [`event_result_publications`](#event_result_publications)
- [`exam_answer_keys`](#exam_answer_keys)
- [`exam_attempts`](#exam_attempts)
- [`exam_events`](#exam_events)
- [`exam_favorites`](#exam_favorites)
- [`exam_items`](#exam_items)
- [`exam_sections`](#exam_sections)
- [`exam_shares`](#exam_shares)
- [`exam_sources`](#exam_sources)
- [`exam_versions`](#exam_versions)
- [`exams`](#exams)
- [`experiment_assignments`](#experiment_assignments)
- [`experiment_definitions`](#experiment_definitions)
- [`experiment_exposures`](#experiment_exposures)
- [`explanation_versions`](#explanation_versions)
- [`export_jobs`](#export_jobs)
- [`faq_items`](#faq_items)
- [`generated_exam_items`](#generated_exam_items)
- [`generated_exams`](#generated_exams)
- [`grammar_occurrences`](#grammar_occurrences)
- [`grammar_points`](#grammar_points)
- [`import_artifacts`](#import_artifacts)
- [`import_job_attempts`](#import_job_attempts)
- [`import_jobs`](#import_jobs)
- [`kanji_entries`](#kanji_entries)
- [`kanji_occurrences`](#kanji_occurrences)
- [`landing_pages`](#landing_pages)
- [`leaderboard_entries`](#leaderboard_entries)
- [`lexical_entries`](#lexical_entries)
- [`lexicon_hanviet_reports`](#lexicon_hanviet_reports)
- [`lexicon_licenses`](#lexicon_licenses)
- [`media_assets`](#media_assets)
- [`moderation_actions`](#moderation_actions)
- [`moderation_reviews`](#moderation_reviews)
- [`near_duplicate_candidates`](#near_duplicate_candidates)
- [`notebook_items`](#notebook_items)
- [`notification_deliveries`](#notification_deliveries)
- [`notification_jobs`](#notification_jobs)
- [`notification_preferences`](#notification_preferences)
- [`operator_actions`](#operator_actions)
- [`order_lines`](#order_lines)
- [`orders`](#orders)
- [`org_memberships`](#org_memberships)
- [`organizations`](#organizations)
- [`outbox`](#outbox)
- [`payment_attempts`](#payment_attempts)
- [`payment_webhook_events`](#payment_webhook_events)
- [`plan_versions`](#plan_versions)
- [`plans`](#plans)
- [`processed_events`](#processed_events)
- [`pronunciation_assets`](#pronunciation_assets)
- [`provider_accounts`](#provider_accounts)
- [`provider_cost_records`](#provider_cost_records)
- [`push_subscriptions`](#push_subscriptions)
- [`question_difficulty_stats`](#question_difficulty_stats)
- [`question_exposures`](#question_exposures)
- [`question_group_versions`](#question_group_versions)
- [`question_groups`](#question_groups)
- [`question_marks`](#question_marks)
- [`question_reports`](#question_reports)
- [`question_source_refs`](#question_source_refs)
- [`question_tags`](#question_tags)
- [`question_versions`](#question_versions)
- [`questions`](#questions)
- [`reconciliation_runs`](#reconciliation_runs)
- [`refund_attempts`](#refund_attempts)
- [`refund_requests`](#refund_requests)
- [`report_snapshots`](#report_snapshots)
- [`retention_policies`](#retention_policies)
- [`sessions`](#sessions)
- [`site_content_versions`](#site_content_versions)
- [`streak_days`](#streak_days)
- [`study_plan_versions`](#study_plan_versions)
- [`study_plans`](#study_plans)
- [`study_session_completions`](#study_session_completions)
- [`study_sessions`](#study_sessions)
- [`subscription_changes`](#subscription_changes)
- [`subscriptions`](#subscriptions)
- [`teacher_applications`](#teacher_applications)
- [`template_versions`](#template_versions)
- [`tenant_plans`](#tenant_plans)
- [`usage_ledger`](#usage_ledger)
- [`usage_reservations`](#usage_reservations)
- [`user_achievements`](#user_achievements)
- [`user_answers`](#user_answers)
- [`user_mondai_aggregates`](#user_mondai_aggregates)
- [`user_profiles`](#user_profiles)
- [`user_question_history`](#user_question_history)
- [`user_skill_aggregates`](#user_skill_aggregates)
- [`users`](#users)
- [`verifications`](#verifications)
- [`vocab_occurrences`](#vocab_occurrences)

### accounts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `account_id` | text | not null |  |
| `provider_id` | text | not null |  |
| `access_token` | text |  |  |
| `refresh_token` | text |  |  |
| `id_token` | text |  |  |
| `access_token_expires_at` | timestamp |  |  |
| `refresh_token_expires_at` | timestamp |  |  |
| `scope` | text |  |  |
| `password` | text |  |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### achievement_definitions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | text | PK |  |
| `title` | text | not null |  |
| `description` | text | not null |  |
| `badge_icon` | text |  |  |
| `criteria` | jsonb | not null |  |

### achievement_shares

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `share_token` | text | not null |  |
| `payload` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |

### ai_content_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid |  | `questions` |
| `generated_type` | text | not null |  |
| `content` | jsonb | not null |  |
| `ai_generated` | boolean | not null |  |
| `approval_status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### ai_requests

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `provider_id` | text | not null | `provider_accounts` |
| `task_type` | text | not null |  |
| `prompt_tokens` | integer |  |  |
| `completion_tokens` | integer |  |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### analytics_consents

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `tracking_allowed` | boolean | not null |  |
| `consented_at` | timestamp | not null |  |

### analytics_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `event_name` | text | not null |  |
| `user_id` | uuid |  |  |
| `session_id` | text |  |  |
| `properties` | jsonb | not null |  |
| `timestamp` | timestamp | not null |  |

### answer_change_aggregates

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid | not null | `questions` |
| `changed_from` | smallint | not null |  |
| `changed_to` | smallint | not null |  |
| `count` | integer | not null |  |

### answer_options

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `question_id` | uuid | not null | `questions` |
| `question_version` | integer | not null |  |
| `order_index` | smallint | not null |  |
| `content` | jsonb | not null |  |

### article_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `article_id` | uuid | not null | `articles` |
| `version` | integer | not null |  |
| `title` | text | not null |  |
| `content` | jsonb | not null |  |
| `author_id` | uuid | not null | `users` |
| `created_at` | timestamp | not null |  |

### articles

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `slug` | text | not null |  |
| `locale` | text | not null |  |
| `status` | text | not null |  |
| `published_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### assignment_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `assignment_id` | uuid | not null | `assignments` |
| `learner_id` | uuid | not null | `users` |
| `attempt_id` | uuid | not null | `exam_attempts` |
| `submitted_at` | timestamp |  |  |

### assignment_learners

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `assignment_id` | uuid | not null | `assignments` |
| `learner_id` | uuid | not null | `users` |
| `status` | text | not null |  |

### assignments

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `class_id` | uuid | not null | `classes` |
| `exam_id` | uuid |  | `exams` |
| `title` | text | not null |  |
| `opens_at` | timestamp | not null |  |
| `due_at` | timestamp | not null |  |
| `created_at` | timestamp | not null |  |

### attempt_answer_sheets

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `attempt_id` | uuid | PK | `exam_attempts` |
| `answers` | smallint | not null |  |
| `flags` | smallint | not null |  |
| `time_spent_ms` | integer |  |  |
| `last_seq` | integer | not null |  |
| `updated_at` | timestamp | not null |  |

### attempt_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | not null |  |
| `attempt_month` | date | not null |  |
| `attempt_id` | uuid | not null | `exam_attempts` |
| `seq` | integer |  |  |
| `type` | text | not null |  |
| `payload` | jsonb | not null |  |
| `at` | timestamp | not null |  |

### backup_jobs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `backup_type` | text | not null |  |
| `status` | text | not null |  |
| `size_bytes` | integer |  |  |
| `completed_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### blueprint_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `blueprint_id` | uuid | not null | `blueprints` |
| `version` | integer | not null |  |
| `sections` | jsonb | not null |  |
| `scoring` | jsonb | not null |  |
| `changed_by` | uuid | not null | `users` |
| `created_at` | timestamp | not null |  |

### blueprints

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `level` | text | not null |  |
| `version` | integer | not null |  |
| `kind` | text | not null |  |
| `status` | text | not null |  |
| `is_official` | boolean | not null |  |
| `is_confirmed` | boolean | not null |  |
| `confirmed_by` | uuid |  | `users` |
| `confirmed_at` | timestamp |  |  |
| `effective_from` | text | not null |  |
| `effective_to` | text |  |  |
| `source_ref` | jsonb | not null |  |
| `note` | text |  |  |
| `sections` | jsonb | not null |  |
| `scoring` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |

### card_reviews

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `card_id` | uuid | not null | `cards` |
| `user_id` | uuid | not null | `users` |
| `client_review_id` | uuid | not null |  |
| `rating` | smallint | not null |  |
| `reviewed_at` | timestamp | not null |  |

### card_schedules

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `card_id` | uuid | PK | `cards` |
| `due_at` | timestamp | not null |  |
| `interval_days` | integer | not null |  |
| `ease_factor` | integer | not null |  |
| `repetitions` | integer | not null |  |
| `state` | text | not null |  |

### cards

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `notebook_item_id` | uuid | not null | `notebook_items` |
| `front` | jsonb | not null |  |
| `back` | jsonb | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### challenge_enrollments

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `challenge_id` | uuid | not null | `challenges` |
| `progress` | integer | not null |  |
| `completed_at` | timestamp |  |  |

### challenges

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `title` | text | not null |  |
| `description` | text | not null |  |
| `start_date` | date | not null |  |
| `end_date` | date | not null |  |
| `target_type` | text | not null |  |
| `target_goal` | integer | not null |  |

### class_invitations

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `class_id` | uuid | not null | `classes` |
| `invite_hash` | text | not null |  |
| `max_uses` | integer | not null |  |
| `used_count` | integer | not null |  |
| `expires_at` | timestamp | not null |  |
| `created_at` | timestamp | not null |  |

### class_memberships

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `class_id` | uuid | not null | `classes` |
| `student_id` | uuid | not null | `users` |
| `status` | text | not null |  |
| `joined_at` | timestamp | not null |  |

### classes

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `org_id` | uuid | not null | `organizations` |
| `teacher_id` | uuid | not null | `users` |
| `name` | text | not null |  |
| `level` | text | not null |  |
| `created_at` | timestamp | not null |  |

### comment_reports

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `comment_id` | uuid | not null | `comments` |
| `reported_by` | uuid | not null | `users` |
| `reason` | text | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### comments

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `thread_id` | uuid | not null | `discussion_threads` |
| `author_id` | uuid | not null | `users` |
| `content` | text | not null |  |
| `deleted_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### consents

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `purpose` | text | not null |  |
| `policy_version` | text | not null |  |
| `granted_at` | timestamp | not null |  |
| `withdrawn_at` | timestamp |  |  |

### content_licenses

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `source_id` | uuid | not null | `exam_sources` |
| `license_type` | text | not null |  |
| `effective_from` | timestamp | not null |  |
| `expires_at` | timestamp |  |  |
| `revoked_at` | timestamp |  |  |
| `terms` | text |  |  |
| `created_at` | timestamp | not null |  |

### content_reviews

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `target_type` | text | not null |  |
| `target_id` | uuid | not null |  |
| `target_version` | integer | not null |  |
| `reviewer_id` | uuid | not null | `users` |
| `last_editor_id` | uuid | not null | `users` |
| `status` | text | not null |  |
| `comments` | text |  |  |
| `reviewed_at` | timestamp | not null |  |

### corpus_aggregates

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `level` | text | not null |  |
| `aggregate_type` | text | not null |  |
| `payload` | jsonb | not null |  |
| `calculated_at` | timestamp | not null |  |

### corpus_terms

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `dataset_id` | uuid | not null | `datasets` |
| `term` | text | not null |  |
| `reading` | text |  |  |
| `level` | text | not null |  |
| `exam_id` | uuid | not null | `exams` |
| `question_id` | uuid |  | `questions` |
| `section` | text |  |  |
| `skill` | text |  |  |
| `count` | integer | not null |  |
| `created_at` | timestamp | not null |  |

### correct_answers

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `question_id` | uuid | not null | `questions` |
| `question_version` | integer | not null |  |
| `correct_option` | smallint | not null |  |
| `explanation_notes` | text |  |  |

### coupon_redemptions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `coupon_code` | text | not null | `coupons` |
| `order_id` | uuid | not null | `orders` |
| `user_id` | uuid | not null | `users` |
| `redeemed_at` | timestamp | not null |  |

### coupon_reservations

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `coupon_code` | text | not null | `coupons` |
| `user_id` | uuid | not null | `users` |
| `reserved_at` | timestamp | not null |  |
| `expires_at` | timestamp | not null |  |

### coupons

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `code` | text | PK |  |
| `discount_percent` | integer |  |  |
| `discount_amount` | integer |  |  |
| `max_redemptions` | integer | not null |  |
| `times_redeemed` | integer | not null |  |
| `valid_until` | timestamp |  |  |

### data_export_jobs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `status` | text | not null |  |
| `download_url` | text |  |  |
| `expires_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |
| `completed_at` | timestamp |  |  |

### dataset_documents

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `dataset_id` | uuid | not null | `datasets` |
| `document_hash` | text | not null |  |
| `content` | text |  |  |
| `metadata` | jsonb | not null |  |

### datasets

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `slug` | text |  |  |
| `name` | text | not null |  |
| `version` | text | not null |  |
| `license_id` | uuid |  | `lexicon_licenses` |
| `created_at` | timestamp | not null |  |

### dead_letter_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `event_id` | uuid | not null |  |
| `topic` | text | not null |  |
| `payload` | jsonb | not null |  |
| `reason` | text | not null |  |
| `retry_count` | integer | not null |  |
| `next_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### deletion_requests

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `status` | text | not null |  |
| `requested_at` | timestamp | not null |  |
| `processed_at` | timestamp |  |  |
| `metadata` | jsonb | not null |  |

### discussion_threads

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `target_type` | text | not null |  |
| `target_id` | uuid | not null |  |
| `author_id` | uuid | not null | `users` |
| `title` | text | not null |  |
| `content` | text | not null |  |
| `deleted_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### entitlement_definitions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `code` | text | PK |  |
| `name` | text | not null |  |
| `description` | text |  |  |

### entitlement_grants

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `entitlement_code` | text | not null | `entitlement_definitions` |
| `granted_at` | timestamp | not null |  |
| `expires_at` | timestamp |  |  |
| `source_ref` | text |  |  |

### entry_meanings

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `entry_id` | uuid | not null | `lexical_entries` |
| `locale` | text | not null |  |
| `meaning` | text | not null |  |
| `sense_index` | integer | not null |  |
| `pos` | text |  |  |

### entry_readings

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `entry_id` | uuid | not null | `lexical_entries` |
| `reading` | text | not null |  |
| `is_primary` | boolean | not null |  |

### event_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `event_id` | uuid | not null | `exam_events` |
| `attempt_id` | uuid | not null | `exam_attempts` |
| `user_id` | uuid | not null | `users` |

### event_registrations

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `event_id` | uuid | not null | `exam_events` |
| `user_id` | uuid | not null | `users` |
| `registered_at` | timestamp | not null |  |

### event_result_publications

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `event_id` | uuid | not null | `exam_events` |
| `released_at` | timestamp | not null |  |
| `released_by` | uuid | not null | `users` |

### exam_answer_keys

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `exam_id` | uuid | not null |  |
| `version` | integer | not null |  |
| `keys` | smallint | not null |  |
| `skills` | text | not null |  |
| `mondai_types` | text | not null |  |
| `section_ranges` | jsonb | not null |  |

### exam_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid |  | `users` |
| `guest_id` | uuid |  |  |
| `exam_id` | uuid | not null | `exams` |
| `exam_version` | integer | not null |  |
| `mode` | text | not null |  |
| `status` | text | not null |  |
| `submitted_by` | text |  |  |
| `current_section` | smallint |  |  |
| `current_deadline` | timestamp |  |  |
| `section_times` | jsonb | not null |  |
| `lease_id` | uuid | not null |  |
| `result_flags` | text | not null |  |
| `attempt_month` | date | not null |  |
| `started_at` | timestamp | not null |  |
| `last_activity_at` | timestamp | not null |  |
| `submitted_at` | timestamp |  |  |
| `result` | jsonb |  |  |

### exam_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `title` | text | not null |  |
| `level` | text | not null |  |
| `opens_at` | timestamp | not null |  |
| `starts_at` | timestamp | not null |  |
| `ends_at` | timestamp | not null |  |
| `result_release_at` | timestamp | not null |  |
| `capacity` | integer | not null |  |
| `registered_count` | integer | not null |  |
| `created_at` | timestamp | not null |  |

### exam_favorites

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `exam_id` | uuid | not null | `exams` |
| `created_at` | timestamp | not null |  |

### exam_items

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `exam_id` | uuid | not null | `exams` |
| `section_id` | uuid | not null | `exam_sections` |
| `question_id` | uuid | not null | `questions` |
| `order_index` | smallint | not null |  |

### exam_sections

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `exam_id` | uuid | not null | `exams` |
| `code` | text | not null |  |
| `title` | text | not null |  |
| `duration_sec` | integer | not null |  |
| `order_index` | smallint | not null |  |
| `listening_timeline` | jsonb |  |  |

### exam_shares

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `owner_id` | uuid | not null | `users` |
| `resource_type` | text | not null |  |
| `resource_id` | uuid | not null |  |
| `token_hash` | text | not null |  |
| `expires_at` | timestamp | not null |  |
| `created_at` | timestamp | not null |  |

### exam_sources

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `slug` | text | not null |  |
| `name` | text | not null |  |
| `provenance` | text | not null |  |
| `metadata` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |

### exam_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `exam_id` | uuid | not null | `exams` |
| `version` | integer | not null |  |
| `snapshot_key` | text | not null |  |
| `manifest_key` | text | not null |  |
| `blueprint_id` | uuid | not null | `blueprints` |
| `blueprint_version` | integer | not null |  |
| `scoring` | jsonb | not null |  |
| `total_questions` | integer | not null |  |
| `published_at` | timestamp | not null |  |
| `published_by` | uuid | not null | `users` |

### exams

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `slug` | text | not null |  |
| `level` | text | not null |  |
| `title` | text | not null |  |
| `kind` | text | not null |  |
| `year` | integer |  |  |
| `session` | text |  |  |
| `total_questions` | integer | not null |  |
| `description` | text | not null |  |
| `published_version` | integer |  |  |
| `deleted_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### experiment_assignments

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `experiment_id` | text | not null | `experiment_definitions` |
| `subject_id` | text | not null |  |
| `variant` | text | not null |  |
| `assigned_at` | timestamp | not null |  |

### experiment_definitions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | text | PK |  |
| `name` | text | not null |  |
| `description` | text |  |  |
| `variants` | jsonb | not null |  |
| `is_active` | boolean | not null |  |
| `created_at` | timestamp | not null |  |

### experiment_exposures

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `experiment_id` | text | not null | `experiment_definitions` |
| `subject_id` | text | not null |  |
| `exposed_at` | timestamp | not null |  |

### explanation_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid | not null | `questions` |
| `version` | integer | not null |  |
| `content` | jsonb | not null |  |
| `locale` | text | not null |  |
| `author_id` | uuid | not null | `users` |
| `ai_generated` | boolean | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### export_jobs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `job_type` | text | not null |  |
| `status` | text | not null |  |
| `storage_path` | text |  |  |
| `requested_by` | uuid | not null | `users` |
| `created_at` | timestamp | not null |  |
| `completed_at` | timestamp |  |  |

### faq_items

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `category` | text | not null |  |
| `question` | text | not null |  |
| `answer` | text | not null |  |
| `order_index` | smallint | not null |  |
| `locale` | text | not null |  |

### generated_exam_items

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `generated_exam_id` | uuid | not null | `generated_exams` |
| `question_id` | uuid | not null | `questions` |
| `order_index` | smallint | not null |  |

### generated_exams

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `owner_id` | uuid | not null | `users` |
| `config_json` | jsonb | not null |  |
| `seed` | text | not null |  |
| `engine_version` | text | not null |  |
| `selection_hash` | text | not null |  |
| `created_at` | timestamp | not null |  |

### grammar_occurrences

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `dataset_id` | uuid | not null | `datasets` |
| `grammar_id` | uuid | not null | `grammar_points` |
| `count` | integer | not null |  |

### grammar_points

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `pattern` | text | not null |  |
| `level` | text | not null |  |
| `meaning` | text | not null |  |
| `formation` | text |  |  |
| `examples` | jsonb | not null |  |

### import_artifacts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `job_id` | uuid | not null | `import_jobs` |
| `artifact_type` | text | not null |  |
| `storage_key` | text | not null |  |
| `created_at` | timestamp | not null |  |

### import_job_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `job_id` | uuid | not null | `import_jobs` |
| `attempt_number` | integer | not null |  |
| `status` | text | not null |  |
| `logs` | jsonb | not null |  |
| `started_at` | timestamp | not null |  |
| `finished_at` | timestamp |  |  |

### import_jobs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `uploaded_by` | uuid | not null | `users` |
| `status` | text | not null |  |
| `package_sha256` | text | not null |  |
| `file_name` | text | not null |  |
| `target_level` | text |  |  |
| `error_log` | jsonb |  |  |
| `created_at` | timestamp | not null |  |
| `completed_at` | timestamp |  |  |

### kanji_entries

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `kanji` | text | not null |  |
| `level` | text |  |  |
| `stroke_count` | smallint |  |  |
| `onyomi` | text | not null |  |
| `kunyomi` | text | not null |  |
| `meanings` | jsonb | not null |  |

### kanji_occurrences

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `dataset_id` | uuid | not null | `datasets` |
| `kanji_id` | uuid | not null | `kanji_entries` |
| `count` | integer | not null |  |

### landing_pages

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `slug` | text | not null |  |
| `locale` | text | not null |  |
| `title` | text | not null |  |
| `content` | jsonb | not null |  |
| `published_version` | integer |  |  |
| `updated_at` | timestamp | not null |  |

### leaderboard_entries

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `period` | text | not null |  |
| `level` | text | not null |  |
| `user_id` | uuid | not null | `users` |
| `score` | integer | not null |  |
| `rank` | integer | not null |  |
| `updated_at` | timestamp | not null |  |

### lexical_entries

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `license_id` | uuid |  | `lexicon_licenses` |
| `term` | text | not null |  |
| `level` | text |  |  |
| `part_of_speech` | text |  |  |
| `han_viet` | text |  |  |
| `han_viet_confidence` | text |  |  |
| `han_viet_source` | text |  |  |
| `han_viet_updated_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### lexicon_hanviet_reports

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `entry_id` | uuid |  | `lexical_entries` |
| `term` | text | not null |  |
| `reading` | text |  |  |
| `suggestion` | text |  |  |
| `note` | text |  |  |
| `user_id` | uuid |  |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### lexicon_licenses

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `provider` | text | not null |  |
| `license` | text | not null |  |
| `rights_terms` | text |  |  |
| `created_at` | timestamp | not null |  |

### media_assets

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `sha256` | text | not null |  |
| `key` | text | not null |  |
| `mime` | text | not null |  |
| `size` | integer | not null |  |
| `duration_sec` | integer |  |  |
| `rights` | text |  |  |
| `created_at` | timestamp | not null |  |

### moderation_actions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `target_type` | text | not null |  |
| `target_id` | uuid | not null |  |
| `moderator_id` | uuid | not null | `users` |
| `action` | text | not null |  |
| `reason` | text |  |  |
| `created_at` | timestamp | not null |  |

### moderation_reviews

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `content_id` | uuid | not null |  |
| `score` | integer |  |  |
| `flagged` | boolean | not null |  |
| `reviewed_at` | timestamp | not null |  |

### near_duplicate_candidates

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id_a` | uuid | not null | `questions` |
| `question_id_b` | uuid | not null | `questions` |
| `similarity_score` | integer | not null |  |
| `status` | text | not null |  |

### notebook_items

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `kind` | text | not null |  |
| `entry_id` | uuid | not null |  |
| `mastered` | boolean | not null |  |
| `tags` | text | not null |  |
| `version` | integer | not null |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### notification_deliveries

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `job_id` | uuid | not null | `notification_jobs` |
| `status` | text | not null |  |
| `provider_response` | text |  |  |
| `attempted_at` | timestamp | not null |  |

### notification_jobs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `recipient_id` | uuid | not null | `users` |
| `type` | text | not null |  |
| `channel` | text | not null |  |
| `payload` | jsonb | not null |  |
| `status` | text | not null |  |
| `scheduled_for` | timestamp | not null |  |

### notification_preferences

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `channel` | text | not null |  |
| `notification_type` | text | not null |  |
| `enabled` | boolean | not null |  |

### operator_actions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `operator_id` | uuid | not null | `users` |
| `action` | text | not null |  |
| `target_resource` | text | not null |  |
| `details` | jsonb | not null |  |
| `timestamp` | timestamp | not null |  |

### order_lines

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `order_id` | uuid | not null | `orders` |
| `plan_id` | text |  | `plans` |
| `amount` | integer | not null |  |

### orders

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `total_amount` | integer | not null |  |
| `currency` | text | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### org_memberships

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `org_id` | uuid | not null | `organizations` |
| `user_id` | uuid | not null | `users` |
| `role` | text | not null |  |
| `joined_at` | timestamp | not null |  |

### organizations

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `name` | text | not null |  |
| `slug` | text | not null |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### outbox

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `topic` | text | not null |  |
| `payload` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |
| `published_at` | timestamp |  |  |

### payment_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `order_id` | uuid | not null | `orders` |
| `provider` | text | not null |  |
| `provider_payment_ref` | text |  |  |
| `status` | text | not null |  |
| `amount` | integer | not null |  |
| `currency` | text | not null |  |
| `created_at` | timestamp | not null |  |

### payment_webhook_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `provider` | text | not null |  |
| `event_id` | text | not null |  |
| `event_type` | text | not null |  |
| `payload` | jsonb | not null |  |
| `received_at` | timestamp | not null |  |
| `processed_at` | timestamp |  |  |

### plan_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `plan_id` | text | not null | `plans` |
| `version` | integer | not null |  |
| `price` | integer | not null |  |
| `entitlements` | jsonb | not null |  |
| `effective_from` | timestamp | not null |  |

### plans

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | text | PK |  |
| `name` | text | not null |  |
| `description` | text |  |  |
| `interval` | text | not null |  |
| `price` | integer | not null |  |
| `currency` | text | not null |  |
| `is_active` | boolean | not null |  |
| `created_at` | timestamp | not null |  |

### processed_events

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `event_id` | uuid | not null |  |
| `consumer` | text | not null |  |
| `processed_at` | timestamp | not null |  |

### pronunciation_assets

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `entry_id` | uuid | not null | `lexical_entries` |
| `media_asset_id` | uuid | not null | `media_assets` |
| `accent` | text |  |  |

### provider_accounts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | text | PK |  |
| `provider_name` | text | not null |  |
| `is_active` | boolean | not null |  |
| `config_ref` | text |  |  |

### provider_cost_records

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `provider` | text | not null |  |
| `cost_cents` | integer | not null |  |
| `period` | text | not null |  |
| `recorded_at` | timestamp | not null |  |

### push_subscriptions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `endpoint` | text | not null |  |
| `keys` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |

### question_difficulty_stats

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `question_id` | uuid | PK | `questions` |
| `total_attempts` | integer | not null |  |
| `correct_attempts` | integer | not null |  |
| `difficulty_index` | integer | not null |  |
| `updated_at` | timestamp | not null |  |

### question_exposures

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `question_id` | uuid | not null | `questions` |
| `exposure_count` | integer | not null |  |
| `last_exposed_at` | timestamp | not null |  |

### question_group_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `group_id` | uuid | not null | `question_groups` |
| `version` | integer | not null |  |
| `passage` | jsonb | not null |  |
| `audio_sha256` | text |  |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### question_groups

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `source_id` | uuid |  | `exam_sources` |
| `license_id` | uuid |  | `content_licenses` |
| `level` | text | not null |  |
| `section_code` | text | not null |  |
| `title` | text |  |  |
| `deleted_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### question_marks

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `question_id` | uuid | not null | `questions` |
| `mark_type` | text | not null |  |
| `created_at` | timestamp | not null |  |

### question_reports

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid | not null | `questions` |
| `reported_by` | uuid | not null | `users` |
| `issue_type` | text | not null |  |
| `description` | text | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### question_source_refs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid | not null | `questions` |
| `source_id` | uuid | not null | `exam_sources` |
| `source_page` | integer |  |  |
| `note` | text |  |  |

### question_tags

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `question_id` | uuid | not null | `questions` |
| `tag` | text | not null |  |
| `category` | text |  |  |

### question_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `question_id` | uuid | not null | `questions` |
| `version` | integer | not null |  |
| `stem` | jsonb | not null |  |
| `explanation` | jsonb |  |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### questions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `group_id` | uuid |  | `question_groups` |
| `level` | text | not null |  |
| `skill` | text | not null |  |
| `mondai_type` | text | not null |  |
| `origin` | text | not null |  |
| `deleted_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |

### reconciliation_runs

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `provider` | text | not null |  |
| `period_start` | timestamp | not null |  |
| `period_end` | timestamp | not null |  |
| `discrepancies_found` | integer | not null |  |
| `status` | text | not null |  |
| `run_at` | timestamp | not null |  |

### refund_attempts

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `refund_request_id` | uuid | not null | `refund_requests` |
| `provider_refund_ref` | text |  |  |
| `status` | text | not null |  |
| `processed_at` | timestamp |  |  |

### refund_requests

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `order_id` | uuid | not null | `orders` |
| `amount` | integer | not null |  |
| `reason` | text |  |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### report_snapshots

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `report_name` | text | not null |  |
| `period` | text | not null |  |
| `data` | jsonb | not null |  |
| `generated_at` | timestamp | not null |  |

### retention_policies

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `domain` | text | not null |  |
| `retention_days` | integer | not null |  |
| `policy_approved` | boolean | not null |  |
| `approved_by` | uuid |  | `users` |
| `updated_at` | timestamp | not null |  |

### sessions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `token` | text | not null |  |
| `expires_at` | timestamp | not null |  |
| `ip_address` | text |  |  |
| `user_agent` | text |  |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### site_content_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `page_key` | text | not null |  |
| `version` | integer | not null |  |
| `payload` | jsonb | not null |  |
| `published_at` | timestamp |  |  |

### streak_days

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `local_date` | date | not null |  |
| `activity_count` | integer | not null |  |

### study_plan_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `plan_id` | uuid | not null | `study_plans` |
| `version` | integer | not null |  |
| `weekly_schedule` | jsonb | not null |  |
| `created_at` | timestamp | not null |  |

### study_plans

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `target_level` | text | not null |  |
| `target_date` | date | not null |  |
| `status` | text | not null |  |
| `created_at` | timestamp | not null |  |

### study_session_completions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `session_id` | uuid | not null | `study_sessions` |
| `client_event_id` | uuid | not null |  |
| `completed_at` | timestamp | not null |  |
| `time_spent_seconds` | integer | not null |  |

### study_sessions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `plan_id` | uuid | not null | `study_plans` |
| `user_id` | uuid | not null | `users` |
| `scheduled_date` | date | not null |  |
| `duration_minutes` | integer | not null |  |
| `status` | text | not null |  |

### subscription_changes

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `subscription_id` | uuid | not null | `subscriptions` |
| `change_type` | text | not null |  |
| `old_plan_id` | text |  |  |
| `new_plan_id` | text |  |  |
| `effective_at` | timestamp | not null |  |

### subscriptions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `plan_id` | text | not null | `plans` |
| `status` | text | not null |  |
| `current_period_start` | timestamp | not null |  |
| `current_period_end` | timestamp | not null |  |
| `cancel_at_period_end` | boolean | not null |  |

### teacher_applications

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `status` | text | not null |  |
| `resume_url` | text |  |  |
| `qualifications` | jsonb |  |  |
| `submitted_at` | timestamp | not null |  |

### template_versions

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `template_key` | text | not null |  |
| `version` | integer | not null |  |
| `locale` | text | not null |  |
| `subject` | text |  |  |
| `body` | text | not null |  |
| `created_at` | timestamp | not null |  |

### tenant_plans

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `tenant_id` | text | PK |  |
| `plan_code` | text | not null |  |
| `status` | text | not null |  |
| `total_seats` | integer | not null |  |
| `used_seats` | integer | not null |  |
| `max_classes` | integer | not null |  |
| `features` | jsonb | not null |  |
| `expires_at` | timestamp |  |  |
| `updated_at` | timestamp | not null |  |

### usage_ledger

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `ai_request_id` | uuid |  | `ai_requests` |
| `tokens_used` | integer | not null |  |
| `cost_micro_usd` | integer | not null |  |
| `recorded_at` | timestamp | not null |  |

### usage_reservations

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `estimated_tokens` | integer | not null |  |
| `reserved_at` | timestamp | not null |  |
| `settled_at` | timestamp |  |  |

### user_achievements

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `achievement_id` | text | not null | `achievement_definitions` |
| `unlocked_at` | timestamp | not null |  |

### user_answers

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `attempt_id` | uuid | not null | `exam_attempts` |
| `question_index` | smallint | not null |  |
| `question_id` | uuid | not null | `questions` |
| `option_value` | smallint | not null |  |
| `is_correct` | boolean | not null |  |
| `flagged` | boolean | not null |  |

### user_mondai_aggregates

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `mondai_type` | text | not null |  |
| `accuracy_rate` | integer | not null |  |
| `sample_size` | integer | not null |  |
| `updated_at` | timestamp | not null |  |

### user_profiles

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | PK | `users` |
| `bio` | text |  |  |
| `metadata` | jsonb | not null |  |
| `updated_at` | timestamp | not null |  |

### user_question_history

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `user_id` | uuid | not null | `users` |
| `question_id` | uuid | not null | `questions` |
| `is_correct` | boolean | not null |  |
| `answered_at` | timestamp | not null |  |

### user_skill_aggregates

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `user_id` | uuid | not null | `users` |
| `skill` | text | not null |  |
| `accuracy_rate` | integer | not null |  |
| `sample_size` | integer | not null |  |
| `updated_at` | timestamp | not null |  |

### users

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `name` | text |  |  |
| `email` | text | not null |  |
| `email_verified` | boolean | not null |  |
| `image` | text |  |  |
| `role` | text | not null |  |
| `target_level` | text |  |  |
| `locale` | text | not null |  |
| `timezone` | text | not null |  |
| `target_exam_date` | date |  |  |
| `target_score` | integer |  |  |
| `blocked_at` | timestamp |  |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### verifications

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `identifier` | text | not null |  |
| `value` | text | not null |  |
| `expires_at` | timestamp | not null |  |
| `created_at` | timestamp | not null |  |
| `updated_at` | timestamp | not null |  |

### vocab_occurrences

| Cột | Kiểu | Ràng buộc | Tham chiếu |
|---|---|---|---|
| `id` | uuid | PK |  |
| `dataset_id` | uuid | not null | `datasets` |
| `entry_id` | uuid | not null | `lexical_entries` |
| `count` | integer | not null |  |
