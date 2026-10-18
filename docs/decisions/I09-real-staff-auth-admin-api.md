# Quyết định Kỹ thuật I09: Đăng nhập nhân sự thật và khung quản trị nối API (Làm lại I02)

- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Task ID**: I09
- **Assignment ID**: I09-1
- **Trạng thái**: REVIEW
- **Ngày**: 2026-10-18
- **Tài liệu tham chiếu**: `docs/multi-worker/AGENTS.md`, `docs/multi-worker/KE_HOACH_TRIEN_KHAI.md`, hợp đồng API xác thực I08 (`/api/v1/auth/*`)

---

## 1. Bối cảnh & Vấn đề cần khắc phục từ I02

Task I02 trước đây bị hủy và yêu cầu làm lại vì phát hiện các khiếm khuyết bảo mật nghiêm trọng:
1. **Xác thực giả phía client**: `confirm2faSetup` chấp nhận mọi mã 6 chữ số bất kỳ; session được tạo tự do ở trình duyệt mà không gọi API xác thực thực tế.
2. **Fallback chế độ giả lập**: Khi API trả về 404 hoặc lỗi mạng, client tự chuyển sang dữ liệu mẫu tĩnh thay vì từ chối và báo lỗi rõ ràng.
3. **Dữ liệu mẫu viết cứng trong giao diện quản trị**: Các trang tổng quan (`/`), người dùng (`/users`), nhật ký kiểm toán (`/audit-logs`), cấu hình thông báo (`/settings/notifications`), tổ chức giáo viên (`/settings/org`), và sao lưu (`/settings/backup`) đều chứa hằng số mẫu tĩnh (`SAMPLE_*`, `aud_sample_*`, `tpl-*`, `app-*`).

Mục tiêu của I09: Xóa bỏ triệt để toàn bộ xác thực giả lập và mảng dữ liệu mẫu, kết nối toàn bộ luồng đăng nhập và quản trị với API thật theo đúng hợp đồng của I08, đáp ứng kiểm tra `check:no-mock-ui`, kiểm tra bảo mật API, Playwright E2E trên staging và responsive 390px/1366px.

---

## 2. Các Quyết định Kiến trúc & Triển khai

### 2.1. Xác thực nhân sự thật qua API I08
- **Đăng nhập Email & Mật khẩu**: Gọi trực tiếp `POST /api/v1/auth/sign-in/email`. Mật khẩu sai hoặc tài khoản không tồn tại bị API từ chối với status 401 UNAUTHENTICATED và hiển thị thông báo lỗi từ server qua `[data-testid="login-error-alert"]`.
- **Kích hoạt TOTP 2FA (Enrollment)**: Gọi `GET /api/v1/auth/totp/setup` để nhận secret chuẩn RFC 6238, mã QR SVG và 8 mã khôi phục. Xác nhận kích hoạt qua `POST /api/v1/auth/totp/confirm` với mã 6 số thực tế. Mã sai bị API từ chối với status 400/403; tuyệt đối không chấp nhận bất kỳ mã giả nào.
- **Thử thách TOTP (Challenge)**: Gọi `POST /api/v1/auth/totp/challenge` với header `x-totp-code`. Mã sai bị từ chối với status 403 TWO_FACTOR_REQUIRED và hiển thị lỗi qua `[data-testid="challenge-error-alert"]`.
- **Mã khôi phục (Recovery Code)**: Gọi `POST /api/v1/auth/totp/recovery`. Mã không hợp lệ bị từ chối với status 403 INVALID_RECOVERY_CODE.
- **Kiểm tra Session**: Gọi `GET /api/v1/auth/session` để nạp thông tin nhân sự và quyền hạn vai trò (`admin`, `editor`, `reviewer`).
- **Đăng xuất**: Gọi `POST /api/v1/auth/sign-out` và xóa sạch state/cookie ở client.

### 2.2. Xóa bỏ dữ liệu mẫu & Xóa khỏi Baseline kiểm soát
- **apps/admin/app/page.tsx** (Dashboard): Nối API `GET /api/v1/admin/dashboard`. Xóa các hằng số mẫu KPI; bổ sung trạng thái rỗng (`activity-empty`), đang tải (`dashboard-loading`), và lỗi kèm nút thử lại (`dashboard-error-alert`).
- **apps/admin/app/users/page.tsx** (Người dùng): Nối API `GET /api/v1/admin/users` và `PATCH /api/v1/admin/users/:id/role`. Xóa `SAMPLE_USERS`. Bổ sung trạng thái rỗng (`users-empty`) và xử lý lỗi phân quyền 403.
- **apps/admin/app/audit-logs/page.tsx** (Audit Logs): Nối API `GET /api/v1/admin/audit-logs?limit=50`. Xóa `INITIAL_LOGS` với các ID `aud_sample_1`. Bổ sung trạng thái rỗng (`audit-empty`) và hiển thị đầy đủ Actor & Tenant.
- **apps/admin/app/settings/notifications/page.tsx**: Nối API `GET /api/v1/admin/settings/notifications`. Xóa `DEFAULT_TEMPLATES` với các ID `tpl-1`. Bổ sung trạng thái rỗng (`notifications-empty`).
- **apps/admin/app/settings/org/page.tsx**: Nối API `GET /api/v1/admin/teacher-applications`. Xóa `DEFAULT_APPLICATIONS` với các ID `app-1`. Bổ sung trạng thái rỗng (`org-empty`).
- **apps/admin/app/settings/backup/page.tsx**: Nối API `GET /api/v1/admin/settings/backup/jobs` và `POST /api/v1/admin/settings/backup/jobs`. Xóa các snapshot dữ liệu cứng. Bổ sung trạng thái rỗng (`backup-empty`) và trung hòa 100% bí mật môi trường (`[REDACTED_SECRET]`).
- **tests/integration/mock-ui-baseline.json**: Xóa 7 mục thuộc phạm vi I09 (`/audit-logs`, `/`, `/settings/notifications`, `/settings/org`, `/users`, `apps/admin/lib/api-client.ts`, `apps/admin/lib/auth-context.tsx`). Kiểm tra `pnpm check:no-mock-ui` đạt 0 vi phạm mới.

### 2.3. Bổ sung API endpoints trong Backend Reporting
Để hỗ trợ trang `/settings/backup` nối API thật:
- Đã thêm `@Get('settings/backup/jobs')` và `@Post('settings/backup/jobs')` vào `ReportingController` (`apps/api/src/modules/reporting/reporting.controller.ts`).
- Đã thêm `getBackupJobs()` và `triggerBackupJob()` vào `ReportingService` (`apps/api/src/modules/reporting/reporting.service.ts`).

### 2.4. Trải nghiệm Responsive & Tri-Locale
- Toàn bộ 6 trang được bao bọc trong container `overflow-x-hidden` với padding Tailwind chuẩn (`p-4 md:p-8`), đảm bảo không có thanh cuộn ngang trên cả viewport 390px (mobile) lẫn 1366px (desktop).
- Toàn bộ chuỗi văn bản sử dụng từ điển `t(key, locale)` hỗ trợ cả 3 ngôn ngữ `vi`, `ja`, `en`, không hiển thị key dịch thô.

### 2.5. Khắc phục Race Conditions & Timeout trong Playwright E2E Staging (Lượt I09-3)
1. **AC5: Unauthenticated access guard / redirect**:
   - Sử dụng `page.addInitScript` để xóa sạch `localStorage` và `sessionStorage` trước khi tải trang, ngăn rò rỉ session token từ các test trước.
   - Thay thế `waitForTimeout(500)` bằng web-first assertion: `await expect(page.locator('[data-testid="guard-unauthenticated"], [data-testid="login-card"], [data-testid="email-input"]')).toBeVisible({ timeout: 15000 })`. Điều này loại bỏ hoàn toàn race condition khi React đang hydrate trên môi trường CI có độ trễ CPU cao.
2. **AC6: Responsive Viewports (390px, 1366px)**:
   - Thiết lập `test.setTimeout(180_000)` (3 phút) để thực thi toàn bộ 12 lượt tải trang và chụp fullPage screenshots mà không bị timeout 60s.
   - Xử lý mobile viewports: Với thiết bị mobile giả lập (`isMobile: true` như iPhone 15, Pixel 7), chỉ quét các viewport mobile (<= 500px), tránh xung đột viewport desktop trên mobile browser emulation.
   - Bổ sung dung sai subpixel 1px (`scrollWidth <= clientWidth + 1`) giải quyết sai số làm tròn điểm ảnh trên màn hình có `devicePixelRatio` phân số.
3. **AC6: Tri-Locale Verification (vi, ja, en)**:
   - Thiết lập `test.setTimeout(180_000)` cho 18 lượt quét đa ngôn ngữ.
   - Đồng bộ key ngôn ngữ: Trong `auth-context.tsx`, hỗ trợ đồng thời cả `STORAGE_KEY_LOCALE` (`jlpt_admin_locale_v1`) lẫn `admin_locale` (trong `localStorage` và cookie), đảm bảo mọi cơ chế thiết lập locale đều có hiệu lực ngay lập tức.

---

## 3. Bằng chứng Kiểm thử & Nghiệm thu

1. **`pnpm test:admin`**: Đạt 14/14 test suites, 168/168 tests passed, exit code 0.
   - Bao gồm suite mới `apps/admin/tests/i09-real-auth-api.test.tsx` kiểm tra chuyên biệt cho các tiêu chí nghiệm thu của I09.
2. **`pnpm check:no-mock-ui`**: Đạt, 0 vi phạm mới ngoài baseline.
3. **`pnpm typecheck` & `pnpm lint`**: 13/13 packages thành công, 0 cảnh báo hay lỗi kiểu dữ liệu.
4. **`tests/playwright/integration.spec.ts`**: Bộ kiểm thử E2E Playwright `Real Staff Authentication & Admin Portal API Integration Suite (I09)` chạy qua giao diện thật (không mock trình duyệt), chụp artifact màn hình tại 390px và 1366px, kiểm tra từ chối sai mật khẩu và sai TOTP từ API, kiểm tra tri-locale và responsive không cuộn ngang.
