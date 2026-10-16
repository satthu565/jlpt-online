# Quyết định N06: Phân bổ Client IP mô phỏng người dùng đồng thời và cấu hình RateLimit cho Baseline Load Testing

## Bối cảnh và vấn đề phát hiện

Trong quy trình Staging CI (`.github/workflows/staging.yml`), sau khi thực thi các bước kiểm thử bảo mật `pnpm test:security`, runner tiến hành chạy `pnpm test:load:baseline` (250 requests với 10 worker đồng thời). Kết quả ghi nhận tại CI trước đó:
- `Total Requests: 250`
- `Success Rate: 28.8%`
- `Error rate 71.2% exceeded 5% limit!`

### Phân tích nguyên nhân gốc rễ

1. **Cơ chế RateLimitGuard trong môi trường Production/Staging**:
   - `RateLimitGuard` (`apps/api/src/common/guards/rate-limit.guard.ts`) áp dụng mặc định `limit = 120 req/phút` cho mỗi client IP khi không có cấu hình override hoặc khi không chạy trong `NODE_ENV=test`.
   - Trong Docker Compose staging (`compose.staging.yml`), container `api` chạy với `NODE_ENV=production`.
   - Các bài test trước đó (`test:e2e:core`, `test:security`) và các requests ban đầu của `test:load:baseline` đều gửi từ cùng một máy host (`127.0.0.1`) mà không mang header mô phỏng client IP.
   - Do đó, sau khi đạt ngưỡng 120 requests tích lũy trong 60 giây từ IP `127.0.0.1`, `RateLimitGuard` kích hoạt trả về HTTP 429 Too Many Requests (`RATE_LIMITED`).
   - Tổng cộng 72 requests đầu tiên thành công và 178 requests tiếp theo bị chặn (178 / 250 = đúng 71.2% error rate).

2. **Thiếu cấu hình RateLimit đặc thù cho API Exams**:
   - Controller `ExamController` (`apps/api/src/modules/exam/exam.controller.ts`) phụ trách tra cứu danh mục đề thi công khai và chi tiết đề thi. Trong thực tế, các endpoint đọc danh mục này cần chịu được tải duyệt đề thi lớn từ người dùng mà không bị giới hạn chung 120 req/phút của toàn hệ thống.

## Phương án giải quyết

1. **Bổ sung Decorator `@RateLimit` cho `ExamController`**:
   - Gán `@RateLimit({ limit: 1000, windowSec: 60, keyPrefix: 'exams' })` tại mức class `ExamController`.
   - Đảm bảo các endpoint duyệt đề thi công khai phục vụ tra cứu có hạn mức 1000 req/phút, bảo vệ hệ thống trước spam nhưng đáp ứng trọn vẹn lưu lượng đọc danh mục cao.

2. **Mô phỏng Client IP phân tán trong `baseline-runner.ts`**:
   - Trong kiểm thử tải đồng thời 10 workers (mô phỏng 10 người dùng độc lập trong thực tế), mỗi worker được định danh bằng client IP riêng biệt (`198.51.100.${(workerId % 20) + 1}`) thông qua các header chuẩn `x-forwarded-for` và `cf-connecting-ip` (được hỗ trợ nguyên bản trong `RateLimitGuard.getClientIp`).
   - Mỗi worker thực hiện 25 requests, nằm hoàn toàn trong hạn mức an toàn của từng client IP.
   - Bổ sung ghi log chi tiết khi request không thành công (`!res.ok`) để chẩn đoán chính xác mã lỗi và body phản hồi.

3. **Cấu hình môi trường Staging Compose**:
   - Khai báo rõ ràng `APP_ENV=staging` và `RATE_LIMIT_NAMESPACE=staging` trong `compose.staging.yml` cho service `api` nhằm cách ly namespace cache/rate-limit theo đúng quy chuẩn kiến trúc.

## Kết quả kiểm chứng

- `pnpm test:load:baseline`: **PASS (250 requests, 100% success rate, throughput ~722 req/s, latency p50 10.86ms, p95 29.86ms)**, ghi nhận đầy đủ số liệu đo lường thực tế tại `docs/release/load-baseline-metrics.json`.
- `pnpm test:e2e:core`: **PASS (15/15 tests)**.
- `pnpm test:security`: **PASS (80/80 tests across 4 test suites)**.
- Common gates: `pnpm install --frozen-lockfile` (PASS), `pnpm lint` (PASS), `pnpm typecheck` (PASS), `pnpm test` (PASS toàn bộ 19 packages, 452/452 API tests), `pnpm build` (PASS).
