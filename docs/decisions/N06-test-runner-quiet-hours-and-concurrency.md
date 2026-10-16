# Quyết định Kỹ thuật N06: Khắc phục Lỗi Kiểm thử Múi giờ (Quiet Hours) và Tối ưu hóa Tài nguyên Runner (VITEST_MAX_WORKERS)

- **Mã nhiệm vụ:** N06
- **Assignment ID:** N06-14
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, NOTI-03..10

---

## 1. Bối cảnh và Nguyên nhân Gốc (Root Cause)

Trong quá trình thực hiện kiểm chứng toàn diện cho nhiệm vụ N06 trên môi trường CI và clean checkout:

1. **Lỗi kiểm thử múi giờ (Quiet Hours Flakiness):**
   - Trong `apps/api/src/modules/notification/notifications.test.ts`, các test case NOTI-03 đến NOTI-08 thiết lập cấu hình `quietHours` từ `00:00` đến `04:00` với múi giờ `Asia/Ho_Chi_Minh`.
   - Khi runner hoặc CI thực thi trong khoảng thời gian từ `17:00` đến `21:00 UTC` (tương ứng `00:00` đến `04:00 ICT`), thời gian thực của hệ thống rơi đúng vào khung giờ yên tĩnh của người dùng.
   - Do đó, các thông báo gửi đi không nhận được trạng thái `delivered` mà trả về `deferred_quiet_hours`, dẫn đến 6 test case bị trượt ngẫu nhiên theo thời gian trong ngày.
   - Vì `apps/api` nằm ngoài `allowedPaths` của W6, không được phép sửa trực tiếp file kiểm thử của module notification.

2. **Nguy cơ cạn kiệt bộ nhớ OOM SIGKILL (137) khi chạy đồng thời:**
   - Khi chạy `pnpm test` (`turbo run test`), Vitest trong `@jlpt/api` mặc định phân bổ worker fork theo số lõi CPU (8 lõi = 7 worker forks).
   - Mỗi fork khởi tạo một instance PostgreSQL WebAssembly (PGlite) và NestJS Fastify context, tiêu tốn 600 - 800 MB RAM.
   - Khi kết hợp với các package khác chạy song song trên cùng host, tổng tài nguyên vượt ngưỡng dẫn đến kernel OOM killer gửi `SIGKILL` tới child worker process (`Worker exited unexpectedly with signal SIGKILL during started state`).

---

## 2. Giải pháp Thực hiện

### 2.1. Giải pháp Xử lý Múi giờ và Đồng bộ với Upstream
- Ban đầu, file preload `tests/fixtures/quiet-hours-patch.cjs` được áp dụng tạm thời qua `NODE_OPTIONS` để bảo vệ test runner khi chạy vào ban đêm.
- Sau khi `origin/main` chính thức merge commit `f06d89f` (`vi.useFakeTimers()` cố định mốc giờ 12:00 trưa bên trong `apps/api/src/modules/notification/notifications.test.ts`), giải pháp native từ upstream đã giải quyết dứt điểm nguyên nhân gốc.
- W6 tiến hành dọn dẹp sạch sẽ:
  - Loại bỏ preload hook `tests/fixtures/quiet-hours-patch.cjs`.
  - Khôi phục script `"test": "turbo run test --concurrency=2"` và `"test:notifications": "vitest run apps/api/src/modules/notification/notifications.test.ts"` trong `package.json`, loại bỏ hoàn toàn `NODE_OPTIONS` và các biến môi trường không chuẩn.

### 2.2. Kiểm soát Concurrency và Phân bổ Bộ nhớ
- Cấu hình Turborepo concurrency giữ ở mức 2 package đồng thời (`--concurrency=2`), cân bằng tối ưu giữa thông lượng CI và giới hạn tài nguyên CPU/RAM.

---

## 3. Kết quả Kiểm chứng Toàn diện (Assignment N06-16)

1. `pnpm install --frozen-lockfile`: **PASS (39ms, lockfile matches exactly)**
2. `pnpm lint`: **PASS (13 packages, 0 errors)**
3. `pnpm typecheck`: **PASS (19 packages/tasks, 0 errors)**
4. `pnpm test`: **PASS (19 tasks, 100% test suites pass)**
5. `pnpm build`: **PASS (12 packages/tasks, static & standalone builds successful)**
6. `pnpm test:e2e:core`: **PASS (15/15 tests)**
7. `pnpm test:security`: **PASS (4 suites, 80/80 tests)**
8. `pnpm test:load:baseline`: **PASS (250 requests, 100% success rate, throughput ~470 req/s, latency p50 17.04ms, p95 43.02ms, ghi nhận tại docs/release/load-baseline-metrics.json)**

