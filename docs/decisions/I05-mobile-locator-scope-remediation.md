# Quyết định kỹ thuật: Khắc phục xung đột bộ chọn định vị (locators) trên giao diện di động trong kiểm thử E2E tích hợp Staging

- **Mã task**: I05
- **Worker**: W3
- **Ngày**: 18/10/2026
- **Trạng thái**: Đã áp dụng

## 1. Bối cảnh & Nguyên nhân gốc rễ (Root Cause)

Trong quá trình chạy kiểm tra kiểm thử tích hợp trên môi trường staging CI (`sudo -n /usr/local/bin/jlpt-stage-test check`), hai ca kiểm thử trong bộ `Real Staging User Journey & Exam Flow (I05)` bị trượt khi chạy trên các thiết bị di động giả lập (`Mobile Safari (iPhone 15)` và `Mobile Chrome (Pixel 7)`):

1. **`Student registration via UI, email verification, login, taking demo N5 exam, and viewing score (Acceptance 1, 4)`**:
   - Trượt tại bước xác minh email:
     ```typescript
     await expect(page.locator('[role="alert"], a[href="/dang-nhap"]').first()).toBeVisible({ timeout: 20000 });
     ```
   - Lỗi báo cáo:
     ```text
     - waiting for locator('[role="alert"], a[href="/dang-nhap"]').first()
       locator resolved to <a href="/dang-nhap">Đăng nhập</a>
       - unexpected value "hidden"
     ```

2. **`Exam history displays loading and requires login when unauthenticated (Acceptance 5)`**:
   - Trượt tại bước kiểm tra thông báo yêu cầu đăng nhập trên trang `/lich-su`:
     ```typescript
     await expect(guestPage.locator('[data-testid="history-error"], a[href*="/dang-nhap"]').first()).toBeVisible({ timeout: 15000 });
     ```
   - Lỗi báo cáo:
     ```text
     - waiting for locator('[data-testid="history-error"], a[href*="/dang-nhap"]').first()
       locator resolved to <a href="/dang-nhap">Đăng nhập</a>
       - unexpected value "hidden"
     ```

### Cơ chế gây lỗi:
- Trong cấu trúc HTML chung, phần thanh điều hướng `<header>` nằm ở đầu trang (trước thẻ `<main>`).
- Trong `<header>`, có khối nút xác thực tài khoản desktop: `<div className="header-auth-buttons"><a href="/dang-nhap">...</a></div>`.
- Theo thiết kế đáp ứng (responsive CSS) tại `packages/ui/src/styles.css` và `packages/ui/src/components/header.tsx`:
  ```css
  @media (max-width: 768px) {
    .header-auth-buttons {
      display: none !important;
    }
  }
  ```
- Khi chạy trên thiết bị di động (< 768px), phần tử `<a href="/dang-nhap">` trong header vẫn tồn tại trong DOM nhưng có thuộc tính CSS `display: none`.
- Do `<header>` xuất hiện trước `<main>` trong thứ tự DOM, bộ chọn tổng quát `locator('[role="alert"], a[href="/dang-nhap"]').first()` và `locator('[data-testid="history-error"], a[href*="/dang-nhap"]').first()` luôn khớp với thẻ `<a>` ẩn trong header trước tiên.
- Khi Playwright gọi `.toBeVisible()`, nó kiểm tra phần tử ẩn đầu tiên đó và đợi cho đến khi hết timeout thay vì kiểm tra phần tử hiển thị hợp lệ nằm bên trong `<main>`.

## 2. Giải pháp kỹ thuật

1. **Giới hạn phạm vi bộ chọn (Scoping) vào vùng nội dung chính (`main`)**:
   - Trong `tests/playwright/integration.spec.ts`:
     - Bước xác minh email: đổi thành `page.locator('main [role="alert"], main a[href="/dang-nhap"]').first()`.
     - Bước kiểm tra lỗi lịch sử thi: đổi thành `guestPage.locator('[data-testid="history-error"], main a[href*="/dang-nhap"]').first()`.
   - Trong `apps/web/e2e/i05-student-exam-journey.spec.ts`:
     - Giới hạn các bộ chọn thông báo đăng nhập vào thẻ `main` để tránh trùng lặp với menu di động.

2. **Đảm bảo tính tương thích đa nền tảng**:
   - Giữ nguyên các thuộc tính ngữ nghĩa (`data-testid`, `role="alert"`, `href`) cho người dùng khiếm thị và chuẩn trợ năng WCAG.
   - Không can thiệp hay làm yếu đi các tiêu chí kiểm thử; đảm bảo cả màn hình di động (390px) và máy tính để bàn (1366px, 1920px) đều vượt qua các bài kiểm tra thực tế trên staging.
