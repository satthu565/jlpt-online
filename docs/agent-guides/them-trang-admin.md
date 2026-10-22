# Thêm trang quản trị

Mẫu đang chạy thật: trang `/kanji`. Các file tham khảo:

- `apps/admin/app/kanji/page.tsx`
- `apps/admin/lib/api-client.ts` (hàm `listKanjiEntries`)
- `apps/admin/lib/navigation.ts` (mục `kanji`)
- `apps/api/src/modules/vocab/vocab.controller.ts` (`adminListKanji`)

Mẫu chi tiết hơn, từ API đến test: [H07-admin-lexicon.md](../multi-worker/guides/H07-admin-lexicon.md).

Giả sử cần thêm trang `/vi-du` liệt kê dữ liệu từ `GET /api/v1/admin/vi-du`.

## 1. API

Chưa có endpoint thì làm theo [them-api.md](them-api.md). Endpoint admin cần `@Roles(...)` đúng các vai trò sẽ thấy trang.

## 2. Hàm trong client

Trong `apps/admin/lib/api-client.ts`, thêm hàm cạnh các hàm cùng miền:

```ts
public async listViDu(params: { q?: string; page?: number; pageSize?: number } = {}): Promise<{
  total: number;
  items: Array<{ id: string; name: string }>;
}> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  qs.set('page', String(params.page ?? 1));
  qs.set('pageSize', String(params.pageSize ?? 50));
  return this.request('GET', `/api/v1/admin/vi-du?${qs.toString()}`, {
    requiredRoles: ['admin', 'editor'],
  });
}
```

## 3. Menu

Trong `apps/admin/lib/navigation.ts`, thêm vào `items` của nhóm phù hợp:

```ts
{
  id: 'viDu',
  labelKey: 'nav.viDu',
  href: '/vi-du',
  requiredRoles: ['admin', 'editor'],
},
```

Nếu `apps/admin/tests/navigation.test.ts` đếm số mục menu thì sửa số đếm đó.

## 4. Trang

Tạo `apps/admin/app/vi-du/page.tsx`, chép khung từ `app/kanji/page.tsx`:

- dòng đầu `'use client';`;
- bọc toàn trang bằng `<AdminGuard pathname="/vi-du" requiredRoles={['admin', 'editor']}>`, với cùng danh sách vai trò như menu;
- lấy `locale` từ `useAdminAuth()`, lấy chuỗi bằng `t('viDu.title', locale)`;
- có đủ 3 trạng thái: đang tải (`Skeleton`), lỗi (`Alert`), rỗng;
- chỉ dùng component `@jlpt/ui` (`Table`, `Input`, `Select`, `Button`), không dùng thẻ thô;
- gắn `data-testid` cho các phần mà E2E sẽ bấm hoặc đọc.

## 5. Chuỗi giao diện

Thêm vào đủ ba file `apps/admin/messages/vi.json`, `ja.json`, `en.json`:

```json
"nav": { "viDu": "Ví dụ" },
"viDu": { "title": "Ví dụ", "error": "Không tải được dữ liệu", "empty": "Chưa có dữ liệu" }
```

Gộp vào object `nav` có sẵn, không tạo object `nav` thứ hai.

## 6. Test và kiểm tra

```bash
pnpm --filter @jlpt/admin test
pnpm --filter @jlpt/admin typecheck
pnpm check:ui-primitives && pnpm check:no-mock-ui
pnpm docs:map          # cập nhật PROJECT_MAP.generated.md (có trang mới)
```

Sau đó mở trang trên preview hoặc staging, chụp màn hình ở 1366 px và 390 px.

## 7. Cập nhật tài liệu

Thêm trang vào `docs/agents/FEATURES.md`, mục admin.
