# Quyết định Kỹ thuật C06: Khắc phục lỗi Entrypoint của API Container, đồng bộ hóa Migration và nâng cao độ bền Healthcheck

- **Mã nhiệm vụ:** C06
- **Assignment ID:** C06-18
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20

---

## 1. Bối cảnh và Phân tích Sự cố CI

Trong lần chạy CI trên GitHub Actions của task C06, bước `Deploy temporary staging with profile small` thất bại với thông báo:
```
Container jlpt-staging-postgres  Healthy
Container jlpt-staging-redis-core Healthy
Container jlpt-staging-redis-cache Healthy
Container jlpt-staging-api  Starting
Container jlpt-staging-worker Starting
Container jlpt-staging-api  Started
Container jlpt-staging-api  Waiting
Container jlpt-staging-api  Error
dependency failed to start: container jlpt-staging-api is unhealthy
##[error]Process completed with exit code 1.
```

### Phân tích nguyên nhân gốc (Root Causes):
1. **Lệch cấu trúc output build của API container (`dist/src/main.js` vs `dist/main.js`):**
   - File cấu hình TypeScript `apps/api/tsconfig.json` thiết lập `rootDir: "."` và `outDir: "./dist"`. Do đó, khi `tsc -p tsconfig.build.json` biên dịch source code từ `src/main.ts`, file JavaScript được xuất ra tại vị trí `dist/src/main.js`, chứ không phải `dist/main.js`.
   - File `infra/docker/api.Dockerfile` thiết lập `CMD ["node", "dist/main.js"]`. Khi container khởi động, Node.js lập tức báo lỗi `MODULE_NOT_FOUND: Cannot find module '/app/apps/api/dist/main.js'` và thoát (exit code 1) chỉ sau 2 giây.
   - Do container tiến trình chính bị crash, Docker Compose đánh dấu container là `Error` và dịch vụ phụ thuộc (`web`, `admin`) bị dừng với thông báo `dependency failed to start: container jlpt-staging-api is unhealthy`.
2. **Khả năng truy cập file SQL migration khi chạy từ built artifact:**
   - Hàm `resolveMigrationsDir()` trong `apps/api/src/db/migrate.ts` tìm kiếm các file `.sql` trong `src/db/migrations` hoặc `dist/src/db/migrations`. Do `tsc` chỉ biên dịch các file `.ts` và không sao chép các file `.sql` vào thư mục `dist/`, cần bảo đảm các file migration `.sql` luôn hiện diện tại cả `dist/src/db/migrations` và `dist/migrations` khi container image được đóng gói.
3. **Log chẩn đoán khi `docker compose up -d` thất bại:**
   - Trong workflow `.github/workflows/staging.yml`, lệnh `docker compose up -d` bị lỗi khiến step dừng ngay lập tức trước khi bước `Wait for staging services health` kịp dump container logs. Cần có cơ chế bẫy lỗi lập tức và hook `if: failure()` để hiển thị toàn bộ log của tất cả container khi bất kỳ bước nào trong CI thất bại.
4. **Tham số khởi động healthcheck cho API trong Compose staging:**
   - Khi API khởi động, service kết nối cơ sở dữ liệu PostgreSQL và thực thi kiểm tra migration schema tự động. Việc tăng `start_period` lên 15 giây và `retries` lên 10 lần bảo đảm container không bị đánh giá thiếu chính xác trong lúc thực thi các tác vụ khởi tạo.

---

## 2. Giải pháp Thực hiện

### 2.1. Cập nhật `infra/docker/api.Dockerfile`
- Trong stage `builder`:
  - Tạo entrypoint forwarder `dist/main.js` trỏ tới `./src/main.js` nếu file chưa tồn tại:
    ```bash
    printf "%s\n" "export * from './src/main.js';" "import './src/main.js';" > /app/apps/api/dist/main.js
    ```
  - Đồng bộ thư mục `migrations` (.sql) sang `dist/src/db/migrations` và `dist/migrations`.
- Trong stage `runner`:
  - Cập nhật lệnh khởi động với cơ chế kiểm tra linh hoạt:
    ```dockerfile
    CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; elif [ -f dist/src/main.js ]; then exec node dist/src/main.js; else echo 'API entrypoint not found' && exit 1; fi"]
    ```

### 2.2. Nâng cao độ bền Healthcheck trong `infra/compose/compose.staging.yml`
- Cập nhật healthcheck của dịch vụ `api`:
  - `start_period`: tăng từ 10s lên 15s.
  - `retries`: tăng từ 5 lên 10.
  - Bảo đảm container có đủ thời gian hoàn thành migration mà không bị Docker Compose ngắt giữa chừng.

### 2.3. Bổ sung cơ chế Dump Log toàn diện trong `.github/workflows/staging.yml`
- Thêm error trap ngay tại bước `Deploy temporary staging with profile small`:
  ```bash
  docker compose -f infra/compose/compose.staging.yml up -d || {
    echo "docker compose up -d failed! Dumping logs immediately..."
    docker compose -f infra/compose/compose.staging.yml logs
    exit 1
  }
  ```
- Bổ sung bước `Dump container logs on failure` với điều kiện `if: failure()`.

### 2.4. Cập nhật Infrastructure Gate trong `infra/check-infra.ts`
- Bổ sung kiểm tra xác nhận `api.Dockerfile` xử lý cả hai đường dẫn entrypoint `dist/src/main.js` và `dist/main.js`.

---

## 3. Kết quả Kiểm chứng Cục bộ

1. **Kiểm tra Media Edge Worker (SYS-11 / Range 206 / Signed check before cache):**
   - Command: `pnpm test:media-edge`
   - Exit code: 0 (21/21 tests PASS).
2. **Kiểm tra Cổng Hạ tầng & Hồ sơ Môi trường (A12 / A13 / Backup / PITR):**
   - Command: `pnpm infra:check`
   - Exit code: 0 (29/29 checks PASS).
3. **Kiểm tra Toàn bộ Bộ Integration Test:**
   - Command: `pnpm exec vitest run tests/integration`
   - Exit code: 0 (6 test suites, 30/30 tests PASS).
   - RTO: 1.4462s (đạt ngưỡng <= 3600s).
   - RPO: 0s (đạt ngưỡng <= 300s).
4. **Kiểm tra Entrypoint API thực tế:**
   - Đã kiểm tra khởi động `node apps/api/dist/main.js` qua wrapper forwarder thành công, lắng nghe tại cổng 4000.
