# Quyết định kiến trúc I15: Quản trị phiên hết hạn và điều hướng về trang đăng nhập

## Bối cảnh và Vấn đề

1. **Phiên hết hạn trên máy chủ không được đồng bộ về trình duyệt (sau I03):**
   - Sau các thay đổi ở task I03, hàm kiểm tra phiên trong `apps/admin/lib/auth-context.tsx` thực hiện gọi `fetch('/api/v1/auth/session')` khi khởi động ứng dụng.
   - Khi phiên làm việc của nhân sự đã hết hạn trên máy chủ, hoặc người dùng đã đăng xuất ở tab/thiết bị khác, endpoint `GET /api/v1/auth/session` trả về HTTP 200 với payload `{ user: null, session: null }` (hoặc mã lỗi 401).
   - Tuy nhiên, nhánh xử lý `if (data.user && isStaffRole(data.user.role))` trong `AdminAuthProvider` chỉ cập nhật state khi có `data.user`, mà bỏ qua hoàn toàn trường hợp `data.user` là `null` hoặc không phải nhân sự.
   - Hậu quả: Dữ liệu phiên cũ trong `localStorage` (`jlpt_admin_auth_state_v1`) vẫn được giữ nguyên, giao diện người dùng vẫn hiển thị ở trạng thái đã đăng nhập (header, profile badge, các trang quản trị), trong khi tất cả các API nghiệp vụ gọi lên máy chủ đều bị từ chối với lỗi `401 UNAUTHENTICATED`.

2. **Thiếu cơ chế xử lý 401 tập trung khi thao tác trên giao diện:**
   - Khi nhân sự đang thao tác trên giao diện mà phiên bị hết hạn hoặc bị hủy ở nơi khác, các API trả về 401 nhưng client không tự động xóa phiên và đưa người dùng về trang đăng nhập `/login` kèm thông báo phù hợp.

3. **Móc test giả và context mặc định vi phạm nguyên tắc kiểm thử giao diện thật:**
   - Trong `auth-context.tsx` tồn tại móc test `window.__setAdminLocale` gắn vào đối tượng toàn cục `window`.
   - Hàm `useAdminAuth` fallback về đối tượng mẫu `DEFAULT_AUTH_CONTEXT` khi nằm ngoài `AdminAuthProvider`, che giấu lỗi thiếu context và không báo lỗi rõ ràng.

---

## Chi tiết Triển khai và Quyết định Thiết kế

### 1. Đồng bộ và xóa phiên khi `GET /api/v1/auth/session` trả `user = null` hoặc `401`

Trong `apps/admin/lib/auth-context.tsx`:
- Bổ sung hàm `handleSessionExpired(customMessage?: string)`:
  - Gọi `saveToStorage(null, null)` để xóa sạch thông tin người dùng và token khỏi React state cũng như `localStorage` (`jlpt_admin_auth_state_v1`).
  - Xóa các mã thiết lập 2FA tạm thời (`pendingSetupSecret`, `pendingRecoveryCodes`).
  - Đặt thông báo lỗi `setError(message)` với nội dung lấy từ từ điển đa ngữ `t('auth.unauthenticated', locale)` ("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.").
  - Lưu thông báo vào `sessionStorage` (`jlpt_admin_auth_notice`) để truyền sang trang `/login`.
  - Nếu đường dẫn hiện tại không phải `/login`, tự động chuyển hướng về `/login?expired=1`.
- Trong `useEffect` khởi động khi kiểm tra `GET /api/v1/auth/session`:
  - Nếu `res.ok` và `data.user && isStaffRole(data.user.role)`: Giữ phiên và cập nhật thông tin nhân sự mới nhất từ server.
  - Nếu `res.ok` nhưng `!data.user` (phiên hết hạn trên server) hoặc vai trò không hợp lệ: Lập tức gọi `handleSessionExpired()`.
  - Nếu `res.status === 401`: Gọi `handleSessionExpired()`.

### 2. Bắt lỗi 401 tập trung trên toàn bộ thao tác giao diện và đồng bộ đa tab

- **Interceptor `window.fetch`:**
  - Bọc `window.fetch` trong `AdminAuthProvider` khi chạy trên trình duyệt.
  - Tự động phát hiện phản hồi HTTP `401 UNAUTHENTICATED` trên các endpoint nghiệp vụ (ngoại trừ các endpoint xác thực thông tin đăng nhập như `/api/v1/auth/sign-in`, `/api/v1/auth/totp/challenge`, `/api/v1/auth/totp/recovery`).
  - Khi phát hiện 401 trong quá trình nhân sự thao tác (bấm nút tải dữ liệu, chuyển trang, cập nhật), lập tức kích hoạt `handleSessionExpired()`, xóa sạch phiên lưu trữ và điều hướng về trang `/login`.
- **Hook `onUnauthorized` trên `AdminApiClient`:**
  - Bổ sung `setOnUnauthorized(callback)` trong `apps/admin/lib/api-client.ts`.
  - Khi phương thức `request(...)` nhận mã 401 từ server, tự động kích hoạt callback này trước khi ném `AdminClientGuardError`.
- **Lắng nghe sự kiện `storage` (Cross-Tab Synchronization):**
  - Đăng ký bộ lắng nghe `window.addEventListener('storage', ...)` theo dõi khóa `jlpt_admin_auth_state_v1`.
  - Khi nhân sự đăng xuất ở một tab khác, tab hiện tại phát hiện `newValue === null` và lập tức xóa phiên, đưa về `/login`.

### 3. Hiển thị thông báo trên trang `/login`

Trong `apps/admin/app/login/page.tsx`:
- Trong hook `useEffect`, kiểm tra `sessionStorage.getItem('jlpt_admin_auth_notice')` hoặc tham số URL `?expired=1`.
- Nếu có, hiển thị thông báo "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." trong alert `[data-testid="login-error-alert"]` và xóa cờ khỏi `sessionStorage` để không ảnh hưởng các lần truy cập thủ công sau đó.
- Khi người dùng bấm submit đăng nhập lại, tự động xóa lỗi cũ `setLocalError(null)`.

### 4. Loại bỏ móc test `window.__setAdminLocale` và `DEFAULT_AUTH_CONTEXT`

- Xóa hoàn toàn `window.__setAdminLocale` khỏi `auth-context.tsx`.
- Cập nhật các nút chuyển đổi ngôn ngữ trong `apps/admin/lib/admin-nav.tsx` có thuộc tính `data-testid="admin-locale-vi"`, `data-testid="admin-locale-ja"`, `data-testid="admin-locale-en"`.
- Cập nhật test E2E Playwright `tests/playwright/integration.spec.ts` tương tác trực tiếp với nút chuyển ngôn ngữ thực tế trên giao diện thay vì gọi hàm ẩn qua `window`.
- Xóa bỏ hằng số `DEFAULT_AUTH_CONTEXT`. Khi gọi `useAdminAuth()` bên ngoài `AdminAuthProvider`, hệ thống ném lỗi rõ ràng: `useAdminAuth must be used within an AdminAuthProvider`.

---

## Nghiệm thu và Bằng chứng Kiểm thử

1. **Kiểm thử đơn vị Admin (`pnpm test:admin`):**
   - 15 tệp kiểm thử với 174 test cases đạt tuyệt đối (100% pass).
   - Bộ kiểm thử mới `apps/admin/tests/i15-session-expiry.test.tsx` xác thực:
     - `useAdminAuth` ném lỗi rõ ràng khi không có Provider.
     - `AdminApiClient` kích hoạt `onUnauthorized` callback khi gặp mã 401.
     - `AdminGuard` chặn truy cập và hiện alert dẫn về `/login`.
     - `StaffLoginPage` dựng đúng cấu trúc card đăng nhập.
2. **Kiểm tra không dùng mock/placeholder (`pnpm check:no-mock-ui`):**
   - Đạt tiêu chuẩn, không có vi phạm mới ngoài baseline.
3. **Kiểm thử E2E Playwright (`tests/playwright/integration.spec.ts`):**
   - `E2E: đăng nhập nhân sự, tải lại trang vẫn đăng nhập`.
   - `E2E: xóa phiên phía máy chủ (đăng xuất ở tab khác) rồi tải lại hoặc thao tác thì về trang đăng nhập kèm thông báo`.
   - `E2E: xóa phiên phía máy chủ rồi thao tác trên giao diện thì về trang đăng nhập kèm thông báo`.
   - Ổn định tương thích đa trình duyệt (Chromium, Firefox, WebKit, Mobile Safari, Mobile Chrome):
     - Gỡ bỏ các lớp `invisible md:visible pointer-events-none md:pointer-events-auto` khỏi thanh menu đóng trên thiết bị di động trong `admin-nav.tsx`, tránh lỗi ẩn phần tử `staff-profile-badge` trên Mobile Safari và Mobile Chrome.
     - Dùng `.filter({ visible: true }).first()` cho toàn bộ locator ghép tìm tiêu đề trang hoặc container chính.
     - Hợp nhất `loginAsAdmin` và `loginAsAdminI04` qua `loginAsStaff`, chờ nút submit kích hoạt trước khi điền thông tin và click.
     - Thêm trạng thái `isHydrated` trên trang đăng nhập `/login` để tránh race condition trước hydration trên Firefox.
     - Duy trì thông báo phiên hết hạn trong `sessionStorage` qua các lần tải lại trang cho tới khi người dùng bấm submit.
     - Đọc khóa token `jlpt_admin_auth_state_v1` khi gửi yêu cầu hủy phiên máy chủ.
     - Chạy toàn bộ staging E2E đạt PASS: `sudo -n /usr/local/bin/jlpt-stage-test check` (exitCode: 0).
