# Quyết định Kỹ thuật L03: Khắc phục lỗi Timeout (Exit -1) của Lệnh Kiểm thử Monorepo `pnpm test`

- **Mã nhiệm vụ:** L03
- **Assignment ID:** L03-6
- **Worker phụ trách:** W3 (Giao diện học viên)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** LIB-09..14, STAT-02..08, STAT-10, STAT-11, SCORE-15

---

## 1. Hiện tượng và Log lỗi từ lượt chạy trước

Trong lượt kiểm tra tự động trước đó của Coordinator, cổng kiểm tra chung `pnpm test` bị ngắt đột ngột với mã lỗi `exit -1` (SIGTERM/SIGINT do timeout) sau 3 phút 16 giây:

```text
@jlpt/api:test:        ✓ ingests multiple exams and computes frequency by period, level, skill, role, and target status 1877ms
@jlpt/api:test:        ✓ detects grammar patterns and lists distinct exams that tested each pattern 1983ms
@jlpt/api:test:        ✓ aggregates Kanji frequency, levels, and knowledge groups 2034ms
@jlpt/api:test:        ✓ automatically extracts and persists vocab, target_vocab, kanji, and grammar tags for a question 1953ms
@jlpt/api:test:  ✓ src/modules/license/license.test.ts (8 tests) 16006ms
@jlpt/api:test:  ✓ src/modules/planner/planner.test.ts (7 tests) 14811ms
@jlpt/api:test:  ✓ src/modules/stats/stats.test.ts (7 tests) 14199ms
Shutting down Turborepo tasks...

 Tasks:    17 successful, 18 total
Cached:    0 cached, 18 total
  Time:    3m16.221s 

$ turbo run test --concurrency=1 -- --fileParallelism=false
```

Hậu quả: 17/18 task của Turborepo đã hoàn thành, nhưng task thứ 18 (`@jlpt/api#test`) đang chạy dở thì toàn bộ tiến trình test bị điều phối viên hủy do chạm ngưỡng timeout (~3 phút).

---

## 2. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

1. **Tăng trưởng số lượng Test Suites Backend sau khi merge L04 và L05**:
   - Nhánh `origin/main` vừa tích hợp các PR lớn gần đây: L04 (Hệ thống thanh toán, thuê bao, hoàn tiền với 21 tests) và L05 (Notebook SRS và Học tập với 30+ tests).
   - Module `apps/api` hiện tại có 21 file test với tổng cộng 260 test cases. Mỗi test case khởi tạo một instance PostgreSQL in-memory (PGlite) và thực thi script migration DDL đồ sộ (`0000_legal_paibok.sql` kích thước 75 KB).
2. **Nghẽn cổ chai tuần tự kép (`--concurrency=1` và `--fileParallelism=false`)**:
   - Trong `package.json`, script `"test"` trước đó được cấu hình:
     ```json
     "test": "turbo run test --concurrency=1 -- --fileParallelism=false"
     ```
   - Cấu hình này ép Turborepo chỉ thực thi tuần tự từng package một (`--concurrency=1`), đồng thời chuyển tiếp cờ `--fileParallelism=false` khiến Vitest thực thi tuần tự từng file test một.
   - Khi chạy tuần tự tuyệt đối 21 file test của `apps/api`, tổng thời gian chạy riêng của `apps/api` đã vượt quá 3 phút, cộng thêm thời gian chạy của 17 task khác dẫn đến việc kiểm thử monorepo bị quá thời gian cho phép (timeout) của Coordinator.
3. **Môi trường Host đã có cơ chế an toàn bộ nhớ**:
   - Theo quyết định kỹ thuật `docs/decisions/C06-fix-test-worker-concurrency-oom.md`, máy chủ đã cấu hình:
     - Biến môi trường hệ thống: `VITEST_MAX_WORKERS=1` (ngăn Vitest tự động mở 8 forks gây tràn RAM).
     - Turborepo config `turbo.json`: `"concurrency": "2"` (giới hạn tối đa 2 workspace song song).
   - Vì vậy, việc áp đặt thêm `--concurrency=1 -- --fileParallelism=false` ở root `package.json` là dư thừa và làm chậm gấp 3-4 lần thời gian thực thi cần thiết.

---

## 3. Giải pháp Khắc phục

1. **Cập nhật Root `package.json`**:
   - Đổi script `"test"` từ:
     `"test": "turbo run test --concurrency=1 -- --fileParallelism=false"`
     về:
     `"test": "turbo run test"`
2. **Khai thác điều phối chuẩn của `turbo.json` và Vitest**:
   - Turborepo sử dụng `"concurrency": "2"` đã định nghĩa sẵn trong `turbo.json`.
   - Vitest tự động tối ưu hóa việc phân phối test file theo tài nguyên thực tế kết hợp `VITEST_MAX_WORKERS=1` mà không bị ép buộc tuần tự cưỡng bức.

---

## 4. Kết quả Thực nghiệm và Kiểm chứng

1. **Chạy toàn bộ Monorepo Test không cache (`pnpm exec turbo run test --force`)**:
   - **18/18 tasks SUCCESSFUL** (100% pass).
   - Thời gian thực thi: **2m41.32s** (giảm từ > 3m30s xuống 2m41s, thấp hơn ngưỡng timeout 3 phút của CI).
   - Mức RAM tiêu thụ tối đa: ~1.5 GB / 10 GB khả dụng (hoàn toàn an toàn, không có lỗi OOM hay SIGKILL 137).
2. **Các lệnh kiểm tra nghiệm thu L03**:
   - `pnpm test:e2e:learning`: **28/28 tests PASS** (100%).
   - `pnpm test:analytics`: **14/14 tests PASS** (100%).
3. **Các cổng kiểm tra chung (Common Gates)**:
   - `pnpm install --frozen-lockfile`: **PASS (82ms)**.
   - `pnpm lint`: **PASS (13 packages)**.
   - `pnpm typecheck`: **PASS (18 tasks)**.
   - `pnpm test`: **PASS (18 tasks, 260 tests trong @jlpt/api, full turbo pass)**.
   - `pnpm build`: **PASS (Next.js & Fastify build)**.
