# Quyết định kỹ thuật D01: Cổng hiệu năng Lighthouse trên staging CI và lưu trữ số đo gốc

- **Mã task**: D01
- **Phụ trách**: W6 (Hạ tầng CI và kiểm chứng)
- **Ngày**: 2026-10-18
- **Nhánh**: `task/D01`
- **Khóa tài nguyên**: `ci-workflow`, `staging-deploy`

---

## 1. Bối cảnh và mục tiêu

Theo yêu cầu Ngày 9 của chủ dự án (xem `KE_HOACH_TRIEN_KHAI.md` mục D01/D04/D05), dự án JLPT Online cần thiết lập cổng kiểm soát hiệu năng tự động bằng Google Lighthouse CI trên môi trường staging thật:
1. Đảm bảo tốc độ tải trang trên thiết bị di động (LCP < 2,5 s, CLS < 0,1, TBT < 200 ms, trần JS tải lần đầu ≤ 150 KB gzip).
2. Đảm bảo chất lượng trải nghiệm trên máy tính (Performance ≥ 98, Accessibility ≥ 95, SEO 100).
3. Thiết lập số đo gốc trước đợt (baseline) lưu tại `docs/release/performance-baseline.json` gắn kèm commit SHA gốc.
4. Ngân sách ban đầu chạy ở chế độ cảnh báo (`warn`), sau đó task D04 sẽ tối ưu web mobile và chuyển thành chế độ chặn (`error`).

---

## 2. Quyết định kiến trúc và triển khai

### 2.1. Lựa chọn công nghệ: Lighthouse Core + Playwright Chromium
- **Công cụ đo**: Sử dụng trực tiếp thư viện chuẩn `lighthouse` (v13.5.0) kết hợp với Playwright Chromium (`@playwright/test` v1.64.1) đã có sẵn trong monorepo.
- **Tránh phụ thuộc dư thừa**: Tận dụng binary Google Chrome for Testing từ Playwright cache (`~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`) thông qua Chrome DevTools Protocol (CDP remote debugging port). Không cài đặt thêm các gói cồng kềnh hoặc binary trình duyệt ngoài luồng.
- **Tính khả chuyển**: Runner (`tests/lighthouse/runner.ts`) hỗ trợ đầy đủ các tham số dòng lệnh:
  - `pnpm test:lighthouse -- --list`: Liệt kê đầy đủ 6 route mục tiêu, 2 preset (mobile & desktop), ngân sách và chế độ áp dụng.
  - `pnpm test:lighthouse`: Chạy audit trên môi trường staging thật (`http://127.0.0.1:3000` cho Web và `http://127.0.0.1:3001` cho Admin).
  - `--enforce` / `--fail-on-budget`: Chế độ chặn (bật exit code 1 khi có vi phạm ngân sách).
  - `--mock`: Chạy kiểm tra assertion và sinh báo cáo giả lập mà không yêu cầu server live.

### 2.2. Danh mục các trang chính và Presets
6 route mục tiêu theo đúng đặc tả:
1. `/` (Web, port 3000): Trang chủ học viên.
2. `/de-thi` (Web, port 3000): Thư viện đề thi.
3. `/phong-thi` (Web, port 3000): Phòng thi trực tuyến.
4. `/n5` (Web, port 3000): Trang SEO landing cấp độ N5.
5. `/dang-nhap` (Web, port 3000): Đăng nhập học viên.
6. `/login` (Admin, port 3001): Đăng nhập nhân sự quản trị.

2 cấu hình preset:
- **Preset Mobile**:
  - Viewport mô phỏng: 390x844 (tỉ lệ thiết bị 3x, Mobile User Agent).
  - Giới hạn mạng và CPU: Throttling mô phỏng mạng di động 4G (RTT 150ms, 1,6 Mbps download) và 4x CPU slowdown.
  - Ngân sách: LCP < 2.500 ms, CLS < 0,1, TBT < 200 ms, Initial JS ≤ 150 KB (gzip), Performance ≥ 70, Accessibility ≥ 95, SEO = 100.
- **Preset Desktop**:
  - Viewport: 1366x768 (Desktop User Agent).
  - Throttling: Không áp dụng CPU slowdown (1x).
  - Ngân sách: Performance ≥ 98, Accessibility ≥ 95, SEO = 100, LCP < 2.000 ms, CLS < 0,1, TBT < 150 ms.

### 2.3. Quy tắc lưu số đo gốc và tuyên bố miễn trừ (Disclaimer)
- File lưu trữ: `docs/release/performance-baseline.json`.
- Ghi nhận `commitSha`: `f53bd8ab0cebf776ae4259ede7f8ce19e9aad573`.
- Ghi nhận `environment`: `staging-ci-lab`.
- **Disclaimer**: *"Số đo hiệu năng gốc lưu kèm commit SHA; đây là kết quả đo lab/staging CI trước đợt tối ưu hóa D04. Không lấy số đo máy ảo/lab CI làm số production thật (RUM production sẽ đo qua Cloudflare Web Analytics và web-vitals từ người dùng thật p75)."*
- Ghi nhận `budgetMode: "warn"` và `budgetEnforcedIn: "D04"`.

### 2.4. Tích hợp GitHub Actions CI Workflow
- Trong `.github/workflows/staging.yml`:
  - Thêm bước `Run Lighthouse Performance Audit on Staging (D01)` sau bước kiểm thử đa trình duyệt (`pnpm test:e2e:all-browsers`).
  - Thiết lập biến môi trường `PLAYWRIGHT_BASE_URL: http://127.0.0.1:3000`, `ADMIN_URL: http://127.0.0.1:3001`, `LIGHTHOUSE_BUDGET_MODE: warn`.
  - Bổ sung bước `Upload Lighthouse Performance Reports (D01)` sử dụng `actions/upload-artifact@v4` để đóng gói toàn bộ thư mục `docs/release/lighthouse/` làm CI artifact.

---

## 3. Kiểm chứng và nghiệm thu
1. `pnpm test:lighthouse -- --list`: Đã chạy thực tế, thoát mã 0, hiển thị đầy đủ 6 routes và bảng ngân sách chi tiết.
2. `vitest run integration/lighthouse-runner.test.ts`: Đạt 17/17 tests kiểm tra toàn diện cấu trúc route, logic đánh giá vi phạm, chế độ cảnh báo vs chặn, và lưu trữ artifact.
3. Chạy audit thật với Playwright Chromium trên local HTTP server tạo ra file HTML report và JSON report hoàn chỉnh.
4. Các cổng kiểm tra chung (`pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) đều hoàn thành xuất sắc.
