# packages/ui: hướng dẫn cho agent

Component giao diện dùng chung (`@jlpt/ui`) cho web và admin. Theo chỉ thị chủ dự án ngày 07/11/2026, tất cả các trang web và admin đều phải sử dụng component của HeroUI (`@heroui/react` 3.2.6 và `@heroui/styles` 3.2) để đảm bảo đồng bộ toàn bộ hệ thống. Không tự dựng component riêng khi HeroUI đã có sẵn (nút, input, modal, popover, tabs, card, dropdown/select, tooltip...). Kiểu dáng giữ mặc định của HeroUI. Icon dùng `lucide-react`.

## Component có sẵn (`src/components/`)

alert, badge, button, card, checkbox, dialog, dropdown-menu, empty-state, hero-select, input, label, modal, popover, radio-group, select, skeleton, spinner, switch, table, tabs, textarea, toast, tooltip; khung trang: header, footer, page-header, skip-to-content; chuyên dụng: furigana-toggle, locale-switcher, theme-toggle, share-dialog, rich-text-view, tts-audio-player, cookie-consent.

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
