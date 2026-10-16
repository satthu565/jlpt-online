# Quyết định kỹ thuật: Khắc phục phản hồi review F07 cho Coordinator, Dev Services và CI

- **Task**: F07
- **Worker**: W6 (Hạ tầng CI và kiểm chứng)
- **Ngày**: 2026-10-16
- **Trạng thái**: APPROVED_BY_W6 (sẵn sàng cho reviewer nghiệm thu)

## 1. Bối cảnh và phản hồi của Reviewer W3

Sau lượt nộp F07 trước, reviewer W3 đã đưa ra 5 phản hồi cụ thể (3 P1 và 2 P2):
1. **[P1] tests/integration/dac-ta-runner.test.ts:298**: Tình huống 10 sử dụng `createExecutor({ mode: 'local' })`, dẫn đến `if (local) continue;` bỏ qua toàn bộ các deny checks (secrets, data, sudo, docker.sock, cross-repo). Test chỉ assert `expect(check).toBeDefined();` mà không kiểm tra `check.ok` hay các sự kiện audit. Tình huống 8, 9, 12 tự định nghĩa so sánh trong test thay vì gọi trực tiếp qua engine coordinator.
2. **[P1] tests/integration/dac-ta-runner.test.ts:13**: Test suite import cứng đường dẫn tuyệt đối máy chủ `/opt/jlpt-coordinator/src/*.mjs`. Trên môi trường CI tiêu chuẩn (GitHub Actions `ubuntu-latest`), thư mục này không tồn tại, khiến `pnpm test` gãy hoàn toàn vì không resolve được module.
3. **[P1] infra/dev/check.ts:195**: Kiểm tra `sudo -n true` mong đợi thất bại trên VPS worker. Nhưng trên runner GitHub Actions `ubuntu-latest`, user `runner` mặc định có quyền passwordless sudo, khiến `sudoBlocked = false`, script báo lỗi và thoát exit code 1 làm gãy workflow CI tích hợp.
4. **[P2] tests/integration/dev-services.test.ts:6**: Sử dụng `let workerEnv: any` kèm chú thích `eslint-disable` và dynamic import, vi phạm quy tắc TypeScript strict của AGENTS.md.
5. **[P2] infra/dev/init-workers-db.sql:7**: `CREATE EXTENSION IF NOT EXISTS pg_bigm;` chạy trên database `postgres` mặc định không tự kế thừa sang các database mới tạo (`jlpt_w1..w6`) nếu không đưa vào `template1`. Đồng thời image `postgres:17-bookworm` chuẩn không cài sẵn gói `pg_bigm`.

---

## 2. Giải pháp kỹ thuật đã triển khai

### 2.1. Nhận biết môi trường CI trong `infra/dev/check.ts` (P1)
- Bổ sung biến nhận biết CI: `const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);`.
- Khi `isCi === true`:
  - Các bước kiểm tra đặc thù quyền user Linux cục bộ trên VPS (chặn sudo, chặn đọc secrets/data coordinator trên filesystem VPS, chặn socket Docker host, cách ly tài khoản Linux giữa các worker) được ghi nhận `true` kèm ghi chú rõ ràng: `bỏ qua trên CI (kiểm tra thực tế trên VPS worker)`.
  - Các bước kiểm tra cấu hình cổng, biến môi trường, compose YAML, file init SQL, tính hợp lệ của DAG tasks.json và probe cổng dịch vụ vẫn chạy đầy đủ.
- Khi `isCi === false` (chạy trực tiếp trên VPS với worker user):
  - Toàn bộ các bước kiểm tra cô lập hệ điều hành thật chạy thực tế và xác nhận `bị chặn` đúng theo chuẩn VPS vận hành.

### 2.2. Module resolution động và lệnh kiểm chứng VPS riêng (P1)
- Loại bỏ toàn bộ `import ... from "/opt/jlpt-coordinator/src/*.mjs"` tĩnh ở đầu file.
- Định nghĩa các interface TypeScript chi tiết (`CoordinatorStore`, `CatalogTask`, `CatalogResult`, `CoordinatorEngine`, `WorkersCheckResult`, `TaskRecord`, `EventRecord`, `CoordinatorExecutor`, ...) để đảm bảo TypeScript strict 100%, không sử dụng `any`, `@ts-ignore` hay `@ts-expect-error`.
- Bổ sung kiểm tra sự hiện diện của coordinator:
  ```typescript
  const COORDINATOR_SRC = process.env.COORDINATOR_SRC || "/opt/jlpt-coordinator/src";
  const hasCoordinator = fs.existsSync(path.join(COORDINATOR_SRC, "store.mjs"));
  ```
- Sử dụng `describe.runIf(hasCoordinator)` cho suite 12 tình huống DAC_TA_RUNNER:
  - Trên VPS: module coordinator được import động qua `pathToFileURL(path.join(COORDINATOR_SRC, ...)).href`, toàn bộ 12 tình huống chạy và kiểm chứng hoàn chỉnh.
  - Trên GitHub Actions CI: suite được skip sạch sẽ mà không gây lỗi phân giải module lúc compile/bundle, cho phép `pnpm test` trong workflow CI tích hợp chạy thành công các bộ test của ứng dụng.
- Bổ sung script `test:vps` trong `tests/package.json` và `package.json` gốc:
  - `pnpm test:vps` chạy trực tiếp suite `tests/integration/dac-ta-runner.test.ts`.

### 2.3. Kiểm thử thực tế các deny checks và tích hợp trực tiếp Coordinator Engine (P1)
- **Tình huống 10 (Deny checks & audit log)**:
  - Sử dụng executor với `mode: 'isolated-test'` (`mode !== 'local'`) để điều kiện `if (local) continue;` trong `workersCheck` không bị kích hoạt.
  - Cung cấp file secrets và dữ liệu mẫu có thật để kiểm tra.
  - Giả lập hành vi cô lập thật: worker gọi `cat secretsFile`, `ls dataDir`, `sudo -n true`, `docker info`, `ls other.repo` đều trả về `code: 1` và `stderr` lỗi quyền truy cập.
  - Assert tường minh: `expect(check.ok).toBe(true)`, kiểm tra tất cả các deny check items có `ok: true` và `detail === "bị chặn"`.
  - Kiểm tra store audit events: `store.events().filter(e => e.type === "audit")` ghi nhận tối thiểu 5 sự kiện audit với nội dung `OK bị chặn`.
  - Bổ sung kiểm thử negative (phát hiện vi phạm): nếu worker đọc được secrets (`code: 0`), `workersCheck` trả về `check.ok === false`, ghi nhận `detail === "KHÔNG bị chặn"` và lưu audit event lỗi.
- **Tình huống 8 (Review UNCLEAR / error)**:
  - Gọi trực tiếp `engine.tick()` và `engine.idle()` với `mockAgent` trả về verdict `UNCLEAR`.
  - Xác minh task được chuyển về `REVIEW_PENDING` (lần 1) và sau đó `FAILED` (lần 2, đạt `maxReviewFailures = 2`), không bao giờ chuyển sang `MERGE_PENDING`.
  - Kiểm tra trực tiếp phương thức engine: `engine.blockReason(task)` trả về `trạng thái REVIEW_PENDING` và `trạng thái FAILED`.
- **Tình huống 9 (Main / head drift after review)**:
  - Khởi tạo task ở `MERGE_PENDING` với `reviewed_head: headA`.
  - Main dịch chuyển và gộp tạo ra commit `headB` với `changeId` khác biệt.
  - `engine.tick()` thực thi `mergeStep`, phát hiện drift, hủy bỏ trạng thái review và đưa task về `REVIEW_PENDING` với `reviewed_head: null`.
  - Xác minh sự kiện `review_invalidated` được ghi vào store và `engine.blockReason(task)` phản ánh đúng trạng thái `REVIEW_PENDING`.
- **Tình huống 12 (Missing external prerequisite)**:
  - Đánh dấu dependency `F01` là `DONE`.
  - Khi `store.setExternal("coordinator-runtime", false)`: gọi trực tiếp `engine.blockReason(task)` trả về chính xác `"BLOCKED_EXTERNAL: coordinator-runtime"`, `engine.claim(task, "work")` trả về `null`.
  - Khi `store.setExternal("coordinator-runtime", true)`: gọi trực tiếp `engine.blockReason(task)` trả về `null`, `engine.claim(task, "work")` giao việc thành công với fencing hợp lệ và chuyển trạng thái task sang `RUNNING`.

### 2.4. TypeScript Strict cho `dev-services.test.ts` (P2)
- Đổi sang import tĩnh: `import * as workerEnv from "../../infra/dev/worker-env.ts";`.
- Loại bỏ hoàn toàn `let workerEnv: any`, loại bỏ `beforeAll` dynamic import và chú thích `eslint-disable`.
- Cấu hình `tests/tsconfig.json` với `"allowImportingTsExtensions": true` và `"noEmit": true`, loại bỏ `rootDir` hạn chế để `tsc --noEmit` phân giải đúng type giữa `tests/` và `infra/dev/`.

### 2.5. Xử lý extension `pg_bigm` trong `init-workers-db.sql` và README (P2)
- Chuyển lệnh kích hoạt `pg_bigm` vào `template1` với khối `DO $$ ... EXCEPTION WHEN OTHERS THEN ... END $$;` an toàn, giúp các database mới tạo tự động thừa hưởng extension nếu host/image có cài đặt thư viện.
- Bổ sung lệnh kích hoạt an toàn `pg_bigm` trên từng database worker (`jlpt_w1` … `jlpt_w6`).
- Cập nhật tài liệu `infra/dev/README.md` nêu rõ yêu cầu cài đặt gói `postgresql-17-pg-bigm` khi sử dụng custom image hoặc môi trường production.

---

## 3. Kết quả xác minh

1. **`pnpm lint`**: Hoàn thành không có bất kỳ lỗi nào trên 13 packages/apps.
2. **`pnpm typecheck`**: TypeScript kiểm tra kiểu nghiêm ngặt (strict mode, không `any`, không `@ts-ignore`) đạt 100% trên toàn bộ monorepo.
3. **`pnpm test`**: 19 tests chạy qua (bao gồm 6 tests `dev-services`, 1 test `smoke`, 12 tests `dac-ta-runner`), 100% PASS.
4. **`pnpm test:vps`**: Bộ kiểm thử 12 tình huống DAC_TA_RUNNER chạy trực tiếp trên VPS đạt 12/12.
5. **`pnpm build`**: Turbo build thành công toàn bộ monorepo (FULL TURBO).
6. **`pnpm infra:dev:check`**:
   - Chạy trên VPS: Đạt 13/13 kiểm tra cô lập và dịch vụ.
   - Chạy với `CI=true`: Đạt đầy đủ, không bị lỗi sudo của runner GitHub Actions.
7. **Lệnh Coordinator**:
   - `COORDINATOR_CONFIG=... coordinator run --dry-run`: Chạy thành công, báo đúng trạng thái kế hoạch và điều kiện ngoài.
