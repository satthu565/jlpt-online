# Quyết định Kỹ thuật N06: Khắc phục biến môi trường IMAGE_TAG và điều phối container Staging CI

- **Task ID:** N06
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Ngày:** 2026-10-16
- **Trạng thái:** ACCEPTED

---

## 1. Bối cảnh và Phân tích nguyên nhân lỗi CI

Trong lần chạy CI gần nhất trên GitHub Actions cho workflow `Staging Verification & PITR Drill` (`.github/workflows/staging.yml`), bước `Seed Staging Database for N06` bị lỗi thoát với mã 1:

```text
Staging Compose Profile Small & PITR Drill / Seed Staging Database for N06
Seeding staging sessions and tenant data...
docker compose -f infra/compose/compose.staging.yml exec -T postgres psql -U jlpt -d jlpt_staging < tests/fixtures/seed-sessions.sql
error while interpolating services.api.image: required variable IMAGE_TAG is missing a value: IMAGE_TAG required
##[error]Process completed with exit code 1.
```

### Nguyên nhân cốt lõi:
1. Trong file cấu hình `infra/compose/compose.staging.yml`, các định nghĩa image cho các service `web`, `admin`, `api`, `worker` sử dụng cú pháp nội suy chuỗi nghiêm ngặt: `${IMAGE_TAG:?IMAGE_TAG required}`. Khác với service `postgres` (đã sử dụng `${IMAGE_TAG:-latest}`), các service này sẽ gây lỗi ngay lập tức (`fatal error`) nếu biến môi trường `IMAGE_TAG` không được thiết lập trong shell đang thực thi lệnh `docker compose`.
2. Trong workflow `.github/workflows/staging.yml`, biến môi trường `IMAGE_TAG: ${{ github.sha }}` trước đó chỉ được định nghĩa cục bộ trong bước `Build staging container images once` và `Deploy temporary staging with profile small`. Các bước tiếp theo như `Seed Staging Database for N06`, `Dump container logs on failure`, và `Verify Staging Teardown & Volume Cleanliness` gọi `docker compose` mà không có `IMAGE_TAG` trong phạm vi môi trường, dẫn tới việc `docker compose` khi parse file compose đã báo lỗi và dừng tiến trình.
3. Ngoài ra, theo phân tích từ `docs/decisions/L03-staging-race-condition-analysis.md`, trong môi trường staging tạm, service `worker` cần phụ thuộc vào `api` với điều kiện `condition: service_healthy` để đảm bảo `api` khởi động và hoàn tất áp dụng migrations trước khi `worker` kết nối, tránh tranh chấp race condition giữa các container dùng chung image `jlpt-api`.

---

## 2. Giải pháp thực hiện

### 2.1. Nâng cấp workflow `.github/workflows/staging.yml`
- Thiết lập biến môi trường ở cấp độ Job (`jobs.staging-verify.env`):
  - `IMAGE_TAG: ${{ github.sha }}`
  - `IMAGE_REPO: jlpt`
  - `IMAGE_REGISTRY: docker.io`
  - `PROFILE: small`
  - `STAGING_API_URL: http://127.0.0.1:4000`
- Bổ sung cấu hình `env:` tường minh cho từng bước có lệnh `docker compose` (`Seed Staging Database for N06`, `Dump container logs on failure`, `Verify Staging Teardown & Volume Cleanliness`).

### 2.2. Khắc phục cấu hình `infra/compose/compose.staging.yml`
- Chuyển đổi `${IMAGE_TAG:?IMAGE_TAG required}` thành `${IMAGE_TAG:-latest}` cho `web`, `admin`, `api`, `worker` trong `compose.staging.yml`. Nhờ đó, ngay cả khi thực thi cục bộ hay ad-hoc ngoài CI mà không truyền `IMAGE_TAG`, `docker compose` vẫn nội suy an toàn với giá trị fallback `latest` thay vì dừng tiến trình. File `compose.prod.yml` vẫn giữ nguyên `:?IMAGE_TAG required` để đảm bảo tuân thủ quy chuẩn không deploy production khi thiếu tag cụ thể.
- Bổ sung `api: condition: service_healthy` vào `depends_on` của service `worker` trong `compose.staging.yml`.

---

## 3. Kiểm chứng và Đo lường

1. **Cổng kiểm tra hạ tầng (A12 / A13):**
   - `pnpm infra:check`: PASS 29/29 checks, bao gồm PITR drill đo lường thực tế RTO = 1.36s, RPO = 0s.
2. **Cổng kiểm tra kiểm thử N06:**
   - `pnpm test:e2e:core`: PASS 15/15 tests (luồng trọn vẹn Import v2 demo-n5-1 -> Review -> Publish -> Thi -> Review kết quả).
   - `pnpm test:security`: PASS 4 test suites / 80 tests (Cross-tenant isolation, IDOR prevention, RBAC, Lease monotonic sequence, Zero answer leak).
   - `pnpm test:load:baseline`: PASS 250 requests với 10 worker đồng thời, 100% success rate, throughput ~588 req/s, latency p50 13.16ms, p95 29.58ms.
3. **Cổng chung của dự án:**
   - `pnpm install --frozen-lockfile`: PASS
   - `pnpm lint`: PASS (13 packages)
   - `pnpm typecheck`: PASS (13 packages)
   - `pnpm test`: PASS (19 packages, 452 tests)
   - `pnpm build`: PASS (12 packages/apps)
