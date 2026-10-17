# Quyết định kỹ thuật R01: Chốt hợp đồng logic và migration

- **Task:** R01
- **Worker:** W1 (Hợp đồng dữ liệu và logic thi)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-17
- **Branch:** `task/R01`
- **Base SHA:** `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Dependencies:** V01, V06
- **Resource Locks:** Không
- **Feature IDs:** Nền tảng và tích hợp toàn bộ phạm vi (hỗ trợ 363 yêu cầu ứng dụng)

---

## 1. Bối cảnh và mục tiêu

Task R01 là bước chốt chặn (Day 7) của Worker W1 chịu trách nhiệm về hợp đồng dữ liệu, logic thi, chấm điểm, xáo trộn câu hỏi, thuật toán lặp lại ngắt quãng (SRS/FSRS), token bảo mật tài nguyên đa phương tiện và toàn vẹn cơ sở dữ liệu (schema & migrations):
1. **Kiểm tra và khóa cứng hợp đồng API & DTO (Contract Hardening):** Đảm bảo zero drift giữa OpenAPI 3.1 (`contracts/openapi.yaml`), API Client TypeScript (`packages/api-client/`), JSON Schema Outbox Events (`contracts/events.schema.json`) và bộ fixtures hợp đồng.
2. **Bảo mật tuyệt đối chống rò rỉ dữ liệu (Zero Leakage):**
   - Đảm bảo các DTO công khai (`PublicExamSnapshotSchema`, `PublicSectionSchema`, `PublicQuestionGroupSchema`, `PublicQuestionSchema`, `PublicOptionSchema`) không chứa bất kỳ trường đáp án nào (`correct`, `correctOption`, `isCorrect`, `answer`, `answerKey`, `answers`, `explanation`, `explanations`).
   - Đảm bảo các event envelope (`assertNoEventLeak`) ngăn chặn triệt để đáp án thi, email người dùng dạng plain text (PII), và Bearer token secrets.
   - Bảo đảm cách ly dữ liệu phiếu điểm (`assertScoreReportIsolation`) chống rò rỉ chéo giữa các người dùng hoặc tổ chức (tenant), kết hợp cơ chế chống tấn công Spreadsheet Formula Injection (`sanitizeExportField`) trên tất cả các tệp xuất khẩu (PDF, XLSX, CSV).
3. **Cơ chế tuần tự hóa migration và tương thích ngược (Expand-Contract Rollback Compatibility):**
   - Kiểm chứng 4 bản migration cơ sở dữ liệu (`0000_legal_paibok.sql`, `0001_curvy_invisible_woman.sql`, `0002_tenant_retention_community.sql`, `0003_privacy_export_isolation.sql`).
   - Mở rộng hàm kiểm thử tương thích ngược `verifyRollbackCompatibility` bao quát toàn bộ 21 bảng dữ liệu cốt lõi qua các phân hệ: Identity, Outbox, Exam Engine, Tenants, Classes, Assignments, AI Versioning, và Privacy Export/Deletion.
   - Xác thực cơ chế phân xử tranh chấp migration đồng thời (`pg_advisory_lock(72110115)`) qua kiểm thử chịu tải song song 10 tiến trình/container khởi động cùng lúc.
4. **Logic các bộ công cụ (Engines):**
   - `packages/exam-engine`: Chấm điểm chuẩn hóa (Linear Reference Scaling [0, 180]), sinh đề thi xáo trộn tất định (PRNG Seed), tính toán chỉ số tâm trắc học và phân tích gian lận (Answer Changes, Speed-Accuracy, Unseen Progress).
   - `packages/srs`: Thuật toán FSRS tuân thủ các bất biến toán học về độ ổn định ($S > 0$), độ khó ($1 \le D \le 10$) và tính toán thời gian ôn tập theo múi giờ người dùng.
   - `packages/media-token`: Chữ ký số HMAC-SHA256, kiểm soát thời hạn token và đối soát whitelist tệp media qua manifest.

---

## 2. Tiêu chí nghiệm thu và giải pháp kỹ thuật

### Tiêu chí 1: Review chéo trên đúng commit
- Tất cả các thay đổi được thực hiện chuẩn xác trên base SHA `f60321e88bdb75e7510fb1e509cc4699a622500d` thuộc nhánh `task/R01`.
- Phạm vi thay đổi nằm trọn vẹn trong `allowedPaths`:
  - `packages/schema/`
  - `packages/exam-engine/`
  - `packages/media-token/`
  - `packages/srs/`
  - `packages/api-client/`
  - `contracts/`
  - `fixtures/contracts/`
  - `apps/api/src/db/`
  - `docs/decisions/`
- Commit theo quy chuẩn Conventional Commits với body `Task: R01`.

### Tiêu chí 2: Không còn P0/P1 cho code acceptance
- **Zero Leakage:** Bổ sung bộ kiểm thử `packages/schema/tests/schema.test.ts` kiểm tra 23 event topics và các kịch bản xâm phạm dữ liệu:
  - Cố tình chèn `answerKey` vào event payload: Bị chặn ngay lập tức bởi `assertNoEventLeak`.
  - Cố tình chèn plain email PII hoặc bearer token vào event: Bị chặn bởi kiểm tra regex PII/secret.
  - Cố tình lồng trường đáp án ở độ sâu bất kỳ trong snapshot DTO: Bị phát hiện và chặn bởi `assertNoAnswerLeak`.
  - Cố tình chèn chuỗi công thức độc hại (`=HYPERLINK`, `+1`, `-cmd`, `@SUM`, `\t`, `\r`): Được làm sạch an toàn bằng dấu nháy đơn bảo vệ qua `sanitizeExportField`.
- **Expand-Contract Rollback Compatibility:**
  - Bổ sung 8 bảng cốt lõi vào `verifyRollbackCompatibility`: `class_memberships`, `assignment_learners`, `comment_reports`, `ai_content_versions`, `export_jobs`, `data_export_jobs`, `deletion_requests`, `report_snapshots`.
  - Toàn bộ 21 bảng được kiểm tra truy vấn đọc N-1 và trả về `PASSED`.

### Tiêu chí 3: Feature evidence truy ngược được tới commit và lệnh
- Lệnh kiểm tra bắt buộc:
  1. `pnpm test:engines:all`: 18 test files, 160 tests pass 100%.
  2. `pnpm contracts:check`: 0 drift OpenAPI, API Client, JSON Schema, Error codes, Snapshot & Answer key fixtures pass 100%.
  3. `pnpm test:db`: 38 tests pass 100% bao gồm cả race migrations (10 concurrent callers), idempotent ledger, expand-contract rollback compatibility, và partition routing.
- Các cổng kiểm tra chung (Common Gates):
  - `pnpm install --frozen-lockfile`: Sạch sẽ, không lệch lockfile.
  - `pnpm lint`: 13 packages pass (0 errors, 0 warnings).
  - `pnpm typecheck`: 13 packages / 20 tasks pass 100% không dùng `any` hay `ts-ignore`.
  - `pnpm build`: 12 build targets pass 100%.
  - `pnpm test`: Toàn bộ monorepo pass 100%.

---

## 3. Danh mục tệp thay đổi

1. `apps/api/src/db/migrate.ts`:
   - Mở rộng danh mục truy vấn kiểm thử tương thích ngược `legacyReaderQueries` trong hàm `verifyRollbackCompatibility` bao phủ toàn bộ 21 bảng cốt lõi (bổ sung `class_memberships`, `assignment_learners`, `comment_reports`, `ai_content_versions`, `export_jobs`, `data_export_jobs`, `deletion_requests`, `report_snapshots`).
2. `apps/api/src/db/db.test.ts`:
   - Cập nhật kiểm thử sổ cái migration xác nhận toàn bộ 4 bản migration (`0000` đến `0003`).
   - Cập nhật kiểm tra 21 bảng trong `verifyRollbackCompatibility`.
   - Bổ sung khối kiểm thử `R01 Acceptance: Final database migrations and schema consistency verification`:
     - Đối soát siêu dữ liệu `_journal.json` khớp hoàn hảo với danh mục tệp migration trên đĩa.
     - Kiểm thử chịu tải tuần tự hóa 10 tiến trình chạy migration đồng thời với zero lock errors.
     - Xác minh 21 bảng dữ liệu cốt lõi qua các phân hệ đáp ứng tiêu chuẩn expand-contract.
3. `packages/schema/tests/schema.test.ts`:
   - Bổ sung khối kiểm thử `R01 Acceptance: Logic contracts and schema integrity`:
     - Kiểm tra toàn bộ 23 topic sự kiện outbox đảm bảo hợp lệ và zero-leakage.
     - Kiểm thử phủ định (negative testing) chặn rò rỉ đáp án và rò rỉ PII (email, token).
     - Kiểm thử phủ định phát hiện đáp án ẩn ở mọi độ sâu cấu trúc JSON.
     - Kiểm thử triệt tiêu tấn công Spreadsheet Formula Injection theo chuẩn OWASP.
4. `docs/decisions/R01-chot-hop-dong-logic-va-migration.md`:
   - Tài liệu ghi nhận quyết định kỹ thuật này.
