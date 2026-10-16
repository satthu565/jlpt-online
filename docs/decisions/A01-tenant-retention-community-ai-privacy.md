# Quyết định kỹ thuật A01: Hợp đồng lớp thi sự kiện community AI và privacy

- **Task:** A01
- **Worker:** W1 (Hợp đồng dữ liệu và logic thi)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/A01`
- **Base SHA:** `83765f139884951b54e4a53826999c8bf25b72da`
- **Dependencies:** L01, L04
- **Locks:** `schema-contract`, `db-migration`

---

## 1. Bối cảnh và mục tiêu

Task A01 rà soát và hoàn thiện lớp hợp đồng dữ liệu, schema migration mở rộng, cách ly tenant, đánh nhãn AI generation, cơ chế consent/delete bảo vệ nghĩa vụ retention và schema sự kiện mở rộng (experiment, community, exam events).

### 4 Tiêu chí nghiệm thu bắt buộc:
1. **Tenant-scoped composite constraints:**
   - Các ràng buộc duy nhất và toàn vẹn dữ liệu nhiều cột (composite unique constraints / indexes) cho các bảng theo phạm vi tenant/lớp học/sự kiện:
     - `org_memberships`: Unique composite `(org_id, user_id)` + CHECK `role IN ('owner', 'admin', 'teacher', 'member')`.
     - `classes`: Unique composite `(org_id, name)` + CHECK `level IN ('N1', 'N2', 'N3', 'N4', 'N5')`.
     - `class_memberships`: Unique composite `(class_id, student_id)` + CHECK `status IN ('active', 'suspended', 'left', 'completed')`.
     - `class_invitations`: CHECK `max_uses > 0 AND used_count >= 0 AND used_count <= max_uses`.
     - `assignments`: CHECK `opens_at <= due_at` + Index composite `(class_id, opens_at, due_at)`.
     - `assignment_learners`: Unique composite `(assignment_id, learner_id)` + CHECK `status IN ('assigned', 'submitted', 'graded', 'late', 'excused')`.
     - `assignment_attempts`: Unique composite `(assignment_id, attempt_id)`.
     - `tenant_plans`: Bảng quản lý gói tenant với khóa chính `tenant_id`, CHECK `status IN ('trial', 'active', 'suspended', 'expired')`, CHECK `used_seats >= 0 AND used_seats <= total_seats AND total_seats >= 0`, CHECK `max_classes >= 0`.
     - `exam_events`: CHECK dòng thời gian `opens_at <= starts_at AND starts_at < ends_at AND ends_at <= result_release_at`, CHECK sức chứa `registered_count >= 0 AND (capacity IS NULL OR registered_count <= capacity)`.
     - `event_registrations`: Unique composite `(event_id, user_id)` ngăn trùng lặp đăng ký.
     - `event_attempts`: Unique composite `(event_id, user_id)` và `(event_id, attempt_id)`.
     - `event_result_publications`: Unique `event_id` đảm bảo kết quả mỗi sự kiện chỉ công bố một lần duy nhất.
     - `comment_reports`: Unique composite `(comment_id, reported_by)` chống spam báo cáo trùng lặp.

2. **Delete/export không phá nghĩa vụ retention chưa được phê duyệt:**
   - Schema & constraints:
     - Bảng `retention_policies`: Unique `domain`, CHECK `retention_days > 0`, CHECK `(policy_approved = false) OR (policy_approved = true AND approved_by IS NOT NULL)`.
     - Bảng `deletion_requests`: CHECK `status IN ('requested', 'in_progress', 'completed', 'blocked_retention', 'rejected')`.
     - Bảng `data_export_jobs`: CHECK `status IN ('pending', 'processing', 'completed', 'failed', 'expired')`.
   - Logic bảo vệ trong `@jlpt/schema` và `apps/api/src/db/retention-guard.ts`:
     - Hàm `canPurgeDomain` kiểm tra xem domain có chính sách retention đã duyệt (`policyApproved === true`) hay không.
     - Hàm `assertRetentionObligationNotViolated` / `assertRetentionPolicyApproved` chặn mọi hành vi xóa/purge dữ liệu của miền chưa có chính sách retention được phê duyệt chính thức bằng ngoại lệ `RetentionViolationError`.
     - Hàm `executeRetentionSafeDeletion`: khi học viên yêu cầu xóa dữ liệu, chỉ xóa những miền được phép, bắt buộc bảo tồn (preserve) các miền có nghĩa vụ retention pháp lý hoặc chưa được phê duyệt (như `billing`, `audit_logs`, `exam_attempts` chưa hết hạn retention), đồng thời ghi vết kiểm toán vào `deletion_requests` với trạng thái `blocked_retention` và danh sách chi tiết các miền được bảo tồn.
     - Hàm `sanitizeExportField`: làm sạch dữ liệu xuất khẩu, ngăn chặn triệt để tấn công CSV/Spreadsheet Formula Injection (`=`, `+`, `-`, `@`, `\t`, `\r`).

3. **Public events không chứa answers hay PII:**
   - Schema và cơ chế xác thực kiểm toán sự kiện `assertNoEventLeak` trong `@jlpt/schema`:
     - Nghiêm cấm mọi trường lộ đáp án thi trong event payload/envelope: `correct`, `correctOption`, `isCorrect`, `answer`, `answers`, `answerKey`, `keys`, `explanation`, `explanations`, `rawAnswer`.
     - Nghiêm cấm mọi trường thông tin nhận dạng cá nhân (PII) hoặc bí mật trong event payload/envelope: `email`, `password`, `passwd`, `secret`, `bearerToken`, `authToken`, `phone`, `phoneNumber`, `bankAccount`, `creditCard`, `cardNumber`.
     - Kiểm tra chuỗi đệ quy (recursive string inspection) phát hiện plain email pattern (`[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+`) và Bearer token pattern (`^Bearer\s+`) ẩn sâu trong các trường lồng nhau.
     - Tích hợp trực tiếp vào `EventEnvelopeSchema.superRefine` và `createEventEnvelope` để ném lỗi ngay khi tạo hoặc parse sự kiện vi phạm.
     - Cập nhật fixtures kiểm tra: `fixtures/contracts/events.valid.json` (hợp lệ) và `fixtures/contracts/events.invalid.json` (chứa các trường hợp lộ đáp án và PII để kiểm chứng từ chối tự động).

4. **No schema drift:**
   - Hoàn tất migration `0002_tenant_retention_community.sql` đồng bộ tuyệt đối với Drizzle schema `schema.ts`.
   - `pnpm contracts:check` chạy sạch, khẳng định:
     - 0 drift giữa OpenAPI YAML và router endpoints.
     - 0 drift giữa API Client SDK và hợp đồng.
     - `events.schema.json` chuẩn JSON Schema Draft-07.
     - 29/29 mã lỗi có ví dụ fixture hợp lệ.
     - Không có thao tác OpenAPI nào thiếu phản hồi lỗi 4xx/5xx hoặc có request body rỗng.

---

## 2. Danh mục thay đổi mã nguồn

- `apps/api/src/db/migrations/0002_tenant_retention_community.sql`:
  - Khởi tạo bảng `tenant_plans`.
  - Bổ sung cột `ai_generated` vào bảng `explanation_versions`.
  - Tạo các chỉ mục duy nhất và chỉ mục phức hợp: `org_memberships_org_user_idx`, `classes_org_name_idx`, `class_memberships_class_student_idx`, `assignment_learners_assignment_learner_idx`, `assignment_attempts_assignment_attempt_idx`, `assignments_class_window_idx`, `event_registrations_event_user_idx`, `event_attempts_event_user_idx`, `event_attempts_event_attempt_idx`, `event_result_publications_event_idx`, `comment_reports_comment_reporter_idx`, `retention_policies_domain_idx`, `explanation_versions_question_version_locale_idx`.
  - Bổ sung 16 ràng buộc CHECK toàn vẹn dữ liệu cho vai trò tổ chức, cấp độ lớp, trạng thái lớp, số lượt mời, cửa sổ bài tập, thời gian sự kiện thi, trạng thái gói tenant, số lượng ghế ngồi, quy định phê duyệt retention, trạng thái xóa/xuất dữ liệu, và kiểm duyệt nội dung AI.
- `apps/api/src/db/migrations/meta/_journal.json`:
  - Cập nhật migration journal ghi nhận migration index 2: `0002_tenant_retention_community`.
- `apps/api/src/db/schema.ts`:
  - Khai báo Drizzle table `tenantPlans` với các trường chi tiết.
  - Cập nhật các chỉ mục composite trên `orgMemberships`, `classes`, `classMemberships`, `assignments`, `assignmentLearners`, `assignmentAttempts`, `eventRegistrations`, `eventAttempts`, `eventResultPublications`, `commentReports`, `retentionPolicies`, `explanationVersions`.
- `apps/api/src/db/migrate.ts`:
  - Nâng cấp hỗ trợ áp dụng toàn bộ các bản migration (0000, 0001, 0002) với khóa PostgreSQL Advisory Lock (`MIGRATION_ADVISORY_LOCK_ID = 72110115`) phòng chống race condition trong môi trường multi-instance.
  - Cơ chế tự động giải quyết thư mục migrations đa dạng môi trường (`dist/`, `cwd`, relative path).
- `apps/api/src/db/seed.ts`:
  - Cung cấp dữ liệu mẫu mặc định cho `retention_policies` (các miền: `billing`, `exam_attempts`, `audit_logs` đã duyệt, và `unapproved_sample` chưa duyệt để phục vụ kiểm thử).
- `apps/api/src/db/retention-guard.ts`:
  - Triển khai `canPurgeDomain`, `assertRetentionObligationNotViolated`, `executeRetentionSafeDeletion`.
- `packages/schema/src/privacy.ts`:
  - Định nghĩa `RetentionPolicySchema`, `DeletionRequestSchema`, `ExportJobSchema`, `RetentionViolationError`, `assertRetentionPolicyApproved`, `evaluateDataDeletionEligibility`, `assertNoRetentionViolationOnDelete`, `sanitizeExportField`.
- `packages/schema/src/events.ts`:
  - Mở rộng payload schemas cho AI content review, assignments, exam event release, privacy consent/deletion, experiment exposure.
  - Triển khai bộ quy tắc chặn lộ đáp án và PII: `FORBIDDEN_EVENT_ANSWER_FIELDS`, `FORBIDDEN_EVENT_PII_FIELDS`, `assertNoEventLeak`.
- `fixtures/contracts/events.invalid.json`:
  - Bổ sung các ca kiểm thử tiêu cực cho event leaks (lộ `answers`, lộ `email`, lộ `bearerToken`).
- `apps/api/src/db/db.test.ts`:
  - Bổ sung 13 ca kiểm thử toàn diện cho các tiêu chí nghiệm thu A01:
    - 7 test cases cho composite constraints & tenant isolation.
    - 4 test cases cho retention guard & deletion execution.
    - 2 test cases cho AI generation labels & versioning.
- `packages/schema/tests/schema.test.ts`:
  - Bổ sung các bài test xác nhận chặn rò rỉ đáp án và PII trong sự kiện, kiểm thử chính sách lưu trữ retention và chống injection khi export dữ liệu.

---

## 3. Bằng chứng kiểm thử và các cổng chất lượng

1. `pnpm contracts:check`: PASS (0 drift, tất cả OpenAPI operations có explicit errors, fixtures hợp lệ)
2. `pnpm test:db`: PASS (31/31 tests pass)
3. `pnpm test:contracts`: PASS (45/45 tests pass)
4. `pnpm install --frozen-lockfile`: PASS (Lockfile up to date, 36ms)
5. `pnpm lint`: PASS (13/13 packages pass)
6. `pnpm typecheck`: PASS (18/18 packages pass)
7. `pnpm test`: PASS (18/18 test suites pass, 273 tests in api pass)
8. `pnpm build`: PASS (12/12 packages build thành công)
