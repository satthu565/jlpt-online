# Kiến trúc

## Công nghệ

| Phần | Công nghệ | Ghi chú |
|---|---|---|
| Ngôn ngữ | TypeScript 5.8 strict | Python chỉ dùng cho công cụ dữ liệu (`tools/`, `docs/multi-worker/tools/`) |
| Monorepo | pnpm 12.11 workspace, Turborepo 2.11 | `turbo run build/lint/typecheck`; `pnpm test` dùng runner riêng (`apps/api/src/common/utils/monorepo-test-runner.ts`) chạy tuần tự để đỡ tốn RAM |
| Web học viên (`apps/web`) | Next.js 16.4 (App Router), React 19.3, Tailwind 4.1 | Route tiếng Việt, gom theo nhóm `(exam)`, `(library)`, `(corpus)`… |
| Admin (`apps/admin`) | Next.js 16.4, cùng bộ giao diện | Chỉ nhân sự đăng nhập được, có 2FA |
| Giao diện chung (`packages/ui`) | Radix UI + HeroUI styles 3.2 (CSS) + class-variance-authority, icon lucide | Không dùng `@heroui/react` |
| API (`apps/api`) | NestJS 12 trên Fastify 5 | Tiền tố `/api/v1`, cổng 4000 |
| ORM | Drizzle 0.45 | Schema ở `apps/api/src/db/schema.ts`, migration SQL viết tay |
| Database | PostgreSQL 17 | Ảnh docker riêng `jlpt-postgres` |
| Hàng đợi, cache, giới hạn tần suất | Redis 7 | |
| Media | Cloudflare Worker (`apps/media-worker`), token ký bằng `packages/media-token` | Kho R2 đang chờ cấu hình |
| Test | Vitest 5, PGlite, Playwright 1.64 | E2E chạy trên staging với Chromium, Firefox, WebKit, Mobile Safari, Mobile Chrome |

## Luồng hệ thống

```
Trình duyệt ──▶ web (Next, :3000) ──rewrite /api/* ─────────▶ API (Nest, :4000) ──▶ Postgres
                                  └─rewrite /media/* ──▶ /api/v1/media/*      └──▶ Redis
Trình duyệt ──▶ admin (Next, :3001) ──────────────────────▶ API
API ──(outbox, cùng transaction)──▶ worker nền ──▶ email, thông báo, thống kê
```

- Web và admin gọi API qua cùng một origin. Next rewrite `/api/*` sang API (`apps/web/next.config.mjs`).
- Tác vụ nền đi qua outbox. Sự kiện được ghi trong cùng transaction với dữ liệu, consumer phải idempotent và có retry. Sự kiện được mô tả ở `contracts/events.schema.json`.
- `packages/api-client` sinh từ `contracts/openapi.yaml` bằng `pnpm contracts:generate`. Admin có client riêng viết tay ở `apps/admin/lib/api-client.ts`.

## Đăng nhập và quyền

- Đăng nhập theo phiên, dùng cookie. Guard toàn cục: `AuthGuard`, `RolesGuard`, `TenantGuard`, `OriginGuard`, `TotpGuard`, `RateLimitGuard` (`apps/api/src/common/guards/`).
- Vai trò (`packages/schema/src/enums.ts`): `student`, `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`. Vai trò trong tổ chức: `org_manager`, `teacher`.
- Decorator: `@Public()` (không cần đăng nhập), `@Roles(...)`, `@RateLimit(...)`, `@RequireTotp()`, `@AllowGuest()`, `@CurrentUser()`.
- Nhân sự bắt buộc dùng 2FA (TOTP). Khi API khởi động, nó tự tạo tài khoản nhân sự ban đầu (task I10).
- Hành động của nhân sự được ghi vào `operator_actions`.

## Lõi nghiệp vụ

| Phần | Ở đâu | Nguyên tắc |
|---|---|---|
| Phòng thi | `apps/api/src/modules/attempt`, `apps/web/features/exam` | Deadline tính phía server; lease, `seq` và ACK theo transaction; đồng bộ khi mất mạng |
| Đề | `exam`, `blueprint`, `question-bank` | Ảnh chụp đề khi xuất bản là bất biến; blueprint quy định cấu trúc từng cấp |
| Chấm điểm | `packages/exam-engine/src/scoring.ts`, `score-estimation.ts` | Hàm thuần. AI không quyết định điểm. |
| Trộn đề, luyện tập | `packages/exam-engine/src/mix`, `practice` | Hàm thuần, có test thuộc tính |
| SRS | `packages/srs` (FSRS) | Hàm thuần, tính theo múi giờ người dùng |
| Nhập đề | `apps/api/src/modules/import`, `packages/content-tools`, `tools/import-data` | Định dạng ở `docs/import-format`. Ứng dụng không đọc PDF. |
| Từ điển, Hán Việt | `apps/api/src/modules/vocab`, `packages/content-tools/src/nlp` | JMdict, KANJIDIC2, Hán Việt 4 lớp |

## Triển khai

- Có image Docker cho api, web, admin và postgres (`infra/docker/`). Compose có các bản dev, staging, prod và demo (`infra/compose/`). Reverse proxy dùng Caddy.
- CI GitHub (`.github/workflows/`): lint, typecheck, test, build, CodeQL, staging E2E, kiểm tra tích hợp. Main được kiểm tra đủ 5 trình duyệt; PR chỉ chạy Chromium.
- Môi trường thử nằm trên máy ảo `jlpt-vm`. Xem [OPERATIONS.md](OPERATIONS.md).
- Production chưa có. Chủ dự án chưa chọn hosting.
