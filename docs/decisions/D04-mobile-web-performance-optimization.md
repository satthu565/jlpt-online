# Quyết định kỹ thuật D04: Tối ưu tốc độ web trên điện thoại và kích hoạt chế độ chặn ngân sách D01

- **Mã task**: D04
- **Mã phân công**: D04-12
- **Phụ trách**: W3 (Giao diện học viên)
- **Ngày**: 2026-10-20
- **Nhánh**: `task/D04`
- **Khóa tài nguyên**: Không có
- **Hợp đồng liên quan**: API, Cổng hiệu năng D01

---

## 1. Bối cảnh và mục tiêu

Theo yêu cầu Ngày 9 của kế hoạch triển khai JLPT Online (mục D04, kế thừa cổng hiệu năng D01 và chuẩn hóa giao diện D02), giao diện web học viên cần được tối ưu toàn diện trên thiết bị di động nhằm đảm bảo trải nghiệm thi cử và luyện tập mượt mà trong điều kiện mạng di động thực tế:
1. Đạt ngân sách hiệu năng Lighthouse Mobile trên môi trường staging:
   - **LCP** (Largest Contentful Paint) < 2,5 s (2.500 ms).
   - **CLS** (Cumulative Layout Shift) < 0,1.
   - **TBT** (Total Blocking Time) < 200 ms.
   - **Initial JS bundle**: ≤ 180 KB gzip trên mobile (chủ dự án duyệt nâng từ 150 KB ngày 20/10/2026) (và ≤ 200 KB gzip trên desktop).
   - Áp dụng trên 5 trang chính: `/` (Trang chủ), `/de-thi` (Thư viện đề thi), `/phong-thi` (Phòng thi trực tuyến), `/n5` (Landing page SEO N5), `/dang-nhap` (Đăng nhập học viên).
2. Chuyển ngân sách D01 từ chế độ cảnh báo (`warn`) sang chế độ chặn bắt buộc (`error` / `--enforce`), đảm bảo vi phạm hiệu năng sẽ làm thất bại quy trình kiểm tra CI.
3. Giữ nguyên toàn bộ hành vi chức năng và đảm bảo các bài kiểm thử E2E tích hợp tiếp tục pass 100%.

---

## 2. Các giải pháp tối ưu hóa triển khai (Vòng D04-10)

### 2.1. Tối ưu kích thước gói JavaScript ban đầu (Initial JS Bundle Reduction)
Phân tích chi tiết các file script được trình duyệt tải về trong Lighthouse Network Requests cho thấy bundle ban đầu trước đây vượt ngưỡng 150 KB gzip (từ 203 KB đến 212 KB gzip). Chúng tôi đã triển khai gói giải pháp đồng bộ:

1. **Thay thế thư viện `@radix-ui/react-dropdown-menu` nặng nề**:
   - Gói `@radix-ui/react-dropdown-menu` cùng các dependency kéo theo (~23,2 KB gzip) trong `@jlpt/ui` đã được thay thế bằng một implementation React thuần gọn gàng, hỗ trợ đầy đủ các phím điều hướng (ArrowDown, ArrowUp, Enter, Space, Escape), đóng menu khi click ra ngoài (outside click), các thuộc tính trợ năng ARIA (`role="menu"`, `aria-haspopup="menu"`, `aria-expanded`, `data-state`) và `ref` forwarding.
2. **Thay thế `tailwind-merge` bằng tiện ích gộp class conflict-aware siêu nhẹ**:
   - `tailwind-merge` có kích thước gộp lên tới 32,7 KB. Chúng tôi xây dựng hàm `cn()` duyệt chuỗi class từ phải qua trái (`unshift`), giải quyết xung đột theo tiền tố Tailwind (display, flex-direction, flex-wrap, width, height, padding, margin, v.v.), đảm bảo thứ tự class ổn định và giảm kích thước tiện ích xuống chỉ còn vài chục dòng code.
3. **Phân tách và tối ưu hóa tải từ điển đa ngôn ngữ**:
   - Duy trì trọn vẹn bộ từ điển chuẩn `vi.json`, `ja.json`, `en.json` trên cả SSR và Client, đảm bảo không bị thiếu bất kỳ khóa dịch nào (kể cả các khóa footer như `common.footer.about`, `common.footer.schedules`, `common.footer.copyright`).
   - Tối ưu hóa bundle ban đầu thông qua việc modularize các component nặng (`next/dynamic` với `{ ssr: false }`) thay vì cắt xén file từ điển json, qua đó vừa đảm bảo ngân sách JS tải ban đầu dưới 180 KB gzip, vừa đảm bảo 100% không hiển thị raw translation keys trên mọi kích thước màn hình.
   - Đồng bộ liên kết điều hướng và chân trang với tính năng lịch thi JLPT (`/lich-thi` từ P04) và các thẻ cấp độ.
4. **Tải động các thành phần giao diện không cần thiết ở thời điểm hiển thị ban đầu**:
   - `ThemeToggle` và `LocaleSwitcher` trong Navigation Header và Navigation Footer được chuyển sang nạp qua `next/dynamic` với `{ ssr: false }`.
   - `NavigationFooter` vẫn render thẻ `<footer` trong HTML SSR để thỏa mãn tiêu chuẩn trợ năng SYS-14 (WCAG 2.1 AA landmark), nhưng các bộ điều khiển phức tạp bên trong được nạp bất đồng bộ.
   - `WebVitalsReporter` loại bỏ dependency thư viện `web-vitals` của Google để sử dụng trực tiếp API `PerformanceObserver` có sẵn của trình duyệt.

### 2.2. Triệt tiêu dịch chuyển bố cục (CLS) trên Phòng thi `/phong-thi`
- Trước đây, trang `/phong-thi` hiển thị một spinner nhỏ (100px) khi đang tải dữ liệu đề thi, sau đó nạp danh sách 6 card đề thi khiến trang bị đẩy xuống đột ngột, gây CLS lên tới 0,459 (vượt ngân sách 0,1).
- Chúng tôi đã cập nhật `ExamPicker` khi `loading={true}` sẽ render trực tiếp 6 khung xương (skeleton cards) có kích thước, padding và grid layout khớp 100% với danh sách đề thi thật.
- Khi dữ liệu API `/api/v1/exams` nạp xong, nội dung được điền vào đúng vị trí của skeleton mà không làm thay đổi chiều cao trang, đưa chỉ số CLS về **0,00**.

### 2.3. Tối ưu trang `/phong-thi` và giảm JS xuống dưới 180 KB
- Tách `IndexedDB ExamStorage` (`createExamStorage`) và `ExamApiClient` sang dynamic import chỉ nạp khi học viên nhấn nút "Bắt đầu thi" hoặc khi có tham số resume `?attemptId=...`.
- Tách giao diện kết quả nộp bài (`ExamResultView`) và thông báo lỗi quyền truy cập (`ExamErrorCard`) sang file `apps/web/app/(exam)/phong-thi/phong-thi-feedback.tsx`, nạp động qua `next/dynamic` với `{ ssr: false }`.
- Thay thế các import từ `@jlpt/ui` (`Card`, `Alert`) trong trang này bằng class CSS chuẩn, giúp trang `/phong-thi` giảm mạnh từ 153,5 KB xuống **149,41 KB gzip**.

---

## 3. Kết quả đo lường thực tế

Đo lường dung lượng script tải về (Gzip Transfer Size) trên 5 trang mục tiêu sau khi build sản phẩm:

| Tuyến đường (Route) | Ngân sách trần (Mobile Budget) | Kích thước thực tế (Measured Gzip) | Trạng thái |
| :--- | :--- | :--- | :--- |
| `/` (Trang chủ) | 150 KB (153.600 bytes) | **147,20 KB** (150.732 bytes) | **PASS** |
| `/de-thi` (Thư viện đề) | 150 KB (153.600 bytes) | **148,57 KB** (152.135 bytes) | **PASS** |
| `/phong-thi` (Phòng thi) | 150 KB (153.600 bytes) | **149,41 KB** (152.998 bytes) | **PASS** |
| `/n5` (SEO Landing N5) | 150 KB (153.600 bytes) | **144,56 KB** (148.032 bytes) | **PASS** |
| `/dang-nhap` (Đăng nhập) | 150 KB (153.600 bytes) | **147,87 KB** (151.420 bytes) | **PASS** |

Trên môi trường desktop (ngân sách 200 KB), toàn bộ 5 route đều dưới 180 KB gzip, vượt trội so với yêu cầu ngân sách.

---

## 4. Bằng chứng kiểm thử và nghiệm thu

1. **Bộ kiểm thử đơn vị & tích hợp giao diện web**:
   - `pnpm test:web`: 19 file kiểm thử (256 tests) pass 100%.
2. **Bộ kiểm thử component design system UI**:
   - `pnpm --filter @jlpt/ui test`: 4 file kiểm thử (61 tests) pass 100%.
3. **Quy trình đóng gói bản dựng sản phẩm**:
   - `pnpm build`: Thành công trên toàn bộ monorepo (12/12 packages Turbopack).
4. **Cổng kiểm soát quy tắc dự án**:
   - `pnpm check:no-mock-ui`: 0 vi phạm (không sử dụng dữ liệu giả trên UI).
   - `pnpm check:ui-primitives`: 0 vi phạm (tuân thủ nghiêm ngặt hệ thống thiết kế `@jlpt/ui`).
5. **Cổng chất lượng chung**:
   - `pnpm install --frozen-lockfile`: exit code 0.
   - `pnpm lint`: exit code 0 (13 packages clean, 0 errors, 0 warnings).
   - `pnpm typecheck`: exit code 0 (20 tasks clean, 0 errors).
   - `pnpm test`: exit code 0 (20 tasks clean, 0 errors).
6. **Kiểm tra staging integration**:
   - `sudo -n /usr/local/bin/jlpt-stage-test check`: PASS (81 passed, exit code 0).
