# Quyết định Kỹ thuật N06: Tích hợp Toàn diện Vertical Slice, Ma trận Kiểm thử Bảo mật và Đo lường Tải Baseline

- **Mã nhiệm vụ:** N06
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày quyết định:** 2026-10-16
- **Tính năng liên quan:** Toàn bộ phạm vi tích hợp: SYS-01..15, C01..06, N01..05, B01
- **Hợp đồng liên quan:** Contract API, Contract A11 (mediaToken), A12 (Docker Compose profiles), [CHUAN_DU_LIEU_NHAP.md](../multi-worker/CHUAN_DU_LIEU_NHAP.md)

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ N06

Nhiệm vụ N06 thực hiện kiểm chứng tích hợp end-to-end trên vertical slice hoàn chỉnh của sản phẩm JLPT Online:
1. **Vertical slice gói demo:** Chạy trọn vẹn luồng dữ liệu của gói demo `docs/multi-worker/demo-data/demo-n5-1.zip` qua 5 giai đoạn: `validate -> review -> publish -> thi -> review`.
2. **Ma trận an ninh tiêu cực (Cross-tenant / IDOR / RBAC / Lease hijacking):** Chứng minh hệ thống không rò rỉ dữ liệu giữa các tổ chức (tenants), ngăn chặn triệt để lỗ hổng IDOR giữa các thí sinh, thực thi nguyên tắc phân quyền RBAC và nguyên tắc 4-Eyes (editor != reviewer), loại bỏ khả năng đánh cắp phiên thi (lease tampering) và bảo đảm zero answer leak.
3. **Đo lường tải cơ sở thực tế (Load Baseline):** Thực hiện đo lường tải thực nghiệm trên các endpoint cốt lõi và lưu trữ kết quả thực tế tại `docs/release/load-baseline-metrics.json`; tuyệt đối không suy diễn khả năng chịu tải khi chưa đo đạc.
4. **Tích hợp CI Staging:** Cập nhật quy trình kiểm chứng staging trong GitHub Actions (`.github/workflows/staging.yml`) và đảm bảo khả năng chạy độc lập trên runner kiểm thử CI.

---

## 2. Các Quyết định Kỹ thuật Chi tiết

### 2.1. Vertical Slice Gói Demo Tự soạn (`docs/multi-worker/demo-data`)
Gói demo N5 tự soạn (`demo-n5-1.zip`) gồm 29 câu hỏi theo chuẩn định dạng import v2, kèm 7 file audio và lời giải thích tiếng Việt. Luồng vertical slice được triển khai và kiểm chứng qua `tests/e2e/core.test.ts`:
1. **Validate Phase:**
   - Kiểm tra từ chối các file ZIP hỏng hoặc định dạng PDF trực tiếp với HTTP 400 Bad Request.
   - Nạp thành công gói demo v2, bóc tách an toàn trong bộ nhớ (chống Zip-Slip / Zip-Bomb), xác thực blueprint định nghĩa và tính toàn vẹn chữ ký dữ liệu.
   - Cấu hình Fastify Adapter với `bodyLimit: 50MB` để tiếp nhận các gói đề thi dung lượng lớn kèm media.
2. **Review Phase (Nguyên tắc 4-Eyes):**
   - Tài khoản Editor (`editor@jlpt.local`) tự gửi quyết định phê duyệt câu hỏi do chính mình soạn thảo bị từ chối nghiêm ngặt với HTTP 403 Forbidden.
   - Quyền duyệt chỉ được chấp thuận khi tài khoản Reviewer độc lập (`reviewer@jlpt.local`) thẩm định và phê duyệt.
3. **Publish Phase (Bất biến & Zero Answer Leakage):**
   - Chỉ tài khoản Quản trị viên (Admin) mới có quyền xuất bản phiên bản đề thi.
   - Trước khi xuất bản, quy trình duyệt nội dung yêu cầu Reviewer thực hiện quyết định phê duyệt chính thức bằng lệnh HTTP POST tới `/api/v1/admin/reviews/exam_version/:id/v1/decision` và kiểm tra trạng thái phê duyệt `approved` thành công, bảo đảm nguyên tắc 4-Eyes (người nạp đề editor != người duyệt reviewer).
   - Bản snapshot đề thi công khai phục vụ phòng thi được kiểm tra qua hàm kiểm toán `assertNoAnswerLeak()`, đảm bảo không lộ bất kỳ trường đáp án (`keys`, `correctOption`, `solution`) trước khi nộp bài.
4. **Thi Phase (Attempt Lifecycle & Monotonic Sequence):**
   - Tài khoản học viên chưa kích hoạt email bị từ chối làm bài thi thật (`EMAIL_NOT_VERIFIED`).
   - Thí sinh được cấp phát phiên thi duy nhất cùng mã `leaseId` bảo mật.
   - Không cho phép mở nhiều bài thi đồng thời trên cùng một đề (`ATTEMPT_ALREADY_OPEN`).
   - Di chuyển qua các phần thi theo thứ tự blueprint với hạn chót server tính toán (`currentDeadline`).
   - Lưu trữ phiếu làm bài an toàn với số thứ tự đơn điệu `seq`: máy chủ chỉ xác nhận ACK (`lastSeq`) sau khi cam kết giao dịch cơ sở dữ liệu thành công.
   - Nộp bài thi nguyên tử giao dịch, tính điểm chuẩn xác theo blueprint và bảo đảm tính idempotent đối với các lượt nộp bài trùng lặp.
   - Sau khi nộp bài, mọi nỗ lực cập nhật phiếu làm bài đều bị từ chối với HTTP 409 `ATTEMPT_CLOSED`.
5. **Review Phase (Xem lại kết quả & Lời giải):**
   - Sau khi nộp bài, thí sinh được xem lại điểm thi, danh sách câu trả lời đúng/sai và tra cứu lời giải thích chi tiết tiếng Việt.
   - Ngăn chặn triệt để việc truy cập bài thi của thí sinh khác (IDOR).

---

### 2.2. Ma trận An ninh Tiêu cực (Negative Matrix)
Triển khai trong bộ kiểm thử chuyên dụng `tests/integration/security-matrix.test.ts`:
1. **Cách ly Đa tổ chức (Cross-Tenant):**
   - `TenantGuard` kiểm tra tiêu đề `x-organization-id`. Nếu thí sinh thuộc tenant A gửi tiêu đề của tenant B, hệ thống trả về HTTP 403 `TENANT_FORBIDDEN` hoặc 404.
2. **Ngăn chặn IDOR (Insecure Direct Object References):**
   - Thí sinh B truy cập bài thi của Thí sinh A qua các endpoint:
     - `GET /api/v1/attempts/:id` -> 404 Not Found.
     - `PUT /api/v1/attempts/:id/sheet` -> 404 Not Found.
     - `POST /api/v1/attempts/:id/sections/next` -> 404 Not Found.
     - `POST /api/v1/attempts/:id/submit` -> 404 Not Found.
     - `POST /api/v1/attempts/:id/resume` -> 404 Not Found.
     - `GET /api/v1/attempts/:id/review` -> 404 Not Found.
     - `GET /api/v1/attempts/:id/explanations/:index` -> 403 Forbidden.
   - Trả về 404 thay vì 403 cho các truy vấn attempt nhằm ngăn ngừa kỹ thuật dò quét ID (resource enumeration attack).
3. **Phân quyền vai trò (RBAC):**
   - Học sinh (Student) bị từ chối 403 khi gọi các API quản trị (`/admin/imports`, `/admin/exams/:id/publish`, `/admin/explanations`).
   - Biên tập viên (Editor) bị từ chối 403 khi cố xuất bản đề thi (chỉ Admin).
4. **Bảo vệ Tính toàn vẹn Phiên thi và Lease:**
   - Mọi thao tác gửi kèm token `lease` giả mạo đều bị từ chối ngay lập tức với HTTP 409 `LEASE_INVALID`.
   - Ngăn chặn nộp bài khi chưa gửi dữ liệu hợp lệ.

---

### 2.3. Đo lường Thực tế Tải Baseline
- Xây dựng công cụ đo đạc thực tế không phụ thuộc binary ngoài: `tests/load/baseline-runner.ts`.
- Thực hiện tải 250 requests với 10 worker đồng thời trên 3 endpoint đại diện:
  - `GET /api/v1/health` (100 requests)
  - `GET /api/v1/exams` (75 requests)
  - `GET /api/v1/exams/demo-n5-1` (75 requests)
- **Kết quả đo lường thực tế ghi nhận:**
  - **Tổng số request:** 250
  - **Thời gian thực thi:** 0.461 giây
  - **Throughput đo được:** 542.3 requests/giây
  - **Tỷ lệ thành công:** 100% (0 lỗi)
  - **Độ trễ trung vị (p50):** 15.17 ms
  - **Độ trễ phân vị 90 (p90):** 31.22 ms
  - **Độ trễ phân vị 95 (p95):** 35.91 ms
  - **Độ trễ phân vị 99 (p99):** 66.12 ms
- **Tuyên bố:** Dữ liệu tải được lưu tại `docs/release/load-baseline-metrics.json` kèm tuyên bố miễn trừ: đây là số liệu đo đạc thực tế trên môi trường runner CI/local; năng lực phục vụ thực tế của hệ thống production chỉ được khẳng định khi thực hiện tải trực tiếp trên hạ tầng production sau khi bàn giao hosting. File kết quả kiểm thử được đưa vào `.gitignore` (`docs/release/load-baseline-metrics.json`) để bảo đảm khi chạy trên bản checkout sạch, repo không bị nhiễm file sinh ra ngoài tầm kiểm soát.

---

### 2.4. Khắc phục Kiểm thử trên Clean Checkout & Điều kiện Ngoại vi Chưa sẵn sàng (Hosting: MISSING)
- Dịch vụ hosting bên ngoài hiện ở trạng thái `MISSING`.
- Để bảo đảm tính độc lập và khả năng kiểm chứng 100% trong CI cũng như trên bản checkout sạch của coordinator:
  - Bổ sung cấu hình `tests/vitest.config.ts` alias trực tiếp các workspace packages (`@jlpt/schema`, `@jlpt/content-tools`, `@jlpt/exam-engine`, `@jlpt/config`, `@jlpt/ui`) tới source code `src/index.ts`. Điều này đảm bảo `pnpm test:e2e:core` và `pnpm test:security` luôn thực thi thành công ngay cả khi `packages/schema/dist` chưa được build.
  - Khi coordinator hoặc CI chạy `pnpm test` trước `pnpm build`, `tests/fixtures/test-server.ts` và `tests/fixtures/server-runner.mjs` kiểm tra và kích hoạt tuần tự build toàn bộ workspace dependencies (`@jlpt/schema`, `@jlpt/content-tools`, `@jlpt/exam-engine`, `@jlpt/api`).
  - Loại bỏ hoàn toàn runtime monkey-patch của `authService.getSession` trong `tests/fixtures/server-runner.mjs`, cấu hình dữ liệu tổ chức và phiên xác định qua `tests/fixtures/seed-sessions.sql`.
  - Khôi phục lệnh kiểm tra sức khỏe Admin container `curl -fsS http://127.0.0.1:3001/healthz` trong smoke test CI staging.
  - Cung cấp hàm `findFreePort(4092)`: kiểm tra và chọn cổng rảnh (ephemeral port) nếu cổng 4092 đang bị chiếm giữ, loại bỏ hoàn toàn nguy cơ xung đột cổng (`EADDRINUSE`) khi chạy kiểm thử đồng thời.
  - Bổ sung `--hookTimeout=60000` và bộ bắt toàn bộ stdout/stderr của tiến trình con để tránh timeout giả lập và hỗ trợ chẩn đoán chính xác.
  - Khởi tạo cơ sở dữ liệu cô lập in-memory PGlite, áp dụng tự động toàn bộ migration Drizzle, nạp gói đề demo và các session kiểm thử xác định từ `seed-sessions.sql`.
  - Bộ kiểm thử tự động nhận diện `STAGING_API_URL` khi chạy trong workflow Docker compose của GitHub Actions hoặc fallback linh hoạt về test runner độc lập.
- Ghi nhận `BLOCKED_EXTERNAL: hosting` trong báo cáo kết quả nhiệm vụ N06.

---

## 3. Trạng thái Kiểm chứng

| Lệnh kiểm thử | Kết quả | Ghi chú |
|---|---|---|
| `pnpm test:e2e:core` | **PASS (15/15 tests)** | Chạy toàn bộ luồng validate->review->publish->thi->review kèm Reviewer decision HTTP call thật |
| `pnpm test:security` | **PASS (22/22 tests)** | Toàn bộ ma trận cross-tenant, IDOR, RBAC, lease tampering không monkey-patch |
| `pnpm test:load:baseline` | **PASS (250 reqs, 0 err)** | Ghi nhận thực tế throughput >400 req/s vào `load-baseline-metrics.json` |
| `pnpm install --frozen-lockfile` | **PASS** | Dependencies được khóa an toàn |
| `pnpm lint` | **PASS** | ESLint đạt chuẩn trên toàn bộ 13 packages/apps |
| `pnpm typecheck` | **PASS** | TypeScript strict checks không phát sinh lỗi |
| `pnpm test` | **PASS** | Toàn bộ test suite monorepo hoàn tất thành công |
| `pnpm build` | **PASS** | Turborepo build thành công toàn bộ packages và apps |
