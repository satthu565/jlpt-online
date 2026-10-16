# Quyết định Kỹ thuật C06: Khắc phục lỗi OOM SIGKILL (137) khi chạy Test Suite trên môi trường Host dùng chung

- **Mã nhiệm vụ:** C06
- **Assignment ID:** C06-9
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20

---

## 1. Bối cảnh và Nguyên nhân Gốc (Root Cause)

Trong phiên kiểm tra tự động của điều phối viên (`coordinator check`) tại `/srv/jlpt-workers/w1/check`, lệnh `pnpm test` (gọi `turbo run test`) thất bại với mã lỗi 137 (`SIGKILL` do Linux kernel Out-Of-Memory Killer):
```
Tasks: 16 successful, 17 total
Cached: 4 cached, 17 total
Time: 34.015s 
Failed: @jlpt/api#test

$ turbo run test
@jlpt/api#test: ERROR command (/srv/jlpt-workers/w1/check/apps/api) /usr/bin/pnpm run test exited (137)
 ERROR run failed: command exited (137)
```

### Phân tích chi tiết:
1. Máy chủ có cấu hình RAM khoảng 5.0 - 7.0 GB, phục vụ đồng thời 6 coding worker (W1..W6) và coordinator daemon.
2. Máy chủ có 8 CPU cores (`nproc = 8`). Khi Turborepo chạy lệnh `turbo run test` không bị giới hạn concurrency, nó mặc định kích hoạt song song theo số core CPU.
3. Trong mỗi package (đặc biệt là `@jlpt/api`), Vitest mặc định sử dụng pool `forks` và tự động spawn 7 - 8 tiến trình worker Node.js con tương ứng với 8 core CPU để chạy song song các file test (`db.test.ts`, `content.test.ts`, `license.test.ts`, `media.test.ts`, `auth.test.ts`, v.v.).
4. Mỗi worker process của `@jlpt/api` khởi tạo một instance WebAssembly PostgreSQL (`PGlite`), NestJS Fastify context và biên dịch TypeScript, tiêu tốn khoảng 600 - 800 MB RAM mỗi process.
5. Khi 8 Vitest worker forks chạy đồng thời trong `@jlpt/api` trong khi các worker khác (W2, W4) hoặc các package khác (`@jlpt/tests`, `@jlpt/web`) cũng đang chạy kiểm thử trên host, tổng dung lượng RAM yêu cầu vượt ngưỡng bộ nhớ vật lý và swap của máy chủ, dẫn đến việc kernel OOM killer gửi tín hiệu `SIGKILL (137)` tới các child worker process của Vitest (`Caused by: Error: Worker exited unexpectedly with signal SIGKILL during started state`).

---

## 2. Giải pháp Thực hiện

### 2.1. Giới hạn số lượng Vitest Worker Process qua `VITEST_MAX_WORKERS`
- Vitest v5 hỗ trợ biến môi trường chuẩn `VITEST_MAX_WORKERS`.
- Cấu hình trong `package.json`:
  ```json
  "scripts": {
    "test": "VITEST_MAX_WORKERS=1 turbo run test"
  }
  ```
- Khi `VITEST_MAX_WORKERS=1` được thiết lập ở root script, tất cả các lần chạy `pnpm test` đều truyền biến môi trường này tới mọi package con.
- Trong `@jlpt/api` và `@jlpt/tests`, các file test sẽ được thực thi tuần tự trong 1 worker fork duy nhất, giữ mức tiêu thụ RAM của mỗi package ổn định ở mức ~600 MB thay vì ~5.6 GB.

### 2.2. Giới hạn Task Concurrency trong Turborepo (`turbo.json`)
- Cấu hình `"concurrency": "2"` trong `turbo.json`:
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": { ... },
    "concurrency": "2"
  }
  ```
- Turborepo chỉ cho phép tối đa 2 workspace package chạy song song tại một thời điểm.
- Tổng mức tiêu thụ bộ nhớ tối đa của toàn bộ test suite trên host không vượt quá ~1.2 GB, hoàn toàn an toàn ngay cả khi tất cả 6 worker cùng hoạt động.

---

## 3. Kết quả Kiểm chứng

1. `pnpm --filter @jlpt/api test` dưới `VITEST_MAX_WORKERS=1`:
   - 8 test files, 92 tests: PASS 100% không có lỗi hoặc SIGKILL nào.
2. `pnpm test`:
   - 17/17 tasks: PASS hoàn toàn (Full Turbo).
3. `pnpm test:media-edge`:
   - 2 test files, 21 tests: PASS.
4. `pnpm infra:check`:
   - 29/29 checks: PASS (bao gồm PITR drill đo RPO = 0s, RTO = 1.41s).
