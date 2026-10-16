# Quyết định kỹ thuật: Giải quyết xung đột merge origin/main vào task/F07

- **Task**: F07
- **Worker**: W6 (Hạ tầng CI và kiểm chứng)
- **Ngày**: 2026-10-16
- **Trạng thái**: REVIEW

## 1. Bối cảnh xung đột

Khi tích hợp các task trước đó (F02 và F06) vào `origin/main` (các commit `693dbb0`, `52f458c`, `8dd3b07`), nhánh `task/F07` phát sinh xung đột trong file `package.json`:
- Nhánh `task/F07` (W6) bổ sung các script hạ tầng dev và kiểm chứng VPS:
  - `"infra:dev:check": "node --no-warnings --experimental-strip-types infra/dev/check.ts"`
  - `"test:vps": "pnpm --filter @jlpt/tests test:vps"`
- Nhánh `origin/main` (F02 & F06) bổ sung các script kiểm tra hợp đồng và import:
  - `"test:import-contracts": "vitest run packages/content-tools/tests/import-contracts.test.ts"`
  - `"import:validate": "node tools/import-data/bin/validate.js"`
  - `"contracts:check": "pnpm --filter @jlpt/schema build && node -e \"import('./packages/schema/dist/index.js').then(m => m.runCheck(process.cwd()))\""`
  - `"contracts:generate": "pnpm --filter @jlpt/schema build && node -e \"import('./packages/schema/dist/index.js').then(m => m.runGenerate(process.cwd()))\" && pnpm --filter @jlpt/api-client build"`
  - `"test:contracts": "vitest run packages/schema/tests packages/api-client/tests"`

## 2. Giải pháp thực hiện

1. **Hợp nhất `package.json`**:
   - Giữ nguyên toàn bộ script từ cả hai nhánh, sắp xếp mạch lạc:
     - Nhóm hợp đồng: `contracts:check`, `contracts:generate`, `test:contracts`
     - Nhóm import: `test:import-contracts`, `import:validate`
     - Nhóm hạ tầng/VPS: `infra:dev:check`, `test:vps`
2. **Cập nhật và xác minh dependencies**:
   - Chạy `pnpm install` kiểm tra tính toàn vẹn của lockfile `pnpm-lock.yaml` và workspace.
3. **Chạy toàn bộ cổng kiểm tra chất lượng**:
   - `pnpm lint`: Đạt 13/13 packages, 0 lỗi.
   - `pnpm typecheck`: Đạt 17/17 tasks, 0 lỗi.
   - `pnpm test`: Đạt 17/17 package suites (19 tests trong `@jlpt/tests`, gồm 12 kịch bản DAC_TA_RUNNER, 6 dev-services, 1 smoke test).
   - `pnpm build`: Turbo build thành công toàn bộ ứng dụng và packages (FULL TURBO).
   - `pnpm contracts:check`: Đạt 100% hợp đồng (OpenAPI, client generator, events schema, fixtures).
   - `pnpm test:contracts` & `pnpm test:import-contracts`: Đạt 100% tests.
   - `pnpm infra:dev:check`: Đạt 13/13 tiêu chí kiểm tra hạ tầng và cách ly worker.
   - `pnpm test:vps`: Đạt 12/12 tình huống kiểm thử runtime bắt buộc theo DAC_TA_RUNNER.md.
   - Coordinator CLI: `COORDINATOR_CONFIG=/tmp/coord-test/coordinator.json coordinator plan validate` đạt 45 task, 6 worker; `coordinator run --dry-run` chạy thành công.
