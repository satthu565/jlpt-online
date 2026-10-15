# Dữ liệu events và kiểm soát truy cập toàn bộ sản phẩm

W1 triển khai migrations/schema từ tài liệu này và hợp đồng nền A10, không để từng worker tự sinh journal. Tên bảng snake_case, UUIDv7, timestamptz UTC, content JSON NFC. Đây là data contract đề xuất; F02/F08 chốt kiểu/index/constraints thực bằng migration tests. Các cột dưới đây là tối thiểu, không phải SQL đã chạy.

## Nhóm bảng và chủ sở hữu nghiệp vụ

| Miền | Bảng và trường tối thiểu | Ràng buộc và index |
|---|---|---|
|Identity W2|Better Auth tables, users(target_level, locale, timezone, target_exam_date, target_score, blocked_at), user_profiles|Email/session constraints theo library; không tự thay schema auth khi chưa integration test|
|Privacy W2|consents(user_id, purpose, policy_version, granted_at, withdrawn_at), data_export_jobs, deletion_requests, retention_policies|Unique policy acceptance, event audit; ledger deletion policy approved|
|Content W2|exam_sources, content_licenses, question_groups, question_group_versions, questions, question_versions, answer_options, correct_answers|Group/version immutable, FK license/source; correct_answers server-only|
|Media/import W2|media_assets(sha256, key, mime, size, duration, rights), import_jobs, import_job_attempts, import_artifacts, question_source_refs|sha256 dedupe, validation/import attempt fenced; không callback nhận dạng PDF, source_page; private PDF scope|
|Review W2|content_reviews, explanation_versions, question_tags, question_reports, near_duplicate_candidates|Reviewer!=last_editor enforced service+test; unique version/action; approved public only|
|Exams W2|exams, exam_sections, exam_items, blueprints, blueprint_versions, exam_versions, exam_answer_keys|Published exam snapshot/answer key version immutable; unique exam/version|
|Attempts W2|exam_attempts, attempt_answer_sheets, attempt_events, user_answers|Nền A10; FK assignment/event optional; unique open attempt policy; partitions monthly|
|Mix/practice W2|generated_exams(config_json, seed, engine_version, selection_hash, owner_id), generated_exam_items, question_exposures, question_marks, exam_favorites, exam_shares|Unique config/selection identity as needed; share token hash+expiry; owner +license filters|
|Lexicon W5|lexical_entries, entry_readings, entry_meanings, kanji_entries, grammar_points, lexicon_licenses, pronunciation_assets|Provider/license/version provenance; no copyrighted dictionary bundled without rights|
|Corpus W5|datasets, dataset_documents, vocab_occurrences, grammar_occurrences, kanji_occurrences, corpus_aggregates|Unique dataset/documentHash; occurrence sourceRole; dataset/version index; approved version scope|
|Notebook W5|notebook_items(user_id, kind, entry_id, mastered, tags, version), cards, card_schedules, card_reviews|Unique user/item/card; unique user/clientReviewId; optimistic version for concurrent devices|
|Planner W5|study_plans, study_plan_versions, study_sessions, study_session_completions|Local date+timezone retained, unique session/clientEventId; history immutable|
|Learning analytics W5|user_skill_aggregates, user_mondai_aggregates, question_difficulty_stats, user_question_history, answer_change_aggregates|Sample size/window/method/version; no readiness probability without caveat/calibration|
|Teacher W2|teacher_applications, organizations, org_memberships, classes, class_memberships, class_invitations|Tenant-scoped FKs/queries, unique membership, invite hash+expiry+usage cap|
|Assignments W2|assignments, assignment_learners, assignment_attempts|Enrollment FK and due/open window; owner/tenant/entitlement checks|
|Events W2|exam_events, event_registrations, event_attempts, event_result_publications|opens<=starts<ends<=release, atomic capacity, one registration per user, event result embargo|
|Community W2|discussion_threads, comments, comment_reports, moderation_actions, achievement_shares|Completion+resultRelease checks, soft delete, audit actor; no PII in share|
|Gamification W5|streak_days, achievement_definitions, user_achievements, challenges, challenge_enrollments, leaderboard_entries|Unique user/localDate and event credit; partition ranking level/kind/mode/condition; opt-in|
|Billing W4|plans, plan_versions, entitlement_definitions, entitlement_grants, orders, order_lines, payment_attempts, subscriptions, subscription_changes|Integer money+currency, server amount; unique provider payment/order refs; plan versions immutable|
|Billing events W4|payment_webhook_events, refund_requests, refund_attempts, coupons, coupon_reservations, coupon_redemptions, reconciliation_runs|Unique provider/eventId, replay hash, atomic coupon cap, refund<=captured minus prior refunds|
|AI W5/W4|provider_accounts, ai_requests, usage_reservations, usage_ledger, ai_content_versions, moderation_reviews|Atomic reserve/settle/refund; unique request/account/window; secret ref only; ai_generated mandatory|
|Notifications W2|notification_preferences, notification_jobs, notification_deliveries, push_subscriptions, template_versions|Unique recipient/type/event/channel; opt-out/quietHours checked at delivery; unsubscribe token hashed|
|CMS W4|articles, article_versions, landing_pages, faq_items, site_content_versions|Slug+locale unique, publish workflow, sanitize and rights|
|Product analytics W4|analytics_events, analytics_consents, report_snapshots, experiment_definitions, experiment_assignments, experiment_exposures|Consent purpose, unique eventId/subject+experiment, PII minimization; cohort maturity|
|Operations W6|outbox, processed_events, dead_letter_events, export_jobs, backup_jobs, operator_actions, provider_cost_records|Consumer idempotency, redacted audit; operator-only privileged jobs|

DB tables trong 6 worker clones chỉ dùng dữ liệu thử; staging/prod riêng. Mọi cross-tenant relation cần kiểm constraint/query. Có thể dùng RLS như defense-in-depth sau khi connection context được test; không coi RLS chưa cấu hình là authorization đã xong.

## Đáp án quyền và version

- Persist correct answer/explanation gắn questionVersionId và examVersion; không dùng câu đã sửa để chấm attempt cũ.
- Public snapshot DTO strict không correct/answer/explanation, không mượn entity của admin.
- user_answers chỉ người dùng/teacher đúng lớp hoặc aggregate process có quyền; exported PII tối thiểu. Event embargo bao phủ projected data/reports.
- Source license có effective/revoked/expiry. Takedown không xóa evidence, không cho remix mới; access lịch sử theo quyết định license được ghi rõ.
- Payment entitlement expiry và share link không thay license; lớp học không cấp quyền đọc nội dung trả phí của tenant khác.

## Event envelope

```json
{"eventId":"uuid","schemaVersion":1,"topic":"attempt.submitted","occurredAt":"UTC ISO8601","actorId":"uuid-or-system","tenantId":null,"aggregateId":"uuid","aggregateVersion":1,"correlationId":"request-id","payload":{}}
```

payload tối thiểu IDs, version và dữ liệu cần thiết, không chứa raw answer key, token, bank info hoặc email nếu consumer có thể lấy qua service có quyền. Producer transaction writes domain+outbox. Relay at-least-once; consumer transaction inserts processed_events + projection updates, unique(eventId, consumer). DLQ có reason/retryCount/nextAt và replay operator audit.

| Topic | Producer | Consumers | Invariant/test |
|---|---|---|---|
|content.import.requested|import API W2|Validator/import worker nội bộ|Gói đã do chủ dự án upload; không gọi agent, không đọc PDF; retry không import trùng|
|content.import.completed/failed|schema/file/semantic validation W2|admin status/reporting|Content hash, revision, transaction status và schemaVersion; không callback agent|
|content.approved/published/taken_down|review/exam W2|search, NLP, CDN revalidate, notifications|Chỉ published ready public, license check; purge retry|
|attempt.submitted|attempt W2|user_answers, stats, vocab, planner, gamification, teacher, event|Không double-count khi replay; event embargo không notification answer leak|
|learning.card.reviewed|learning W5|schedule, planner, reminder|Review ID unique, cross-device conflict resolved|
|study.session.completed/missed|planner W5|streak, challenge, replan, notifications|Timezone local day; replan versioned|
|payment.captured/refunded/failed|billing W4|entitlements, notifications, reporting|Webhook signature/idempotency; out-of-order reconcile|
|subscription.changed|billing W4|entitlements, AI budget, teacher quotas|EffectiveAt/expiry; không cache stale grant indefinitely|
|ai.request.settled/cancelled|AI W5|usage ledger, cost reporting|Reservation settle/refund once; failure không double debit|
|ai.content.reviewed|review W2/W5|qbank, explanations, flashcards|ai_generated label retained, approval evidence|
|assignment.created/completed|classroom W2|teacher dashboard, notifications, group stats|Enrolled learners only|
|exam_event.results_released|event W2|results, ranking, notifications, discussion|Server time boundary, release once after ended|
|privacy.consent.changed/deletion.requested|privacy W2|analytics, retention jobs, exports|Required ledger retained lawfully, delete/minimize by approved policy|
|experiment.exposed|analytics W4|experiment report|Consent, sticky assignment, dedupe exposure|

## Migration và data lifecycle

Expand→backfill→switch readers→contract, không phá rollback code. Một migration lock và owner W1. Tests trên fresh DB và seeded previous version, partition creation idempotent. Merge migration journal theo dependency, không force-reset branch có patch chưa checkpoint. Các job retention/backup/restore theo policy tách billing/learning/AI/log data; policy legal chưa duyệt là blocker production, không tự chọn ngày xóa rồi coi hợp lệ.
