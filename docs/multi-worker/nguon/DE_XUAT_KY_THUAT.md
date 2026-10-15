# Đề xuất kỹ thuật & hạ tầng — JLPT Online

> **Dành cho:** agent / lập trình viên thiết kế và xây dựng hệ thống.
> **Phiên bản:** 1.3 — 13/10/2026. Bản 1.3: hạ tầng hiện tại đổi sang **1 server Linode chạy Docker Compose, nâng/hạ gói theo mùa thi** (mục 13.1); kiến trúc AWS giữ làm phương án mở rộng (mục 13.2); kế hoạch triển khai chi tiết nằm trong `KE_HOACH_TRIEN_KHAI.md`. Bản 1.2: lease, chính sách đồng hồ/audio, phiên bản đề bất biến, token media, kiểm chứng rủi ro. Bản 1.1: sửa điểm sai kỹ thuật, đơn giản hóa luồng lưu đáp án và chấm điểm.
> **Tài liệu nguồn về tính năng:** `Bao_cao_day_du_tinh_nang_JLPT_Online.docx` (cùng thư mục). Các mã như `EXAM-08`, `MIX-10`, `PDF-19` là mã tính năng trong tài liệu đó.
> **Cách dùng:** đây là hướng triển khai mặc định. Các điểm chưa chốt nằm ở **mục 1.3**: cứ làm theo giá trị mặc định, nhưng **chưa dựng hạ tầng production khi D1 chưa được xác nhận**. Nếu cần đi lệch một quyết định ở mục 3, nêu lý do trước khi làm.
> **Khi có mâu thuẫn:** chi tiết hạ tầng ở mục 13.1 và trong `KE_HOACH_TRIEN_KHAI.md` được ưu tiên hơn các chi tiết AWS (ALB, ECS, RDS, ElastiCache, SQS, Secrets Manager) ở các mục khác. Các chi tiết AWS chỉ áp dụng khi chuyển sang phương án mở rộng (mục 13.2).

---

## 0. Đọc nhanh (TL;DR)

- Sản phẩm: website luyện thi JLPT N5–N1. Lõi là **PDF → Ngân hàng câu hỏi → Tạo & làm đề thi**.
- Kiến trúc: **Modular Monolith, TypeScript, monorepo**. Không làm microservices ở giai đoạn đầu.
- Frontend: **Next.js (App Router)**. Trang public là HTML tĩnh (SSG/ISR), phục vụ qua CDN.
- Backend: **NestJS (Fastify)** + **PostgreSQL** + **Redis** + **BullMQ**. Xử lý PDF/OCR tiếng Nhật bằng **worker Python chạy cô lập**.
- Phòng thi: đề là **file JSON tĩnh trên CDN, không chứa đáp án** → client gửi **cả phiếu trả lời** (vài trăm byte) theo lô → server ghi **1 dòng cho mỗi lượt thi**, chỉ báo "đã lưu" **sau khi commit vào PostgreSQL** → **chấm điểm ngay khi nộp**. Đồng hồ chạy theo **deadline do server cấp**; mỗi lượt thi chỉ mở ở **một tab/thiết bị** tại một thời điểm.
- Hạ tầng hiện tại: **Cloudflare** (CDN, WAF, R2, Tunnel) + **1 server Linode Singapore chạy Docker Compose**, gói Shared 4 GB lúc vắng, nâng lên Dedicated 8 GB trong mùa thi (mục 13.1). AWS là phương án mở rộng khi số đo cho thấy cần. Nơi lưu dữ liệu vẫn **chờ xác nhận pháp lý (D1)**.
- 4 yêu cầu bắt buộc: **nhẹ, nhanh, tốt cho SEO · chịu tải khi nhiều người thi cùng lúc · bảo mật cao · dễ mở rộng.**

---

## 1. Bối cảnh dự án

| Nội dung | Mô tả |
|---|---|
| Người dùng | Khách, Học viên, Giáo viên/Trung tâm, Admin/Biên tập viên/Người duyệt |
| Ưu tiên | P0 = MVP, P1 = Growth, P2 = Advanced |
| Lộ trình | V1 MVP → V2 Trộn đề & luyện tập thông minh → V3 Cá nhân hóa & thương mại hóa → V4 Giáo viên/trung tâm, quy mô lớn |
| Ngôn ngữ giao diện | Tiếng Việt (chính); sau này thêm tiếng Nhật, tiếng Anh |
| Thị trường | Việt Nam (người dùng ở Việt Nam, thanh toán nội địa) |

### 1.1. Phạm vi V1 (MVP)

1. Tài khoản: đăng ký email, đăng nhập/đăng xuất, xác minh email, quên mật khẩu, chọn cấp độ, xem số đề đã làm (ACC-01, 02, 04, 05, 07, 10); email xác minh và đặt lại mật khẩu (NOTI-01, 02).
2. Thư viện đề: danh sách, lọc theo cấp/năm/kỳ, tìm kiếm, trạng thái làm bài, thông tin nguồn (LIB-01…08, 15).
3. Nhập PDF + đáp án + audio; OCR; biên tập viên đối chiếu với PDF gốc; kiểm duyệt; xuất bản (PDF-01, 03…17, 19, 20, 22…26, 28).
4. Ngân hàng câu hỏi có trạng thái kiểm duyệt và trạng thái bản quyền (QB-01…07, 11, 13, 16, 17).
5. Phòng thi mô phỏng: đồng hồ, nghe hiểu, tự lưu, khôi phục phiên, tự nộp (EXAM-01…22, AUDIO-01…04, 10).
6. Chấm điểm, lưu lịch sử, xem lại đáp án (SCORE-01…04, 06…08, 11; STAT-01).
7. Admin: người dùng, phân quyền, quản lý đề/câu hỏi/media, cấu hình cấu trúc thi, audit log, backup (ADM-01…08, 14, 19, 20).
8. Trang liên hệ, hỗ trợ, FAQ (SEO-10).
9. Phi chức năng: toàn bộ SYS mức P0.
10. Tùy chọn (theo D4): khách chưa đăng nhập làm thử một số đề được chỉ định.

### 1.2. Ngoài phạm vi V1

Trộn đề, luyện theo kỹ năng, giải thích đáp án, thống kê từ vựng (V2); SRS, lộ trình học, AI, thanh toán (V3); giáo viên, thi đồng loạt, bảng xếp hạng (V4). Không xây các phần này trong V1, nhưng **schema và cách chia module phải chừa chỗ** cho chúng (mục 10, 11).

### 1.3. Quyết định còn mở (cần chủ dự án xác nhận)

| ID | Câu hỏi | Mặc định khi chưa có trả lời | Liên quan |
|---|---|---|---|
| D1 | **Dữ liệu người dùng lưu ở đâu?** Lưu ở Singapore là chuyển dữ liệu cá nhân ra nước ngoài, phải lập hồ sơ đánh giá tác động theo Luật Bảo vệ dữ liệu cá nhân 2025 (hiệu lực 01/01/2026). Doanh nghiệp đăng ký tại Việt Nam còn có thể thuộc diện phải lưu dữ liệu trong nước theo Nghị định 53/2022/NĐ-CP (hoặc văn bản thay thế). **Cần luật sư xác nhận.** | Dev chạy trên máy lập trình; server Linode Singapore chỉ chứa dữ liệu giả cho tới khi D1 được xác nhận. Phương án thay thế: VPS/cloud đặt tại Việt Nam (mục 13.1), kiến trúc giữ nguyên. | Mục 9, 13 |
| D2 | Mục tiêu tải | V1: 2.000 người thi cùng lúc; thiết kế mở rộng được tới ≥ 10.000 | Mục 2, 8 |
| D3 | Nguồn đề nào được phép dùng công khai/thương mại? | Chỉ nguồn có `ContentLicense` cho phép mới được xuất bản công khai; các nguồn khác chỉ dùng nội bộ để thử nghiệm | QB-16, ADM-19 |
| D4 | V1 có cho khách chưa đăng nhập làm thử không? | Có, chỉ với đề được admin đánh dấu "cho làm thử", giới hạn số lượt | Mục 8, 11 |
| D5 | Dịch vụ OCR | Google Document AI; dự phòng Azure AI Document Intelligence | Mục 12 |
| D6 | Tên miền | Tạm dùng `example.com` | Mục 4 |
| D7 | Chính sách khi gặp sự cố kỹ thuật ở chế độ thi thật (mất mạng đúng lúc hết thời gian, lỗi audio) | Theo bảng ở mục 8.3: đồng hồ không dừng, kết quả bị ảnh hưởng được gắn cờ | Mục 8.3 |
| D8 | Mốc ra mắt | Beta kín trong mùa vắng (tháng 3/2027), ra mắt công khai trước mùa thi tháng 7/2027; không nhắm mùa thi tháng 12/2026 | `KE_HOACH_TRIEN_KHAI.md` |

---

## 2. Yêu cầu phi chức năng & tiêu chí đo

| # | Yêu cầu | Tiêu chí chấp nhận (đo được) |
|---|---|---|
| 1 | Nhẹ, load nhanh, tốt cho SEO | **Dữ liệu thực** (p75 người dùng, đo bằng thư viện `web-vitals`): LCP < 2,5 giây, INP < 200 ms, CLS < 0,1. **Lab** (Lighthouse CI chạy trong pipeline, cấu hình mobile): Performance ≥ 90, SEO ≥ 95, TBT < 200 ms. JS tải lần đầu của trang public ≤ 150 KB (gzip). |
| 2 | Chịu tải khi nhiều người thi cùng lúc | Theo D2. p95 API lưu đáp án < 300 ms, p95 nộp bài < 1 giây, **không mất đáp án** khi mất mạng, tải lại trang, request đến sai thứ tự hoặc mở bài ở tab khác. Độ sẵn sàng V1 ≥ 99,5%/tháng. Kiểm chứng bằng k6 theo kịch bản ở mục 8. |
| 3 | An toàn, bảo mật cao | Không lộ đáp án trước khi nộp. Không truy cập được dữ liệu của người dùng khác (IDOR). Admin bắt buộc 2FA. Đạt OWASP ASVS L2 cho auth, session, phân quyền. RPO ≤ 5 phút, RTO ≤ 1 giờ. |
| 4 | Dễ phát triển & mở rộng | Thêm phân hệ mới không phải sửa module phòng thi. `exam-engine` có test coverage ≥ 90%. Cấu trúc đề JLPT cấu hình được, không hard-code. Deploy không downtime khi chạy nhiều máy; ở phương án 1 server, mỗi lần deploy gián đoạn vài giây nên chỉ deploy khi không có bài thi thật đang mở (mục 13.1). |

---

## 3. Các quyết định kiến trúc (ADR tóm tắt)

| ID | Quyết định | Lý do | Phương án đã loại |
|---|---|---|---|
| ADR-01 | **Modular Monolith** | Đội nhỏ; microservices làm tăng chi phí vận hành, debug và deploy. Module chia đúng thì sau này tách ra được. | Microservices ngay từ đầu |
| ADR-02 | **TypeScript cho toàn bộ hệ thống** (trừ worker OCR) | Dùng chung type và schema giữa frontend và backend, giảm lỗi | Mỗi tầng một ngôn ngữ |
| ADR-03 | **Next.js App Router** | Mỗi trang chọn được SSG/ISR/SSR; Server Components giảm lượng JS gửi xuống trình duyệt | SPA thuần (SEO kém); Astro (rất nhẹ cho trang nội dung, nhưng phần ứng dụng phải dùng thêm framework khác) |
| ADR-04 | **NestJS với Fastify adapter** | Có sẵn module, DI, guard, validation; Fastify cho throughput cao hơn Express | Express thuần (thiếu cấu trúc) |
| ADR-05 | **PostgreSQL** | Quan hệ phức tạp (Exam → Section → Group → Question); JSONB cho nội dung câu; transaction | MongoDB |
| ADR-06 | **2 instance Redis: `core` và `cache`** (2 container trên 1 server; 2 cụm ElastiCache khi lên AWS) | Session, rate limit và BullMQ bắt buộc `noeviction` (không được tự xóa key); cache thì cần được xóa bớt khi đầy (`allkeys-lru`). Dùng chung một cụm thì hai yêu cầu này xung đột. | Một Redis cho mọi việc |
| ADR-07 | **Đề thi = JSON snapshot bất biến trên CDN** | Đề không đổi trong lúc thi → hàng nghìn người mở đề cùng lúc không tạo tải cho API/DB | API trả đề cho từng request |
| ADR-08 | **Lưu đáp án: client gửi cả phiếu theo lô, server ghi 1 dòng/lượt thi trong PostgreSQL**, qua interface `AnswerStore` | Đơn giản, bền, không cần trộn dữ liệu; server chỉ báo "đã lưu" sau khi commit. V1 chỉ khoảng 200 request lưu/giây. Chỉ cân nhắc Redis write-behind khi load test cho thấy PostgreSQL là nút thắt, và vẫn phải giữ đảm bảo không mất đáp án (mục 8.4). | Redis write-behind ngay từ V1 (thêm worker flush, hai nơi giữ dữ liệu, mất dữ liệu nếu Redis lỗi) |
| ADR-09 | **Chấm điểm đồng bộ ngay khi nộp** | Chấm 100 câu chỉ tốn vài ms; người dùng có kết quả ngay, không cần polling. Việc nặng (thống kê, thông báo) đẩy vào queue. | Chấm qua queue rồi polling kết quả |
| ADR-10 | **Worker Python cô lập** cho PDF/OCR/NLP (V1: chạy dạng CLI trên máy biên tập viên, không chạy trên server) | Các thư viện OCR và tách từ tiếng Nhật (SudachiPy, MeCab…) chủ yếu có trên Python. File PDF đến từ nguồn ngoài nên phải xử lý cô lập. | OCR bằng Node |
| ADR-11 | **Cloudflare phía trước + 1 server Linode (Docker Compose)**, nâng/hạ gói theo mùa thi; AWS khi số đo cho thấy cần (chờ D1) | Ngân sách nhỏ; tải tăng giảm theo lịch thi biết trước; phần nặng (trang tĩnh, đề, audio) đã do Cloudflare gánh. Chạy bằng container nên sau này chuyển sang AWS không phải viết lại code. | AWS ngay từ đầu (~$550–650/tháng, vượt ngân sách) |
| ADR-12 | **REST + OpenAPI, API cùng domain với web (`/api/v1`)** | Không phải xử lý CORS, dùng được cookie `__Host-`; tự sinh client cho web và app mobile sau này | tRPC (khó dùng cho mobile/đối tác), GraphQL (phức tạp thừa), API ở subdomain riêng |

---

## 4. Sơ đồ kiến trúc

### 4.1. Phương án hiện tại: 1 server

```
                 Cloudflare: DNS · CDN · WAF · Turnstile · Access
            ┌──────────────────────────────┬──────────────────────────────┐
            ▼                              ▼                              ▼
       example.com                admin.example.com (sau Access)    media.example.com
            │                              │                     Worker kiểm tra token
            │                              │                     → R2: đề, audio, ảnh
            └──────────────┬───────────────┘
                           ▼
        Cloudflare Tunnel → cloudflared chạy trên server (không mở cổng nào)
                           │
  Linode Singapore · Docker Compose
  ├─ web :3000 · admin :3001 · api :4000 · worker
  └─ postgres (WAL-G → R2) · redis-core (noeviction) · redis-cache (allkeys-lru)

  ocr-worker: CLI chạy trên máy biên tập viên → gói JSON → tải lên trang admin
```

### 4.2. Kiến trúc khi mở rộng (AWS)

```
                     Cloudflare: DNS · CDN · WAF · chống bot · Turnstile
        ┌─────────────────────────┬──────────────────────────┐
        ▼                         ▼                          ▼
  example.com               admin.example.com          media.example.com
  /         → web           /         → admin          Worker kiểm tra token
  /api/v1/* → api           /api/v1/* → api            → R2: snapshot đề, audio, ảnh
                            (sau Cloudflare Access)
        │                         │
        └────────────┬────────────┘
                     ▼
     AWS ALB — chỉ nhận traffic từ Cloudflare, định tuyến theo host + path
                     │
       ┌─────────────┼──────────────────────┐
       ▼             ▼                      ▼
  web, admin    api (NestJS)           worker (cùng code với api)
  (Next.js)     stateless, autoscale   outbox, thống kê, email,
                     │                 đóng bài quá hạn, AI
       ┌─────────────┼──────────────────────┐
       ▼             ▼                      ▼
  PostgreSQL    Redis core             Redis cache
  (RDS)         noeviction: session,   allkeys-lru: cache ISR
                rate limit, BullMQ     của Next.js, cache API

  ocr-worker (Python, cô lập): SQS → bucket import → gọi API nội bộ báo kết quả
                               (không truy cập PostgreSQL / Redis)
```

**Phân chia domain:**

| Domain | Phục vụ | Ghi chú |
|---|---|---|
| `example.com` | `web`; `/api/v1/*` → `api` | Cookie phiên `__Host-session` (chỉ gắn với host này). Tunnel (ALB khi lên AWS) chặn `/api/v1/admin/*` trên domain này; API kiểm tra thêm header Host. |
| `admin.example.com` | `admin`; `/api/v1/*` → `api` | Đặt sau Cloudflare Access. Cookie phiên admin riêng, không dùng chung với học viên. |
| `media.example.com` | Cloudflare Worker → R2 | Token theo lượt thi do `api` ký (HMAC). Worker kiểm tra chữ ký, hạn dùng và file được yêu cầu có nằm trong manifest media của phiên bản đề đó không; cache key bỏ qua tham số token. |

---

## 5. Stack công nghệ

| Lớp | Công nghệ |
|---|---|
| Ngôn ngữ | TypeScript (strict); Python 3.12+ cho `ocr-worker` (quản lý package bằng `uv`) |
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js (App Router, `output: "standalone"`), React, Tailwind CSS, `next/font`, next-intl |
| State phòng thi | Zustand + IndexedDB (qua `idb` hoặc Dexie) |
| Backend | NestJS + `@nestjs/platform-fastify`; cùng một codebase chạy 2 chế độ: `api` (HTTP) và `worker` (job nền) |
| Validation | **Zod**: schema đặt ở `packages/schema`, dùng chung FE/BE, xuất JSON Schema cho `ocr-worker` |
| ORM / migration | Drizzle ORM (hoặc Prisma); migration nằm trong repo |
| Database | PostgreSQL 17+ (container trên server; RDS khi lên AWS). Tìm kiếm tiếng Nhật: **pg_bigm**, build vào image PostgreSQL riêng (giữ lựa chọn này vì RDS cũng hỗ trợ, chuyển sang AWS không phải đổi; PGroonga không có trên RDS). Tìm kiếm tiếng Việt không dấu: `unaccent`. |
| Redis | Redis OSS hoặc Valkey, **2 instance** (2 container trên 1 server; 2 cụm ElastiCache khi lên AWS): `core` (`noeviction`: session, rate limit, BullMQ) và `cache` (`allkeys-lru`: cache ISR của Next.js, cache API). Môi trường dev chạy đúng 2 container như production. |
| Queue | BullMQ (trên Redis `core`) cho job nội bộ. V1 không cần queue cho OCR vì `ocr-worker` chạy dạng CLI trên máy biên tập viên; khi chuyển OCR lên server riêng thì dùng SQS hoặc một Redis riêng, qua interface `JobQueue`. |
| File storage | Cloudflare R2 (tương thích S3) + Cloudflare Worker kiểm tra token truy cập |
| OCR | Google Document AI (D5). PDF có sẵn lớp chữ thì trích trực tiếp bằng `pypdfium2` / `pdfplumber` (tránh thư viện AGPL như PyMuPDF nếu chưa mua license). LLM có khả năng đọc ảnh để nhận diện cấu trúc 問題 / câu / đáp án, gọi qua adapter `LlmProvider`. |
| NLP tiếng Nhật | SudachiPy hoặc MeCab (+ UniDic): tách từ, chuẩn hóa về dạng từ điển (DATA-01, 02) |
| Tìm kiếm (V2+) | Meilisearch |
| Auth | Better Auth (hoặc tự xây trên NestJS): session lưu phía server, Google OAuth, passkey/TOTP cho 2FA |
| Email | Resend (mặc định, có gói miễn phí) hoặc Amazon SES; cấu hình SPF, DKIM, DMARC |
| Thanh toán (V3) | PayOS / VNPay / MoMo; Stripe cho thẻ quốc tế |
| Test | Vitest (unit), Playwright (E2E), k6 (load test) |
| Giám sát | Sentry, uptime monitor (Better Stack hoặc UptimeRobot), cảnh báo của Linode, `web-vitals` (RUM); OpenTelemetry + Grafana khi lên nhiều máy |
| CI/CD | GitHub Actions build Docker image (linux/amd64, vì Linode chạy x86) → GitHub Container Registry → script `deploy.sh` trên server; ECS khi lên AWS |
| IaC | Script dựng server + file Compose trong `infra/` (V1); Terraform/AWS CDK khi lên AWS |

---

## 6. Cấu trúc monorepo & quy ước

```
/
├─ apps/
│  ├─ web/           Next.js: trang public, học viên, phòng thi
│  ├─ admin/         Next.js: CMS, nhập PDF, kiểm duyệt, quản lý
│  ├─ api/           NestJS: mỗi phân hệ một module; cùng image chạy chế độ api hoặc worker
│  │   └─ src/modules/
│  │       auth/ user/ exam/ blueprint/ attempt/ scoring/ mix/
│  │       question-bank/ media/ import/ review/ license/
│  │       vocab/ stats/ notification/ payment/ ai/ admin/ audit/ outbox/
│  ├─ media-worker/  Cloudflare Worker: kiểm tra token, phục vụ đề/audio/ảnh từ R2
│  └─ ocr-worker/    Python CLI: PDF → text/ảnh → gói JSON câu hỏi
├─ packages/
│  ├─ schema/        Zod schema + type TS dùng chung (DTO, ExamSnapshot, Blueprint, định dạng nội dung tiếng Nhật)
│  ├─ exam-engine/   Logic THUẦN: deadline, chấm điểm, validate blueprint, thuật toán trộn đề
│  ├─ api-client/    Client TS sinh tự động từ OpenAPI
│  ├─ media-token/   Ký/kiểm tra mediaToken (WebCrypto, dùng chung cho api và media-worker)
│  ├─ ui/            Design system (component dùng chung web/admin)
│  └─ config/        eslint, tsconfig, tailwind preset
├─ infra/            docker-compose dev/production, cấu hình cloudflared, image PostgreSQL, script server
└─ docs/             ADR, sơ đồ, đặc tả API
```

**Quy tắc phụ thuộc:**
- `packages/exam-engine` **không import** framework nào (không Next, không Nest, không DB). Chỉ gồm hàm thuần nhận input, trả output → dễ unit test, dùng lại được cho app mobile.
- Module trong `api` **không truy cập trực tiếp bảng của module khác**; chỉ gọi service public của module đó hoặc nhận event.
- Event giữa các module dùng **outbox pattern**: ghi event vào bảng `outbox` trong cùng transaction với dữ liệu; worker đọc `outbox` rồi đẩy vào BullMQ. Ví dụ `attempt.submitted` → các module `stats`, `vocab`, `notification` tự xử lý. Thêm tính năng mới không phải sửa module `attempt`.

**Quy ước chung:**
- Thời gian lưu dạng UTC (`timestamptz`), hiển thị theo giờ Việt Nam.
- Khóa chính dùng UUIDv7 (PostgreSQL 18 có sẵn `uuidv7()`; bản cũ hơn thì sinh trong app).
- Chuỗi đầu vào được chuẩn hóa về Unicode NFC trước khi lưu. Index tìm kiếm có thể dùng thêm NFKC, nhưng không áp dụng NFKC cho nội dung gốc của đề.
- Chuỗi giao diện đặt trong file ngôn ngữ (next-intl) ngay từ đầu, dù V1 chỉ có tiếng Việt (ACC-14).
- Không log mật khẩu, token, dữ liệu cá nhân.

---

## 7. Yêu cầu 1 — Nhẹ, nhanh, SEO

### 7.1. Chiến lược render

| Loại trang | Cách render | Ghi chú |
|---|---|---|
| Trang chủ, trang cấp độ N1–N5, danh sách đề theo cấp/năm/kỳ (SEO-02), giới thiệu đề, blog, FAQ, bảng giá | **SSG/ISR** | Mặc định là Server Component; chỉ phần tương tác (bộ lọc, nút) là Client Component. Bộ lọc trên trang lọc phía client trên danh sách tĩnh. |
| Trang số lượng lớn: từ vựng, kanji, ngữ pháp (V2) | **ISR + `dynamicParams`** | Build sẵn phần phổ biến, phần còn lại render ở request đầu tiên rồi cache |
| Dữ liệu cá nhân trên trang public (trạng thái đã làm, điểm cao nhất: LIB-08, 09) | Tải phía client sau khi trang hiển thị | HTML vẫn tĩnh, cache được ở CDN |
| Dashboard, lịch sử, kết quả | SSR hoặc client sau khi đăng nhập | `noindex`, không cache ở CDN |
| Phòng thi | Client, route riêng, lazy-load | Không để JS phòng thi lọt vào bundle trang public |

### 7.2. Self-host Next.js nhiều container sau Cloudflare

- Khi chạy từ 2 container web trở lên, cấu hình **cache handler dùng chung** (Redis `cache`) theo hướng dẫn self-hosting của phiên bản Next.js đang dùng (phương án 1 server chỉ có 1 container web nên chưa cần). Thiếu bước này thì mỗi container giữ cache ISR riêng và revalidate chỉ có tác dụng trên một container.
- Cloudflare mặc định **không cache HTML** → tạo Cache Rule cho các đường dẫn public, tôn trọng `Cache-Control` do Next.js trả về. Luôn bypass cache cho `/api/*`.
- HTML trang public **không được chứa dữ liệu cá nhân** và không phụ thuộc cookie, để mọi người dùng nhận chung một bản cache.
- Khi admin xuất bản hoặc sửa đề: gọi revalidate (theo tag/path) **và** purge cache Cloudflare cho các URL liên quan.
- Tắt Rocket Loader của Cloudflare (có thể làm hỏng hydration của React).

### 7.3. Đặc thù tiếng Nhật và tài nguyên

- **Font:** giao diện tiếng Việt dùng font có subset `vietnamese` (đủ dấu chồng như ề, ộ, ữ). Font tiếng Nhật (Noto Sans JP) nạp qua `next/font/google`: font được chia nhỏ theo `unicode-range`, trình duyệt chỉ tải phần chữ thực sự dùng; **không preload** font tiếng Nhật và chỉ áp dụng ở vùng có chữ Nhật. `font-display: swap`.
- **Furigana:** dùng thẻ `<ruby>漢字<rt>かんじ</rt></ruby>`. **Không** render chữ bằng ảnh.
- **Ảnh:** AVIF/WebP, luôn khai báo `width`/`height` để tránh CLS.
- **Audio:** **MP3 hoặc AAC (.m4a), 64–96 kbps, mono**: phát được trên mọi trình duyệt, kể cả Safari iOS (Opus không ổn định trên một số phiên bản Safari).

### 7.4. SEO kỹ thuật

- `sitemap.xml` tự sinh, `robots.txt`, metadata và Open Graph cho từng trang (SEO-06, 08).
- JSON-LD: `Course`, `FAQPage`, `BreadcrumbList`, `Article` (SEO-07).
- `hreflang` vi/ja/en khi có đa ngôn ngữ (ACC-14).
- **Chỉ index trang giới thiệu đề.** Nội dung câu hỏi, đáp án và đề trộn của người dùng: `noindex`, không đưa vào sitemap.
- Gửi số đo `web-vitals` từ trình duyệt thật về công cụ analytics (SEO-11) để theo dõi chỉ tiêu ở mục 2.

---

## 8. Yêu cầu 2 — Chịu tải khi nhiều người thi cùng lúc

**Nguyên tắc:**
1. Nội dung đề đi qua CDN, không qua API.
2. Client gộp thao tác thành lô, không gửi request cho từng lần bấm.
3. Mỗi lần lưu chỉ ghi một dòng nhỏ.
4. Mọi thứ liên quan đến thời gian do server quyết định.
5. Server chỉ báo "đã lưu" sau khi dữ liệu đã commit vào PostgreSQL; client chỉ coi một thay đổi là đã đồng bộ khi nhận được phản hồi thành công.

### 8.1. Luồng API của một lượt thi

| Bước | Client gọi | Server xử lý |
|---|---|---|
| 1 | `POST /api/v1/attempts {examId, mode}` | Kiểm tra quyền, tạo attempt gắn với đúng một `ExamVersion`. Trả `attemptId`, `lease`, `serverNow`, `snapshotUrl`, `mediaToken`. |
| 2 | `GET {snapshotUrl}?t={mediaToken}` | Không qua API: Worker kiểm tra token, CDN/R2 trả file JSON đề, **không có đáp án**. |
| 3 | `POST /api/v1/attempts/:id/sections/next {lease}` | Bắt đầu phần đầu tiên, hoặc khóa phần hiện tại và bắt đầu phần kế tiếp. Trả `serverNow` và `deadline` của phần mới. |
| 4 | `PUT /api/v1/attempts/:id/sheet {lease, seq, answers, flags, changes}` | Kiểm tra `lease`, trạng thái attempt và deadline. Ghi `changes` vào nhật ký (INSERT, bỏ qua nếu trùng `seq`). Nếu `seq` > `last_seq` thì thay phiếu (UPDATE). Trả 200 sau khi commit. |
| 5 | `POST /api/v1/attempts/:id/submit {lease, seq, answers, flags}` | Trong 1 transaction: khóa dòng attempt (`SELECT … FOR UPDATE`), kiểm tra trạng thái và deadline, lưu phiếu cuối nếu `seq` mới hơn, chấm điểm, đặt `status = submitted`, ghi kết quả + event vào `outbox`. **Trả kết quả ngay.** Gọi lại submit thì trả đúng kết quả đã có. |
| 6 | `POST /api/v1/attempts/:id/resume` | Cấp `lease` mới (tab/thiết bị giữ lease cũ bị vô hiệu). Trả phiếu đã lưu, `last_seq`, `serverNow`, phần hiện tại và deadline, `mediaToken` mới. |
| 7 | `POST /api/v1/attempts/:id/media-token` | Cấp lại `mediaToken` khi sắp hết hạn, hoặc khi mở trang xem lại bài sau khi nộp (SCORE-08, AUDIO-07). |
| V2 | `POST /api/v1/attempts/:id/check {lease, index}` | Chế độ luyện tập: trả đáp án + giải thích của **một câu đã trả lời**. |

Sau bước 5, worker xử lý tiếp: tách dữ liệu sang bảng `UserAnswer`, cập nhật thống kê, gửi thông báo.

### 8.2. Quy tắc chi tiết

1. **Phiên bản đề:** khi xuất bản một đề (kể cả đề trộn), hệ thống tạo một `ExamVersion` bất biến (mục 11) gồm:
   - file JSON `exams/{examId}/v{n}/snapshot.json`: phần thi, nhóm câu, câu hỏi, lựa chọn, **mã media** (không chứa URL có hạn) và timeline phần nghe; **tuyệt đối không có đáp án**;
   - manifest media `exams/{examId}/v{n}/manifest.json` (danh sách file được phép tải);
   - answer key (mảng đáp án theo đúng thứ tự câu trong snapshot) và cấu hình chấm điểm, lưu trong DB, chỉ server đọc.
2. **Token media theo lượt thi:** `mediaToken` do `api` ký HMAC, chứa `attemptId`, `examId`, `version` và hạn dùng (tổng thời gian thi + dự phòng). Client ghép mã media thành URL `media.example.com/...?t={mediaToken}`. Worker kiểm tra chữ ký, hạn dùng và kiểm tra file có nằm trong manifest của phiên bản đó không.
3. **Phiếu trả lời theo vị trí câu:** `answers` là mảng số theo thứ tự câu trong snapshot (`0` = bỏ trống, `1–4` = lựa chọn); `flags` là danh sách vị trí câu được đánh dấu. Đề khoảng 100 câu chỉ nặng vài trăm byte, nên **mỗi lần gửi cả phiếu**. Vì vậy request đến sai thứ tự không làm mất đáp án. Ví dụ lô 1 đổi câu A, lô 2 đổi câu B: lô 2 đã chứa cả A và B, nên nếu lô 2 đến trước thì việc bỏ lô 1 không làm mất gì.
4. **Thứ tự và idempotent:** `seq` do client tăng dần. Khi vào lại bài, `seq` tiếp theo = max(`seq` cục bộ, `last_seq` server trả về) + 1. Server chỉ thay phiếu khi `seq` > `last_seq`; nhật ký `changes` thì luôn được ghi (unique theo `attempt_id` + `seq`, trùng thì bỏ qua), nên dữ liệu thống kê cũng không mất khi request đến sai thứ tự. Gửi lại bao nhiêu lần cũng an toàn.
5. **Mỗi lượt thi chỉ mở ở một nơi (lease):** mỗi attempt chỉ có một `lease` còn hiệu lực. Mở bài ở tab hoặc thiết bị khác qua `resume` thì lease cũ bị vô hiệu; mọi request mang lease cũ nhận lỗi 409, client hiển thị "Bài thi đang được mở ở nơi khác".
6. **Thời điểm gửi:** debounce khoảng 3 giây sau thay đổi cuối, tối đa 10 giây một lần; gửi ngay khi chuyển phần, khi tab bị ẩn (`visibilitychange`) và khi rời trang (`fetch` với `keepalive: true`). Mỗi client chỉ có **tối đa 1 request lưu đang chờ phản hồi**; thay đổi phát sinh trong lúc chờ được gộp vào lần gửi sau. Mọi thay đổi được ghi vào IndexedDB **trước** khi gửi, và giữ trạng thái "chưa đồng bộ" cho tới khi có phản hồi thành công.
7. **Đồng hồ:** server cấp deadline **tại thời điểm từng phần bắt đầu**. Client tính độ lệch `offset = serverNow − Date.now()` và đếm ngược theo deadline. Ở chế độ thi thật, server từ chối lưu/nộp sau `deadline + grace` (5–10 giây, cấu hình được), trừ trường hợp gửi muộn do mất mạng (mục 8.3). Ở chế độ luyện tập, server không chặn theo deadline; thời gian chỉ dùng để thống kê.
8. **Hết thời gian và bài bị bỏ dở:** client tự nộp khi hết thời gian (EXAM-20). Nếu client không nộp, worker định kỳ đóng các attempt đã qua khoảng nhận phiếu muộn (mục 8.3), dùng **cùng logic khóa + chấm như submit**, nên client và worker không thể chấm một bài hai lần.
9. **Khóa phần (EXAM-22):** server lưu `current_section`; khi nhận phiếu, server giữ nguyên đáp án đã lưu của các phần đã khóa.
10. **Không lộ đáp án (EXAM-21):** chế độ thi thật chỉ trả đáp án sau khi nộp. Chế độ luyện tập (PRA-10, V2) dùng endpoint `check` cho từng câu đã trả lời; **không bao giờ đưa đáp án vào snapshot**.
11. **Chấm điểm (SCORE-01):** chạy đồng bộ trong request nộp bài bằng hàm `score()` của `exam-engine`, dùng answer key và cấu hình chấm của **đúng `ExamVersion` mà attempt tham chiếu** (cache trong bộ nhớ của `api`, vì bất biến). Admin sửa đáp án trong lúc học viên đang thi không ảnh hưởng tới attempt đó.
12. **Audio (AUDIO-01, 04, 10):**
    - Snapshot chứa **timeline phần nghe**: danh sách đoạn `{mediaKey, startMs, endMs, gapAfterMs}` theo thứ tự. Thi thật phát liên tục theo timeline; luyện tập nhảy được tới từng đoạn. Cách này dùng được cho cả file audio gốc dài lẫn đề trộn ghép từ nhiều file.
    - Audio được tải trước vào Cache Storage **trong lúc thí sinh làm các phần trước**. Nút "Bắt đầu phần nghe" chỉ bật khi đã tải đủ, nên đồng hồ phần nghe không bao giờ chạy trong lúc audio còn đang tải.
    - Safari iOS chỉ cho phát âm thanh sau một thao tác chạm, nên nút "Bắt đầu phần nghe" kiêm luôn bước kiểm tra loa (EXAM-05).
13. **Nhật ký sự kiện (SYS-18):** trường `changes` của mỗi lần lưu (vị trí câu, đáp án, thời điểm) và các sự kiện chính (bắt đầu, chuyển phần, nộp bài, mất kết nối, lỗi audio, đổi lease) được ghi append-only vào `AttemptEvent`. Bảng này dùng để khôi phục, điều tra lỗi và cho các thống kê SCORE-15, STAT-12; xóa theo chính sách lưu trữ (SYS-19).
14. **Khách làm thử (D4):** attempt gắn `guest_id` (cookie) thay cho `user_id`, chỉ áp dụng cho đề được đánh dấu cho làm thử; bắt buộc Turnstile khi bắt đầu, giới hạn số lượt. Khi khách đăng nhập, attempt được gắn vào tài khoản.

### 8.3. Chính sách đồng hồ & audio theo chế độ (P0, chốt trước khi làm phòng thi)

| Tình huống | Thi thật (`real`) | Luyện tập (`practice`) |
|---|---|---|
| Bắt đầu một phần | Thí sinh bấm "Bắt đầu"; server cấp deadline tại thời điểm đó | Như thi thật, hoặc chọn không giới hạn thời gian (PRA-08, 09) |
| Giữa hai phần | Màn hình chờ; phần sau chỉ bắt đầu khi thí sinh bấm. Bài bỏ dở quá 24 giờ thì bị đóng và chấm theo phiếu đã lưu | Không giới hạn |
| Chuyển phần sớm | Cho phép sau khi xác nhận. Phần cũ bị khóa; thời gian còn thừa bị bỏ, không cộng sang phần sau | Cho phép; được quay lại phần cũ |
| Hết thời gian một phần | Tự khóa phần đó; nếu là phần cuối thì tự nộp bài | Thông báo, cho chọn làm tiếp hoặc nộp |
| Tải lại trang, mất mạng ngắn | Đồng hồ vẫn chạy theo server; vào lại thì khôi phục phiếu và làm tiếp nếu còn thời gian | Đồng hồ dừng trong lúc mất kết nối hoặc rời trang |
| Mất mạng đúng lúc hết thời gian | Client khóa nhập liệu khi đồng hồ về 0 và gửi phiếu ngay khi có mạng. Server nhận phiếu này nếu đến trong vòng 10 phút sau deadline và gắn cờ `late_sync` | Không áp dụng |
| Tải lại trang khi đang nghe | Audio phát tiếp tại vị trí = giờ server hiện tại − thời điểm bắt đầu phần nghe (quy ra đoạn + offset trên timeline); đoạn đã lỡ không phát lại | Phát tiếp từ vị trí đã dừng |
| Tua, phát lại, đổi tốc độ | Không | Có (AUDIO-05, 06) |
| Lỗi phát audio giữa chừng (D7) | Tự phát lại tại vị trí đồng bộ; đồng hồ không dừng. Nếu vẫn lỗi, thí sinh được kết thúc phần nghe; kết quả gắn cờ `interrupted` và không đưa vào thống kê so sánh | Tự thử lại, cho phát lại từ đầu nhóm câu |
| Tạm dừng chủ động | Không | Có |
| Xem đáp án | Sau khi nộp | Ngay sau mỗi câu (V2) |

Các giá trị 24 giờ và 10 phút là mặc định, cấu hình được. Thi đồng loạt (V4) nên đặt khoảng nhận phiếu muộn bằng 0.

### 8.4. Ước lượng tải & hướng mở rộng

- Các con số dưới đây chỉ là **ước lượng trung bình để định hướng**. Số task và cỡ instance thật phải lấy từ kết quả k6.
- **2.000 người (V1)**, mỗi người lưu khoảng 10 giây/lần → ~200 request/giây. Phương án 1 server: gói Shared 4 GB chịu khoảng 300–500 người, Dedicated 8 GB khoảng 1.500–2.000 người (ước lượng, phải đo bằng k6). Khi lên AWS: 2 task `api` + RDS cỡ nhỏ, autoscaling theo CPU và số request.
- **10.000 người** → ~1.000 request/giây (mỗi request 1 UPDATE + 1 INSERT nhỏ); dùng RDS Proxy hoặc PgBouncer khi tổng số kết nối lớn.
- **Hai đợt cao điểm** thường nặng hơn tải trung bình: bắt đầu đồng loạt (tạo attempt + bắt đầu phần + tải đề từ CDN) và nộp đồng loạt lúc hết thời gian (mỗi lần nộp là 1 transaction nhỏ + chấm trong bộ nhớ). Mỗi đợt cần kịch bản k6 riêng.
- Chỉ cân nhắc Redis write-behind khi k6 cho thấy PostgreSQL là nút thắt, với điều kiện vẫn giữ đảm bảo "đã báo lưu thì không mất" (ví dụ chỉ báo lưu sau khi primary và replica Redis đều xác nhận bằng lệnh `WAIT`; lần nộp luôn gửi kèm cả phiếu). API và client không phải đổi.
- `api` stateless; thư viện đề được cache ở CDN và Redis `cache`.
- **Thi đồng loạt (GAME-06, V4):** làm nóng cache CDN, scale trước 15 phút, có phòng chờ và cho vào lệch nhau vài giây; chỉ công bố đáp án sau khi kỳ thi kết thúc.
- **Kịch bản k6 bắt buộc** (SYS-10), chạy trước khi ra mắt và trước mỗi đợt thi lớn: (1) bắt đầu đồng loạt; (2) lưu phiếu đều đặn suốt bài thi; (3) nộp đồng loạt lúc hết thời gian; (4) tải snapshot và audio qua CDN. Các tình huống đúng/sai về logic (sai thứ tự, gửi lại, mở 2 tab) được kiểm bằng test tích hợp và E2E (mục 14, bước 6).

---

## 9. Yêu cầu 3 — Bảo mật

| Lớp | Bắt buộc |
|---|---|
| Biên mạng | Cloudflare gói Free khi beta (Free managed ruleset, chống DDoS, Bot Fight Mode); nâng gói Pro khi ra mắt công khai nếu ngân sách cho phép (WAF managed rules đầy đủ, Super Bot Fight Mode). Bot Management đầy đủ chỉ có ở gói Enterprise. **Turnstile** ở form đăng ký, đăng nhập, quên mật khẩu và khi khách bắt đầu làm thử. Rate limit ở cả Cloudflare và `api` (Redis `core`) (SYS-12). |
| Origin | **Server chỉ nhận traffic qua Cloudflare:** dùng Cloudflare Tunnel; Linode Cloud Firewall chặn mọi cổng vào; container chỉ bind `127.0.0.1`; SSH đi qua Tunnel + Cloudflare Access (Lish là đường dự phòng). API lấy IP người dùng từ header `CF-Connecting-IP`. Khi lên AWS: security group của ALB chỉ mở cho dải IP Cloudflare + Authenticated Origin Pulls (mTLS). |
| Mật khẩu | **Argon2id** (cấu hình lại nếu thư viện auth mặc định dùng thuật toán khác). Đặt độ dài tối thiểu, kiểm tra mật khẩu đã bị lộ (HIBP, k-anonymity). |
| Session | Cookie `__Host-` với `HttpOnly; Secure; SameSite=Lax`, chỉ gắn với host. Session lưu phía server (Redis `core`), đổi ID session sau khi đăng nhập. Quản lý thiết bị và thu hồi session (ACC-12). |
| Xác thực bổ sung | Bắt buộc xác minh email. Google OAuth (ACC-03). **Admin, biên tập viên, người duyệt bắt buộc 2FA** (ưu tiên passkey/WebAuthn, tối thiểu TOTP). Quên mật khẩu luôn trả cùng một thông báo dù email có tồn tại hay không (chống dò tài khoản); link đặt lại mật khẩu chỉ dùng một lần và hết hạn nhanh. |
| Phân quyền | RBAC: `admin`, `editor`, `reviewer`, `teacher`, `student`, kết hợp **kiểm tra quyền trên từng tài nguyên** (chủ của attempt, giáo viên của lớp…) bằng CASL. Mọi endpoint mặc định là *deny*. |
| Admin | Subdomain riêng, đặt sau Cloudflare Access. Cookie phiên riêng. Tunnel (hoặc ALB) chỉ định tuyến `/api/v1/admin/*` trên host admin; API kiểm tra thêm header Host. **Audit log** mọi thao tác ghi (ADM-14). Duyệt 2 bước: người nhập khác người duyệt. |
| Bảo vệ đề và đáp án | Đáp án chỉ nằm ở server, chỉ trả về sau khi nộp (EXAM-21). Snapshot và media dùng token theo lượt thi, kiểm tra theo manifest (mục 8.2). Không có endpoint trả dữ liệu hàng loạt. Rate limit theo user/IP, giới hạn số lượt thi mỗi ngày với nội dung trả phí (chặn kiểu "nộp trắng để lấy đáp án" hàng loạt). Có thể watermark ID người dùng vào nội dung trả phí (SYS-17). |
| Ứng dụng | Validate mọi input bằng Zod. ORM tham số hóa. HSTS. CSRF: SameSite cookie + API chỉ nhận JSON + kiểm tra header `Origin` với request ghi. Nội dung câu hỏi lưu dạng JSON có cấu trúc, render bằng React (tự escape); chỗ nào bắt buộc nhận HTML/Markdown (blog, giải thích) thì sanitize. |
| CSP | Trang động (phòng thi, dashboard, admin): CSP dùng nonce. Trang tĩnh SSG/ISR **không dùng được nonce** (nonce buộc render động, mất cache CDN) → dùng CSP không nonce nhưng vẫn khóa chặt các directive còn lại (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, giới hạn nguồn script và kết nối). |
| Upload & OCR | Kiểm tra magic bytes + MIME, giới hạn dung lượng; quét malware (ClamAV) trên máy chạy OCR trước khi tạo gói (server 4 GB không đủ RAM cho ClamAV). V1: `ocr-worker` chạy dạng CLI trên máy biên tập viên, **không chạy trên server và không có quyền truy cập PostgreSQL/Redis**; server chỉ nhận gói kết quả, validate theo schema rồi mới lưu. Khi chuyển OCR lên server riêng: container cô lập, giới hạn CPU/RAM/thời gian, nhận job qua queue riêng, báo kết quả bằng token riêng của từng job. |
| Dữ liệu | TLS ở mọi kết nối. Mã hóa khi lưu trữ (R2; ổ đĩa server theo nhà cung cấp). Backup: WAL-G đẩy WAL lên R2 (**PITR**, RPO ≤ 5 phút) + base backup hằng ngày + Linode Backup; thử khôi phục hằng tháng (SYS-08, ADM-20). Secrets để trong file `.env` trên server (quyền 600) và trong trình quản lý mật khẩu, không commit vào repo; AWS Secrets Manager khi lên AWS. |
| Thanh toán | Dùng cổng thanh toán, **không lưu thông tin thẻ**. Xác minh chữ ký webhook, xử lý idempotent theo mã giao dịch. |
| Pháp lý | Luật Bảo vệ dữ liệu cá nhân 2025 và văn bản hướng dẫn; nơi lưu dữ liệu theo D1. Có chức năng xuất/xóa dữ liệu (ACC-13), đồng ý cookie (SYS-13), chính sách thời hạn lưu trữ (SYS-19). **Cần tư vấn pháp lý trước khi ra mắt.** |
| Bản quyền nội dung | Mỗi câu/đề có `ContentLicense`; nội dung chưa rõ quyền **không được** đưa vào gói thương mại hay xuất bản công khai (QB-16, ADM-19, D3). |
| Quy trình | Dependabot hoặc Renovate, SAST (CodeQL) trong CI. Pentest trước khi ra mắt công khai. |

---

## 10. Yêu cầu 4 — Dễ phát triển & mở rộng

1. **`exam-engine` thuần** gồm: `computeSectionDeadline()`, `listeningPosition()` (quy giờ server ra vị trí trên timeline phần nghe), `score()`, `estimatePass()`, `validateBlueprint()`, `generateMixedExam()` (V2). Bắt buộc có unit test (SYS-16).
2. **ExamBlueprint là dữ liệu cấu hình**, lưu trong DB và admin chỉnh được (ADM-08), gồm: cấu trúc phần thi, dạng 問題, số câu, thời gian, **cách tính điểm** (thang điểm từng phần, điểm đỗ tổng, điểm liệt từng phần), theo cấp độ và thời điểm áp dụng. Số liệu lấy từ tài liệu chính thức (jlpt.jp) và **ghi nguồn cho từng blueprint; không tự suy đoán số câu hay thời gian**. Chỗ nào chưa chắc thì đánh dấu để chủ dự án xác nhận. Kết quả luôn ghi rõ là "điểm quy đổi tham khảo".
3. **Thuật toán trộn đề (V2)** tuân theo 6 quy tắc:
   1. Chỉ trộn câu cùng cấp độ (trừ khi chọn chế độ luyện liên cấp).
   2. Trộn trong cùng dạng 問題, không trộn tùy ý.
   3. Đơn vị chọn là `QuestionGroup`, nên bài đọc và audio luôn đi kèm câu hỏi của nó.
   4. Kiểm tra số câu, thời gian, thứ tự phần theo blueprint đích.
   5. Chỉ dùng câu `approved`, đủ đáp án và media.
   6. Lưu cấu hình + `seed` + `engine_version` + danh sách nhóm câu đã chọn → tái hiện chính xác được đề.

   Tỷ lệ (ví dụ 50:50) được làm tròn theo nhóm câu; nếu không đủ dữ liệu thì báo cho người dùng. Đề chỉ được gắn nhãn "mô phỏng đúng cấu trúc JLPT" khi qua `validateBlueprint()`; còn lại ghi là "đề luyện tập tùy chỉnh".
4. **Phân biệt loại nội dung bằng 2 trường khác nhau:**
   - `Question.origin`: `official_past_exam` (câu từ đề thi thật, cần license) | `self_authored` (tự biên soạn) | `ai_generated`.
   - `Exam.kind`: `original` | `practice` | `mixed` | `custom`.

   Giao diện luôn hiển thị nhãn. Câu `ai_generated` không bao giờ được trình bày như câu từng có trong đề JLPT thật.
5. **Nội dung đã xuất bản là bất biến:** mỗi lần xuất bản tạo một `ExamVersion` gồm snapshot nội dung + cấu trúc, manifest media, answer key và cấu hình chấm. Sửa câu, đáp án, media hay blueprint đều tạo phiên bản mới (QB-15). File media cũng bất biến: key theo checksum, thay file = tạo `MediaAsset` mới. Attempt tham chiếu đúng một `ExamVersion` (khóa ngoại), nên bài đang làm và kết quả cũ không bị ảnh hưởng. Nếu sửa một đáp án sai, admin có công cụ chấm lại các attempt cũ (tùy chọn).
6. **API:** REST, sinh OpenAPI từ NestJS, `packages/api-client` sinh tự động. Version nằm trong URL (`/api/v1/...`).
7. **Feature flag và quyền theo gói** (Free/Premium) tập trung ở service `entitlements`, không rải `if` khắp code.
8. **LLM** chỉ được gọi qua module `ai` với adapter `LlmProvider`: đổi nhà cung cấp không phải sửa nghiệp vụ; ghi chi phí từng lần gọi (REPORT-14), giới hạn theo gói (PAY-11), cache kết quả. Nội dung AI tạo phải qua kiểm duyệt trước khi công khai.
9. **Môi trường:** `local` (docker-compose: PostgreSQL, 2 Redis, Mailpit; lưu trữ file qua interface `ObjectStorage`, bản `LocalFsStorage` ghi vào ổ đĩa) → `production`. Chưa có staging cố định để tiết kiệm; trước bản phát hành lớn, dựng một server Linode tạm (tính theo giờ) từ image và backup mới nhất để thử, xong thì xóa.
10. **CI/CD:** lint + typecheck + unit + E2E + Lighthouse CI → build Docker → deploy bằng script (migrate DB, healthcheck, rollback bằng một lệnh) (SYS-15). Migration theo kiểu **expand → contract** (luôn tương thích ngược với phiên bản code trước), để rollback không hỏng dữ liệu và sau này deploy không downtime khi có nhiều máy.
11. **Giám sát (SYS-09):** Sentry (FE + BE), uptime monitor, cảnh báo CPU/RAM/ổ đĩa của Linode, script kiểm tra hằng ngày (ổ đĩa, độ mới của backup). Endpoint nội bộ báo số attempt đang mở, độ dài queue, lỗi audio. OpenTelemetry + dashboard khi lên nhiều máy. Cảnh báo qua email hoặc Telegram.

---

## 11. Mô hình dữ liệu cốt lõi (khung)

> Thiết kế DB **theo câu hỏi, không theo file PDF**. PDF chỉ là nguồn nhập liệu.

```
-- Nguồn & bản quyền
ExamSource          (id, name, level, year, session[7|12], publisher, license_id, original_file_key)
ContentLicense      (id, type, owner, allowed_public, allowed_commercial, expires_at, notes)

-- Cấu trúc đề (cấu hình)
ExamBlueprint       (id, level, version, effective_from, effective_to, sections JSONB, scoring JSONB, source_ref, status)

-- Ngân hàng câu hỏi
QuestionGroup       (id, source_id, level, mondai_type, instructions JSONB, passage JSONB,
                     order_in_source, review_status, version)
QuestionGroupMedia  (group_id, media_id, role[audio|image], order)
Question            (id, group_id, order_in_group, level, skill, mondai_type, stem JSONB,
                     difficulty, origin, review_status, license_id, source_page, version)
AnswerOption        (id, question_id, label, content JSONB, order)
CorrectAnswer       (question_id, option_id)      -- bảng riêng, KHÔNG BAO GIỜ đưa vào snapshot
QuestionExplanation (id, question_id, lang, content JSONB, review_status, version)      -- V2
MediaAsset          (id, kind[audio|image|pdf], storage_key, duration_ms, checksum)  -- bất biến, key theo checksum

-- Đề thi
Exam                (id, level, title, kind, blueprint_id, source_id NULL, status, current_version)
ExamSection         (id, exam_id, order, code, title, duration_sec)  -- 1 phần thi gồm nhiều kỹ năng
ExamItem            (exam_id, section_id, group_id, order)           -- đề gồm những nhóm câu nào
ExamVersion         (exam_id, version, snapshot_key, media_manifest_key, blueprint_id, blueprint_version,
                     scoring JSONB, published_at, published_by)   -- bất biến, PK (exam_id, version)
ExamAnswerKey       ((exam_id, version) → ExamVersion, keys smallint[], section_ranges JSONB)  -- chỉ server đọc
GeneratedExam       (id, user_id, config JSONB, seed, engine_version, exam_id, created_at)  -- V2

-- Làm bài
ExamAttempt         (id, user_id NULL, guest_id NULL, (exam_id, exam_version) → ExamVersion, mode[real|practice],
                     status, current_section, section_times JSONB, lease_id, result_flags[late_sync|interrupted],
                     started_at, submitted_at, result JSONB)
AttemptAnswerSheet  (attempt_id PK, answers smallint[], flags smallint[], last_seq, updated_at)  -- 1 dòng/attempt
AttemptEvent        (id, attempt_month, attempt_id, seq, type, payload JSONB, at)  -- append-only,
                     -- partition theo attempt_month; UNIQUE (attempt_month, attempt_id, seq)
UserAnswer          (attempt_id, question_id, option_id, is_correct, flagged)  -- worker tạo sau khi nộp

-- Học tập & thống kê (V2+)
Vocabulary, Kanji, GrammarPoint, QuestionTag (question_id, tag_type, tag_id)

-- Vận hành
ContentReview       (id, entity, entity_id, editor_id, reviewer_id, status, comment, at)
ImportJob           (id, files JSONB, status, errors JSONB, created_by)
Outbox              (id, topic, payload JSONB, created_at, published_at)
AuditLog            (id, actor_id, action, entity, entity_id, diff JSONB, ip, at)
User, Session, Role, UserRole, UserDevice
```

**Quy tắc:**
- **Mỗi câu thuộc đúng một `QuestionGroup`**; câu độc lập là nhóm chỉ có 1 câu. Nhóm là đơn vị nhỏ nhất khi ghép hoặc trộn đề.
- `ExamAttempt` phải có `user_id` hoặc `guest_id` (ràng buộc CHECK).
- `AttemptEvent` chia partition theo tháng bắt đầu attempt (`attempt_month`): ràng buộc unique trên bảng partition phải chứa khóa partition, và dữ liệu cũ được xóa bằng cách bỏ cả partition (SYS-19).
- `level`, `mondai_type` của `Question` được sao từ nhóm để lọc nhanh.
- **Định dạng nội dung tiếng Nhật** (`stem`, `passage`, `content`, `instructions`) là JSON có cấu trúc, định nghĩa trong `packages/schema`, gồm các loại đoạn: `text`, `ruby` (chữ + cách đọc), `underline` (từ được hỏi), `blank` (ô trống （　）), `star` (vị trí ★ trong câu sắp xếp), `br`, `image`. Ví dụ: `[{"t":"ruby","text":"漢字","rt":"かんじ"},{"t":"text","text":"を"}]`. Từ đây render ra `<ruby>`, `<u>`… và dùng luôn cho việc tách từ để thống kê.

---

## 12. Quy trình nhập PDF (pipeline)

```
[biên tập viên chạy ocr-worker (CLI) trên máy mình với PDF đề + đáp án + audio + metadata]
[ocr-worker] PDF có lớp chữ → trích trực tiếp; PDF scan → OCR
             → LLM nhận diện cấu trúc: 問題, số câu, lựa chọn, đoạn văn, ảnh, ★, furigana
             → ghép file đáp án → gắn audio → điểm tin cậy cho từng câu
             → gói kết quả: JSON (validate theo JSON Schema xuất từ packages/schema) + file media
        ▼  biên tập viên tải gói + PDF gốc lên admin → api validate lại → ImportJob(extracted), câu ở trạng thái draft
[admin: màn hình 2 cột] PDF gốc ⟷ dữ liệu trích xuất; sửa; đánh dấu câu OCR tin cậy thấp;
        kiểm tra thiếu/trùng câu, tổng số câu so với blueprint
        ▼
[reviewer, khác editor] duyệt → approved
        ▼
[publish] sinh snapshot + answer key → R2 → revalidate trang + purge cache Cloudflare
```

**Tiêu chí:**
- Giữ nguyên ký tự tiếng Nhật, dấu câu, furigana, bố cục câu sắp xếp ★ và hình ảnh.
- Nhập lại cùng một file không được tạo bản ghi trùng (dựa vào checksum).
- Ngay cả khi chưa có OCR, vẫn nhập được đề bằng file JSON đúng schema. Đường nhập này dùng để seed dữ liệu và phát triển phòng thi trước.

---

## 13. Hạ tầng

### 13.1. Phương án hiện tại: 1 server Linode, nâng/hạ gói theo mùa thi

| Thành phần | Lựa chọn |
|---|---|
| Server | Linode (Akamai) vùng Singapore, Ubuntu 24.04 LTS. **Mùa vắng:** Shared CPU 4 GB (2 vCPU, 80 GB, $24/tháng). **Mùa thi** (khoảng 1/6–15/7 và 15/10–15/12): Dedicated CPU 8 GB thế hệ G6 (4 vCPU, $72/tháng). Không dùng gói G8 (không có mức trần theo tháng, không kèm băng thông). |
| Chạy ứng dụng | Docker Compose: `web`, `admin`, `api`, `worker`, `postgres` (image riêng có WAL-G và pg_bigm), `redis-core`, `redis-cache`. Container chỉ bind `127.0.0.1`. |
| Cấu hình theo gói | 2 profile `small` (4 GB) và `large` (8 GB): giới hạn RAM từng container, cấu hình PostgreSQL, số process API. Đổi profile **trước** khi hạ gói và **sau** khi nâng gói. |
| Cổng vào | Cloudflare Tunnel (`cloudflared` chạy trên server dạng systemd). Linode Cloud Firewall chặn mọi cổng vào. SSH đi qua Tunnel + Cloudflare Access; Lish của Linode là đường dự phòng. |
| CDN, WAF, media | Cloudflare (gói Free khi beta, Pro khi ra mắt nếu ngân sách cho phép); R2 + Worker cho đề/audio/ảnh; Turnstile; Access cho admin. |
| Backup | WAL-G → R2 (PITR, `archive_timeout` 5 phút) + base backup hằng ngày + Linode Backup. Thử khôi phục hằng tháng trên một server tạm. |
| OCR | CLI chạy trên máy biên tập viên, không chạy trên server. |
| Email, lỗi, uptime | Resend, Sentry, Better Stack hoặc UptimeRobot (đều có gói miễn phí). |
| Deploy | GitHub Actions build image (linux/amd64) → GitHub Container Registry → `deploy.sh <tag>` trên server: kiểm tra không có bài thi thật đang mở → pull → migrate → up → healthcheck → tự rollback nếu lỗi. Không build image trên server. |

**Chi phí:** khoảng $29/tháng lúc vắng (server + Linode Backup), khoảng $80/tháng trong mùa thi; cả năm khoảng $450–500. Tên miền, OCR (~$1,5/1.000 trang) và LLM tính riêng.

**Quy tắc nâng/hạ gói** (quy trình đầy đủ trong `KE_HOACH_TRIEN_KHAI.md`, Phụ lục B):
- Khi nâng gói: **không tick "Auto Resize Disk"**, để ổ đĩa giữ 80 GB; nhờ vậy lúc hạ gói không phải tắt máy để thu nhỏ ổ.
- Giữ dữ liệu trên server dưới 80 GB (media nằm trên R2).
- Resize vào giờ ít người dùng, sau khi đã backup; chọn warm resize, lỗi thì chuyển sang cold resize.
- Linode tính tiền theo giờ, có mức trần theo tháng; tắt máy vẫn bị tính tiền.

**Giới hạn:** chỉ có một máy (máy hỏng là dừng dịch vụ, phải khôi phục theo runbook), mỗi lần deploy gián đoạn vài giây, phải tự vận hành hệ điều hành. Chuyển sang mục 13.2 khi một máy Dedicated 16 GB không còn đủ, hoặc khi cần độ sẵn sàng cao hơn.

**Nếu D1 bắt buộc lưu dữ liệu trong nước:** thay Linode bằng VPS/cloud đặt tại Việt Nam (Viettel, VNG, FPT…), giữ nguyên Docker Compose và Cloudflare.

### 13.2. Phương án mở rộng: AWS (chỉ khi số đo cho thấy cần)

| Mức | Hạ tầng |
|---|---|
| **Khởi đầu trên AWS** | Cloudflare gói Pro + Workers Paid + AWS `ap-southeast-1` (theo D1): ALB, **ECS Fargate** (web, admin, api, worker, ocr-worker), **RDS PostgreSQL**, **ElastiCache** 2 cụm (`core` có replica Multi-AZ; `cache` 1 node), SQS, SES, Secrets Manager. IaC bằng Terraform/CDK. Bật RDS Multi-AZ khi có doanh thu. Chi phí ước tính $550–650/tháng. |
| **Khi tải tăng tiếp** | Chỉ thêm khi số đo cho thấy cần: read replica khi truy vấn thống kê làm nặng DB chính; Meilisearch khi pg_bigm không đáp ứng tìm kiếm; `ocr-worker` chạy Fargate Spot. |
| **Quy mô lớn** (≥ 10.000 người cùng lúc, có trung tâm) | Chỉ tách module `attempt` thành service riêng **khi số liệu đo được cho thấy cần**. ECS vẫn là mặc định; chỉ chuyển sang Kubernetes khi có nhu cầu cụ thể mà ECS không đáp ứng, không phải vì số lượng service tăng. |

**Nguyên tắc:** chỉ thêm thành phần hạ tầng khi số đo (k6, giám sát production) cho thấy cần, không thêm theo giai đoạn.

**Tối ưu chi phí khi ở AWS:**
- Container và RDS dùng Graviton (ARM64), rẻ hơn khoảng 10–20% so với x86 cùng cấu hình.
- `worker` và `ocr-worker` chạy Fargate Spot (job chạy lại được).
- Dùng S3 gateway endpoint (miễn phí). Interface endpoint (ECR, Secrets Manager, SQS…) tính phí theo giờ cho từng AZ, nên chỉ bật khi phí dữ liệu đi qua NAT Gateway đã cao hơn chi phí của chúng.
- Media nằm trên R2 (không phí egress); API chỉ trả JSON nhỏ.

**Phương án thay thế khác:**
- *Serverless:* Vercel hoặc Cloud Run (Next.js, API) + Neon/Supabase (PostgreSQL; Supabase có PGroonga) + Upstash (Redis) + Cloudflare. Tự giãn theo tải nhưng chi phí khó đoán, cần thêm dịch vụ cho job nền.
- *Cloud trong nước (D1):* Viettel Cloud, VNG Cloud hoặc FPT Cloud, dùng Kubernetes managed + PostgreSQL managed (hoặc tự vận hành); SQS thay bằng một Redis riêng cho queue OCR (qua interface `JobQueue`).

---

## 14. Thứ tự triển khai

Kế hoạch chi tiết (giai đoạn, phase, task, tiêu chí nghiệm thu, quy tắc cho agent) nằm trong **`KE_HOACH_TRIEN_KHAI.md`**. Tóm tắt Giai đoạn 1 (V1):

| Phase | Nội dung |
|---|---|
| 1.0 | Chuẩn bị & kiểm chứng rủi ro (OCR với PDF thật, prototype phòng thi) |
| 1.1 | Nền tảng repo, CI, Docker |
| 1.2 | Lõi dữ liệu: schema, exam-engine, DB |
| 1.3 | Tài khoản & bảo mật nền |
| 1.4 | Ngân hàng câu hỏi, admin, xuất bản đề |
| 1.5 | Phòng thi & chấm điểm |
| 1.6 | Trang public & SEO |
| 1.7 | Nhập PDF/OCR |
| 1.8 | Server production & vận hành |
| 1.9 | Kiểm thử tổng thể & ra mắt |

**Lý do của thứ tự này:** Phase 1.0 trả lời sớm hai câu hỏi rủi ro nhất (OCR có dùng được với PDF thật không, luồng thi có chịu được sự cố không) trước khi đầu tư toàn bộ hệ thống. Sau đó, phòng thi là phần rủi ro hiệu năng lớn nhất nên làm sớm, dùng dữ liệu nhập từ file JSON. Pipeline OCR hoàn chỉnh phụ thuộc dịch vụ ngoài, nên làm sau hoặc song song để không chặn các phần khác.

**Definition of Done chung:**
- Typecheck và lint pass; logic có test.
- Không có endpoint nào thiếu kiểm tra quyền.
- Không lộ `CorrectAnswer` / answer key ra client trước khi nộp.
- Migration tương thích ngược.
- Phần liên quan đạt chỉ tiêu ở mục 2.

---

## 15. Những điều KHÔNG được làm

- ❌ Hard-code cấu trúc, số câu, thời gian hay cách tính điểm JLPT trong code, hoặc tự bịa các số liệu này.
- ❌ Đưa đáp án đúng vào snapshot, hoặc trả về client trước khi nộp (chỉ ngoại trừ câu đã trả lời trong chế độ luyện tập).
- ❌ Tin vào giờ của client để tính thời gian thi.
- ❌ Gửi request lưu cho từng lần bấm; phải gộp theo lô có `seq`.
- ❌ Báo "đã lưu" cho client trước khi dữ liệu được commit vào PostgreSQL.
- ❌ Cho hai tab/thiết bị cùng ghi vào một attempt (phải dùng lease).
- ❌ Nhúng URL media có hạn vào snapshot (snapshot chỉ chứa mã media).
- ❌ Dùng chung một Redis có eviction cho cả cache lẫn session/queue.
- ❌ Đưa dữ liệu cá nhân vào HTML trang public (vừa làm hỏng cache CDN, vừa rò rỉ dữ liệu).
- ❌ Đưa câu chưa `approved` hoặc chưa rõ bản quyền vào bộ trộn đề, gói trả phí hay trang công khai.
- ❌ Trình bày câu AI tạo như câu từng có trong đề JLPT thật.
- ❌ Gọi điểm luyện tập là "điểm JLPT chính thức".
- ❌ Sửa đè câu, đáp án, media hay blueprint đã xuất bản (phải tạo phiên bản mới).
- ❌ Đưa JS của phòng thi vào bundle trang public.
- ❌ Commit secrets; cho `ocr-worker` quyền vào PostgreSQL/Redis; mở cổng của server ra Internet hoặc để server nhận traffic không đi qua Cloudflare.
- ❌ Build image trên server production (tốn RAM/CPU, dễ làm treo máy khi đang có người thi).
- ❌ Tick "Auto Resize Disk" khi nâng gói Linode (sau đó muốn hạ gói phải tắt máy thu nhỏ ổ đĩa).
- ❌ Dựng hạ tầng `production` khi D1 chưa được xác nhận.
