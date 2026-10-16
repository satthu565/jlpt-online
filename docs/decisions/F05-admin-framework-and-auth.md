# Quyết định kỹ thuật F05: Khung admin và đăng nhập nhân sự

- **Task:** F05
- **Worker:** W4 (Quản trị báo cáo và thương mại)
- **Trạng thái:** HOÀN TẤT (REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/F05`
- **Dependencies:** F02, F03

---

## 1. Bối cảnh và mục tiêu

Task F05 xây dựng khung ứng dụng quản trị (`apps/admin`) và hệ thống đăng nhập, phân quyền, xác thực hai bước (TOTP 2FA) dành riêng cho nhân sự vận hành hệ thống JLPT Online:
- Hỗ trợ các vai trò nhân sự chuẩn: `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`.
- Phân tách và hiển thị menu điều hướng chính xác theo vai trò: biên tập viên (Editor), người kiểm duyệt (Reviewer) và quản trị viên (Admin) chỉ thấy các mục thuộc thẩm quyền của mình.
- Bắt buộc kích hoạt và xác thực 2FA (TOTP RFC 6238) cho toàn bộ nhân sự ở cả tầng giao diện (UI) và tầng máy chủ (Server API RolesGuard khi tích hợp N02).
- Cung cấp bộ mã khôi phục dự phòng một lần (Single-Use Recovery Codes) được băm bảo mật bằng SHA-256.
- Ngăn chặn triệt để hành vi gọi trực tiếp API hoặc điều hướng URL nhằm vượt qua chốt chặn bảo vệ UI Guard.
- Hỗ trợ đa ngôn ngữ đầy đủ với 3 thứ tiếng: Tiếng Việt (`vi`), Tiếng Nhật chuẩn hóa Unicode NFC (`ja`), và Tiếng Anh (`en`).

---

## 2. Các quyết định kỹ thuật và kiến trúc

### 2.1. Phân quyền và điều hướng theo vai trò (Acceptance 1: Editor reviewer admin thấy đúng menu)
- Thiết kế ma trận điều hướng tại `apps/admin/lib/navigation.ts`:
  - **Biên tập viên (`editor`)**:
    - Nhìn thấy: Bảng điều khiển (`/`), Ngân hàng câu hỏi (`/questions`), Bản thiết kế đề (`/blueprints`), Thư viện phương tiện (`/media`), Gói nhập đề (`/imports`), Quản lý đề thi (`/exams`).
    - Hoàn toàn không nhìn thấy và không thể truy cập: Hàng đợi kiểm duyệt (`/reviews`), Duyệt lời giải, Báo cáo nội dung, Thương mại & Thanh toán, Nhật ký hệ thống (`/audit-logs`), Quản lý người dùng (`/users`), Cài đặt.
  - **Người duyệt đề (`reviewer`)**:
    - Nhìn thấy: Bảng điều khiển (`/`), Hàng đợi kiểm duyệt (`/reviews`), Duyệt lời giải (`/reviews/explanations`), Báo cáo nội dung (`/reports/content`), Quản lý đề thi (`/exams`).
    - Hoàn toàn không nhìn thấy và không thể truy cập: Soạn thảo câu hỏi, Bản thiết kế, Gói nhập đề, Thương mại, Nhật ký hệ thống, Quản lý người dùng. Tuân thủ nguyên tắc 4 mắt (two-person rule: người nhập khác người duyệt).
  - **Quản trị viên (`admin`)**:
    - Nhìn thấy toàn bộ cây thư mục và tất cả các phân hệ quản trị trên portal.
  - **Học viên (`student`) hoặc người chưa đăng nhập**:
    - Menu điều hướng trả về mảng rỗng `[]`, mọi nỗ lực truy cập vào các đường dẫn admin đều bị chặn ngay tại UI Guard.

### 2.2. Cơ chế TOTP RFC 6238 và Mã khôi phục một lần (Acceptance 2: TOTP bắt buộc ở cả server và UI)
- Xây dựng module thuần TypeScript `apps/admin/lib/totp.ts` không phụ thuộc thư viện ngoài:
  - Mã hóa / giải mã Base32 chuẩn RFC 4648, tạo khóa bí mật 20-byte (160 bits entropy).
  - Thuật toán sinh mã HOTP/TOTP HMAC-SHA1 theo chuẩn RFC 4226 / RFC 6238: chu kỳ 30 giây, 6 chữ số, cho phép dung sai trễ đồng hồ ±1 bước (±30s window). Đã kiểm chứng khớp chính xác tuyệt đối với bộ test vector mẫu trong Phụ lục B của RFC 6238.
  - Sinh đường dẫn `otpauth://totp/...` chuẩn cho Google Authenticator, 1Password, Authy.
  - Bộ sinh mã QR Code ma trận và SVG trực tiếp (`apps/admin/lib/qrcode.ts`), không cần thư viện npm cồng kềnh, hiển thị hình ảnh quét mã trực quan trên trình duyệt.
  - Sinh 8 mã khôi phục dự phòng định dạng `XXXX-XXXX`, lưu trữ dưới dạng băm SHA-256.
  - Cơ chế **Single-Use**: Khi mã khôi phục được dùng thành công để đăng nhập, mã đó bị hủy ngay lập tức khỏi danh sách mã còn lại; nỗ lực tái sử dụng mã cũ sẽ bị từ chối.
- Luồng đăng nhập nhân sự:
  - Lần đầu đăng nhập (`twoFactorEnabled === false`): Chuyển trạng thái sang `setup_required`, cưỡng bức chuyển hướng tới `/setup-2fa` để quét mã QR, lưu mã khôi phục và xác nhận mã 6 số trước khi được cấp quyền sử dụng.
  - Đã kích hoạt 2FA (`twoFactorEnabled === true`): Chuyển trạng thái sang `challenge_required`, yêu cầu nhập mã 6 số từ app hoặc mã khôi phục dự phòng.
  - Tích hợp phía máy chủ: Biến môi trường `ENFORCE_STAFF_2FA=true` kích hoạt ràng buộc trong RolesGuard, trả về HTTP 403 với mã lỗi `TWO_FACTOR_REQUIRED` nếu nhân sự chưa hoàn tất 2FA.

### 2.3. Đa tầng bảo vệ chống vượt rào UI Guard (Acceptance 3: Thử gọi trực tiếp API không vượt được UI guard)
- Hệ thống áp dụng mô hình phòng thủ theo chiều sâu (Defense-in-Depth) với 3 tầng:
  1. **Tầng 1 - Client UI Route Guard (`AdminGuard`)**:
     - Bọc toàn bộ các trang nội bộ admin.
     - Kiểm tra trạng thái đăng nhập, nếu thiếu chuyển hướng về `/login`.
     - Kiểm tra trạng thái 2FA: nếu đang chờ thiết lập thì chuyển hướng về `/setup-2fa`, nếu đang chờ thử thách thì chuyển về `/verify-2fa`.
     - Kiểm tra quyền hạn theo vai trò: nếu người dùng gõ trực tiếp URL không thuộc thẩm quyền (ví dụ Editor gõ `/audit-logs`), hiển thị giao diện từ chối truy cập (403 Forbidden) kèm giải thích chi tiết vai trò yêu cầu.
  2. **Tầng 2 - Lớp API Client Admin (`AdminApiClient`)**:
     - Mọi phương thức gọi dữ liệu (`listQuestions`, `listAuditLogs`, `publishExam`, ...) đều phải qua hàm `enforceGuard()`.
     - Kiểm tra phiên làm việc và trạng thái `twoFactorStatus === 'verified'`. Nếu gọi trực tiếp khi chưa đăng nhập hoặc chưa qua 2FA, ném ngoại lệ `AdminClientGuardError` với mã `UNAUTHENTICATED` hoặc `TWO_FACTOR_REQUIRED`.
     - Kiểm tra vai trò người gọi: Editor gọi API audit logs hoặc Reviewer gọi API tạo câu hỏi sẽ bị chặn đứng ngay lập tức với mã `FORBIDDEN`.
  3. **Tầng 3 - Tầng bảo vệ Server API Guard (Host & RolesGuard)**:
     - Kể cả khi kẻ tấn công bỏ qua trình duyệt và dùng curl/fetch gọi trực tiếp vào API:
       - Thiếu token: HTTP 401 `UNAUTHENTICATED`.
       - Header Host khác `ADMIN_HOST`: HTTP 403 `FORBIDDEN`.
       - Tài khoản thiếu 2FA: HTTP 403 `TWO_FACTOR_REQUIRED`.
       - Sai vai trò: HTTP 403 `FORBIDDEN`.

### 2.4. Đa ngôn ngữ và Chuẩn hóa Unicode tiếng Nhật (NFC)
- Thư mục `apps/admin/messages/`:
  - `vi.json`: Bản ngữ Tiếng Việt đầy đủ.
  - `ja.json`: Bản ngữ Tiếng Nhật, toàn bộ chuỗi được chuẩn hóa Unicode dạng NFC (`str === str.normalize('NFC')`).
  - `en.json`: Bản ngữ Tiếng Anh.
- Bộ từ điển đảm bảo đối xứng 100% tất cả các khóa dịch thuật và hỗ trợ fallback an toàn về Tiếng Việt khi có tham số lạ.

---

## 3. Bằng chứng nghiệm thu và Kiểm thử

Đã tạo và thực thi thành công toàn bộ các lệnh kiểm tra theo hợp đồng:

```bash
# 1. Chạy toàn bộ test khung admin
pnpm test:admin
# Kết quả: 5 test files, 41 tests passed (Duration: 202ms)

# 2. Chạy test xác thực và UI guard
pnpm test:admin-auth
# Kết quả: 2 test files, 28 tests passed (Duration: 141ms)

# 3. Kiểm tra kiểu dữ liệu TypeScript
pnpm --filter @jlpt/admin typecheck
# Kết quả: 0 errors

# 4. Kiểm tra linter ESLint
pnpm --filter @jlpt/admin lint
# Kết quả: 0 errors, 0 warnings

# 5. Build hoàn tất ứng dụng Next.js Admin
pnpm --filter @jlpt/admin build
# Kết quả: 17 static & dynamic routes compiled successfully
```
