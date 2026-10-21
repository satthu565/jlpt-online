# apps/admin: hướng dẫn cho agent

Trang quản trị: Next.js 16, chỉ nhân sự đăng nhập được, có 2FA. Đọc `AGENTS.md` ở gốc repo trước. Mẫu từng bước đã chạy thử: [docs/multi-worker/guides/H07-admin-lexicon.md](../../docs/multi-worker/guides/H07-admin-lexicon.md).

## Cấu trúc

```
app/<route>/page.tsx      mỗi trang bọc trong <AdminGuard pathname="/route" requiredRoles={[...]}>
features/<miền>/          component theo miền
lib/
  navigation.ts           menu (ALL_NAV_SECTIONS) và quyền của từng mục
  api-client.ts           client gọi API, viết tay; thêm hàm cho endpoint mới
  ui-guard.tsx            AdminGuard
  auth-context.tsx        useAdminAuth()
  i18n.ts                 t(key, locale)
messages/{vi,ja,en}.json  chuỗi giao diện
tests/                    vitest
scripts/                  check-no-internal-codes.ts (cấm hiện mã task nội bộ trên giao diện)
```

## Thêm trang quản trị

1. **API:** đã có endpoint chưa? Chưa có thì làm theo `apps/api/AGENTS.md`.
2. **Client:** thêm hàm vào `lib/api-client.ts` theo mẫu các hàm có sẵn, gọi `this.request('GET', '/api/v1/...')`.
3. **Menu:** thêm mục vào `ALL_NAV_SECTIONS` trong `lib/navigation.ts`, ghi `requiredRoles`. Nhớ sửa `tests/navigation.test.ts` nếu test đếm số mục.
4. **Trang:** tạo `app/<route>/page.tsx`, bọc `AdminGuard` với cùng danh sách vai trò. Dùng `Table`, `Input`, `Select`, `Button`, `Alert`, `Skeleton` của `@jlpt/ui`. Mẫu: `app/kanji/page.tsx`.
5. **Chuỗi:** thêm vào đủ `messages/vi.json`, `ja.json`, `en.json`.
6. **Test:** viết test trong `tests/`, chạy `pnpm --filter @jlpt/admin test`.

Vai trò nhân sự: `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`.

## Lưu ý

- Không dùng `pnpm test:admin` ở gốc repo (lỗi setup-i18n). Dùng `pnpm --filter @jlpt/admin test`.
- Không hiện mã task (`I07`, `H03`…) trên giao diện. Script `check-no-internal-codes.ts` sẽ chặn.
- E2E admin đăng nhập bằng fixture TOTP trong `tests/playwright/fixtures/staff-auth.fixture.ts`.
