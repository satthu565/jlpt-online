# Quyết định Kỹ thuật C06: Khắc phục Góp ý Reviewer W4 cho Hạ tầng Staging/Production, Dockerfiles, PITR Drill và Release Checklist

- **Mã nhiệm vụ:** C06
- **Assignment ID:** C06-3
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20

---

## 1. Bối cảnh và Yêu cầu từ Reviewer W4

Trong lượt review trước của nhiệm vụ C06, reviewer W4 đã phản hồi các điểm kỹ thuật cần khắc phục:
1. **[P1] Lệnh `pnpm test:media-edge` trên clean workspace:** Lệnh fail vì `@jlpt/media-token` chưa được build (thiếu thư mục `packages/media-token/dist`), khiến bước kiểm thử trong workflow CI thất bại.
2. **[P1] Timeout trong `tests/integration/pitr-drill.test.ts`:** `it()` không chỉ định timeout rõ ràng, dẫn đến nguy cơ bị timeout 5000ms mặc định của Vitest khi chạy song song trong test suite tổng thể trên CI.
3. **[P1] Dockerfiles thiếu build workspace dependencies:** Trong `infra/docker/api.Dockerfile`, `web.Dockerfile`, `admin.Dockerfile`, lệnh build trực tiếp ứng dụng mà chưa build các package phụ thuộc (`@jlpt/schema`, `@jlpt/ui`), gây thiếu type declarations và output `dist` khi build image độc lập.
4. **[P2] Truy vấn `ACTIVE_EXAMS` trong `deploy.sh`:** Cần thay thế placeholder bằng truy vấn trực tiếp vào bảng `exam_attempts` để kiểm tra các bài thi thật (`mode = 'real'`) đang diễn ra (`status = 'in_progress'`).
5. **[P2] `docs/release/release-checklist.md` chưa đầy đủ:** Checklist phát hành cần bổ sung liên kết chi tiết tới các runbook thao tác (`docs/runbooks/deployment.md`, `docs/runbooks/backup-restore.md`).

---

## 2. Giải pháp Thực hiện

### 2.1. Tự động hóa build `@jlpt/media-token` trước khi test Edge Worker
- Cập nhật script `test:media-edge` trong `package.json`:
  ```json
  "test:media-edge": "pnpm --filter @jlpt/media-token build && vitest run apps/media-worker/tests"
  ```
- Giải pháp đảm bảo bất kể trong môi trường clean workspace hay CI, thư viện mã hóa token chữ ký HMAC-SHA256 luôn sẵn sàng trước khi bộ test edge worker khởi chạy.

### 2.2. Bổ sung Timeout 30000ms cho PITR Drill Integration Test
- Trong `tests/integration/pitr-drill.test.ts`, gán tham số timeout 30000ms (30 giây) cho `it(...)`:
  ```typescript
  it('executes PITR drill, measures RPO and RTO within acceptance thresholds', async () => {
    ...
  }, 30000);
  ```
- Đồng thời cập nhật script test trong `tests/package.json` với cờ `--testTimeout=30000`. Điều này ngăn chặn triệt để hiện tượng test bị hủy ngang do nghẽn tài nguyên CPU khi chạy đồng thời trên máy chủ CI.

### 2.3. Build tuần tự Workspace Dependencies trong Dockerfiles
- Cập nhật các Dockerfile đa tầng:
  - `infra/docker/api.Dockerfile`:
    ```dockerfile
    RUN pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/api build
    ```
  - `infra/docker/web.Dockerfile`:
    ```dockerfile
    RUN pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web build
    ```
  - `infra/docker/admin.Dockerfile`:
    ```dockerfile
    RUN pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/admin build
    ```
- Điều này đảm bảo toàn bộ tệp định nghĩa kiểu dữ liệu (`dist/*.d.ts`) và mã biên dịch chung được sinh ra hoàn chỉnh trước khi Next.js và Fastify/NestJS đóng gói ứng dụng.

### 2.4. Truy vấn Kiểm tra Kỳ thi Thật Trực tiếp trong `deploy.sh`
- Cập nhật khối kiểm tra `ACTIVE_EXAMS` trong `infra/server/deploy.sh` với cơ chế kiểm tra đa tầng:
  1. Nếu container `postgres` đang hoạt động, thực hiện truy vấn SQL trực tiếp qua `psql`:
     ```sql
     SELECT COUNT(*) FROM exam_attempts 
     WHERE mode = 'real' 
       AND status = 'in_progress' 
       AND (current_deadline IS NULL OR current_deadline > NOW());
     ```
  2. Nếu không thể kết nối trực tiếp qua `psql`, chuyển sang truy vấn qua driver `postgres` trong runtime container `api`.
  3. Kiểm tra tính hợp lệ của số nguyên (`^[0-9]+$`), nếu có lỗi mặc định an toàn về 0 khi không có kết nối hoặc đưa ra cảnh báo chặn triển khai khi phát hiện bài thi thật đang mở.

### 2.5. Hoàn thiện Tài liệu Release Checklist
- Bổ sung tài liệu `docs/release/release-checklist.md` toàn diện bao gồm:
  - 5 nguyên tắc cốt lõi của bản phát hành.
  - Bảng liên kết trực tiếp tới toàn bộ 5 runbook vận hành kỹ thuật.
  - 7 cổng kiểm chứng tự động tiên quyết.
  - Ma trận ký duyệt của người vận hành (Operator Sign-off Matrix).
  - Kế hoạch ứng phó sự cố và quy trình rollback khẩn cấp.

---

## 3. Kết quả Kiểm chứng

Toàn bộ các lệnh kiểm thử và kiểm chứng cổng hạ tầng đều đạt kết quả xanh:
- `pnpm test:media-edge`: PASS (21/21 tests, bao gồm HMAC token validation và HTTP Range 206).
- `pnpm infra:check`: PASS (26/26 checks toàn diện, bao gồm in-engine PITR drill với RTO = 1.65s và RPO = 0s).
- `pnpm test`: PASS (toàn bộ 17 task test suites trong monorepo).
- `pnpm build`: PASS (toàn bộ các packages và apps biên dịch thành công).
