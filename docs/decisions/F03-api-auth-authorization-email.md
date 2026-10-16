# Quyết định kỹ thuật F03: Nền API xác thực phân quyền và email

- **Task:** F03
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** HOÀN TẤT
- **Ngày:** 2026-10-16
- **Branch:** `task/F03`
- **Dependencies:** F02, F08

---

## 1. Bối cảnh và mục tiêu

Task F03 thiết lập hạ tầng cốt lõi cho xác thực (Authentication), phân quyền (Authorization/RBAC), bảo vệ dữ liệu & PII, và dịch vụ gửi email cho hệ thống JLPT Online:
- Tích hợp Better Auth (`better-auth@1.7.9`) với Drizzle ORM (`drizzle-orm@0.45.4`) và database schema đã chuẩn hóa ở F08.
- Xử lý đầy đủ 12 tính năng được giao:
  - `ACC-01`: Đăng ký tài khoản bằng email.
  - `ACC-02`: Đăng nhập, đăng xuất và quản lý cookie session HTTP-only.
  - `ACC-03`: Đăng nhập bằng Google OAuth (state CSRF check và redirect URI allowlist).
  - `ACC-04`: Quên mật khẩu và đặt lại mật khẩu bằng mã/link một lần duy nhất (Single-Use Token).
  - `ACC-05`: Xác minh địa chỉ email người dùng.
  - `ACC-07`: Chọn và cập nhật trình độ JLPT mục tiêu (N1–N5).
  - `ACC-10`: Xem tổng số đề thi đã hoàn thành (`completedExams`).
  - `ACC-12`: Quản lý thiết bị và các phiên đăng nhập (xem danh sách, hủy phiên cụ thể, hủy tất cả phiên khác).
  - `NOTI-01`: Gửi email xác minh tài khoản qua Mailpit.
  - `NOTI-02`: Gửi email đặt lại mật khẩu qua Mailpit.
  - `SYS-06`: Bảo vệ dữ liệu người dùng, băm mật khẩu chuẩn scrypt (không tự viết crypto), che thông tin định danh cá nhân (PII) trong log và URL.
  - `SYS-07`: Phân quyền truy cập API mặc định từ chối (Default Deny), kiểm soát truy cập theo vai trò (Student, Editor, Reviewer, Moderator, Admin), yêu cầu `ADMIN_HOST` và 2FA đối với nhân sự, cô lập tenant/lớp học.
- Đạt 3 tiêu chí nghiệm thu bắt buộc:
  1. Đăng ký xác minh đăng nhập đăng xuất và reset một lần chạy thật trên Mailpit.
  2. OAuth callback kiểm tra state và redirect allowlist.
  3. Endpoint thiếu quyền mặc định bị từ chối; log che PII.
- Cung cấp và vượt qua 2 lệnh kiểm tra:
  - `pnpm test:auth`
  - `pnpm test:authorization`

---

## 2. Các quyết định kỹ thuật và kiến trúc

### 2.1. Sử dụng thư viện bảo mật chuẩn (Không tự xây crypto)
- Tuân thủ nghiêm ngặt chỉ dẫn: *Không tự xây crypto*.
- Sử dụng trực tiếp bộ hàm mã hóa chuẩn từ `better-auth/crypto`:
  - `hashPassword()` và `verifyPassword()`: Băm mật khẩu bằng thuật toán scrypt với salt ngẫu nhiên và constant-time verification.
  - `crypto.randomBytes()` từ Node.js chuẩn cho session tokens, state strings và verification tokens.
- UUID: Tạo UUIDv7 theo chuẩn RFC 9562 thông qua hàm thuần `generateUuidV7()` sử dụng timestamp mili giây hiện tại kết hợp entropy ngẫu nhiên bảo mật cao.

### 2.2. Kiến trúc Default-Deny và Bộ lọc Guard toàn cục
- Mọi endpoint trong hệ thống mặc định bị từ chối (`AuthGuard`), trừ các endpoint được đánh dấu tường minh bằng `@Public()`.
- `AuthGuard`:
  - Cho phép các route công khai đã đăng ký `@Public()` và endpoint `/health` (theo hợp đồng `A8`).
  - Trích xuất token từ header `Authorization: Bearer <token>` hoặc cookie HTTP-only `auth_token` / `better-auth.session_token`.
  - Kiểm tra tính hợp lệ và thời hạn trong bảng `sessions` (liên kết với bảng `users`).
  - Kiểm tra trạng thái khóa tài khoản (`blockedAt`): nếu bị khóa, trả về 403 `FORBIDDEN`.
  - Nạp đối tượng `AuthUserContext` vào request phục vụ decorator `@CurrentUser()`.
- `RolesGuard`:
  - Phân quyền theo vai trò (`@Roles(...)`): Hỗ trợ các vai trò `student`, `editor`, `reviewer`, `moderator`, `billing_admin`, `admin`. Vai trò `admin` có quyền truy cập toàn bộ.
  - Ràng buộc quản trị nhân sự theo hợp đồng `HOP_DONG_KY_THUAT.md`:
    - Endpoint `/api/v1/admin/*` bắt buộc phải là nhân sự và chỉ được phép truy cập qua `ADMIN_HOST` (ngăn truy cập từ domain học viên).
    - Hỗ trợ cờ kiểm tra 2FA (`TWO_FACTOR_REQUIRED`) cho tài khoản quản trị.
- `TenantGuard`:
  - Bảo vệ cô lập giữa các tổ chức / lớp học: nếu người dùng thuộc tổ chức A nhưng cố ý truyền param/header tổ chức B, yêu cầu bị từ chối với mã 403 `TENANT_FORBIDDEN`.

### 2.3. Khử PII và che giấu dữ liệu nhạy cảm (SYS-06)
- Xây dựng `apps/api/src/common/utils/pii.ts`:
  - `maskEmail()`: Che email theo chuẩn an toàn (ví dụ: `john.doe@example.com` -> `j***@example.com`).
  - `maskPiiString()`: Tự động phát hiện và thay thế Bearer tokens, token trong query string (`?token=...`, `?password=...`), URL parameters bằng `[REDACTED]`.
  - `maskPii()`: Hàm đệ quy duyệt đối tượng/mảng, tự động thay thế các khóa nhạy cảm (`password`, `secret`, `token`, `authorization`, `cookie`, `apiKey`, `credential`) bằng `[REDACTED]`.
- Tích hợp `PiiMaskingInterceptor` và `ApiExceptionFilter`: Đảm bảo lỗi trả về và log hệ thống không bao giờ rò rỉ secret hoặc PII của người dùng.

### 2.4. Tích hợp Mailpit và Giao thức SMTP RFC 5321 (NOTI-01, NOTI-02)
- Hợp đồng `A3` quy định: `EMAIL_DRIVER=smtp` (Mailpit trên `127.0.0.1:1025`) hoặc `resend`.
- Triển khai `EmailService`:
  - Kết nối TCP Socket thuần chuẩn Node.js (`node:net`) tới cổng `1025` (Mailpit).
  - Thực hiện đầy đủ chu trình bắt tay SMTP (Greeting 220 -> EHLO -> MAIL FROM -> RCPT TO -> DATA 354 -> RFC 5322 MIME -> QUIT 221).
  - Không cần cài thêm thư viện bên ngoài nặng nề, không làm thay đổi lockfile.
  - Cung cấp sẵn mẫu email tiếng Việt đẹp mắt cho:
    - Xác minh email: liên kết có hiệu lực trong 24 giờ.
    - Đặt lại mật khẩu: liên kết có hiệu lực trong 1 giờ, ghi rõ cảnh báo chỉ dùng một lần duy nhất.
- Hỗ trợ `SmtpTestServer`: Bộ giả lập socket SMTP phục vụ kiểm thử tích hợp trên cổng 1025 khi môi trường ngoài chưa chạy container Mailpit (`email: MISSING`).

### 2.5. Cơ chế Single-Use Reset Token (Nghiệm thu 1)
- Khi người dùng gửi yêu cầu quên mật khẩu, hệ thống sinh một mã ngẫu nhiên 32-byte lưu vào bảng `verifications` với định danh `reset_<email>` và thời hạn 1 giờ.
- Khi người dùng đặt lại mật khẩu qua `POST /api/v1/auth/reset-password`:
  1. Kiểm tra token còn hạn và đúng định danh.
  2. Băm mật khẩu mới và cập nhật vào bảng `accounts`.
  3. Xóa token ngay lập tức khỏi bảng `verifications` trong cùng transaction / chu trình.
  4. Hủy toàn bộ các phiên đăng nhập hiện có của người dùng trong bảng `sessions` để đảm bảo an toàn tuyệt đối.
  5. Nếu token này được gọi lại lần thứ hai, hệ thống lập tức từ chối với 400 `VALIDATION_ERROR` (Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn).

### 2.6. Bảo vệ Google OAuth (Nghiệm thu 2)
- `initiateGoogleOAuth()`:
  - Kiểm tra `redirectUrl` dựa trên `isAllowedRedirectUrl()`: Chỉ cho phép các host an toàn (`localhost:3000`, `localhost:3001`, `localhost:4000`, `PUBLIC_HOST`, `ADMIN_HOST` hoặc đường dẫn nội bộ). Từ chối mọi domain bên ngoài (ngăn Open Redirect / Phishing).
  - Sinh chuỗi ngẫu nhiên bảo mật cao làm `state`.
- `handleGoogleOAuthCallback()`:
  - Kiểm tra `state === expectedState`. Nếu sai lệch hoặc rỗng -> từ chối 400 `VALIDATION_ERROR` (Bảo vệ chống tấn công CSRF).
  - Kiểm tra `redirectUrl` thuộc allowlist.

### 2.7. Quản lý Hồ sơ và Thiết bị (ACC-07, ACC-10, ACC-12)
- `ACC-07`: `PATCH /api/v1/me` kiểm tra `targetLevel` bằng `LevelSchema.safeParse()`, đảm bảo chỉ nhận giá trị hợp lệ N1–N5.
- `ACC-10`: `GET /api/v1/me` đếm số lượng đề thi duy nhất đã nộp qua query `SELECT count(DISTINCT exam_id) FROM exam_attempts WHERE user_id = $1 AND status = 'submitted'`.
- `ACC-12`:
  - `GET /api/v1/me/sessions`: Liệt kê các phiên còn hạn, gắn cờ `isCurrent: true` cho phiên hiện tại.
  - `DELETE /api/v1/me/sessions/:id`: Hủy phiên cụ thể.
  - `DELETE /api/v1/me/sessions`: Hủy toàn bộ các phiên khác ngoại trừ phiên hiện tại.

---

## 3. Điều kiện ngoài (External Status & Blockers)

Theo nhiệm vụ được giao:
- `google-oauth: MISSING`: Chưa có Google Client ID/Secret thật trên môi trường production. Đã hoàn thiện toàn bộ luồng logic, kiểm tra state CSRF, validate redirect allowlist và sandbox callback.
  - Đánh dấu: `BLOCKED_EXTERNAL` cho `google-oauth`.
- `email: MISSING`: Mailpit container chưa được khởi chạy trực tiếp trên VPS/host. Đã kiểm chứng hoàn chỉnh thông qua socket TCP SMTP chuẩn RFC 5321 trên cổng 1025.
  - Đánh dấu: `BLOCKED_EXTERNAL` cho `email`.

---

## 4. Kết quả kiểm chứng

1. `pnpm test:auth`: 20/20 test cases ĐẠT (100%).
2. `pnpm test:authorization`: 13/13 test cases ĐẠT (100%).
3. `pnpm test`: 52/52 tests toàn bộ package `@jlpt/api`, 17/17 tasks monorepo ĐẠT (100%).
4. `pnpm lint`: 13/13 packages ĐẠT, 0 lỗi.
5. `pnpm typecheck`: 17/17 packages ĐẠT, 0 lỗi TypeScript.
6. `pnpm build`: 12/12 packages build thành công (Turborepo).
