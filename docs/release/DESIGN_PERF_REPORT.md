# Báo Cáo Nghiệm Thu Giao Diện Thống Nhất Và Hiệu Năng (Task D05)

> **Mã công việc:** D05 — Nghiệm thu giao diện thống nhất và hiệu năng  
> **Thực hiện:** W1 (chụp ảnh, kiểm tra 59 trang, cổng CI); Claude hoàn tất (LCP, số đo Lighthouse, ngân sách)  
> **Nhánh thực hiện:** `feat/d05-ui-perf`  
> **Ngày thực hiện:** 2026-10-20 – 2026-10-21  
> **Khóa tài nguyên:** `ci-workflow`, `staging-deploy`  
> **Trạng thái:** HOÀN THÀNH TOÀN DIỆN (PASS / READY FOR REVIEW)  
> **Cổng chất lượng:** `check:ui-primitives`, `check:no-mock-ui`, `test:lighthouse` (enforced), `jlpt-stage-test check-all`

---

## 1. Tóm Tắt Nghiệm Thu

Chiến dịch thống nhất giao diện theo hệ thống thiết kế `@jlpt/ui` (chuẩn hóa trên nền `shadcn/ui`, `Tailwind CSS`, và icon vector `lucide-react`) cùng chuỗi tối ưu hóa hiệu năng trải dài từ D00, D02, D03, D07, D08, D09, D10 đã hoàn tất đồng bộ trên toàn bộ nền tảng JLPT Online. 

Task **D05** là cửa ngõ nghiệm thu độc lập cuối cùng của Ngày 9, tiến hành kiểm chứng tự động toàn diện trên **59 trang giao diện** (29 trang học viên và 30 trang quản trị nhân sự) tại cả **3 độ phân giải chuẩn** (390px, 1366px, 1920px), đồng thời biến toàn bộ các cổng kiểm tra giao diện và hiệu năng thành rào chắn bắt buộc vĩnh viễn trong CI.

### Kết Quả 4 Tiêu Chí Nghiệm Thu Bắt Buộc

| STT | Tiêu chí nghiệm thu | Kết quả | Bằng chứng thực tế |
|:---:|:---|:---:|:---|
| 1 | `docs/release/DESIGN_PERF_REPORT.md` có số đo trước/sau và ảnh từng trang | **ĐẠT** | Báo cáo đầy đủ bảng so sánh số đo hiệu năng Lighthouse, số đo mã nguồn giao diện, và 177 ảnh chụp màn hình thực tế tại 3 khung nhìn. |
| 2 | `tests/lighthouse/budgets.ts` không còn chỉ số chỉ cảnh báo | **ĐẠT** | Đã loại bỏ hoàn toàn `LCP` khỏi `WARN_ONLY_METRICS` (`new Set<string>()`). LCP mobile chặn ở ngưỡng 3300 ms theo cách đo mô phỏng, chủ dự án duyệt (lý do ở mục 2.1). Bộ kiểm thử `tests/integration/lighthouse-runner.test.ts` (20/20 test) xác nhận LCP chặn CI. |
| 3 | Không trang nào cuộn ngang, hiện key dịch thô hoặc mã tính năng nội bộ | **ĐẠT** | Kiểm chứng tự động **177 / 177 lượt** (59 trang × 3 viewports): **0** lỗi tràn ngang, **0** key dịch thô, **0** mã tính năng nội bộ dạng `(EXPL-01..09)`, `ADM-01`. |
| 4 | `check:ui-primitives` và `test:lighthouse` chặn trong CI | **ĐẠT** | Đã tích hợp `pnpm check:ui-primitives` vào `.github/workflows/ci.yml` và `staging.yml`; cấu hình `LIGHTHOUSE_BUDGET_MODE: error` trong `staging.yml`. |

---

## 2. Bảng Số Đo Trước / Sau Chi Tiết (Before vs After)

### 2.1. Số đo hiệu năng Lighthouse (cổng CI staging)

Ngân sách sau D05, chặn CI ở chế độ `LIGHTHOUSE_BUDGET_MODE=error`, không còn chỉ số nào chỉ cảnh báo:

- **Mobile** (mô phỏng Lantern, CPU x4, RTT 150 ms):
  - LCP < 3300 ms, CLS < 0,1, TBT < 200 ms.
  - Initial JS <= 180 KB gzip.
  - Performance >= 70, Accessibility >= 95, SEO = 100.
- **Desktop:**
  - LCP < 2000 ms, CLS < 0,1, TBT < 150 ms.
  - Initial JS <= 200 KB.
  - Performance >= 98, Accessibility >= 95, SEO = 100.

Số đo dưới đây đều lấy từ CI staging trên GitHub, không lấy từ máy ảo:

- **Gốc:** commit `f53bd8a`, ngày 18/10, lưu ở `docs/release/performance-baseline.json`.
- **Main trước D05:** lần chạy Staging 39478373258 trên `732192e`, ngày 20/10.
- **D05:** lần chạy Staging của PR này (`39494783923, PR #106 trên `5f3a82f``).

#### LCP mobile (ms)

| Trang | Gốc 18/10 | Main trước D05 | D05 |
|:---|---:|---:|---:|
| Trang chủ `/` | 2767 | 2618 | 2810 |
| Thư viện đề `/de-thi` | 4580 | 2971 | 2109 |
| Phòng thi `/phong-thi` | 5029 | 2874 | 2414 |
| Cấp độ N5 `/n5` | 4283 | 2594 | 2667 |
| Đăng nhập `/dang-nhap` | 4283 | 3077 | 2803 |
| Admin `/login` | 2193 | 1817 | 2395 |

Lần chạy của D05 đạt tất cả ngân sách, không có vi phạm nào ở cả mobile và desktop.

- **Mobile:**
  - Performance 96–99.
  - TBT 44–82 ms.
  - CLS 0,000.
- **Desktop:**
  - Performance 100.
  - LCP 519–604 ms.
  - TBT 0 ms.
  - CLS <= 0,010.
- **Admin `/login`:** LCP mobile dao động giữa hai lần chạy, 1817 ms và 2395 ms. D05 không đổi gì ở admin, nên đây là độ dao động của máy CI.

#### Các chỉ số khác của main trước D05

- **Mobile:**
  - Performance 93–99.
  - TBT 98–113 ms.
  - CLS 0,000.
  - Initial JS trong ngưỡng 180 KB: trang chủ 164,6 KB, `/de-thi` 172,9 KB, `/phong-thi` 166,8 KB (đo ở máy với cùng preset).
- **Desktop:**
  - Performance 100.
  - LCP 545–683 ms.
  - TBT 0–1 ms.
  - CLS <= 0,010.

#### Vì sao LCP mobile dùng ngưỡng 3,3 s

Ở các trang chính, phần tử LCP là chữ được render sẵn ở server.

- **Với các trang công khai:** phần tử LCP là đoạn mô tả của banner cookie, vì banner là khối chữ lớn nhất ở màn hình 390 px.
- **Với LCP, mô phỏng Lantern của Lighthouse coi mọi request diễn ra trước lần vẽ LCP là chặn**, kể cả các script `async` của Next.js. Với FCP thì không. Vì vậy LCP mô phỏng cộng thêm toàn bộ thời gian tải và chạy khoảng 165 KB JS framework, dù chữ đã được vẽ trước khi JS chạy.
- **Kiểm chứng bằng throttling áp dụng thật** (`throttlingMethod: devtools`, cùng preset mobile), trang `/dang-nhap`:

| | FCP | LCP |
|:---|---:|---:|
| Trước D05: banner chỉ dựng ở client sau khi JS chạy | 1883 ms | **4468 ms** |
| D05: banner render ở server, script trong `<head>` ẩn banner trước lần vẽ đầu nếu người dùng đã chọn | 1742 ms | **1864 ms** |

Muốn đạt 2,5 s theo cách mô phỏng thì phải cắt khoảng 40% JS framework. Chủ dự án chọn ngưỡng chặn 3,3 s theo thang mô phỏng (ngày 21/10/2026). Ngưỡng này chặn được trang chậm đi mà không đòi một mục tiêu cách đo không phản ánh đúng.

### 2.2. Số Đo Mã Nguồn Và Chuẩn Hóa Design System

| Hạng mục kiểm tra | Công cụ kiểm tra | Trạng thái Trước (Baseline) | Trạng thái Sau (D05 Actual) | Giảm thiểu | Đánh giá |
|:---|:---|:---:|:---:|:---:|:---:|
| **Inline styles (`style={{}}`)** trong `apps/web` | `check:ui-primitives` (`check-inline-styles.ts`) | **661** chỗ (53 files) | **0** chỗ viết tay | **-100%** | **ĐẠT** (Chỉ giữ lại tiến độ chạy có `ui-allow-style`) |
| **Thẻ HTML nguyên thủy** trong `apps/admin` | `check:ui-primitives` (`check-ui-primitives.ts`) | **176** thẻ (117 button, 39 input, 12 select, 8 textarea) | **3** thẻ | **-98.3%** | **ĐẠT** (Dưới ngưỡng trần ratchet) |
| **Thẻ HTML nguyên thủy** trong `apps/web` | `check:ui-primitives` (`check-ui-primitives.ts`) | 0 | **0** thẻ | **0** | **ĐẠT** |
| **Emoji làm biểu tượng giao diện** | Kiểm toán mã nguồn & UI audit | **133+** emoji | **0** emoji | **-100%** | **ĐẠT** (Chuyển hoàn toàn sang Lucide React SVG) |
| **Mã tính năng nội bộ UI** | `apps/admin/scripts/check-no-internal-codes.ts` | Tồn tại `(EXPL-01..09)`, `ADM-01`... | **0** mã nội bộ | **-100%** | **ĐẠT** (Check pass) |
| **Dữ liệu giả / Mẫu trong UI** | `check:no-mock-ui` (`mock-ui-baseline.json`) | Baseline cũ nhiều mục | **0** vi phạm (`[]` rỗng tuyệt đối) | **-100%** | **ĐẠT** (Khóa chặn vĩnh viễn) |

---

## 3. Kết Quả Kiểm Chứng Đa Độ Phân Giải (177 Lượt Kiểm Tra)

Dữ liệu kiểm toán tự động được xuất từ `docs/release/design-perf-audit-report.json`:
- **Tổng số trang kiểm tra:** 59 trang (29 Web + 30 Admin).
- **Các độ phân giải đo đạc:**
  1. `390px × 844px` (Mobile standard)
  2. `1366px × 768px` (Desktop standard)
  3. `1920px × 1080px` (Full HD desktop)
- **Tổng số lượt kiểm tra độc lập:** `59 × 3 = 177 audits`.
- **Tổng số lượt ĐẠT:** **177 / 177 (100% PASS)**.
- **Lỗi tràn thanh cuộn ngang (Horizontal Overflow):** **0 / 177**.
- **Khóa dịch thô (Unparsed i18n Keys):** **0 / 177**.
- **Mã tính năng nội bộ (Internal Feature Codes):** **0 / 177**.

---

## 4. Đối Sánh Trực Quan Trước / Sau (Visual Before & After Gallery)

### 4.1. Phân Hệ D08: Khung Trang & Các Trang Chính

Bộ ảnh chụp trước/sau lưu trữ tại `docs/release/d08/`:

| Trang | Khung nhìn 390px (Mobile) | Khung nhìn 1366px (Desktop) |
|:---|:---:|:---:|
| **Trang chủ (`/`)** | Trước: `docs/release/d08/before-home-390.png`<br>Sau: `docs/release/d08/after-home-390.png` | Trước: `docs/release/d08/before-home-1366.png`<br>Sau: `docs/release/d08/after-home-1366.png` |
| **Đăng nhập (`/dang-nhap`)** | Trước: `docs/release/d08/before-login-390.png`<br>Sau: `docs/release/d08/after-login-390.png` | Trước: `docs/release/d08/before-login-1366.png`<br>Sau: `docs/release/d08/after-login-1366.png` |
| **Đăng ký (`/dang-ky`)** | Trước: `docs/release/d08/before-register-390.png`<br>Sau: `docs/release/d08/after-register-390.png` | Trước: `docs/release/d08/before-register-1366.png`<br>Sau: `docs/release/d08/after-register-1366.png` |
| **Thư viện đề (`/de-thi`)** | Trước: `docs/release/d08/before-library-390.png`<br>Sau: `docs/release/d08/after-library-390.png` | Trước: `docs/release/d08/before-library-1366.png`<br>Sau: `docs/release/d08/after-library-1366.png` |
| **Cấp độ N5 (`/n5`)** | Trước: `docs/release/d08/before-n5-390.png`<br>Sau: `docs/release/d08/after-n5-390.png` | Trước: `docs/release/d08/before-n5-1366.png`<br>Sau: `docs/release/d08/after-n5-1366.png` |
| **Liên hệ (`/lien-he`)** | Trước: `docs/release/d08/before-contact-390.png`<br>Sau: `docs/release/d08/after-contact-390.png` | Trước: `docs/release/d08/before-contact-1366.png`<br>Sau: `docs/release/d08/after-contact-1366.png` |

---

### 4.2. Phân Hệ D09: Trang Học Tập, Luyện Tập, Kế Hoạch, Kết Quả

Bộ ảnh chụp trước/sau lưu trữ tại `docs/release/d09/`:

| Trang | Khung nhìn 390px (Mobile) | Khung nhìn 1366px (Desktop) |
|:---|:---:|:---:|
| **Sổ tay học tập (`/so-tay`)** | Trước: `docs/release/d09/before-notebook-390.png`<br>Sau: `docs/release/d09/after-notebook-390.png` | Trước: `docs/release/d09/before-notebook-1366.png`<br>Sau: `docs/release/d09/after-notebook-1366.png` |
| **Luyện tập linh hoạt (`/luyen-tap`)** | Trước: `docs/release/d09/before-practice-390.png`<br>Sau: `docs/release/d09/after-practice-390.png` | Trước: `docs/release/d09/before-practice-1366.png`<br>Sau: `docs/release/d09/after-practice-1366.png` |
| **Kế hoạch học tập (`/ke-hoach`)** | Trước: `docs/release/d09/before-planner-390.png`<br>Sau: `docs/release/d09/after-planner-390.png` | Trước: `docs/release/d09/before-planner-1366.png`<br>Sau: `docs/release/d09/after-planner-1366.png` |
| **Thống kê năng lực (`/thong-ke`)** | Trước: `docs/release/d09/before-analytics-390.png`<br>Sau: `docs/release/d09/after-analytics-390.png` | Trước: `docs/release/d09/before-analytics-1366.png`<br>Sau: `docs/release/d09/after-analytics-1366.png` |
| **Kho từ vựng (`/tu-vung`)** | Trước: `docs/release/d09/before-vocab-390.png`<br>Sau: `docs/release/d09/after-vocab-390.png` | Trước: `docs/release/d09/before-vocab-1366.png`<br>Sau: `docs/release/d09/after-vocab-1366.png` |
| **Kho ngữ pháp (`/ngu-phap`)** | Trước: `docs/release/d09/before-grammar-390.png`<br>Sau: `docs/release/d09/after-grammar-390.png` | Trước: `docs/release/d09/before-grammar-1366.png`<br>Sau: `docs/release/d09/after-grammar-1366.png` |
| **Tần suất từ vựng (`/thong-ke-tu-vung`)** | Trước: `docs/release/d09/before-freq-390.png`<br>Sau: `docs/release/d09/after-freq-390.png` | Trước: `docs/release/d09/before-freq-1366.png`<br>Sau: `docs/release/d09/after-freq-1366.png` |
| **Lịch sử làm bài (`/lich-su`)** | Trước: `docs/release/d09/before-history-390.png`<br>Sau: `docs/release/d09/after-history-390.png` | Trước: `docs/release/d09/before-history-1366.png`<br>Sau: `docs/release/d09/after-history-1366.png` |

---

### 4.3. Phân Hệ D10: Tài Khoản, Gói Học, Lớp Học, Cộng Đồng

Bộ ảnh chụp trước/sau lưu trữ tại `docs/release/screenshots/`:

| Trang | Khung nhìn 390px (Mobile) | Khung nhìn 1366px (Desktop) |
|:---|:---:|:---:|
| **Tài khoản & Cài đặt (`/tai-khoan`)** | Trước: `docs/release/screenshots/tai-khoan-before-390px.png`<br>Sau: `docs/release/screenshots/tai-khoan-after-390px.png` | Trước: `docs/release/screenshots/tai-khoan-before-1366px.png`<br>Sau: `docs/release/screenshots/tai-khoan-after-1366px.png` |
| **Lịch sử thi (`/lich-su`)** | Trước: `docs/release/screenshots/lich-su-before-390px.png`<br>Sau: `docs/release/screenshots/lich-su-after-390px.png` | Trước: `docs/release/screenshots/lich-su-before-1366px.png`<br>Sau: `docs/release/screenshots/lich-su-after-1366px.png` |
| **Gói thành viên & Bảng giá (`/goi-thanh-vien`)** | Trước: `docs/release/screenshots/goi-thanh-vien-before-390px.png`<br>Sau: `docs/release/screenshots/goi-thanh-vien-after-390px.png` | Trước: `docs/release/screenshots/goi-thanh-vien-before-1366px.png`<br>Sau: `docs/release/screenshots/goi-thanh-vien-after-1366px.png` |
| **Lớp học & Trung tâm (`/lop-hoc`)** | Trước: `docs/release/screenshots/lop-hoc-before-390px.png`<br>Sau: `docs/release/screenshots/lop-hoc-after-390px.png` | Trước: `docs/release/screenshots/lop-hoc-before-1366px.png`<br>Sau: `docs/release/screenshots/lop-hoc-after-1366px.png` |
| **Thảo luận cộng đồng (`/thao-luan`)** | Trước: `docs/release/screenshots/thao-luan-before-390px.png`<br>Sau: `docs/release/screenshots/thao-luan-after-390px.png` | Trước: `docs/release/screenshots/thao-luan-before-1366px.png`<br>Sau: `docs/release/screenshots/thao-luan-after-1366px.png` |
| **Sự kiện thi đấu (`/su-kien`)** | Trước: `docs/release/screenshots/su-kien-before-390px.png`<br>Sau: `docs/release/screenshots/su-kien-after-390px.png` | Trước: `docs/release/screenshots/su-kien-before-1366px.png`<br>Sau: `docs/release/screenshots/su-kien-after-1366px.png` |
| **Chia sẻ kết quả (`/chia-se/ket-qua/demo`)** | Trước: `docs/release/screenshots/chia-se-ket-qua-before-390px.png`<br>Sau: `docs/release/screenshots/chia-se-ket-qua-after-390px.png` | Trước: `docs/release/screenshots/chia-se-ket-qua-before-1366px.png`<br>Sau: `docs/release/screenshots/chia-se-ket-qua-after-1366px.png` |

---

## 5. Danh Mục Ảnh Chụp Màn Hình 59 Trang Ở 3 Khung Nhìn (390px, 1366px, 1920px)

Toàn bộ 177 tệp ảnh chụp thực tế được lưu trữ tại `docs/release/screenshots/web/` và `docs/release/screenshots/admin/`.

### 5.1. Cổng Thông Tin Học Viên (Web Portal - 29 Trang)

| # | Tuyến đường (Route) | Tên trang | Mobile (390px) | Desktop (1366px) | Widescreen (1920px) | Trạng thái |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| 1 | `/` | Trang chủ (Home) | `web-home-390px.png` | `web-home-1366px.png` | `web-home-1920px.png` | **PASS (0 overflow)** |
| 2 | `/dang-nhap` | Đăng nhập | `web-dang-nhap-390px.png` | `web-dang-nhap-1366px.png` | `web-dang-nhap-1920px.png` | **PASS (0 overflow)** |
| 3 | `/dang-ky` | Đăng ký | `web-dang-ky-390px.png` | `web-dang-ky-1366px.png` | `web-dang-ky-1920px.png` | **PASS (0 overflow)** |
| 4 | `/quen-mat-khau` | Quên mật khẩu | `web-quen-mat-khau-390px.png` | `web-quen-mat-khau-1366px.png` | `web-quen-mat-khau-1920px.png` | **PASS (0 overflow)** |
| 5 | `/de-thi` | Thư viện đề | `web-de-thi-390px.png` | `web-de-thi-1366px.png` | `web-de-thi-1920px.png` | **PASS (0 overflow)** |
| 6 | `/de-thi/demo-n5-1` | Chi tiết đề | `web-de-thi-detail-390px.png` | `web-de-thi-detail-1366px.png` | `web-de-thi-detail-1920px.png` | **PASS (0 overflow)** |
| 7 | `/phong-thi` | Phòng thi | `web-phong-thi-390px.png` | `web-phong-thi-1366px.png` | `web-phong-thi-1920px.png` | **PASS (0 overflow)** |
| 8 | `/luyen-tap` | Luyện tập | `web-luyen-tap-390px.png` | `web-luyen-tap-1366px.png` | `web-luyen-tap-1920px.png` | **PASS (0 overflow)** |
| 9 | `/tu-vung` | Kho từ vựng | `web-tu-vung-390px.png` | `web-tu-vung-1366px.png` | `web-tu-vung-1920px.png` | **PASS (0 overflow)** |
| 10 | `/ngu-phap` | Kho ngữ pháp | `web-ngu-phap-390px.png` | `web-ngu-phap-1366px.png` | `web-ngu-phap-1920px.png` | **PASS (0 overflow)** |
| 11 | `/thong-ke-tu-vung` | Tần suất từ vựng | `web-thong-ke-tu-vung-390px.png` | `web-thong-ke-tu-vung-1366px.png` | `web-thong-ke-tu-vung-1920px.png` | **PASS (0 overflow)** |
| 12 | `/so-tay` | Sổ tay & SRS | `web-so-tay-390px.png` | `web-so-tay-1366px.png` | `web-so-tay-1920px.png` | **PASS (0 overflow)** |
| 13 | `/ke-hoach` | Kế hoạch học | `web-ke-hoach-390px.png` | `web-ke-hoach-1366px.png` | `web-ke-hoach-1920px.png` | **PASS (0 overflow)** |
| 14 | `/thong-ke` | Thống kê năng lực | `web-thong-ke-390px.png` | `web-thong-ke-1366px.png` | `web-thong-ke-1920px.png` | **PASS (0 overflow)** |
| 15 | `/thao-luan` | Diễn đàn | `web-thao-luan-390px.png` | `web-thao-luan-1366px.png` | `web-thao-luan-1920px.png` | **PASS (0 overflow)** |
| 16 | `/su-kien` | Sự kiện | `web-su-kien-390px.png` | `web-su-kien-1366px.png` | `web-su-kien-1920px.png` | **PASS (0 overflow)** |
| 17 | `/lop-hoc` | Lớp học | `web-lop-hoc-390px.png` | `web-lop-hoc-1366px.png` | `web-lop-hoc-1920px.png` | **PASS (0 overflow)** |
| 18 | `/goi-thanh-vien` | Gói thành viên | `web-goi-thanh-vien-390px.png` | `web-goi-thanh-vien-1366px.png` | `web-goi-thanh-vien-1920px.png` | **PASS (0 overflow)** |
| 19 | `/tai-khoan` | Tài khoản | `web-tai-khoan-390px.png` | `web-tai-khoan-1366px.png` | `web-tai-khoan-1920px.png` | **PASS (0 overflow)** |
| 20 | `/lich-su` | Lịch sử thi | `web-lich-su-390px.png` | `web-lich-su-1366px.png` | `web-lich-su-1920px.png` | **PASS (0 overflow)** |
| 21 | `/gioi-thieu` | Giới thiệu | `web-gioi-thieu-390px.png` | `web-gioi-thieu-1366px.png` | `web-gioi-thieu-1920px.png` | **PASS (0 overflow)** |
| 22 | `/chinh-sach` | Chính sách | `web-chinh-sach-390px.png` | `web-chinh-sach-1366px.png` | `web-chinh-sach-1920px.png` | **PASS (0 overflow)** |
| 23 | `/chinh-sach-bao-mat` | Bảo mật | `web-chinh-sach-bao-mat-390px.png` | `web-chinh-sach-bao-mat-1366px.png` | `web-chinh-sach-bao-mat-1920px.png` | **PASS (0 overflow)** |
| 24 | `/dieu-khoan` | Điều khoản | `web-dieu-khoan-390px.png` | `web-dieu-khoan-1366px.png` | `web-dieu-khoan-1920px.png` | **PASS (0 overflow)** |
| 25 | `/faq` | Hỏi đáp | `web-faq-390px.png` | `web-faq-1366px.png` | `web-faq-1920px.png` | **PASS (0 overflow)** |
| 26 | `/ho-tro` | Trợ giúp | `web-ho-tro-390px.png` | `web-ho-tro-1366px.png` | `web-ho-tro-1920px.png` | **PASS (0 overflow)** |
| 27 | `/lien-he` | Liên hệ | `web-lien-he-390px.png` | `web-lien-he-1366px.png` | `web-lien-he-1920px.png` | **PASS (0 overflow)** |
| 28 | `/n5` | SEO N5 | `web-n5-level-390px.png` | `web-n5-level-1366px.png` | `web-n5-level-1920px.png` | **PASS (0 overflow)** |
| 29 | `/n5/de-thi` | SEO Đề thi N5 | `web-n5-de-thi-390px.png` | `web-n5-de-thi-1366px.png` | `web-n5-de-thi-1920px.png` | **PASS (0 overflow)** |

---

### 5.2. Cổng Quản Trị Hệ Thống (Admin Portal - 30 Trang)

| # | Tuyến đường (Route) | Tên phân hệ quản trị | Mobile (390px) | Desktop (1366px) | Widescreen (1920px) | Trạng thái |
|:---:|:---|:---|:---:|:---:|:---:|:---:|
| 1 | `/` | Dashboard | `admin-dashboard-390px.png` | `admin-dashboard-1366px.png` | `admin-dashboard-1920px.png` | **PASS (0 overflow)** |
| 2 | `/users` | Người dùng & Phân quyền | `admin-users-390px.png` | `admin-users-1366px.png` | `admin-users-1920px.png` | **PASS (0 overflow)** |
| 3 | `/audit-logs` | Nhật ký kiểm toán | `admin-audit-logs-390px.png` | `admin-audit-logs-1366px.png` | `admin-audit-logs-1920px.png` | **PASS (0 overflow)** |
| 4 | `/exams` | Danh mục đề thi | `admin-exams-390px.png` | `admin-exams-1366px.png` | `admin-exams-1920px.png` | **PASS (0 overflow)** |
| 5 | `/exams/schedules` | Lịch mở đề thi | `admin-exams-schedules-390px.png` | `admin-exams-schedules-1366px.png` | `admin-exams-schedules-1920px.png` | **PASS (0 overflow)** |
| 6 | `/exams/scoring` | Quy đổi điểm thi | `admin-exams-scoring-390px.png` | `admin-exams-scoring-1366px.png` | `admin-exams-scoring-1920px.png` | **PASS (0 overflow)** |
| 7 | `/exams/mixed` | Quản lý đề trộn | `admin-exams-mixed-390px.png` | `admin-exams-mixed-1366px.png` | `admin-exams-mixed-1920px.png` | **PASS (0 overflow)** |
| 8 | `/imports` | Nạp gói đề thi | `admin-imports-390px.png` | `admin-imports-1366px.png` | `admin-imports-1920px.png` | **PASS (0 overflow)** |
| 9 | `/reviews` | Duyệt đề thi (4 mắt) | `admin-reviews-390px.png` | `admin-reviews-1366px.png` | `admin-reviews-1920px.png` | **PASS (0 overflow)** |
| 10 | `/reviews/explanations`| Duyệt lời giải/audio | `admin-reviews-explanations-390px.png` | `admin-reviews-explanations-1366px.png` | `admin-reviews-explanations-1920px.png` | **PASS (0 overflow)** |
| 11 | `/questions` | Ngân hàng câu hỏi | `admin-questions-390px.png` | `admin-questions-1366px.png` | `admin-questions-1920px.png` | **PASS (0 overflow)** |
| 12 | `/vocab` | Ngân hàng từ vựng | `admin-vocab-390px.png` | `admin-vocab-1366px.png` | `admin-vocab-1920px.png` | **PASS (0 overflow)** |
| 13 | `/blueprints` | Cấu trúc đề chuẩn | `admin-blueprints-390px.png` | `admin-blueprints-1366px.png` | `admin-blueprints-1920px.png` | **PASS (0 overflow)** |
| 14 | `/schedules` | Lịch thi JLPT | `admin-schedules-390px.png` | `admin-schedules-1366px.png` | `admin-schedules-1920px.png` | **PASS (0 overflow)** |
| 15 | `/scoring-tables` | Bảng điểm chuẩn | `admin-scoring-tables-390px.png` | `admin-scoring-tables-1366px.png` | `admin-scoring-tables-1920px.png` | **PASS (0 overflow)** |
| 16 | `/reports` | Báo cáo hệ thống | `admin-reports-390px.png` | `admin-reports-1366px.png` | `admin-reports-1920px.png` | **PASS (0 overflow)** |
| 17 | `/reports/content` | Báo cáo nội dung | `admin-reports-content-390px.png` | `admin-reports-content-1366px.png` | `admin-reports-content-1920px.png` | **PASS (0 overflow)** |
| 18 | `/reports/revenue` | Báo cáo doanh thu | `admin-reports-revenue-390px.png` | `admin-reports-revenue-1366px.png` | `admin-reports-revenue-1920px.png` | **PASS (0 overflow)** |
| 19 | `/commercial/plans` | Quản lý gói cước | `admin-commercial-plans-390px.png` | `admin-commercial-plans-1366px.png` | `admin-commercial-plans-1920px.png` | **PASS (0 overflow)** |
| 20 | `/commercial/payments`| Giao dịch thanh toán | `admin-commercial-payments-390px.png` | `admin-commercial-payments-1366px.png` | `admin-commercial-payments-1920px.png` | **PASS (0 overflow)** |
| 21 | `/commercial/refunds` | Hoàn tiền | `admin-commercial-refunds-390px.png` | `admin-commercial-refunds-1366px.png` | `admin-commercial-refunds-1920px.png` | **PASS (0 overflow)** |
| 22 | `/commercial/reconciliation`| Đối soát cổng | `admin-commercial-reconciliation-390px.png`| `admin-commercial-reconciliation-1366px.png`| `admin-commercial-reconciliation-1920px.png`| **PASS (0 overflow)** |
| 23 | `/experiments` | Thử nghiệm A/B | `admin-experiments-390px.png` | `admin-experiments-1366px.png` | `admin-experiments-1920px.png` | **PASS (0 overflow)** |
| 24 | `/media` | Kho media | `admin-media-390px.png` | `admin-media-1366px.png` | `admin-media-1920px.png` | **PASS (0 overflow)** |
| 25 | `/cms` | Quản lý CMS | `admin-cms-390px.png` | `admin-cms-1366px.png` | `admin-cms-1920px.png` | **PASS (0 overflow)** |
| 26 | `/moderation/ai` | Kiểm duyệt AI | `admin-moderation-ai-390px.png` | `admin-moderation-ai-1366px.png` | `admin-moderation-ai-1920px.png` | **PASS (0 overflow)** |
| 27 | `/settings` | Cài đặt hệ thống | `admin-settings-390px.png` | `admin-settings-1366px.png` | `admin-settings-1920px.png` | **PASS (0 overflow)** |
| 28 | `/settings/notifications`| Cấu hình thông báo | `admin-settings-notifications-390px.png`| `admin-settings-notifications-1366px.png`| `admin-settings-notifications-1920px.png`| **PASS (0 overflow)** |
| 29 | `/settings/org` | Cấu hình tổ chức | `admin-settings-org-390px.png` | `admin-settings-org-1366px.png` | `admin-settings-org-1920px.png` | **PASS (0 overflow)** |
| 30 | `/settings/backup` | Cấu hình sao lưu | `admin-settings-backup-390px.png` | `admin-settings-backup-1366px.png` | `admin-settings-backup-1920px.png` | **PASS (0 overflow)** |

---

## 6. Cổng Khóa Chặn CI Vĩnh Viễn

Để đảm bảo không bao giờ tái diễn tình trạng vỡ layout, tràn ngang màn hình, tái xuất hiện inline styles hoặc suy giảm hiệu năng:

1. **Khóa chặn trong `.github/workflows/ci.yml`**:
   - `pnpm check:ui-primitives`: Chặn mọi PR nếu phát sinh thẻ nguyên thủy HTML mới vượt ratchet limit hoặc tăng bất kỳ `style={{}}` viết tay nào.
   - `pnpm check:no-mock-ui`: Chặn mọi PR nếu đưa dữ liệu giả hoặc sửa `tests/integration/mock-ui-baseline.json` khác rỗng.
2. **Khóa chặn trong `.github/workflows/staging.yml`**:
   - `pnpm test:lighthouse`: Chạy với biến môi trường `LIGHTHOUSE_BUDGET_MODE: error` trên các container staging độc lập.
   - `tests/lighthouse/budgets.ts`: Danh sách `WARN_ONLY_METRICS` được duy trì rỗng vĩnh viễn (`new Set<string>()`). Mọi vi phạm LCP, CLS, TBT, Initial JS, điểm Performance/A11y/SEO đều làm trượt workflow với exit code 1.
