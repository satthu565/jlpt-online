# Thêm bảng hoặc cột database

Mẫu đang chạy thật: migration `0009_entry_meanings_senses.sql` (thêm cột) và `0008_corpus_terms.sql` (thêm bảng).

## 1. Chọn số migration

```bash
ls apps/api/src/db/migrations/*.sql | tail -3
```

Lấy số kế tiếp. **Xem các PR đang mở** trên GitHub: PR khác có thể đã dùng số đó. Nếu trùng thì PR gộp sau phải đổi số.

## 2. Sửa `schema.ts`

```ts
// apps/api/src/db/schema.ts
export const viDu = pgTable('vi_du', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Thêm cột vào bảng có sẵn: thêm một dòng trong object của `pgTable` đó.

## 3. Viết migration SQL

`apps/api/src/db/migrations/00NN_vi_du.sql`:

```sql
CREATE TABLE IF NOT EXISTS "vi_du" (
  "id" uuid PRIMARY KEY,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lexical_entries" ADD COLUMN IF NOT EXISTS "vi_du_note" text;
```

- Luôn dùng `IF NOT EXISTS`.
- Ngăn các câu lệnh bằng `--> statement-breakpoint` như các file trước.
- Không sửa migration đã gộp vào main. Muốn đổi thì viết migration mới.

## 4. Thêm vào `_journal.json`

`apps/api/src/db/migrations/meta/_journal.json`, cuối mảng `entries`:

```json
{ "idx": NN, "version": "7", "when": 1792750000000, "tag": "00NN_vi_du", "breakpoints": true }
```

`when` phải lớn hơn dòng trước.

## 5. Sửa test đếm migration

Trong `apps/api/src/db/db.test.ts`:

- tìm mọi chỗ đếm số migration (`toBe(N)` gần `__drizzle_migrations`, độ dài danh sách file) và tăng lên 1;
- thêm `expect(names).toContain('00NN_vi_du.sql');`.

Quên bước này thì CI báo "expected N to be N-1".

## 6. Kiểm tra

```bash
pnpm test:db
pnpm vitest run apps/api/src/modules/<module-dùng-bảng>/
pnpm docs:map        # cập nhật DATABASE.generated.md
```

## 7. Dữ liệu có sẵn

Cần nạp dữ liệu cho bảng mới thì viết script trong `apps/api/scripts/`, chạy sau khi build. Không ghi tay vào database production.
