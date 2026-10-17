# Quyết định Kỹ thuật: Đăng nhập nhân sự thật và khung quản trị nối API (I02)

- Mã task: `I02`
- Phân công: `W4` (Quản trị báo cáo và thương mại)
- Trạng thái: `APPROVED_IMPLEMENTATION`
- Ngày tạo: 17/10/2026

## 1. Bối cảnh & Mục tiêu

Trong giai đoạn đầu phát triển khung quản trị (`apps/admin`), ứng dụng sử dụng đăng nhập giả lập trong bộ nhớ (`mockId`, `admin_tok_`, `mode: 'mock'`), cùng các mảng mẫu viết cứng (`totalUsers: 1420`, `SAMPLE_USERS`, `INITIAL_LOGS` với `aud_sample_*`, `tpl-*`, `app-*`).

Mục tiêu của task I02:
1. Xóa bỏ hoàn toàn cơ chế đăng nhập giả trong `apps/admin/lib/auth-context.tsx` và `apps/admin/lib/api-client.ts`.
2. Chuyển đổi luồng đăng nhập email/mật khẩu sang gọi trực tiếp API `POST /api/v1/auth/sign-in/email`. Mật khẩu sai bị máy chủ API từ chối với mã HTTP 401 `UNAUTHENTICATED`.
3. Xác thực hai yếu tố (TOTP 2FA RFC 6238): Mã TOTP sai hoặc thiếu bị chặn bởi máy chủ API (`TotpGuard`) với mã HTTP 403 `TWO_FACTOR_REQUIRED`. Mã TOTP đúng được xác thực thành công.
4. Xóa sạch mọi mảng mẫu, ID mẫu viết cứng khỏi các trang thuộc phạm vi: Tổng quan (`/`), Người dùng (`/users`), Nhật ký kiểm toán (`/audit-logs`), Cài đặt (`/settings`, `/settings/notifications`, `/settings/org`, `/settings/backup`).
5. Kết nối dữ liệu các trang quản trị tới API máy chủ thật thông qua module `reporting` và các module quản trị, cung cấp đầy đủ các trạng thái UI: Đang tải (`loading`), Dữ liệu rỗng (`empty`), Lỗi API kèm nút thử lại (`error`), xử lý chuyển hướng 401 và báo thiếu quyền 403.
6. Thiết kế giao diện tương thích responsive 390px (mobile) và 1366px (desktop), đảm bảo không phát sinh cuộn ngang (`scrollWidth <= clientWidth`), hiển thị chuẩn Tailwind và hỗ trợ đủ 3 ngôn ngữ (`vi`, `ja`, `en`) không để lộ key dịch thô.

## 2. Thiết kế Kiến trúc & Hợp đồng API

### 2.1. Luồng Xác thực Nhân sự (Staff Auth Flow)

```
[Trình duyệt Admin] ──(1) POST /api/v1/auth/sign-in/email { email, password }──> [API Server]
   - Mật khẩu sai: Nhận HTTP 401 UNAUTHENTICATED từ API -> Hiển thị lỗi UI
   - Mật khẩu đúng: Nhận session token & user info (role: admin/editor/reviewer/billing_admin)

[Trình duyệt Admin] ──(2) Yêu cầu 2FA (TOTP)──> Chuyển hướng /verify-2fa (hoặc /setup-2fa)
   - Người dùng nhập mã TOTP 6 số
   - Client gọi API với tiêu đề `x-totp-code`
   - Mã TOTP sai: Nhận HTTP 403 TWO_FACTOR_REQUIRED từ API -> Báo lỗi mã không hợp lệ
   - Mã TOTP đúng: Nhận HTTP 200 OK -> Nâng cấp phiên làm việc lên `twoFactorStatus: 'verified'`

[Trình duyệt Admin] ──(3) Các yêu cầu quản trị tiếp theo──>
   - Gửi kèm `Authorization: Bearer <token>` và `x-totp-code: <totpCode>`
```

### 2.2. Các Endpoint Quản trị Mới trong Module Reporting

Các endpoint được bổ sung vào `ReportingController` (`@Controller('admin')`), kế thừa đầy đủ các tầng bảo vệ `AuthGuard`, `RolesGuard` (`@Roles('admin')`), và `TotpGuard`:
- `GET /api/v1/admin/dashboard`: Trả về số liệu tổng quan hệ thống (người dùng, đề thi, lượt thi, doanh thu, hoạt động gần đây).
- `GET /api/v1/admin/users`: Danh sách người dùng hệ thống từ bảng `users`, hỗ trợ lọc theo role, trạng thái khóa, từ khóa.
- `GET /api/v1/admin/users/:id`: Xem chi tiết người dùng.
- `PATCH /api/v1/admin/users/:id`: Cập nhật vai trò (RBAC) hoặc trạng thái khóa, ngăn chặn tự nâng quyền của biên tập viên, ghi nhật ký vào `operator_actions`.
- `GET /api/v1/admin/settings/notifications`: Cấu hình danh sách mẫu thông báo & email tự động.
- `PATCH /api/v1/admin/settings/notifications/:id`: Cập nhật cấu hình mẫu thông báo.
- `GET /api/v1/admin/settings/org`: Hồ sơ ứng tuyển giáo viên và tổ chức liên kết.
- `POST /api/v1/admin/settings/org/:id/approve`: Phê duyệt hồ sơ giáo viên, nâng vai trò người dùng thành `teacher`.
- `POST /api/v1/admin/settings/org/:id/reject`: Từ chối hồ sơ giáo viên.
- `GET /api/v1/admin/settings/backup/jobs`: Danh sách các tác vụ sao lưu phục hồi với cấu hình đã che giấu khóa bí mật (sanitized credentials).
- `POST /api/v1/admin/settings/backup/jobs`: Kích hoạt tác vụ sao lưu/phục hồi operator hợp lệ.

### 2.3. Loại bỏ Hoàn toàn Vi phạm check:no-mock-ui

- `apps/admin/app/page.tsx`: Xóa `totalUsers: 1420` và mảng activities viết cứng; chuyển sang gọi `apiClient.getDashboardMetrics()`.
- `apps/admin/app/users/page.tsx`: Xóa mảng `SAMPLE_USERS`; chuyển sang gọi `apiClient.listUsers()`.
- `apps/admin/app/audit-logs/page.tsx`: Xóa mảng `INITIAL_LOGS` (`aud_sample_1`, `aud_sample_2`); chuyển sang gọi `apiClient.listAuditLogs()`.
- `apps/admin/app/settings/notifications/page.tsx`: Xóa mảng mẫu `tpl-1`, `tpl-2`, `tpl-3`; chuyển sang gọi `apiClient.getNotificationTemplates()`.
- `apps/admin/app/settings/org/page.tsx`: Xóa mảng `app-01`, `app-02`; chuyển sang gọi `apiClient.getOrgSettings()`.
- `apps/admin/lib/auth-context.tsx`: Xóa bỏ biến `mockId`, `admin_tok_`, chuyển sang gọi API đăng nhập và xác thực phiên thật.
- `apps/admin/lib/api-client.ts`: Xóa bỏ `mockId`, `admin_tok_`, `mockHashedRecoveryCodes`, `mockActiveSecret`, và cờ `mode: 'mock'`.

### 2.4. Tránh Cuộn Ngang & Đảm bảo Hiển thị Chuẩn Responsive (390px / 1366px)

- `AdminNavigation`: Chuyển sang bố cục linh hoạt (responsive), hỗ trợ hiển thị trên thiết bị di động (<= 768px) mà không đẩy tràn chiều ngang vượt quá 390px.
- Các bảng và thẻ chỉ số quản trị: Bao bọc trong container `overflow-x-auto` và `max-w-full`, sử dụng lưới Tailwind linh hoạt `grid-cols-1 md:grid-cols-...` để tránh tràn kích thước view.

### 2.5. Bảo đảm Đa ngôn ngữ (i18n)

Bổ sung đầy đủ và đối xứng các khóa dịch cho `vi.json`, `ja.json`, `en.json`. Mọi chuỗi tiếng Nhật đều chuẩn hóa NFC. Kiểm tra không để lộ key dịch thô.

## 3. Khắc phục Đóng góp Ý kiến từ Reviewer W2 (Lượt 2 -> Lượt 3)

### 3.1. [P0] Vá Lỗ hổng 2FA Challenge Bypass (auth-context.tsx)
- Đã thiết lập 2 endpoint chính thức trên máy chủ API:
  - `POST /api/v1/admin/auth/2fa/verify`: Xác thực mã TOTP 6 số qua RFC 6238 theo secret đã kích hoạt của nhân sự.
  - `POST /api/v1/admin/auth/2fa/recovery`: Xác thực mã khôi phục dự phòng 8 ký tự (`XXXX-XXXX`) đối chiếu hash trong cơ sở dữ liệu `schema.verifications` và tiêu hủy một lần (single-use).
- Trong `apps/admin/lib/auth-context.tsx`: Loại bỏ hoàn toàn việc client tự nâng cấp `twoFactorStatus: 'verified'` khi chưa nhận được phản hồi 200 OK từ API máy chủ. Khi gặp lỗi mạng (catch block) hoặc API trả về lỗi 400/401/403, hàm tuyệt đối không bypass mà gán lỗi rõ ràng trên UI và trả về `false`.

### 3.2. [P1] Kết nối /settings/backup với API Máy chủ & Lưu trữ Postgres Bền vững
- Xóa bỏ dữ liệu mẫu cứng `job_walg_base_20261015` khỏi `BackupService`.
- Trang `/settings/backup` nối trực tiếp với endpoint `GET /api/v1/admin/settings/backup/jobs` và `POST /api/v1/admin/settings/backup/jobs`.
- Bổ sung đầy đủ 3 trạng thái:
  - Đang tải: `data-testid="backup-loading"`
  - Rỗng: `data-testid="backup-empty"`
  - Lỗi API có nút Thử lại: `data-testid="backup-error"`
- Dữ liệu backup jobs và notification templates được lưu trữ bền vững vào PostgreSQL (`schema.backupJobs`, `schema.templateVersions`, `schema.operatorActions`) thay vì mảng tạm trong bộ nhớ.

### 3.3. [P1] Xóa bỏ Dữ liệu Mẫu & Cập nhật Baseline
- Xóa bỏ `DEFAULT_TEMPLATES` trong `/settings/notifications/page.tsx` và `DEFAULT_APPLICATIONS` trong `/settings/org/page.tsx`.
- Gỡ bỏ 7 route/file quản trị hoàn tất khỏi `tests/integration/mock-ui-baseline.json`. Lệnh `pnpm check:no-mock-ui` kiểm tra pass 100% với 0 vi phạm mới.

### 3.4. [P1] Bổ sung Playwright E2E Browser GUI Test Matrix
- Đã bổ sung suite `Admin Portal Real GUI & Staff Authentication Flow (I02)` trong `tests/playwright/integration.spec.ts` đi đúng luồng người dùng qua giao diện:
  - Giao diện đăng nhập nhập email/mật khẩu sai bị từ chối và hiện alert lỗi từ API.
  - Nhập mã TOTP sai bị từ chối bởi API tại trang `/verify-2fa`.
  - Nhập đúng mật khẩu và TOTP RFC 6238 đăng nhập thành công vào Bảng điều khiển `/`.
  - Duyệt toàn bộ các trang trong phạm vi: `/`, `/users`, `/audit-logs`, `/settings/notifications`, `/settings/org`, `/settings/backup`.
  - Kiểm tra viewport ở 390px (mobile) và 1366px (desktop): khẳng định `scrollWidth <= clientWidth` (không cuộn ngang).
  - Chụp màn hình artifact lưu vào `test-results/screenshots/`.
  - Kiểm tra áp dụng đầy đủ class Tailwind (padding/margin hợp lệ, không dính mép).
  - Kiểm tra cả 3 ngôn ngữ `vi`, `ja`, `en`, khẳng định không để lộ key dịch thô.
  - Cấm hoàn toàn `page.route` hay mock fetch ở tầng trình duyệt.
