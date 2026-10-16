# Quyết định Kỹ thuật N06: Khắc phục quyền truy cập lưu trữ Object Storage và Volume Staging CI

- **Task ID:** N06
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Ngày:** 2026-10-16
- **Trạng thái:** ACCEPTED

---

## 1. Bối cảnh và Phân tích nguyên nhân lỗi CI

Trong lần chạy CI trên GitHub Actions cho workflow `Staging Verification & PITR Drill` (`.github/workflows/staging.yml`), bước `Run Core Vertical Slice E2E & Demo Package Flow (N06)` gặp lỗi tại pha xuất bản (Publish Phase):

```text
Staging Compose Profile Small & PITR Drill / Run Core Vertical Slice E2E & Demo Package Flow (N06)
FAIL tests/e2e/core.test.ts > Core Vertical Slice E2E: Demo Package flow (N06) > 3. Publish Phase: Immutable Snapshot & Zero Answer Leakage > publishes exam version and guarantees strict zero answer leakage in public snapshot
AssertionError: expected [ 200, 201 ] to include 500
❯ tests/e2e/core.test.ts:210:26
Test Files 1 failed (1)
Tests 1 failed | 14 passed (15)
```

### Phân tích chi tiết:
1. **Khác biệt môi trường thực thi giữa Seed CLI và API Server:**
   - Bước trước đó `Seed Staging Database for N06` thực thi lệnh `docker compose exec -T api node dist/src/modules/import/demo-seed.js`. Trong `demo-seed.ts`, biến môi trường `STORAGE_LOCAL_ROOT` được gán tạm thời về `node_modules/.cache/storage` (vốn đã được `chown` cho `node:node` từ build stage). Do đó, việc seed blueprint, package v2 và xuất bản v1 qua tiến trình CLI này thành công.
   - Tuy nhiên, tiến trình chính của container `api` (`jlpt-staging-api`) chạy entrypoint `node dist/main.js`. Tiến trình này không đi qua `demo-seed.ts` và không có biến môi trường `STORAGE_LOCAL_ROOT` trong `compose.staging.yml`.
   - Khi đó, `LocalFsStorage` rơi vào cấu hình mặc định: `resolveRepoPath('.data/storage')`, tương ứng với `/app/.data/storage`.
2. **Quyền ghi của non-root user `node` trên Alpine container:**
   - Trong `infra/docker/api.Dockerfile`, thư mục `/app` được khởi tạo bởi `root` với mode mặc định `0755` (`drwxr-xr-x`). Khi container chuyển sang `USER node` (uid 1000), tiến trình không có quyền tạo thư mục `/app/.data` trên hệ thống tệp gốc của container.
   - Khi test E2E gửi yêu cầu `POST /api/v1/admin/exams/${demoExamId}/publish` tới API container, `ExamService.publishExam` gọi `storageService.put(...)` để ghi `exams/${examId}/v2/snapshot.json` và `manifest.json`. Lệnh `fs.mkdirSync(parentDir, { recursive: true })` gặp lỗi `EACCES: permission denied, mkdir '/app/.data'`.
   - Do lỗi thuộc loại unhandled system error (không phải NestJS `HttpException`), NestJS ExceptionHandler bắt lỗi và trả về HTTP 500 Internal Server Error, khiến test assertion thất bại.
3. **Thiếu volume chia sẻ giữa API và Worker:**
   - Trong `compose.staging.yml`, cả `api` và `worker` đều thiếu volume lưu trữ dùng chung cho Object Storage local, dẫn đến dữ liệu upload và artifacts không được đồng bộ nhất quán giữa các tiến trình ứng dụng.

---

## 2. Giải pháp kỹ thuật

### 2.1. Cập nhật `infra/docker/api.Dockerfile`
- Trước chỉ thị `USER node` trong runner stage, bổ sung lệnh khởi tạo thư mục lưu trữ persistent và phân quyền toàn bộ thư mục `/app` cho user `node:node`:
  ```dockerfile
  # Create persistent storage directories with proper permissions for user node
  RUN mkdir -p /app/.data/storage && chown -R node:node /app
  ```

### 2.2. Bổ sung cấu hình môi trường và Volume trong `infra/compose/compose.staging.yml`
- Bổ sung biến môi trường `STORAGE_LOCAL_ROOT=/app/.data/storage` cho cả hai service `api` và `worker`.
- Khởi tạo và gắn volume `staging-storage-data:/app/.data/storage` cho cả `api` và `worker`.
- Khai báo volume `staging-storage-data` ở cấp độ top-level của compose file. Khi Docker khởi tạo named volume trên thư mục đã có quyền `node:node`, Docker tự động kế thừa ownership `1000:1000` cho volume.

### 2.3. Tối ưu hóa `apps/api/src/modules/import/demo-seed.ts`
- Cập nhật logic khởi tạo lưu trữ trong `demo-seed.ts`: ưu tiên sử dụng `process.env.STORAGE_LOCAL_ROOT`, nếu chưa có sẽ thử tạo `.data/storage`, và chỉ fallback sang `node_modules/.cache/storage` khi thư mục dữ liệu chính không thể truy cập. Nhờ đó, cả `demo-seed` và API server đều cùng trỏ vào một kho lưu trữ thống nhất.

### 2.4. Bổ sung chuẩn đoán và logging trong `ExamController` & `ExamService`
- Thêm try/catch ghi log chi tiết lỗi khi lưu trữ snapshot/manifest hoặc khi xuất bản/gỡ xuất bản đề thi nhằm phục vụ giám sát và truy vết sự cố nhanh chóng.

---

## 3. Kết quả kiểm chứng

- `pnpm test:publish`: PASS 10/10 tests.
- `pnpm test:e2e:core`: PASS 15/15 tests.
- `pnpm test:security`: PASS 4 test suites / 80 tests.
- `pnpm test:load:baseline`: PASS 250 requests, 100% success rate, latency p50 13ms, p95 29ms.
- Tất cả các cổng chung: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều vượt qua.
