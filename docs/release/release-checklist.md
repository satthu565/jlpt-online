# Release Checklist

## Tiêu chí trước khi phát hành
1. CI pipeline xanh hoàn toàn:
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm test:media-edge` (Kiểm thử Edge Worker: Range 206, signed token trước cache)
   - `pnpm infra:check` (Kiểm thử toàn bộ cấu hình hạ tầng, profiles small/large, PITR drill)
   - `pnpm build`
2. Tất cả các ứng dụng có endpoint `/healthz` hoặc `/api/v1/health` trả về HTTP 200.
3. Không chứa dịch vụ OCR / parser PDF trong mã nguồn ứng dụng (tuân thủ chỉ thị EXTERNAL_PREPARATION).
4. Các thư viện lõi (Zod, Better Auth, Drizzle, FSRS, S3 SDK, Playwright, k6) được ghim phiên bản cụ thể trong lockfile.
5. Hồ sơ commit tuân thủ Conventional Commits với body `Task: <taskId>` và `Features: ...`.
6. Hình ảnh container sản xuất được build một lần trên CI (GHCR), tuyệt đối không build trên server production.
7. Đã hoàn thành diễn tập khôi phục PITR trên staging tạm với RTO ≤ 1 giờ và RPO ≤ 5 phút ghi nhận trong log CI.
8. Môi trường staging độc lập hoàn toàn với dữ liệu của các worker.
