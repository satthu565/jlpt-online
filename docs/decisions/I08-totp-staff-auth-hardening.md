# Quyết định kiến trúc I08: API xác thực hai bước (TOTP) cho nhân sự & Hardening TotpGuard

## Bối cảnh và Yêu cầu

Trong hệ thống JLPT Online, các tài khoản nhân sự (`admin`, `editor`, `reviewer`, `billing_admin`, `moderator`) nắm giữ quyền hạn quản trị nội dung thi, đề thi chính thức, câu hỏi, điểm thi và nhật ký kiểm toán.
Nhiệm vụ **I08** yêu cầu:
1. Triển khai API đăng ký TOTP (RFC 6238): sinh secret Base32 mã hóa riêng theo từng người dùng, trả `otpauth://` URI, mã QR định dạng SVG chuẩn không phụ thuộc thư viện ngoài, và danh sách 8 mã khôi phục dùng một lần.
2. Xác nhận đăng ký bằng mã 6 số (kích hoạt 2FA, đánh dấu session `twoFactorVerified`).
3. Thử thách TOTP sau khi đăng nhập mật khẩu: session chỉ được cấp cờ `twoFactorVerified: true` khi mã TOTP hoặc mã khôi phục hợp lệ.
4. Lưu trữ mã khôi phục dạng băm (SHA-256), tiêu thụ một lần duy nhất, chống sử dụng lại.
5. Bảo vệ chống tấn công dò mã (khóa tài khoản 15 phút sau 5 lần nhập sai liên tiếp) và chống phát lại mã cũ (Anti-Replay).
6. Tắt / đặt lại 2FA có xác thực và ghi nhận nhật ký kiểm toán đầy đủ vào `operator_actions`.
7. Loại bỏ hoàn toàn secret mặc định viết cứng (`JBSWY3DPEHPK3PXP` và `TOTP_TEST_SECRET`) trong code chạy thật của `TotpGuard`; kiểm tra theo secret giải mã của chính user và trạng thái `twoFactorVerified` của phiên.
8. Seed staging/demo có tài khoản nhân sự với secret biết trước cho các bài kiểm thử E2E và diễn tập.

---

## Chi tiết Triển khai và Quyết định Thiết kế

### 1. Thuật toán TOTP & Mã hóa Secret (RFC 6238 & AES-256-GCM)
- **Chuẩn TOTP RFC 6238**: Chu kỳ thời gian 30 giây, độ dài 6 chữ số thập phân, thuật toán HMAC-SHA1 với cửa sổ dung sai thời gian `window = 1` (khớp với ứng dụng Authenticator chuẩn như Google Authenticator, 1Password, Microsoft Authenticator).
- **Mã hóa khóa bí mật theo người dùng (Per-User Encryption)**:
  - Khóa bí mật Base32 160-bit (20 bytes) được sinh ngẫu nhiên bằng `crypto.randomBytes`.
  - Secret **không bao giờ** lưu trữ dạng văn bản thuần trong cơ sở dữ liệu.
  - Sử dụng thuật toán đối xứng **AES-256-GCM** với IV ngẫu nhiên 12-byte và Authentication Tag 16-byte.
  - Khóa dẫn xuất qua **HMAC-SHA256** kết hợp giữa master secret (`AUTH_SECRET` / `ENCRYPTION_KEY`) của hệ thống và tiền tố cô lập ngữ cảnh `totp-encryption-key:${userId}` của chính nhân sự làm dữ liệu dẫn xuất, đảm bảo bí mật bị cô lập hoàn toàn giữa các người dùng ngay cả khi DB bị rò rỉ.
  - Định dạng chuỗi mã hóa lưu trong DB: `iv:authTag:ciphertext` (hex).

### 2. Bộ sinh mã QR SVG thuần TypeScript (Zero-Dependency QR Code Generator)
- Tuân thủ nghiêm ngặt quy định không cài thư viện ngoài không kiểm duyệt: Xây dựng module `apps/api/src/common/utils/qrcode.ts` tạo ma trận mã QR (ISO/IEC 18004, Mode Byte, Error Correction Level L) và kết xuất trực tiếp sang chuỗi SVG vector độc lập.

### 3. Mã khôi phục dùng một lần (Single-Use Recovery Codes)
- Sinh 8 mã ngẫu nhiên 8 ký tự định dạng `XXXX-XXXX` từ bảng chữ cái Base32 không gây nhầm lẫn (bỏ 0, 1, I, O).
- Hệ thống chỉ lưu trữ giá trị băm **SHA-256** của mã khôi phục đã chuẩn hóa.
- Khi nhân sự sử dụng mã khôi phục để vượt qua thử thách 2FA, mã được xác thực qua so sánh thời gian hằng số `crypto.timingSafeEqual` và bị loại bỏ ngay lập tức khỏi mảng `hashedRecoveryCodes` trong cơ sở dữ liệu.
- Mọi lần dùng mã khôi phục được ghi vết nhật ký kiểm toán với hành động `TOTP_RECOVERY_CODE_USED`.

### 4. Cơ chế chống dò mã (Brute-Force Lockout) & Chống phát lại (Anti-Replay)
- **Khóa tài khoản (Account Lockout)**:
  - Biến đếm `failedAttempts` theo dõi số lần nhập sai liên tiếp.
  - Đạt 5 lần sai: Đặt `lockedUntil` = hiện tại + 15 phút.
  - Trong thời gian khóa, mọi yêu cầu thử thách TOTP đều bị từ chối ngay với mã lỗi `ACCOUNT_LOCKED` (HTTP 403).
  - Khi xác thực thành công, biến đếm `failedAttempts` và `lockedUntil` được đặt lại về 0/null.
- **Chống phát lại (Anti-Replay)**:
  - Lưu trữ `lastUsedCode` và `lastUsedStep` (bước thời gian của mã TOTP đã xác thực thành công).
  - Nếu gửi lại cùng một mã vừa dùng (`lastUsedCode === cleanCode`), hoặc gửi mã thuộc bước thời gian cũ hơn/bằng bước đã dùng (`verification.step <= lastUsedStep`), yêu cầu bị từ chối với lỗi "Mã TOTP đã được sử dụng (mã cũ)".

### 5. Tắt / Đặt lại 2FA có kiểm toán
- Nhân sự tự tắt 2FA của chính mình bắt buộc phải cung cấp mã TOTP 6 số hợp lệ hoặc mật khẩu hiện tại (`confirmation.code` hoặc `confirmation.password`). Thiếu cả hai trường sẽ bị từ chối với mã lỗi `CONFIRMATION_REQUIRED` (HTTP 400).
- Khi xác thực qua `confirmation.code`, nếu `caller.totpSecret` chưa có sẵn trong context, hệ thống tự động giải mã secret từ cơ sở dữ liệu; nếu mã không khớp hoặc secret không hợp lệ sẽ ném `ForbiddenException` (HTTP 403).
- Quản trị viên (`admin`) có thể hỗ trợ đặt lại 2FA cho nhân sự khác mà không cần mã TOTP của user đó.
- Mọi hành vi tắt 2FA đều được ghi vết vào bảng `operator_actions` với hành động `TOTP_DISABLED`.

### 6. Thắt chặt TotpGuard (Hardening) & Loại bỏ hoàn toàn Secret mặc định
- `TotpGuard` đã được tái cấu trúc:
  - **Loại bỏ toàn bộ fallback secret** viết cứng (`JBSWY3DPEHPK3PXP` hay `TOTP_TEST_SECRET`).
  - Kiểm tra dựa trên khóa bí mật đã giải mã của chính tài khoản yêu cầu (`request.user.totpSecret`). Nếu tài khoản chưa thiết lập TOTP, từ chối với mã lỗi `TWO_FACTOR_REQUIRED`.
  - Trên các route `/api/v1/admin/*`, áp dụng bắt buộc khi `isEnforced` (staging/production) hoặc khi nhân sự đã kích hoạt 2FA (`request.user.twoFactorEnabled === true`). Phiên làm việc phải có cờ `twoFactorVerified: true` hoặc header `x-totp-code` hợp lệ theo secret của chính nhân sự đó.
  - Xử lý lỗi theo nguyên tắc **Fail-Closed**: Bất kỳ lỗi truy vấn DB hay giải mã secret đều ném ngoại lệ từ chối truy cập, không bao giờ cho phép bỏ qua xác thực.

### 7. Dữ liệu mồi Staging / Demo phục vụ E2E & Bảo vệ Production
- Hàm `ensureStaffAccountsSeeded()` trong `AuthService` và bypass session demo được bảo vệ nghiêm ngặt bằng điều kiện `process.env.NODE_ENV !== 'production'`. Tuyệt đối không chèn tài khoản demo/seed với mật khẩu hoặc secret mặc định vào production.
- Trong môi trường dev/staging, `ensureStaffAccountsSeeded()` và `runDemoSeed` trong `demo-seed.ts` chuẩn bị sẵn các tài khoản nhân sự mẫu (`publisher@jlpt.local`, `editor@jlpt.local`, `reviewer@jlpt.local`, `billing.admin@jlpt.local`) với secret TOTP chuẩn `JBSWY3DPEHPK3PXP` và mật khẩu `Admin123456!`.
- Các bài kiểm thử E2E trên staging sử dụng fixture TOTP RFC 6238 để xác thực hoàn toàn thông suốt mà không vi phạm nguyên tắc bảo mật.
