# Quyết định kỹ thuật I05: Giải quyết xung đột và tích hợp nhánh main sau PR #56 (I06)

- **Mã công việc:** `I05` (Assignment: `I05-15`)
- **Người thực hiện:** Worker `W3` (Giao diện học viên)
- **Nhánh làm việc:** `task/I05`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày thực hiện:** 2026-10-18

---

## 1. Bối cảnh xung đột (Merge Conflict)

Sau khi PR #56 (task I06 - kết nối 13 trang học viên với API thật và bổ sung suite responsive E2E) được merge vào nhánh `main`, nhánh `task/I05` phát sinh xung đột nội dung trên 9 tệp:
1. `apps/web/app/globals.css`: Khai báo `max-width` và `overflow-x` chống cuộn ngang.
2. `apps/web/next.config.mjs`: Rewrites destination giữa biến môi trường `API_INTERNAL_URL` và `API_URL`.
3. `packages/ui/src/components/header.tsx`: Breakpoint ẩn hiện desktop navigation và responsive header.
4. `apps/web/messages/vi.json`, `en.json`, `ja.json`: Dịch thuật mục `profile` và `pricing`.
5. `tests/integration/mock-ui-baseline.json`: Cả hai task đều xóa các route đã hoàn thành khỏi baseline.
6. `tests/playwright/fixtures/staff-auth.fixture.ts`: Header IP phòng chống rate-limit.
7. `tests/playwright/integration.spec.ts`: Suite E2E I05 của phòng thi / thư viện đề và Suite E2E I06 của 13 trang học viên.

---

## 2. Phương án giải quyết kỹ thuật

### 2.1. Layout & Styling (`globals.css`, `header.tsx`)
- Áp dụng `max-width: 100%; overflow-x: hidden;` cho `html, body` để ngăn chặn triệt để thanh cuộn ngang theo tiêu chuẩn chung.
- Giữ breakpoint của header theo PR #53 & PR #56 (`min-width: 2200px` cho thanh nav desktop đầy đủ, hiển thị menu drawer khi dưới 2200px, ẩn text theme toggle ở màn hình <= 1400px), kết hợp bộ điều khiển `rightControls` trong mobile drawer để người dùng trên thiết bị di động vẫn có thể đổi giao diện sáng/tối và ngôn ngữ.

### 2.2. Cấu hình Proxy (`next.config.mjs`)
- Kết hợp cả hai biến môi trường: `process.env.API_INTERNAL_URL || process.env.API_URL || 'http://127.0.0.1:4000'`, đảm bảo ứng dụng chạy ổn định cả trong container Docker staging CI lẫn môi trường dev cục bộ.

### 2.3. Bản địa hóa (`messages/*.json`)
- Đồng bộ hóa các key `profile.title`, `profile.namePlaceholder`, `profile.emailNotice`, `profile.targetLevelDesc` và `pricing.quarterly` theo bản dịch mới nhất từ PR #56 đã được kiểm thử qua trang tài khoản và thanh toán.

### 2.4. Danh mục Mock UI Baseline (`mock-ui-baseline.json`)
- Cả I05 (8 route: `/phong-thi`, `/de-thi`, `/de-thi/[slug]`, `/ket-qua/[id]`, `/lich-su`, `/[level]/de-thi`, `/[level]/de-thi/[session]`, `/sitemap`) và I06 (7 route: `/goi-thanh-vien`, `/lop-hoc`, `/su-kien`, `/thao-luan`, `/so-tay`, `/ke-hoach`, `/luyen-tap`) đều đã hoàn thành kết nối API thật và loại bỏ toàn bộ dữ liệu mẫu.
- Xóa toàn bộ 15 route này khỏi baseline, chỉ giữ lại 16 mục thuộc phạm vi admin và test fixtures chưa xử lý. Lệnh `pnpm check:no-mock-ui` kiểm tra đạt 100% với 0 vi phạm mới.

### 2.5. E2E Test Suite (`integration.spec.ts` & `staff-auth.fixture.ts`)
- Giữ nguyên cả hai suite kiểm thử độc lập:
  - Suite I05: Luồng đăng ký qua Mailpit, xác minh, đăng nhập, làm đề thi thử N5, nộp bài, xem kết quả trên staging CI thật, cùng kiểm tra guest trial và lịch sử thi.
  - Suite I06: Kiểm tra 13 trang học viên kết nối API thật, responsive 390px và 1366px, tri-locale vi/ja/en không còn raw translation key.
- Loại bỏ import trùng lặp `node:fs` và `node:path`.
- Hỗ trợ tham số `customIp` trong fixture xác thực staff account để cô lập rate limit giữa các browser worker.

---

## 3. Kết quả xác minh và cổng kiểm tra

- `pnpm check:no-mock-ui`: ĐẠT (0 vi phạm mới, 16 mục baseline hợp lệ).
- `git status`: Toàn bộ xung đột đã được giải quyết sạch sẽ.
