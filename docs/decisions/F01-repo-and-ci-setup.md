# Quyết định kỹ thuật F01: Khởi tạo Repo, Monorepo và CI Pipeline

- Task: F01
- Worker: W6 (Hạ tầng CI và kiểm chứng)
- Trạng thái: Đã thực hiện

## Bối cảnh và yêu cầu
Theo kế hoạch triển khai và chỉ thị của chủ dự án:
1. Thiết lập monorepo bằng pnpm workspaces và Turborepo v2.
2. Không xây dựng `apps/ocr-worker` hoặc tích hợp dịch vụ đọc PDF trong ứng dụng (thuộc EXTERNAL_PREPARATION theo chỉ thị mới).
3. Đảm bảo mọi app (`web`, `admin`, `api`, `media-worker`) đều có health endpoint và ít nhất 1 bài kiểm tra smoke test.
4. Cài đặt sẵn và ghim phiên bản các thư viện lõi đã biết để giảm số lần thay đổi lockfile trong các task sau:
   - Zod (`zod@4.6.7`)
   - Better Auth (`better-auth@1.7.9`)
   - Drizzle ORM & Kit (`drizzle-orm@0.45.4`, `drizzle-kit@0.31.11`, `postgres@3.4.9`)
   - FSRS (`ts-fsrs@5.4.2`)
   - S3 SDK (`@aws-sdk/client-s3@3.1152.0`, `@aws-sdk/s3-request-presigner@3.1152.0`)
   - Playwright (`@playwright/test@1.64.1`)
   - k6 (`@types/k6@2.3.0` và k6 scenario script trong `tests/load/`)
5. Đáp ứng các cổng kiểm tra bắt buộc:
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`

## Quyết định kỹ thuật
1. **Cấu trúc Monorepo:**
   - Quản lý qua `pnpm-workspace.yaml` gồm `apps/*`, `packages/*`, và `tests`.
   - Điều phối tác vụ bằng `turbo.json` chuẩn hóa các luồng build, lint, typecheck, test theo thứ tự phụ thuộc (`^build`).

2. **Packages nền tảng:**
   - `@jlpt/config`: Cung cấp `tsconfig.base.json` (`strict: true`, `noUncheckedIndexedAccess: true`), ESLint flat config, Prettier config và Tailwind preset.
   - `@jlpt/schema`: Schema Zod cho các kiểu dữ liệu và enum cốt lõi (Level, ExamKind, QuestionOrigin, ReviewStatus, RichText).
   - `@jlpt/exam-engine`: Logic chấm điểm và thời gian thi thuần (pure functions), không phụ thuộc framework UI hay DB.
   - `@jlpt/media-token`: Ký và xác thực media token bằng WebCrypto API chuẩn, chạy được cả trên Node.js và Cloudflare Workers.
   - `@jlpt/srs`: Adapter cho thuật toán FSRS sử dụng thư viện `ts-fsrs`.
   - `@jlpt/api-client`: Client gọi API có kiểu dữ liệu mạnh.
   - `@jlpt/content-tools`: Công cụ chuẩn hóa tiếng Nhật (NFC) và xác thực gói đề thi nhập.
   - `@jlpt/ui`: Bộ linh kiện giao diện dùng chung (như RichTextView).

3. **Apps:**
   - `apps/web`: Next.js App Router (port 3000), có route `/healthz` trả về HTTP 200 `{ status: "ok" }`.
   - `apps/admin`: Next.js App Router (port 3001), có route `/healthz` trả về HTTP 200 `{ status: "ok" }`.
   - `apps/api`: NestJS với Fastify adapter (port 4000), tiền tố toàn cục `/api/v1`, có endpoint `/api/v1/health` trả về `{"status":"ok"}`.
   - `apps/media-worker`: Cloudflare Worker, có route `/healthz` trả về HTTP 200 `{ status: "ok" }`.

4. **CI Pipeline:**
   - Workflow `.github/workflows/ci.yml` chạy trên Node.js 24 và pnpm 12.11.2, thực thi tuần tự frozen install, lint, typecheck, unit tests và build, không chứa bất kỳ bước phụ thuộc nào vào OCR / PDF parser.
