# apps/api: hướng dẫn cho agent

NestJS 12 trên Fastify, tiền tố `/api/v1`, cổng 4000. Đọc `AGENTS.md` ở gốc repo trước. Quy ước chung của API ở [docs/agents/API.md](../../docs/agents/API.md), database ở [docs/agents/DATABASE.md](../../docs/agents/DATABASE.md).

## Cấu trúc

```
src/
  main.ts                 tạo app, setGlobalPrefix('api/v1')
  app.module.ts           gom module, guard toàn cục
  common/
    decorators/           @Public, @Roles, @RateLimit, @RequireTotp, @AllowGuest, @CurrentUser
    guards/               auth, roles, tenant, origin, totp, rate-limit
    pipes/                zod-validation.pipe.ts, uuid-param.pipe.ts
    filters/              api-exception.filter.ts (chuẩn hóa lỗi)
    utils/                uuid.ts (UUID v7), pii.ts, test runner
  db/
    schema.ts             toàn bộ bảng Drizzle
    migrations/           00NN_*.sql + meta/_journal.json
    client.ts, migrate.ts createDbClient(), runMigrations()
    db.test.ts            test migration (có số đếm cứng)
  modules/<tên>/          <tên>.module.ts, *.controller.ts, *.service.ts, *.test.ts
scripts/                  script chạy tay: import, backfill (cần build trước)
```

## Thêm endpoint

1. Chọn module đúng miền nghiệp vụ. Không tạo module mới nếu một module có sẵn đã phù hợp.
2. Thêm hàm vào service, nhận `DbClientInstance` qua `@Inject(DB_CLIENT)` như các service khác.
3. Thêm route vào controller:
   - đặt quyền rõ ràng: `@Roles(...)`, hoặc `@Public()` cho khách;
   - kiểm tra đầu vào bằng schema Zod;
   - thêm `@RateLimit` nếu endpoint công khai hoặc nặng.
4. Thao tác nhân sự thay đổi dữ liệu thì gọi `AuditService.recordAction(...)`.
5. Viết test cạnh file, theo mẫu `modules/vocab/vocab.test.ts`:
   - tạo PGlite, chạy migration, tự chèn dữ liệu;
   - gọi service hoặc controller;
   - kiểm tra metadata quyền.
6. Web hoặc admin dùng endpoint này thì cập nhật `contracts/openapi.yaml`, rồi chạy `pnpm contracts:check`.
7. Thử trên máy chạy thật: `curl` tới `/api/v1/...`, kiểm tra cả trường hợp không có quyền.

## Chạy test

```bash
pnpm vitest run apps/api/src/modules/<module>/        # một module
pnpm test:db                                          # migration
pnpm test:vocab-data                                  # từ điển (lâu)
```

Mỗi fork vitest có PGlite tốn khoảng 1 GB RAM. Không chạy quá nhiều file song song trên máy yếu.

## Lưu ý

- Thêm migration thì sửa số đếm trong `src/db/db.test.ts`. Xem [PITFALLS](../../docs/agents/PITFALLS.md).
- Không trả đáp án hay lời giải trước khi người dùng được phép xem. Có test `attempt/no-answer-leak.test.ts`.
- Thi thật: deadline tính phía server, lưu đáp án theo `seq` và lease. Không tin thời gian do client gửi lên.
- Script trong `scripts/` import từ `dist/`, nên phải chạy `pnpm --filter @jlpt/api build` trước.
