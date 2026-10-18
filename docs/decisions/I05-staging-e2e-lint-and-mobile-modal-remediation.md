# Quyết định kỹ thuật I05: Khắc phục ESLint, Lưu trữ Auth Token Client và Tương tác Mobile Modal trên Staging E2E

- **Mã công việc:** `I05` (Assignment: `I05-13`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày thực hiện:** 2026-10-18

---

## 1. Bối cảnh và Vấn đề kỹ thuật

### 1.1. Lỗi kiểm tra `pnpm lint` từ lượt trước
Trong quá trình chạy cổng chất lượng monorepo, `pnpm lint` thất bại tại file `apps/web/features/results/utils/score-report-pdf.ts`:
- `no-control-regex`: Regex `[\x00-\x08\x0B\x0C\x0E-\x1F]` sử dụng control characters trực tiếp trong regex literal.
- `prefer-const`: Các biến trung gian trong vòng lặp tính toán SHA-256 (`ch`, `temp1`, `maj`, `temp2`) không được gán lại nhưng khai báo bằng `let`.

### 1.2. Hiện tượng Timeout 60s khi Next.js Build SSG trong Docker Container
Khi Docker build staging image (`infra/docker/web.Dockerfile`), Next.js prerender các route SSG (như `/(seo)/[level]/de-thi/page.tsx`). Do biến môi trường `NEXT_PUBLIC_API_URL` được cấu hình dạng đường dẫn tương đối `/api/v1` cho trình duyệt, phía Node.js SSR/SSG không thể resolve URL tương đối mà không có domain/port, dẫn đến việc fetch bị treo hoặc lỗi mạng kéo dài quá 60s timeout của Next.js worker.

### 1.3. Mất Auth Token khi điều hướng giữa các trang (Client-side Page Reload)
Sau khi học viên đăng nhập thành công qua `/dang-nhap`, điều hướng sang `/phong-thi?examId=demo-n5-1` bằng full page reload khiến memory state của `AuthClient` bị reset nếu không được lưu vào `localStorage`. Khi đó, `ExamApiClient` không gửi kèm `Authorization: Bearer <token>`, khiến request tạo attempt bị xử lý như guest và vướng vào giới hạn rate-limit khách làm thử.

### 1.4. Che khuất nút bấm Modal trên màn hình Mobile (390px / 412px)
Trên màn hình viewport hẹp, thanh `CookieConsentBanner` với `z-index: 9999` che khuất phần chân của `Modal` (vốn có `z-index: 50`), dẫn đến Playwright báo lỗi `element click intercepted` khi cố gắng bấm nút "Bắt đầu làm bài" trong modal xác nhận.

---

## 2. Giải pháp kỹ thuật

### 2.1. Chuẩn hóa mã nguồn `score-report-pdf.ts`
1. Thay thế regex chứa control characters bằng hàm kiểm tra mã ký tự (`charCodeAt`):
   Loại bỏ các ký tự có mã ASCII `< 32` ngoại trừ `\t` (9), `\n` (10), `\r` (13) mà không dùng regex literal control characters, tuân thủ nghiêm ngặt quy tắc ESLint `no-control-regex`.
2. Chuyển các khai báo biến `let` thành `const` trong vòng lặp xử lý khối SHA-256.

### 2.2. Hỗ trợ SSR/SSG Fallback URL cho API Clients
Cập nhật cả `ExamApiClient` (`apps/web/features/exam/api/exam-api.ts`) và `AuthClient` (`apps/web/lib/auth-client.ts`):
- Khi chạy trên môi trường Node.js (SSR / Next.js SSG build) và `NEXT_PUBLIC_API_URL` bắt đầu bằng dấu gạch chéo `/`, client tự động chuyển hướng request tới `process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000/api/v1'`.
- Khi chạy trên trình duyệt (CSR), client giữ nguyên URL tương đối để tận dụng reverse proxy Nginx.
- Nhờ giải pháp này, thời gian build SSG 45 trang của Next.js giảm xuống dưới 10 giây và không còn hiện tượng treo worker.

### 2.3. Đồng bộ và Khôi phục Auth Token trong `AuthClient`
1. Khi gọi `setAuthToken(token)` hoặc đăng nhập thành công, lưu token vào `localStorage.setItem('jlpt_auth_token', token)`.
2. Khi `clearAuth()` hoặc đăng xuất, xóa token khỏi `localStorage`.
3. Trong constructor của `AuthClient`, kiểm tra `typeof window !== 'undefined'` và nạp lại token từ `localStorage` nếu có.
4. Đảm bảo `ExamApiClient` lấy token từ `getAuthToken()` để gửi header `Authorization: Bearer <token>` chuẩn xác trên mọi request thi thật.

### 2.4. Khắc phục Z-Index Modal và Cookie Consent trong E2E
1. Nâng `z-index` của component `Modal` trong `@jlpt/ui` (`packages/ui/src/components/modal.tsx`) từ `z-50` lên `z-[10000]` để modal luôn nổi lên trên `CookieConsentBanner` (`z-[9999]`).
2. Gắn thêm `data-testid="exam-card-start-btn"` cho nút bắt đầu trên thẻ đề thi (`exam-picker.tsx`), phân biệt rõ với nút bắt đầu bên trong modal xác nhận.
3. Trong Playwright test context, khởi tạo sẵn `localStorage.setItem('jlpt_cookie_consent', 'all')` để banner không chắn luồng thao tác.
4. Điều chỉnh fixture `staff-auth.fixture.ts` sinh IP động theo thời gian thực để tránh đụng độ rate-limit 429 giữa các test project song song.

---

## 3. Kết quả Kiểm tra và Nghiệm thu

### 3.1. Staging CI Integration Tests (`jlpt-stage-test`)
Chạy bộ kiểm tra staging toàn diện với các container thật (Postgres, Redis, Mailpit, API, Web):
- **45/45 tests passed** thành công 100% trên cả 5 trình duyệt và thiết bị:
  - Chromium (Desktop 1366px)
  - Firefox (Desktop 1366px)
  - WebKit (Desktop 1366px)
  - Mobile Chrome (Pixel 7 - 412px)
  - Mobile Safari (iPhone 15 - 390px)
- Xác nhận không có cuộn ngang (`scrollWidth <= innerWidth`), đầy đủ ảnh chụp màn hình artifact ở 390px và 1366px cho tất cả 3 locale (`vi`, `ja`, `en`).

### 3.2. Cổng chất lượng Monorepo
Tất cả các cổng kiểm tra bắt buộc đều vượt qua với exit code 0:
- `pnpm install --frozen-lockfile`: PASS (0)
- `pnpm lint`: PASS (0) - 13/13 packages sạch hoàn toàn
- `pnpm typecheck`: PASS (0) - 20/20 tasks sạch type
- `pnpm test`: PASS (0) - 40/40 test files, 521/521 tests
- `pnpm build`: PASS (0) - Build thành công toàn bộ monorepo (FULL TURBO)
- `pnpm test:web`: PASS (0) - 16/16 test files, 232/232 tests
- `pnpm check:no-mock-ui`: PASS (0) - 0 vi phạm mới ngoài baseline
