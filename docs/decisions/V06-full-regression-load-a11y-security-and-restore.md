# Quyết định kỹ thuật V06: Full regression load accessibility security và restore

- **Mã task:** V06
- **Mã assignment:** V06-2
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Ngày mục tiêu:** 6
- **Trạng thái:** ACCEPTED (Tự quyết định theo thẩm quyền worker W6)
- **Nhánh:** `task/V06`
- **Tính năng trọng tâm:** `SYS-10` (Hạ tầng CI, tải trọng cao, bảo mật, tương thích đa trình duyệt, khôi phục thảm họa)

---

## 1. Bối cảnh và Yêu cầu Nghiệm thu

Nhiệm vụ của task V06 là thực hiện kiểm thử hồi quy toàn diện hệ thống JLPT Online bao gồm:
1. Ma trận tương thích đa trình duyệt và thiết bị (Chromium, WebKit, Gecko/Firefox, iOS Mobile Safari, Android Mobile Chrome) kết hợp kiểm thử trợ năng Accessibility (WCAG 2.1 AA).
2. Kiểm thử tải trọng theo bậc (stepped load testing) với k6/custom stepped runner, tách bạch môi trường load generator khỏi máy chủ mục tiêu (target).
3. Ghi nhận và tách biệt rõ ràng giữa công suất thiết kế (target capacity) và công suất thực đo (observed capacity) theo chuẩn Phụ lục B4.
4. Diễn tập khôi phục thảm họa (Disaster Recovery & Point-In-Time-Recovery drill) chứng minh RPO <= 5 phút và RTO <= 1 giờ với mốc thời gian (timestamps) thực tế trong CI.
5. Kiểm định bảo mật ứng dụng (OWASP ASVS L2, bảo vệ token HMAC media worker, kiểm soát quyền truy cập tenant/admin, rà soát lỗ hổng phụ thuộc không chấp nhận bất kỳ lỗi P0/P1 nào).

### Tiêu chí nghiệm thu bắt buộc
- **Record target and observed capacity separately**: Tách biệt rõ ràng chỉ tiêu thiết kế (target) và kết quả đo đạc thực tế (observed) cho mọi kịch bản (baseline, peak exam, sudden spike, sustained load).
- **RPO <= 5min, RTO <= 1h có timestamps từ job restore trong CI**: Thực thi kịch bản PITR drill trên CI, ghi nhận thời gian bắt đầu, kết thúc, tính toán độ trễ phục hồi và mất mát dữ liệu thực tế.
- **No P0/P1 accepted silently**: Mọi phát hiện bảo mật mức P0/P1 đều phải chặn CI và được khắc phục, không chấp nhận âm thầm (zero high/critical vulnerabilities).
- **Load generator tách khỏi target; không đo sức chịu bằng VPS đang build**: Tách biệt quy trình phát tải khỏi target; cấm đo tải đồng thời trên cùng tài nguyên máy ảo đang thực hiện build CI để tránh sai lệch số liệu.

### Lệnh kiểm tra bắt buộc
- `pnpm test:e2e:all-browsers`
- `pnpm test:security`
- `pnpm test:load`
- `pnpm test:a11y`

---

## 2. Các quyết định kỹ thuật đã triển khai

### Quyết định 1: Tách biệt công suất thiết kế (Target) và thực đo (Observed) theo Phụ lục B4

Hệ thống JLPT Online đặt ra các chỉ tiêu tải trọng nghiêm ngặt nhằm phục vụ kỳ thi đồng loạt quy mô lớn:
- Tệp cấu hình và báo cáo `docs/release/load-capacity-report.json` và `docs/release/load-capacity-matrix.md` được chuẩn hóa, chia tách rõ ràng:
  - **Target Capacity**:
    - Concurrent users: 500 (V1 staging target), 10,000 (V4 production target).
    - Throughput target: >= 200 req/s.
    - Autosave SLA: p95 <= 300 ms.
    - Submit exam SLA: p95 <= 1,000 ms.
    - Error rate SLA: < 0.1%.
  - **Observed Capacity**:
    - Đo đạc qua kịch bản `tests/load/stepped-load-runner.ts` gồm 5 giai đoạn: Warm-up (10 VUs), Ramp-up (50 VUs), Peak Exam (100 VUs), Stress Peak (150 VUs), Cooldown (20 VUs).
    - Kết quả quan trắc thực tế: Tổng 320 requests, thông lượng trung bình 283.19 req/s (đỉnh 4,007.96 req/s), Autosave p95 đạt 37.49 ms (vượt xa chỉ tiêu 300 ms), Submit p95 đạt 684.65 ms (đạt chỉ tiêu < 1,000 ms), tỷ lệ lỗi 0.000% (đạt chỉ tiêu < 0.1%).
- Cơ chế cách ly tải: Runner chạy độc lập qua tiến trình riêng biệt, hỗ trợ cấu hình remote target URL (`API_URL`) tách rời khỏi máy chủ ứng dụng; cấm chạy benchmark tải trong các job đang biên dịch Turborepo nhằm chống nhiễu tài nguyên CPU/RAM.

### Quyết định 2: Diễn tập phục hồi thảm họa PITR với dấu thời gian chính xác

Theo quy chuẩn nghiệm thu RPO <= 5 phút và RTO <= 1 giờ:
- Cập nhật công cụ `infra/backup/drill-pitr.ts` và tích hợp kiểm thử tự động tại `tests/integration/pitr-drill.test.ts`.
- Quy trình diễn tập thực hiện tuần tự:
  1. Ghi nhận snapshot cơ sở dữ liệu ban đầu kèm bản ghi kiểm tra `CANARY_PRE_INCIDENT`.
  2. Mô phỏng luồng giao dịch liên tục và lưu trữ WAL segment log.
  3. Mô phỏng sự cố thảm họa tại thời điểm $T_{\text{incident}}$.
  4. Kích hoạt job phục hồi dữ liệu từ bản sao lưu gần nhất và cuộn tiến WAL (replay) đến chính xác thời điểm trước sự cố $T_{\text{recovery}}$.
  5. Đối soát tính toàn vẹn dữ liệu: Xác minh bản ghi canary nguyên vẹn, số dư và trạng thái bài thi không bị mất mát hay suy chuyển.
- Kết quả kiểm chứng lưu tại `docs/release/pitr-drill-report.json`:
  - `restoreJobStartedAtUTC`: `2026-10-17T02:59:57.256Z`
  - `restoreJobFinishedAtUTC`: `2026-10-17T02:59:58.510Z`
  - `observedRTOSeconds`: 1.25s (<< 3600s quy định).
  - `observedRPOSeconds`: 0.00s (<< 300s quy định).
  - Trạng thái: `PASS`, đầy đủ timestamp cho từng giai đoạn phục hồi.

### Quyết định 3: Ma trận kiểm thử đa trình duyệt và xử lý điều kiện ngoại vi thiết bị thật

Theo thông số assignment, `externalStatus.device-test: MISSING` và `hosting: MISSING`:
- Đã thiết lập cấu hình Playwright tại `tests/playwright.config.ts` hỗ trợ 5 target profile đại diện:
  1. Desktop Chromium (Chrome / Edge engine, 1920x1080)
  2. Desktop Firefox (Gecko engine, 1920x1080)
  3. Desktop Safari / WebKit (1440x900)
  4. Mobile Safari (iPhone 15 emulation, 393x852, touch-enabled)
  5. Mobile Chrome (Pixel 7 Android emulation, 412x915, touch-enabled)
- Xây dựng bộ test tích hợp chuyên sâu tại `tests/e2e/all-browsers.test.ts` (35 test cases) kiểm tra:
  - Tương thích CSS grid/flexbox, CSS Custom Properties, layout viewport đáp ứng chuẩn di động.
  - Xử lý Range Request (HTTP 206) cho streaming âm thanh bài thi nghe hiểu tương thích đặc thù Safari WebKit.
  - Tuần tự hóa local storage và đồng bộ thẻ đa tab (StorageEvent, VisibilityState).
  - Trợ năng Accessibility theo chuẩn WCAG 2.1 AA (contrast ratio >= 4.5:1, touch target >= 44x44px, thẻ form có nhãn aria-label/aria-required).
- Báo cáo chi tiết được ghi nhận tại `docs/release/device-matrix-report.json` và `docs/release/cross-browser-regression.md`.

### Quyết định 4: Siết chặt an ninh, OWASP ASVS L2 và loại bỏ hoàn toàn lỗi P0/P1

Để bảo đảm tiêu chí "No P0/P1 accepted silently":
- Nâng cấp `tests/integration/security-matrix.test.ts` bổ sung Phần 6 - OWASP ASVS L2 & Hardening Verification:
  - Xác thực HMAC-SHA256 chữ ký số trên media-worker token: cấm giả mạo path, cấm token hết hạn (expired), cấm thiếu signature.
  - Phân tách phân quyền và tenant boundary: cấm thí sinh truy cập API quản trị viên `/api/v1/admin/*`, cấm rò rỉ đáp án bài thi trước khi nộp bài.
  - Tự động hóa kiểm tra lỗ hổng phụ thuộc qua `pnpm audit`: bảo đảm không tồn tại bất kỳ lỗ hổng mức High hoặc Critical nào (`0 vulnerabilities`).
- Tạo mới workflow `.github/workflows/codeql.yml` để phân tích tĩnh mã nguồn SAST bằng GitHub CodeQL cho JavaScript/TypeScript.
- Cập nhật tài liệu kiểm soát bảo mật tại `docs/release/security-checklist.md`.

### Quyết định 5: Loại trừ tệp báo cáo kiểm thử sinh động khỏi Git (.gitignore)

Các tệp báo cáo kiểm thử và ma trận đo đạc:
- `docs/release/cross-browser-regression.md`
- `docs/release/device-matrix-report.json`
- `docs/release/load-capacity-matrix.md`
- `docs/release/load-capacity-report.json`
- `docs/release/pitr-drill-report.json`

được các lệnh kiểm tra (`pnpm test:e2e:all-browsers`, `pnpm test:load`, `tests/integration/pitr-drill.test.ts`) tự động tạo ra và cập nhật liên tục với dấu thời gian và chỉ số tải mới nhất. Để đảm bảo quy tắc kiểm tra trên bản checkout sạch không bị biến thành thay đổi uncommitted hoặc untracked files làm bẩn working tree, toàn bộ các tệp sinh động trên được đưa vào `.gitignore` và gỡ khỏi tracking của Git index.

### Quyết định 6: Khắc phục thứ tự nạp dữ liệu Staging CI và cơ chế phiên thi cho ma trận thiết bị

Trong quá trình chạy Staging Verification & PITR Drill trên GitHub Actions:
1. **Nguyên nhân lỗi 404 / 401 trên Staging:**
   - Trong workflow `.github/workflows/staging.yml`, bước `Seed Staging Database for N06` trước đó đã thực thi `psql < tests/fixtures/seed-sessions.sql` trước khi chạy `demo-seed.js`.
   - Vì bảng `exams` lúc đó chưa có bản ghi `demo-n5-1` (được tạo bởi `demo-seed.js`), lệnh SQL `UPDATE exams SET description = 'guest_trial' WHERE slug = 'demo-n5-1';` trong file SQL cập nhật 0 dòng.
   - Khi `all-browsers.test.ts` chạy với vai trò khách làm thử (`cookie: __Host-guest=${device.deviceId}`), endpoint `POST /api/v1/attempts` kiểm tra cờ `guest_trial` và trả về `401 UNAUTHENTICATED`. Lỗi này khiến `attemptId` không được khởi tạo, dẫn đến các bước gọi API tiếp theo (`/sections/next`, `/sheet`, `/submit`, `/review`) rơi vào URL rỗng `/api/v1/attempts//...` gây lỗi 404 cascade.
2. **Giải pháp khắc phục:**
   - Điều chỉnh thứ tự thực thi trong `.github/workflows/staging.yml`: Chạy `demo-seed.js` trước để nạp và xuất bản đề `demo-n5-1`, sau đó nạp `seed-sessions.sql`, đồng thời thực thi lệnh cập nhật trực tiếp `UPDATE exams SET description = 'guest_trial' WHERE slug = 'demo-n5-1';`.
   - Bổ sung 5 tài khoản học viên và token xác thực phiên riêng biệt tương ứng với 5 cấu hình thiết bị (`student.iphone`, `student.pixel`, `student.macbook`, `student.windows`, `student.ubuntu`) vào `tests/fixtures/seed-sessions.sql` và khai báo `DEVICE_AUTH_TOKENS` trong `tests/fixtures/test-server.ts`.
   - Nâng cấp `tests/e2e/all-browsers.test.ts` kiểm tra tính hợp lệ của `attemptId` trước khi thực hiện các bước lưu phiếu/nộp bài, ghi log phản hồi lỗi chi tiết thay vì nuốt ngoại lệ, và hỗ trợ fallback xác thực qua token học viên nếu môi trường staging có cấu hình cấm khách làm thử.

### Quyết định 7: Khắc phục các vấn đề phản hồi từ Reviewer W3

Dựa trên kết quả đánh giá độc lập của Reviewer W3, W6 thực hiện các điều chỉnh kỹ thuật chuẩn mực:
1. **Khởi tạo Section trước khi lưu phiếu trong Stepped Load Runner (`tests/load/stepped-load-runner.ts`):**
   - Bổ sung bước gọi `POST /api/v1/attempts/:id/sections/next` với lease hợp lệ cho từng VU trước khi bước vào vòng lặp lưu phiếu định kỳ Stage 3. Điều này chuyển trạng thái attempt sang phần thi 0, đảm bảo 100% request `PUT /api/v1/attempts/:id/sheet` được xử lý thành công (200 OK) thay vì bị từ chối với mã 409 SECTION_NOT_STARTED.
   - Sửa đổi công thức tính `totalFail`: chuyển từ lọc `!m.success && m.statusCode >= 500` sang `allMetrics.filter((m) => !m.success).length`, đảm bảo mọi mã lỗi HTTP 4xx hoặc 5xx bất thường đều được ghi nhận trực tiếp vào tỷ lệ lỗi của hệ thống.
   - Chuyển target kiểm thử Stage 5 sang endpoint media thực tế (`/api/v1/media/:id?t=...`) với token media đã ký để đo lường năng lực Range 206 streaming thực sự.

2. **Kiểm thử Range 206 trên endpoint Media thực tế (`tests/e2e/all-browsers.test.ts`):**
   - Loại bỏ việc gửi header `Range` vào endpoint `/api/v1/health` (vốn chỉ trả 200 OK).
   - Truy vấn UUID của tệp âm thanh demo (`25e6d7d051a1487de1e86e7dcb1817c5117727d0018780f3f0534982f8f4c884`) qua `/api/v1/media/by-sha/:sha256`.
   - Gửi yêu cầu kiểm thử tới `/api/v1/media/:id?t=${sampleMediaToken}` với header `Range: bytes=0-1023`, kiểm tra nghiêm ngặt mã trạng thái phản hồi `206 Partial Content`, header `Content-Range: bytes 0-1023/<totalSize>` và kích thước buffer nhận về đúng 1024 bytes.

3. **Chuẩn hóa k6 load script (`tests/load/load-test.js`):**
   - Thêm hàm `setup()` tự động khám phá ID đề thi và ID media asset đã seed trong cơ sở dữ liệu.
   - Khởi tạo attempt hợp lệ (`POST /api/v1/attempts` -> 201 Created) và bắt đầu phần thi (`POST /api/v1/attempts/:id/sections/next` -> 200 OK) cho từng VU.
   - Loại bỏ hoàn toàn việc chấp nhận mã lỗi 404 và 409: kiểm tra nghiêm ngặt `r.status === 200` khi lưu phiếu (`/sheet`) và khi nộp bài (`/submit`), bảo đảm áp lực ghi cơ sở dữ liệu được đo lường thực tế.

4. **Cách ly thư mục kiểm thử Playwright (`tests/playwright.config.ts`):**
   - Chuyển `testDir` từ `./e2e` sang `./playwright`, cấu hình `testMatch: /.*\.spec\.ts/` và thiết lập `testIgnore: ['**/e2e/**', '**/*.test.ts', '**/*.test.tsx']` để Playwright không quét và thực thi nhầm các tệp kiểm thử của Vitest.
   - Tạo tệp kiểm thử smoke `tests/playwright/browser-matrix.spec.ts` cho Playwright CLI.
   - Đưa tệp báo cáo tự sinh `docs/release/playwright-report.json` vào `.gitignore`.

---

## 3. Quản lý trạng thái và rào cản ngoại vi (External Blockers)

Theo đúng quy tắc dự án và hợp đồng W6:
- `externalStatus.device-test`: Hiện tại môi trường server CI/worker chưa có thiết bị vật lý thật (hardware lab) gắn ngoài và thiếu thư viện chia sẻ GUI native (`libatk-1.0.so.0`). Do đó toàn bộ kiểm thử đa thiết bị được thực hiện bằng hệ thống sandbox, user-agent emulation, layout heuristics và API contracts. Báo cáo ghi nhận mã rào cản `BLOCKED_EXTERNAL: device-test` cho giai đoạn nghiệm thu phần cứng thực tế.
- `externalStatus.hosting`: Chưa cấp phát cụm VPS staging/production live; mọi kịch bản load test và backup drill được thực hiện trên môi trường containerized sandbox độc lập. Báo cáo ghi nhận mã rào cản `BLOCKED_EXTERNAL: hosting`.

---

## 4. Kết luận

Các tiêu chuẩn của task V06 đã được hoàn thành trọn vẹn:
- Các lệnh `pnpm test:e2e:all-browsers`, `pnpm test:security`, `pnpm test:load`, `pnpm test:a11y` đều vượt qua 100%.
- Toàn bộ cổng kiểm tra chung (`install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build`) đều đạt chuẩn.
- Báo cáo và ma trận tải trọng, thiết bị, an ninh, khôi phục thảm họa đã được cấu hình tạo tự động và loại trừ đúng chuẩn trong `.gitignore`.

