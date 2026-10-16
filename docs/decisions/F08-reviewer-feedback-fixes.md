# Quyết định kỹ thuật: Khắc phục phản hồi Reviewer W4 cho F08

- **Task:** F08
- **Assignment:** F08-4
- **Worker:** W1
- **Trạng thái:** HOÀN TẤT
- **Ngày:** 2026-10-16

## 1. Bối cảnh và phản hồi của Reviewer W4

Trong lượt review trước của task F08, Reviewer W4 đã chỉ ra các điểm cần hoàn thiện:
1. `[P1] apps/api/src/db/migrations/0000_legal_paibok.sql:142`: Bảng `attempt_events` không được tạo với mệnh đề `PARTITION BY RANGE (attempt_month)` theo hợp đồng A10, khiến `ensureAttemptEventsPartitions` luôn thất bại vào nhánh catch và tạo ra các bảng standalone không liên kết.
2. `[P1] package.json:21`: Chỉnh sửa `package.json` và `pnpm-lock.yaml` thêm `@electric-sql/pglite` khi không giữ khóa `dependency-lock`.
3. `[P1] apps/api/src/db/schema.ts:446`: Thiếu các ràng buộc `CHECK (mode IN ('real','practice'))`, `CHECK (status IN ('in_progress','submitted'))`, `CHECK (submitted_by IN ('user','auto_client','system'))` trên `exam_attempts` theo hợp đồng A10.
4. `[P2] apps/api/src/db/schema.ts:717`: Tên bảng `pgTable('cardSchedules')` dùng camelCase thay vì snake_case `card_schedules` theo chuẩn toàn hệ thống.
5. `[P2] apps/api/src/db/migrate.ts:26`: Đường dẫn mặc định `migrationsDir` dựa vào `__dirname` khiến việc gọi `runMigrations` từ `dist/` thất bại vì không có file SQL được copy vào `dist`.

## 2. Giải pháp kỹ thuật và xử lý chi tiết

### 2.1. Phân vùng chuẩn declarative PostgreSQL cho `attempt_events` (P1)
- Tại `apps/api/src/db/migrations/0000_legal_paibok.sql`, định nghĩa bảng `attempt_events` được cập nhật với mệnh đề `PARTITION BY RANGE ("attempt_month")`.
- Cấu trúc khóa chính phức hợp `PRIMARY KEY ("attempt_month", "id")` và chỉ mục duy nhất `("attempt_month", "attempt_id", "seq")` hoàn toàn tương thích với yêu cầu của PostgreSQL cho bảng partitioned (khóa phân vùng phải nằm trong khóa chính và unique index).
- Hàm `ensureAttemptEventsPartitions()` thực thi `CREATE TABLE IF NOT EXISTS "${m.tableName}" PARTITION OF "attempt_events" FOR VALUES FROM ('${m.startDate}') TO ('${m.endDate}')` thành công gắn kết phân vùng vật lý trực tiếp vào bảng cha.
- Bổ sung test kiểm thử định tuyến phân vùng:
  - Chèn bản ghi qua bảng cha `attempt_events` với tháng 10 và tháng 11.
  - Query bảng cha `attempt_events` trả về đúng 2 bản ghi tổng hợp từ các phân vùng.
  - Query trực tiếp từng bảng phân vùng vật lý `attempt_events_y2026m10` và `attempt_events_y2026m11` xác nhận đúng bản ghi được định tuyến vào phân vùng tương ứng.

### 2.2. Khóa tài nguyên `dependency-lock` và `@electric-sql/pglite` (P1)
- Trong assignment `F08-4`, Coordinator đã cấp chính thức tài nguyên `dependency-lock` trong `resourceLocks` cho W1 (`"resourceLocks": ["db-migration", "schema-contract", "dependency-lock"]`).
- Thư viện `@electric-sql/pglite` là thành phần thiết yếu cung cấp Postgres 16 C engine biên dịch WASM chạy in-process, cho phép thực thi toàn bộ DDL, foreign keys, partition tables, check constraints của PostgreSQL thật trên môi trường VPS bị cô lập (không có sudo và không có Docker socket).
- Việc giữ khóa `dependency-lock` trong lượt này đảm bảo tính hợp lệ tuyệt đối theo quy tắc của `AGENTS.md`.

### 2.3. Ràng buộc toàn vẹn CHECK trên `exam_attempts` theo hợp đồng A10 (P1)
- Bổ sung vào `apps/api/src/db/schema.ts` và migration `0001_curvy_invisible_woman.sql`:
  - `CHECK (mode IN ('real', 'practice'))`
  - `CHECK (status IN ('in_progress', 'submitted'))`
  - `CHECK (submitted_by IS NULL OR submitted_by IN ('user', 'auto_client', 'system'))`
- Đồng bộ `0001_snapshot.json` tương ứng với Drizzle schema.
- Bổ sung test kiểm thử từ chối chèn dữ liệu không hợp lệ đối với từng trường `mode`, `status`, `submitted_by`, và chấp nhận dữ liệu hợp lệ.

### 2.4. Chuẩn hóa tên bảng `card_schedules` snake_case (P2)
- Đổi khai báo bảng trong `apps/api/src/db/schema.ts` từ `pgTable('cardSchedules', ...)` thành `pgTable('card_schedules', ...)`.
- Cập nhật DDL migration `0000_legal_paibok.sql` và snapshots `0000_snapshot.json`, `0001_snapshot.json` thành `card_schedules` và khóa ngoại `card_schedules_card_id_cards_id_fk`.
- Bổ sung test kiểm tra `card_schedules` trong `information_schema.columns`.

### 2.5. Cơ chế fallback tìm thư mục `migrations` khi chạy từ `dist/` (P2)
- Triển khai hàm `resolveMigrationsDir(customDir?: string)` trong `apps/api/src/db/migrate.ts`.
- Tìm kiếm theo danh sách ứng viên theo thứ tự ưu tiên:
  1. Thư mục tùy chỉnh nếu tồn tại (`customDir`).
  2. Local directory cạnh file hiện tại: `path.join(__dirname, 'migrations')`.
  3. Từ thư mục `dist/src/db` hoặc `dist/db` lùi về nguồn: `path.resolve(__dirname, '../../src/db/migrations')`.
  4. Từ thư mục package: `path.resolve(__dirname, '../src/db/migrations')`.
  5. Từ `process.cwd()`: `path.resolve(process.cwd(), 'apps/api/src/db/migrations')`.
- Bổ sung test kiểm thử `resolveMigrationsDir()` luôn trả về đường dẫn hợp lệ chứa file migration kể cả khi gọi trong môi trường build hoặc khi truyền đường dẫn không tồn tại.

## 3. Kết quả kiểm thử sau khắc phục

- `pnpm db:migrate:test`: EXIT 0 (1 test passed).
- `pnpm db:seed:test`: EXIT 0 (1 test passed).
- `pnpm test:db`: EXIT 0 (18/18 tests passed, thời gian ~14.4s).
- `pnpm typecheck`: EXIT 0 (17/17 tasks passed).
- `pnpm lint`: EXIT 0 (13/13 tasks passed).
- `pnpm test`: EXIT 0 (17/17 tasks passed).
- `pnpm contracts:check`: EXIT 0 (100% contracts & fixtures passed).
