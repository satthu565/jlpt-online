# Quyết định Kỹ thuật I04: Quản trị thương mại, báo cáo, thử nghiệm nối API thật

- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Task ID**: I04
- **Assignment ID**: I04-1
- **Trạng thái**: REVIEW
- **Ngày**: 2026-10-18
- **Tài liệu tham chiếu**: `docs/multi-worker/AGENTS.md`, `docs/multi-worker/KE_HOACH_TRIEN_KHAI.md`, hợp đồng API thanh toán L04 (`/api/v1/admin/plans`, `/api/v1/admin/coupons`, `/api/v1/admin/payments`, `/api/v1/admin/refunds`, `/api/v1/admin/reconciliation`), báo cáo R04/A04 (`/api/v1/admin/reports/*`), và thử nghiệm A/B A04 (`/api/v1/experiments/*`).

---

## 1. Bối cảnh & Mục tiêu

Trong các đợt phát triển trước, các trang quản trị thương mại (`/commercial/*`), báo cáo nghiệp vụ (`/reports/*`), và thử nghiệm A/B (`/experiments`) còn chứa dữ liệu tĩnh mẫu hoặc mock array ở client (`SAMPLE_PLANS`, `SAMPLE_PAYMENTS`, `SAMPLE_SUBSCRIPTIONS`, `SAMPLE_REFUNDS`, `SAMPLE_EXPERIMENTS`, `billing-service.ts`).

Mục tiêu của I04:
1. Kết nối toàn bộ 8 trang thuộc phạm vi với API backend thật:
   - `/commercial/plans` (Gói dịch vụ & Mã giảm giá coupons)
   - `/commercial/payments` (Giao dịch thanh toán sandbox & Thuê bao)
   - `/commercial/refunds` (Yêu cầu hoàn tiền & Luồng phê duyệt/từ chối hoàn tiền)
   - `/commercial/reconciliation` (Đối soát tự động & Lịch sử chạy đối soát)
   - `/reports` (Trung tâm 15 chỉ số báo cáo nghiệp vụ & Xuất dữ liệu CSV)
   - `/reports/revenue` (Báo cáo doanh thu đa tiền tệ Gross/Refund/Net theo VND, JPY, USD)
   - `/reports/content` (Báo cáo khiếu nại nội dung từ học viên ADM-09)
   - `/experiments` (Quản trị A/B testing & Tỉ lệ chuyển đổi biến thể)
2. Xóa bỏ hoàn toàn dữ liệu giả lập, mảng mẫu tĩnh; gỡ bỏ `billing-service.ts` khỏi `tests/integration/mock-ui-baseline.json` và đảm bảo `pnpm check:no-mock-ui` đạt 0 vi phạm mới.
3. Đảm bảo mọi trang có trạng thái đang tải (`*-loading`), rỗng (`*-empty`), và lỗi kèm nút thử lại (`*-error-alert`); chặn truy cập trái phép bằng màn hình 401/403 (`guard-unauthenticated`, `guard-forbidden`).
4. Hỗ trợ responsive hoàn chỉnh không tràn ngang ở 390px và 1366px; hỗ trợ đầy đủ 3 locale `vi`, `ja`, `en` không để lộ key dịch thô.
5. Kiểm thử E2E Playwright trên staging thật (API + Postgres + Redis + Mailpit) không dùng `page.route` hay mock fetch ở trình duyệt.

---

## 2. Các Quyết định Kỹ thuật & Triển khai

### 2.1. Backend API Module Extensions
- **Module Experiment (`apps/api/src/modules/experiment/`)**:
  - Bổ sung seed dữ liệu thử nghiệm ban đầu trong `ExperimentService` (`exp_checkout_layout_v1`, `exp_reading_font_size`) với các biến thể A/B và số lượt phân bổ/chuyển đổi thực tế để giao diện quản trị hiển thị dữ liệu ngay trên môi trường mới.
  - Bổ sung endpoint toggle trạng thái thử nghiệm: `@Patch(':id/toggle')` và `@Post(':id/toggle')` trong `ExperimentController` và phương thức `toggleExperiment(id)` trong `ExperimentService`.
- **Module Payment (`apps/api/src/modules/payment/`)**:
  - Bổ sung seed mã giảm giá ban đầu (`JLPT2026` giảm 10%, `WELCOME50K` giảm 50.000 VND) trong `PaymentService.ensureDefaultCoupons()` để bảng quản trị coupons có dữ liệu sẵn sàng.
- **Module Reporting (`apps/api/src/modules/reporting/`)**:
  - Mở rộng hàm `getReportByKind(kind)` và xuất CSV `exportReportCsv(kind)` trong `ReportingService` để nhận diện cả định dạng kebab-case lẫn snake_case cho 15 loại báo cáo (ví dụ: `daily-active-users`, `exam-completion-rate`, `revenue-by-gateway`, `content-reports-summary`, v.v.).
  - Bổ sung xử lý an toàn cho báo cáo retention khi chưa đủ dữ liệu chu kỳ dài (`insufficient_cohort_data: true`).

### 2.2. Frontend Admin Portal Architecture
- **AdminApiClient (`apps/admin/lib/api-client.ts`)**:
  - Bổ sung các phương thức chuyên biệt cho commercial, reports và experiments: `listPlans`, `createPlan`, `listCoupons`, `createCoupon`, `listPayments`, `listSubscriptions`, `listRefunds`, `approveRefund`, `rejectRefund`, `getRevenueReport`, `listReconciliationRuns`, `runReconciliation`, `getPaymentReadiness`, `getReport`, `exportReportCsv`, `listExperiments`, `evaluateExperiment`, `toggleExperiment`, `listContentReports`, `updateContentReport`.
  - Phân quyền RBAC nghiêm ngặt: các phương thức thương mại yêu cầu `billing_admin` hoặc `admin`; các phương thức thử nghiệm yêu cầu `admin`; các phương thức báo cáo cho phép các vai trò quản trị tương ứng.
- **Billing Service (`apps/admin/features/billing/billing-service.ts`)**:
  - Chuyển đổi toàn bộ các hàm gọi sang `AdminApiClient`, xóa bỏ hoàn toàn dữ liệu mảng mẫu viết cứng.
  - Đã xóa `apps/admin/features/billing/billing-service.ts` khỏi `tests/integration/mock-ui-baseline.json`.
- **Component States & UI Quality**:
  - `PlansManager` & `CouponsManager`: Gọi `listPlans()` và `listCoupons()`, hỗ trợ tạo mới qua modal, hiển thị empty state khi danh sách rỗng, loading state và error state với nút thử lại.
  - `PaymentsManager`: Nối API `listPayments()` và `listSubscriptions()`, hỗ trợ chuyển tab giao dịch/thuê bao, hiển thị ID thanh toán, số tiền theo tiền tệ, và trạng thái.
  - `RefundsManager`: Nối API `listRefunds()`, hỗ trợ phê duyệt hoàn tiền (`approveRefund`) và từ chối kèm lý do (`rejectRefund`).
  - `ReconciliationManager`: Nối API `listReconciliationRuns()`, kiểm tra trạng thái cổng thanh toán qua `getPaymentReadiness()`, và kích hoạt đối soát qua `runReconciliation()`. Bổ sung hook `useOptionalAdminAuth()` để hỗ trợ SSR/static markup testing không bị crash khi không có context.
  - `ReportsHubPage` (`/reports`): Hỗ trợ chuyển đổi mượt mà giữa 15 loại báo cáo, chọn dải thời gian (`7d`, `30d`, `90d`), hiển thị metrics/bảng tóm tắt, xử lý retention thiếu dữ liệu với thông báo hướng dẫn, và nút xuất CSV tải tệp thật từ server.
  - `RevenueReportPage` (`/reports/revenue`): Hiển thị 3 thẻ doanh thu Gross, Refunds, Net với định dạng chuẩn từng loại tiền tệ (`VND`, `JPY`, `USD`).
  - `ContentReportsPage` (`/reports/content`): Hiển thị danh sách khiếu nại câu hỏi ADM-09 từ học viên, lọc theo trạng thái (`pending`, `resolved`, `dismissed`), và thực hiện đổi trạng thái trực tiếp qua API `updateContentReport`.
  - `ExperimentsAdminPage` (`/experiments`): Hiển thị danh sách thử nghiệm thực tế, các biến thể kèm số lượt phân bổ và tỉ lệ chuyển đổi, cùng nút Bật/Tắt thử nghiệm trực tiếp.
- **Multi-locale & Tailwind Responsive**:
  - Bổ sung đầy đủ từ điển dịch cho cả 3 ngôn ngữ tiếng Việt, tiếng Anh, tiếng Nhật trong `apps/admin/messages/vi.json`, `en.json`, `ja.json`.
  - Bọc tất cả trang bằng container `overflow-x-hidden` với bố cục responsive co giãn phù hợp cả thiết bị di động 390px lẫn màn hình máy tính 1366px, không gây cuộn ngang hay vỡ chữ.

### 2.3. Kiểm thử & Đảm bảo Chất lượng
1. **Admin Unit & Static Markup Suite (`apps/admin/tests/i04-commercial-reports-api.test.tsx`)**:
   - 24 ca kiểm thử chi tiết bao phủ tất cả 8 trang: render cấu trúc, empty states, error handling, RBAC 403 guard, xuất CSV, chuyển đổi đa tiền tệ, toggle experiments, và tính toàn vẹn 3 ngôn ngữ (vi, ja, en).
   - Kiểm thử toàn diện 15 domain methods của `AdminApiClient`.
2. **Payment Module Test Suite (`pnpm test:payments`)**:
   - 21 ca kiểm thử thanh toán, thuê bao, hoàn tiền, đối soát đạt 100% PASS.
3. **Admin Test Suite (`pnpm test:admin`)**:
   - 15 tệp kiểm thử, 192 ca kiểm thử đạt 100% PASS.
4. **No-mock-ui Validation (`pnpm check:no-mock-ui`)**:
   - Đạt 0 vi phạm mới ngoài danh mục baseline.

### 2.4. Khắc phục sự cố Staging E2E & Bảo toàn Phiên đăng nhập Admin
- **Lỗi phiên đăng nhập Admin trong `AdminAuthProvider` (`apps/admin/lib/auth-context.tsx`)**:
  - Khi người dùng điều hướng qua các trang quản trị (`page.goto`), `useEffect` trong `AdminAuthProvider` tải lại thông tin phiên từ `localStorage` và đồng thời gọi nền `GET /api/v1/auth/session`.
  - Endpoint `/api/v1/auth/session` được đánh dấu `@Public()`, khiến `AuthGuard` bỏ qua bước trích xuất token người dùng và trả về `{ user: null, session: null }` (HTTP 200).
  - Khối `else` trước đó đã gọi `saveToStorage(null, null)` khi `data.user` là null, vô tình xóa sạch token hợp lệ đã lưu trong `localStorage` và chuyển `AdminGuard` sang màn hình cảnh báo `guard-unauthenticated` ("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.").
  - Giải pháp: Loại bỏ nhánh `else` xóa phiên vô điều kiện khi nhận HTTP 200 với `user: null`, chỉ xóa phiên khi server trả về mã lỗi HTTP 401 rõ ràng. Phiên đăng nhập hợp lệ của nhân sự được duy trì liên tục và an toàn qua mọi lần điều hướng trang.
- **Đồng bộ bước sinh mã TOTP tránh lỗi Replay Protection (`tests/playwright/integration.spec.ts`)**:
  - Gộp cơ chế đếm bước TOTP thành biến dùng chung `globalLastUsedTotpStep` giữa các bộ suite I09 và I04. Khi các test chạy nối tiếp nhau trong cùng cửa sổ 30 giây của RFC 6238, hàm sinh mã sẽ tự động chờ sang bước thời gian tiếp theo, loại bỏ triệt để lỗi "Mã TOTP đã được sử dụng (mã cũ)" từ backend.
  - Bổ sung `scrollIntoViewIfNeeded()` cho tab retention trên thiết bị di động trước khi kích hoạt click sự kiện.

---

## 3. Nghiệm thu & Kết quả Kiểm tra
- **Admin Unit & Static Markup Suite (`pnpm test:admin`)**: 15 tệp kiểm thử, 192 ca kiểm thử đạt 100% PASS.
- **Payment Module Suite (`pnpm test:payments`)**: 21 ca kiểm thử đạt 100% PASS.
- **No-mock-ui Validation (`pnpm check:no-mock-ui`)**: 0 vi phạm mới ngoài danh mục baseline.
- **Common Gates**:
  - `pnpm install --frozen-lockfile`: PASS.
  - `pnpm lint`: PASS (13/13 packages).
  - `pnpm typecheck`: PASS (20/20 packages).
  - `pnpm test`: PASS (20/20 packages, 40 test files & 533 tests in api).
  - `pnpm build`: PASS (12/12 packages built successfully).
- **Staging Verification**: `sudo -n /usr/local/bin/jlpt-stage-test check` đạt PASS.
