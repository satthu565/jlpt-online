# Quyết định kỹ thuật F08: Schema database và migration toàn bộ miền

- **Task:** F08
- **Worker:** W1
- **Trạng thái:** HOÀN TẤT
- **Ngày:** 2026-10-16

## 1. Bối cảnh và mục tiêu

Task F08 yêu cầu xây dựng schema database toàn diện cho toàn bộ 25 miền chức năng của JLPT Online theo tài liệu `DU_LIEU_VA_SU_KIEN.md` và hợp đồng `A10` trong `HOP_DONG_KY_THUAT.md`.
Đồng thời, task yêu cầu:
1. Nghiệm thu "Migrate fresh seeded rollback-code compatibility pass": migration chạy trên database mới, nạp seed, kiểm tra tính tương thích với code rollback/đọc phiên bản cũ theo mô hình expand-contract.
2. Dữ liệu tự soạn N1–N5, gắn nhãn synthetic (`provenance: 'self_authored'`, `kind: 'synthetic'`).
3. Blueprint thi thật chỉ kích hoạt khi có nguồn chính thức (`jlpt.jp`) và xác nhận từ chủ dự án (điều kiện ngoài `jlpt-blueprints`).
4. Cung cấp và chạy 3 lệnh: `pnpm db:migrate:test`, `pnpm db:seed:test`, `pnpm test:db`.

## 2. Các quyết định kiến trúc

### 2.1. Khai báo Schema Drizzle ORM toàn bộ 25 module

Toàn bộ 139 bảng thuộc 25 miền chức năng được định nghĩa tập trung và tường minh tại `apps/api/src/db/schema.ts`, tuân thủ các quy tắc:
- Tên bảng và cột chuẩn `snake_case`.
- Khóa chính chuẩn `uuid` (UUIDv7 sinh từ application).
- Mọi mốc thời gian dùng `timestamp with time zone` (timestamptz UTC).
- Ràng buộc toàn vẹn khóa ngoại (FK) giữa các miền (User, Exam, Attempt, Class, Billing, Outbox).
- Hỗ trợ đầy đủ bảng Better Auth (`users`, `user_profiles`, `sessions`, `accounts`, `verifications`).
- Ràng buộc toàn vẹn đặc thù A10:
  - `CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)` trên `exam_attempts`.
  - Unique partial index trên `(user_id, exam_id)` với `status = 'in_progress'` (ngăn mở nhiều bài thi đồng thời).
  - Khóa ngoại phức hợp `(exam_id, version)` từ `exam_answer_keys` và `exam_attempts` tới `exam_versions`.
  - Khóa phức hợp và unique index `(attempt_month, attempt_id, seq)` trên `attempt_events`.

### 2.2. Migration Journal và Idempotent Execution

- Sử dụng `drizzle-kit` sinh migration SQL và journal trong `apps/api/src/db/migrations/`:
  - `0000_legal_paibok.sql`: khởi tạo bảng và quan hệ cơ sở.
  - `0001_curvy_invisible_woman.sql`: bổ sung ràng buộc toàn vẹn phức hợp và unique index.
- Bộ chạy migration `apps/api/src/db/migrate.ts` quản lý lịch sử áp dụng qua bảng `__drizzle_migrations`, đảm bảo tính lũy kế (idempotent), chạy lại nhiều lần không sinh lỗi.

### 2.3. Hỗ trợ Dual-Client (Live PostgreSQL & PGlite WASM)

- Theo `VAN_HANH_VPS_WORKER.md`, môi trường VPS không cấp sudo và docker socket trực tiếp cho coding worker.
- Triển khai `apps/api/src/db/client.ts`:
  - Khi có biến môi trường `DATABASE_URL`: kết nối PostgreSQL trực tiếp qua `postgres.js` và `drizzle-orm/postgres-js`.
  - Khi không có `DATABASE_URL`: khởi tạo `@electric-sql/pglite` (Postgres 16 C engine biên dịch WASM chạy trực tiếp trong Node.js).
- Giải pháp này tuân thủ nguyên tắc không dùng mock ("Không làm yếu test, không dùng mock thay bằng chứng tích hợp thật"), thực thi đầy đủ SQL DDL, indexes, constraints, transactions của PostgreSQL thật.

### 2.4. Kiểm tra tương thích Rollback-code (Expand-Contract)

- Triển khai hàm `verifyRollbackCompatibility()` trong `migrate.ts`:
  - Mô phỏng các query của ứng dụng phiên bản N-1 trên các bảng cốt lõi (`exams`, `exam_versions`, `exam_attempts`, `blueprints`, `users`, `outbox`).
  - Xác nhận việc bổ sung cột/bảng mới trong migration không phá vỡ khả năng đọc dữ liệu của code cũ.
  - Kiểm tra tính lũy kế khi re-run migration.

### 2.5. Blueprint Activation Guard (Acceptance 3)

- Triển khai `activateBlueprint()` trong `apps/api/src/db/blueprint-guard.ts`:
  - Blueprint synthetic (`kind: 'synthetic'`): kích hoạt trực tiếp ở trạng thái `active` phục vụ dev và thi thử.
  - Blueprint chính thức (`kind: 'official'`): ở trạng thái `draft` và `isConfirmed: false` cho đến khi:
    1. Có nguồn tham chiếu chính thức từ `jlpt.jp` (`sourceRef`).
    2. Có xác nhận chính thức từ chủ dự án (`confirmation.confirmedBy`).
    3. Không chứa giá trị placeholder 0 ở thời gian phần thi hoặc số câu hỏi.

### 2.6. Fixtures Dữ liệu Tự soạn N1–N5 (Acceptance 2)

- Lưu tại `packages/schema/fixtures/`:
  - `blueprints/`: 5 blueprint synthetic (`synthetic-n1..5.json`) + 5 blueprint official draft (`official-n1..5.draft.json`).
  - `synthetic-exams/`: 5 bộ đề tự soạn N1–N5 (`synthetic-n1..5.json`) gắn nhãn synthetic, đầy đủ các dạng câu hỏi furigana (ruby), câu sắp xếp sao (★), bài đọc, bài nghe, kèm lời giải tiếng Việt và answer key hợp lệ.

### 2.7. Tự động hóa Partition cho attempt_events

- Triển khai `apps/api/src/db/partitions.ts`:
  - Tự động tính toán và tạo partition dạng bảng `attempt_events_yYYYYmMM` cho tháng hiện tại và 2 tháng tiếp theo.
  - Chạy lũy kế không lỗi (`CREATE TABLE IF NOT EXISTS`).

### 2.8. Tách biệt kiểm thử DB và ranh giới gói monorepo (Khắc phục TS6059 & TS2532)

- Đặt bộ kiểm thử `db.test.ts` tại `apps/api/src/db/db.test.ts` thay vì trong `@jlpt/schema`:
  - Về mặt kiến trúc: `@jlpt/schema` là thư viện hợp đồng/DTO/schema chia sẻ cấp thấp, không phụ thuộc vào `apps/api`. Ngược lại `apps/api` phụ thuộc `@jlpt/schema`.
  - Về mặt TypeScript compilation: Tránh lỗi `TS6059` (`rootDir` vi phạm khi gói `schema` import source file của `apps/api/src/db`).
  - Gói `apps/api` sở hữu `db.test.ts` và import trực tiếp từ local `./index.js` cùng `@jlpt/schema` qua workspace package dependency.
  - Xử lý triệt để `noUncheckedIndexedAccess: true` với `months[i]?.startDate` và `parsed.sourceRef[0]?.url` (tránh `TS2532`).
  - `tsconfig.build.json` của `apps/api` loại trừ `**/*.test.ts`, đảm bảo build artifact sạch sẽ không dính test files.

## 3. Kết quả kiểm thử

- `pnpm db:migrate:test`: Đạt (1 test migration fresh + ledger assertion).
- `pnpm db:seed:test`: Đạt (1 test seed users, blueprints, exams, questions, partitions).
- `pnpm test:db`: Đạt toàn bộ 15/15 test cases (Acceptance 1, 2, 3).
- `pnpm contracts:check`: Đạt 100% hợp đồng API và fixtures.
- `pnpm test`: Đạt 17/17 package test suites (16 passed in `@jlpt/api`, 27 passed in `@jlpt/schema`, v.v.).
- `pnpm lint`: Đạt 13/13 packages, 0 lỗi.
- `pnpm typecheck`: Đạt toàn bộ 17/17 package typecheck tasks mà không còn bất kỳ lỗi nào.
