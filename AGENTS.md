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
3. **Tuân thủ** [docs/agents/SECURITY_RULES.md](docs/agents/SECURITY_RULES.md). Nhất là: không merge trực tiếp hoặc bỏ qua cổng CI, không force-push, không đọc hay in secret. PR nội bộ được workflow tự bật auto-merge và chỉ gộp khi các kiểm tra bắt buộc đạt.
4. **Chạy các cổng kiểm tra** ở mục dưới trước khi nộp. Thiếu lệnh hoặc lệnh lỗi nghĩa là chưa đạt, không bỏ qua.
5. **Quy trình sửa tính năng:** làm đúng mục "Quy trình sửa tính năng" ngay bên dưới. Chi tiết và các trường hợp đặc biệt ở [docs/agents/DEV_WORKFLOW.md](docs/agents/DEV_WORKFLOW.md); đọc file đó trước khi sửa.
6. **Ưu tiên khi có mâu thuẫn:** chỉ thị chủ dự án > phiếu việc > tài liệu này > thói quen của agent.

## Quy trình sửa tính năng

Áp dụng cho mọi thay đổi (kể cả sửa một dòng chữ). Chi tiết: [docs/agents/DEV_WORKFLOW.md](docs/agents/DEV_WORKFLOW.md).

1. **Làm trong git, trên nhánh riêng từ `origin/main`.** Không sửa trong thư mục copy cũ ở `/home/jlpt`, và không sửa trong thư mục mà service đang chạy (`/srv/jlpt-preview/repo`, `/home/jlpt/preview-3210`). Tạo worktree: `git -C /home/jlpt/paper-exam-20261024 fetch origin main`, rồi `git -C /home/jlpt/paper-exam-20261024 worktree add /home/jlpt/wt-<tên> -b <loai>/<ten-ngan> origin/main` (ví dụ `fix/footer-tagline`, `feat/...`), rồi `pnpm install --frozen-lockfile --prefer-offline`. Được giao đúng một worktree có sẵn thì làm trong đó và không đụng vào thay đổi của người khác.
2. **Sửa rồi chạy kiểm tra tại chỗ.** Chỉ đổi chữ: `pnpm typecheck` và `pnpm --filter @jlpt/web test`. Đổi code: thêm các cổng trong mục "Cổng kiểm tra trước khi nộp" (CI chạy lại tất cả). Chuỗi **mới** phải có đủ `vi.json`, `ja.json`, `en.json`. Sửa chuỗi **có sẵn** thì sửa đúng ngôn ngữ được yêu cầu; nếu bản ja/en cũng cần đồng bộ, hỏi chủ dự án. Chuỗi giao diện nằm trong `apps/web/messages/{vi,ja,en}.json` (`vi-shell.json` hiện không được import ở đâu).
3. **Commit, push nhánh** (`git push -u origin <nhánh>`). Không push thẳng vào `main`.
4. **Xem thử cho chủ dự án:** `ssh jlpt-vm 'cd <worktree> && tools/ops/preview-branch.sh <nhánh>'` rồi **báo chủ dự án link `http://192.168.114.206:3210`**. Không cần chờ CI. Chỉ có **một** bản xem thử; chạy lại sẽ thay bản trước. Chụp ảnh khi cần: `node /opt/shot/shot.mjs <url> <ảnh.png> [bề rộng]`. Script từ chối nhánh có migration database. Sửa API hoặc dữ liệu thì không xem thử được trên :3210, nói rõ với chủ dự án.
5. **Mở PR vào `main`** để CI chạy song song (~30 phút). Ghi trong mô tả cái đã kiểm tra và **cái chưa kiểm tra**. Workflow bật auto-merge sau **mỗi** lần push. **Mặc định với thay đổi giao diện: tắt auto-merge** (`gh pr merge <số> --disable-auto`, sau mỗi lần push, rồi kiểm tra `gh pr view <số> --json autoMergeRequest` ra `null`) và để chủ dự án merge sau khi đã xem :3210 và CI xanh; chủ dự án dặn khác thì làm theo.
6. **Sau khi merge,** `:3000` và `:3001` tự build lại từ `main` trong khoảng 5–10 phút. Mở trang thật kiểm tra rồi mới báo xong.

Không bỏ qua CI, không force-push, không chạy migration hay sửa dữ liệu trên database dùng chung khi chưa có sao lưu và đồng ý của chủ dự án.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript strict. Python chỉ dùng cho công cụ dữ liệu (`tools/`). |
| Monorepo | pnpm 12.11, Turborepo 2.11 |
| Web học viên và admin | Next.js 16.4, React 19.3, Tailwind 4.1, HeroUI styles 3.2; phòng thi dùng HeroUI React 3.2.6 theo yêu cầu chủ dự án ngày 24/10/2026, các trang khác giữ bộ UI hiện tại |
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
pnpm docs:map                   # sinh lại docs/agents/*.generated.md
```

## Cổng kiểm tra trước khi nộp

Bắt buộc: `lint`, `typecheck`, `test`, `build`, `check:ui-primitives`, `check:no-mock-ui`, `docs:map` (file tự sinh phải khớp code).

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
| Sửa tính năng, xem thử cho chủ dự án, deploy | [docs/agents/DEV_WORKFLOW.md](docs/agents/DEV_WORKFLOW.md) |
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
| `DEV_WORKFLOW.md` | Quy trình sửa tính năng, xem thử :3210, PR, deploy sau merge |
| `OPERATIONS.md` | Máy ảo, preview, staging, quy trình PR |
| `SECURITY_RULES.md` | Những việc cấm |
| `TASK_TEMPLATE.md` | Mẫu phiếu giao việc |
| `WORKFLOW-6-WORKER.md` | Quy trình coordinator và 6 worker |
| `ONBOARDING_CHECK.md` | Bài kiểm tra cho agent mới |
| `PROJECT_MAP.generated.md` | **Tự sinh:** mọi trang web và admin, menu admin, mọi route API kèm quyền, cờ tính năng, phiên bản |
| `DATABASE.generated.md` | **Tự sinh:** mọi bảng kèm cột, kiểu, khóa ngoại |

File `*.generated.md` sinh bằng `pnpm docs:map`. Không sửa tay. Đổi route, bảng, menu hay cờ thì chạy lại lệnh và commit kết quả; CI sẽ báo lỗi nếu file lệch với code.

## Sổ tay từng bước (`docs/agent-guides/`)

| File | Việc |
|---|---|
| `them-trang-admin.md` | Thêm trang quản trị |
| `them-trang-hoc-vien.md` | Thêm trang học viên |
| `them-api.md` | Thêm API kèm test |
| `them-bang-cot-db.md` | Thêm bảng hoặc cột |
| `them-chuoi-giao-dien.md` | Thêm chuỗi vi/ja/en |
| `kiem-tra-truoc-khi-nop.md` | Các bước kiểm tra trước khi nộp |
