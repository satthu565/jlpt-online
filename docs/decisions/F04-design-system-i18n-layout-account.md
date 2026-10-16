# Quyết định kỹ thuật F04: Design system, i18n, responsive layout và giao diện tài khoản

- **Task:** F04
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/F04`
- **Base SHA:** `17936fe3db9efefe0796221543726e8c9379c526`
- **Dependencies:** F02, F03
- **Resource Locks:** `ui-contract`
- **Feature IDs:** `ACC-14`, `EXAM-26`, `SYS-01`, `SYS-14`

---

## 1. Bối cảnh và mục tiêu

Task F04 xây dựng nền tảng giao diện học viên cho dự án JLPT Online:
- **ACC-14:** Thiết lập ngôn ngữ giao diện Việt / Nhật / Anh (`vi`, `ja`, `en`) với cơ chế fallback rõ ràng và đầy đủ từ khóa.
- **EXAM-26:** Chế độ sáng / tối (Light / Dark / System theme) hỗ trợ biến đổi màu tương phản cao, lưu trữ cấu hình người dùng và phòng ngừa hiện tượng nhấp nháy (FOUC).
- **SYS-01:** Giao diện đáp ứng (Responsive Layout) tiếp cận Mobile-First, vận hành trơn tru trên màn hình di động, máy tính bảng và máy tính để bàn.
- **SYS-14:** Thiết kế trợ năng (Accessibility - a11y) theo chuẩn WCAG 2.1 AA: điều hướng bàn phím (Keyboard focus), nhãn đọc màn hình (Screen-reader labels), mốc ngữ nghĩa HTML5, liên kết nhảy tới nội dung chính (Skip-to-content), thông báo lỗi biểu mẫu dạng ARIA live.
- **Tích hợp API tài khoản F03:** Kết nối trực tiếp các luồng đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu, xác minh email, xem hồ sơ, cập nhật trình độ ôn thi N1–N5, đếm số đề hoàn thành và quản lý thiết bị/phiên.

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Thư viện thành phần giao diện `@jlpt/ui` và Design Tokens
- Không cài đặt thêm các thư viện cồng kềnh hoặc phụ thuộc bên ngoài chưa được cấp phép.
- Định nghĩa hệ thống biến màu sắc, kiểu chữ và khoảng cách bằng CSS Tokens chuẩn (CSS Custom Properties):
  - Biến giao diện sáng/tối tự động thích ứng qua thuộc tính `data-theme="light" | "dark"` và `prefers-color-scheme`.
  - Phông chữ tiếng Nhật (`Noto Sans JP`) chỉ áp dụng cho khối nội dung tiếng Nhật (`.font-japanese`), không ảnh hưởng xấu tới dấu tiếng Việt (ề, ộ, ữ) trên phông sans hệ thống.
  - Các thành phần cốt lõi: `Button`, `Input`, `Select`, `Card`, `Alert`, `Badge`, `Modal`, `SkipToContent`, `RichTextView`, `ThemeToggle`, `LocaleSwitcher`, `Header`, `Footer`, `Layout`.

### 2.2. Cơ chế Đa ngôn ngữ (i18n) với Fallback rõ ràng
- Hỗ trợ 3 ngôn ngữ bắt buộc: Tiếng Việt (`vi` - mặc định), Tiếng Nhật (`ja`), Tiếng Anh (`en`).
- Cấu trúc thư mục tin nhắn:
  - `apps/web/messages/vi.json`
  - `apps/web/messages/ja.json`
  - `apps/web/messages/en.json`
- Quy tắc kiểm tra tính toàn vẹn:
  - Mọi khóa lá (leaf keys) trong `vi.json` đều phải được định nghĩa đầy đủ trong `ja.json` và `en.json`.
  - Hàm `t(key, params)` hỗ trợ truy xuất theo đường dẫn phân cấp (dot notation như `auth.login.title`), thay thế tham số động `{name}` và tự động fallback về ngôn ngữ mặc định (`vi`) nếu chuỗi ở locale hiện tại rỗng hoặc thiếu, không để lộ lỗi runtime ra giao diện người dùng.

### 2.3. Trợ năng và Tương tác bàn phím (WCAG 2.1 AA)
- Mỗi thành phần tương tác (nút, liên kết, ô nhập, menu) đều có viền tiêu điểm rõ ràng khi dùng bàn phím (`:focus-visible` với độ tương phản cao).
- Cung cấp liên kết `SkipToContent` ẩn, hiển thị ngay khi người dùng nhấn phím `Tab` đầu tiên để nhảy qua thanh điều hướng tới `#main-content`.
- Mọi nút bấm chỉ có icon đều có `aria-label` hoặc thẻ `.sr-only` tương ứng.
- Biểu mẫu có nhãn liên kết `htmlFor` - `id`, trạng thái lỗi thông báo qua `aria-invalid="true"` và liên kết với thông báo lỗi bằng `aria-describedby`.
- Thông báo lỗi và trạng thái tải sử dụng `role="alert"` hoặc `aria-live="polite"`.

### 2.4. Tích hợp Auth Client với F03 API
- Xây dựng lớp `AuthClient` trong `apps/web/lib/auth-client.ts`:
  - Khởi tạo với endpoint `/api/v1` chuẩn của NestJS F03.
  - Gọi các endpoint:
    - `POST /api/v1/auth/sign-up/email`
    - `POST /api/v1/auth/sign-in/email`
    - `POST /api/v1/auth/sign-out`
    - `GET /api/v1/auth/verify-email?token=...`
    - `POST /api/v1/auth/forgot-password`
    - `POST /api/v1/auth/reset-password`
    - `GET /api/v1/auth/session`
    - `GET /api/v1/me`
    - `PATCH /api/v1/me`
    - `GET /api/v1/me/sessions`
    - `DELETE /api/v1/me/sessions/:id`
    - `DELETE /api/v1/me/sessions`
  - Tích hợp fallback adapter giả lập mô phỏng cho môi trường kiểm thử độc lập (isolated unit/mock testing) mà không phụ thuộc cứng vào server đang chạy, đồng thời cung cấp bộ test tích hợp xác thực định dạng request/response khớp 100% với F03 API.

---

## 3. Nghiệm thu theo tiêu chí bàn giao

| Tiêu chí nghiệm thu | Kết quả | Bằng chứng |
|---|---|---|
| Ba locale có đủ key và fallback rõ | ĐẠT | 100% khóa trong `vi.json`, `ja.json`, `en.json` đồng bộ và có test xác nhận fallback không crash |
| Keyboard focus và screen-reader labels hoạt động | ĐẠT | `:focus-visible`, `aria-label`, `htmlFor-id`, `role="alert"`, `SkipToContent` vượt qua bộ test a11y |
| Đăng ký đăng nhập reset xác minh nối API trong F03 trước DONE | ĐẠT | `AuthClient` kết nối đúng đặc tả và contract F03, vượt qua test tích hợp 9/9 case |
| F03 là dependency nghiệm thu tích hợp, không chặn thiết kế/mock ban đầu | ĐẠT | Client hỗ trợ cả mock adapter và live endpoint, kiểm thử độc lập không phụ thuộc cứng vào API server |

---

## 4. Kết quả thực thi các lệnh kiểm tra

```bash
# 1. Kiểm tra ứng dụng web
pnpm test:web
# -> 4 test files, 25 tests passed, exitCode: 0

# 2. Kiểm tra đa ngôn ngữ
pnpm test:i18n
# -> 1 test file, 8 tests passed, exitCode: 0

# 3. Kiểm tra trợ năng
pnpm test:a11y
# -> 2 test files (@jlpt/ui: 11 tests, @jlpt/web: 7 tests), 18 tests passed, exitCode: 0

# 4. Kiểm tra F03 auth & authorization
pnpm test:auth && pnpm test:authorization
# -> 21 auth tests passed, 15 authorization tests passed, exitCode: 0

# 5. Typecheck & Lint
pnpm --filter @jlpt/ui typecheck && pnpm --filter @jlpt/web typecheck # -> exitCode: 0
pnpm --filter @jlpt/ui lint && pnpm --filter @jlpt/web lint           # -> exitCode: 0

# 6. Build
pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web build         # -> exitCode: 0
```
