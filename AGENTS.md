# JLPT Online: hướng dẫn cho agent

File này dành cho mọi agent làm việc trong repo (Claude Code, Codex, Antigravity/Gemini, Cursor, Copilot…). Đọc file này trước. Các file sâu hơn chỉ đọc khi việc đang làm cần đến.

## Sản phẩm

Web luyện thi JLPT (N5–N1) cho người Việt, gồm:

- Làm đề và thi thử có giờ, chấm điểm, nghe có audio.
- Học: sổ tay, flashcard SRS, kế hoạch học.
- Tra từ điển, có âm Hán Việt theo từng từ.
- Trang quản trị để nhập đề, duyệt nội dung, quản lý người dùng và thanh toán.

Giao diện có ba ngôn ngữ vi/ja/en. Tiếng Việt là ngôn ngữ chính.

## Bắt buộc khi làm việc

1. **Trước khi làm tính năng mới:** đọc [docs/agents/FEATURES.md](docs/agents/FEATURES.md) để biết tính năng đã có, đang ẩn hay đang làm. Không làm trùng.
2. **Khi xong:** cập nhật `FEATURES.md`. Gặp bẫy mới thì ghi vào [docs/agents/PITFALLS.md](docs/agents/PITFALLS.md) theo dạng triệu chứng → nguyên nhân → cách đúng.
3. **Tuân thủ** [docs/agents/SECURITY_RULES.md](docs/agents/SECURITY_RULES.md). Nhất là: không tự merge PR, không force-push, không đọc hay in secret.
4. **Chạy các cổng kiểm tra** ở mục dưới trước khi nộp. Thiếu lệnh hoặc lệnh lỗi nghĩa là chưa đạt, không bỏ qua.
5. **Ưu tiên khi có mâu thuẫn:** chỉ thị chủ dự án > phiếu việc > tài liệu này > thói quen của agent.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript strict. Python chỉ dùng cho công cụ dữ liệu (`tools/`). |
| Monorepo | pnpm 12.11, Turborepo 2.11 |
| Web học viên và admin | Next.js 16.4, React 19.3, Tailwind 4.1, HeroUI styles 3.2 (chỉ CSS, **không** dùng `@heroui/react`) |
| API | NestJS 12 trên Fastify 5, Drizzle ORM 0.45, PostgreSQL 17, Redis 7 |
| Test | Vitest 5 (API dùng PGlite, một Postgres chạy trong bộ nhớ), Playwright 1.64 (E2E trên staging) |

Chi tiết ở [docs/agents/ARCHITECTURE.md](docs/agents/ARCHITECTURE.md).

## Sơ đồ thư mục

```
apps/
  api/            NestJS. src/modules/<31 module>, src/db (schema.ts, migrations), src/common (guard, decorator)
  web/            Next.js, trang học viên. app/(nhóm)/<route tiếng Việt>, features/<miền>, messages/{vi,ja,en}.json
  admin/          Next.js, trang quản trị. app/<route>, lib/navigation.ts (menu và quyền), lib/api-client.ts
  media-worker/   Cloudflare Worker phục vụ media có token
packages/
  ui/             Component HeroUI dùng chung (@jlpt/ui)
  schema/         Zod schema và kiểu dùng chung (@jlpt/schema); sinh api-client từ contracts/
  api-client/     Client tự sinh, KHÔNG sửa tay (pnpm contracts:generate)
  exam-engine/    Chấm điểm, thời gian, trộn đề: hàm thuần
  srs/            Lập lịch flashcard (FSRS): hàm thuần
  content-tools/  Kiểm tra gói nhập đề, NLP tiếng Nhật, Hán Việt
  media-token/    Ký token media
  config/         Cấu hình dùng chung
contracts/        openapi.yaml, events.schema.json
infra/            Docker, compose (dev/staging/prod/demo), Caddy, backup
tests/            E2E (vitest + Playwright), load, Lighthouse
tools/            import-data (kiểm tra gói đề), kanji-dataset
data/             Dữ liệu tĩnh (kanji)
docs/             agents/ (bộ tài liệu này), decisions/, runbooks/, import-format/, multi-worker/ (kế hoạch và coordinator)
```

Một số thư mục con có `AGENTS.md` riêng. Khi sửa code trong thư mục đó, đọc file của thư mục ấy: `apps/api`, `apps/web`, `apps/admin`, `packages/ui`, `packages/content-tools`, `infra`.

## Lệnh thường dùng

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test                       # toàn bộ unit test (chạy tuần tự từng gói để đỡ tốn RAM)
pnpm build
pnpm check:ui-primitives        # cấm thẻ thô và style inline
pnpm check:no-mock-ui           # cấm dữ liệu giả trong giao diện
pnpm --filter @jlpt/admin test  # test admin (không dùng `pnpm test:admin` ở gốc)
pnpm test:web                   # test web
pnpm test:db                    # test migration và schema
```

## Cổng kiểm tra trước khi nộp

Bắt buộc: `lint`, `typecheck`, `test`, `build`, `check:ui-primitives`, `check:no-mock-ui`.

Có giao diện, E2E hoặc API mà staging dùng thì chạy thêm E2E trên staging. Cách chạy xem [docs/agents/OPERATIONS.md](docs/agents/OPERATIONS.md). CI GitHub chạy lại tất cả, và mỗi vòng CI mất khoảng 30 phút, nên phải tự kiểm tra kỹ trước khi đẩy.

## Quy ước code

- Không dùng `any` hay `@ts-ignore` để qua lỗi.
- Tên biến và file viết ASCII. Route web bằng tiếng Việt không dấu (`/tu-vung`, `/de-thi`).
- Commit theo Conventional Commits (`feat(H06): …`, `fix(api): …`). Thân commit có thể ghi `Task: <mã>`.
- **Không chạy `prettier --write`.** Repo không có cấu hình prettier, nên chạy sẽ đổi toàn bộ nháy đơn thành nháy kép. Viết theo phong cách của code xung quanh.
- Mọi chuỗi giao diện phải có key trong đủ ba file `messages/vi.json`, `ja.json` và `en.json`.
- Giao diện chỉ dùng component của `@jlpt/ui`. Không dùng thẻ thô `<button>`, `<input>`, `<select>`, `<textarea>`, không dùng `style={{}}`.
- Giao diện gọi API thật. Không viết cứng mảng dữ liệu, không đăng nhập giả, không mock fetch trong code chạy thật.
- Thời gian lưu UTC. Chữ Nhật lưu chuẩn NFC, không chuyển sang NFKC.
- Đề đã xuất bản và đáp án không được sửa. Không lộ đáp án trước khi người dùng được phép xem.
- Thêm migration thì phải sửa các số đếm cứng trong `apps/api/src/db/db.test.ts`. Xem [PITFALLS](docs/agents/PITFALLS.md).

## Muốn làm X thì xem đâu

| Việc | Xem |
|---|---|
| Thêm hoặc sửa API | [apps/api/AGENTS.md](apps/api/AGENTS.md), [docs/agents/API.md](docs/agents/API.md) |
| Thêm bảng hoặc cột | [docs/agents/DATABASE.md](docs/agents/DATABASE.md) |
| Thêm trang học viên | [apps/web/AGENTS.md](apps/web/AGENTS.md) |
| Thêm trang quản trị | [apps/admin/AGENTS.md](apps/admin/AGENTS.md); mẫu từng bước: [docs/multi-worker/guides/H07-admin-lexicon.md](docs/multi-worker/guides/H07-admin-lexicon.md) |
| Component giao diện | [packages/ui/AGENTS.md](packages/ui/AGENTS.md) |
| Tiếng Nhật, Hán Việt, từ điển | [packages/content-tools/AGENTS.md](packages/content-tools/AGENTS.md) |
| Ẩn hoặc hiện tính năng | `apps/web/lib/features.ts`, [docs/decisions/feature-flags-phase-1.md](docs/decisions/feature-flags-phase-1.md) |
| Định dạng gói nhập đề | [docs/import-format/README.md](docs/import-format/README.md) |
| Docker, staging, E2E | [infra/AGENTS.md](infra/AGENTS.md), [docs/agents/OPERATIONS.md](docs/agents/OPERATIONS.md) |
| Vì sao code lại làm thế này | [docs/agents/DECISIONS.md](docs/agents/DECISIONS.md), `docs/decisions/<mã task>-*.md` |
| Viết phiếu giao việc | [docs/agents/TASK_TEMPLATE.md](docs/agents/TASK_TEMPLATE.md) |
| Làm việc qua coordinator (worker W1–W6) | [docs/agents/WORKFLOW-6-WORKER.md](docs/agents/WORKFLOW-6-WORKER.md) |

## Tài liệu sâu (`docs/agents/`)

| File | Nội dung |
|---|---|
| `ARCHITECTURE.md` | Công nghệ, luồng hệ thống, đăng nhập và quyền, triển khai |
| `DATABASE.md` | Nhóm bảng, quy ước, cách thêm bảng hoặc cột |
| `API.md` | Quy ước API, module, quyền |
| `FEATURES.md` | Tính năng theo trạng thái |
| `DECISIONS.md` | Quyết định và ý muốn của chủ dự án |
| `PITFALLS.md` | Các bẫy đã gặp |
| `OPERATIONS.md` | Máy ảo, preview, staging, quy trình PR |
| `SECURITY_RULES.md` | Những việc cấm |
| `TASK_TEMPLATE.md` | Mẫu phiếu giao việc |
| `WORKFLOW-6-WORKER.md` | Quy trình coordinator và 6 worker |
