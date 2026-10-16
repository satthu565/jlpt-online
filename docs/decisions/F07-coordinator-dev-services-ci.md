# Quyết định kỹ thuật F07: Kiểm chứng coordinator trên VPS, dev services từng worker và CI tích hợp

- **Task**: F07
- **Worker**: W6 (Hạ tầng CI và kiểm chứng)
- **Ngày**: 1
- **Trạng thái**: REVIEW

## 1. Bối cảnh và mục tiêu

Theo tài liệu kiến trúc [DAC_TA_RUNNER.md](../../docs/multi-worker/DAC_TA_RUNNER.md), [VAN_HANH_VPS_WORKER.md](../../docs/multi-worker/VAN_HANH_VPS_WORKER.md) và phân công sáu worker:

- Coordinator được xây dựng ở ngày 0 trong repo riêng `jlpt-coordinator` và chạy dưới user bảo mật `jlpt-coordinator`.
- Sáu coding worker (`jlpt-w1`…`jlpt-w6`) hoạt động độc lập trên VPS, không có quyền sudo, không có quyền truy cập Docker host socket toàn máy, và không được đọc secret hay database của worker khác hoặc của coordinator.
- Task F07 có mục tiêu:
  1. Kiểm chứng coordinator trên VPS và đảm bảo qua đủ 12 tình huống kiểm thử runtime bắt buộc trong `DAC_TA_RUNNER.md`.
  2. Thiết lập cấu hình dev services tách riêng cho từng worker (`infra/dev/`): DB, Redis namespaces, queue prefixes, storage roots và cổng.
  3. Cung cấp lệnh kiểm tra `pnpm infra:dev:check` để xác thực toàn bộ hạ tầng dev và chính sách cách ly bảo mật.
  4. Thiết lập workflow CI tích hợp (`.github/workflows/integration.yml`) chạy kiểm thử tự động với service containers (PostgreSQL 17, Redis Core, Redis Cache).

## 2. Các quyết định kiến trúc

### 2.1. Phân bổ và cách ly dữ liệu từng worker (`infra/dev/init-workers-db.sql`)

- Mỗi worker sở hữu một database PostgreSQL riêng biệt: `jlpt_w1` đến `jlpt_w6`.
- Mỗi database đi kèm một user role riêng (`jlpt_w1`…`jlpt_w6`) có mật khẩu xác thực riêng.
- Thu hồi quyền kết nối mặc định: `REVOKE CONNECT ON DATABASE jlpt_w<N> FROM PUBLIC` và chỉ `GRANT CONNECT` cho user sở hữu database đó và superuser `postgres`.
- Kích hoạt extension `pg_bigm` trên từng database phục vụ tìm kiếm toàn văn tiếng Nhật NFC.

### 2.2. Phân tách Redis và hàng đợi BullMQ

- Tách thành 2 dịch vụ Redis chạy trên loopback `127.0.0.1`:
  - `redis-core` (cổng `6379`): cấu hình `appendonly yes` và `maxmemory-policy noeviction` cho dữ liệu phiên, state, pub/sub.
  - `redis-cache` (cổng `6380`): cấu hình `maxmemory 64mb` và `maxmemory-policy allkeys-lru` cho cache dữ liệu tạm.
- Mỗi worker được cấp key prefix riêng biệt:
  - Redis Core: `jlpt:w<N>:core:`
  - Redis Cache: `jlpt:w<N>:cache:`
  - BullMQ Queue Prefix: `jlpt-w<N>`

### 2.3. Quy hoạch cổng không chồng lấn

- Tất cả cổng dịch vụ chỉ bind vào `127.0.0.1`:
  - W1: Web `3100`, Admin `3101`, API `4100`
  - W2: Web `3200`, Admin `3201`, API `4200`
  - W3: Web `3300`, Admin `3301`, API `4300`
  - W4: Web `3400`, Admin `3401`, API `4400`
  - W5: Web `3500`, Admin `3501`, API `4500`
  - W6: Web `3600`, Admin `3601`, API `4600`
- Bộ kiểm tra `validateWorkerConfigs()` xác thực tự động không có bất kỳ cổng nào bị trùng lặp giữa 6 worker.

### 2.4. Kiểm tra cách ly bảo mật (`infra/dev/check.ts`)

Lệnh `pnpm infra:dev:check` thực hiện kiểm tra tự động:

1. Xác thực cấu hình worker (`worker-env.ts`) và `workers.example.json`.
2. Kiểm tra tính toàn vẹn của `compose.dev.yml` và script SQL `init-workers-db.sql`.
3. Kiểm tra DAG `tasks.json` không bị mất dependency hay vòng lặp.
4. Kiểm tra negative permissions:
   - Worker không thể chạy `sudo -n true`.
   - Worker không thể đọc coordinator secrets (`/srv/jlpt-coordinator/secrets/coordinator.env`).
   - Worker không thể đọc coordinator database (`/srv/jlpt-coordinator/data`).
   - Worker không thể truy cập Docker host socket (`/var/run/docker.sock`).
   - Worker không thể truy cập thư mục repository của worker khác.

### 2.5. Kiểm chứng 12 tình huống runtime của DAC_TA_RUNNER (`tests/integration/dac-ta-runner.test.ts`)

Đã thiết lập test suite tự động bao quát đủ 12 tình huống bắt buộc:

1. **Hai tick cùng task**: Giao dịch `store.tx` với `BEGIN IMMEDIATE` đảm bảo chỉ một assignment thắng atomically.
2. **Restart khi child còn sống**: `bumpFencing` tăng fencing token, vô hiệu hóa các write từ child cũ.
3. **Lease hết trong lúc build**: Checkpoint lưu manifest và commit hash của nhánh task trước khi chuyển trạng thái sang `NEEDS_WORK`, không reset clone.
4. **W2 hết quota**: `pauseWorker` chỉ tạm dừng W2; W3 đủ dependencies vẫn sẵn sàng được điều phối.
5. **Quota trước commit và có binary/untracked**: `addCheckpoint` lưu trữ đầy đủ danh sách untracked files và sha.
6. **Sáu tasks gọi build/E2E**: `Semaphore` giới hạn đồng thời `heavyBuilds: 2`, `browserSuites: 1`, `loadRuns: 1`.
7. **Hai task sửa schema/migration/lockfile**: Khóa tài nguyên độc quyền (`acquireLocks`) chặn task thứ hai ghi đè.
8. **Review UNCLEAR/provider error**: Verdict `UNCLEAR` hoặc `BLOCKED` từ chối merge, chuyển về `NEEDS_WORK`.
9. **Main/head đổi sau review**: Sai lệch SHA sau review tự động kích hoạt hủy review hợp lệ và yêu cầu re-review.
10. **Worker cố đọc secrets hoặc gọi Docker host**: `workersCheck` ghi nhận sự kiện audit khi worker bị từ chối truy cập.
11. **Task catalog đổi/mất dependency**: `loadCatalog` phát hiện dependency không tồn tại và trả về lỗi trước khi cấp việc.
12. **External missing/live chưa test**: Điều kiện ngoài thiếu (`startPrerequisites` / `acceptancePrerequisites`) chặn task ở `BLOCKED_EXTERNAL`, không đánh dấu hoàn tất giả.

### 2.6. CI tích hợp (`.github/workflows/integration.yml`)

- Chạy trên `ubuntu-latest` với các service container: PostgreSQL 17 (`5432`), Redis Core (`6379`), Redis Cache (`6380`).
- Thực hiện đầy đủ các bước: checkout, frozen pnpm install, thiết lập database worker bằng `init-workers-db.sql`, `pnpm infra:dev:check`, lint, typecheck, test monorepo (19 tests), build turbo, và xuất artifact bằng chứng CI bất biến gắn commit SHA.

## 3. Kết quả nghiệm thu

- Lệnh `pnpm infra:dev:check` chạy đạt 100% kiểm tra (OK).
- Lệnh `pnpm test` chạy đạt 17/17 package tests, gồm 19 integration tests (12 kịch bản DAC_TA_RUNNER, 6 dev-services tests, 1 smoke test).
- Lệnh `pnpm lint`, `pnpm typecheck`, `pnpm build` đều đạt (FULL TURBO).
