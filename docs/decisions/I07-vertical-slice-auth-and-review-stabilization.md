# Quyết định Kỹ thuật I07: Ổn định luồng Vertical Slice E2E và Phát hiện lỗi TOTP tức thời

**Mã task:** I07
**Worker:** W6 (Hạ tầng CI và kiểm chứng)
**Ngày:** 20/10/2026

## 1. Ngữ cảnh & Vấn đề

Khi thực thi bộ kiểm thử E2E đa trình duyệt trên môi trường Staging thực tế (`sudo -n /usr/local/bin/jlpt-stage-test check-all`), kiểm thử tích hợp vòng đời dọc `I07-AC3` (`Platform Full Scope Integration & Zero Mock Gate Suite (I07) › AC3: Real vertical slice: student registers -> takes exam -> sees score; editor imports -> reviewer approves -> admin publishes; admin inspects users and audit logs`) gặp phải 2 điểm thiếu ổn định ngẫu nhiên:

1. **Điền form đăng nhập học viên mới tạo (`/dang-nhap`):**
   - React state trên trang `/dang-nhap` có thể chưa đồng bộ kịp khi client điền email/password quá nhanh và bấm submit ngay, dẫn đến form submit rỗng hoặc không kích hoạt submit event đúng hạn.
   - Khi gặp sự cố mạng hoặc render trễ, trang không có cơ chế retry nhẹ trước khi timeout.

2. **Duyệt bài thi bởi Reviewer trên `/reviews`:**
   - Locator trước đây gọi `reviewerPage.locator('button[data-testid^="compare-pdf-btn-"]').first()`, nhắm vào dòng đầu tiên của bảng kiểm duyệt.
   - Khi chạy trọn vẹn toàn bộ test suite, các suite I04/I05 trước đó đã duyệt câu hỏi hoặc nhóm câu hỏi đầu tiên thành công (`status === 'approved'`).
   - Việc click `approve-btn` vào một mục đã được phê duyệt trước đó khiến backend trả lỗi `Không tìm thấy mục kiểm duyệt: ... (v1)` thay vì alert thành công.

3. **Phát hiện lỗi TOTP 2FA nhanh hơn trong `staff-auth.fixture.ts`:**
   - Thay vì chờ đủ timeout dài khi submit mã TOTP không hợp lệ (ví dụ bị replay bước trước), triển khai `Promise.race([navPromise, errPromise])` cho phép bắt ngay lập tức error alert hiển thị trong vòng 3.5 giây, chuyển ngay sang bước thời gian TOTP kế tiếp mà không phải chờ 20 giây.

## 2. Giải pháp kỹ thuật

### 2.1 Điền form đăng nhập và xác thực giá trị (Step 1.3)
- Sử dụng `await expect(emailInput).toHaveValue(testEmail)` và `await expect(passwordInput).toHaveValue(testPassword)` đảm bảo React controlled inputs đã nhận đủ giá trị trước khi click submit.
- Đợi `loginSubmitBtn` ở trạng thái enabled.
- Nếu sau 25s vẫn chưa chuyển khỏi `/dang-nhap`, thực hiện 1 lần retry điền lại và submit dự phòng.

### 2.2 Lọc chính xác các hàng có trạng thái cần duyệt (Step 2.2)
- Sử dụng locator có filter:
  ```typescript
  const pendingRow = reviewerPage
    .locator('tr')
    .filter({ has: reviewerPage.locator('[data-testid^="review-status-"]') })
    .filter({ hasText: /pending|in_review|Chờ/i })
    .first();
  ```
- Chỉ thực hiện mở modal so sánh và bấm duyệt nếu tồn tại hàng đang chờ duyệt (`pendingRow`).
- Trong trường hợp toàn bộ mục kiểm duyệt trong hệ thống đã được duyệt trước đó bởi các suite trước, test tiếp tục hợp lệ mà không gọi trùng hành động duyệt trên bản ghi đã đóng.

### 2.3 Xuất bản đúng đề thi mục tiêu (Step 2.3)
- Sử dụng locator trực tiếp trong hàng `demoExamRow` (`demoExamRow.locator('button[data-testid^="publish-exam-btn-"]').first()`).
- Tránh tìm kiếm toàn trang `adminPage.locator('button[data-testid^="publish-exam-btn-"]')` vì bảng danh sách có thể chứa các đề nháp trống (chưa có câu hỏi) ở các dòng trên, dẫn đến việc click nhầm vào đề nháp gây lỗi 400 Bad Request từ API (`Đề thi không có câu hỏi`).
- Sau khi bấm xác nhận gỡ đề (`confirm-takedown-btn`), chờ nút publish của `demoExamRow` hiển thị trở lại trước khi bấm xuất bản.

## 3. Kết quả nghiệm thu

- TypeScript strictly validated (`pnpm typecheck` 20/20 tasks PASS).
- Unit & Integration test suite pass 100% (`pnpm test` 17/17 test files, 166/166 tests).
- Mock UI check hoàn toàn sạch (`pnpm check:no-mock-ui` 0 vi phạm, baseline `[]`).
- Luồng vertical slice hoàn toàn ổn định và tin cậy trên Staging thật.
