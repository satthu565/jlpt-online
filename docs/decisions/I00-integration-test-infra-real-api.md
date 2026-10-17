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

## 3. Kết quả nghiệm thu các tiêu chí

| Tiêu chí | Trạng thái | Bằng chứng |
| :--- | :--- | :--- |
| Staging CI dựng web, admin, API, Postgres, Redis, Mailpit; cùng origin `/api/v1` | **ĐẠT** | `infra/compose/compose.staging.yml`, `infra/compose/Caddyfile`, `.github/workflows/staging.yml` |
| `pnpm test:e2e:integration` chạy Playwright thật; fixture Mailpit & staff seed TOTP | **ĐẠT** | `tests/playwright/integration.spec.ts`, `tests/playwright/fixtures/*`, lệnh `-- --list` trả mã 0 |
| `pnpm check:no-mock-ui` phát hiện mảng mẫu, ALL_SAMPLE, đăng nhập giả; có baseline | **ĐẠT** | `tests/integration/check-no-mock-ui.ts`, `tests/integration/mock-ui-baseline.json`, unit test 10/10 passed |
| Runbook `docs/runbooks/demo-environment.md` mô tả dựng bản demo đầy đủ bằng compose | **ĐẠT** | `docs/runbooks/demo-environment.md`, `infra/compose/compose.demo.yml` |
