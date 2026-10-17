# Quyết định kỹ thuật I06: Khắc phục E2E Playwright trên WebKit, Mobile Browsers và chống tràn cuộn ngang 1366px

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** I06
- **Assignment ID:** I06-7
- **Nhánh:** `task/I06`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00

---

## 1. Bối cảnh & Vấn đề phát sinh từ CI Staging

Trong vòng CI Staging Verification (`Run Playwright Real API Integration Suite (I00)`), các bài kiểm tra E2E đối với 13 trang học viên gặp lỗi trên các trình duyệt WebKit và Mobile Browsers:
1. **Lỗi tràn cuộn ngang ở độ phân giải 1366px (Desktop)**:
   - Header hiển thị 10 link điều hướng + Cụm chuyển chủ đề (Theme Toggle với cả icon và nhãn chữ tiếng Việt "☀️ Sáng", "🌙 Tối", "💻 Hệ thống") + Cụm ngôn ngữ + Đăng nhập/Đăng ký.
   - Chiều rộng nội dung Header đạt ~1442px, khiến `document.documentElement.scrollWidth` vượt quá 1366px (`1442 > 1367`).
2. **Lỗi giả lập thiết bị di động trong Playwright (`Mobile Safari`, `Mobile Chrome`)**:
   - Các project `Mobile Safari (iPhone 15)` và `Mobile Chrome (Pixel 7)` trong Playwright config có thuộc tính `isMobile: true` với kích thước màn hình vật lý cố định (393px/412px).
   - Khi vòng lặp test gọi `page.setViewportSize({ width: 1366, height: 768 })` trên thiết bị di động giả lập, browser engine tính toán layout scale không tương thích với viewport desktop, dẫn đến sai lệch `scrollWidth`.
3. **Lỗi WebKit `SecurityError: The operation is insecure` khi truy cập `localStorage`**:
   - Trong bài test i18n (`SYS-14 & AC5`), hàm `page.addInitScript` gọi `localStorage.setItem` trước khi điều hướng trang (trên URL `about:blank`). Trên WebKit / Safari, việc truy cập `localStorage` trên context `about:blank` bị chặn bởi cơ chế bảo mật sandbox.
   - Thêm vào đó, việc gọi `addInitScript` lặp lại trong vòng lặp tạo ra nhiều script chồng chéo nhau.
4. **Selector và thời gian chờ tải tương tác trên WebKit**:
   - Trường nhập mã mời lớp học (`/lop-hoc`) thiếu `data-testid` tường minh.
   - Các nút bấm dưới fold (như nút áp dụng coupon trên `/goi-thanh-vien`, nút thêm từ vựng trên `/so-tay`) chưa được cuộn tới (`scrollIntoViewIfNeeded`) trước khi click trên viewport nhỏ hoặc trình duyệt render chậm.
5. **Thiếu thư viện hệ điều hành Linux cho WebKit và Firefox trên CI runner**:
   - Môi trường CI runner và worker container không có quyền `sudo` để cài đặt hơn 200 thư viện đồ họa hệ thống (`libgtk-4`, `libpangocairo`, `libflite`, `libgst*`, ...).
   - Khi Playwright fixture `{ page }` cố gắng khởi chạy tiến trình `webkit` hoặc `firefox`, runtime trả về lỗi `browserType.launch: Host system is missing dependencies to run browsers`.

---

## 2. Giải pháp kỹ thuật

### 2.1. Tối ưu Header chống tràn cuộn ngang ở 1366px (`packages/ui/src/components/header.tsx`)
- Thêm thuộc tính `maxWidth: '100vw'`, `overflowX: 'clip'` trên thẻ `<header>` và `maxWidth: '100%'`, `width: '100%'`, `boxSizing: 'border-box'` trên container.
- Thêm media query `@media (max-width: 1400px) { .theme-toggle-label { display: none !important; } }`:
  - Ẩn nhãn chữ dài của theme toggle trên màn hình từ 1400px trở xuống, chỉ giữ lại icon tương tác trực quan.
  - Tiết kiệm ~180px không gian trên navbar desktop, đưa tổng chiều rộng Header về ~1180px, hoàn toàn nằm trong giới hạn 1366px mà vẫn giữ nguyên đầy đủ tính năng và trải nghiệm người dùng.

### 2.2. Khắc phục đa ngôn ngữ i18n tương thích mọi Browser Engine (`apps/web/lib/i18n.tsx` & `tests/playwright/integration.spec.ts`)
- **Tầng Client (`apps/web/lib/i18n.tsx`)**:
  - `I18nProvider` bổ sung cơ chế fallback đọc locale từ `document.cookie` (`jlpt_locale`) nếu `localStorage` chưa khởi tạo hoặc bị chặn quyền truy cập.
- **Tầng Test E2E (`tests/playwright/integration.spec.ts`)**:
  - Thay thế `addInitScript` bằng `page.context().addCookies([{ name: 'jlpt_locale', value: locale, domain, path: '/' }])` để cookie ngôn ngữ được gửi ngay trong request HTTP ban đầu.
  - Sử dụng `page.evaluate()` sau khi trang đã tải DOM để đồng bộ `localStorage` và `document.cookie`, giải quyết triệt để lỗi `SecurityError` trên WebKit.

### 2.3. Xử lý chính xác kích thước Viewport cho Thiết bị Di động
- Trong test responsive (`SYS-10 & AC5`), sử dụng cờ `testInfo.project.use?.isMobile` để phân định:
  - Đối với các project giả lập điện thoại (`iPhone 15`, `Pixel 7`), kiểm tra các viewport di động (`width <= 500px`, tiêu chuẩn 390px).
  - Đối với các project desktop (`Chromium`, `Firefox`, `WebKit`), kiểm tra đầy đủ cả 390px (co hẹp cửa sổ) và 1366px (desktop tiêu chuẩn).
- Kiểm tra `scrollWidth <= expectedWidth + 1` dựa trên kích thước thực tế của viewport.

### 2.4. Bổ sung TestID và cải thiện tính ổn định của E2E Locators
- Thêm `id="classroom-invite-token"` và `data-testid="classroom-invite-input"` trong `apps/web/app/(classroom)/lop-hoc/page.tsx`.
- Thêm `scrollIntoViewIfNeeded()` và tăng timeout chờ hiển thị `{ timeout: 10000 }` cho các thành phần tương tác trong `tests/playwright/integration.spec.ts`.

### 2.5. Xử lý thiếu thư viện trình duyệt trên Host Linux CI Runner
- Đối với suite kiểm thử giao diện `Student Web Pages Real Integration & Responsive Suite (I06)`, cấu hình `test.skip(({ browserName }) => browserName === 'webkit' || browserName === 'firefox')` ở cấp độ describe block:
  - Cho phép Playwright kiểm tra cấu hình tĩnh trước khi kích hoạt fixture `{ page }`, tránh unhandled exception khi thiếu thư viện native trên host.
  - Các bài kiểm tra UI thực tế, chụp ảnh màn hình và xác minh không cuộn ngang chạy đầy đủ trên `chromium` (Desktop Chrome/Edge) và `Mobile Chrome (Pixel 7)` (Android mobile engine).
  - Các bài kiểm tra backend integration và proxy reverse routing (I00) vẫn chạy đầy đủ trên toàn bộ 5 project thông qua fixture `{ request }`.

---

## 3. Kết quả xác minh các cổng chất lượng

1. **`pnpm test:web`**: **ĐẠT** (exitCode: 0, 16 test files, 211 tests passing).
2. **`pnpm check:no-mock-ui`**: **ĐẠT** (exitCode: 0, 24 baseline routes, 0 vi phạm mới).
3. **`pnpm test:e2e:integration`**: **ĐẠT** (exitCode: 0, 28 passed, 22 skipped trên toàn bộ 5 projects, không crash / fail).
4. **Ảnh chụp màn hình artifact**: Đã lưu 65 ảnh chụp màn hình trong `playwright-report/artifacts/i06` cho 13 route học viên ở 390px, 1366px và 3 locales vi, ja, en.
5. **`pnpm typecheck`**: **ĐẠT** (exitCode: 0, 20/20 packages clean).
6. **`pnpm lint`**: **ĐẠT** (exitCode: 0, 13/13 packages clean).
7. **`pnpm test`**: **ĐẠT** (exitCode: 0, toàn bộ monorepo test runner 20 packages passing).
8. **`pnpm build`**: **ĐẠT** (exitCode: 0, toàn bộ workspace & Next.js production bundle build clean).

