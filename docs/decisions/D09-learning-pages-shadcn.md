# D09: Trang học tập, luyện tập, kế hoạch, kết quả theo shadcn/ui

## Phạm vi

Sổ tay, flashcard/SRS, trắc nghiệm sổ tay, luyện tập, kế hoạch học, kết quả bài thi, lịch sử, thống kê, kho từ vựng/ngữ pháp, thống kê tần suất (`apps/web/app/(learning|practice|planner|results|corpus|analytics)`, `apps/web/features/{learning,practice,planner,results,corpus,analytics}`).

## Đã làm

- **`style={{}}` viết tay: 218 → 0.**
  - Phần lớn đổi tự động sang class Tailwind theo token sẵn có.
  - Tab Sổ tay và Luyện tập: dùng class có điều kiện theo tab đang chọn.
  - Thẻ flashcard, lưới `auto-fit`/`auto-fill` và ô chọn kỹ năng: viết tay.
  - 5 thanh tiến độ (thống kê, kế hoạch) giữ `style` cho chiều rộng tính lúc chạy, có đánh dấu `ui-allow-style`.
- **Emoji làm icon: 86 dòng → 0.**
  - Đổi sang lucide-react. Icon đứng riêng có `aria-hidden`; icon thay cho emoji có `aria-label` thì giữ nhãn.
  - Emoji trang trí trong chuỗi bị bỏ, giữ nguyên chữ.
  - Danh sách chế độ luyện tập đổi trường `icon` sang `LucideIcon`.
- **Nút xem lời giải** (`review-question-item`): bỏ mã nội bộ "(EXPL-01..09)" khỏi chữ hiển thị; dùng `ChevronDown`/`ChevronRight` thay ▼/▶.
- **Chuỗi ngày học liên tục** trên trang kế hoạch có `data-testid="streak-count"`; test cập nhật theo.

Không đổi hành vi, route, API; các `data-testid` cũ giữ nguyên.

## Kiểm tra

- `pnpm check:ui-primitives`: `style={{}}` trong `apps/web` còn 346 (baseline 661).
- Typecheck, lint, test `@jlpt/web` (21 file) đạt.
- Ảnh 390/1366 px của 8 trang khi đăng nhập học viên demo: `docs/release/d09/`.
  - `before-*`: bản xem thử đang chạy main.
  - `after-*`: build nhánh này.
  - Không trang nào cuộn ngang, không có khóa dịch thô.
  - Ảnh "after" có thông báo "Failed to fetch" vì bản build local thiếu `NEXT_PUBLIC_API_URL`. Đây là lỗi của môi trường chụp, không phải của trang. Preview và CI đều đặt biến này.
