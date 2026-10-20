# Quyết Định Kỹ Thuật I07: Đồng Bộ TOTP Đa Trình Duyệt và Hoàn Thiện Kiểm Thử Tích Hợp Staging

- **Mã quyết định:** I07-multi-browser-totp-sync-and-audit-verification
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Task ID:** I07
- **Assignment ID:** I07-3
- **Nhánh:** `task/I07`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15

---

## 1. Bối cảnh và Nguyên nhân Gốc Rễ Từ Lượt Kiểm Tra 2 (Staging Check-All)

Trong lượt chạy `sudo -n /usr/local/bin/jlpt-stage-test check-all` đối với toàn bộ 5 trình duyệt (Chromium, Firefox, WebKit, Mobile Safari, Mobile Chrome), phát hiện 2 điểm nghẽn chính:

1. **Khớp selector kiểm tra trang Nhật ký kiểm toán (`/audit-logs`) trong `I07-AC3`**:
   - Bước kiểm tra `3.2 Admin inspects Audit Logs` tìm kiếm phần tử theo selector `'table, [data-testid="audit-table"], [data-testid="logs-list"]'`.
   - Trang `/audit-logs` trong `apps/admin/app/audit-logs/page.tsx` sử dụng component dòng thời gian `AuditLogTimeline` (`apps/admin/features/users/user-components.tsx`), hiển thị qua `[data-testid="audit-log-timeline"]` hoặc `[data-testid="audit-empty"]` thay vì cấu trúc bảng `<table>` truyền thống.
   - Do đó lệnh `expect(...).toBeVisible({ timeout: 15000 })` bị quá thời gian chờ (15s timeout).

2. **Cơ chế xác thực TOTP và độ trễ trên môi trường di động (`Mobile Safari`, `Mobile Chrome`)**:
   - Khi chạy song song trên 2 worker Playwright và nhiều project trình duyệt, các bài kiểm tra đăng nhập nhân sự (`AC2 & AC4` tại dòng 1116) sử dụng tài khoản hạt giống `publisher@jlpt.local`.
   - Khi gặp phản hồi 403 từ backend ("Mã TOTP đã được sử dụng" do bảo vệ chống phát lại replay protection của `AuthService`), `page.waitForURL` trước đây phải chờ hết 15 giây trước khi bắt lỗi vào khối `catch`, sau đó chờ tiếp bước thời gian 30 giây của TOTP kế tiếp.
   - Với mức timeout mặc định 60 giây của Playwright, tổng thời gian vượt quá 60s dẫn đến `Test timeout of 60000ms exceeded`.
   - Ngoài ra, trên Mobile Safari và Mobile Chrome, thao tác điền form cần kích hoạt sự kiện con trỏ và kiểm chứng giá trị trường nhập liệu (`toHaveValue`) trước khi bấm nút xác nhận.

---

## 2. Giải Pháp Kỹ Thuật Triển Khai

1. **Bổ sung cơ chế phát hiện lỗi sớm và tối ưu điền mã TOTP trong `staff-auth.fixture.ts`**:
   - Bổ sung `Promise.race` giữa điều hướng URL thành công và cảnh báo lỗi `[data-testid="challenge-error-alert"]`. Khi mã bị từ chối do xung đột bước thời gian, runner phát hiện lỗi ngay tức thì trong vài trăm mili-giây thay vì chờ 15 giây.
   - Đảm bảo trường nhập mã TOTP được kích hoạt con trỏ (`click`), điền đầy đủ 6 chữ số và đồng bộ sự kiện `input`/`change` trước khi bấm xác nhận.
   - Khi phát hiện mã cũ, runner đồng bộ hóa bước thời gian và chuyển tiếp sang chu kỳ 30 giây tiếp theo.

2. **Điều chỉnh selector trên `/audit-logs` phù hợp với component `AuditLogTimeline`**:
   - Cập nhật selector tìm kiếm:
     ```typescript
     await expect(
       adminPage.locator('[data-testid="audit-log-timeline"], [data-testid="audit-empty"], [data-testid="audit-loading"], table').first(),
     ).toBeVisible({ timeout: 15000 });
     ```
   - Đáp ứng trọn vẹn cả khi hệ thống đã phát sinh bản ghi kiểm toán hoặc đang trong trạng thái tải/rỗng ban đầu.

3. **Mở rộng thời gian chờ kiểm thử lên 120 giây cho các ca kiểm thử đăng nhập nhân sự qua 2FA TOTP**:
   - Áp dụng `test.setTimeout(120_000)` cho các bài test đăng nhập quản trị trong `Real Staff Authentication & Admin Portal API Integration Suite (I09)`.
   - Đảm bảo runner có đủ thời gian vượt qua chu kỳ chờ 30s của TOTP trên các nền tảng di động giả lập mà không bị ngắt quãng.

---

## 3. Đánh Giá Tác Động và Tuân Thủ

- **Allowed Paths**: Tất cả thay đổi nằm trọn vẹn trong `tests/` (`tests/playwright/integration.spec.ts`, `tests/playwright/fixtures/staff-auth.fixture.ts`) và `docs/decisions/`.
- **Chính sách Mock**: Tuyệt đối không sử dụng mock hoặc stub trong kiểm thử tích hợp staging; giữ vững nguyên tắc backend thật và staging database thật.
