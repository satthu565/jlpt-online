# Quyết định kỹ thuật A06: Giải quyết xung đột nhánh và đồng bộ với main

- **Mã task:** A06
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Assignment ID:** A06-7
- **Nhánh:** `task/A06`
- **Trạng thái:** ACCEPTED (Tự quyết định theo thẩm quyền worker W6)

---

## 1. Bối cảnh xung đột

Sau khi các task L06, V04, V05 được merge vào `origin/main`, nhánh `task/A06` bị phân kỳ (diverged) và xuất hiện xung đột nội dung tại 4 file:
1. `package.json`: Xung đột các scripts kiểm thử mới giữa origin/main (`test:e2e:admin-all`, `test:reconciliation`) và A06 (`test:e2e:full`, `features:verify`).
2. `tests/tsconfig.json`: Xung đột giữa cấu hình JSX / path alias của A06 (`@jlpt/ui`) và các alias mới của origin/main (`@jlpt/media-token`, `@jlpt/schema`).
3. `tests/vitest.config.ts`: Xung đột giữa `fsModuleCache: false` (A06) và `fileParallelism: false` (origin/main).
4. `tests/fixtures/server-runner.mjs`: Xung đột kiến trúc khởi tạo máy chủ thử nghiệm giữa `StagingAppModule` (origin/main) và việc import các module bổ sung (`AiModule`, `PlannerModule`, X-Robots-Tag hook) của A06.

---

## 2. Các quyết định giải quyết xung đột

### Quyết định 1: Hợp nhất scripts trong `package.json`
- Giữ nguyên toàn bộ scripts kiểm thử của cả hai nhánh:
  - `test:e2e:admin-all`
  - `test:reconciliation`
  - `test:e2e:full`
  - `features:verify`

### Quyết định 2: Hợp nhất cấu hình TypeScript `tests/tsconfig.json`
- Giữ lại `"jsx": "react-jsx"` cho kiểm thử UI component.
- Hợp nhất toàn bộ đường dẫn workspace paths:
  - `@jlpt/ui`
  - `@jlpt/exam-engine`
  - `@jlpt/content-tools`
  - `@jlpt/media-token`
  - `@jlpt/srs`
  - `@jlpt/schema`

### Quyết định 3: Hợp nhất cấu hình Vitest `tests/vitest.config.ts`
- Kích hoạt đồng thời cả hai thuộc tính:
  - `fsModuleCache: false`: Ngăn ngừa xung đột I/O cache file.
  - `fileParallelism: false`: Bảo đảm chạy tuần tự các file test tích hợp lớn, tránh tranh chấp tài nguyên bộ nhớ và cổng mạng.

### Quyết định 4: Hợp nhất `tests/fixtures/server-runner.mjs`
- Giữ nguyên mô hình `StagingAppModule` từ origin/main.
- Mở rộng danh sách imports của `StagingAppModule` bao gồm:
  - `AppModule`
  - `PaymentModule`
  - `EntitlementModule`
  - `LearningModule`
  - `PlannerModule`
  - `AiModule`
  - `VocabModule`
- Giữ lại factory override cho `AiService` để giải quyết tham số tùy chọn không gắn decorator NestJS DI.
- Giữ lại bộ chuẩn hóa đường dẫn controller (`path: ''`) cho `AiController`, `VocabController`, `GamificationController`.
- Giữ lại hook `onSend` thiết lập header `X-Robots-Tag: noindex, nofollow` cho private routes.
- Giữ lại cơ chế khởi tạo seed plans của `PaymentService`.

### Quyết định 5: Chuẩn hóa tham số tra cứu từ điển trong `tests/e2e/full/practice-mix-learning.test.ts`
- Căn chỉnh query parameter khi gọi `/api/v1/dictionary/lookup` từ `keyword=nihon` sang `text=nihon`, khớp đúng với interface `DictionaryLookupQueryDto` của `VocabController`.

---

## 3. Kết quả kiểm chứng

Sau khi giải quyết xung đột và tích hợp:
- `pnpm install --frozen-lockfile`: Hoàn tất thành công (exit code 0).
- `pnpm lint`: 13/13 packages thành công (exit code 0).
- `pnpm typecheck`: 20/20 tasks thành công (exit code 0).
- `pnpm build`: 12/12 tasks thành công (exit code 0).
- `pnpm test`: 20/20 tasks thành công (489 tests passed, exit code 0).
- `pnpm test:contracts`: 2/2 test files passed (45/45 tests passed, exit code 0).
- `pnpm test:e2e:full`: 4/4 test files passed (42/42 tests passed, exit code 0).
- `pnpm features:verify`: 363/363 application features covered (100%), 0 placeholders/stubs, head/base SHA gắn đúng (exit code 0).
