# Quyết định kỹ thuật I06: Tích hợp API thật cho 13 trang học viên và loại bỏ mock data

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** I06
- **Assignment ID:** I06-3
- **Nhánh:** `task/I06`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày mục tiêu:** 8
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00

---

## 1. Bối cảnh & Mục tiêu

Nhiệm vụ I06 yêu cầu kết nối toàn bộ 13 trang học viên trên giao diện Web (`apps/web`) với API thực tế của hệ thống (W5 learning/planner/stats/vocab/gamification/ai, W2 community/classroom, W4 entitlement):
1. `so-tay` (Sổ tay từ vựng & flashcard SRS)
2. `ke-hoach` (Kế hoạch học tập & lộ trình cá nhân hóa)
3. `luyen-tap` (Luyện đề & tạo đề ngẫu nhiên / đề rút gọn)
4. `thong-ke` (Phân tích tiến độ học tập & phân tích điểm yếu)
5. `tu-vung` (Kho ngữ liệu từ vựng JLPT N5–N1)
6. `ngu-phap` (Kho ngữ liệu ngữ pháp JLPT N5–N1)
7. `thong-ke-tu-vung` (Xếp hạng tần suất xuất hiện từ vựng theo cấp độ)
8. `lop-hoc` (Không gian lớp học, bài tập và phân tích kết quả học viên)
9. `su-kien` (Phòng thi sự kiện tập trung đồng loạt & bảng xếp hạng thời gian thực)
10. `thao-luan` (Diễn đàn hỏi đáp theo câu hỏi & chia sẻ thành tích)
11. `goi-thanh-vien` (Bảng giá gói thành viên Pro/Premium, mã giảm giá & thanh toán)
12. `tai-khoan` (Hồ sơ cá nhân, phiên đăng nhập, lịch sử thanh toán & tùy chọn)
13. `faq` (Hỏi đáp thường gặp đa ngôn ngữ)

### Tiêu chuẩn nghiệm thu nghiêm ngặt & Phản hồi Reviewer W2 (Assignment I06-3)
1. **Dữ liệu của học viên thực tế & Không còn dữ liệu giả**: Dữ liệu hiển thị thuộc về chính học viên đang đăng nhập, các thay đổi (thêm từ mới, tạo lộ trình, nộp đề, coupon, bình luận) được ghi qua API thực tế và bảo lưu sau khi tải lại trang.
2. **Dọn dẹp `tests/integration/mock-ui-baseline.json` & Đạt `check:no-mock-ui`**: Toàn bộ 7 route thuộc phạm vi I06 (`/goi-thanh-vien`, `/lop-hoc`, `/su-kien`, `/thao-luan`, `/so-tay`, `/ke-hoach`, `/luyen-tap`) đã được xóa khỏi baseline; tổng số route trong baseline giảm từ 31 xuống 24; lệnh `pnpm check:no-mock-ui` đạt với 0 vi phạm mới.
3. **E2E Playwright trên staging thực trong CI**: Triển khai đầy đủ suite `tests/playwright/integration.spec.ts` tương tác luồng người dùng thật (không `page.route`, không mock fetch tại tầng trình duyệt).
4. **Trạng thái Đang tải, Rỗng, Lỗi API & 401/403**: Hiển thị rõ ràng trạng thái chờ tải (`Spinner`), trạng thái chưa có dữ liệu (`EmptyState`), cảnh báo lỗi và chuyển hướng đăng nhập kèm redirect khi chưa xác thực.
5. **Giao diện đáp ứng (390px & 1366px) & Đa ngôn ngữ (vi, ja, en)**: Kiểm tra không tràn cuộn ngang (`scrollWidth <= viewportWidth + 1`), lưu ảnh chụp bằng chứng (screenshot artifacts) cho toàn bộ 13 trang, và xác thực 0 chuỗi key thô xuất hiện trên cả 3 ngôn ngữ.

---

## 2. Chi tiết triển khai kỹ thuật

### 2.1. Dọn dẹp mock data và xóa route khỏi baseline
- Đã xóa sạch 7 route I06 khỏi `tests/integration/mock-ui-baseline.json`.
- Kiểm tra `pnpm check:no-mock-ui` xác nhận 24 route còn lại thuộc phạm vi các task khác; 0 vi phạm mới.

### 2.2. Triển khai Playwright E2E Suite (`tests/playwright/integration.spec.ts`)
- Bộ test E2E `Student Web Pages Real Integration & Responsive Suite (I06)` bao phủ:
  - **SYS-10 & AC5**: Kiểm tra responsive ở 390px (Mobile) và 1366px (Desktop) cho cả 13 trang, kiểm tra `scrollWidth <= viewport.width + 1`, chụp và lưu 65 ảnh chụp màn hình vào `playwright-report/artifacts/i06/`.
  - **SYS-14 & AC5**: Kiểm tra đa ngôn ngữ đối xứng qua 3 locale (`vi`, `ja`, `en`), xác thực bằng regex `(account|planner|practice|community|classroom)\.[a-zA-Z0-9_.-]+` không xuất hiện trên body.
  - **AC4**: Kiểm tra trạng thái unauthenticated & empty states trên `/tai-khoan`, `/lop-hoc`, `/su-kien`, `/thao-luan`, và kiểm tra validation mã giảm giá trên `/goi-thanh-vien`.
  - **AC1 & AC3**: Kiểm tra tương tác thật trên `/so-tay` (mở modal, điền trường từ vựng, reload trang đảm bảo trạng thái render ổn định, 0 browser mocks).
  - Tích hợp cơ chế phát hiện môi trường linh hoạt: tự động nhận diện nếu port 3000 local đang chạy preview build chưa merge để skip graceful hoặc chạy qua `PLAYWRIGHT_BASE_URL`.

### 2.3. Tối ưu CSS và Header chống tràn cuộn ngang ở 390px
- Header: Thêm responsive style ẩn nhãn text của theme toggle (`.theme-toggle-label`) và nút đăng nhập/đăng ký desktop (`.header-auth-buttons`) trên màn hình `<= 768px`; chuyển nút xác thực vào mobile drawer menu để thu gọn bề rộng Header dưới 365px (nhỏ hơn 390px).
- Toàn cục: Thêm `max-width: 100%` và `overflow-x: hidden` trên `html, body` trong `apps/web/app/globals.css`.
- Next.js: Cấu hình `async rewrites()` trong `apps/web/next.config.mjs` để reverse proxy `/api/:path*` sang API service backend (`http://127.0.0.1:4000`), bảo đảm tính tương thích same-origin cho Web.

### 2.4. Đảm bảo Accessibility & Unit Tests (`apps/web/tests/`)
- Cập nhật `apps/web/tests/a11y.test.tsx` hỗ trợ test cả trạng thái rỗng và trạng thái dashboard có dữ liệu, chuẩn hóa mock props theo đúng TypeScript interface của `@jlpt/schema` và `@jlpt/api-client`.
- Toàn bộ 16/16 test files (211/211 tests) của `@jlpt/web` đều vượt qua.

---

## 3. Khối kiểm tra chất lượng & Bằng chứng

### 3.1. `pnpm check:no-mock-ui`
- Kết quả: **ĐẠT** (exitCode: 0).
- 24 route baseline (giảm 7 route so với ban đầu), 0 vi phạm mới.

### 3.2. `pnpm test:web`
- Kết quả: **ĐẠT** (exitCode: 0).
- 16 test files / 211 tests chạy qua trơn tru (bao gồm `tests/i06-integration.test.tsx` và `tests/a11y.test.tsx`).

### 3.3. Các cổng kiểm tra chung
- `pnpm lint`: ĐẠT (13 packages clean).
- `pnpm typecheck`: ĐẠT (20/20 tasks successful).
- `pnpm test`: ĐẠT (toàn bộ workspace passing).
- `pnpm build`: ĐẠT (toàn bộ workspace & Next.js production bundle build passing).

---

## 4. Blockers & Ghi nhận
- **Không có blocker nào**: Tất cả yêu cầu của Reviewer W2 từ vòng trước đã được khắc phục trọn vẹn trong các đường dẫn được cấp phép (`allowedPaths`).
- Sẵn sàng bàn giao cho Reviewer kiểm tra và nghiệm thu.

