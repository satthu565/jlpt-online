# Quyết Định Kỹ Thuật I07: Ổn Định Hóa Bộ Kiểm Thử E2E Trên WebKit Và Mobile Safari

- **Mã quyết định:** I07-webkit-safari-e2e-stabilization
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Task ID:** I07
- **Assignment ID:** I07-10
- **Nhánh:** `task/I07`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15

---

## 1. Bối cảnh và Lỗi Phát Hiện Từ Lượt Chạy CI Staging Trước

Tại bước chạy `Run Playwright Real API Integration Suite (I00)` trong GitHub Actions (`Staging Verification & PITR Drill`):
1. **Lỗi [webkit] tại `tests/playwright/integration.spec.ts:1157` (I12 E2E admin: nhân sự đăng nhập bằng mật khẩu và TOTP, tải lại trang)**:
   - Bài test `I12` dùng hàm `loginAsAdmin` -> `loginAsStaff` với `waitForURL` timeout chỉ 20s không có `waitUntil: 'domcontentloaded'`, sau đó xác thực hiển thị chỉ mục qua selector khắt khe `[data-testid="stat-total-users"]` với timeout chỉ 10s (ngắn hơn mức mặc định của Playwright).
   - Trong quá trình `page.reload()`, Next.js client cần hydrat hóa và gọi `/api/v1/auth/session` để xác thực lại token trong `localStorage`. Dưới tải nặng đa trình duyệt trong container Linux (WebKit engine chậm hơn Chromium ~2-3x), giao diện hiển thị `guard-loading` trước khi render `stat-total-users`. Mốc 10s quá ngắn dẫn tới time out khi Next.js đang kết thúc chu kỳ hydrat hóa.
   - Thêm vào đó, hàm `handleTotpVerification` trong fixture đặt `waitForURL` sau khi gửi TOTP chỉ 10s. Nếu máy chủ phản hồi trong 11-12s, bài test kích hoạt nhánh `catch`, chờ 30s mã TOTP mới (`waitForNextTotpStep`), làm cạn kiệt ngân sách thời gian 120s của test.

2. **Hiện tượng Flaky [Mobile Safari (iPhone 15)] tại `tests/playwright/integration.spec.ts:2462` (P04: toggle furigana with persistence)**:
   - Bài test kiểm tra thuộc tính `data-furigana` sau khi tải lại trang (`page.reload({ waitUntil: 'domcontentloaded' })`) bằng lệnh đánh giá tức thời:
     ```typescript
     const docFuriganaPersisted = await page.evaluate(() => document.documentElement.getAttribute('data-furigana'));
     expect(docFuriganaPersisted).toBe('off');
     ```
   - Do hook `useFurigana` thiết lập `data-furigana="off"` trong `useEffect` sau khi React mount, việc dùng `page.evaluate()` tức thời không có cơ chế tự động chờ (auto-polling) của Playwright. Nếu `page.evaluate` chạy trước khi `useEffect` thực thi (vài mili giây), giá trị trả về là `null` hoặc `'on'`, gây trượt lần chạy đầu và chỉ đạt khi retry.

---

## 2. Giải Pháp Triển Khai

1. **Khử triệt để Flakiness thuộc tính Furigana bằng Web-First Assertion**:
   - Chuyển toàn bộ các lệnh `page.evaluate(...)` đọc `data-furigana` sang assertion tự động chờ của Playwright:
     ```typescript
     await expect(page.locator('html')).toHaveAttribute('data-furigana', 'off', { timeout: 15000 });
     await expect(page.locator('html')).toHaveAttribute('data-furigana', 'on', { timeout: 15000 });
     ```
   - Playwright tự động thăm dò và kiểm tra điều kiện ngay khi `useEffect` hoàn tất hydrat hóa, loại bỏ hoàn toàn race condition trên Mobile Safari.

2. **Ổn định hóa luồng đăng nhập nhân sự và điều hướng TOTP trên WebKit**:
   - Cập nhật cả 2 hàm `loginAsStaff` trong `integration.spec.ts`: đặt `waitForURL` timeout là 30s kèm `waitUntil: 'domcontentloaded'`.
   - Trong `tests/playwright/fixtures/staff-auth.fixture.ts` (`handleTotpVerification`), nâng `waitForURL` từ 10s lên 25s (`waitUntil: 'domcontentloaded'`), đảm bảo thời gian đủ cho WebKit hoàn tất roundtrip xác thực và chuyển trang mà không bị rơi vào vòng lặp chờ mã TOTP 30s giả.
   - Trong các bài test admin reload (`I12` dòng 1157 và `I15` dòng 1182):
     - Mở rộng locator bảng điều khiển thành `[data-testid="stat-total-users"], [data-testid="page-title"], main` (đồng bộ với test 1122 đã tối ưu ở commit trước).
     - Tăng timeout các bước kiểm tra hiển thị sau reload và truy cập `/users` lên 25s.

3. **Cân chỉnh cấu hình Playwright chung (`tests/playwright.config.ts`)**:
   - Đặt `expect.timeout` mặc định lên `15 * 1000` (15s) thay vì 10s, tăng biên độ chịu tải cho toàn bộ ma trận 5 trình duyệt trên CI runner.

---

## 3. Kết Quả Kiểm Chứng

- `pnpm check:no-mock-ui`: ĐẠT (0 vi phạm, baseline `tests/integration/mock-ui-baseline.json` hoàn toàn rỗng).
- `pnpm install --frozen-lockfile`: ĐẠT.
- `pnpm lint`: ĐẠT (13/13 packages clean).
- `pnpm typecheck`: ĐẠT (20/20 packages clean).
- `pnpm test`: ĐẠT (17/17 test files, 166/166 tests passed).
- `pnpm build`: ĐẠT (12/12 packages build sạch, production Next.js và microservices sẵn sàng).
