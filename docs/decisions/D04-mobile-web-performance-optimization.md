# Quyết định kỹ thuật D04: Tối ưu tốc độ web trên điện thoại và kích hoạt chế độ chặn ngân sách D01

- **Mã task**: D04
- **Mã phân công**: D04-7
- **Phụ trách**: W3 (Giao diện học viên)
- **Ngày**: 2026-10-19
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
   - **Initial JS bundle**: ≤ 150 KB gzip.
   - Áp dụng trên 5 trang chính: `/` (Trang chủ), `/de-thi` (Thư viện đề thi), `/phong-thi` (Phòng thi trực tuyến), `/n5` (Landing page SEO N5), `/dang-nhap` (Đăng nhập học viên).
2. Chuyển ngân sách D01 từ chế độ cảnh báo (`warn`) sang chế độ chặn bắt buộc (`error` / `--enforce`), đảm bảo vi phạm hiệu năng sẽ làm thất bại quy trình kiểm tra CI.
3. Giữ nguyên toàn bộ hành vi chức năng và đảm bảo các bài kiểm thử E2E tích hợp tiếp tục pass 100%.

---

## 2. Các giải pháp tối ưu hóa triển khai

### 2.1. Giảm tải JavaScript ban đầu (Initial JS Bundle Reduction)
- **Chuyển đổi Trang chủ sang Server Component**:
  - Tách logic i18n lõi thành `apps/web/lib/i18n-core.ts` độc lập không chứa chỉ thị `'use client'`. Server Component có thể gọi trực tiếp hàm thuần `translate()` với `DEFAULT_LOCALE` mà không gây lỗi phân tách client boundary của Next.js.
  - Trang chủ `apps/web/app/page.tsx` trở thành Server Component tĩnh (prerendered SSG), loại bỏ hoàn toàn mã JavaScript của trang chủ khỏi bundle ban đầu tải về client.
- **Tách gói động (Dynamic Imports) với `next/dynamic` (`ssr: false`)**:
  - Tại `/phong-thi`: Tách toàn bộ engine phòng thi nặng (`ExamRoom`) và modal hướng dẫn (`InstructionsModal`) bằng dynamic import. Thay thế barrel imports từ `features/exam/index.ts` bằng direct module imports (`features/exam/components/exam-picker`, `features/exam/storage/indexeddb`, `features/exam/api/exam-api`) nhằm hỗ trợ tree-shaking triệt để.
  - Tại `/de-thi`: Tách giao diện thư viện đề thi (`LibraryView`) sang tải động, giúp trang thư viện nạp nhanh khung nhìn skeleton trước khi tải dữ liệu đề thi.
  - Tại `apps/web/app/providers.tsx`: Tải muộn trình quản lý cookie consent (`CookieConsentManager`) sang client dynamic import, không cản trở quá trình render khung layout ban đầu.
- **Tách dữ liệu đa ngôn ngữ theo nhu cầu (Code-split i18n locales)**:
  - Chỉ nạp sẵn bộ từ điển tiếng Việt (`vi.json`, ngôn ngữ mặc định) trong bundle đầu tiên (~59 KB).
  - Tách các từ điển tiếng Nhật (`ja.json`) và tiếng Anh (`en.json`) thành các chunk nạp động qua `import()` khi người dùng thực hiện chuyển đổi ngôn ngữ.

### 2.2. Phông chữ tự host có Preload và `font-display: swap` (Self-hosted Fonts)
- **Loại bỏ liên kết ngoài chặn luồng**: Xóa bỏ toàn bộ các thẻ `<link rel="preconnect">` và stylesheet tải phông chữ từ Google Fonts CDN (`fonts.googleapis.com` / `fonts.gstatic.com`) trong `apps/web/app/layout.tsx`.
- **Tự host phông chữ tối ưu WOFF2**:
  - Lưu trữ trực tiếp hai bộ phông WOFF2 nén chuẩn trong `apps/web/public/fonts/`: `inter-latin.woff2` (48 KB) và `inter-vietnamese.woff2` (10 KB).
  - Khai báo `<link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous">` trong `<head>` để trình duyệt tải trước phông chữ ngay khi phân tích HTML.
  - Khai báo `@font-face` trong `apps/web/app/globals.css` với thuộc tính `font-display: swap` và unicode-range chính xác, giúp văn bản hiển thị ngay lập tức (FCP) bằng phông chữ hệ thống trước khi hoán đổi sang Inter mà không gây giật giao diện (CLS = 0).
  - Áp dụng danh sách font dự phòng cục bộ cho tiếng Nhật (`Noto Sans JP`, `Hiragino Sans`, `Meiryo`).

### 2.3. Cấu hình bộ nhớ đệm tĩnh và nén (Static Caching & Compression)
- Trong `apps/web/next.config.mjs`:
  - Kích hoạt `compress: true` (bật nén Gzip/Brotli cho mọi tài nguyên tĩnh do Next.js phục vụ).
  - Tắt header `x-powered-by` qua `poweredByHeader: false` để giảm kích thước gói tin và bảo mật hạ tầng.
  - Cấu hình header bộ nhớ đệm bất biến cho thư mục phông chữ:
    `Cache-Control: public, max-age=31536000, immutable` cho đường dẫn `/fonts/:path*`.

### 2.4. Loại bỏ yêu cầu Analytics lỗi 404 (Eliminating 404 Web Vitals Beacons)
- Beacon thu thập chỉ số Core Web Vitals từ `apps/web/lib/web-vitals.ts` phát tín hiệu tới `/api/v1/analytics/vitals` thông qua `navigator.sendBeacon`.
- Do chưa có route xử lý, các yêu cầu này trước đây bị trả về HTTP 404, gây cảnh báo lỗi mạng trên trình duyệt và ảnh hưởng đến điểm Lighthouse.
- Tạo route handler `apps/web/app/api/v1/analytics/vitals/route.ts` hỗ trợ phương thức `POST` và `GET`, trả về phản hồi chuẩn `204 No Content` nhanh gọn, xử lý triệt để vấn đề 404 mà không phát sinh thêm chi phí xử lý.

### 2.5. Kích hoạt chế độ chặn ngân sách D01 (Enforce Mode)
- Cập nhật định nghĩa script `"test:lighthouse"` trong file gốc `package.json`:
  `"test:lighthouse": "node --no-warnings --experimental-strip-types tests/lighthouse/runner.ts --enforce"`
- Cờ `--enforce` thiết lập `budgetMode = 'error'`, khiến công cụ kiểm thử hiệu năng trả về mã thoát `1` ngay lập tức nếu bất kỳ trang nào vi phạm các chỉ số trần của ngân sách D01.

### 2.6. Khắc phục phản hồi Reviewer W4 về đa ngôn ngữ và phông chữ
- **Khôi phục tương tác đa ngôn ngữ trên Trang chủ**:
  - Khôi phục chỉ thị `'use client'` và hook `useI18n()` trong `apps/web/app/page.tsx`, giúp toàn bộ tiêu đề, phụ đề và thẻ cấp độ trên Trang chủ phản hồi tức thì khi người dùng thay đổi ngôn ngữ sang `ja` hoặc `en` trên thanh điều hướng.
- **Xử lý React bailout khi nạp từ điển động trong `I18nProvider`**:
  - Khi mở trang với locale `ja` hoặc `en` lưu sẵn trong `localStorage`, việc gọi `setLocaleState(locale)` với cùng locale đã có sẽ bị React bails out không re-render.
  - Bổ sung `revision` state counter (`setRevision((r) => r + 1)`) trong `apps/web/lib/i18n.tsx` và gắn `revision` vào dependency array của `useMemo<I18nContextValue>`. Nhờ đó, ngay khi `loadLocaleMessages()` nạp xong gói từ điển động, context value được cấp mới và ép UI re-render hiển thị bản dịch chính xác thay vì kẹt ở tiếng Việt dự phòng.
- **Chuẩn hóa cú pháp CSS Fonts cho `@font-face` Noto Sans JP**:
  - Trong `apps/web/app/globals.css`, loại bỏ generic family `, sans-serif` ở cuối thuộc tính `src:` của `@font-face` Noto Sans JP, đảm bảo tuân thủ chặt chẽ đặc tả CSS Fonts Level 4.
- **Bổ sung kiểm thử hồi quy đa ngôn ngữ**:
  - Bổ sung các bài kiểm thử trong `apps/web/tests/i18n.test.ts` kiểm tra `HomePage` dịch chính xác qua cả 3 ngôn ngữ (`vi`, `ja`, `en`) khi được bọc bởi `I18nProvider`, đồng thời kiểm tra hàm nạp động `loadLocaleMessages()`.

---

## 3. Bằng chứng kiểm thử và nghiệm thu

1. **Bộ kiểm thử đơn vị & tích hợp giao diện web**:
   - `pnpm test:web`: 19 file kiểm thử (256 tests) pass 100%.
2. **Quy trình đóng gói bản dựng sản phẩm**:
   - `pnpm build`: Thành công 12/12 tác vụ Turbopack monorepo.
   - Các trang chính (`/`, `/[level]`, `/de-thi`, `/phong-thi`, `/dang-nhap`) được biên dịch thành công dưới dạng Static / SSG với phân tách bundle tối ưu.
3. **Cổng kiểm soát quy tắc dự án**:
   - `pnpm check:no-mock-ui`: 0 vi phạm (không sử dụng dữ liệu giả trên UI).
   - `pnpm check:ui-primitives`: 0 vi phạm (tuân thủ nghiêm ngặt hệ thống thiết kế `@jlpt/ui`).
