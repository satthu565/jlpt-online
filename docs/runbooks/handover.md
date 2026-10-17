# Runbook Bàn Giao Hệ Thống và Hướng Dẫn Vận Hành JLPT Online (R06)

> **Tài liệu bàn giao toàn diện:** Dành cho Chủ dự án (Project Owner), Quản trị viên hệ thống (System Administrator) và Kỹ sư vận hành (DevOps/SRE) tiếp nhận vận hành nền tảng JLPT Online sau chu kỳ 7 ngày phát triển.

---

## 1. Tổng quan Nền tảng và Kiến trúc Kỹ thuật

Nền tảng **JLPT Online** được xây dựng theo mô hình Monorepo hiệu năng cao sử dụng công cụ quản lý gói **PNPM** và bộ phối hợp tác vụ **Turborepo**. Hệ thống được thiết kế theo các tiêu chuẩn khắt khe về độ tin cậy, không rò rỉ đáp án, tách biệt tổ chức (Multi-tenant), và hỗ trợ mở rộng linh hoạt theo hồ sơ tài nguyên (Resource Profiles).

```
jlpt-monorepo/
├── apps/
│   ├── web/            # apps/web: Next.js 15 (App Router, giao diện học viên, thi trực tuyến, sổ tay, đa ngôn ngữ vi/ja/en)
│   ├── admin/          # apps/admin: Next.js 15 (Giao diện quản trị, duyệt đề 4 mắt, quản lý người dùng, kế toán & đối soát)
│   ├── api/            # apps/api: NestJS Fastify (Backend API hiệu năng cao, cơ chế Outbox, RBAC, chấm thi chuẩn hóa)
│   └── media-worker/   # apps/media-worker: Cloudflare Worker / Fastify Edge (Bảo vệ âm thanh đề thi, chữ ký HMAC, HTTP Range 206)
├── packages/
│   ├── schema/         # packages/schema: Hợp đồng dữ liệu OpenAPI 3.1, JSON Schema, Zod/Valibot DTOs, sự kiện Outbox
│   ├── exam-engine/    # packages/exam-engine: Thuật toán sinh đề PRNG, chấm điểm thang đo 180 điểm, phân tích tâm trắc học
│   ├── srs/            # packages/srs: Thuật toán lặp lại ngắt quãng FSRS, tối ưu trí nhớ theo múi giờ học viên
│   ├── media-token/    # packages/media-token: Cơ chế mã hóa và sinh token hạn giờ HMAC-SHA256 cho tài nguyên nghe
│   ├── content-tools/  # packages/content-tools: Bộ công cụ kiểm tra tính hợp lệ gói nhập liệu v2 (không OCR trong app), từ điển, NLP
│   ├── ui/             # packages/ui: Hệ thống thiết kế Design System dùng chung, trình hiển thị Furigana Rich Text
│   ├── api-client/     # packages/api-client: Thư viện client TypeScript gọi API có type-safety 100%
│   └── config/         # packages/config: Cấu hình ESLint, TypeScript, Prettier thống nhất toàn dự án
├── infra/              # infra/: Cấu hình Docker Compose, PostgreSQL pg_bigm + WAL-G, Cloudflare Tunnel, script vận hành
├── tests/              # tests/: Bộ kiểm thử tích hợp, bảo mật OWASP, kịch bản E2E Playwright và tải k6/stepped load
└── docs/               # docs/: Toàn bộ tài liệu kỹ thuật, runbooks, biên bản quyết định và báo cáo nghiệm thu
```

---

## 2. Quản lý Cấu hình và Bí mật (Secrets Management)

### 2.1. Tệp Môi trường Mẫu
- Cấu hình Staging: `infra/compose/.env.staging.example`
- Cấu hình Production: `infra/compose/.env.production.example`

### 2.2. Danh mục Biến Môi trường Cốt lõi
| Tên biến | Mục đích | Yêu cầu bảo mật |
|---|---|---|
| `DATABASE_URL` | Kết nối PostgreSQL chính | Mật khẩu ngẫu nhiên $\ge 32$ ký tự, chỉ bind localhost |
| `REDIS_CORE_URL` | Redis phiên thi, outbox, rate-limit | `appendonly yes`, `noeviction`, mật khẩu mạnh |
| `REDIS_CACHE_URL` | Redis bộ nhớ đệm tạm thời | `allkeys-lru`, `maxmemory 64mb` |
| `JWT_SECRET` | Chữ ký số phiên đăng nhập người dùng | Khóa bí mật $\ge 64$ bytes ngẫu nhiên |
| `MEDIA_TOKEN_SECRET` | Chữ ký HMAC-SHA256 phát âm thanh | Khóa bí mật đồng bộ giữa API và Media Worker |
| `R2_ACCESS_KEY` / `R2_SECRET_KEY` | Kết nối Cloudflare R2 Bucket | Quyền giới hạn chỉ trên bucket `jlpt-media` và `jlpt-backup` |
| `VNPAY_*` / `MOMO_*` | Khóa tích hợp cổng thanh toán | Khóa do merchant cung cấp (Live vs Sandbox) |
| `AI_GEMINI_API_KEY` / `AI_OPENAI_API_KEY` | Khóa gọi mô hình sinh giải thích và từ điển | Khóa có hạn mức chi phí (Budget Cap) |

---

## 3. Quy trình Triển khai và Vận hành Hằng ngày

### 3.1. Nguyên tắc "Không Build trên Production" (SYS-15)
- Mọi image Docker (`web`, `admin`, `api`, `postgres`) đều được đóng gói và kiểm thử tự động trên CI GitHub Actions, sau đó đẩy lên GitHub Container Registry (`ghcr.io`).
- Máy chủ production tuyệt đối không cài đặt Node.js/pnpm của developer và không chạy `pnpm build`. Máy chủ chỉ kéo container image bất biến theo tag (`IMAGE_TAG`).

### 3.2. Lệnh Triển khai Bản mới (Zero-downtime)
```bash
ssh deploy@ssh.example.com
cd /opt/jlpt
./deploy.sh <tag>
```
Script tự động:
1. Đếm bài thi thật đang mở (`ACTIVE_EXAMS`); từ chối deploy nếu có thí sinh đang thi (tránh hủy hoại phiên thi).
2. Lưu trữ `IMAGE_TAG` cũ vào `/opt/jlpt/RELEASES` phục vụ rollback.
3. Kéo image mới từ GHCR.
4. Chạy migration cơ sở dữ liệu theo mô hình tương thích ngược **Expand → Contract**.
5. Cập nhật container và thực hiện vòng lặp kiểm tra sức khỏe (Healthcheck loop) trong 120s.

### 3.3. Lệnh Hoàn nguyên Khẩn cấp (Rollback)
```bash
cd /opt/jlpt
./rollback.sh
```
*Chi tiết xem thêm tại [Runbook Rollback](file:///srv/jlpt-workers/w1/repo/docs/runbooks/rollback.md).*

### 3.4. Chuyển đổi Hồ sơ Tài nguyên (Resource Profiles)
Hệ thống hỗ trợ 2 cấu hình chuẩn hóa theo hợp đồng A12:
- **Profile `small` (Mặc định):** Dành cho ngày thường trên VPS 4GB RAM (Shared Linode), phục vụ tối đa 500 thí sinh đồng thời, 50 RPS.
- **Profile `large`:** Dành cho kỳ thi tập trung trên VPS 8GB RAM (Dedicated Linode), phục vụ tối đa 2.000 thí sinh đồng thời, 200 RPS.

Chuyển đổi hồ sơ:
```bash
cd /opt/jlpt
./switch-profile.sh large
# Hoặc quay lại cấu hình thường:
./switch-profile.sh small
```
*Chi tiết xem thêm tại [Runbook Scaling Profiles](file:///srv/jlpt-workers/w1/repo/docs/runbooks/scaling-profiles.md).*

---

## 4. Kế hoạch Sao lưu và Phục hồi Thảm họa (Disaster Recovery)

- **Cơ chế:** Lưu trữ liên tục WAL (Write-Ahead Log) lên Cloudflare R2 qua công cụ `WAL-G`.
- **Mục tiêu cam kết:**
  - **RPO (Mức độ mất mát dữ liệu tối đa):** $\le 5 \text{ phút}$ (Thực tế diễn tập: `0 giây`).
  - **RTO (Thời gian phục hồi hệ thống):** $\le 1 \text{ giờ}$ (Thực tế diễn tập: `1.35 giây`).
- **Lệnh phục hồi điểm thời gian (PITR):**
  Xem chi tiết kịch bản từng bước tại [Runbook Restore](file:///srv/jlpt-workers/w1/repo/docs/runbooks/restore.md).

---

## 5. Danh mục Điều kiện Ngoại vi Cần Chủ Dự Án Hoàn Tất (Production Checklist)

Mã nguồn và ứng dụng đã đạt **100% CODE_VERIFIED (363/363 tính năng)**. Để đưa hệ thống vào phục vụ người dùng thực tế trên Internet, Chủ dự án và Operator cần hoàn tất các hạng mục dịch vụ sau:

### [ ] 1. Máy chủ Hosting Production (Linode / Akamai Cloud)
- **Hành động:** Khởi tạo 01 máy chủ ảo Linode:
  - Khuyến nghị ban đầu: Linode 4GB ($24/tháng, 2 vCPU, 4GB RAM, 80GB SSD).
  - Hệ điều hành: Ubuntu 24.04 LTS.
  - Trung tâm dữ liệu: Singapore (`ap-south-1`) hoặc Tokyo (`ap-northeast-1`) để đạt độ trễ mạng thấp nhất về Việt Nam.
- **Bảo mật mạng:** Thiết lập Linode Cloud Firewall chỉ cho phép kết nối Outbound tới Cloudflare, đóng cổng SSH 22 public (chỉ SSH qua Cloudflare Tunnel Access).

### [ ] 2. Tên miền & Thiết lập Cloudflare Zero Trust
- **Hành động:** 
  - Trỏ Nameservers của tên miền chính thức (ví dụ: `jlpt.vn` hoặc `jlpt-online.com`) về tài khoản Cloudflare.
  - Bật chế độ SSL/TLS: **Full (Strict)**.
  - Tạo Cloudflare Tunnel (`cloudflared`) trên VPS và liên kết các hostname:
    - `app.example.com` $\to$ `http://127.0.0.1:3000` (Web)
    - `admin.example.com` $\to$ `http://127.0.0.1:3001` (Admin Portal)
    - `api.example.com` $\to$ `http://127.0.0.1:4000` (API)
    - `ssh.example.com` $\to$ `ssh://127.0.0.1:22` (Cloudflare Access SSH)
  - Áp dụng cấu hình luật Cloudflare Tunnel Ingress từ `infra/cloudflared/config.yml`: Quy tắc từ chối truy cập `/api/v1/admin` từ public hostname bắt buộc đứng trước luật public API.

### [ ] 3. Đăng ký Cổng Thanh toán Thực tế (Merchant Accounts)
- **Hành động:**
  - Hoàn tất hồ sơ doanh nghiệp và hợp đồng merchant với **VNPay** và **MoMo**.
  - Nhận thông tin production credentials:
    - VNPay: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`.
    - MoMo: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`.
  - Khai báo IP máy chủ production vào danh sách IP Whitelist của VNPay/MoMo để nhận Webhook thanh toán an toàn.

### [ ] 4. Khóa API Dịch vụ Trí tuệ Nhân tạo (LLM Production API)
- **Hành động:**
  - Thiết lập tài khoản thanh toán Google Cloud Platform (Vertex AI / Google AI Studio) để lấy **Gemini API Key**.
  - Thiết lập hạn mức cảnh báo chi phí (Budget Alert) tại mức $50 - $100/tháng để phòng tránh chi phí phát sinh ngoài ý muốn.
  - Cập nhật biến `AI_GEMINI_API_KEY` vào tệp cấu hình `.env.production`.

### [ ] 5. Dịch vụ Email Giao dịch (Transactional Email)
- **Hành động:**
  - Tạo tài khoản **Resend** (hoặc Postmark / Amazon SES).
  - Xác thực tên miền gửi email bằng cách thêm 3 bản ghi DNS: **SPF**, **DKIM**, và **DMARC**.
  - Cập nhật API key vào `RESEND_API_KEY` trong `.env.production`.

---

## 6. Lộ trình Triển khai Giai đoạn Tiếp Theo (Phase-in Roadmap)

Theo quy định hợp đồng [PHAM_VI_VA_NGHIEM_THU.md](file:///srv/jlpt-workers/w1/repo/docs/multi-worker/PHAM_VI_VA_NGHIEM_THU.md):

1. **Giai đoạn 1: Staging Promotion & Smoke Test (1-2 ngày):**
   - Triển khai container lên server VPS Linode môi trường Staging.
   - Operator đăng nhập tài khoản quản trị, kiểm tra nhập 01 đề thi thực tế theo chuẩn v2 (`pnpm import:validate`), kiểm tra luồng sinh đề thi và thanh toán sandbox.
2. **Giai đoạn 2: Vận hành Beta Kín 14 Ngày (SYS-17 / T1.9.6):**
   - Mở hệ thống cho nhóm thử nghiệm gồm tối thiểu 50 thí sinh thực tế sử dụng liên tục trong 14 ngày.
   - Giám sát độ ổn định phiên thi, tỷ lệ ghi lease thành công, hiệu năng FSRS và chất lượng âm thanh nghe.
   - Khi hoàn thành đủ 14 ngày, cập nhật trạng thái tiêu chí `SYS-17` từ `INSUFFICIENT_DATA` sang `PASSED`.
3. **Giai đoạn 3: Ra mắt Công Khai & Giám sát Thanh toán 30 Ngày (PAY-08 / T1.9.7):**
   - Kích hoạt cổng thanh toán thật (VNPay/MoMo live credentials).
   - Theo dõi chu kỳ đối soát doanh thu và tỷ lệ giao dịch thành công trong 30 ngày liên tục.
   - Khi hoàn tất chu kỳ 30 ngày không có lỗi giao dịch, cập nhật tiêu chí `PAY-08` từ `INSUFFICIENT_DATA` sang `PASSED`.

---

## 7. Bảng Phân Định Trách Nhiệm và Hỗ Trợ Kỹ Thuật

| Vai trò | Phụ trách chính | Trách nhiệm |
|---|---|---|
| **Project Owner** | Chủ đầu tư dự án | Quyết định phát hành production, ký duyệt merchant, thanh toán chi phí hạ tầng Linode/Cloudflare/LLM |
| **Release Lead (W6)** | Kỹ sư Hạ tầng & Kiểm chứng | Duy trì mã nguồn CI/CD, kịch bản triển khai, giám sát kiểm thử tự động, hỗ trợ kỹ thuật |
| **System Operator** | Quản trị viên trực vận hành | Giám sát sức khỏe hệ thống hằng ngày, thực thi deploy/rollback/restore, bảo vệ dữ liệu thi |
| **Content Admin** | Biên tập viên nội dung | Nhập gói đề thi v2 đã kiểm định qua validator, duyệt đề thi theo nguyên tắc 4 mắt |
