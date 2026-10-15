# Hợp đồng kỹ thuật toàn bộ sản phẩm

Phần A1–A14 dưới đây giữ chi tiết V1 gốc. [API_V1_V4.md](API_V1_V4.md), [DU_LIEU_VA_SU_KIEN.md](DU_LIEU_VA_SU_KIEN.md) và [DE_XUAT_KY_THUAT.md](DE_XUAT_KY_THUAT.md) bổ sung các miền V2–V4. Nếu mâu thuẫn, hợp đồng mở rộng được duyệt trong F02 là chuẩn; schema executable và fixtures phải cập nhật cùng PR. Không có ngoại lệ giản lược của kế hoạch một tuần cũ.

Không công bố số phiên bản SDK, giá dịch vụ hoặc kết luận pháp lý trong tài liệu này như thông tin đã xác minh hiện tại. F01 khóa version tương thích; chủ dự án xác nhận dịch vụ và pháp lý trước production.


Các mục dưới đây là **hợp đồng**: tên, đường dẫn, kiểu dữ liệu và định dạng phải theo đúng. Muốn đổi thì mở contract PR kèm danh sách worker bị ảnh hưởng (AGENTS.md) và chờ duyệt.

### A1. Cấu trúc repo

Đây là repo sản phẩm. Tên trong ngoặc là worker sở hữu theo `config/workers.example.json`.

```
/
├─ apps/
│  ├─ web/            @jlpt/web    Next.js: public, học viên, phòng thi, giáo viên (cổng 3000) (W3)
│  │  ├─ app/                       route (App Router)
│  │  ├─ features/                  exam, results, practice, mix, analytics, explanations,
│  │  │                             learning, planner, classroom, community, billing
│  │  ├─ messages/{vi,ja,en}.json   chuỗi giao diện
│  │  └─ e2e/                       Playwright
│  ├─ admin/          @jlpt/admin  Next.js: CMS, nhập gói, duyệt, billing, báo cáo (cổng 3001) (W4)
│  │  └─ features/                  content, users, import, review, exam, billing
│  ├─ api/            @jlpt/api    NestJS + Fastify (cổng 4000), APP_MODE=api | worker
│  │  └─ src/
│  │     ├─ main.ts, app.module.ts  khởi động theo APP_MODE, đăng ký module (W2)
│  │     ├─ db/                     schema Drizzle, migrations, seed (W1)
│  │     ├─ common/                 config, logging, errors, guards, rate-limit (W2)
│  │     └─ modules/                W2: auth, user, exam, blueprint, attempt, scoring, question-bank,
│  │                                media, import, review, license, admin, audit, outbox, storage,
│  │                                email, turnstile, notification, classroom, community
│  │                                W4: payment, entitlement, reporting, cms, experiment
│  │                                W5: ai, vocab, stats, planner, gamification, learning
│  └─ media-worker/   @jlpt/media-worker  Cloudflare Worker (W6)
├─ packages/
│  ├─ schema/         @jlpt/schema        Zod schema, type, fixtures, json-schema/ (W1)
│  ├─ exam-engine/    @jlpt/exam-engine   logic thuần: thi, chấm, mix, practice, difficulty (W1)
│  ├─ media-token/    @jlpt/media-token   ký/kiểm tra token (WebCrypto) (W1)
│  ├─ srs/            @jlpt/srs           adapter FSRS ghim phiên bản (W1)
│  ├─ api-client/     @jlpt/api-client    client sinh từ OpenAPI, không sửa tay (W1)
│  ├─ content-tools/  @jlpt/content-tools validator import v2, NLP trên JSON đã duyệt (W5)
│  ├─ ui/             @jlpt/ui            component dùng chung (RichTextView…) (W3)
│  └─ config/         @jlpt/config        tsconfig, eslint, prettier, tailwind preset (W6)
├─ tools/import-data/ CLI kiểm tra và đóng gói import v2 (W5)
├─ contracts/         openapi.yaml, events.schema.json (W1)
├─ fixtures/
│  ├─ contracts/      ví dụ hợp lệ và lỗi theo contract (W1)
│  └─ imports/        gói import v2 mẫu ready/draft (W5)
├─ infra/
│  ├─ compose/        compose.dev.yml, compose.prod.yml, profiles/{small,large}.env,
│  │                  .env.production.example
│  ├─ dev/            dev services tách riêng từng worker (W6)
│  ├─ postgres/       Dockerfile, postgresql.small.conf, postgresql.large.conf
│  ├─ cloudflared/    config.yml (không chứa credentials)
│  └─ server/         bootstrap.sh, deploy.sh, switch-profile.sh, daily-check.sh, systemd/
├─ tests/             integration/, e2e/, load/ (k6): test độc lập của W6
├─ docs/
│  ├─ decisions/      <taskId>-<slug>.md, mỗi task một file (mọi worker)
│  ├─ import-format/  hướng dẫn import v2 (W5)
│  ├─ runbooks/, release/   (W6)
│  └─ multi-worker/   bản sao bộ tài liệu kế hoạch này
├─ .github/workflows/ ci.yml, release.yml, integration.yml (W6)
└─ package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json (W6)
```

Coordinator điều phối sáu worker nằm ở repo riêng `jlpt-coordinator`, không nằm trong repo sản phẩm.

Trong tài liệu này, `pnpm --filter api` là cách viết tắt của `pnpm --filter @jlpt/api` (pnpm cho phép bỏ scope khi tên không trùng).

### A2. Giá trị enum và mã chuẩn

| Trường | Giá trị |
|---|---|
| `level` | `N1`, `N2`, `N3`, `N4`, `N5` |
| `session` | `7`, `12` |
| `Exam.kind` | `original`, `practice`, `mixed`, `custom` |
| `Question.origin` | `official_past_exam`, `self_authored`, `third_party`, `ai_generated` (ba giá trị đầu nhận nguyên từ `source.provenance` của import v2) |
| `review_status` | `draft`, `in_review`, `approved`, `rejected`, `hidden` |
| `attempt.mode` | `real`, `practice` |
| `attempt.status` | `in_progress`, `submitted` |
| `attempt.submitted_by` | `user`, `auto_client`, `system` |
| `attempt.result_flags` | `late_sync`, `interrupted` |
| `skill` | `kanji`, `vocabulary`, `grammar`, `reading`, `listening` |
| `attempt_events.type` | `answers`, `section_start`, `section_lock`, `submit`, `resume`, `offline`, `online`, `audio_error`, `late_sync` |
| `role` (toàn hệ thống) | `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`, `student` |
| `org_role` (theo tổ chức, lưu ở `org_memberships`) | `org_manager`, `teacher` |

`operator` là người vận hành hạ tầng (coordinator, server, backup), không phải tài khoản trong ứng dụng. Nhân sự (`admin`, `editor`, `reviewer`, `moderator`, `billing_admin`) bắt buộc 2FA và chỉ vào qua `ADMIN_HOST`.

**Mã phần thi (`section.code`)** — đề xuất, phải đối chiếu với blueprint chính thức (điều kiện ngoài `jlpt-blueprints`, dùng ở C01):
- N1, N2: `language_reading` (言語知識（文字・語彙・文法）・読解), `listening` (聴解).
- N3, N4, N5: `language_vocab` (言語知識（文字・語彙）), `language_grammar_reading` (言語知識（文法）・読解), `listening` (聴解).

**Mã dạng 問題 (`mondai_type`)** — danh sách từ vựng dùng chung; cấp độ nào có dạng nào, bao nhiêu câu **lấy từ blueprint chính thức (`jlpt-blueprints`)**, không suy ra từ bảng này:

| Mã | Tên | Mã | Tên |
|---|---|---|---|
| `kanji_reading` | 漢字読み | `comprehension_mid` | 内容理解（中文） |
| `orthography` | 表記 | `comprehension_long` | 内容理解（長文） |
| `word_formation` | 語形成 | `integrated_reading` | 統合理解 |
| `contextual` | 文脈規定 | `thematic` | 主張理解 |
| `paraphrase` | 言い換え類義 | `info_retrieval` | 情報検索 |
| `usage` | 用法 | `task_based` | 課題理解 |
| `grammar_form` | 文法形式の判断 | `point` | ポイント理解 |
| `sentence_composition` | 文の組み立て | `summary` | 概要理解 |
| `text_grammar` | 文章の文法 | `utterance` | 発話表現 |
| `comprehension_short` | 内容理解（短文） | `quick_response` | 即時応答 |
| | | `integrated_listening` | 統合理解（聴解） |

### A3. Biến môi trường

| Biến | Dùng ở | Ví dụ dev | Ghi chú |
|---|---|---|---|
| `NODE_ENV` | mọi app | `development` | |
| `APP_MODE` | api | `api` | `api` hoặc `worker` |
| `API_WORKERS` | api | `1` | số process API (profile small = 1, large = 3) |
| `DATABASE_URL` | api | `postgres://jlpt:jlpt@127.0.0.1:5432/jlpt` | |
| `REDIS_CORE_URL` | api | `redis://127.0.0.1:6379` | `noeviction` |
| `REDIS_CACHE_URL` | api, web | `redis://127.0.0.1:6380` | `allkeys-lru` |
| `PUBLIC_HOST` | api, web | `localhost:3000` | production: `example.com` |
| `ADMIN_HOST` | api, admin | `localhost:3001` | production: `admin.example.com` |
| `MEDIA_BASE_URL` | api | `http://localhost:4000/dev-media` | production: `https://media.example.com` |
| `API_INTERNAL_URL` | web, admin | `http://127.0.0.1:4000` | web gọi API khi build/ISR; production: `http://api:4000` |
| `WEB_INTERNAL_URL` | api | `http://127.0.0.1:3000` | api gọi revalidate của web; production: `http://web:3000` |
| `AUTH_SECRET` | api | chuỗi ngẫu nhiên ≥ 32 byte | secret của Better Auth |
| `MEDIA_TOKEN_SECRET` | api, media-worker | chuỗi ngẫu nhiên ≥ 32 byte | dùng chung với Worker |
| `REVALIDATE_SECRET` | api, web | chuỗi ngẫu nhiên | |
| `STORAGE_DRIVER` | api | `local` | `local` hoặc `r2` |
| `STORAGE_LOCAL_DIR` | api | `.data/storage` | |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | api | (trống) | chỉ khi `STORAGE_DRIVER=r2` |
| `R2_BUCKET_MEDIA`, `R2_BUCKET_IMPORTS` | api | `jlpt-media`, `jlpt-imports` | |
| `EMAIL_DRIVER` | api | `smtp` | `smtp` (Mailpit) hoặc `resend` |
| `SMTP_URL` | api | `smtp://127.0.0.1:1025` | |
| `RESEND_API_KEY`, `EMAIL_FROM` | api | (trống), `no-reply@localhost` | |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | web, api | khóa thử nghiệm của Cloudflare | lấy khóa thử nghiệm trong tài liệu Turnstile |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` | api | (trống) | để purge cache; không có thì bỏ qua |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | mọi app | (trống) | |
| `EXAM_GRACE_SEC` | api | `10` | |
| `LATE_SYNC_WINDOW_SEC` | api | `600` | |
| `BETWEEN_SECTIONS_MAX_HOURS` | api | `24` | |
| `WALG_S3_PREFIX`, `AWS_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_S3_FORCE_PATH_STYLE=true` | postgres (production) | | WAL-G đẩy lên bucket `jlpt-backups` của R2 |

### A4. Định dạng nội dung tiếng Nhật (RichText)

```ts
type Segment =
  | { t: "text"; text: string }                    // không chứa ký tự xuống dòng
  | { t: "ruby"; text: string; rt: string }         // chữ gốc + cách đọc (furigana)
  | { t: "underline"; children: Segment[] }         // phần được hỏi, gạch chân
  | { t: "emphasis"; children: Segment[] }          // in đậm, nếu đề gốc có
  | { t: "blank"; label?: string }                  // ô trống （　）
  | { t: "star" }                                   // ô trống mang dấu ★ (câu sắp xếp)
  | { t: "br" }                                     // xuống dòng
  | { t: "image"; mediaKey: string; alt: string; width: number; height: number };

type RichText = Segment[];

type RichBlock =                                     // dùng cho đoạn văn đọc hiểu
  | { type: "paragraph"; content: RichText }
  | { type: "image"; mediaKey: string; alt: string; width: number; height: number }
  | { type: "table"; rows: RichText[][] };
```

Quy tắc: `underline` và `emphasis` không lồng nhau quá 1 cấp; `ruby.text` và `ruby.rt` không rỗng; chuỗi ở dạng NFC; không có HTML trong bất kỳ trường nào.

Ví dụ:

```json
// Câu đọc kanji: この「地図」を見てください。
[{"t":"text","text":"この"},{"t":"underline","children":[{"t":"text","text":"地図"}]},{"t":"text","text":"を見てください。"}]

// Furigana
[{"t":"ruby","text":"漢字","rt":"かんじ"},{"t":"text","text":"を勉強します。"}]

// Câu sắp xếp ★: あの店の ＿ ＿ ★ ＿ おいしい。
[{"t":"text","text":"あの店の"},{"t":"blank"},{"t":"blank"},{"t":"star"},{"t":"blank"},{"t":"text","text":"おいしい。"}]
```

### A5. Snapshot đề, manifest, đường dẫn lưu trữ

Đường dẫn trong storage:
- `exams/{examId}/v{version}/snapshot.json`
- `exams/{examId}/v{version}/manifest.json`
- `media/{sha256}.{ext}` (file media, bất biến)
- `imports/{packageId}/r{revision}/{sha256}.zip` (gói import v2 nguyên bản, riêng tư, chỉ staff)
- `sources/{sha256}.pdf` (PDF nguồn tùy chọn trong gói, riêng tư, chỉ để người duyệt đối chiếu)

Ví dụ snapshot (**các con số chỉ là ví dụ**, không phải số liệu JLPT):

```json
{
  "schemaVersion": 1,
  "examId": "0192f0c0-0000-7000-8000-000000000001",
  "version": 1,
  "level": "N5",
  "title": "Đề luyện N5 – mẫu",
  "kind": "practice",
  "totalQuestions": 6,
  "sections": [
    {
      "index": 0,
      "code": "language_vocab",
      "title": "言語知識（文字・語彙）",
      "durationSec": 600,
      "questionRange": [0, 1],
      "groups": [
        {
          "groupId": "0192f0c0-0000-7000-8000-0000000000a1",
          "mondaiType": "kanji_reading",
          "instructions": [{"t":"text","text":"＿＿＿のことばはどうよみますか。"}],
          "passage": null,
          "media": [],
          "questions": [
            {
              "index": 0,
              "questionId": "0192f0c0-0000-7000-8000-0000000000b1",
              "number": "1",
              "stem": [{"t":"text","text":"この"},{"t":"underline","children":[{"t":"text","text":"地図"}]},{"t":"text","text":"を見てください。"}],
              "options": [
                {"label":"1","content":[{"t":"text","text":"ちず"}]},
                {"label":"2","content":[{"t":"text","text":"ちと"}]},
                {"label":"3","content":[{"t":"text","text":"じず"}]},
                {"label":"4","content":[{"t":"text","text":"じと"}]}
              ]
            }
          ]
        }
      ],
      "listeningTimeline": null
    },
    {
      "index": 2,
      "code": "listening",
      "title": "聴解",
      "durationSec": 900,
      "questionRange": [4, 5],
      "groups": [],
      "listeningTimeline": [
        {"groupId":"0192f0c0-0000-7000-8000-0000000000a9","mediaKey":"media/9f2c….mp3","startMs":0,"endMs":42000,"audioStartMs":0,"audioEndMs":42000,"gapAfterMs":8000}
      ]
    }
  ]
}
```

Quy tắc snapshot:
- Schema dùng `strict()`: **không được có** trường đáp án (`correct`, `answer`, `answerKey`, `explanation`…).
- `index` của câu chạy liên tục từ 0 tới `totalQuestions − 1` theo thứ tự trong đề; `questionRange` gồm cả hai đầu.
- Mỗi câu có 3 hoặc 4 lựa chọn; giá trị trong phiếu trả lời: `0` = bỏ trống, `1…n` = lựa chọn thứ n.
- Mọi `mediaKey` phải có trong manifest.
- Mỗi đoạn `listeningTimeline` dùng đúng các trường của import v2: `groupId`, `mediaKey`, `startMs`, `endMs`, `audioStartMs`, `audioEndMs`, `gapAfterMs`, đơn vị mili giây. `startMs`/`endMs` là mốc trên đồng hồ phần nghe, `audioStartMs`/`audioEndMs` là đoạn cần phát trong file; `endMs − startMs = audioEndMs − audioStartMs`. Import, admin API, exam-engine và snapshot dùng chung dạng này.

Manifest:

```json
{ "examId": "0192f0c0-0000-7000-8000-000000000001", "version": 1,
  "media": ["media/9f2c….mp3", "media/ab12….webp"] }
```

### A6. Blueprint

```json
{
  "level": "N3",
  "version": 1,
  "effectiveFrom": "YYYY-MM",
  "sourceRef": [{ "url": "https://www.jlpt.jp/...", "accessedAt": "YYYY-MM-DD" }],
  "sections": [
    {
      "code": "language_vocab",
      "title": "言語知識（文字・語彙）",
      "durationSec": 0,
      "mondai": [
        { "type": "kanji_reading", "skill": "kanji", "questionCount": 0 }
      ]
    }
  ],
  "scoring": {
    "method": "linear_reference",
    "rounding": "round",
    "scoringSections": [
      { "code": "language", "label": "言語知識（文字・語彙・文法）", "skills": ["kanji", "vocabulary", "grammar"], "maxScaled": 0, "minPass": 0 }
    ],
    "totalMax": 0,
    "totalPass": 0
  }
}
```

- **Mọi số 0 là chỗ phải điền từ nguồn chính thức (điều kiện ngoài `jlpt-blueprints`).** Không được để 0 khi đưa vào seed; validate từ chối giá trị 0.
- Phần điểm (`scoringSections`) có thể khác phần thi (`sections`); điểm được tính theo `skills` của từng câu.
- `linear_reference`: điểm quy đổi = làm tròn(điểm thô / điểm thô tối đa × `maxScaled`). Đây là cách quy đổi tham khảo, giao diện phải ghi rõ.

### A7. Gói nhập đề phiên bản 2

Hợp đồng hiện hành: [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md), [schema import v2](schemas/import-v2.schema.json) và [gói mẫu](examples/import-v2-ready/import.json). Chủ dự án chuẩn bị import.json, media và nguồn tùy chọn; server không đọc PDF/ảnh để suy ra câu hỏi hoặc đáp án. Phiên bản1 ở nguồn là lịch sử, không nhận ngầm qua endpointv2. Gói chứa đáp án nên chỉ staff được tải lên/xem, snapshot public phải bỏ đáp án.

### A8. API V1

Tiền tố chung `/api/v1`. Request và response là JSON (`camelCase`), trừ upload dùng multipart. Mọi endpoint mặc định cần đăng nhập, trừ endpoint ghi `Public`.

**Thư viện đề và tài khoản**

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /health` | Public | `{ "status": "ok", "db": "ok", "redisCore": "ok", "redisCache": "ok", "version": "…" }` |
| `GET /exams?level=&year=&session=&kind=` | Public | `{ "items": ExamSummary[] }` |
| `GET /exams/:slug` | Public | `ExamSummary` + `description` |
| `GET /me` / `PATCH /me` | Học viên | đọc/sửa `name`, `targetLevel`; trả thêm `completedExams` |
| `GET /me/exam-status?level=` | Học viên | `{ "items": [{ "examId", "status": "not_started" \| "in_progress" \| "completed", "attempts" }] }` |
| `GET /me/attempts?cursor=` | Học viên | `{ "items": AttemptSummary[], "nextCursor": string \| null }` |
| `/auth/*` | Public | các route của Better Auth |

`ExamSummary`: `{ id, slug, level, title, kind, year, session, totalQuestions, sections: [{ title, durationSec }], sourceLabel, licenseLabel, guestTrial, publishedVersion }`.

**Lượt thi** (chủ attempt; khách làm thử dùng cookie `__Host-guest`)

| Endpoint | Request | Response 2xx |
|---|---|---|
| `POST /attempts` | `{ examId, mode: "real" \| "practice" }` | 201 `{ attemptId, lease, serverNow, snapshotUrl, mediaToken, mediaTokenExp, status: "in_progress", currentSection: null }` |
| `POST /attempts/:id/sections/next` | `{ lease }` | `{ sectionIndex, startedAt, deadline, serverNow }` |
| `PUT /attempts/:id/sheet` | `{ lease, seq, answers: number[], flags: number[], timeSpentMs?: number[], changes: [{ i, v, at }] }` | `{ lastSeq, serverNow }` |
| `POST /attempts/:id/submit` | `{ lease, seq, answers, flags, timeSpentMs? }` | `{ result: Result }` (gọi lại trả đúng kết quả cũ) |
| `POST /attempts/:id/resume` | `{}` | `{ lease, lastSeq, answers, flags, status, currentSection, deadline, serverNow, snapshotUrl, mediaToken, mediaTokenExp }` |
| `POST /attempts/:id/media-token` | `{}` | `{ mediaToken, mediaTokenExp }` |
| `GET /attempts/:id` | | `{ status, mode, currentSection, deadline, serverNow, result? }` |
| `GET /attempts/:id/review` | | chỉ sau khi nộp: `{ snapshotUrl, mediaToken, answers, flags, correct: number[], result }` |
| `POST /attempts/:id/check` (V2) | `{ lease, index }` | chế độ luyện tập: `{ index, correct, explanation? }` cho câu đã trả lời |

- `changes[].i` là vị trí câu, `v` là giá trị mới (0…4), `at` là thời điểm theo giờ server ước tính (`Date.now() + offset`, mili giây).
- `deadline`, `serverNow`, `startedAt`: chuỗi ISO 8601 UTC.

`Result`:

```json
{
  "totals": { "correct": 0, "wrong": 0, "blank": 0, "total": 0 },
  "accuracy": 0,
  "durationSec": 0,
  "bySection": [{ "code": "…", "correct": 0, "total": 0 }],
  "bySkill": [{ "skill": "kanji", "correct": 0, "total": 0 }],
  "scoring": {
    "method": "linear_reference",
    "sections": [{ "code": "…", "label": "…", "raw": 0, "rawMax": 0, "scaled": 0, "maxScaled": 0, "minPass": 0, "passed": true }],
    "total": 0, "totalMax": 0, "totalPass": 0, "passEstimate": true
  },
  "flags": []
}
```

**Admin** (`/api/v1/admin/*`): chỉ trên `ADMIN_HOST`, role nhân sự đã bật 2FA, mọi thao tác ghi có audit log. Tài nguyên: `media`, `sources`, `licenses`, `groups`, `questions`, `reviews`, `blueprints`, `exams` (kèm `items`, `publish`, `unpublish`), `imports`, `users`, `audit-logs`, `dashboard`. Quy ước: `GET /x?cursor=&limit=&<bộ lọc>`, `POST /x`, `GET /x/:id`, `PATCH /x/:id`, `DELETE /x/:id` (xóa mềm), hành động riêng `POST /x/:id/<hanh-dong>`.

**Nội bộ:** `apps/web` có `POST /api/revalidate` (header `x-revalidate-secret`), body `{ tags?: string[], paths?: string[] }`.

### A9. Định dạng lỗi chuẩn

```json
{ "error": { "code": "LEASE_INVALID", "message": "Bài thi đang được mở ở nơi khác.", "details": {}, "requestId": "req_01J…" } }
```

| Mã | HTTP | Khi nào |
|---|---|---|
| `VALIDATION_ERROR` | 400 | dữ liệu sai schema (`details` liệt kê trường lỗi) |
| `TURNSTILE_FAILED` | 400 | thiếu hoặc sai token Turnstile |
| `UNAUTHENTICATED` | 401 | chưa đăng nhập |
| `EMAIL_NOT_VERIFIED` | 403 | chưa xác minh email |
| `FORBIDDEN` | 403 | không đủ quyền |
| `TWO_FACTOR_REQUIRED` | 403 | nhân sự chưa bật 2FA |
| `NOT_FOUND` | 404 | không tồn tại hoặc không được phép biết là tồn tại |
| `ATTEMPT_ALREADY_OPEN` | 409 | đã có bài đang mở cho đề này (`details.attemptId`) |
| `LEASE_INVALID` | 409 | bài đang mở ở tab/thiết bị khác |
| `ATTEMPT_CLOSED` | 409 | bài đã nộp hoặc đã bị đóng |
| `ATTEMPT_NOT_SUBMITTED` | 409 | xem lại khi chưa nộp |
| `SECTION_NOT_STARTED` | 409 | lưu phiếu khi chưa bắt đầu phần nào |
| `NO_MORE_SECTIONS` | 409 | không còn phần thi tiếp theo |
| `DEADLINE_PASSED` | 422 | quá deadline + grace ở chế độ thi thật |
| `RATE_LIMITED` | 429 | vượt giới hạn (có header `Retry-After`) |
| `INTERNAL_ERROR` | 500 | lỗi không lường trước (không lộ chi tiết) |
| `SERVICE_UNAVAILABLE` | 503 | DB/Redis không sẵn sàng |

`message` theo ngôn ngữ của người dùng (vi/ja/en, mặc định vi), hiển thị được cho người dùng. `requestId` dùng để tra log. Client quyết định hành vi theo `code`, không theo `message`.

### A10. Bảng DB cho phần đề thi và lượt thi

Quy ước chung: khóa chính `id uuid` (UUIDv7, sinh trong app); `created_at`, `updated_at` kiểu `timestamptz`, mặc định `now()`; enum lưu `text` + `CHECK`; bảng nội dung có `deleted_at` (xóa mềm). Các bảng khác theo [DU_LIEU_VA_SU_KIEN.md](DU_LIEU_VA_SU_KIEN.md).

```sql
exam_versions (
  exam_id            uuid  NOT NULL REFERENCES exams(id),
  version            int   NOT NULL,
  snapshot_key       text  NOT NULL,
  manifest_key       text  NOT NULL,
  blueprint_id       uuid  NOT NULL,
  blueprint_version  int   NOT NULL,
  scoring            jsonb NOT NULL,
  total_questions    int   NOT NULL,
  published_at       timestamptz NOT NULL,
  published_by       uuid  NOT NULL REFERENCES users(id),
  PRIMARY KEY (exam_id, version)
)

exam_answer_keys (                       -- chỉ server đọc
  exam_id         uuid NOT NULL,
  version         int  NOT NULL,
  keys            smallint[] NOT NULL,    -- đáp án theo vị trí câu, giá trị 1..4
  skills          text[]     NOT NULL,    -- kỹ năng theo vị trí câu
  mondai_types    text[]     NOT NULL,
  section_ranges  jsonb      NOT NULL,    -- [[0,34],[35,66],[67,104]]
  PRIMARY KEY (exam_id, version),
  FOREIGN KEY (exam_id, version) REFERENCES exam_versions(exam_id, version)
)

exam_attempts (
  id               uuid PRIMARY KEY,
  user_id          uuid NULL REFERENCES users(id),
  guest_id         uuid NULL,
  exam_id          uuid NOT NULL,
  exam_version     int  NOT NULL,
  mode             text NOT NULL CHECK (mode IN ('real','practice')),
  status           text NOT NULL CHECK (status IN ('in_progress','submitted')),
  submitted_by     text NULL CHECK (submitted_by IN ('user','auto_client','system')),
  current_section  smallint NULL,          -- NULL = chưa bắt đầu phần nào
  current_deadline timestamptz NULL,       -- để worker tìm bài quá hạn nhanh
  section_times    jsonb NOT NULL DEFAULT '[]',  -- [{index, startedAt, deadline, lockedAt}]
  lease_id         uuid NOT NULL,
  result_flags     text[] NOT NULL DEFAULT '{}',
  attempt_month    date NOT NULL,          -- ngày đầu tháng của started_at
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz NULL,
  result           jsonb NULL,
  CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL),
  FOREIGN KEY (exam_id, exam_version) REFERENCES exam_versions(exam_id, version)
)
-- 1 bài đang mở cho mỗi user và đề:
CREATE UNIQUE INDEX ON exam_attempts (user_id, exam_id) WHERE status = 'in_progress' AND user_id IS NOT NULL;
CREATE INDEX ON exam_attempts (current_deadline) WHERE status = 'in_progress';

attempt_answer_sheets (
  attempt_id     uuid PRIMARY KEY REFERENCES exam_attempts(id),
  answers        smallint[] NOT NULL,
  flags          smallint[] NOT NULL DEFAULT '{}',
  time_spent_ms  integer[] NULL,           -- dùng cho SCORE-15 (V2)
  last_seq       integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 70);

attempt_events (                          -- append-only, chia partition theo tháng
  id             uuid NOT NULL,
  attempt_month  date NOT NULL,
  attempt_id     uuid NOT NULL,
  seq            integer NULL,             -- chỉ có với type = 'answers'
  type           text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}',
  at             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (attempt_month, id),
  UNIQUE (attempt_month, attempt_id, seq)
) PARTITION BY RANGE (attempt_month);

user_answers (                            -- worker tạo sau khi nộp
  attempt_id      uuid NOT NULL REFERENCES exam_attempts(id),
  question_index  smallint NOT NULL,
  question_id     uuid NOT NULL,
  option_value    smallint NOT NULL,        -- 0 = bỏ trống
  is_correct      boolean NOT NULL,
  flagged         boolean NOT NULL,
  PRIMARY KEY (attempt_id, question_index)
)

outbox (
  id            uuid PRIMARY KEY,
  topic         text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz NULL
)
CREATE INDEX ON outbox (created_at) WHERE published_at IS NULL;
```

### A11. mediaToken

- Dạng `<payload>.<sig>`: `payload` = base64url của JSON `{ "a": attemptId, "e": examId, "v": version, "k": "attempt" | "review", "exp": <unix giây> }`; `sig` = base64url(HMAC-SHA256(`MEDIA_TOKEN_SECRET`, chuỗi payload)).
- Kiểm tra: so sánh chữ ký theo thời gian hằng định; `exp` còn hạn; với snapshot thì `e`, `v` phải khớp đường dẫn; với media thì file phải có trong manifest của `(e, v)`.
- Hạn dùng: `attempt` = tổng thời gian các phần + 30 phút (client xin token mới qua `POST /attempts/:id/media-token` khi còn dưới 10 phút); `review` = 2 giờ.
- URL:
  - `https://media.example.com/exams/{examId}/v{version}/snapshot.json?t=<token>`
  - `https://media.example.com/m/{sha256}.{ext}?t=<token>` (Worker đọc object `media/{sha256}.{ext}`)
- Cache: cache key là URL **không có** tham số `t`. Header gửi trình duyệt: media `Cache-Control: private, max-age=86400, immutable`; snapshot `private, max-age=3600`; lỗi `no-store`.

### A12. Docker Compose production và profile theo gói

Trong production, các container gọi nhau qua mạng Docker (`postgres:5432`, `redis-core:6379`, `redis-cache:6379`, `api:4000`, `web:3000`). Chỉ `web`, `admin`, `api` publish cổng, và chỉ ra `127.0.0.1` cho `cloudflared`. `DATABASE_URL`, `REDIS_*_URL` dùng tên service; `API_INTERNAL_URL=http://api:4000`; api gọi revalidate qua `WEB_INTERNAL_URL=http://web:3000`.

| Service | Image | Cổng | small (Shared 4 GB) | large (Dedicated 8 GB) |
|---|---|---|---|---|
| `web` | `ghcr.io/<owner>/jlpt-web:${IMAGE_TAG}` | `127.0.0.1:3000` | `mem_limit: 448m`, `--max-old-space-size=320` | `1g`, `768` |
| `admin` | `ghcr.io/<owner>/jlpt-admin:${IMAGE_TAG}` | `127.0.0.1:3001` | `320m`, `256` | `512m`, `384` |
| `api` | `ghcr.io/<owner>/jlpt-api:${IMAGE_TAG}`, `APP_MODE=api` | `127.0.0.1:4000` | `512m`, `API_WORKERS=1`, `384` | `1280m`, `API_WORKERS=3`, `384` mỗi process |
| `worker` | cùng image api, `APP_MODE=worker` | không | `320m`, `256` | `512m`, `384` |
| `postgres` | `jlpt-postgres` (build từ `infra/postgres`) | không publish | `1024m` | `2560m` |
| `redis-core` | Redis/Valkey (ghim phiên bản) | không | `160m`, `maxmemory 128mb` | `320m`, `256mb` |
| `redis-cache` | Redis/Valkey (ghim phiên bản) | không | `96m`, `maxmemory 64mb` | `320m`, `256mb` |

Lệnh Redis: `redis-core`: `--maxmemory-policy noeviction --appendonly yes --appendfsync everysec`; `redis-cache`: `--maxmemory-policy allkeys-lru --save "" --appendonly no`.

Cấu hình PostgreSQL:

| Tham số | small | large |
|---|---|---|
| `max_connections` | 60 | 100 |
| `shared_buffers` | 256MB | 768MB |
| `effective_cache_size` | 768MB | 2GB |
| `work_mem` | 4MB | 8MB |
| `maintenance_work_mem` | 64MB | 256MB |
| `random_page_cost` | 1.1 | 1.1 |
| `archive_mode` / `archive_command` / `archive_timeout` | `on` / `wal-g wal-push %p` / `300` | như small |

Các con số trên là điểm khởi đầu; V06 đo thực tế rồi điều chỉnh.

### A13. Cấu hình cloudflared

`infra/cloudflared/config.yml` (file credentials nằm trên server, không commit):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: example.com
    path: ^/api/v1/admin(/.*)?$
    service: http_status:404
  - hostname: example.com
    path: ^/api/.*
    service: http://127.0.0.1:4000
  - hostname: example.com
    service: http://127.0.0.1:3000
  - hostname: admin.example.com
    path: ^/api/.*
    service: http://127.0.0.1:4000
  - hostname: admin.example.com
    service: http://127.0.0.1:3001
  - hostname: ssh.example.com
    service: ssh://127.0.0.1:22
  - service: http_status:404
```

- Thứ tự rule có ý nghĩa: rule chặn `/api/v1/admin` phải đứng trước rule `/api/`.
- `www.example.com` chuyển hướng về `example.com` bằng Redirect Rule của Cloudflare.
- `cloudflared` chạy dạng systemd trên host (không chạy trong Docker), vì cần truy cập `127.0.0.1:22` cho SSH.

### A14. Job nền

| Job | Lịch chạy | Việc làm |
|---|---|---|
| `outbox-relay` | mỗi 2 giây | đẩy các dòng `outbox` chưa gửi vào BullMQ, đánh dấu `published_at` |
| `close-expired-attempts` | mỗi phút | đóng bài đã qua `current_deadline` + cửa sổ nhận phiếu muộn, dùng cùng hàm khóa + chấm với submit |
| `abandon-between-sections` | mỗi 15 phút | đóng bài chờ giữa hai phần quá `BETWEEN_SECTIONS_MAX_HOURS` |
| `ensure-partitions` | hằng ngày 01:00 (giờ VN) | tạo partition `attempt_events` cho 2 tháng tới |
| `normalize-user-answers` | khi có `attempt.submitted` | ghi `user_answers` |
| `update-user-stats` | khi có `attempt.submitted` | cập nhật số đề đã hoàn thành và trạng thái đề của user |

Mọi job phải idempotent: chạy lại không tạo dữ liệu trùng.

---


## A15 Các quy tắc bổ sung bắt buộc

- events có eventId, schemaVersion, occurredAtUTC, actorId, tenantId khi liên quan; consumers idempotent.
- exam kind custom/mixed vẫn sinh immutable snapshot, answer key server-only và source attribution theo license.
- mock endpoints chỉ trong test/dev, không route từ production và không tính bằng chứng tích hợp.
- mọi tập hợp trả cursor/limit; limit mặc định20, tối đa100; timestamps UTC; money integer minor units + currency, không float.
- authenticated write kiểm tra session, tenant/owner, entitlement và Origin/CSRF; session cookies Secure HttpOnly SameSite, proxy trust list cụ thể.
- teacher tenant authorization và enrollment kiểm tra trên server; không dùng tenantId từ body làm nguồn tin cậy.
- JSON/CSV/XLSX/PDF exports có access check, chống formula injection, signed URL hết hạn; xóa dữ liệu theo retention đã duyệt.
- Feature AI dùng provider credentials riêng được operator cấp, metering atomic và moderation. Không dùng AI chấm điểm bài thi.
- kết quả event thi đồng loạt chưa công bố không được truy cập qua review/check/transcript/export/AI/CDN dù người dùng đã nộp.
- dictionary/audio/TTS có nguồn license; nội dung AI phải ai_generated, chưa duyệt không vào ngân hàng dùng công khai.
- coding worker không phải APP_MODE=worker hay API_WORKERS; ba khái niệm cấu hình độc lập.
