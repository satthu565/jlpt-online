# Quyết định kiến trúc I12: Phiên đăng nhập đọc được cookie và không mất đăng nhập khi tải lại trang

## Bối cảnh và Vấn đề

1. **Mất phiên đăng nhập của học viên trên Web khi tải lại hoặc chuyển trang:**
   - Khi đăng nhập bằng email (`POST /api/v1/auth/sign-in/email`), API thiết lập cookie HTTP-only `auth_token`.
   - Các route nghiệp vụ (`/me/*`) đọc cookie này bình thường.
   - Tuy nhiên, endpoint `GET /api/v1/auth/session` được đánh dấu `@Public()`. Trong triển khai trước đây của `AuthGuard`, khi một route có `@Public()`, guard trả về `true` ngay lập tức mà không trích xuất token từ request header hay cookie, dẫn tới `request.user` luôn là `undefined`.
   - Kết quả: Khi học viên tải lại trang hoặc chuyển sang trang mới (`/so-tay`, `/lop-hoc`), `AuthProvider` gọi `GET /api/v1/auth/session` và luôn nhận về `{ user: null, session: null }`. Giao diện Web tưởng rằng học viên đã đăng xuất và hiện cảnh báo yêu cầu đăng nhập.

2. **Mất phiên đăng nhập của nhân sự trên Admin Portal (sau I09):**
   - Sau khi hoàn thành đăng nhập nhân sự thật bằng mật khẩu và TOTP (task I09), token phiên được lưu trữ trong `localStorage`.
   - Khi nhân sự tải lại trang hoặc truy cập thẳng route quản trị (ví dụ `/users`), `AdminAuthProvider` gọi `GET /api/v1/auth/session` với header `Authorization: Bearer <token>`.
   - Vì lý do tương tự ở `AuthGuard`, server bỏ qua trích xuất token trên route `@Public()` và trả về `{ user: null, session: null }`.
   - Admin context thấy `user` trả về `null` nên lập tức xóa sạch `localStorage` và chuyển sang trạng thái hết hạn, hiển thị lỗi "Phiên làm việc đã hết hạn".

3. **Thiếu tính nhất quán trong trích xuất phiên:**
   - Các controller và guard rải rác tự phân tích header và cookie thủ công (ví dụ trong `exam.controller.ts`).
   - Đăng xuất (`POST /api/v1/auth/sign-out`) không được đánh dấu `@Public()`, dẫn tới nếu phiên đã hết hạn trên server, request đăng xuất bị chặn với lỗi `401 UNAUTHENTICATED` và không thể xóa cookie `auth_token` trên trình duyệt.

---

## Chi tiết Triển khai và Quyết định Thiết kế

### 1. Chuẩn hóa hàm trích xuất token dùng chung (`extractTokenFromRequest`)

Tạo và export hàm `extractTokenFromRequest(request)` trong `apps/api/src/common/guards/auth.guard.ts`:
- **Độ ưu tiên 1: Header `Authorization: Bearer <token>`**: Phân tích header `Authorization`, chuẩn hóa chữ hoa/thường, trích xuất token sau từ khóa `Bearer`.
- **Độ ưu tiên 2: Session Cookies**: Phân tích header `cookie`, hỗ trợ các cookie theo thứ tự ưu tiên:
  1. `auth_token` (cookie chuẩn của ứng dụng)
  2. `__Host-session` (cookie tiền tố bảo mật)
  3. `better-auth.session_token` (cookie chuẩn better-auth)
- Giải mã URL (`decodeURIComponent`), loại bỏ dấu ngoặc kép bọc quanh (nếu có) và khoảng trắng thừa.
- Thay thế các đoạn code phân tích chuỗi cookie thủ công trong `exam.controller.ts` và `auth.controller.ts` bằng hàm dùng chung này.

### 2. Cập nhật `AuthGuard` cho các Route `@Public()`

Trong `apps/api/src/common/guards/auth.guard.ts`:
- Trước khi bypass cho route `@Public()`, `AuthGuard` chủ động gọi `extractTokenFromRequest(request)`.
- Nếu có token:
  - Gọi `authService.getSession(token)` để tìm kiếm phiên hợp lệ.
  - Nếu phiên hợp lệ: Gán `request.user = sessionUser; return true;`. Nhờ vậy, `@CurrentUser()` trong controller luôn nhận được context người dùng đầy đủ kể cả trên các route `@Public()`.
  - Nếu token không hợp lệ hoặc đã hết hạn: Với route `@Public()`, guard không ném `UnauthorizedException` mà tiếp tục cho qua để controller trả về `{ user: null, session: null }` theo đúng hợp đồng. Đối với route yêu cầu đăng nhập thông thường, guard vẫn ném lỗi `401 UNAUTHENTICATED` như trước.
- Giữ vững quy tắc mặc định từ chối (default-deny) cho các route không công khai.

### 3. Cập nhật `AuthController.getSession` và `AuthController.signOut`

Trong `apps/api/src/modules/auth/auth.controller.ts`:
- **`GET /api/v1/auth/session`**:
  - Nhận `@CurrentUser() user`. Nếu chưa có (fail-safe), tự gọi `extractTokenFromRequest(req)` và `authService.getSession(token)`.
  - Trả về `{ user: { id, email, name, role, emailVerified, twoFactorEnabled }, session: { id, userId, twoFactorVerified } }` khi phiên hợp lệ.
  - Trả về `{ user: null, session: null }` với mã HTTP `200 OK` khi cookie/token sai, hết hạn hoặc không có.
- **`POST /api/v1/auth/sign-out`**:
  - Đánh dấu `@Public()`.
  - Nhận token từ `@CurrentUser()` hoặc cookie request. Nếu có phiên trong DB, gọi `authService.signOut(token)` để thu hồi.
  - Luôn gửi header `Set-Cookie: auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT` để xóa triệt để cookie trên trình duyệt client, bất kể trạng thái phiên cũ thế nào.

### 4. Bổ sung `credentials: 'include'` cho Admin Client và Context

Trong `apps/admin/lib/auth-context.tsx` và `apps/admin/lib/api-client.ts`:
- Bổ sung `credentials: 'include'` vào tất cả các lời gọi fetch (`/api/v1/auth/session`, `/api/v1/auth/sign-in/email`, `/api/v1/auth/sign-out`, `/api/v1/auth/totp/*`).
- Đảm bảo cookie phiên được trình duyệt lưu trữ và tự động gửi kèm đồng thời với header Bearer, giúp nhân sự không bị mất đăng nhập khi tải lại trang hay mở trực tiếp bất kỳ trang nào.

---

## Nghiệm thu và Tiêu chí Đạt chuẩn

1. **Test API (`pnpm test:auth`):**
   - `/auth/session` trả user đầy đủ khi chỉ gửi cookie `auth_token` hợp lệ.
   - `/auth/session` trả user đầy đủ khi gửi header `Authorization: Bearer <token>` hợp lệ.
   - `/auth/session` trả `{ user: null, session: null }` (HTTP 200) khi cookie sai định dạng hoặc phiên trong DB đã hết hạn.
   - `/auth/session` trả `{ user: null, session: null }` khi không gửi cookie hay header.
   - `POST /auth/sign-out` qua cookie thành công, vô hiệu hóa phiên trong DB và gửi `Set-Cookie` với `Max-Age=0`.

2. **E2E Học viên Web (`integration.spec.ts`):**
   - Học viên đăng nhập tại `/dang-nhap`.
   - Tải lại trang trên `/tai-khoan`: Vẫn ở trạng thái đã đăng nhập (không xuất hiện cảnh báo yêu cầu đăng nhập).
   - Chuyển sang `/so-tay` và `/lop-hoc`: Vẫn ở trạng thái đã đăng nhập, không có thông báo yêu cầu đăng nhập.
   - Đăng xuất và tải lại trang: Trở về trạng thái khách (guest state), thông báo yêu cầu đăng nhập hiển thị lại đúng chuẩn.

3. **E2E Nhân sự Admin (`integration.spec.ts`):**
   - Nhân sự đăng nhập bằng mật khẩu và mã TOTP vào Admin Portal.
   - Tải lại trang dashboard: Vẫn ở trạng thái đã đăng nhập, không có cảnh báo "Phiên làm việc đã hết hạn" hay unauthenticated alert.
   - Mở thẳng `/users`: Vẫn ở trạng thái đã đăng nhập, bảng quản lý người dùng hiển thị bình thường.
