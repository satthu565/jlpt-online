# D08: Khung trang và các trang chính theo shadcn/ui

## Phạm vi đã làm

- **Nền dùng chung** (PR #93): `lucide-react`, `PageHeader`, `EmptyState`, và bước chặn tăng `style={{}}` theo từng file (`packages/ui/scripts/check-inline-styles.ts`).
- **Khung trang** (`@jlpt/ui` `Header`, `Footer`, `CookieConsent`; `apps/web/app/nav-shell.tsx`):
  - Bỏ hết `style={{}}`, chuyển sang class Tailwind với token màu sẵn có.
  - Icon menu, mũi tên, tài khoản, ngôn ngữ, đăng xuất và cookie dùng lucide thay emoji.
  - Thẻ `<style>` chèn trong footer được thay bằng `md:flex-row`.
- **Trang chủ:** viết lại bằng Tailwind. Link dạng nút dùng `Button asChild` thay cho `<a>` bọc ngoài `<Button>`. Ba ô tính năng dùng icon lucide.
- **Đăng nhập, đăng ký, quên mật khẩu, đặt lại mật khẩu, xác minh email:** không còn `style={{}}`. Vòng xoay đang tải và dấu ✓/✕ đổi sang `Loader2`, `CircleCheck`, `CircleX`.
- **Thư viện đề, chi tiết đề, phòng thi, trang cấp độ/SEO, trang thông tin:** emoji làm icon được thay bằng lucide. Thanh tiến độ và thanh thời gian audio giữ `style` cho chiều rộng tính lúc chạy, có đánh dấu `ui-allow-style`.

Không đổi hành vi, route, `data-testid` hay API. Riêng bảng câu hỏi trong phòng thi có thêm `data-icon="flag"` và `data-icon="lock"`, để test kiểm tra icon thay vì so ký tự emoji.

## Số đo

| | Trước | Sau |
|---|---|---|
| `style={{}}` trong `apps/web` | 661 | 564 |
| `style={{}}` trong phạm vi D08 | 97 | 2 (chiều rộng tính lúc chạy, có `ui-allow-style`) |
| Emoji làm icon trong phạm vi D08 | 47 dòng | 0 |
| Cuộn ngang ở 390 và 1366 px (6 trang chụp) | 0 | 0 |

Ảnh trước/sau ở 390 và 1366 px: `docs/release/d08/`. Ảnh "before" chụp bản xem thử đang chạy main, ảnh "after" chụp bản build của nhánh này.

## LCP trên điện thoại

Lighthouse giả lập (CPU x4, 150 ms RTT) cho LCP khoảng 2,6–3,0 s ở `/`, `/de-thi`, `/phong-thi`, `/n5`, `/dang-nhap`.

Đo trong trình duyệt thật: phần tử LCP được vẽ ngay ở lần vẽ đầu (khoảng 0,2 s), không có lỗi hydration. Khoảng chênh đến từ phần JS nền của React/Next (khoảng 165 KB gzip), được tải và chạy trước lần vẽ đầu dưới CPU giả lập. Phần này chưa xử lý trong D08:

- Ngôn ngữ được chọn ở trình duyệt (localStorage và cookie), máy chủ dựng sẵn bằng tiếng Việt.
- Chuyển các trang sang Server Component mà vẫn giữ 3 ngôn ngữ thì phải đọc cookie ở máy chủ. Khi đó trang không còn được dựng sẵn tĩnh.
- Mức cải thiện LCP của cách này chưa chắc chắn.

LCP đang ở chế độ chỉ cảnh báo (`WARN_ONLY_METRICS` trong `tests/lighthouse/budgets.ts`). D05 quyết định có giữ hay bật chặn lại.
