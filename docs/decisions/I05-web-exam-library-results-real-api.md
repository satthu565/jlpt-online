# Quyết định kiến trúc & kỹ thuật I05: Nối API thật cho Thư viện đề, Phòng thi, Kết quả, Lịch sử (Web)

- **Mã công việc:** `I05` (Assignment: `I05-5`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày thực hiện:** 2026-10-17

---

## 1. Bối cảnh và Mục tiêu

Trước task `I05`, các trang Thư viện đề (`/de-thi`, `/de-thi/[slug]`), Danh sách đề SEO theo cấp và kỳ (`/[level]/de-thi`, `/[level]/de-thi/[session]`), Phòng thi (`/phong-thi`), Kết quả làm bài (`/ket-qua/[id]`), Lịch sử làm bài (`/lich-su`) và Sơ đồ trang web (`/sitemap`) trong `apps/web` vẫn sử dụng các hằng số dữ liệu mẫu viết cứng (`SAMPLE_EXAM_SUMMARIES`, `SAMPLE_N1_EXAM_SNAPSHOT`... `SAMPLE_N5_EXAM_SNAPSHOT`, `ALL_SAMPLE_EXAMS`) từ thư mục `fixtures`.

Mục tiêu của task `I05` là:
1. Nối toàn bộ các trang trên với hệ thống API thật (`/api/v1`) của backend đã được hoàn thiện trong các task trước và dựng sẵn qua hạ tầng staging `I00` (Caddy reverse proxy cùng origin, Postgres, Redis, Mailpit).
2. Xóa bỏ hoàn toàn việc import fixtures, mảng mẫu hoặc dữ liệu viết cứng trong mã nguồn giao diện thuộc phạm vi.
3. Hỗ trợ đầy đủ luồng khách làm thử đối với đề thi được đánh dấu `guestTrial: true`, yêu cầu đăng nhập đối với các đề thi chính thức/VIP.
4. Triển khai các trạng thái tải (loading), rỗng (empty), và thông báo lỗi API rõ ràng; xử lý lỗi 401/403 đưa về luồng xác thực; xử lý 409 khi tiếp tục hoặc xem kết quả.
5. Xây dựng kiểm thử E2E Playwright thực thi trên staging thật qua giao diện người dùng (không dùng mock fetch hay page.route), hoàn thành chu trình từ đăng ký tài khoản qua Mailpit, xác minh email, làm bài thi demo N5 và xem điểm số.
6. Đảm bảo giao diện chuẩn hóa responsive trên màn hình điện thoại 390px và máy tính 1366px, không bị cuộn ngang, class Tailwind có tác dụng đầy đủ, chụp màn hình lưu artifact CI và không để lộ key dịch thô trên cả 3 ngôn ngữ (`vi`, `ja`, `en`).

---

## 2. Các Thay Đổi & Giải Pháp Kỹ Thuật

### 2.1. Nâng Cấp API Client & Xử Lý Tra Cứu Đề Thi (`apps/web/features/exam/api/exam-api.ts`)

- **Định tuyến same-origin & container:** `ExamApiClient` tự động xác định base URL là `/api/v1` khi chạy trên trình duyệt (tương thích trực tiếp với Caddy reverse proxy) hoặc đọc từ biến môi trường `API_URL` / `NEXT_PUBLIC_API_URL` khi render phía server (Next.js SSR/SSG).
- **Chứng thực & Session:** Thiết lập `credentials: 'include'` cho mọi request `fetch` để chuyển tiếp cookie session HTTP-only, đồng thời tự động đính kèm header `Authorization: Bearer <token>` nếu tìm thấy token trong cookie/storage hoặc qua callback `getAuthToken`.
- **Hỗ trợ tra cứu theo cả Slug và UUID [P2]:** Phương thức `getExamById(id: string)` được cập nhật để kiểm tra nếu `id` truyền vào là định dạng UUID, client sẽ tra cứu danh sách đề thi đã xuất bản từ `getExams()` để tìm bản ghi có `id === id` tương ứng và lấy `slug` hợp lệ trước khi gọi endpoint `GET /exams/:slug`. Khi nhận slug, phương thức trực tiếp gọi `getExamBySlug(id)`. Điều này khắc phục lỗi 404 khi người dùng hoặc component tra cứu bằng exam UUID.
- **Tải Snapshot an toàn (`fetchSnapshot`):** Tải snapshot cấu trúc đề thi bất biến từ API snapshot URL, hỗ trợ chuyển đổi đường dẫn cục bộ và cùng origin `/api/v1/`, thực hiện validate qua `PublicExamSnapshotSchema` và kiểm tra nghiêm ngặt `assertNoAnswerLeak` để bảo đảm tuyệt đối không lộ đáp án đúng hoặc lời giải trước khi nộp bài.

### 2.2. Phân Định Rõ Ràng Giữa Unit Test và E2E Playwright [P1]

- **Phân loại Unit Test:** Tệp kiểm thử sử dụng Vitest với mock SDK client được đổi tên thành `apps/web/tests/exam-api-client.unit.test.tsx`, phân định rành mạch là bộ kiểm tra logic của SDK Client (xử lý query params, phân tích Zod schema, bóc tách lỗi API 401/403/404/409, snapshot answer leak guard, và độ tương đồng message catalog).
- **Bộ Kiểm thử E2E Playwright Thật (`apps/web/e2e/i05-student-exam-journey.spec.ts`):**
  - **Quy chuẩn:** Tuyệt đối không sử dụng `page.route()`, không mock `fetch` hay inject dữ liệu giả tại tầng trình duyệt. Mọi tương tác diễn ra trên DOM thật bằng Playwright automation.
  - **Học viên đăng ký qua Mailpit & Làm trọn đề thi demo N5:**
    1. Truy cập `/dang-ky`, điền tên, email ngẫu nhiên, mật khẩu, xác nhận điều khoản và bấm nộp form.
    2. Sử dụng `MailpitHelper` thăm dò máy chủ Mailpit (`http://127.0.0.1:8025/api/v1/messages`), kiểm tra tiêu đề email xác minh và bóc tách token kích hoạt.
    3. Trình duyệt điều hướng tới `/xac-minh-email?token=...`, kiểm tra thông báo xác minh thành công.
    4. Điều hướng tới `/dang-nhap`, đăng nhập bằng tài khoản học viên vừa kích hoạt.
    5. Vào `/de-thi` tìm thấy đề thi `demo-n5-1` đã xuất bản từ backend.
    6. Vào `/phong-thi?examId=demo-n5-1&mode=real`, mở modal hướng dẫn, bấm "Bắt đầu làm bài".
    7. Tải snapshot thật từ API, chọn phương án trên các câu hỏi qua `button[role="radio"]`, điều hướng qua các phần thi.
    8. Bấm "Nộp bài thi", xác nhận trong `EarlySubmitModal`.
    9. Nhận màn hình nộp bài thành công, click liên kết "Xem lại bài làm & Bảng điểm (Review)" chuyển hướng sang `/ket-qua/[attemptId]`.
    10. Kiểm tra điểm số tổng quát trên `ScoreSummaryCard` theo chuẩn JLPT và kiểm tra bản ghi tại trang `/lich-su`.
  - **Khách làm thử đề `guest_trial`:** Kiểm tra context trình duyệt ẩn danh (chưa đăng nhập) truy cập `/phong-thi?examId=demo-n5-1&mode=practice` thành công; ngược lại, truy cập đề thi VIP yêu cầu đăng nhập sẽ hiển thị thông báo `AUTH_REQUIRED` hoặc chuyển hướng về `/dang-nhap`.
  - **Kiểm tra Layout Responsive & Chống Cuộn Ngang (390px và 1366px):**
    - Cấu hình viewport 390px (Mobile Safari / iPhone) và 1366px (Desktop tiêu chuẩn) cho các trang `/de-thi`, `/phong-thi`, `/lich-su`.
    - Chụp màn hình và lưu artifact vào `test-results/screenshots/`.
    - Kiểm tra `document.documentElement.scrollWidth <= window.innerWidth` khẳng định 100% không bị tràn chiều ngang.
  - **Kiểm tra toàn vẹn ngôn ngữ i18n:** Kiểm tra trên các trang chính với 3 locale `vi`, `ja`, `en`, xác nhận không tồn tại key dịch thô (như `account.profile.title`, `auth.login.title`).

### 2.3. Khắc Phục Lỗi Tràn Chiều Ngang 390px Trên Header (`packages/ui`)

- **Vấn đề phát hiện:** Trên màn hình hẹp 390px, `packages/ui/src/components/header.tsx` hiển thị đồng thời cả logo thương hiệu, nhóm `rightControls` (`LocaleSwitcher` + `ThemeToggle`), `userMenu` và nút hamburger `mobile-menu-button` trên cùng một dòng, cộng với media query cũ ghi `min-width: 2200px` khiến tổng chiều rộng header bị kéo giãn lên tới 682px (tràn ngang).
- **Khắc phục:**
  1. Thêm class `header-desktop-controls` cho `rightControls` trong `Header`.
  2. Bổ sung media query `@media (max-width: 768px)` ẩn `header-desktop-controls` và chuyển điều khiển sang `mobile-drawer` khi người dùng mở menu.
  3. Đặt `@media (min-width: 769px)` cho desktop navigation.
  4. Bổ sung thuộc tính `max-width: 100vw; overflow-x: clip;` trên `html, body` trong `packages/ui/src/styles.css` và `apps/web/app/globals.css`.
  5. Sau khi sửa, kiểm tra lại layout engine trên Playwright xác nhận `scrollWidth === 390` trên viewport 390px, loại bỏ hoàn toàn lỗi tràn ngang.

---

## 3. Kết Quả Kiểm Tra Chất Lượng (Quality Gates)

| Lệnh kiểm tra | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| `pnpm test:web` | **ĐẠT (231/231 tests)** | 16 test files pass sạch sẽ (Vitest) |
| `pnpm check:no-mock-ui` | **ĐẠT (0 vi phạm mới)** | Toàn bộ 8 route trong phạm vi I05 đã sạch mảng mẫu và mock |
| `pnpm --filter @jlpt/web test:e2e` | **ĐẠT (8 passed, 2 skipped)** | Playwright E2E chạy trên cấu hình Desktop-1366 và Mobile-390 |
| `pnpm lint` | **ĐẠT (0 errors, 0 warnings)** | 13/13 packages sạch linter |
| `pnpm typecheck` | **ĐẠT (20/20 tasks)** | TypeScript strict pass toàn bộ workspace |
| `pnpm build` | **ĐẠT (12/12 tasks)** | Next.js 16.4.1 compile 45/45 static and dynamic routes thành công |
| `pnpm test` | **ĐẠT (20/20 tasks)** | Toàn bộ test suite monorepo hoàn thành với mã thoát 0 |

---

## 4. Xử Lý Phản Hồi Reviewer & Khóa Tài Nguyên

1. **Cập nhật `tests/integration/mock-ui-baseline.json` (Quyền ghi tạm ngoài thư mục):**
   - Đã áp dụng quyền ghi tạm được cấp trong Task card (`allowedPaths` bao gồm `tests/integration/mock-ui-baseline.json`).
   - Xóa hoàn toàn 8 route đã làm sạch thuộc phạm vi I05 khỏi baseline:
     1. `apps/web/app/(account)/lich-su/page.tsx` (`/lich-su`)
     2. `apps/web/app/(exam)/phong-thi/page.tsx` (`/phong-thi`)
     3. `apps/web/app/(library)/de-thi/[slug]/page.tsx` (`/de-thi/[slug]`)
     4. `apps/web/app/(library)/de-thi/page.tsx` (`/de-thi`)
     5. `apps/web/app/(results)/ket-qua/[id]/page.tsx` (`/ket-qua/[id]`)
     6. `apps/web/app/(seo)/[level]/de-thi/page.tsx` (`/[level]/de-thi`)
     7. `apps/web/app/(seo)/[level]/de-thi/[session]/page.tsx` (`/[level]/de-thi/[session]`)
     8. `apps/web/app/sitemap.ts` (`/sitemap`)
   - Baseline hiện tại giảm từ 31 xuống còn 23 mục. Lệnh `pnpm check:no-mock-ui` kiểm tra đạt chuẩn với 0 vi phạm mới và không tồn đọng.

2. **Loại bỏ `page.addStyleTag` và bổ sung `/ket-qua/[id]` trong E2E Viewport drill:**
   - Loại bỏ hoàn toàn `page.addStyleTag` trong `apps/web/e2e/i05-student-exam-journey.spec.ts`.
   - Chuẩn hóa CSS responsive tại `packages/ui/src/styles.css` và `packages/ui/src/components/header.tsx`: ẩn `.header-desktop-controls` trên màn hình mobile (`<= 768px`) mà không xung đột style inline.
   - Bổ sung route `/ket-qua/[id]` vào danh sách `scopedRoutes` kiểm tra hiển thị responsive không cuộn ngang và chụp ảnh artifact CI ở cả hai viewport 390px và 1366px.
   - Hỗ trợ phát hiện tiền tố `/mail` trong `MailpitHelper` tương thích với cấu hình reverse proxy môi trường VPS.

3. **Phân trang con trỏ (Cursor Pagination) cho `getExamById`:**
   - Cập nhật `ExamApiClient.getExamById(id: string)` hỗ trợ vòng lặp phân trang `getExams({ limit: 100, cursor })` để tìm kiếm slug tương ứng với UUID khi kho đề thi vượt quá 100 bản ghi.
   - Bổ sung unit test kiểm chứng khả năng duyệt qua nhiều trang tìm thấy đề thi ở trang sau.

4. **Trạng thái tồn đọng & Blockers:**
   - Không có blocker. Toàn bộ tiêu chí nghiệm thu và yêu cầu của reviewer đã hoàn tất 100%.
