# Release Checklist

## Tiêu chí trước khi phát hành
1. CI pipeline xanh hoàn toàn:
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
2. Tất cả các ứng dụng có endpoint `/healthz` hoặc `/api/v1/health` trả về HTTP 200.
3. Không chứa dịch vụ OCR / parser PDF trong mã nguồn ứng dụng (tuân thủ chỉ thị EXTERNAL_PREPARATION).
4. Các thư viện lõi (Zod, Better Auth, Drizzle, FSRS, S3 SDK, Playwright, k6) được ghim phiên bản cụ thể trong lockfile.
5. Hồ sơ commit tuân thủ Conventional Commits với body `Task: <taskId>` và `Features: ...`.
