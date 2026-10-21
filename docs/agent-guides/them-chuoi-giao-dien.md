# Thêm chuỗi giao diện (vi/ja/en)

Mọi chữ hiện cho người dùng phải lấy qua key, không viết thẳng trong JSX.

## Ở đâu

| App | File chuỗi | Cách dùng |
|---|---|---|
| Web học viên | `apps/web/messages/{vi,ja,en}.json` | `const { t } = useI18n();` rồi `t('nhom.key')` (xem `apps/web/lib/i18n.tsx`) |
| Admin | `apps/admin/messages/{vi,ja,en}.json` | `t('nhom.key', locale)`, lấy `locale` từ `useAdminAuth()` |

## Cách thêm

1. Chọn nhóm có sẵn theo trang (`kanji`, `nav`, `exam`…), hoặc tạo nhóm mới theo tên trang.
2. Thêm **cùng một key** vào cả ba file:
   - `vi`: tiếng Việt tự nhiên, đây là ngôn ngữ chính;
   - `ja`: tiếng Nhật;
   - `en`: tiếng Anh.
3. Gộp vào object có sẵn. JSON không cho trùng key; nếu viết hai object `nav` thì object sau âm thầm đè object trước.
4. Chuỗi có biến thì dùng cùng cú pháp với các chuỗi bên cạnh trong file đó.

## Kiểm tra

```bash
pnpm test:i18n                                       # web: đủ key ở 3 ngôn ngữ
pnpm vitest run -c apps/admin/vitest.config.ts apps/admin/tests/i18n.test.ts
```

## Lưu ý

- Không hiện mã nội bộ (`kanji_reading`, `I07`) cho người dùng. Dùng nhãn có nghĩa.
- Sửa file JSON bằng tay hoặc bằng script giữ nguyên định dạng. Không chạy prettier.
