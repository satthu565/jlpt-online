# Quyết định kỹ thuật C02: Cấu hình hookTimeout cho Vitest trong @jlpt/api

- Mã task: `C02`
- Phụ trách: `W2` (API tài khoản nội dung và thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED`

## 1. Bối cảnh và vấn đề

Trong lần chạy kiểm tra toàn diện `turbo run test` từ coordinator:
- 16/17 task thành công, duy nhất `@jlpt/api:test` báo `FAIL` (exit code 1).
- Nguyên nhân: Các file test `authorization.test.ts`, `auth.test.ts`, `license.test.ts`, `media.test.ts`, `content.test.ts`, và `tests/health.test.ts` bị lỗi `Hook timed out in 10000ms` trong các hook `beforeAll` hoặc `beforeEach`.

## 2. Phân tích nguyên nhân gốc (Root Cause)

1. Vitest chạy mặc định đa luồng (worker threads/forks) song song giữa các file test.
2. Bộ test của `@jlpt/api` có 8 file test, trong đó 7 file khởi tạo instance PGlite (PostgreSQL 16 chạy trên WebAssembly in-process) và thực thi toàn bộ migration schema.
3. Khi 8 luồng chạy đồng thời trên môi trường CPU giới hạn, thời gian biên dịch WASM và chạy migration trong các hook `beforeAll` / `beforeEach` dao động trong khoảng 11-15 giây.
4. Script test trước đây chỉ cấu hình `--testTimeout=20000` mà không cấu hình `--hookTimeout`, khiến Vitest áp dụng giá trị mặc định là 10,000ms (10 giây) cho các hook thiết lập môi trường.

## 3. Giải pháp thực hiện

1. Cập nhật script `test` trong `apps/api/package.json`:
   ```json
   "test": "vitest run --testTimeout=30000 --hookTimeout=30000"
   ```
2. Giữ nguyên tính độc lập và toàn vẹn của PGlite sandbox cho từng test suite nhằm đảm bảo tính cô lập tuyệt đối giữa các bài test.
3. Không làm yếu bất kỳ assertion nào và không dùng mock thay thế PGlite database thật.

## 4. Kết quả nghiệm thu

- `turbo run test`: 17/17 tasks thành công (100% passed).
- `@jlpt/api`: Toàn bộ 8 file test, 92 test cases passed hoàn toàn.
- Các checks theo yêu cầu của task C02:
  - `pnpm test:content`: 2 files, 18 tests passed (100%).
  - `pnpm test:upload`: 1 file, 11 tests passed (100%).
  - `pnpm test:storage`: 1 file, 8 tests passed (100%).
- `pnpm typecheck` và `pnpm lint`: Đạt 100% không có lỗi.
