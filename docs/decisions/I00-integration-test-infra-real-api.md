# Quyết định Kỹ thuật I00: Hạ tầng kiểm thử tích hợp giao diện với API thật

- **Task**: `I00`
- **Worker**: `W6` (Hạ tầng CI và kiểm chứng)
- **Ngày thực hiện**: Ngày 8
- **Nhánh**: `task/I00`
- **Khóa tài nguyên**: `ci-workflow`, `staging-deploy`

---

## 1. Bối cảnh và Thách thức

Bước vào Ngày 8 (tích hợp giao diện với API thật, mã task I00–I07), hệ thống chuyển đổi từ các bài kiểm thử unit/isolated component sang kiểm chứng tích hợp hoàn chỉnh giữa Frontend (`apps/web`, `apps/admin`) và Backend (`apps/api`), triệt tiêu toàn bộ dữ liệu viết cứng, mảng mẫu (`ALL_SAMPLE`, `SAMPLE_*`) và cơ chế đăng nhập giả lập trong client state.

Để hỗ trợ các worker W1, W2, W3, W4, W5 triển khai các task I01–I06, W6 cần xây dựng nền tảng kiểm thử tích hợp:
1. Môi trường Staging CI và Demo compose dựng đầy đủ Web, Admin, API, Postgres, Redis và Mailpit; Web và Admin gọi API qua `/api/v1` cùng origin.
2. Bộ Playwright E2E tích hợp có fixture xác minh email qua Mailpit thật và tài khoản nhân sự seed có mật khẩu và TOTP RFC 6238.
3. Công cụ quét và cổng chặn tự động `pnpm check:no-mock-ui` phát hiện mảng mẫu, `ALL_SAMPLE`, đăng nhập giả, so sánh với baseline ban đầu `tests/integration/mock-ui-baseline.json`.
4. Runbook hướng dẫn dựng bản demo hoàn chỉnh bằng compose (`docs/runbooks/demo-environment.md`).

---

## 2. Các Quyết định Kiến trúc

### Quyết định 1: Lựa chọn Reverse Proxy (Caddy) cho cùng Origin `/api/v1`
- **Giải pháp**: Sử dụng Caddy v2 (`caddy:2-alpine`) với tệp cấu hình `infra/compose/Caddyfile`.
- **Lý do**:
  - Tại production, Cloudflare Tunnel gom Web (`example.com`), Admin (`admin.example.com`) và API (`/api/*`) về cùng origin.
  - Việc cấu hình Caddy làm reverse proxy trong `compose.staging.yml` và `compose.demo.yml` cho phép Web (`:3000` hoặc `:3200`) và Admin (`:3001` hoặc `:3201`) chuyển tiếp toàn bộ yêu cầu `/api/*` về `api:4000` mà không cần cấu hình CORS phức tạp, không gặp lỗi SameSite cookie, và cho phép ứng dụng Next.js build một lần duy nhất với `NEXT_PUBLIC_API_URL=/api/v1`.
  - Caddyfile cấu hình rõ ràng, gọn nhẹ và không phụ thuộc DNS ngoài hay sinh chứng chỉ SSL tự động khi chạy HTTP nội bộ.

### Quyết định 2: Tích hợp Mailpit vào Staging CI và Fixture Playwright
- **Giải pháp**: Bổ sung service `mailpit` (`axllent/mailpit:latest`) vào `compose.staging.yml` và `compose.demo.yml`. Cấu hình biến môi trường `SMTP_URL=smtp://mailpit:1025` và `EMAIL_DRIVER=smtp` cho API.
- **Fixture Playwright**: Tạo `tests/playwright/fixtures/mailpit.fixture.ts` cung cấp `MailpitClient` cho phép:
  - Lắng nghe email đến (`waitForEmail`) với cơ chế polling có timeout an toàn.
  - Trích xuất token xác minh email (`extractVerificationToken`) và liên kết xác nhận.
  - Xóa sạch hộp thư thử nghiệm trước và sau mỗi kịch bản E2E.

### Quyết định 3: Seed tài khoản nhân sự có mật khẩu và TOTP RFC 6238
- **Giải pháp**:
  - Bổ sung tài khoản xác thực trong bảng `accounts` tại `tests/fixtures/seed-sessions.sql` cho các vai trò `admin`, `billing_admin`, `editor`, `reviewer` và `student`.
  - Mật khẩu được băm bằng thuật toán scrypt chuẩn của thư viện `better-auth/crypto` (đáp ứng `verifyPassword`).
  - Xây dựng fixture `tests/playwright/fixtures/staff-auth.fixture.ts` tự sinh mã TOTP 6 số chuẩn RFC 6238 (HMAC-SHA1 trên chu kỳ 30 giây) với mã bí mật `JBSWY3DPEHPK3PXP`, tương thích 100% với `TotpGuard` của API.

### Quyết định 4: Thiết kế công cụ quét `check:no-mock-ui` và Baseline `mock-ui-baseline.json`
- **Giải pháp**:
  - Script `tests/integration/check-no-mock-ui.ts` quét mã nguồn TypeScript/React trong `apps/web` và `apps/admin`.
  - Phân loại vi phạm thành 3 nhóm quy tắc:
    1. `ALL_SAMPLE`: Phát hiện `ALL_SAMPLE` và `ALL_SAMPLE_EXAMS`.
    2. `mảng mẫu`: Phát hiện hằng số `SAMPLE_*`, `MOCK_*`, import từ `fixtures/`, ID mẫu viết cứng (`aud_sample_*`, `rec_run_sample_*`) và mảng mẫu trong component state.
    3. `đăng nhập giả`: Phát hiện `mockId`, `admin_tok_*`, `mockHashedRecoveryCodes`, `mockActiveSecret`, và cờ `mode: 'mock'`.
  - Tệp baseline `tests/integration/mock-ui-baseline.json` liệt kê toàn bộ 31 tệp/route hiện đang chứa vi phạm.
  - Khi chạy, công cụ so sánh vi phạm tìm thấy với baseline:
    - Nếu có bất kỳ vi phạm mới nào ngoài baseline -> Lập tức báo lỗi và trả exit code 1.
    - Trong các task tiếp theo (I02–I06), mỗi worker khi gỡ bỏ dữ liệu giả ở trang nào sẽ xóa route đó khỏi baseline.
    - Ở task I07, baseline trở về rỗng (`[]`), biến `check:no-mock-ui` thành cổng chặn vĩnh viễn trong CI.

---

## 3. Các cải tiến và khắc phục theo yêu cầu Reviewer (Lượt 3)

1. **Chuyển fixture Playwright sang `{ request }` (APIRequestContext):**
   - Loại bỏ phụ thuộc vào browser engine (`page`), chuyển toàn bộ HTTP calls sang `{ request }`. Điều này giúp test chạy trực tiếp, siêu tốc độ và không gặp lỗi thiếu browser binaries (`Executable doesn't exist`) trong CI.
2. **Khắc phục assertion bị nuốt trong reverse proxy check:**
   - Bỏ bọc `if (response.ok())`, assert trực tiếp `expect(response.status()).toBe(200)` và `expect(response.ok()).toBe(true)`.
   - Trong môi trường CI (`process.env.CI`), ném lỗi trực tiếp khi mất kết nối thay vì nuốt ngoại lệ.
3. **Chống kết thúc sớm và pass âm thầm khi thiếu dịch vụ:**
   - Trong CI, nếu Mailpit hoặc API không phản hồi, ném lỗi rõ ràng (`throw new Error(...)` / `expect(isMailpitUp).toBe(true)`) thay vì gọi `test.skip(false)` và `return;`.
4. **Kiểm tra 2FA/TOTP thực tế trên route quản trị:**
   - Sử dụng route `/api/v1/admin/audit-logs` có bảo vệ thực tế bởi `TotpGuard`.
   - Bổ sung 2 bài kiểm thử negative: thiếu mã TOTP bị từ chối 403 (`TWO_FACTOR_REQUIRED`), sai mã TOTP (`000000`) bị từ chối 403 (`TWO_FACTOR_REQUIRED`).
   - Bài kiểm thử positive chứng minh mã TOTP hợp lệ sinh từ `generateTotp(staff.totpSecret)` trả về HTTP 200 kèm danh sách nhật ký kiểm toán.
   - Bổ sung biến môi trường `ENFORCE_STAFF_2FA=true` vào `compose.staging.yml` và `compose.demo.yml`.
5. **Mở rộng phạm vi quét dữ liệu giả:**
   - Bổ sung `apps/web/components`, `apps/web/lib`, và `apps/admin/components` vào hàm `scanApps()` trong `check-no-mock-ui.ts`.

---

## 4. Khắc phục kiểm tra Mailpit Smoke Test trên Staging CI (Lượt 5)

- **Nguyên nhân lỗi CI**: Bước `Run Staging Smoke Tests against live containers` trong `.github/workflows/staging.yml` thực thi lệnh:
  ```bash
  curl -fsS http://127.0.0.1:8025/api/v1/info | grep -q "Mailpit"
  ```
  Tuy nhiên, theo đặc tả Mailpit REST API v1, endpoint `GET /api/v1/info` trả về payload JSON có cấu trúc:
  `{"Database": "...", "DatabaseSize": ..., "LatestVersion": "...", "Messages": ..., "RuntimeStats": {...}, "Version": "..."}`.
  Do chuỗi ký tự `"Mailpit"` không xuất hiện trong payload JSON của `/api/v1/info`, lệnh `grep -q "Mailpit"` trả về mã lỗi 1, khiến toàn bộ workflow CI bị ngắt bởi cờ `set -e`.
- **Biện pháp xử lý**:
  - Sửa lệnh kiểm tra thành:
    ```bash
    curl -fsS http://127.0.0.1:8025/api/v1/info | grep -qiE "version|database"
    ```
  - Bổ sung các dòng `echo ""` sau lệnh kiểm tra Web/Admin healthz để phân tách dòng nhật ký rõ ràng.

## 5. Khắc phục kiểm tra Subject email Mailpit trong Playwright Suite (Lượt 7)

- **Nguyên nhân lỗi CI**: Bước `Run Playwright Real API Integration Suite (I00)` trong `.github/workflows/staging.yml` chạy test:
  `Mailpit integration: Student registration dispatches real email and verifies account`
  bị fail tại assertion:
  ```typescript
  expect(emailMessage.Subject).toContain('xác minh');
  ```
  Thực tế, `email.templates.ts` sinh tiêu đề email là `'Xác minh tài khoản JLPT Online'` (viết hoa chữ `X`). Do phương thức `toContain` phân biệt hoa/thường (case-sensitive) nên `emailMessage.Subject` không chứa chuỗi `'xác minh'` viết thường, gây lỗi `AssertionError` trên cả 5 trình duyệt (chromium, firefox, webkit, Mobile Chrome, Mobile Safari).
- **Biện pháp xử lý**:
  - Chuẩn hóa kiểm tra sang không phân biệt chữ hoa/thường:
    ```typescript
    expect(emailMessage.Subject.toLowerCase()).toContain('xác minh');
    ```
  - Đảm bảo kiểm tra hoạt động ổn định và chính xác với mọi biến thể viết hoa/thường của tiêu đề email xác minh tài khoản.

---

## 6. Khắc phục lỗi TOTP 2FA trên Staging CI cho Core E2E Slice (Lượt 8/9)

- **Nguyên nhân lỗi CI**: Bước `Run Core Vertical Slice E2E & Demo Package Flow (N06)` trong `.github/workflows/staging.yml` chạy test:
  `tests/e2e/core.test.ts`
  bị fail tại 5 bài kiểm thử gọi các route `/api/v1/admin/*` (`imports`, `reviews/.../decision`, `exams/.../publish`) với lỗi HTTP 403:
  `Tài khoản nhân sự bắt buộc phải kích hoạt và xác thực 2FA (TOTP).`
  Nguyên nhân do biến môi trường `ENFORCE_STAFF_2FA=true` được cấu hình trên container `api` trong `compose.staging.yml`. Khi cờ này bật, `TotpGuard` kiểm tra toàn bộ yêu cầu gọi vào route `/api/v1/admin/*` của nhân sự (`editor`, `reviewer`, `admin`). Do các bài kiểm thử E2E của N06 được viết từ Ngày 6 trước khi có cơ chế cưỡng bức 2FA, các yêu cầu gửi đi chỉ mang token Bearer mà không đính kèm mã TOTP RFC 6238, dẫn đến việc bị chặn 403 sớm trước khi đến được logic nghiệp vụ (như kiểm tra payload ZIP hay quy tắc 4-Eyes).
- **Biện pháp xử lý**:
  1. Bổ sung hàm tiện ích `generateTestTotp()` và hook `installFetchTotpHook()` vào `tests/fixtures/test-server.ts`. Khi chạy các bài kiểm thử tích hợp dùng `getApiBaseUrl()`, hook tự động phát hiện các yêu cầu của tài khoản nhân sự gọi vào endpoint `/api/v1/admin/*` và tự động bổ sung tiêu đề `x-totp-code` hợp lệ nếu chưa có.
  2. Bổ sung tiêu đề `x-totp-code: generateTestTotp()` trực tiếp vào các lệnh gọi quản trị trong `tests/e2e/core.test.ts` (validate ZIP, 4-Eyes review decision, reviewer approve, admin publish).
  3. Bổ sung cơ chế xử lý và tự động nối lại phiên thi dở dang (`resumeAttempt`) nếu phát hiện mã lỗi `409 ATTEMPT_ALREADY_OPEN` trên môi trường chia sẻ.
  4. Bổ sung lệnh dọn dẹp các lượt thi cũ của tài khoản học viên mẫu trong `tests/fixtures/seed-sessions.sql` để đảm bảo tính tất định giữa các lần chạy.

---

## 7. Kết quả nghiệm thu các tiêu chí

| Tiêu chí | Trạng thái | Bằng chứng |
| :--- | :--- | :--- |
| Staging CI dựng web, admin, API, Postgres, Redis, Mailpit; cùng origin `/api/v1` | **ĐẠT** | `infra/compose/compose.staging.yml`, `infra/compose/Caddyfile`, `.github/workflows/staging.yml` |
| `pnpm test:e2e:integration` chạy Playwright thật; fixture Mailpit & staff seed TOTP | **ĐẠT** | `tests/playwright/integration.spec.ts`, `tests/playwright/fixtures/*`, lệnh `-- --list` trả mã 0 |
| `pnpm check:no-mock-ui` phát hiện mảng mẫu, ALL_SAMPLE, đăng nhập giả; có baseline | **ĐẠT** | `tests/integration/check-no-mock-ui.ts`, `tests/integration/mock-ui-baseline.json`, unit test 10/10 passed |
| Runbook `docs/runbooks/demo-environment.md` mô tả dựng bản demo đầy đủ bằng compose | **ĐẠT** | `docs/runbooks/demo-environment.md`, `infra/compose/compose.demo.yml` |
