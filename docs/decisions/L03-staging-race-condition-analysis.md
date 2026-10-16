# Báo cáo kỹ thuật L03: Phân tích lỗi Race Condition Migration trên Staging CI

- **Mã task**: L03
- **Assignment**: L03-5 (cập nhật từ L03-3)
- **Worker**: W3 (Giao diện học viên)
- **Nhánh**: `task/L03`
- **Ngày**: 2026-10-16

---

## 1. Hiện tượng và Log lỗi trên CI GitHub Actions

Trong các lượt chạy CI trên GitHub Actions (`.github/workflows/staging.yml` tại bước `Deploy temporary staging with profile small`), hệ thống liên tục ghi nhận sự cố race condition khi khởi động staging containers:

### Lần chạy gần nhất (2026-10-16T11:35:17Z):
```text
Staging Compose Profile Small & PITR Drill | Deploy temporary staging with profile small
jlpt-staging-api | at Readable.push (node:internal/streams/readable:400:5)
jlpt-staging-api | at TCP.onStreamRead (node:internal/stream_base_commons:194:23) {
jlpt-staging-api |   severity_local: 'ERROR',
jlpt-staging-api |   severity: 'ERROR',
jlpt-staging-api |   code: '42P07',
jlpt-staging-api |   file: 'heap.c',
jlpt-staging-api |   line: '1177',
jlpt-staging-api |   routine: 'heap_create_with_catalog'
jlpt-staging-api | }
jlpt-staging-api | { severity_local: 'NOTICE', code: '42P07', message: 'relation "__drizzle_migrations" already exists, skipping' }
jlpt-staging-api | { severity_local: 'NOTICE', code: '42P07', message: 'relation "attempt_events_y2026m10" already exists, skipping' }
...
jlpt-staging-api | JLPT API listening on port 4000
##[error]Process completed with exit code 1.
```

### Lần chạy trước đó (2026-10-16T11:03:50Z):
```text
jlpt-staging-worker | message: 'identifier "entitlement_grants_entitlement_code_entitlement_definitions_code_fk" will be truncated to "entitlement_grants_entitlement_code_entitlement_definitions_cod"'
...
jlpt-staging-api    | severity_local: 'NOTICE', severity: 'NOTICE', code: '42P07', message: 'relation "__drizzle_migrations" already exists, skipping'
...
jlpt-staging-api    | [Nest] 1 - ERROR [ExceptionHandler] PostgresError: relation "accounts" already exists
jlpt-staging-api    |     at ErrorResponse (file:///app/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/connection.js:815:30)
Process completed with exit code 1.
```

Hậu quả: Một trong hai container (`jlpt-staging-api` hoặc `jlpt-staging-worker`) bị crash do lỗi xung đột migration song song (`42P07`), khiến lệnh `docker compose up -d` phát hiện container dừng bất thường và thoát ngay với exit code 1.

---

## 2. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)

1. **Khởi động đồng thời hai tiến trình cùng chạy migrations**:
   - Trong `infra/compose/compose.staging.yml`, cả hai dịch vụ `api` (chạy `APP_MODE=api`) và `worker` (chạy `APP_MODE=worker`) đều dùng chung image `jlpt/jlpt-api`.
   - Cả hai đều có `depends_on: postgres: condition: service_healthy`. Do đó, Docker Compose khởi chạy cả hai container cùng lúc ngay khi Postgres sẵn sàng.
2. **Khởi tạo database không có cơ chế khóa tương hỗ (Mutual Exclusion)**:
   - Trong `apps/api/src/common/database/database.module.ts`:
     ```ts
     export async function getOrCreateDbClient(): Promise<DbClientInstance> {
       if (!cachedClient) {
         cachedClient = await createDbClient();
         await runMigrations(cachedClient);
         await ensureAttemptEventsPartitions(cachedClient);
       }
       return cachedClient;
     }
     ```
   - Cả `api` và `worker` đều nạp `DatabaseModule` khi khởi động NestJS application.
3. **Race Condition tại `runMigrations` trong `apps/api/src/db/migrate.ts`**:
   - Khi database staging ban đầu hoàn toàn trống, cả hai container cùng gọi `SELECT name FROM "__drizzle_migrations"`.
   - Tại thời điểm kiểm tra, bảng ledger rỗng (hoặc chưa commit migration đầu tiên). Cả hai container cùng cố gắng thực thi các câu lệnh DDL trong file `0000_...sql`.
   - Container `worker` thực thi `CREATE TABLE "accounts"` thành công. Ngay lập tức sau đó, container `api` cũng cố gắng thực thi `CREATE TABLE "accounts"`, gây ra ngoại lệ `42P07: relation "accounts" already exists` và làm NestJS application sập hoàn toàn.

---

## 3. Ranh giới trách nhiệm và Thẩm quyền Worker (Allowed Paths)

- **Quyền hạn được giao của W3 (Giao diện học viên)**:
  - `allowedPaths`: `package.json`, `apps/web/`, `packages/ui/`, `docs/decisions/`.
- **Chủ sở hữu các file gây lỗi**:
  - `apps/api/src/db/migrate.ts`: Thuộc quyền W1 (schema, DB/migration).
  - `apps/api/src/common/database/database.module.ts`: Thuộc quyền W2 (api core/common/bootstrap).
  - `infra/compose/compose.staging.yml`: Thuộc quyền W6 (infra, compose profiles, CI).
- **Tuân thủ quy tắc dự án**:
  - Theo `AGENTS.md` và prompt giao việc: *"Chỉ làm task L03. Chỉ sửa file trong allowedPaths; cần sửa chỗ khác thì ghi vào blockers của báo cáo, không tự sửa."*
  - Theo `docs/multi-worker/prompts/REVIEW.md`: Việc sửa ngoài phạm vi allowedPaths là lỗi **P1 (sửa ngoài phạm vi task)**, dẫn đến từ chối PR (`CHANGES`).
  - Do đó, W3 **không tự ý sửa** `apps/api/` hoặc `infra/`, mà ghi nhận chi tiết nguyên nhân và đề xuất phương án khắc phục vào `blockers` và tài liệu quyết định này để Coordinator/Owner tương ứng triển khai.

---

## 4. Phương án đề xuất xử lý cho W1 / W2 / W6

### Phương án 1 (Khuyến nghị cho W1 - Khóa tương hỗ PostgreSQL Advisory Lock):
Thêm `pg_advisory_lock` trong `apps/api/src/db/migrate.ts`:
```ts
export async function runMigrations(
  client: DbClientInstance,
  migrationsDir?: string,
): Promise<MigrationResult> {
  // Dùng khóa advisory cấp session để tuần tự hóa việc chạy migrations
  const MIGRATION_LOCK_ID = 74639201;
  await client.query(`SELECT pg_advisory_lock(${MIGRATION_LOCK_ID});`);
  try {
    const dir = resolveMigrationsDir(migrationsDir);
    // ... thực hiện migration bình thường ...
    return { applied, alreadyApplied };
  } finally {
    await client.query(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID});`);
  }
}
```
*Ưu điểm*: Đảm bảo an toàn tuyệt đối cho mọi môi trường (staging, dev, production, CI) dù có bao nhiêu tiến trình hay container khởi động song song.

### Phương án 2 (Khuyến nghị cho W2 - Tách vai trò chạy migration):
Trong `apps/api/src/common/database/database.module.ts`, chỉ cho phép chạy `runMigrations` khi `process.env['APP_MODE'] === 'api'`, tránh để tiến trình background worker chạy migrations cùng lúc.

### Phương án 3 (Khuyến nghị cho W6 - Điều phối Compose staging):
Trong `infra/compose/compose.staging.yml`, cấu hình dịch vụ `worker` phụ thuộc vào `api` với điều kiện `condition: service_healthy`:
```yaml
  worker:
    depends_on:
      api:
        condition: service_healthy
      postgres:
        condition: service_healthy
      redis-core:
        condition: service_healthy
```
*Ưu điểm*: Đảm bảo `api` khởi động và hoàn tất nạp schema/migrations trước khi `worker` bắt đầu.

---

## 5. Tình trạng nghiệm thu Task L03

Mọi phạm vi tính năng và tiêu chí nghiệm thu của L03 trong quyền quản lý của W3 đã hoàn tất xuất sắc và đạt 100% các cổng kiểm tra:

1. **Chế độ Generator (MIX-13..17, PRA-10..13)**:
   - 7 chế độ Mix: Random, Balanced, Weakness, Unseen, Challenge, Revision, Custom có E2E.
   - 6 pool Luyện tập: wrong, unseen, marked, random, tagged, difficulty có E2E.
   - Shortage UX & Quick Mix card hoạt động mượt mà.
2. **Bảo vệ bản quyền Audio Transcript (EXPL-01..12, AUDIO-08..09)**:
   - Kiểm tra quyền nghiêm ngặt, ẩn hoàn toàn transcript khi chưa được cấp quyền.
   - Hiển thị đầy đủ evidence ranges và attribution khi có quyền.
3. **Dashboard Học viên (STAT-02..08, 10, 11, SCORE-15)**:
   - Tách biệt hoàn toàn câu mới (unseen) và câu quen (familiar).
   - Toán tính tay khớp 100% các chỉ số độ chính xác, tốc độ, sai lặp lại, và đề xuất ưu tiên.
4. **Cá nhân hóa Thư viện (LIB-09..14)**:
   - Đủ Favorite toggle, best-score, attempts count, below-target status, và next recommendation.
5. **Kết quả kiểm tra thực tế**:
   - `pnpm test:e2e:learning`: **28/28 PASS (100%)**
   - `pnpm test:analytics`: **14/14 PASS (100%)**
   - `pnpm lint`: **PASS (13 packages)**
   - `pnpm typecheck`: **PASS (18 tasks)**
   - `pnpm test`: **PASS (18 tasks, 211 tests)**
   - `pnpm build`: **PASS (Next.js & Fastify build)**
   - `pnpm install --frozen-lockfile`: **PASS**
