# Database

PostgreSQL 17, Drizzle ORM 0.45. Toàn bộ bảng khai báo trong `apps/api/src/db/schema.ts` (khoảng 140 bảng). Migration là file SQL viết tay trong `apps/api/src/db/migrations/`.

## Nhóm bảng

| Nhóm | Bảng chính |
|---|---|
| Người dùng, đăng nhập | `users`, `user_profiles`, `sessions`, `accounts`, `verifications` |
| Nội dung đề | `exam_sources`, `content_licenses`, `question_groups`, `questions`, `media_assets`, `question_tags`, `question_source_refs`, `near_duplicate_candidates` |
| Nhập và duyệt | `import_jobs`, `import_job_attempts`, `import_artifacts`, `content_reviews`, `question_reports` |
| Đề và cấu trúc | `blueprints`, `exams`, `exam_sections`, `exam_items`, `generated_exams`, `exam_shares` |
| Làm bài | `attempt_answer_sheets` và các bảng attempt; `user_question_history`, `answer_change_aggregates`, `question_difficulty_stats` |
| Từ điển | `lexicon_licenses`, `lexical_entries` (có `han_viet*`), `entry_readings`, `entry_meanings`, `kanji_entries`, `grammar_points`, `pronunciation_assets`; từ migration 0010 thêm `kanji_dataset` |
| Ngữ liệu đề thi | `datasets`, `dataset_documents`, `vocab_occurrences`, `grammar_occurrences`, `kanji_occurrences`, `corpus_aggregates` |
| Học tập | `notebook_items`, `cards`, `card_schedules`, `card_reviews`, `study_plans`, `study_sessions`, `study_session_completions` |
| Lớp học, cộng đồng | `organizations`, `teacher_applications`, `class_invitations`, `exam_events`, `discussion_threads`, `comments`, `moderation_actions` |
| Gamification | `achievement_definitions`, `achievement_shares`, `challenges`, `leaderboard_entries` |
| Thương mại | `plans`, `entitlement_definitions`, `entitlement_grants`, `orders`, `order_lines`, `payment_attempts`, `subscriptions`, `subscription_changes`, `tenant_plans`, `payment_webhook_events`, `refund_requests`, `refund_attempts`, `coupons`, `coupon_reservations`, `coupon_redemptions`, `reconciliation_runs` |
| AI | `provider_accounts`, `ai_requests`, `usage_reservations`, `usage_ledger`, `ai_content_versions`, `moderation_reviews`, `provider_cost_records` |
| Thông báo | `notification_jobs`, `notification_deliveries`, `push_subscriptions`, `template_versions` |
| CMS | `articles`, `landing_pages`, `faq_items`, `site_content_versions` |
| Thống kê, thử nghiệm | `analytics_events`, `analytics_consents`, `experiment_definitions`, `experiment_exposures` |
| Vận hành | `operator_actions` (nhật ký thao tác của nhân sự), `dead_letter_events`, `backup_jobs`, bảng outbox |

Danh sách đầy đủ bảng, cột và khóa ngoại: [DATABASE.generated.md](DATABASE.generated.md) (tự sinh). Chi tiết hơn thì đọc `schema.ts`.

## Quy ước

- Khóa chính là UUID v7, sinh bằng `generateUuidV7()` (`apps/api/src/common/utils/uuid.ts`).
- Thời gian là `timestamptz`, lưu UTC.
- Chữ Nhật lưu chuẩn NFC, không chuyển NFKC.
- Đề đã xuất bản, đáp án và phiên bản nội dung là bất biến. Muốn sửa thì tạo phiên bản mới.
- Một số bảng lớn chia partition (`apps/api/src/db/partitions.ts`). Thời gian lưu giữ dữ liệu được kiểm soát bởi `retention-guard.ts`.

## Thêm bảng hoặc cột

1. Sửa `apps/api/src/db/schema.ts`.
2. Tạo file `apps/api/src/db/migrations/00NN_<ten>.sql`, đánh số tiếp theo. Dùng `CREATE TABLE IF NOT EXISTS` và `ADD COLUMN IF NOT EXISTS` để chạy lại không lỗi.
3. Thêm một dòng vào `apps/api/src/db/migrations/meta/_journal.json`:
   ```json
   {"idx": NN, "version": "7", "when": <số ms, lớn hơn dòng trước>, "tag": "00NN_<ten>", "breakpoints": true}
   ```
4. Sửa `apps/api/src/db/db.test.ts`: tăng **mọi** số đếm migration cứng (`toBe(N)`) và thêm `expect(names).toContain('00NN_<ten>.sql')`.
5. Chạy `pnpm test:db`, rồi chạy test của module dùng bảng đó.

Trước khi chọn số, kiểm tra các PR đang mở: hai nhánh cùng dùng một số migration sẽ xung đột khi gộp. Ví dụ: nhánh kanji đã phải đổi từ 0008 sang 0010 vì H04 và H05 đã dùng 0008 và 0009.

## Test với database

Unit test của API dùng PGlite (Postgres chạy trong bộ nhớ):

```ts
const dbClient = await createDbClient();   // apps/api/src/db/client.ts
await runMigrations(dbClient);             // apps/api/src/db/migrate.ts
```

Database ban đầu rỗng, test phải tự chèn dữ liệu. Mỗi fork vitest có PGlite tốn khoảng 1 GB RAM.
