# Quyết định kỹ thuật D03: Admin dùng thống nhất @jlpt/ui

- **Mã task**: D03
- **Phụ trách**: W4 (Quản trị báo cáo và thương mại)
- **Ngày**: 2026-10-19
- **Nhánh**: `task/D03`
- **Khóa tài nguyên**: Theo quyền sở hữu worker W4
- **Phụ thuộc**: `D00` (Hệ thống thiết kế `@jlpt/ui` dựng lại trên shadcn/ui)

---

## 1. Bối cảnh và mục tiêu

Theo kế hoạch triển khai Ngày 9 (`KE_HOACH_TRIEN_KHAI.md` mục D03):
- **Mục tiêu chính**: Thay toàn bộ thẻ gốc (`<button>`, `<input>`, `<select>`, `<textarea>`) và inline style (`style={{ ... }}`) trong toàn bộ ứng dụng `apps/admin` bằng các thành phần thiết kế chuẩn từ `@jlpt/ui` (`Button`, `Input`, `Select`, `Textarea`, `ThemeToggle`, `ThemeProvider`).
- **Tính nhất quán**: Bảng (tables), biểu mẫu (forms), bộ lọc (filters), hộp thoại xác nhận (modals/dialogs) dùng chung một kiểu dáng, token màu sắc ngữ nghĩa và quy chuẩn thiết kế.
- **Hỗ trợ chế độ tối (Dark Mode)**: Tích hợp `ThemeProvider` và công tắc chuyển giao diện `ThemeToggle` trong thanh điều hướng admin; toàn bộ các thành phần hiển thị tự động thích ứng với nền tối thông qua các lớp `dark:bg-...`, `dark:text-...`, `dark:border-...`.
- **Tiêu chí nghiệm thu bắt buộc**:
  1. Baseline `check:ui-primitives` của `apps/admin` rỗng (số lượng thẻ HTML thô đạt mức 0 tuyệt đối).
  2. Admin có chế độ tối hoạt động trơn tru.
  3. Đảm bảo toàn bộ kiểm thử đơn vị, kiểm thử tích hợp API thực tế (`I09`, `I03`, `I11`) và bộ kiểm tra chất lượng staging CI (`jlpt-stage-test`) tiếp tục vượt qua 100%.

---

## 2. Chi tiết triển khai

### 2.1. Cấu trúc Layout và Chế độ Tối (Dark Mode)
- **`apps/admin/app/layout.tsx`**: Tích hợp `ThemeProvider` từ `@jlpt/ui` bọc toàn bộ cây DOM ứng dụng với cấu hình `defaultTheme="system"`.
- Thêm lớp CSS variables và tokens màu tối cho thẻ `<body>`:
  ```tsx
  <body className="bg-[var(--bg-page,#f8fafc)] text-[var(--text-primary,#0f172a)] dark:bg-[var(--bg-page,#0b1120)] dark:text-[var(--text-primary,#f8fafc)] min-h-screen antialiased overflow-x-hidden font-sans m-0 p-0">
  ```
- **`apps/admin/lib/admin-nav.tsx`**: Nhúng component `<ThemeToggle compact />` vào phần footer thanh điều hướng cạnh bộ chuyển đổi ngôn ngữ (`vi`, `ja`, `en`), cho phép nhân sự quản trị chuyển đổi linh hoạt giữa Sáng (`light`), Tối (`dark`) và Theo hệ thống (`system`).

### 2.2. Chuẩn hóa các trang và thành phần quản trị
Toàn bộ thẻ thô và inline style đã được thay thế triệt để trên 25+ file nguồn:

1. **Xác thực và phân quyền**:
   - `apps/admin/app/login/page.tsx`: Thay form đăng nhập thành `Input` và `Button` (loading state).
   - `apps/admin/app/verify-2fa/page.tsx`: Thay ô nhập TOTP 6 số và nút xác thực thành `Input` và `Button`.

2. **Bảng điều khiển và Người dùng**:
   - `apps/admin/app/page.tsx`: Chuẩn hóa các card thống kê KPI và danh sách hoạt động trực tiếp.
   - `apps/admin/app/users/page.tsx` & `apps/admin/features/users/user-components.tsx`: Thay ô tìm kiếm người dùng, lọc vai trò bằng `Input`, `Select`, thay đổi vai trò bằng `Button`.
   - `apps/admin/app/audit-logs/page.tsx`: Thay bộ lọc sự kiện bằng `Input`, `Select`.
   - `apps/admin/app/settings/page.tsx`, `settings/notifications/page.tsx`, `settings/org/page.tsx`: Chuẩn hóa cài đặt cấu hình thông báo và tổ chức bằng `Button`, `Input`, `Select`.
   - `apps/admin/features/backup/backup-components.tsx`: Thay nút sao lưu/khôi phục bằng `Button`.

3. **Nội dung, Đề thi và Ngân hàng câu hỏi**:
   - `apps/admin/app/questions/page.tsx`: Chuẩn hóa danh sách câu hỏi và thao tác sửa/xóa bằng `Button`.
   - `apps/admin/app/blueprints/page.tsx`: Chuẩn hóa ma trận đề thi bằng `Button`.
   - `apps/admin/app/exams/mixed/page.tsx` & `apps/admin/features/exam/exam-components.tsx`: Thay thế bộ lọc và form cấu hình trộn đề bằng `Button`, `Input`, `Select`.
   - `apps/admin/app/media/page.tsx`: Thay ô upload tệp đa phương tiện bằng `Input type="file"` và `Button`.
   - `apps/admin/app/moderation/ai/page.tsx`: Thay nút duyệt câu hỏi gợi ý bằng `Button` và `Input type="checkbox"`.
   - `apps/admin/app/vocab/page.tsx`: Thay thế modal thêm từ vựng, bộ lọc tìm kiếm bằng `Button`, `Input`, `Select`.
   - `apps/admin/app/cms/page.tsx`: Thay form soạn thảo bài viết tĩnh bằng `Button`, `Input`, `Select`, `Textarea`.
   - `apps/admin/features/content/richtext-editor.tsx`: Thay thanh công cụ định dạng văn bản giàu bằng `Button`, `Input`.
   - `apps/admin/features/import/import-components.tsx`: Thay ô tải gói ZIP/PDF và công cụ CSV bằng `Button`, `Input`, `Textarea`.

4. **Kiểm duyệt, Báo cáo và Thương mại**:
   - `apps/admin/app/reports/page.tsx`: Thay đổi 15 tab báo cáo phân tích, bộ lọc thời gian và nút xuất CSV bằng `Button`, `Select`.
   - `apps/admin/app/reports/content/page.tsx`: Thay bộ lọc loại sự cố và modal xử lý báo cáo bằng `Button`, `Select`, `Textarea`.
   - `apps/admin/app/reports/revenue/page.tsx`: Loại bỏ inline styles, chuẩn hóa layout Tailwind.
   - `apps/admin/app/reviews/explanations/page.tsx`: Chuẩn hóa hàng đợi duyệt lời giải 2-người bằng `Button`, `Textarea`.
   - `apps/admin/features/review/review-components.tsx`: Thay nút đối chiếu PDF gốc hai cột và form chỉnh sửa bằng `Button`, `Input`.
   - `apps/admin/app/experiments/page.tsx`: Chuẩn hóa quản trị thử nghiệm A/B bằng `Button` và layout Tailwind.
   - `apps/admin/app/commercial/*`: Chuẩn hóa các trang `payments`, `plans`, `reconciliation`, `refunds`.
   - `apps/admin/features/billing/*`: Thay thế hoàn toàn các component `coupons-manager.tsx`, `payments-manager.tsx`, `plans-manager.tsx`, `reconciliation-manager.tsx`, `refunds-manager.tsx`, `revenue-report.tsx` bằng `Button`, `Input`, `Select`, `Textarea` kết hợp Tailwind CSS có hỗ trợ dark mode.

---

## 3. Kết quả nghiệm thu

1. **Kiểm tra UI primitives (`pnpm check:ui-primitives`)**:
   - `[apps/admin] Total: 0`
   - `• <button>: 0 (baseline: 117)`
   - `• <input>: 0 (baseline: 39)`
   - `• <select>: 0 (baseline: 12)`
   - `• <textarea>: 0 (baseline: 8)`
   - **Kết quả**: ĐẠT mức giảm hoàn toàn về 0 thẻ thô trong toàn bộ thư mục `apps/admin/`.

2. **Chế độ tối (Dark Mode)**:
   - Thêm bộ test `apps/admin/tests/theme.test.tsx` kiểm thử `ThemeProvider`, `ThemeToggle` và lớp CSS dark mode.
   - Kiểm tra hiển thị responsive không tràn ngang tại 390px và 1366px.

3. **Bảo toàn chức năng & Test suites**:
   - `pnpm test:admin`: 15/15 test files đạt (171 tests passed).
   - `pnpm check:no-mock-ui`: ĐẠT.
   - `sudo -n /usr/local/bin/jlpt-stage-test check`: ĐẠT (PASS toàn bộ 61 integration/e2e test cases trên staging containers).
