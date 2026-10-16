# Quyết định B01: Hợp nhất nhánh main và xử lý xung đột

## Bối cảnh

Nhánh `task/B01` phân kỳ so với `origin/main` sau khi các tính năng L02, L05, N03, C06 được merge vào main.
Khi thực hiện `git fetch origin && git merge origin/main`, phát sinh xung đột tại 5 tệp:
- `apps/api/package.json`
- `apps/api/src/modules/exam/exam.module.ts`
- `apps/api/src/modules/review/review.controller.ts`
- `apps/api/src/modules/review/review.module.ts`
- `apps/api/src/modules/review/review.service.ts`

## Giải pháp thực hiện

1. **`apps/api/package.json`**:
   - Giữ lại các lệnh kiểm thử của B01 (`test:import-jobs`, `test:publish`, `demo:seed`) đồng thời tích hợp đầy đủ các lệnh kiểm thử mới từ main (`test:practice-api`, `test:explanations`, `test:notifications`).

2. **`apps/api/src/modules/exam/exam.module.ts`**:
   - Tích hợp cả `@Global()` và đầy đủ các import/provider/controller của cả hai nhánh: `StorageModule`, `OutboxModule`, `BlueprintModule`, `LicenseModule`, `PracticeService`, `MixService`, `PracticeMixController`.

3. **`apps/api/src/modules/review/review.controller.ts` & `review.module.ts`**:
   - Dùng `@Controller()` không tiền tố chung trên lớp để định tuyến chính xác:
     - Các endpoint kiểm duyệt nội dung của B01: `POST /admin/reviews/submit`, `POST /admin/reviews/:targetType/:targetId/v:version/decision`.
     - Các endpoint giải thích và báo cáo nội dung của L02: `POST/GET/PATCH /admin/explanations`, `POST /admin/explanations/:id/reviews`, `GET /attempts/:id/explanations/:index`, `POST /content-reports`, `GET/PATCH /admin/content-reports`.
   - `ReviewModule` nhập cả `DatabaseModule`, `OutboxModule`, `LicenseModule`.

4. **`apps/api/src/modules/review/review.service.ts`**:
   - Hợp nhất phương thức kiểm duyệt gói/câu hỏi/đề thi của B01 (`recordEditor`, `getLastEditor`, `submitForReview`, `reviewDecision`, `approveAllExamQuestions`) và các phương thức giải thích/báo cáo của L02 (`createExplanation`, `listExplanations`, `getExplanation`, `updateExplanation`, `reviewExplanation`, `getLearnerExplanation`, `createReport`, `listReports`, `updateReport`).
   - Đặt `licenseService` làm `@Optional()` trong constructor để hỗ trợ cả injection trong NestJS và các unit/integration test độc lập của B01.

5. **`apps/api/src/app.module.ts`**:
   - Loại bỏ import và khai báo trùng lặp của `ReviewModule`.

## Xác minh

- `pnpm install --frozen-lockfile`: Hoàn tất 100%, không lệch lockfile.
- `pnpm typecheck`: Thành công 100% trên toàn bộ 19 package/ứng dụng.
- `pnpm lint`: Thành công 100%, không lỗi.
- `pnpm test:import-jobs`: 9/9 tests passed.
- `pnpm test:publish`: 10/10 tests passed.
- `pnpm test:explanations`: 13/13 tests passed.
- `pnpm test:practice-api`: 15/15 tests passed.
- `pnpm demo:seed`: Chạy thành công và kiểm tra idempotency chuẩn xác.
- `pnpm build`: 12/12 packages build thành công.
- `pnpm test`: Toàn bộ test suite monorepo vượt qua (20 test files, 230 tests trong apps/api).
