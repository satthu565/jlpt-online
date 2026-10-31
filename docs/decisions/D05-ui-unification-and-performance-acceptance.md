# Quyết định kỹ thuật D05: Nghiệm thu giao diện thống nhất và hiệu năng

- **Mã task**: D05
- **Mã phân công**: D05-1
- **Phụ trách**: W6 (Hạ tầng CI và kiểm chứng)
- **Ngày**: 2026-10-20
- **Nhánh**: `task/D05`
- **Khóa tài nguyên**: `ci-workflow`, `staging-deploy`
- **Phụ thuộc**: D02, D03, D07, D10 (Đã hoàn thành; D04, D06, D08, D09 được hoàn tất trực tiếp và tích hợp qua PR)

---

## 1. Bối cảnh và Mục tiêu

Theo kế hoạch triển khai Ngày 9 (`KE_HOACH_TRIEN_KHAI.md` mục D05) và chỉ thị nghiệm thu kiến trúc:
1. **Khóa chặn vĩnh viễn chất lượng giao diện (Design System & Primitives Gate)**:
   - Toàn bộ giao diện học viên (`apps/web`) và giao diện quản trị (`apps/admin`) đã hoàn thành chuyển đổi sang thư viện chung `@jlpt/ui` (chuẩn shadcn/ui).
   - Biến lệnh kiểm tra nguyên thủy `check:ui-primitives` (`packages/ui/scripts/check-ui-primitives.ts` và `check-inline-styles.ts`) và `check:no-mock-ui` thành các cổng kiểm soát chặn bắt buộc (blocking quality gates) vĩnh viễn trong CI (`.github/workflows/ci.yml` và `staging.yml`).
2. **Kích hoạt chặn hoàn toàn hiệu năng Lighthouse (Performance Gate Enforcement)**:
   - Loại bỏ chỉ số `LCP` khỏi danh sách `WARN_ONLY_METRICS` trong `tests/lighthouse/budgets.ts`, đưa danh sách này về rỗng `new Set<string>()`. LCP mobile dùng ngưỡng 3300 ms (mô phỏng).
   - Chuyển `LIGHTHOUSE_BUDGET_MODE` trong workflow staging CI (`.github/workflows/staging.yml`) từ `warn` sang `error`. Mọi vi phạm ngân sách hiệu năng (LCP, CLS, TBT, Initial JS, điểm Performance, A11y, SEO) sẽ lập tức làm trượt CI.
3. **Kiểm chứng đa độ phân giải và chống tràn giao diện (Zero Overflow & Zero Leak)**:
   - Duyệt kiểm tra toàn bộ 59 trang giao diện (29 trang Web học viên và 30 trang Quản trị Admin) trên 3 độ phân giải chuẩn:
     - **Mobile**: 390px × 844px (thiết bị di động tiêu chuẩn)
     - **Desktop Standard**: 1366px × 768px (máy tính phổ thông)
     - **Desktop Widescreen**: 1920px × 1080px (màn hình Full HD)
   - Tiêu chí nghiệm thu nghiêm ngặt:
     - Tuyệt đối 0 trang nào xuất hiện thanh cuộn ngang (horizontal scrollbar: `scrollWidth <= clientWidth + 1px`).
     - Tuyệt đối 0 chuỗi dịch thô / unparsed i18n key (`account.*`, `auth.*`, `common.*`, `exam.*`, `app.*`, `nav.*`).
     - Tuyệt đối 0 mã tính năng nội bộ hiển thị trên giao diện (ví dụ `(EXPL-01..09)`, `ADM-01`, `LIB-06`).
4. **Báo cáo đối sánh số đo trước/sau và lưu trữ ảnh chụp màn hình**:
   - Lập tài liệu báo cáo tổng hợp `docs/release/DESIGN_PERF_REPORT.md` trình bày chi tiết số đo hiệu năng, số lượng inline style, số lượng thành phần nguyên thủy, icon vector, và bộ sưu tập ảnh chụp màn hình đầy đủ các trang.

---

## 2. Chi tiết thực hiện

### 2.1. Đưa `check:ui-primitives` và `check:no-mock-ui` vào cổng CI bắt buộc
- Cập nhật `.github/workflows/ci.yml`:
  - Bổ sung bước `Run UI Primitives & Design System Ratchet Gate (D00 / D05)` chạy lệnh `pnpm check:ui-primitives`.
  - Củng cố bước `Run Mock UI Data & Baseline Gate (I00 / D05)` chạy `pnpm check:no-mock-ui`.
- Cập nhật `.github/workflows/staging.yml`:
  - Bổ sung các bước kiểm tra tĩnh sớm trước khi kích hoạt Docker Buildx để phát hiện lỗi ngay từ đầu chu trình.

### 2.2. Khóa chặn ngân sách Lighthouse trong `tests/lighthouse/budgets.ts`
- Cập nhật `WARN_ONLY_METRICS` trong `tests/lighthouse/budgets.ts`:
  ```typescript
  export const WARN_ONLY_METRICS: ReadonlySet<string> = new Set<string>();
  ```
- Cập nhật suite kiểm thử `tests/integration/lighthouse-runner.test.ts`:
  - Khẳng định `WARN_ONLY_METRICS` là rỗng.
  - Kiểm tra vi phạm `LCP` được xếp vào nhóm vi phạm chặn CI (`blockingViolations`), đảm bảo cơ chế bảo vệ ngân sách hoạt động chuẩn xác.
- Cập nhật cấu hình môi trường trong `.github/workflows/staging.yml`:
  ```yaml
  - name: Run Lighthouse Performance Audit on Staging (D01 / D05)
    env:
      PLAYWRIGHT_BASE_URL: http://127.0.0.1:3000
      ADMIN_URL: http://127.0.0.1:3001
      LIGHTHOUSE_BUDGET_MODE: error
    run: |
      pnpm test:lighthouse
  ```

### 2.3. Triển khai công cụ kiểm chứng tự động và chụp ảnh 177 trạng thái
- Xây dựng `tests/integration/capture-design-perf.ts`:
  - Thực hiện phiên đăng nhập thật của học viên và nhân sự quản trị (có xác thực 2FA TOTP RFC 6238).
  - Tự động duyệt qua 29 trang Web và 30 trang Admin tại cả 3 khung nhìn (390px, 1366px, 1920px) — tổng cộng 177 lượt kiểm tra.
  - Kiểm tra tự động tại mỗi trang:
    - Tràn chiều ngang (`document.documentElement.scrollWidth > clientWidth + tolerance`).
    - Khóa dịch thô (phát hiện bằng biểu thức chính quy namespace, loại trừ địa chỉ email hợp lệ).
    - Mã tính năng nội bộ.
  - Lưu ảnh chụp chất lượng cao vào `docs/release/screenshots/web/` và `docs/release/screenshots/admin/`.
  - Xuất dữ liệu thống kê chi tiết ra `docs/release/design-perf-audit-report.json`.

---

## 3. Kết quả nghiệm thu

1. **Số đo giao diện Trước / Sau chuyển đổi**:
   - `style={{}}` trong `apps/web`: Giảm từ **661** (trước D08) xuống **0** mã viết tay (chỉ còn thanh tiến độ tính toán lúc chạy có chú thích hợp lệ `ui-allow-style`).
   - Thẻ nguyên thủy HTML thô: `<button>`, `<input>`, `<select>`, `<textarea>` trong `apps/admin` giảm từ baseline **176** xuống **3**; trong `apps/web` là **0**.
   - Biểu tượng cảm xúc (emoji): Giảm từ **133+** emoji dùng làm icon xuống **0**, 100% chuyển đổi sang vector icon `lucide-react`.
   - Dữ liệu mẫu (mock UI): Duy trì **0** vi phạm; baseline `mock-ui-baseline.json` rỗng tuyệt đối `[]`.
2. **Số đo hiệu năng Lighthouse (Mobile / Desktop)**:
   - LCP mobile chặn ở ngưỡng 3,3 s theo thang mô phỏng Lantern, chủ dự án duyệt ngày 2026-10-21. Banner cookie render ở server nên LCP đo bằng throttling thật trang `/dang-nhap` giảm từ 4468 ms xuống 1864 ms. Desktop giữ ngưỡng 2,0 s (xem `docs/release/DESIGN_PERF_REPORT.md` mục 2.1).
   - Khắc phục triệt để hiện tượng co giãn khung chứa (`max-w-* mx-auto w-full`), đưa CLS trang `/de-thi` từ **0.181** về **0.000**, nâng điểm Performance từ 91 lên **100**.
   - Dung lượng Initial JS được kiểm soát chặt chẽ dưới trần 200 KB gzip (Mobile, nâng từ 180 KB ngày 2026-10-31 do trang chủ có danh mục đề thi) và 200 KB gzip (Desktop).
3. **Kiểm tra 177 lượt đa khung nhìn**:
   - **177 / 177** lượt kiểm tra ĐẠT (100% PASS).
   - **0** lỗi tràn thanh cuộn ngang trên cả 3 độ phân giải.
   - **0** chuỗi khóa dịch thô lọt ra giao diện người dùng.
   - **0** mã tính năng nội bộ hiển thị trước người dùng.
4. **Báo cáo và tư liệu bàn giao**:
   - Báo cáo chi tiết: `docs/release/DESIGN_PERF_REPORT.md`.
   - Kết quả kiểm chứng cấu trúc: `docs/release/design-perf-audit-report.json`.
   - Bộ sưu tập 177 ảnh chụp màn hình thực tế: `docs/release/screenshots/`.
