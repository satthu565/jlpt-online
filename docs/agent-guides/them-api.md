# Thêm API

Mẫu đang chạy thật: `GET /api/v1/admin/lexicon/kanji`.

- Controller: `apps/api/src/modules/vocab/vocab.controller.ts`, hàm `adminListKanji`.
- Service: `vocab.service.ts`, gọi `kanji-list.ts`.
- Test: `vocab.test.ts`.

## 1. Chọn module

Xem bảng module trong [docs/agents/API.md](../agents/API.md), hoặc mục API của `docs/agents/PROJECT_MAP.generated.md` để biết route đã có. Không tạo endpoint trùng với route đã có.

## 2. Service

Viết logic đọc hoặc ghi database trong service. Truy vấn phức tạp tách ra file riêng như `kanji-list.ts`.

```ts
// apps/api/src/modules/<module>/vi-du-list.ts
import { sql, ilike } from 'drizzle-orm';
import type { DbClientInstance } from '../../db/client.js';
import { viDu } from '../../db/schema.js';

export async function listViDu(db: DbClientInstance, p: { q?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, p.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, p.pageSize ?? 50));
  const where = p.q ? ilike(viDu.name, `%${p.q}%`) : undefined;
  const items = await db.db.select().from(viDu).where(where).limit(pageSize).offset((page - 1) * pageSize);
  const [{ total }] = await db.db.select({ total: sql<number>`count(*)::int` }).from(viDu).where(where);
  return { total, page, pageSize, items };
}
```

`DbClientInstance` (`apps/api/src/db/client.ts`) có `db` là instance Drizzle; trong unit test đó là PGlite.

## 3. Controller

```ts
@Roles('admin', 'editor')
@Get('admin/vi-du')
async adminListViDu(@Query('q') q?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
  return this.service.listViDu({ q, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
}
```

- Endpoint cho khách: `@Public()`, thường kèm `@RateLimit({...})`.
- Thao tác ghi của nhân sự: gọi `AuditService.recordAction(...)` để ghi vào `operator_actions`.
- Body có cấu trúc: kiểm tra bằng schema Zod và `ZodValidationPipe`.

## 4. Test

Đặt file test cạnh code, theo mẫu `vocab.test.ts`:

```ts
let dbClient: DbClientInstance;
beforeEach(async () => {
  dbClient = await createDbClient();
  await runMigrations(dbClient);
  // chèn dữ liệu mẫu cho test
});
afterEach(async () => { await dbClient.close(); });

it('lọc theo q và phân trang', async () => { /* gọi service, kiểm tra total và items */ });
it('chỉ admin, editor được gọi', () => {
  const roles = Reflect.getMetadata(ROLES_KEY, VocabController.prototype.adminListKanji);
  expect(roles).toEqual(['admin', 'editor', 'reviewer']);
});
```

Chạy test: `pnpm vitest run apps/api/src/modules/<module>/`.

## 5. Hợp đồng và tài liệu

- Web dùng endpoint này qua `@jlpt/api-client` thì thêm vào `contracts/openapi.yaml`, rồi chạy `pnpm contracts:generate` và `pnpm contracts:check`.
- Chạy `pnpm docs:map` để route mới xuất hiện trong `PROJECT_MAP.generated.md`.

## 6. Thử thật

Trên staging hoặc preview: `curl -i http://<host>/api/v1/admin/vi-du`. Phải trả 401 khi chưa đăng nhập và 200 với tài khoản đúng vai trò.
