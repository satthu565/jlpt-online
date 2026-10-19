# Quyết định kỹ thuật D02: Web dùng thống nhất @jlpt/ui và thiết kế lại menu máy tính 1280px

- **Mã task**: D02
- **Mã phân công**: D02-1
- **Phụ trách**: W3 (Giao diện học viên)
- **Ngày**: 2026-10-19
- **Nhánh**: `task/D02`
- **Khóa tài nguyên**: Không
- **Phụ thuộc**: D00 (Đã merge)

---

## 1. Bối cảnh và mục tiêu

Theo yêu cầu Ngày 9 của chủ dự án (xem `KE_HOACH_TRIEN_KHAI.md` mục D02):
1. **Thay toàn bộ thẻ HTML UI primitives**:
   Thay toàn bộ các thẻ `<button>`, `<input>`, `<select>`, `<textarea>` gốc và class tự chế trong `apps/web` bằng thành phần từ thư viện thiết kế `@jlpt/ui` (`Button`, `Input`, `Select`, `Textarea`, `Checkbox`).
2. **Đưa baseline `check:ui-primitives` của `apps/web` về 0 (rỗng)**:
   Không còn bất kỳ thẻ UI primitive gốc nào trong mã nguồn `apps/web` (ngoài trừ các file test và mã sinh ra).
3. **Đồng bộ khoảng cách, cỡ chữ, trạng thái**:
   Chuẩn hóa các trạng thái `hover`, `focus-visible`, `disabled`, `loading` theo tokens và biến CSS của `@jlpt/ui`.
4. **Thiết kế lại thanh menu máy tính gọn gàng từ 1280px**:
   - Nhóm các mục phụ (Kế hoạch học, Lớp học, Sự kiện, Bảng giá, Lịch sử thi, Thống kê) vào menu con "Thêm" (More).
   - Chuyển bộ chuyển đổi ngôn ngữ (`LocaleSwitcher`) và chuyển đổi giao diện sáng/tối (`ThemeToggle`) vào bên trong menu tài khoản học viên (cả với người dùng đã đăng nhập và khách).
   - Đảm bảo thanh menu máy tính hiển thị đầy đủ từ màn hình 1280px trở lên mà không bị tràn màn hình hay xuất hiện thanh cuộn ngang (`scrollWidth <= innerWidth + 1`).
5. **Đảm bảo không suy giảm chỉ số Lighthouse và ảnh chụp responsive**:
   Lighthouse trên staging CI đạt yêu cầu (desktop hiệu năng ≥98, mobile ≥70, accessibility ≥95, SEO 100), ảnh chụp 390px và 1366px đầy đủ.

---

## 2. Chi tiết triển khai

### 2.1. Nâng cấp thành phần Header trong `@jlpt/ui`
- Mở rộng kiểu dữ liệu `NavItem` trong `packages/ui/src/components/header.tsx` để hỗ trợ menu con `children?: NavItem[]`.
- Trên desktop: Hiển thị các mục có `children` dưới dạng Radix `DropdownMenu` ("Thêm" / "More" / "その他") kèm icon chevron và aria attributes chuẩn.
- Trên mobile: Hiển thị phân nhóm rõ ràng trong drawer điều hướng.
- Điều chỉnh breakpoint hiển thị của thanh điều hướng desktop từ giá trị tạm thời 2200px xuống **1280px** (`@media (min-width: 1280px)` trong `header.tsx` và `styles.css`).

### 2.2. Tinh gọn thanh điều hướng trong `apps/web/app/nav-shell.tsx`
- Giữ 6 mục điều hướng chính trực tiếp trên thanh menu: Trang chủ, Đề thi, Luyện tập, Từ vựng, Ngữ pháp, Sổ tay.
- Gom 6 mục thứ cấp vào menu "Thêm": Kế hoạch học, Lớp học, Sự kiện, Bảng giá, Lịch sử thi, Thống kê.
- Di chuyển `LocaleSwitcher` và `ThemeToggle` vào menu thả xuống của tài khoản (Account Dropdown), giúp chiều rộng thanh header co gọn từ ~2000px xuống ~900px, hiển thị hoàn hảo từ 1280px mà không bị tràn ngang.
- Thêm khóa dịch `more` đa ngôn ngữ đầy đủ vào `messages/vi.json` ("Thêm"), `messages/ja.json` ("その他"), và `messages/en.json` ("More").

### 2.3. Thay thế toàn bộ 80 thẻ UI primitives trong `apps/web`
Thực hiện rà soát và thay thế toàn diện qua 30+ tệp mã nguồn:
1. `apps/web/app/(account)/tai-khoan/page.tsx`: 5 buttons -> `Button`
2. `apps/web/app/(auth)/dang-ky/page.tsx`: 1 input checkbox -> `Input`
3. `apps/web/app/(auth)/dang-nhap/page.tsx`: 1 input checkbox -> `Input`
4. `apps/web/app/(exam)/phong-thi/page.tsx`: 1 button -> `Button`
5. `apps/web/app/(info)/faq/page.tsx`: 2 buttons -> `Button`
6. `apps/web/app/(info)/lien-he/page.tsx`: 1 input + 1 textarea -> `Input`, `Textarea`
7. `apps/web/app/(learning)/so-tay/page.tsx`: 3 buttons -> `Button`
8. `apps/web/app/(practice)/luyen-tap/page.tsx`: 3 buttons -> `Button`
9. `apps/web/features/account/notification-settings.tsx`: 3 input checkboxes -> `Input`
10. `apps/web/features/ai/components/ai-chat-assistant.tsx`: 2 buttons -> `Button`
11. `apps/web/features/analytics/components/skill-accuracy-widget.tsx`: 2 buttons -> `Button`
12. `apps/web/features/classroom/components/classroom-dashboard.tsx`: 2 buttons -> `Button`
13. `apps/web/features/classroom/components/create-assignment-modal.tsx`: 1 input checkbox -> `Input`
14. `apps/web/features/community/components/achievement-share-card.tsx`: 1 input checkbox -> `Input`
15. `apps/web/features/corpus/components/grammar-explorer.tsx`: 1 button map -> `Button`
16. `apps/web/features/corpus/components/vocab-explorer.tsx`: 1 button map -> `Button`
17. `apps/web/features/exam/components/audio-player.tsx`: 1 button map -> `Button`
18. `apps/web/features/exam/components/exam-picker.tsx`: 1 button map -> `Button`
19. `apps/web/features/exam/components/exam-room.tsx`: 1 button -> `Button`
20. `apps/web/features/exam/components/exam-toolbar.tsx`: 1 button map -> `Button`
21. `apps/web/features/exam/components/question-navigation.tsx`: 4 buttons -> `Button`
22. `apps/web/features/exam/components/question-palette.tsx`: 1 button map -> `Button` (giữ nguyên `data-question-index`)
23. `apps/web/features/exam/components/question-view.tsx`: 3 buttons -> `Button` (giữ nguyên `role="radio"`, `p-4 rounded-xl`)
24. `apps/web/features/exam/components/section-header.tsx`: 1 button map -> `Button`
25. `apps/web/features/exam/components/sync-status-indicator.tsx`: 1 button -> `Button`
26. `apps/web/features/explanations/components/explanation-view.tsx`: 2 buttons -> `Button`
27. `apps/web/features/explanations/components/question-bookmark-button.tsx`: 1 button -> `Button`
28. `apps/web/features/explanations/components/question-report-modal.tsx`: 1 select + 1 textarea -> `Select`, `Textarea`
29. `apps/web/features/gamification/components/gamification-dashboard.tsx`: 1 input checkbox -> `Input`
30. `apps/web/features/library/components/exam-card.tsx`: 1 button -> `Button`
31. `apps/web/features/library/components/library-filters.tsx`: 2 inputs, 2 buttons, 4 selects -> `Input`, `Button`, `Select`
32. `apps/web/features/library/components/library-view.tsx`: 1 button -> `Button`
33. `apps/web/features/mix/components/mix-generator.tsx`: 2 button maps, 4 inputs -> `Button`, `Input`
34. `apps/web/features/mix/components/quick-mix-card.tsx`: 1 button map -> `Button`
35. `apps/web/features/mix/components/share-exam-modal.tsx`: 1 input -> `Input`
36. `apps/web/features/planner/components/create-plan-modal.tsx`: 1 input checkbox -> `Input`
37. `apps/web/features/practice/components/practice-generator.tsx`: 3 button maps, 1 range input, 1 select -> `Button`, `Input`, `Select`
38. `apps/web/features/practice/components/practice-runner.tsx`: 1 button map -> `Button`
39. `apps/web/features/results/components/review-palette.tsx`: 2 button maps -> `Button`
40. `apps/web/features/results/components/review-question-item.tsx`: 1 button -> `Button`
41. `apps/web/features/results/components/review-view.tsx`: 1 button -> `Button`

---

## 3. Kết quả nghiệm thu

1. **Kiểm tra UI primitives baseline**:
   - `apps/web`: 0 thẻ `<button>`, 0 thẻ `<input>`, 0 thẻ `<select>`, 0 thẻ `<textarea>`.
   - Cập nhật ratchet baseline trong `packages/ui/scripts/ui-primitives-baseline.json`: `web.total = 0`.
   - `pnpm check:ui-primitives` đạt trạng thái PASS.
2. **Kiểm tra không dùng mock UI**:
   - `pnpm check:no-mock-ui` đạt trạng thái PASS (0 vi phạm mới).
3. **Hiển thị thanh menu desktop từ 1280px**:
   - Menu desktop hiển thị từ 1280px (`@media (min-width: 1280px)`).
   - Kiểm tra cuộn ngang: `scrollWidth <= innerWidth + 1` không phát sinh cuộn ngang.
4. **Các cổng kiểm tra chung (Common Gates)**:
   - `pnpm install --frozen-lockfile`: PASS (0 lỗi, không đổi lockfile).
   - `pnpm lint`: PASS (13/13 packages thành công, 0 lỗi).
   - `pnpm typecheck`: PASS (20/20 tasks thành công, 0 lỗi TypeScript).
   - `pnpm test:web`: PASS (19/19 test files, 254/254 tests pass).
   - `pnpm test`: PASS (toàn bộ 20 tasks, 578 API tests, 61 UI tests, 254 Web tests pass).
   - `pnpm build`: PASS (toàn bộ các ứng dụng và gói thư viện build thành công).
   - `sudo -n /usr/local/bin/jlpt-stage-test check`: PASS sau 1124s.
