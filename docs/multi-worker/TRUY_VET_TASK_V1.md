# Truy vết task V1 gốc sang kế hoạch sáu worker

Giữ toàn bộ chi tiết Làm/Không làm/Kiểm tra của V1 để không mất yêu cầu. Phụ thuộc và lịch trong đoạn trích dưới đây là lịch gốc, không dùng để giao việc. Graph hiện hành là tasks.json. Mâu thuẫn được xử lý theo AGENTS.md. Các task chủ dự án trở thành điều kiện ngoài, không biến thành quyền tự động cho worker.

## T1.0.1 Tạo tài khoản và tên miền

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: không.
- Làm: tạo các tài khoản ở mục B6; mua tên miền và chuyển DNS về Cloudflare; tạo repo GitHub private; bật 2FA cho mọi tài khoản; lưu toàn bộ thông tin đăng nhập trong trình quản lý mật khẩu.
- Kiểm tra: file `docs/accounts.md` liệt kê tên dịch vụ và email chủ sở hữu (không ghi mật khẩu, không ghi key); mọi tài khoản đã bật 2FA.

## T1.0.2 Chốt các quyết định D1–D8

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 1.3.
- Làm: hỏi luật sư về D1; chốt D2–D8. Agent tạo sẵn mẫu `docs/decisions/_template.md` (bối cảnh, quyết định, ngày, người quyết định, hệ quả); chủ dự án điền mỗi quyết định vào một file `docs/decisions/D1.md` … `D8.md`.
- Kiểm tra: đủ 8 file. Nếu D1 chưa có ý kiến pháp lý, file `D1.md` ghi rõ "chưa có — chặn ra mắt production".

## T1.0.3 Chuẩn bị dữ liệu mẫu

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: không.
- Làm: gom 3–5 bộ đề thật (mỗi bộ gồm PDF đề, file đáp án, audio nghe). Trong đó phải có ít nhất 1 PDF scan, 1 PDF có lớp chữ, câu có furigana, câu sắp xếp ★, bài đọc có bảng hoặc ảnh. Đặt ngoài repo, ở `../jlpt-samples/<mã-bộ>/`. Ghi nguồn và tình trạng bản quyền từng bộ vào `docs/samples.md`.
- Kiểm tra: `docs/samples.md` đủ thông tin; thư mục mẫu tồn tại ngoài repo; không có file mẫu nào trong repo.

## T1.0.4 Thu thập cấu trúc đề chính thức N1–N5

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: AGENT.

- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 10.2; Phụ lục A6.
- Làm: từ trang chính thức của JLPT (jlpt.jp), ghi cho từng cấp độ: các phần thi và thời gian từng phần; các dạng 問題 và số câu của từng dạng (ghi rõ nếu nguồn chỉ công bố số "dự kiến"); cách tính điểm (các phần điểm, thang điểm, điểm đỗ tổng, điểm liệt từng phần); thời điểm áp dụng. Mỗi con số kèm URL nguồn và ngày truy cập. Chỗ không tìm được nguồn chính thức: ghi `CHƯA XÁC NHẬN`, **không tự điền**.
- Output: `docs/jlpt-blueprints.md` (bảng dễ đọc) và `docs/jlpt-blueprints.json` (đúng cấu trúc Phụ lục A6).
- Không làm: không lấy số liệu từ blog, diễn đàn hay trí nhớ.
- Kiểm tra: mọi con số có nguồn; chủ dự án đánh dấu "đã xác nhận" ở đầu file `docs/jlpt-blueprints.md`.

## T1.0.5 Spike OCR với dữ liệu thật

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.0.6 Spike luồng phòng thi

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: AGENT.

- Phụ thuộc: không.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.
- Làm (code tạm trong `spikes/exam-flow/`):
  1. Server Node tối giản (Fastify + PostgreSQL trong Docker): tạo attempt, cấp lease, `PUT sheet` có `seq`, `submit`, job đóng bài quá hạn.
  2. Trang HTML/JS tối giản: lưu IndexedDB trước khi gửi, debounce 3 giây, tối đa 1 request đang chờ, `fetch` với `keepalive` khi rời trang, phát audio từ Cache Storage qua blob URL, tính lại vị trí audio khi tải lại trang.
  3. Thử từng tình huống và ghi kết quả: mất mạng 30 giây (DevTools → Offline); request đến sai thứ tự (server thêm độ trễ ngẫu nhiên); mở 2 tab; tải lại trang khi đang nghe; nộp bài đúng lúc job đóng bài chạy; iPhone thật (Safari) và Android thật (Chrome).
- Output: `docs/spikes/exam-flow-report.md`: tình huống → kết quả → vấn đề → đề xuất chỉnh mục 8 của `DE_XUAT_KY_THUAT.md`.
- Kiểm tra: mọi tình huống ở bước 3 có kết quả ghi lại, kể cả trên thiết bị thật.

## T1.0.7 Họp chốt Phase 1.0

Task thực thi liên quan: F02, F06, F08. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.0.4, T1.0.5, T1.0.6.
- Làm: đọc 2 báo cáo spike; quyết định tiếp tục, chỉnh định dạng, chỉnh luồng thi hay đổi D5. Ghi vào `docs/decisions/phase-1.0.md`. Các thay đổi được duyệt phải cập nhật vào `DE_XUAT_KY_THUAT.md` và Phụ lục A trước khi sang Phase 1.1.
- Kiểm tra: có file quyết định; tài liệu đã cập nhật theo quyết định.

## T1.1.1 Khởi tạo monorepo

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.0.7.
- Đọc thêm: Phụ lục A1, A2.
- Làm: tạo cấu trúc thư mục theo Phụ lục A1; `package.json` gốc (`private: true`, `packageManager: "pnpm@<bản ổn định>"`); `pnpm-workspace.yaml` (`apps/*`, `packages/*`); `turbo.json` (task `build`, `lint`, `typecheck`, `test`, `dev`); `.nvmrc`; `.editorconfig`; `.gitignore` (gồm `node_modules`, `.env*` trừ `.env.example`, `.data/`, `dist`, `.next`, `coverage`); `.gitattributes` với `* text=auto eol=lf`; `README.md` hướng dẫn chạy dev.
- Kiểm tra: `pnpm install` thành công; `pnpm turbo run build` chạy không lỗi.

## T1.1.2 Cấu hình chung TypeScript, ESLint, Prettier

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.1.
- Làm: trong `packages/config`: `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess: true`), ESLint flat config (typescript-eslint), Prettier config. Mọi app/package kế thừa từ đây.
- Kiểm tra: `pnpm lint` và `pnpm typecheck` chạy trên toàn repo và pass.

## T1.1.3 Khung các app và package

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.2.
- Đọc thêm: Phụ lục A1.
- Làm:
  - `apps/web`, `apps/admin`: Next.js (App Router, TypeScript, Tailwind CSS), `output: "standalone"`; route `app/healthz/route.ts` trả 200 `ok`.
  - `apps/api`: NestJS dùng Fastify adapter, global prefix `api/v1`, `GET /api/v1/health` trả `{"status":"ok"}`.
  - `apps/media-worker`: Cloudflare Worker (wrangler), tạm trả 404 cho mọi request.
Yêu cầu cũ về Python/đọc PDF không áp dụng; dùng kiểm tra nhập liệu TypeScript và schema hiện hành.
  - `packages/schema`, `packages/exam-engine`, `packages/media-token`, `packages/ui`, `packages/api-client`: mỗi package có `src/index.ts`, build bằng `tsup`, test bằng Vitest (1 test mẫu).
Yêu cầu cũ về Python/đọc PDF không áp dụng; dùng kiểm tra nhập liệu TypeScript và schema hiện hành.

## T1.1.4 Docker Compose cho dev

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.3.
- Đọc thêm: Phụ lục A3, A12.
- Làm: `infra/postgres/Dockerfile` (PostgreSQL 17 + pg_bigm build từ source, ghim phiên bản; WAL-G thêm ở T1.8.6); `infra/compose/compose.dev.yml` gồm `postgres`, `redis-core` (`noeviction`, `appendonly yes`), `redis-cache` (`allkeys-lru`, `maxmemory 64mb`), `mailpit`; mọi cổng bind `127.0.0.1`. File `.env.example` theo Phụ lục A3 với giá trị dev.
- Kiểm tra:
  - `docker compose -f infra/compose/compose.dev.yml up -d` → mọi service `healthy`.
  - `CREATE EXTENSION pg_bigm;` chạy thành công trong `psql`.
  - `redis-cli CONFIG GET maxmemory-policy` trả `noeviction` ở `redis-core` và `allkeys-lru` ở `redis-cache`.

## T1.1.5 Công cụ test

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.3.
Yêu cầu cũ về Python/đọc PDF không áp dụng; dùng kiểm tra nhập liệu TypeScript và schema hiện hành.
- Kiểm tra: mỗi loại có ít nhất 1 test pass; `pnpm test:e2e` mở trang chủ web và kiểm tra tiêu đề trên cả 3 trình duyệt.

## T1.1.6 CI trên GitHub Actions

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.4, T1.1.5.
Yêu cầu cũ về Python/đọc PDF không áp dụng; dùng kiểm tra nhập liệu TypeScript và schema hiện hành.
- Kiểm tra: một PR mẫu chạy CI xanh; tổng thời gian CI dưới 15 phút.
- **[CHỦ DỰ ÁN]:** bật branch protection cho `main` (bắt buộc CI xanh và 1 review).

## T1.1.7 Dockerfile cho web, admin, api

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.3.
- Làm: Dockerfile multi-stage cho từng app, chạy bằng user không phải root, có `HEALTHCHECK`, nền tảng `linux/amd64`. CI thêm job build image (chưa push).
- Kiểm tra: build được 3 image; chạy image `api` với env dev thì `/api/v1/health` trả 200; mỗi image dưới 300 MB.

## T1.1.8 Tài liệu đóng góp

Task thực thi liên quan: F01, F07, C06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.6.
- Làm: `CONTRIBUTING.md` (tóm tắt A3, A6, A8); `.github/pull_request_template.md` theo A7.
- Kiểm tra: tạo PR mới thì mẫu mô tả tự hiện.

## T1.2.1 Schema RichText và RichBlock

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.8.
- Đọc thêm: Phụ lục A4.
- Làm: trong `packages/schema/src/rich-text.ts`: schema Zod cho `Segment`, `RichText`, `RichBlock`; hàm `normalizeRichText()` (chuẩn hóa NFC, gộp các đoạn `text` liền nhau); hàm `toPlainText()` (bỏ cách đọc ruby, dùng cho tìm kiếm).
- Kiểm tra: test cho mọi ví dụ ở Phụ lục A4 (hợp lệ) và ít nhất 5 trường hợp không hợp lệ (thiếu `rt`, `text` chứa ký tự xuống dòng, loại đoạn lạ…).

## T1.2.2 Schema blueprint

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.1, T1.0.4.
- Đọc thêm: Phụ lục A6; `docs/jlpt-blueprints.json`.
- Làm: schema Zod của blueprint; chuyển dữ liệu đã xác nhận ở T1.0.4 thành `packages/schema/fixtures/blueprints/n1.json` … `n5.json`.
- Kiểm tra: mọi fixture qua validate; test báo lỗi khi tổng số câu của dạng 問題 không khớp với khai báo phần thi.

## T1.2.3 Schema snapshot đề, manifest, gói nhập đề

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.1.
- Đọc thêm: Phụ lục A5, A7.
- Làm: schema Zod cho `ExamSnapshot`, `MediaManifest`, `ImportPackage`. Script `pnpm --filter @jlpt/schema export-json-schema` xuất JSON Schema (dùng `z.toJSONSchema()` của Zod 4) ra `packages/schema/json-schema/*.json`; các file này được commit để `bộ nhập dữ liệu chuẩn` dùng.
- Kiểm tra: ví dụ ở Phụ lục A5, A7 qua validate; snapshot có trường đáp án (ví dụ `correct`, `answer`) thì bị **từ chối** (schema dùng `strict()`).

## T1.2.4 DTO của API lượt thi và định dạng lỗi

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.3.
- Đọc thêm: Phụ lục A8, A9.
- Làm: schema Zod cho request/response của mọi endpoint ở Phụ lục A8 (phần lượt thi và thư viện đề) và định dạng lỗi chuẩn ở A9.
- Kiểm tra: test cho từng DTO với ví dụ hợp lệ và không hợp lệ.

## T1.2.5 exam-engine: quy tắc thời gian

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.8.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 7, 8), 8.3.
- Làm: các hàm thuần `computeSectionDeadline(startedAt, durationSec)`, `isAcceptingWrites({ mode, deadline, now, graceSec })`, `isLateSyncAllowed({ deadline, receivedAt, windowSec })`, `computeClockOffset(serverNow, clientNow)`.
- Kiểm tra: test dạng bảng, gồm các mốc biên: đúng deadline, deadline + grace, deadline + grace + 1 ms, chế độ luyện tập luôn nhận ghi.

## T1.2.6 exam-engine: chấm điểm

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.2.
- Đọc thêm: Phụ lục A6 (phần `scoring`), A10 (`exam_answer_keys`).
- Làm: `score({ answers, answerKey, scoring })` trả về: số câu đúng/sai/bỏ trống, tỷ lệ chính xác; kết quả theo phần thi, theo kỹ năng, theo dạng 問題; điểm thô và **điểm quy đổi tham khảo** của từng phần điểm (quy đổi tuyến tính, làm tròn theo cấu hình); `estimatePass()` (đạt điểm tổng và không phần nào dưới điểm liệt).
- Kiểm tra: test các trường hợp: đúng hết, bỏ trống hết, hỗn hợp, làm tròn ở biên, tổng điểm đạt nhưng trượt điểm liệt một phần.

## T1.2.7 exam-engine: kiểm tra và gộp phiếu trả lời

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.3.
- Làm: `validateSheet(answers, snapshotMeta)` (độ dài đúng bằng tổng số câu; mỗi giá trị từ 0 tới số lựa chọn của câu đó); `mergeSheet(stored, incoming, lockedRanges)` (giữ nguyên đáp án đã lưu trong các phần đã khóa).
- Kiểm tra: test cho câu 3 lựa chọn và 4 lựa chọn, phiếu sai độ dài, giá trị ngoài khoảng, phần đã khóa bị client gửi khác đi.

## T1.2.8 exam-engine: vị trí trên timeline phần nghe

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.3.
- Đọc thêm: Phụ lục A5 (`listeningTimeline`).
- Làm: `listeningPosition(timeline, sectionStartedAt, now)` trả `{ state: "playing" | "gap" | "ended", segmentIndex, offsetMs }`.
- Kiểm tra: test ở đầu đoạn, giữa đoạn, trong khoảng nghỉ, đúng mốc chuyển đoạn, sau khi hết timeline.

## T1.2.9 exam-engine: kiểm tra đề theo blueprint

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.2.
- Làm: `validateBlueprint(examStructure, blueprint)` trả danh sách vi phạm `{ code, message, sectionCode, mondaiType, expected, actual }` (sai thứ tự phần, thiếu/thừa câu của một dạng, sai thời gian).
- Kiểm tra: đề đúng cấu trúc trả danh sách rỗng; mỗi loại vi phạm có ít nhất 1 test.

## T1.2.10 Schema DB, migration, seed

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.4, T1.1.4.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 11; Phụ lục A10.
- Làm: Drizzle ORM trong `apps/api/src/db/`: schema cho mọi bảng V1, migration, script `pnpm --filter api db:migrate`, `db:seed`. Seed dev gồm: các role, blueprint từ fixture, 1 tài khoản admin dev, 1 đề mẫu N5 tự soạn (khoảng 6 câu, có 1 câu ★, 1 câu furigana, 1 nhóm nghe). Audio mẫu là file tự tạo (âm sine, vài giây), **không dùng audio có bản quyền**.
- Kiểm tra: `db:migrate` chạy trên DB trống; chạy lại lần 2 không lỗi; `db:seed` tạo đủ dữ liệu.

## T1.2.11 Test ràng buộc DB và tạo partition

Task thực thi liên quan: F02, F08, C01. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.10.
- Làm: test (Vitest + PostgreSQL thật từ Docker) cho: CHECK `user_id`/`guest_id`; khóa ngoại attempt → `exam_versions`; mỗi user chỉ có 1 attempt đang mở cho mỗi đề; unique `(attempt_month, attempt_id, seq)`. Script `pnpm --filter api db:partitions` tạo partition `attempt_events` cho tháng hiện tại và 2 tháng kế tiếp (chạy được nhiều lần).
- Kiểm tra: mọi test ràng buộc pass; chạy `db:partitions` 2 lần liên tiếp không lỗi.

## T1.3.1 Nền của API

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.11.
- Đọc thêm: Phụ lục A3, A9; `DE_XUAT_KY_THUAT.md` mục 9.
- Làm: module cấu hình đọc env và validate bằng Zod (thiếu biến thì dừng khởi động); logging bằng pino, che (redact) các trường `password`, `token`, `cookie`, `authorization`, `email`; exception filter trả lỗi theo Phụ lục A9; request id; `GET /api/v1/health` kiểm tra PostgreSQL và cả hai Redis. Lấy IP người dùng từ header `CF-Connecting-IP` khi request đến từ `127.0.0.1` (tức là qua Tunnel), ngược lại dùng IP kết nối.
- Kiểm tra: test thiếu env thì app không khởi động; test lỗi trả đúng định dạng A9; log không chứa trường bị che; health trả lỗi 503 khi tắt Redis.

## T1.3.2 Xác thực bằng Better Auth

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.1.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (Mật khẩu, Session, Xác thực bổ sung); tài liệu chính thức của Better Auth (đúng phiên bản cài).
- Làm: tích hợp Better Auth vào NestJS (Fastify) tại `/api/v1/auth/*`: đăng ký email/mật khẩu, đăng nhập, đăng xuất, xác minh email bắt buộc trước khi làm bài, quên/đặt lại mật khẩu (link dùng 1 lần, hết hạn sau 30 phút), danh sách và thu hồi session. Băm mật khẩu bằng Argon2id. Kiểm tra mật khẩu đã bị lộ qua HIBP (k-anonymity). Cookie phiên tên `__Host-session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, không có `Domain`. Quên mật khẩu luôn trả cùng một thông báo.
- Không làm: không tự viết hệ thống auth từ đầu. Nếu không tích hợp được Better Auth với Fastify → dừng và báo cáo (A4).
- Kiểm tra: test luồng đăng ký → xác minh → đăng nhập → đăng xuất; header `Set-Cookie` đúng các thuộc tính trên; đặt lại mật khẩu thì các session cũ bị thu hồi; email không tồn tại và email tồn tại nhận cùng response.

## T1.3.3 Gửi email

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.1.
- Mã tính năng: NOTI-01, NOTI-02.
- Làm: interface `EmailSender` với 2 bản: `ResendEmailSender` (production) và `SmtpEmailSender` (dev, gửi tới Mailpit). Mẫu email tiếng Việt: xác minh tài khoản, đặt lại mật khẩu (có bản HTML và bản text).
- Kiểm tra: ở dev, email xác minh hiện trong Mailpit (`http://127.0.0.1:8025`); test render mẫu email có đủ link.

## T1.3.4 Phân quyền RBAC + kiểm tra theo tài nguyên

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.2.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (Phân quyền).
- Làm: role `admin`, `editor`, `reviewer`, `teacher`, `student`. Guard toàn cục **mặc định từ chối**; endpoint công khai phải gắn decorator `@Public()`. Dùng CASL cho kiểm tra theo tài nguyên (ví dụ chỉ chủ attempt được đọc attempt).
- Kiểm tra: test endpoint không có decorator nào thì trả 401; học viên A đọc attempt của học viên B → 403 (hoặc 404); role thiếu quyền → 403.

## T1.3.5 2FA cho nhân sự và khóa route admin

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.4.
- Làm: bật plugin TOTP của Better Auth (passkey làm thêm nếu dễ). Role `admin`, `editor`, `reviewer` bắt buộc đã bật 2FA mới được gọi `/api/v1/admin/*`. Route admin chỉ nhận request có header `Host` bằng `ADMIN_HOST`.
- Kiểm tra: tài khoản editor chưa bật 2FA gọi route admin → 403 với mã `TWO_FACTOR_REQUIRED`; gọi route admin với `Host` của trang học viên → 404.

## T1.3.6 Rate limit và Turnstile

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.2.
- Làm: rate limiter trên Redis `core` theo IP và theo user, cấu hình theo nhóm route (auth: 10 request/phút/IP; tạo attempt: 20 lần/giờ/user; lưu phiếu: 30 request/phút/attempt). Service kiểm tra Turnstile (secret từ env; ở dev dùng key thử nghiệm của Cloudflare). Áp dụng Turnstile cho đăng ký, đăng nhập, quên mật khẩu và khi khách bắt đầu làm thử.
- Kiểm tra: test vượt giới hạn trả 429 với mã `RATE_LIMITED` và header `Retry-After`; thiếu hoặc sai token Turnstile → 400 `TURNSTILE_FAILED`.

## T1.3.7 Audit log

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.4.
- Mã tính năng: ADM-14.
- Làm: interceptor ghi `audit_logs` cho mọi request ghi (POST/PUT/PATCH/DELETE) vào `/api/v1/admin/*`: người thực hiện, hành động, thực thể, id, diff (không chứa secrets), IP, thời gian.
- Kiểm tra: test một thao tác admin tạo đúng 1 dòng audit; diff không chứa trường nhạy cảm.

## T1.3.8 Hồ sơ người dùng cơ bản

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.4.
- Mã tính năng: ACC-07, ACC-10.
- Làm: `GET /api/v1/me` (tên, email, cấp độ đang ôn, số đề đã hoàn thành), `PATCH /api/v1/me` (đổi tên, cấp độ đang ôn N1–N5).
- Kiểm tra: test đọc/sửa của chính mình; không sửa được trường `role` qua endpoint này.

## T1.3.9 Giao diện tài khoản trên web

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.2, T1.3.3.
- Làm: cài next-intl với `messages/vi.json`; trang đăng ký, đăng nhập, xác minh email, quên mật khẩu, đặt lại mật khẩu, trang tài khoản (cấp độ đang ôn); widget Turnstile. Mọi chuỗi giao diện nằm trong `messages/vi.json`.
- Kiểm tra: Playwright: đăng ký → mở email trong Mailpit → xác minh → đăng nhập → đổi cấp độ → đăng xuất.

## T1.3.10 Đăng nhập admin và thiết lập 2FA

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.5.
- Làm: trang đăng nhập của `apps/admin`; lần đầu đăng nhập với role nhân sự thì bắt buộc thiết lập TOTP (hiện mã QR, xác nhận mã 6 số, hiện mã khôi phục 1 lần).
- Kiểm tra: Playwright: tài khoản editor mới đăng nhập → bị chuyển tới thiết lập 2FA → hoàn tất → vào được trang chủ admin.

## T1.3.11 Header bảo mật

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.9.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 9 (CSP).
- Làm: web và admin: trang động dùng CSP có nonce; trang tĩnh dùng CSP không nonce (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, chỉ cho phép script từ chính site và `challenges.cloudflare.com` cho Turnstile). Thêm `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. API: request ghi phải có `Content-Type: application/json` (trừ upload) và header `Origin` khớp host.
- Kiểm tra: test header trên 1 trang tĩnh và 1 trang động; request ghi có `Origin` lạ → 403.

## T1.3.12 Bật E2E trong CI

Task thực thi liên quan: F03, N02, F04, F05. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.9, T1.3.10.
- Làm: job E2E trong CI dựng PostgreSQL, 2 Redis, Mailpit bằng service container; chạy migrate + seed rồi chạy Playwright.
- Kiểm tra: CI xanh với các test E2E của T1.3.9 và T1.3.10.

## T1.4.1 Lưu trữ file

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.12.
- Đọc thêm: Phụ lục A3 (biến R2), A1.
- Làm: interface `ObjectStorage` (`put`, `get` có hỗ trợ range, `head`, `delete`) với 2 bản: `LocalFsStorage` (dev/test, ghi vào `.data/storage/`) và `R2Storage` (S3 API của R2). Chọn bản theo env `STORAGE_DRIVER`.
- Kiểm tra: cùng một bộ test chạy cho `LocalFsStorage`; `R2Storage` có test tích hợp chỉ chạy khi có biến môi trường R2.

## T1.4.2 Module media

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.1.
- Làm: `POST /api/v1/admin/media` (multipart, stream thẳng vào storage): kiểm tra magic bytes + MIME; giới hạn: audio MP3/M4A ≤ 100 MB, ảnh WebP/PNG/JPEG/AVIF ≤ 5 MB, PDF ≤ 100 MB. Key theo nội dung: `media/{sha256}.{ext}`; file trùng thì dùng lại bản ghi cũ. Đọc độ dài audio bằng thư viện `music-metadata`. `GET /api/v1/admin/media/:id` để xem trước trong admin.
- Kiểm tra: file đổi đuôi giả (ví dụ `.mp3` nhưng nội dung là `.exe`) bị từ chối; tải cùng file 2 lần chỉ tạo 1 bản ghi; độ dài audio đúng sai số ±1 giây.

## T1.4.3 Nguồn đề và bản quyền

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.12.
- Mã tính năng: QB-16, QB-17, LIB-15.
- Làm: CRUD `exam_sources` và `content_licenses` (API + trang admin).
- Kiểm tra: không xóa được license đang được câu hỏi tham chiếu; audit log ghi đủ.

## T1.4.4 API ngân hàng câu hỏi

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.2, T1.4.3.
- Mã tính năng: QB-01…07, QB-11, QB-13.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 10.5, 11.
- Làm: CRUD nhóm câu, câu hỏi, lựa chọn, đáp án đúng; validate nội dung bằng schema RichText; cột `search_text` sinh từ `toPlainText()` + index pg_bigm; tìm kiếm và lọc theo cấp độ, dạng 問題, nguồn, trạng thái, từ khóa (tiếng Việt không dấu dùng `unaccent`). Quy tắc phiên bản: nhóm ở trạng thái `draft`/`rejected` sửa trực tiếp; nhóm `approved` khi sửa thì tạo version mới ở trạng thái `draft`, version cũ giữ nguyên.
- Kiểm tra: test sửa nhóm `approved` tạo version mới; tìm kiếm 2 ký tự kanji ra kết quả; không có endpoint công khai nào trả `correct_answers`.

## T1.4.5 Component hiển thị RichText

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.2.1.
- Làm: trong `packages/ui`: `RichTextView` và `RichBlockView` render đúng mọi loại đoạn ở Phụ lục A4 (`<ruby>…<rt>…</rt></ruby>`, gạch chân, ô trống, ô trống có ★, xuống dòng, ảnh qua hàm `resolveMediaUrl` truyền vào). Không dùng `dangerouslySetInnerHTML`.
- Kiểm tra: test (Testing Library) cho từng loại đoạn; nội dung chứa `<script>` hiển thị dạng chữ, không chạy.

## T1.4.6 Giao diện biên tập câu hỏi

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.4, T1.4.5, T1.3.10.
- Làm: khung admin (menu theo role); danh sách nhóm câu có bộ lọc; trình biên tập nhóm: hướng dẫn, đoạn văn, media, các câu hỏi (đề bài, lựa chọn, đáp án đúng). Trình soạn RichText theo từng đoạn (thêm đoạn chữ, ruby, gạch chân, ô trống, ô ★, ảnh); xem trước bằng đúng component của phòng thi.
- Kiểm tra: Playwright: tạo một nhóm gồm 1 câu có ruby và 1 câu ★, lưu, mở lại thấy đúng nội dung; ảnh chụp màn hình phần xem trước đính kèm PR.

## T1.4.7 Quy trình kiểm duyệt

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.6.
- Mã tính năng: QB-13.
- Làm: trạng thái `draft → in_review → approved | rejected`, thêm `hidden` để tạm ẩn. Người duyệt **không được** là người sửa cuối cùng của nhóm đó (kiểm tra ở server). Bình luận khi từ chối. Trang hàng chờ duyệt cho role `reviewer`.
- Kiểm tra: test editor tự duyệt nội dung của mình → 403; mỗi chuyển trạng thái ghi `content_reviews` và audit log.

## T1.4.8 Quản lý blueprint

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.6.
- Mã tính năng: ADM-08.
- Làm: xem, tạo phiên bản mới, kích hoạt blueprint (không sửa đè phiên bản đã dùng); trường `source_ref` bắt buộc.
- Kiểm tra: sửa blueprint tạo version mới; đề đã xuất bản vẫn tham chiếu version cũ.

## T1.4.9 Ghép đề

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.7, T1.4.8, T1.2.9.
- Mã tính năng: ADM-04, LIB-05.
- Làm: tạo đề (`kind`: `original` hoặc `practice`, chọn blueprint, nguồn); phần thi sinh theo blueprint; thêm nhóm câu `approved` vào từng phần theo thứ tự; hiện danh sách vi phạm từ `validateBlueprint()`.
- Kiểm tra: đề thiếu câu hiện đúng vi phạm; thêm nhóm chưa `approved` bị chặn.

## T1.4.10 Nhập đề từ gói JSON

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.4, T1.2.3.
- Mã tính năng: PDF-01, PDF-03, PDF-04, PDF-05, PDF-27 (cơ bản).
- Đọc thêm: Phụ lục A7.
- Làm: trang admin tải lên gói `.zip` (gồm `import.json` + thư mục `media/`) và PDF gốc. Server validate theo schema, kiểm tra checksum từng file media, tạo `import_jobs` và các nhóm câu ở trạng thái `draft`. Tải lại cùng một gói (cùng checksum) không tạo bản ghi trùng.
- Kiểm tra: nhập gói mẫu tạo đúng số nhóm/câu; gói sai schema bị từ chối kèm danh sách lỗi dễ hiểu; nhập lại gói cũ không tạo trùng.

## T1.4.11 Xuất bản đề

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.9.
- Mã tính năng: ADM-07, ADM-19.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 1), 10.5; Phụ lục A5, A10.
- Làm: `POST /api/v1/admin/exams/:id/publish`: kiểm tra `validateBlueprint()` (đề `original` phải không có vi phạm), mọi nhóm `approved`, mọi câu có đáp án, license cho phép; trong 1 transaction tạo `exam_versions` + `exam_answer_keys`; ghi `snapshot.json` và `manifest.json` vào storage; gọi revalidate của web (T1.6.8) và purge Cloudflare (nếu có cấu hình). Gỡ đề (takedown): ẩn đề khỏi thư viện, không xóa các version.
- Kiểm tra: snapshot sinh ra qua validate của `ExamSnapshot` và **không chứa** đáp án (test quét toàn bộ JSON); xuất bản lần 2 tạo version 2, version 1 giữ nguyên.

## T1.4.12 Người dùng, audit log, tổng quan admin

Task thực thi liên quan: C02, C04, B01, N04. Vai trò gốc: AGENT.

- Phụ thuộc: T1.3.7.
- Mã tính năng: ADM-01, ADM-02, ADM-03, ADM-14.
- Làm: trang danh sách người dùng (tìm kiếm, đổi role, khóa tài khoản); trang xem audit log có bộ lọc; trang tổng quan (số đề, số câu theo trạng thái, số người dùng, số lượt thi trong ngày).
- Kiểm tra: chỉ `admin` đổi được role; mọi thao tác hiện trong audit log.

## T1.5.1 Package media-token

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.4.11.
- Làm: `packages/media-token`: `signMediaToken()` và `verifyMediaToken()` theo Phụ lục A11, chỉ dùng WebCrypto (chạy được cả trên Node lẫn Cloudflare Worker).
- Kiểm tra: test token hợp lệ, hết hạn, sửa 1 ký tự payload, sai secret, sai `examId`/`version`.

## T1.5.2 Tạo lượt thi

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.1.
- Làm: `POST /api/v1/attempts` theo Phụ lục A8: chọn version mới nhất đã xuất bản; mỗi user chỉ có 1 attempt đang mở cho mỗi đề (nếu đã có → 409 `ATTEMPT_ALREADY_OPEN` kèm `attemptId`); tạo lease, `mediaToken`, `snapshotUrl`; tạo dòng `attempt_answer_sheets` rỗng.
- Kiểm tra: test tạo thành công; tạo lần 2 → 409 kèm `attemptId`; email chưa xác minh → 403 `EMAIL_NOT_VERIFIED`.

## T1.5.3 Bắt đầu và chuyển phần thi

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.2.
- Làm: `POST /api/v1/attempts/:id/sections/next` theo Phụ lục A8 và bảng 8.3: phần đầu tiên hoặc khóa phần hiện tại rồi bắt đầu phần kế; deadline tính bằng `computeSectionDeadline()`; cập nhật `section_times`, `current_section`, `current_deadline`; ghi sự kiện vào `attempt_events`.
- Kiểm tra: test lease sai → 409 `LEASE_INVALID`; hết phần → 409 `NO_MORE_SECTIONS`; deadline đúng theo thời lượng của phần.

## T1.5.4 Lưu phiếu trả lời

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.3, T1.2.7.
- Làm: `PUT /api/v1/attempts/:id/sheet` đúng các quy tắc 3–9 của mục 8.2: kiểm tra lease, trạng thái, deadline + grace (chế độ thi thật), cửa sổ nhận phiếu muộn; validate phiếu; trong 1 transaction: INSERT `changes` vào `attempt_events` (`ON CONFLICT DO NOTHING`), UPDATE phiếu chỉ khi `seq > last_seq` (dùng `mergeSheet()` để giữ phần đã khóa). Chỉ trả 200 sau khi commit.
- Kiểm tra (test tích hợp với PostgreSQL thật):
  - lô `seq=2` đến trước `seq=1` → phiếu cuối là của lô 2; nhật ký có cả 2 lô;
  - gửi trùng `seq` → 200, không ghi trùng;
  - sau `deadline + grace` ở chế độ thi thật → 422 `DEADLINE_PASSED` (trừ trường hợp nhận phiếu muộn);
  - phần đã khóa không bị thay đổi;
  - phiếu sai độ dài → 400 `VALIDATION_ERROR`.

## T1.5.5 Nộp bài và chấm điểm

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.4, T1.2.6.
- Làm: `POST /api/v1/attempts/:id/submit`: `SELECT … FOR UPDATE` dòng attempt; nếu đã nộp → trả kết quả cũ; lưu phiếu cuối nếu `seq` mới hơn; chấm bằng `score()` với answer key của đúng `ExamVersion` (cache trong bộ nhớ theo `(examId, version)`); lưu `result`, `status = submitted`, `submitted_by`; ghi event `attempt.submitted` vào `outbox` trong cùng transaction.
- Kiểm tra: gọi submit 2 lần đồng thời → chỉ chấm 1 lần, cả 2 response giống nhau; kết quả khớp tính tay với đề mẫu; trong response không có answer key của câu nào khác ngoài những gì trang kết quả cần (Phụ lục A8).

## T1.5.6 Vào lại bài, token media, xem lại, lịch sử

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.5.
- Mã tính năng: EXAM-18, SCORE-07, SCORE-08, STAT-01.
- Làm: `POST /attempts/:id/resume` (cấp lease mới, vô hiệu lease cũ, ghi sự kiện), `POST /attempts/:id/media-token`, `GET /attempts/:id`, `GET /attempts/:id/review` (chỉ sau khi nộp, chỉ chủ attempt), `GET /me/attempts` (phân trang theo cursor).
- Kiểm tra: sau `resume`, request mang lease cũ → 409; `review` trước khi nộp → 409 `ATTEMPT_NOT_SUBMITTED`; người khác gọi `review` → 404.

## T1.5.7 Job nền của worker

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.5.
- Đọc thêm: Phụ lục A14.
- Làm: chạy `api` ở chế độ `worker` (cùng image, khác lệnh). Các job theo Phụ lục A14: chuyển `outbox` sang BullMQ; đóng attempt quá hạn (sau cửa sổ nhận phiếu muộn) bằng **cùng hàm khóa + chấm** với submit; đóng bài bỏ dở quá 24 giờ giữa hai phần; tạo partition tháng kế tiếp; tách `user_answers` sau khi nộp; cập nhật số đề đã hoàn thành của user.
- Kiểm tra: test client submit cùng lúc với job đóng bài → chỉ 1 kết quả; job chạy lại nhiều lần không tạo dữ liệu trùng.

## T1.5.8 Cổng media (Cloudflare Worker) và bản dev

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.1.
- Đọc thêm: Phụ lục A11, A13.
- Làm: `apps/media-worker`: kiểm tra token; đọc `manifest.json` của version (cache trong Worker); chỉ trả file có trong manifest; hỗ trợ header `Range` (trả 206); `Content-Type` đúng; cache ở edge với cache key **bỏ tham số `t`**; lỗi trả `Cache-Control: no-store`. Trong `apps/api`, route dev `/dev-media/*` dùng đúng logic đó (chỉ bật khi `NODE_ENV=development`).
- Kiểm tra: test (`@cloudflare/vitest-pool-workers`): token sai → 403; file ngoài manifest → 403; request `Range: bytes=0-99` → 206 với đúng 100 byte; hai request khác token cùng file dùng chung cache.

## T1.5.9 Lớp dữ liệu phía client của phòng thi

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.6.
- Làm: trong `apps/web`: store Zustand; lưu IndexedDB bằng Dexie; bộ đồng bộ theo quy tắc 6 của mục 8.2 (debounce 3 giây, tối đa 10 giây, 1 request đang chờ, gửi khi chuyển phần, khi `visibilitychange`, `fetch` với `keepalive` khi `pagehide`); đánh dấu "chưa đồng bộ" tới khi có 200; xử lý 409 `LEASE_INVALID`; tính `offset` đồng hồ.
- Kiểm tra: unit test với fake timer: 5 thay đổi trong 2 giây chỉ tạo 1 request; khi request đang chờ thì thay đổi mới được gộp vào lần sau; mất mạng thì dữ liệu vẫn nằm trong IndexedDB và được gửi lại khi có mạng.

## T1.5.10 Giao diện phòng thi

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.9, T1.4.5.
- Mã tính năng: EXAM-01…04, EXAM-06…17, EXAM-19…22.
- Làm: route `/thi/[attemptId]` (client component, lazy-load, `noindex`): màn hình chọn chế độ và hướng dẫn; hiển thị câu hỏi bằng `RichTextView`; chọn/đổi/bỏ đáp án; câu trước/sau; bảng phiếu trả lời; đánh dấu xem lại; phân biệt câu đã làm/chưa làm/đã đánh dấu; thanh tiến độ; đồng hồ đếm ngược theo deadline server; xác nhận trước khi nộp sớm; chuyển phần và khóa phần; tự nộp khi hết thời gian; hộp thoại khi bài thi đang mở ở nơi khác; báo trạng thái mất mạng.
- Kiểm tra: Playwright làm trọn đề mẫu ở chế độ thi thật; ảnh chụp màn hình desktop và mobile (390×844) đính kèm PR; route này không có trong bundle của trang chủ (kiểm tra output của `next build`).

## T1.5.11 Phần nghe hiểu

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.10, T1.2.8.
- Mã tính năng: AUDIO-01…04, AUDIO-10, EXAM-05.
- Làm: tải trước audio vào Cache Storage trong lúc làm các phần trước (hiện tiến độ tải); nút "Bắt đầu phần nghe" chỉ bật khi đã tải đủ, kiêm bước kiểm tra loa; phát liên tục theo `listeningTimeline` bằng blob URL; chế độ thi thật ẩn thanh tua và chặn seek; tải lại trang thì phát tiếp tại vị trí `listeningPosition()`; lỗi phát: thử lại tại vị trí đồng bộ, vẫn lỗi thì cho kết thúc phần nghe và gắn cờ `interrupted`.
- Kiểm tra: Playwright: tải lại trang giữa phần nghe → audio tiếp tục đúng vị trí (sai số ≤ 2 giây); thử thủ công trên iPhone thật và Android thật, ghi kết quả vào `docs/testing/exam-room-devices.md`.

## T1.5.12 Kết quả, xem lại, lịch sử

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.6.
- Mã tính năng: SCORE-01…04, SCORE-06…08, SCORE-11, STAT-01, ACC-10.
- Làm: trang kết quả (đúng/sai/bỏ trống, tỷ lệ chính xác, theo phần thi và kỹ năng, thời gian làm bài, điểm quy đổi **có ghi rõ "tham khảo, không phải điểm JLPT chính thức"**); trang xem lại từng câu với đáp án đúng; trang lịch sử làm bài; banner "Tiếp tục làm bài" trên trang chủ khi có bài đang mở.
- Kiểm tra: Playwright: nộp đề mẫu → kết quả khớp đáp án đã biết; lịch sử hiện lượt thi vừa làm.

## T1.5.13 Khách làm thử

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.5, T1.3.6.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.2 (quy tắc 14); quyết định D4.
- Làm: chỉ với đề có cờ `guest_trial`: cookie `__Host-guest` (UUID), bắt buộc Turnstile, tối đa 3 lượt/ngày/IP; khi khách đăng nhập hoặc đăng ký thì gắn các attempt của `guest_id` vào tài khoản.
- Kiểm tra: khách làm đề không có cờ → 401; sau khi đăng ký, lịch sử có lượt làm thử.

## T1.5.14 Bộ test kịch bản phòng thi

Task thực thi liên quan: C01, N02, C03, N03, N06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.7, T1.5.11.
- Làm: test tích hợp API và Playwright E2E cho các tình huống: request đến sai thứ tự, gửi trùng, mất mạng 30 giây (`context.setOffline`), mất mạng đúng lúc hết thời gian (nhận phiếu muộn), mở 2 tab, tải lại trang giữa bài và giữa phần nghe, hết thời gian một phần (dùng `page.clock`), nộp bài trùng lúc worker đóng bài. Thêm test "không lộ đáp án": quét mọi response của API học viên và snapshot trong một lượt thi trước khi nộp, không được có answer key.
- Kiểm tra: toàn bộ kịch bản pass trong CI.

## T1.6.1 Layout, design system, font

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.12.
- Làm: preset Tailwind trong `packages/config` (màu, cỡ chữ, khoảng cách); layout chung (header, footer, menu mobile); font giao diện có subset `vietnamese`; Noto Sans JP qua `next/font/google`, **không preload**, chỉ áp dụng cho class dùng ở vùng chữ Nhật.
- Kiểm tra: chữ tiếng Việt có dấu chồng (ề, ộ, ữ) hiển thị đúng; tab Network không tải font Nhật ở trang không có chữ Nhật.

## T1.6.2 Trang chủ

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.1.
- Làm: trang chủ tĩnh: giới thiệu ngắn, lối vào 5 cấp độ, đề nổi bật. Banner "Tiếp tục làm bài" (T1.5.12) tải phía client sau khi trang hiển thị.
- Kiểm tra: `next build` đánh dấu route `/` là tĩnh; HTML không chứa dữ liệu cá nhân.

## T1.6.3 Trang cấp độ và danh sách đề

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.1.
- Mã tính năng: LIB-01…07, LIB-15, SEO-01, SEO-02.
- Làm: `/n1` … `/n5` (giới thiệu cấp độ), `/n3/de-thi` (danh sách đề của cấp), `/n3/de-thi/2021-12` (theo năm và kỳ). Dữ liệu lấy từ `GET /api/v1/exams` lúc build/ISR qua `API_INTERNAL_URL`. Bộ lọc năm, kỳ, loại đề (gốc/luyện tập/trộn) và ô tìm kiếm lọc phía client trên danh sách tĩnh. Mỗi đề hiện số câu, thời gian, các phần thi, nhãn loại đề, nguồn và bản quyền.
- Kiểm tra: các route này là tĩnh trong output `next build`; lọc không gây request mới tới API.

## T1.6.4 Trang giới thiệu đề và nút bắt đầu

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.3.
- Làm: `/de-thi/[slug]` (SSG/ISR): thông tin đề, cấu trúc phần thi, nút "Bắt đầu" (client component): chưa đăng nhập thì chuyển tới đăng nhập (hoặc làm thử nếu đề có `guest_trial`), rồi chọn chế độ → `POST /api/v1/attempts` → chuyển tới `/thi/[attemptId]`. Nếu nhận 409 `ATTEMPT_ALREADY_OPEN` thì hỏi "Tiếp tục bài đang làm?".
- Kiểm tra: Playwright: từ trang chủ → cấp N5 → đề mẫu → bắt đầu → vào phòng thi.

## T1.6.5 Trạng thái cá nhân trên thư viện đề

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.3.
- Mã tính năng: LIB-08.
- Làm: `GET /api/v1/me/exam-status?level=N3` trả trạng thái từng đề (chưa làm, đang làm, đã hoàn thành); client gọi sau khi trang hiển thị và gắn nhãn lên danh sách.
- Kiểm tra: HTML trả từ server giống hệt nhau cho người đã đăng nhập và người chưa đăng nhập; nhãn trạng thái chỉ xuất hiện sau khi tải phía client.

## T1.6.6 Trang hỗ trợ và pháp lý

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.1.
- Mã tính năng: SEO-10, SYS-13.
- Làm: FAQ, liên hệ, hỗ trợ, chính sách quyền riêng tư, điều khoản sử dụng (nội dung do chủ dự án cung cấp; agent dựng khung với chỗ trống ghi rõ "CẦN NỘI DUNG"); banner đồng ý cookie (chỉ tải analytics sau khi đồng ý, nếu analytics dùng cookie).
- Kiểm tra: các trang tĩnh; banner nhớ lựa chọn.

## T1.6.7 SEO kỹ thuật

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.4.
- Mã tính năng: SEO-06, SEO-07, SEO-08.
- Làm: metadata và Open Graph mọi trang public; `sitemap.xml` sinh từ danh sách đề đã xuất bản; `robots.txt` chặn `/thi/`, `/tai-khoan/`, `/api/`; JSON-LD (`Course`, `FAQPage`, `BreadcrumbList`); `canonical`; `noindex` cho mọi trang ứng dụng.
- Kiểm tra: sitemap hợp lệ (validator XML); JSON-LD qua công cụ Rich Results Test của Google (dán kết quả vào PR).

## T1.6.8 Revalidate khi xuất bản

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.3, T1.4.11.
- Làm: route `POST /api/revalidate` trong `apps/web` (secret trong header, so sánh an toàn theo thời gian) để revalidate theo tag/path; `apps/api` gọi route này sau khi xuất bản hoặc gỡ đề, rồi gọi API purge của Cloudflare theo danh sách URL (nếu có `CLOUDFLARE_API_TOKEN`).
- Kiểm tra: xuất bản đề mới → trang danh sách hiện đề đó mà không cần build lại; gọi không có secret → 401.

## T1.6.9 Ngân sách hiệu năng trong CI

Task thực thi liên quan: F04, N03, V03. Vai trò gốc: AGENT.

- Phụ thuộc: T1.6.7.
- Làm: Lighthouse CI (mobile) cho `/`, `/n3`, `/n3/de-thi`, `/de-thi/[slug mẫu]` với ngưỡng ở mục 2 của `DE_XUAT_KY_THUAT.md`; script đọc output `next build` và **fail CI** nếu một route public trở thành động hoặc JS tải lần đầu vượt 150 KB (gzip). Đo dữ liệu thực bằng Cloudflare Web Analytics (chủ dự án bật trong dashboard, không cần code).
- Kiểm tra: CI chạy Lighthouse và script kiểm tra route; cố ý thêm `cookies()` vào trang chủ thì CI fail.

## T1.7.1 Khung CLI

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.2 Phân tích PDF

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.3 OCR trang scan

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.4 Nhận diện cấu trúc bằng LLM

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.5 Xử lý đặc thù tiếng Nhật

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.6 Ghép file đáp án

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.7 Audio và timeline phần nghe

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.8 Cắt ảnh minh họa

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.9 Báo cáo kiểm tra

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.10 Đóng gói và quét virus

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.11 Màn hình đối chiếu trên admin

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.12 Lưu PDF gốc và trang nguồn

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.7.13 Đánh giá độ chính xác

Task thực thi liên quan: F06, C05, N04, N05, V05. Vai trò gốc: AGENT.

ĐÃ THAY THẾ: không triển khai tác vụ tự đọc PDF trong ứng dụng. Chủ dự án chuẩn bị import v2; F06/C05/B01/N04 kiểm tra, nhập nháp, đối chiếu và duyệt. Chi tiết lịch sử xem nguồn, không dùng làm task hiện hành.

## T1.8.1 Tạo server

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.3.12.
- Làm: tạo Linode vùng Singapore, gói Shared CPU 4 GB, Ubuntu 24.04 LTS; bật Linode Backup; thêm SSH public key; tạo Cloud Firewall: tạm thời chỉ mở cổng 22 cho IP hiện tại của chủ dự án, chặn mọi cổng khác.
- Kiểm tra: SSH vào được bằng key; dịch vụ Backup đang bật.

## T1.8.2 Script dựng server

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.1.
- Đọc thêm: Phụ lục B1.
- Làm: `infra/server/bootstrap.sh` chạy được nhiều lần (idempotent) theo B1. Chạy thử trên một server tạm trước khi chạy trên server thật.
- Kiểm tra: sau khi chạy: đăng nhập bằng mật khẩu bị từ chối; root không SSH được; `docker compose version` chạy; swap 2 GB đang bật; `/etc/docker/daemon.json` có log rotation.

## T1.8.3 Cấu hình Cloudflare

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: CHỦ DỰ ÁN + AGENT.

- Phụ thuộc: T1.0.1.
- Làm (agent viết hướng dẫn từng bước trong `docs/runbooks/cloudflare-setup.md`, chủ dự án thực hiện): SSL/TLS chế độ Full (strict); Always Use HTTPS; HSTS; Free Managed Ruleset; Bot Fight Mode; 1 rule rate limiting cho `/api/v1/auth/*`; Cache Rules: cho phép cache các đường dẫn public, bypass `/api/*`, `/thi/*`, `/tai-khoan/*` và toàn bộ `admin.example.com`; tắt Rocket Loader; bật Web Analytics.
- Kiểm tra: header `cf-cache-status: HIT` ở trang chủ sau lần tải thứ 2; `BYPASS` hoặc `DYNAMIC` ở `/api/v1/health`.

## T1.8.4 Cloudflare Tunnel và SSH qua Tunnel

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.2, T1.8.3.
- Đọc thêm: Phụ lục A13.
- Làm: cài `cloudflared` từ repo chính thức; tạo tunnel quản lý bằng file cấu hình (`infra/cloudflared/config.yml`, không commit file credentials); chạy dạng systemd; tạo bản ghi DNS cho các hostname; SSH qua `ssh.example.com` (Cloudflare Access, T1.8.5). Khi SSH qua Tunnel đã chạy: **xóa rule cổng 22** khỏi Linode Cloud Firewall.
- Kiểm tra: quét cổng server từ ngoài (`nmap -Pn <IP>`) không thấy cổng nào mở; truy cập domain vẫn được; SSH qua `cloudflared access ssh` được.

## T1.8.5 Cloudflare Access

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.8.4.
- Làm: tạo ứng dụng Access cho `admin.example.com` và `ssh.example.com`; policy chỉ cho các email nhân sự; đăng nhập bằng mã một lần qua email.
- Kiểm tra: email không có trong danh sách không vào được admin.

## T1.8.6 Image PostgreSQL production

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.1.4.
- Đọc thêm: Phụ lục A12, B3.
- Làm: hoàn thiện `infra/postgres/Dockerfile`: thêm binary WAL-G (ghim phiên bản, kiểm tra checksum khi tải); file cấu hình `postgresql.small.conf` và `postgresql.large.conf` theo A12; `archive_mode = on`, `archive_command` dùng WAL-G, `archive_timeout = 300`.
- Kiểm tra: chạy image ở máy lập trình với một bucket thử: tạo dữ liệu → sau 5 phút thấy WAL trên bucket; `wal-g backup-list` có bản backup.

## T1.8.7 R2 và triển khai media Worker

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.5.8, T1.8.3.
- Làm: tạo bucket `jlpt-media`, `jlpt-imports`, `jlpt-backups`; tạo API token riêng cho từng mục đích (api chỉ ghi `jlpt-media`/`jlpt-imports`; WAL-G chỉ ghi `jlpt-backups`); deploy `apps/media-worker` bằng wrangler với binding R2 và secret `MEDIA_TOKEN_SECRET`; route `media.example.com/*`.
- Kiểm tra: tải snapshot của đề mẫu qua `media.example.com` bằng token hợp lệ → 200; không có token → 403; lần tải thứ 2 có `cf-cache-status: HIT`.

## T1.8.8 Email và Turnstile production

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: CHỦ DỰ ÁN + AGENT.

- Phụ thuộc: T1.8.3.
- Làm: xác minh domain trên Resend (bản ghi SPF, DKIM, DMARC trên Cloudflare); tạo widget Turnstile cho domain thật.
- Kiểm tra: email xác minh gửi tới Gmail không vào thư rác; header email có `dkim=pass`.

## T1.8.9 Docker Compose production

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.6.
- Đọc thêm: Phụ lục A3, A12.
- Làm: `infra/compose/compose.prod.yml`; `infra/compose/profiles/small.env` và `large.env`; `infra/compose/.env.production.example` (không có giá trị thật); healthcheck và `restart: unless-stopped` cho mọi service; cổng chỉ bind `127.0.0.1`; tag image lấy từ biến `IMAGE_TAG`.
- Kiểm tra: chạy được trên server tạm với profile `small`; `free -h` cho thấy tổng RAM dùng dưới 3,2 GB khi không tải.

## T1.8.10 Backup và thử khôi phục

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.9.
- Đọc thêm: Phụ lục B3.
- Làm: systemd timer chạy `wal-g backup-push` hằng ngày lúc 03:00 (giờ Việt Nam) và `wal-g delete retain FULL 7 --confirm` hằng tuần; script kiểm tra độ mới của backup. Thử khôi phục lần đầu trên một server Linode tạm theo B3; ghi kết quả.
- Kiểm tra: file `docs/runbooks/restore-test-<ngày>.md` ghi thời gian khôi phục (RTO ≤ 1 giờ) và lượng dữ liệu mất (RPO ≤ 5 phút).

## T1.8.11 Phát hành và deploy

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.9.
- Đọc thêm: Phụ lục B2.
- Làm: workflow `.github/workflows/release.yml` chạy khi có tag `v*`: build và push image `linux/amd64` lên GHCR (`ghcr.io/<owner>/jlpt-web`, `jlpt-admin`, `jlpt-api`, tag là phiên bản). Script `infra/server/deploy.sh` và `infra/server/switch-profile.sh` theo B2, B4.
- Kiểm tra: diễn tập trên server tạm: deploy `v0.1.0` → deploy `v0.1.1` → rollback về `v0.1.0`; script từ chối deploy khi có bài thi thật đang mở (trừ khi dùng `--force`).

## T1.8.12 Giám sát và cảnh báo

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.11.
- Làm: Sentry cho web, admin, api (gắn tên release); UptimeRobot hoặc Better Stack kiểm tra `https://example.com/api/v1/health` và trang chủ mỗi 1–5 phút; cảnh báo Linode (CPU > 90% trong 5 phút, I/O đĩa, băng thông); script kiểm tra hằng ngày (ổ đĩa > 80%, backup cũ hơn 26 giờ) gửi email cho chủ dự án.
- Kiểm tra: tắt container `api` trên server tạm → nhận cảnh báo trong 5 phút.

## T1.8.13 Runbook

Task thực thi liên quan: C06, V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.10, T1.8.11.
- Làm: viết `docs/runbooks/` dựa trên Phụ lục B: deploy, rollback, khôi phục, nâng/hạ gói theo mùa, sự cố (server không phản hồi, đầy ổ đĩa, PostgreSQL lỗi, Tunnel lỗi, media Worker lỗi), xoay secrets, thu hồi quyền của nhân sự nghỉ việc.
- Kiểm tra: người không viết runbook làm theo runbook deploy và rollback trên server tạm thành công.

## T1.9.1 Nội dung ra mắt

Task thực thi liên quan: V06, R06. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.7.13, T1.8.13.
- Làm: nhập và xuất bản tối thiểu 2 đề cho mỗi cấp độ, chỉ dùng nguồn có license phù hợp (D3); chọn đề cho khách làm thử.
- Kiểm tra: thư viện đề hiện đủ đề ở cả 5 cấp độ.

## T1.9.2 Load test bằng k6

Task thực thi liên quan: V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.13.
- Đọc thêm: `DE_XUAT_KY_THUAT.md` mục 8.4.
- Làm: kịch bản trong `tests/load/`: (1) bắt đầu đồng loạt, (2) lưu phiếu đều đặn, (3) nộp đồng loạt lúc hết thời gian, (4) tải snapshot và audio qua CDN. Chạy từ một server Linode tạm vào ban đêm, dùng đề và tài khoản thử nghiệm; tạm thêm rule WAF bỏ qua kiểm tra cho IP của máy chạy k6, xong thì xóa. Chạy với profile `small` (gói 4 GB), sau đó thử nâng gói 8 GB theo Phụ lục B4 và chạy lại với profile `large`.
- Kiểm tra: `docs/load-test-<ngày>.md` ghi số người thi cùng lúc tối đa của mỗi gói mà vẫn đạt p95 lưu phiếu < 300 ms, p95 nộp bài < 1 giây và lỗi < 0,1%; cập nhật con số vào Phụ lục B4; xóa dữ liệu thử nghiệm sau khi chạy.

## T1.9.3 Rà soát bảo mật

Task thực thi liên quan: V06, R06. Vai trò gốc: AGENT.

- Phụ thuộc: T1.8.13.
- Làm: `pnpm audit` và Dependabot không còn lỗ hổng mức high/critical; CodeQL trong CI; quét OWASP ZAP baseline vào domain; checklist OWASP ASVS L2 cho auth, session, phân quyền trong `docs/security-checklist.md`; thử thủ công: IDOR, sửa token media, gọi route admin từ host học viên, CSP, upload file giả.
- Kiểm tra: checklist đầy đủ, mọi mục `FAIL` đã được sửa hoặc được chủ dự án chấp nhận rủi ro bằng văn bản.

## T1.9.4 Thử trên nhiều thiết bị

Task thực thi liên quan: V06, R06. Vai trò gốc: AGENT + CHỦ DỰ ÁN.

- Phụ thuộc: T1.9.1.
- Làm: làm trọn 1 đề trên: iPhone (Safari, 2 bản iOS gần nhất), Android (Chrome), Windows (Chrome, Edge), macOS (Safari), Firefox. Ghi vào `docs/testing/device-matrix.md`.
- Kiểm tra: không còn lỗi mức P0/P1 trên thiết bị nào.

## T1.9.5 Pháp lý

Task thực thi liên quan: V06, R06. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.0.2.
- Làm: giải quyết D1; luật sư duyệt chính sách quyền riêng tư và điều khoản; lập hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài nếu lưu dữ liệu ngoài Việt Nam.
- Kiểm tra: file `docs/decisions/D1.md` ghi kết luận cuối cùng; trang pháp lý không còn chỗ "CẦN NỘI DUNG".

## T1.9.6 Beta kín

Task thực thi liên quan: V06, R06. Vai trò gốc: CHỦ DỰ ÁN + AGENT.

- Phụ thuộc: T1.9.2, T1.9.3, T1.9.4.
- Làm: mời 20–50 người dùng; form góp ý; theo dõi Sentry hằng ngày; ghi lỗi vào GitHub Issues với nhãn P0 (sửa ngay), P1 (sửa trước khi ra mắt), P2 (để sau).
- Kiểm tra: không còn issue P0/P1 đang mở.

## T1.9.7 Ra mắt công khai

Task thực thi liên quan: V06, R06. Vai trò gốc: CHỦ DỰ ÁN.

- Phụ thuộc: T1.9.5, T1.9.6.
- Làm: kiểm tra lần cuối: backup gần nhất < 24 giờ; runbook sẵn sàng; giám sát đang chạy; quyết định có nâng Cloudflare lên gói Pro không. Ra mắt; tuần đầu theo dõi hằng ngày.
- Kiểm tra: đạt tiêu chí cổng ra Giai đoạn 1 bên dưới.
