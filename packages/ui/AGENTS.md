# packages/ui: hướng dẫn cho agent

Component giao diện dùng chung (`@jlpt/ui`) cho web và admin. Các trang hiện có dùng Radix UI + HeroUI styles 3.2. Theo yêu cầu chủ dự án ngày 24/10/2026, phòng thi dùng component chính thức `@heroui/react` 3.2.6 qua `components/exam-controls.tsx`. Adapter chỉ nối API cũ, không vẽ lại hoặc ghi đè kiểu dáng của HeroUI. Không chuyển các trang khác trong cùng đợt này. Icon dùng `lucide-react`.

## Component có sẵn (`src/components/`)

alert, badge, button, card, checkbox, dialog, dropdown-menu, empty-state, input, label, modal, popover, radio-group, select, skeleton, spinner, switch, table, tabs, textarea, toast, tooltip; khung trang: header, footer, page-header, skip-to-content; chuyên dụng: furigana-toggle, locale-switcher, theme-toggle, share-dialog, rich-text-view, tts-audio-player, cookie-consent.

Import theo đường dẫn: `import { Button } from '@jlpt/ui/components/button'`.

## Quy tắc

- Ở web và admin, không dùng thẻ thô `<button>`, `<input>`, `<select>`, `<textarea>` và không dùng `style={{}}`. Hai script sẽ chặn:
  - `scripts/check-ui-primitives.ts`
  - `scripts/check-inline-styles.ts`

  Cả hai so với baseline. Không tự thêm ngoại lệ vào baseline để qua kiểm tra.
- Cần component mới thì thêm vào `src/components/`, export qua `src/index.tsx`, viết test trợ năng.
- Màu và khoảng cách lấy từ token (`src/tokens.ts`, `src/styles.css`). Không viết cứng mã màu.
- Component phải dùng được bằng bàn phím và có nhãn cho trình đọc màn hình. Kiểm tra bằng `pnpm test:a11y`.

## Lệnh

```bash
pnpm --filter @jlpt/ui build     # web/admin cần bản build của ui khi chạy test
pnpm check:ui-primitives
pnpm --filter @jlpt/ui test:a11y
```
