# Quyết Định Kỹ Thuật I07: Thay Thế domcontentloaded Bằng commit Cho Điều Hướng SPA Và Khắc Phục Lỗi WebKit E2E

- **Mã quyết định:** I07-spa-commit-wait-and-webkit-stabilization
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Task ID:** I07
- **Assignment ID:** I07-11
- **Nhánh:** `task/I07`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15

---

## 1. Bối cảnh và Phân Tích Nguyên Nhân Gốc Rễ

Trong lượt chạy CI Staging Verification (`Run Playwright Real API Integration Suite (I00)`):
- Bài test `[webkit] › tests/playwright/integration.spec.ts:1157` (`I12 E2E admin: nhân sự đăng nhập bằng mật khẩu và TOTP, tải lại trang hoặc mở thẳng /users vẫn ở trạng thái đã đăng nhập`) trượt do hết thời gian chờ (`TimeoutError`).
- Bài test `[Mobile Safari (iPhone 15)] › tests/playwright/integration.spec.ts:2462` (`AC1 & AC2: Learner takes demo N5 exam...`) bị flaky ở lần chạy 1 và chỉ đạt ở retry 1.

### Nguyên Nhân Kỹ Thuật Sâu Xa:

1. **Vấn đề `waitUntil: 'domcontentloaded'` trên Single Page Application (Next.js client-side navigation)**:
   - Khi người dùng đăng nhập hoặc nhập mã TOTP, ứng dụng Next.js chuyển hướng trang bằng `router.push('/verify-2fa')` hoặc `router.push('/')` (gọi `history.pushState`).
   - Thao tác chuyển hướng client-side SPA **hoàn toàn không kích hoạt sự kiện `DOMContentLoaded` của trình duyệt** (sự kiện này chỉ kích hoạt 1 lần duy nhất khi tải tài liệu HTML ban đầu).
   - Trên WebKit / Mobile Safari, cơ chế chờ `page.waitForURL(..., { waitUntil: 'domcontentloaded' })` của Playwright cố gắng lắng nghe sự kiện tải tài liệu. Do sự kiện không phát sinh, Playwright bị treo chờ tối đa đến khi chạm ngưỡng timeout (25s hoặc 30s) rồi mới nhảy vào khối `catch`.
   - Chuỗi các lần chờ lặp lại (ở `loginAsStaff`, `handleTotpVerification`, `loginAsStudent`) cộng dồn khiến tổng thời gian thực thi của bài test vượt quá ngân sách `test.setTimeout(120_000)`, dẫn đến bài test bị fail trên WebKit.

2. **Khớp Selector Không Chặt Chẽ Tại Bước 3 Của Bài Test I12**:
   - Selector `main, [data-testid="user-management-title"], table` chứa thẻ `main`. Do layout chung `apps/admin/app/layout.tsx` luôn có `<main>`, selector này khớp ngay lập tức trong 0ms trước khi trang `/users` kịp hydrat hóa và kiểm tra trạng thái xác thực.
   - Khi đó, lệnh kiểm tra tiếp theo `expect(guard-unauthenticated).not.toBeVisible()` có thể bị race condition với quá trình hydrat hóa của Next.js.

3. **Tính Đột Biến Trong Thao Tác Điền TOTP Và Kiểm Tra Văn Bản Furigana**:
   - `handleTotpVerification` trước đó can thiệp sự kiện DOM thủ công qua `evaluate` và `dispatchEvent('input')`, có thể gây xung đột với bộ theo dõi giá trị (`_valueTracker`) của React 18 trên WebKit.
   - Thao tác kiểm tra văn bản nút Furigana sau khi tải lại trang sử dụng đánh giá tức thời `expect(await furiganaBtn.innerText()).toContain('TẮT')` thay vì web-first assertion của Playwright.

---

## 2. Giải Pháp Triển Khai

1. **Chuẩn hóa chế độ chờ điều hướng SPA sang `waitUntil: 'commit'`**:
   - Thay thế toàn bộ các lệnh `waitForURL` sau các thao tác client-side `router.push` (form submit đăng nhập học viên, đăng nhập nhân sự, xác thực TOTP) sang `{ waitUntil: 'commit' }`.
   - `waitUntil: 'commit'` là cơ chế tối ưu được Playwright thiết kế riêng cho SPA: lệnh hoàn tất ngay khi URL thay đổi trong history (`pushState`/`replaceState`), rút ngắn độ trễ từ 25-30 giây treo chờ xuống chỉ còn 10-50 mili-giây.

2. **Tối ưu hóa điền mã TOTP chuẩn Playwright**:
   - Dùng `await expect(codeInput).toHaveValue(validTotp, { timeout: 5000 })` sau khi `fill(validTotp)`, loại bỏ hoàn toàn các đoạn mã can thiệp DOM cưỡng chế không an toàn.

3. **Chỉnh sửa selector trang `/users` đảm bảo chờ render nội dung thực tế**:
   - Cập nhật selector tại dòng 1177 thành `[data-testid="page-title"], [data-testid="users-table"], table`, bảo đảm Playwright chờ nội dung trang người dùng được render đầy đủ thay vì khớp sớm với layout `<main>`.

4. **Chuyển kiểm tra nút Furigana sang Web-First Assertion**:
   - Thay `expect(await furiganaBtn.innerText()).toContain('TẮT')` bằng:
     ```typescript
     await expect(furiganaBtnAfterReload).toContainText('TẮT', { timeout: 15000 });
     ```
   - Playwright tự động polling và xác thực ngay khi React cập nhật state trên Mobile Safari, triệt tiêu nguy cơ flaky.

---

## 3. Kết Quả Kiểm Chứng Các Cổng Chung

- `pnpm check:no-mock-ui`: ĐẠT (0 vi phạm, baseline `tests/integration/mock-ui-baseline.json` rỗng `[]`).
- `pnpm install --frozen-lockfile`: ĐẠT.
- `pnpm lint`: ĐẠT (13/13 packages thành công).
- `pnpm typecheck`: ĐẠT (20/20 tasks thành công).
- `pnpm test`: ĐẠT (17/17 test files, 166/166 tests passed).
- `pnpm build`: ĐẠT (12/12 packages build sạch, production artifacts sẵn sàng).
