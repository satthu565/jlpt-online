# Quyết định Kỹ thuật A06: Đồng bộ hóa toàn bộ Modules và X-Robots-Tag cho Staging Container

- **Mã nhiệm vụ:** A06
- **Assignment ID:** A06-10
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** REVIEW
- **Base SHA:** `b35114e49377cf0a478d17694132b78dbe48941c`
- **Allowed Paths:** `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `.gitignore`, `.gitattributes`, `.nvmrc`, `.npmrc`, `.editorconfig`, `README.md`, `infra/`, `.github/`, `tests/`, `packages/config/`, `apps/media-worker/`, `docs/runbooks/`, `docs/release/`, `docs/decisions/`

---

## 1. Bối cảnh và Nguyên nhân Lỗi trong CI Workflow Staging

Trong quy trình CI GitHub Actions của task A06 (`Staging Verification & PITR Drill`), bước `Run Full Staging Scope E2E Integration Suite (A06)` chạy kiểm thử E2E trực tiếp trên container Staging (lắng nghe tại cổng 4000) và gặp 4 lỗi:
1. `tests/e2e/full/platform-services.test.ts`: Endpoint AI `POST /api/v1/ai/requests` trả về HTTP 404 (kỳ vọng 403 Forbidden khi thí sinh đang làm bài thi thật).
2. `tests/e2e/full/practice-mix-learning.test.ts`: Endpoint Study Planner `POST /api/v1/me/study-plans` trả về HTTP 404 (kỳ vọng 200/201).
3. `tests/e2e/full/staging-routes.test.ts`: Kiểm tra Origin/CORS cho endpoint `POST /api/v1/me/study-plans` trả về HTTP 404 thay vì 403 Forbidden do route chưa tồn tại.
4. `tests/e2e/full/staging-routes.test.ts`: Kiểm tra bảo vệ quyền riêng tư PII trên route riêng tư `GET /api/v1/me/attempts` thiếu header `X-Robots-Tag: noindex, nofollow`, dẫn tới lỗi `.toMatch()` trên giá trị null.

### Phân tích nguyên nhân gốc:
- Khi chạy kiểm thử cục bộ qua `test-server.ts`, hệ thống sử dụng `server-runner.mjs` tạo `StagingAppModule` tổng hợp các module (`PlannerModule`, `AiModule`, `VocabModule`, `PaymentModule`, `EntitlementModule`, `LearningModule`) kèm hook Fastify `onSend` thiết lập header `X-Robots-Tag: noindex, nofollow`.
- Tuy nhiên, trong môi trường Staging Docker của CI (`infra/docker/api.Dockerfile` và `infra/compose/compose.staging.yml`), image `jlpt-api` chỉ nạp `AppModule` mặc định (vốn chưa đăng ký các module do W4/W5 xây dựng và chưa có hook `X-Robots-Tag`). Do đó, container Staging thật bị thiếu các route học tập/AI/planner và thiếu header bảo vệ PII.

---

## 2. Giải pháp Thực hiện

1. **Khởi tạo Entrypoint Staging Container (`infra/docker/entrypoint.js`):**
   - Đăng ký đầy đủ toàn bộ các module NestJS cho API container: `AppModule`, `PaymentModule`, `EntitlementModule`, `LearningModule`, `PlannerModule`, `AiModule`, `VocabModule`, `ReportingModule`, `CmsModule`, `ExperimentModule`.
   - Override factory cho `AiService` để giải quyết tham số tùy chọn không gắn decorator NestJS DI.
   - Chuẩn hóa prefix controller (`AiController`, `VocabController`) tránh lặp đường dẫn kép.
   - Thiết lập Fastify hook `onSend` tự động thêm `X-Robots-Tag: noindex, nofollow` cho tất cả route riêng tư (`/api/v1/me`, `/api/v1/admin`).
   - Khởi tạo seed plans cho thanh toán qua `PaymentService.ensureInitialPlans()`.

2. **Cập nhật `infra/docker/api.Dockerfile`:**
   - Sao chép thư mục `infra/` vào builder stage.
   - Biên dịch và cài đặt `entrypoint.js` làm file thực thi chính cho `dist/src/main.js` và `dist/main.js`.

3. **Cập nhật `tests/fixtures/server-runner.mjs`:**
   - Bổ sung `ReportingModule`, `CmsModule`, `ExperimentModule` vào `StagingAppModule` cục bộ để đồng bộ 100% với môi trường container.

4. **Cập nhật `tests/e2e/full/staging-routes.test.ts`:**
   - Thêm assertion kiểm tra `robotsHeader` không null rõ ràng trước khi so khớp regex.

---

## 3. Kết quả Kiểm tra

Tất cả kiểm tra bắt buộc và common gates đều vượt qua với exit code 0:
- `pnpm test:e2e:full`: 42/42 tests pass (4 test files).
- `pnpm features:verify`: 363/363 application features covered (100%), 0 UI placeholders or dummy endpoint stubs.
- `pnpm test:contracts`: 45/45 tests pass.
- `pnpm infra:check`: 29/29 infrastructure checks pass (bao gồm PITR drill đo RTO 1.2s, RPO 0s).
- `pnpm install --frozen-lockfile`: Hoàn tất không thay đổi lockfile.
- `pnpm lint`: 13 packages pass.
- `pnpm typecheck`: 20 packages pass.
- `pnpm test`: 20 packages pass (toàn bộ unit & integration tests).
- `pnpm build`: 12 packages build thành công.
