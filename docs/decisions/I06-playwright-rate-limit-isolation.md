# Quyết định kỹ thuật I06: Cô lập Client IP và ngăn chặn lỗi 429 Too Many Requests trong Playwright E2E

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** I06
- **Assignment ID:** I06-10
- **Nhánh:** `task/I06`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00

---

## 1. Bối cảnh & Nguyên nhân lỗi trên CI Staging

Trong lượt kiểm thử Staging Verification trên GitHub Actions (`Run Playwright Real API Integration Suite (I00)`), quy trình gặp lỗi ở nhiều dự án trình duyệt:
```text
  [firefox] › Mailpit integration: Student registration dispatches real email and verifies account
  [webkit] › Same-origin API reverse proxy: Web origin /api/v1 routes to API service
  [webkit] › Same-origin API reverse proxy: Admin origin /api/v1 routes to API service
  [webkit] › Mailpit integration: Student registration dispatches real email and verifies account
  [webkit] › Staff authentication: Seeded staff logs in with password and validates TOTP
  [Mobile Safari (iPhone 15)] › ...
  [Mobile Chrome (Pixel 7)] › ...
```

### Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Chia sẻ chung một Client IP trên toàn bộ các project và test case**:
   - `tests/playwright.config.ts` cấu hình mặc định:
     ```typescript
     extraHTTPHeaders: {
       'x-forwarded-for': '198.51.100.80',
       'cf-connecting-ip': '198.51.100.80',
     }
     ```
   - Tất cả request từ các project (`chromium`, `firefox`, `webkit`, `Mobile Safari`, `Mobile Chrome`) đều mang chung IP `198.51.100.80`.
2. **Cơ chế RateLimitGuard trong môi trường Staging**:
   - `RateLimitGuard` (`apps/api/src/common/guards/rate-limit.guard.ts`) đặt ngưỡng mặc định là 120 req/phút trên mỗi Client IP (`windowSec: 60`, `limit: 120`).
   - Client IP được trích xuất ưu tiên từ `cf-connecting-ip` hoặc `x-forwarded-for`.
3. **Lưu lượng tăng vọt khi bổ sung bộ test I06**:
   - Khi task I06 bổ sung việc kiểm tra 13 trang học viên thực tế trên API thật (responsive 390px/1366px và tri-locale vi/ja/en), số lượng HTTP requests do trình duyệt gửi về API trong project `chromium` lên tới ~195 requests trong khoảng 20 giây.
   - Do đó, hạn mức 120 req/phút của IP `198.51.100.80` bị cạn kiệt ngay sau khi `chromium` chạy xong.
   - Khi Playwright chuyển sang các project tiếp theo (`firefox`, `webkit`, `Mobile Safari`), API lập tức phản hồi HTTP `429 Too Many Requests` (`Received: 429` thay vì `200/201`), dẫn đến chuỗi bài kiểm tra bị trượt liên hoàn.

---

## 2. Giải pháp kỹ thuật

### 2.1. Phân bổ Client IP động và độc lập cho từng Project và Test Case
- Xây dựng hàm `getProjectClientIp(testInfo, offset)` trong `tests/playwright/integration.spec.ts`:
  - Mỗi browser project được cấp một dải IP chuyên biệt:
    - `chromium`: `198.51.100.100+`
    - `firefox`: `198.51.100.120+`
    - `webkit`: `198.51.100.140+`
    - `Mobile Safari (iPhone 15)`: `198.51.100.160+`
    - `Mobile Chrome (Pixel 7)`: `198.51.100.180+`
  - Mỗi bài test cụ thể trong suite I00 (`/health`, `/auth/sign-up`, `/auth/verify-email`, `/auth/sign-in`, `/admin/audit-logs`) sử dụng offset riêng biệt, đảm bảo không có bài test nào chia sẻ IP với bài test khác.

### 2.2. Hỗ trợ Client IP tùy biến trong Fixture Staff Auth
- Cập nhật `tests/playwright/fixtures/staff-auth.fixture.ts`:
  - Thêm tham số `customIp?: string` vào hàm `authenticateStaffAccount(account, apiBaseUrl, customIp)`.
  - Khi được truyền vào, `customIp` sẽ thay thế giá trị mặc định trong headers `x-forwarded-for` và `cf-connecting-ip`, loại bỏ hoàn toàn nguy cơ nghẽn rate limit khi đăng nhập staff trên nhiều project song song.

### 2.3. Thiết lập Extra HTTP Headers cấp độ Page trong Suite I06
- Trong các bài test thuộc `Student Web Pages Real Integration & Responsive Suite (I06)`:
  - Sử dụng `await page.setExtraHTTPHeaders({ 'x-forwarded-for': vpIp, 'cf-connecting-ip': vpIp })` theo từng viewport (390px, 1366px) và từng locale (vi, ja, en).
  - Đảm bảo toàn bộ request phụ (assets, data fetch, API calls) do trang học viên phát sinh đều mang IP riêng theo từng kịch bản duyệt, giữ lưu lượng mỗi IP luôn dưới 20 req/phút (rất an toàn so với trần 120 req/phút).

---

## 3. Kết quả xác minh trên Staging Thật (`jlpt-stage-test`)

Chạy lệnh `sudo -n /usr/local/bin/jlpt-stage-test integration` (dựng compose profile staging từ container image build thực tế):
- **Tổng số test:** 50 tests trên 5 projects Playwright.
- **Kết quả:**
  - `38 passed` (100% test chạy đều PASS).
  - `12 skipped` (các test UI trên WebKit và Firefox được skip có chủ đích do thiếu thư viện native trên Linux runner).
  - `0 failed` (Không còn lỗi 429 Too Many Requests, không còn lỗi kết nối).
- **Trạng thái:** **PASS** (exitCode: 0, thời gian chạy hoàn tất: 231s).

---

## 4. Xác minh các cổng chất lượng chung

1. `pnpm check:no-mock-ui`: **PASS** (exitCode: 0, 24 baseline routes, 0 vi phạm mới).
2. `pnpm test:web`: **PASS** (exitCode: 0, 16 test files, 211 tests passing).
3. `pnpm typecheck`: **PASS** (exitCode: 0, 20/20 packages clean).
4. `pnpm lint`: **PASS** (exitCode: 0, 13/13 packages clean).
5. `pnpm test`: **PASS** (exitCode: 0, toàn bộ monorepo test runner 20 packages / 521 tests passing).
6. `pnpm build`: **PASS** (exitCode: 0, toàn bộ workspace & Next.js production bundle build clean).
7. `pnpm install --frozen-lockfile`: **PASS** (exitCode: 0, lockfile nguyên vẹn).
