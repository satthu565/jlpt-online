# Quyết định Kỹ thuật: Khắc phục lỗi Content-Type rỗng và đồng bộ TOTP đa trình duyệt

- **Mã Task**: I03
- **Assignment ID**: I03-13
- **Người thực hiện**: W4 (Quản trị báo cáo và thương mại)
- **Thời gian**: 2026-10-18

## 1. Vấn đề và nguyên nhân gốc

### 1.1. Lỗi "Body cannot be empty when content-type is set to 'application/json'" khi xuất bản đề thi
- **Hiện tượng**: Trong kiểm thử E2E Playwright trên staging, khi Admin click nút "Xuất bản" trên trang `/exams`, hành động xuất bản không thành công, giao diện báo lỗi `"Body cannot be empty when content-type is set to 'application/json'"` và không hiển thị thông báo thành công.
- **Nguyên nhân gốc**:
  - `AdminApiClient.request` trong `apps/admin/lib/api-client.ts` luôn tự động thêm header `'Content-Type': 'application/json'` cho mọi request không phải `FormData`, bất kể có body hay không (`options.body === undefined`).
  - Trong NestJS Fastify, khi một HTTP request (POST/PUT/PATCH/GET) mang header `Content-Type: application/json` nhưng payload rỗng (0 bytes), parser của Fastify ném ngoại lệ `FST_ERR_CTP_EMPTY_JSON_BODY` (HTTP 400 Bad Request).
  - Tương tự, tại `apps/admin/app/settings/org/page.tsx`, request duyệt giáo viên (`approve`) gửi `Content-Type: application/json` không body, và request từ chối (`reject`) thiếu body `reason`.

### 1.2. Lỗi "Mã TOTP đã được sử dụng (mã cũ)" trong kiểm thử E2E song song
- **Hiện tượng**: Khi chạy kiểm thử E2E trên staging CI với nhiều project trình duyệt (Chromium và Mobile Safari) chạy song song, cả hai trình duyệt cùng dùng chung tài khoản nhân sự được seed (`publisher@jlpt.local`). Khi cả hai thực hiện đăng nhập và xác thực TOTP trong cùng khung thời gian 30 giây, một trình duyệt gửi mã trước được chấp thuận, trình duyệt gửi mã sau bị API từ chối với lỗi:
  `Mã TOTP đã được sử dụng (mã cũ). Vui lòng đợi mã mới.`
- **Nguyên nhân gốc**:
  - API bảo mật tuân thủ nghiêm ngặt chuẩn RFC 6238 và lưu lại `lastUsedStep`/`lastUsedCode` để chống tấn công phát lại (anti-replay).
  - Cơ chế cũ trong `integration.spec.ts` dùng biến trong bộ nhớ Node.js (`sharedUsedTotpStepMap`). Do Playwright chạy các project trên các tiến trình con (child process) độc lập, bộ nhớ không được chia sẻ giữa Chromium và Mobile Safari.
  - Khi gặp lỗi, nếu hai tiến trình cùng ngủ 30 giây và thức dậy cùng một mili-giây, chúng tiếp tục xung đột ở bước thời gian kế tiếp.

## 2. Giải pháp kỹ thuật

### 2.1. Chuẩn hóa thiết lập Content-Type trong AdminApiClient và trang quản trị
- Trong `AdminApiClient.request`:
  - Chỉ thiết lập `'Content-Type': 'application/json'` khi `options.body !== undefined` và không phải `FormData`.
  - Nếu `options.body` là `undefined`, không gửi header `Content-Type`. Fastify sẽ tiếp nhận request POST không có body mà không kích hoạt JSON body parser, giúp các endpoint như `/publish`, `/validate` hoạt động chính xác.
- Trong `apps/admin/app/settings/org/page.tsx`:
  - Xóa bỏ `Content-Type: application/json` khi gửi POST `approve` (không có body).
  - Bổ sung `body: JSON.stringify({ reason: 'Rejected by admin' })` khi gửi POST `reject` để đáp ứng DTO yêu cầu của backend.

### 2.2. Cơ chế đồng bộ hóa TOTP đa tiến trình và retry chuyển khung thời gian
- Trong `tests/playwright/fixtures/staff-auth.fixture.ts`:
  - Triển khai `getSynchronizedTotp(secret, accountKey)` phối hợp thông qua tệp đồng bộ `/tmp/jlpt-totp-step-${sanitizeKey}.txt`. Khi một tiến trình sử dụng mã cho bước thời gian `S`, tiến trình khác chạy song song sẽ phát hiện bước `S` đã được dùng và chủ động chờ sang bước kế tiếp `S + 1` kèm độ trễ ngẫu nhiên (jitter từ 1000ms đến 2500ms).
  - Triển khai `handleTotpVerification(page, secret, accountKey, maxAttempts)` với vòng lặp thử lại tối đa 4 lần: khi phát hiện lỗi từ chối mã (đặc biệt là `"Mã TOTP đã được sử dụng"`), tiến trình ghi nhận bước đã dùng, chờ sang khung 30 giây kế tiếp, tạo mã mới và gửi lại tự động.
  - Tuyệt đối không can thiệp tắt kiểm tra chống phát lại mã ở tầng API/AuthService.
- Cập nhật các helper `loginAsAdmin`, `loginAsStaff`, và test đăng nhập nhân sự trong `tests/playwright/integration.spec.ts` để sử dụng bộ hàm đồng bộ hóa này.
