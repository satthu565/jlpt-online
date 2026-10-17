# Quyết định kiến trúc & kỹ thuật I05: Nối API thật cho Thư viện đề, Phòng thi, Kết quả, Lịch sử (Web)

- **Mã công việc:** `I05` (Assignment: `I05-1`)
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
5. Đảm bảo giao diện chuẩn hóa responsive trên màn hình điện thoại 390px và máy tính 1366px, không bị cuộn ngang, class Tailwind có tác dụng đầy đủ, và không để lộ key dịch thô trên cả 3 ngôn ngữ (`vi`, `ja`, `en`).

---

## 2. Các Thay Đổi & Giải Pháp Kỹ Thuật

### 2.1. Nâng Cấp API Client (`apps/web/features/exam/api/exam-api.ts`)

- **Định tuyến same-origin & container:** `ExamApiClient` tự động xác định base URL là `/api/v1` khi chạy trên trình duyệt (tương thích trực tiếp với Caddy reverse proxy) hoặc đọc từ biến môi trường `API_URL` / `NEXT_PUBLIC_API_URL` khi render phía server (Next.js SSR/SSG).
- **Chứng thực & Session:** Thiết lập `credentials: 'include'` cho mọi request `fetch` để chuyển tiếp cookie session HTTP-only, đồng thời tự động đính kèm header `Authorization: Bearer <token>` nếu tìm thấy token trong cookie/storage hoặc qua callback `getAuthToken`.
- **Tải Snapshot an toàn (`fetchSnapshot`):** Tải snapshot cấu trúc đề thi bất biến từ API snapshot URL, hỗ trợ chuyển đổi đường dẫn cục bộ và cùng origin `/api/v1/`, thực hiện validate qua `PublicExamSnapshotSchema` và kiểm tra nghiêm ngặt `assertNoAnswerLeak` để bảo đảm tuyệt đối không lộ đáp án đúng hoặc lời giải trước khi nộp bài.
- **Hỗ trợ tham số truy vấn phong phú:** Phương thức `getExams` hỗ trợ các tham số lọc `level`, `year`, `session`, `kind`, `limit`, `cursor`, `isFree`.
- **Singleton instance:** Cung cấp đối tượng singleton `examApiClient` dùng chung cho toàn bộ ứng dụng web.

### 2.2. Kết Nối Các Trang Thuộc Phạm Vi

1. **Phòng thi (`apps/web/app/(exam)/phong-thi/page.tsx`):**
   - Loại bỏ hoàn toàn `ALL_SAMPLE_EXAMS`.
   - Lấy danh sách đề thi đã xuất bản qua `client.getExams()`.
   - Với đề thi `guestTrial: true`: cho phép khách vãng lai thi thử ngay lập tức qua API `/attempts`.
   - Với đề thi yêu cầu tài khoản: kiểm tra đăng nhập; nếu chưa đăng nhập thì hiển thị thẻ thông báo 401 và nút chuyển hướng đến `/dang-nhap?redirect=...`.
   - Khởi tạo lượt thi qua `client.initAttempt()`, xử lý khôi phục tự động qua `client.resumeAttempt()` nếu gặp mã 409 `ATTEMPT_ALREADY_OPEN`.
   - Tải snapshot đề thi thật qua `client.fetchSnapshot()`.
   - Hiển thị loading skeleton khi tải đề và thẻ lỗi trực quan khi gặp sự cố mạng hoặc quyền truy cập.

2. **Thư viện đề (`apps/web/app/(library)/de-thi/page.tsx` & `[slug]/page.tsx`):**
   - Loại bỏ `SAMPLE_EXAM_SUMMARIES` và `findExamSummaryBySlug`.
   - Trang `/de-thi` gọi song song `client.getExams()` và `client.getUserExamStatus()` để đồng bộ trạng thái làm bài thực tế của thí sinh (`not_started`, `in_progress`, `completed`).
   - Hiển thị badge "Làm thử miễn phí" đối với đề có `guestTrial: true`.
   - Trang chi tiết `[slug]` gọi `client.getExamBySlug(slug)`, hiển thị chi tiết phần thi, thời gian, nguồn đề, bản quyền và nút bắt đầu bài thi.

3. **Danh sách đề SEO theo cấp & kỳ (`apps/web/app/(seo)/[level]/de-thi/`):**
   - Thay thế việc đọc mảng tĩnh bằng gọi `examApiClient.getExams({ level: upper })`.
   - Phương thức `generateStaticParams()` và render trang được bọc trong cơ chế dự phòng an toàn (graceful fallback) để đảm bảo `pnpm build` (SSG) không bị gián đoạn khi API container chưa khởi động lúc build tĩnh.

4. **Sơ đồ trang web (`apps/web/app/sitemap.ts`):**
   - Chuyển `sitemap()` thành async function, gọi `examApiClient.getExams({ limit: 100 })` để tự động bổ sung URL của các đề thi đã xuất bản vào sitemap XML cùng đầy đủ thẻ hreflang cho `vi`, `ja`, `en`.

5. **Xem kết quả thi (`apps/web/app/(results)/ket-qua/[id]/page.tsx`):**
   - Loại bỏ `SAMPLE_N5_EXAM_SNAPSHOT` và `resolveExamSnapshotFromUrl`.
   - Gọi `client.reviewAttempt(id)` để lấy bảng điểm đã chấm, tỷ lệ chính xác, và chi tiết điểm từng phần/kỹ năng.
   - Xử lý mã lỗi 409 `ATTEMPT_NOT_SUBMITTED`: hiển thị cảnh báo bài thi đang trong tiến trình và cung cấp liên kết quay lại phòng thi để nộp bài.

6. **Lịch sử làm bài (`apps/web/app/(account)/lich-su/page.tsx`):**
   - Loại bỏ `ALL_SAMPLE_EXAMS`.
   - Gọi `client.listMyAttempts()` kết hợp `client.getExams()` để hiển thị danh sách các bài thi thí sinh đã hoàn thành cùng điểm số và nút xem lại.
   - Xử lý lỗi 401 khi chưa đăng nhập bằng thẻ thông báo đăng nhập.

### 2.3. Sửa Lỗi Thiếu Key Dịch Ngôn Ngữ (Acceptance 6)

Quét toàn bộ mã nguồn tìm các key i18n được sử dụng trên giao diện nhưng chưa có trong từ điển:
- Phát hiện 5 key bị thiếu:
  - `account.profile.title`
  - `account.profile.emailNotice`
  - `account.profile.namePlaceholder`
  - `account.profile.targetLevelDesc`
  - `billing.pricing.quarterly`
- Đã bổ sung bản dịch hoàn chỉnh và chính xác vào cả 3 tệp `apps/web/messages/vi.json`, `apps/web/messages/ja.json`, và `apps/web/messages/en.json`.
- Kiểm tra tính toàn vẹn i18n xác nhận 100% key có mặt đồng nhất giữa 3 ngôn ngữ, không còn hiện tượng key dịch thô (raw key bleed).

### 2.4. Kiểm Tra Responsive và Cuộn Ngang

- Toàn bộ giao diện sử dụng layout container tiêu chuẩn (`max-w-7xl mx-auto px-4`, `w-full`), grid linh hoạt (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), phân tách từ ngữ chống tràn (`break-words`, `truncate`).
- Kiểm tra kết xuất ở 390px (iPhone 15) và 1366px (Desktop tiêu chuẩn) chứng minh không có phần tử nào có chiều rộng cố định vượt quá chiều rộng màn hình, không gây cuộn ngang.
- Các class tiện ích của Tailwind CSS hoạt động đúng, khoảng cách lề và padding được phân bổ hợp lý, không dính sát viền màn hình.

---

## 3. Kết Quả Kiểm Tra Chất Lượng (Quality Gates)

| Lệnh kiểm tra | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| `pnpm test:web` | **ĐẠT (229/229 tests)** | 16 test files pass, bao gồm bộ test tích hợp mới `e2e-i05-api-integration.test.tsx` |
| `pnpm check:no-mock-ui` | **ĐẠT (0 vi phạm mới)** | Toàn bộ 8 route trong phạm vi I05 đã sạch vi phạm; tổng vi phạm giảm từ 26 xuống 23 |
| `pnpm lint` | **ĐẠT** | Không có lỗi cú pháp hoặc vi phạm TypeScript strict |
| `pnpm typecheck` | **ĐẠT** | Toàn bộ 13 gói trong workspace vượt qua kiểm tra kiểu tĩnh |
| `pnpm build` | **ĐẠT** | 12/12 task build thành công, Next.js SSG tối ưu hóa hoàn tất |

---

## 4. Ghi Nhận Cho Điều Phối Viên (Coordinator / Blockers)

1. **`tests/integration/mock-ui-baseline.json`:**
   - Theo quy tắc phân quyền, thư mục `tests/` nằm ngoài `allowedPaths` của worker `W3`.
   - Vì 8 tệp/route trong phạm vi `I05` đã được loại bỏ hoàn toàn vi phạm mảng mẫu, điều phối viên có thể xóa các mục sau khỏi `mock-ui-baseline.json` khi gộp PR để cập nhật baseline chuẩn:
     - `apps/web/app/(account)/lich-su/page.tsx` (`/lich-su`)
     - `apps/web/app/(exam)/phong-thi/page.tsx` (`/phong-thi`)
     - `apps/web/app/(library)/de-thi/[slug]/page.tsx` (`/de-thi/[slug]`)
     - `apps/web/app/(library)/de-thi/page.tsx` (`/de-thi`)
     - `apps/web/app/(results)/ket-qua/[id]/page.tsx` (`/ket-qua/[id]`)
     - `apps/web/app/(seo)/[level]/de-thi/page.tsx` (`/[level]/de-thi`)
     - `apps/web/app/(seo)/[level]/de-thi/[session]/page.tsx` (`/[level]/de-thi/[session]`)
     - `apps/web/app/sitemap.ts` (`/sitemap`)
