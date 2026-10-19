# Quyết định kỹ thuật D00: Hệ thống thiết kế @jlpt/ui dựng lại trên shadcn/ui

- **Mã task**: D00
- **Phụ trách**: W3 (Giao diện học viên)
- **Ngày**: 2026-10-19
- **Nhánh**: `task/D00`
- **Khóa tài nguyên**: `ui-contract`
- **Phụ thuộc**: `I00`

---

## 1. Bối cảnh và mục tiêu

Theo yêu cầu Ngày 9 của chủ dự án (xem `KE_HOACH_TRIEN_KHAI.md` mục D00), gói `@jlpt/ui` cần được chuẩn hóa và nâng cấp nền tảng:
1. **Khởi tạo kiến trúc shadcn/ui**: Thiết lập `components.json`, hàm tiện ích `cn` (`clsx` + `tailwind-merge`), `class-variance-authority` (cva), và các Radix UI primitives cần thiết.
2. **Dựng lại 18 thành phần thiết kế**: `Button`, `Input`, `Textarea`, `Label`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Tabs`, `Dialog`, `DropdownMenu`, `Popover`, `Tooltip`, `Card`, `Badge`, `Alert`, `Toast`, `Skeleton` theo token màu hiện có, hỗ trợ sáng/tối theo class `dark`.
3. **Bỏ inline style**: Loại bỏ hoàn toàn các style nội dòng gắn cứng (`style={{ ... }}`), chuyển sang lớp tiện ích Tailwind CSS kết hợp với CSS variables chuẩn.
4. **Bảo toàn hợp đồng API**: Giữ nguyên tên export, interface và props đang dùng trong `apps/web` và `apps/admin` để tránh hồi quy hoặc vỡ giao diện.
5. **Kiểm soát dung lượng**: Bản build web không tăng quá 15 KB JS nén ở trang chủ so với trước đợt.
6. **Kiểm soát khả năng truy cập (WCAG 2.1 AA)**: Mọi thành phần có test hành vi bàn phím (Tab, Enter, Space, Arrows, Esc), focus state, và ARIA semantics; Dialog giữ focus trap và đóng bằng phím Esc.
7. **Kiểm tra UI primitives tự động**: Bổ sung script `pnpm check:ui-primitives` (`packages/ui/scripts/check-ui-primitives.ts`) báo cáo thẻ `<button>/<input>/<select>/<textarea>` gốc trong `apps/web` và `apps/admin` kèm baseline giảm dần.

---

## 2. Chi tiết triển khai

### 2.1. Cấu hình shadcn/ui và Utility functions
- Khởi tạo file `packages/ui/components.json` với schema chuẩn của shadcn/ui.
- Triển khai hàm `cn` tại `packages/ui/src/lib/utils.ts` và re-export tại `packages/ui/src/utils.ts` cũng như root `packages/ui`.
- Tích hợp `class-variance-authority` (cva) cho các component có nhiều biến thể như `Button`, `Badge`, `Alert`, `Toast`, `Label`.

### 2.2. CSS Variables và Chế độ Sáng/Tối
Cập nhật `packages/ui/src/styles.css` để ánh xạ trực tiếp các CSS variables của shadcn/ui với tokens màu của dự án:
- `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`.
- Hỗ trợ cả hai cơ chế chuyển đổi: class `.dark` (Tailwind variant chuẩn) và thuộc tính `[data-theme='dark']` (ThemeContext hiện tại).
- Giữ nguyên các class định danh truyền thống (`jlpt-button`, `jlpt-input`, `jlpt-select`, `jlpt-card`, `jlpt-badge`, `jlpt-alert`, `jlpt-modal`, v.v.) để đảm bảo tính tương thích với test e2e và css kế thừa.

### 2.3. Dựng lại 18 thành phần thiết kế
1. **Button**: Tích hợp `@radix-ui/react-slot` (hỗ trợ pattern `asChild`), `cva` cho variants (`primary`, `default`, `secondary`, `outline`, `ghost`, `danger`, `destructive`, `success`, `link`) và sizes (`sm`, `md`, `lg`, `icon`), spinner xoay khi `loading`, bảo toàn `leftIcon`, `rightIcon`.
2. **Input**: Tích hợp `cn`, liên kết nhãn với `htmlFor`/`id`, `aria-invalid` khi lỗi, `aria-describedby` liên kết error alert và hint text.
3. **Textarea**: Tương tự Input, hỗ trợ `label`, `error`, `hint`, `requiredIndicator`, không còn inline style.
4. **Label**: Xây dựng trên `@radix-ui/react-label` và `cva`, hỗ trợ peer-disabled và liên kết input.
5. **Select**: Hỗ trợ 2 hình thức: (a) Props `options: SelectOption[]` truyền thống cho các màn hình hiện tại; (b) Bộ compound primitives Radix Select (`SelectRoot`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`).
6. **Checkbox**: Xây dựng trên `@radix-ui/react-checkbox`, hỗ trợ icon SVG check, toggle bằng phím Space, focus visible ring, `aria-checked`.
7. **RadioGroup**: Xây dựng trên `@radix-ui/react-radio-group`, gồm `RadioGroup` và `RadioGroupItem`, roving tabindex, điều hướng bằng phím mũi tên, `aria-checked`.
8. **Switch**: Xây dựng trên `@radix-ui/react-switch`, chuyển trạng thái bằng phím Space/Enter, `aria-checked`.
9. **Tabs**: Xây dựng trên `@radix-ui/react-tabs`, gồm `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, phím mũi tên chuyển tab, `role="tablist"`, `role="tab"`, `role="tabpanel"`.
10. **Dialog**: Xây dựng trên `@radix-ui/react-dialog`, gồm `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`. Focus trap tự động bên trong dialog, đóng bằng Esc và trả focus về trigger element.
11. **Modal**: Bỏ inline style, nâng cấp bộ bẫy focus (Tab/Shift-Tab loop) và lắng nghe Esc, bảo toàn giao diện `ModalProps` cho 15+ màn hình đang gọi trong `apps/web`.
12. **DropdownMenu**: Xây dựng trên `@radix-ui/react-dropdown-menu`, gồm trigger, menuitem, checkboxitem, radioitem, separator, shortcut, đóng bằng Esc.
13. **Popover**: Xây dựng trên `@radix-ui/react-popover`, gồm `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, đóng bằng Esc.
14. **Tooltip**: Xây dựng trên `@radix-ui/react-tooltip`, gồm `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, mở khi hover/focus, đóng bằng Esc.
15. **Card**: Gồm `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Bảo toàn `elevated?: boolean` và prop `as` cho heading levels.
16. **Badge**: Xây dựng trên `cva`, đầy đủ variants (`primary`, `success`, `warning`, `danger`, `error`, `info`, `neutral`, `secondary`, `outline`).
17. **Alert**: Xây dựng trên `cva`, `role="alert"`, `aria-live="polite"`, nút đóng bàn phím có thể focus, export kèm `AlertTitle`, `AlertDescription`.
18. **Toast**: Xây dựng trên `@radix-ui/react-toast`, gồm `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`.
19. **Skeleton**: Thành phần hiển thị placeholder trạng thái tải với hiệu ứng `animate-pulse`, không inline style.

### 2.4. Tối ưu Code-Splitting và Tree-Shaking
- Trong `packages/ui/package.json`: Khai báo `"sideEffects": ["./src/styles.css", "**/*.css"]`.
- Trong `packages/ui/tsup.config.ts`: Khai báo các entry chi tiết từng component (`src/components/*.tsx`), kích hoạt `splitting: true` và `treeshake: true`. `dist/index.js` giảm dung lượng từ 93.5 KB xuống chỉ còn 4.18 KB nhờ re-export các chunk độc lập.
- Trong `apps/web/next.config.mjs`: Bổ sung `transpilePackages: ['@jlpt/ui']`.
- **Kết quả đo lường JS nén trang chủ (`/`)**:
  - Baseline trước đợt: **225.88 KB** (Gzip).
  - Sau khi dựng lại trên shadcn/ui: **232.12 KB** (Gzip).
  - Mức tăng: **+6.24 KB** (thấp hơn nhiều so với giới hạn trần **+15 KB** của nghiệm thu).

### 2.5. Công cụ kiểm soát UI Primitives (`check:ui-primitives`)
- Tạo script `packages/ui/scripts/check-ui-primitives.ts` và file baseline `packages/ui/scripts/ui-primitives-baseline.json`.
- Thêm lệnh vào `package.json` gốc: `"check:ui-primitives": "node --no-warnings --experimental-strip-types packages/ui/scripts/check-ui-primitives.ts"`.
- Baseline hiện tại:
  - `apps/web`: 80 primitives (54 button, 18 input, 6 select, 2 textarea).
  - `apps/admin`: 176 primitives (117 button, 39 input, 12 select, 8 textarea).
  - Tổng cộng: **256** primitives.
- Script chặn commit nếu tổng số vượt quá baseline; ghi nhận thông báo ratchet khi số lượng giảm để hạ dần baseline.

---

## 3. Kết quả nghiệm thu

1. **Test hành vi bàn phím, focus và ARIA**:
   - `packages/ui/tests/components-behavior.test.tsx`: 19 tests kiểm thử toàn diện 18 component, kiểm tra focus trap và đóng bằng phím Esc đối với Dialog/Modal.
   - `packages/ui/tests/ui.test.tsx`: 19 tests hiện hữu đạt 100%.
   - `packages/ui/tests/a11y.test.tsx`: 13 tests hiện hữu đạt 100%.
   - `packages/ui/tests/rich-text.test.tsx`: 7 tests hiện hữu đạt 100%.
   - Tổng cộng: **58/58 tests đạt** trong `packages/ui`.
2. **Thư viện UI không nguyên khối**: Chỉ cài các gói Radix UI đơn lẻ và tiện ích nhẹ (`clsx`, `tailwind-merge`, `cva`). Không cài thư viện UI monolithic.
3. **Dung lượng trang chủ**: Tăng +6.24 KB Gzip (đạt trần ≤ 15 KB).
4. **Lighthouse Staging CI**:
   - Trang chủ Desktop: **Performance 100** (yêu cầu ≥ 98), **Accessibility 96** (yêu cầu ≥ 95), **SEO 100**.
   - Trang chủ Mobile: **Performance 91** (yêu cầu ≥ 70), **Accessibility 96** (yêu cầu ≥ 95), **SEO 100**.
   - Ảnh chụp viewport 390px và 1366px đã được chụp tự động và lưu trữ làm artifact.
