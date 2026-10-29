# apps/web: hướng dẫn cho agent

Trang học viên: Next.js 16 App Router, React 19, Tailwind 4. Đọc `AGENTS.md` ở gốc repo trước.

## Cấu trúc

```
app/(nhóm)/<route>/page.tsx   route tiếng Việt không dấu, gom theo nhóm: (exam), (library), (corpus), (learning)…
features/<miền>/              components/, hooks/, services/ (client gọi API), types.ts, index.ts
components/                   khung trang dùng chung
lib/
  features.ts                 cờ ẩn/hiện tính năng (đọc lúc build)
  i18n.tsx                    I18nProvider, useI18n(), translate()
  auth-context.tsx            phiên đăng nhập
messages/{vi,ja,en}.json      chuỗi giao diện
tests/                        vitest (render, i18n, a11y…)
```

## Thêm trang

1. Tạo `app/(nhóm)/<route>/page.tsx`. Đặt tên route bằng tiếng Việt không dấu, ví dụ `/tu-vung`.
2. Viết logic trong `features/<miền>/`. Gọi API bằng client trong `features/<miền>/services/`, theo mẫu `features/corpus/services/corpus-client.ts`. Đường dẫn tương đối `/api/v1/...` được Next rewrite sang API.
3. Giao diện chỉ dùng component `@jlpt/ui`. Mỗi trang có đủ ba trạng thái loading, lỗi và rỗng.
4. Thêm chuỗi vào đủ `messages/vi.json`, `ja.json` và `en.json`.
5. Viết test trong `tests/`. Nếu là luồng chính, thêm E2E vào `tests/playwright/integration.spec.ts` ở gốc repo.
6. Kiểm tra ở bề ngang 390 px và 1366 px: không tràn ngang, chữ không bị cắt.

## Cờ tính năng

`lib/features.ts` đọc `process.env.NEXT_PUBLIC_FEATURE_*`. Mỗi cờ phải đọc biến bằng tên viết thẳng, vì Next chỉ thay giá trị lúc build khi tên biến viết thẳng. Thêm cờ mới thì:

- thêm `ARG` vào `infra/docker/web.Dockerfile`;
- ghi vào `docs/decisions/feature-flags-phase-1.md` hoặc một quyết định mới;
- cập nhật `docs/agents/FEATURES.md`.

## Chạy test

```bash
pnpm test:web          # build @jlpt/ui rồi chạy vitest của web
pnpm test:i18n
pnpm --filter @jlpt/web build
```

## Lưu ý

- Không dùng dữ liệu giả trong code chạy thật. API lỗi thì hiện thông báo lỗi thật (`check:no-mock-ui`).
- Không hiện mã nội bộ như `kanji_reading` cho học viên. Dùng nhãn tiếng Việt, ví dụ `features/exam/mondai-labels.ts`.
- Vùng có chữ Nhật cho phép bôi đen để tra từ thì gắn `data-select-lookup-area="true"` (H06).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
