# Quyết định kiến trúc B01: API nhập gói chuẩn, duyệt nội dung, ghép đề thi và xuất bản bất biến

- Mã task: `B01`
- Phụ trách: `W2` (API tài khoản nội dung và thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED` / `READY_FOR_REVIEW`
- Nhánh: `task/B01`
- Base SHA: `02ca3302d9d12ed111787cae0aa9ff73161419ca`
- Merged with `origin/main` (`c7b6c9c`) dưới khóa `dependency-lock` theo chỉ thị điều phối


---

## 1. Bối cảnh & Mục tiêu

Task B01 chịu trách nhiệm xây dựng toàn bộ luồng dữ liệu trung tâm của hệ thống JLPT Online cho việc nạp nội dung đề thi chuẩn hóa (import package v2 ZIP), kiểm duyệt nội dung độc lập (separation of duties), quản lý blueprint đề thi, và xuất bản đề thi chính thức với snapshot bất biến (immutable public snapshot) cùng cam kết an toàn tuyệt đối không lộ đáp án.

Theo chỉ thị của chủ dự án và quy tắc `AGENTS.md`:
1. **Không xây dựng OCR, parser PDF hay model trích xuất trong ứng dụng**: Toàn bộ dữ liệu nhập vào hệ thống bắt buộc phải theo chuẩn Import v2 ZIP đã chuẩn bị từ trước theo hợp đồng `CHUAN_DU_LIEU_NHAP.md`.
2. **Kiểm tra hợp lệ trước khi ghi DB (Pre-database Validation)**: Toàn bộ quá trình kiểm tra định dạng ZIP, checksum tệp media, schema JSON, và ngữ nghĩa blueprint phải hoàn tất trước khi mở transaction ghi DB; nếu có bất kỳ lỗi nào, rollback hoàn toàn và không để lại dữ liệu dở dang (Acceptance 1).
3. **Chống trùng lặp và xung đột phiên bản (Idempotency & Content Hashing)**: Hệ thống sử dụng kết hợp `packageId`, `revision`, và mã băm nội dung SHA-256 xác định trạng thái gói: `IDEMPOTENT_SKIP` (bỏ qua nếu trùng khớp), `REJECT_CONFLICT` (từ chối nếu cùng revision nhưng nội dung khác), `REJECT_REGRESSION` (từ chối lùi revision), và `PROCEED_NEW_REVISION` (chấp nhận cập nhật bản mới) (Acceptance 2).
4. **Tách biệt vai trò (Separation of Duties - 4-Eyes Principle)**: Người duyệt nội dung (`reviewerId`) bắt buộc phải khác người biên tập/tạo nội dung gần nhất (`lastEditorId`). Khi duyệt, bản ghi lịch sử kiểm duyệt được ghi nhận vào `content_reviews` và event `content.approved` được ghi vào `outbox` trong cùng transaction (Acceptance 3).
5. **Xuất bản bất biến & cam kết không lộ đáp án (Immutable Publishing & Zero Answer Leak)**: Khi xuất bản đề thi, toàn bộ câu hỏi phải ở trạng thái đã duyệt (`approved`), bản snapshot đề thi public được sinh và kiểm định qua `assertNoAnswerLeak` (không chứa `correct`, `explanation`, `answerKey`), đẩy lên kho lưu trữ đối tượng (Object Storage), bảng đáp án đúng được lưu riêng biệt và bảo mật ở `exam_answer_keys` chỉ server nội bộ mới được truy cập, và event `content.published` được bắn qua outbox transaction (Acceptance 3 & 4).
6. **Lệnh nạp dữ liệu mẫu dev (`pnpm demo:seed`)**: Nạp blueprint synthetic và gói `docs/multi-worker/demo-data/demo-n5-1.zip` qua đúng chuỗi nghiệp vụ thực tế: nạp qua Editor (`0192f000-0000-7000-8000-0000000000e1`) → duyệt qua Reviewer (`0192f000-0000-7000-8000-0000000000d1`) → xuất bản qua Publisher/Admin (`0192f000-0000-7000-8000-0000000000b1`), hỗ trợ chạy lại nhiều lần mà không tạo trùng lặp dữ liệu (Acceptance 4).

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Module Outbox (`apps/api/src/modules/outbox/`)
- Cung cấp `OutboxService` toàn cục để ghi nhận các sự kiện miền (domain events) theo mẫu Transactional Outbox Pattern.
- Tất cả các sự kiện (`content.import.completed`, `content.approved`, `content.published`, `content.taken_down`) được đóng gói qua `createEventEnvelope` từ `@jlpt/schema/events` và chèn vào bảng `outbox` ngay trong transaction DB đang xử lý, đảm bảo tính nhất quán tuyệt đối giữa dữ liệu nghiệp vụ và sự kiện gửi ra message broker.

### 2.2. Module Blueprint (`apps/api/src/modules/blueprint/`)
- Quản lý cấu trúc đề thi JLPT chuẩn (N5 đến N1) với các phần thi (Language Knowledge, Reading, Listening), các mondai, giới hạn thời gian (timeLimitSeconds), số lượng câu hỏi và phân bổ điểm số (scoring model).
- Hỗ trợ upsert blueprint xác định (deterministic UUID theo `blueprint.id` hoặc slug) và phương thức `activateBlueprint` để kích hoạt blueprint phục vụ ghép đề.

### 2.3. Module Review (`apps/api/src/modules/review/`)
- Triển khai nguyên tắc 4 mắt (Separation of Duties) nghiêm ngặt:
  - Hàm `approveQuestion` và `approveAllExamQuestions` kiểm tra trực tiếp: nếu `reviewerId === lastEditorId`, trả về lỗi nghiệp vụ `ReviewError.SAME_USER_CANNOT_REVIEW` (HTTP 403 Forbidden).
  - Tự động phục hồi hoặc ghi nhận lịch sử kiểm duyệt vào bảng `content_reviews` với hành động `approve` hoặc `reject`.
  - Cập nhật trạng thái câu hỏi từ `draft` / `in_review` sang `approved` hoặc `needs_revision`.
  - Bắn sự kiện `content.approved` vào outbox trong cùng transaction.

### 2.4. Module Import (`apps/api/src/modules/import/`)
- **Pre-database Validation**:
  - Giải nén ZIP an toàn trong bộ nhớ/quarantine qua `readZipBuffer` của `@jlpt/content-tools`.
  - Kiểm tra tính hợp lệ của gói qua `validatePackage`: magic bytes của các tệp media (âm thanh, hình ảnh), checksum SHA-256 từng tệp, schema JSON của `manifest.json`, `exam.json`, `sections/*.json`.
  - Kiểm tra ràng buộc cấu trúc đề thi so với blueprint đã đăng ký: số lượng câu hỏi, kiểu mondai, phân bổ kỹ năng.
- **Content Hashing & Idempotency**:
  - Tính mã băm nội dung chuẩn hóa SHA-256 dựa trên cấu trúc các câu hỏi và thuộc tính cốt lõi của đề thi.
  - Quản lý trạng thái nhập theo `packageId` và `revision`:
    - Nếu packageId + revision đã nạp và content hash giống hệt: trả về `IDEMPOTENT_SKIP`, không ghi đè DB.
    - Nếu cùng packageId và revision nhưng hash khác: báo lỗi `REJECT_CONFLICT` để ngăn ghi đè ngầm.
    - Nếu revision gửi lên nhỏ hơn revision hiện tại: báo lỗi `REJECT_REGRESSION`.
    - Nếu revision lớn hơn: tiến hành cập nhật phiên bản mới `PROCEED_NEW_REVISION`.
- **Atomic Database Transaction**:
  - Toàn bộ quá trình tạo nhóm câu hỏi (`question_groups`), câu hỏi (`questions`), phiên bản câu hỏi (`question_versions`), lựa chọn đáp án (`question_options`), và đề thi (`exams`) được thực hiện trong một transaction duy nhất.
  - Nếu xảy ra bất kỳ lỗi DB hoặc ngoại lệ nào, transaction tự động rollback 100%, không để lại bất kỳ bản ghi rác nào.

### 2.5. Module Exam (`apps/api/src/modules/exam/`)
- **Kiểm định trước xuất bản (Pre-publish Gate)**:
  - Xác nhận đề thi tồn tại và blueprint tương ứng đang ở trạng thái kích hoạt (`status: 'active'`).
  - Kiểm tra toàn bộ câu hỏi trong đề thi: tất cả câu hỏi phải ở trạng thái `approved`. Nếu còn câu hỏi `draft` hoặc `in_review`, từ chối xuất bản.
  - Kiểm tra bản quyền tài liệu (license check): không cho phép xuất bản nếu giấy phép đã bị đánh dấu `revoked`.
- **Snapshot Generator & Zero Answer Leak**:
  - Tạo snapshot public bất biến với version tăng dần (1, 2, ...).
  - Loại bỏ hoàn toàn các trường nhạy cảm: `correct`, `answerKey`, `explanation`, `notes`.
  - Chạy hàm kiểm định `assertNoAnswerLeak` để đảm bảo chuỗi JSON snapshot không chứa đáp án dưới bất kỳ hình thức nào.
  - Tải snapshot `snapshot.json` và `manifest.json` lên Object Storage theo khóa chuẩn `exams/{examId}/v{version}/snapshot.json`.
- **Bảo mật đáp án máy chủ (`exam_answer_keys`)**:
  - Bảng `exam_answer_keys` lưu trữ đáp án đúng độc lập, chỉ phục vụ backend scoring engine tính điểm sau khi nộp bài, không bao giờ được trả ra qua các API public.
- **Sự kiện xuất bản**:
  - Bắn sự kiện `content.published` vào outbox trong cùng transaction lưu phiên bản đề thi.
  - Hỗ trợ hạ đề thi (`unpublishExam`) với sự kiện `content.taken_down`.

### 2.6. Lệnh Seed Mẫu Dev (`apps/api/src/modules/import/demo-seed.ts`)
- Đăng ký script `pnpm demo:seed` tại root repo và `apps/api/package.json`.
- Tự động nạp:
  1. Tài khoản Editor (`0192f000-0000-7000-8000-0000000000e1`), Reviewer (`0192f000-0000-7000-8000-0000000000d1`), Publisher (`0192f000-0000-7000-8000-0000000000b1`).
  2. Nạp blueprint `synthetic-n5-demo-v1.json` và kích hoạt.
  3. Kiểm tra tính idempotent: nếu đề `demo-n5-1` đã xuất bản, trả về `idempotent: true` và không tạo trùng.
  4. Thực thi luồng nạp qua Editor -> duyệt qua Reviewer -> xuất bản qua Publisher.

### 2.7. Quản lý tệp cục bộ và tách biệt môi trường lưu trữ kiểm thử (.data/storage)
- Tệp lưu trữ cục bộ sinh ra bởi `LocalFsStorage` trong môi trường phát triển (`.data/storage/`) là tài nguyên runtime, không thuộc mã nguồn hay dữ liệu cố định của repo.
- Đã giải quyết triệt để vấn đề sinh file untracked `.data/storage/` khi chạy lệnh kiểm tra trên bản checkout sạch (`pnpm test:import-jobs`, `pnpm test:publish`):
  1. Chuẩn hóa `publish.test.ts` và `import-jobs.test.ts` tuân thủ pattern cô lập như `media.test.ts` và `content.test.ts`: khởi tạo `tempStorageDir` trong `os.tmpdir()` (`fs.mkdtempSync`), gán biến môi trường `process.env.STORAGE_LOCAL_ROOT = tempStorageDir`, thiết lập instance `LocalFsStorage(tempStorageDir)` cho `StorageService`, và dọn dẹp triệt để trong `afterEach`.
  2. Bổ sung hỗ trợ injection `storageService` tùy chọn trong `runDemoSeed` của `demo-seed.ts` để khi chạy trong test runner, toàn bộ snapshot và tệp tải lên đều được định tuyến vào thư mục tạm thời, không bao giờ ghi vào `.data/storage/` của cây git monorepo.
  3. Kết quả: Chạy các bài kiểm tra `test:import-jobs`, `test:publish`, hoặc `pnpm test` trên bất kỳ bản checkout sạch nào đều không sinh ra bất kỳ tệp untracked nào trong thư mục làm việc của git.
- Vẫn ghi nhận kiến nghị tới Coordinator / F01 để bổ sung `.data/` vào `.gitignore` chung của monorepo nhằm bảo vệ toàn diện khi chạy `pnpm demo:seed` ở môi trường dev.

### 2.8. Định vị đường dẫn monorepo tất định (Deterministic Repo Path Resolution)
- Khi turbo và vitest chạy kiểm thử trong môi trường workspace con (`apps/api`), `process.cwd()` trỏ về thư mục con (`apps/api`) thay vì gốc repo. Việc sử dụng trực tiếp `path.resolve(process.cwd(), 'docs/multi-worker/...')` gây ra lỗi `ENOENT` khi điều phối viên chạy `pnpm test` sạch.
- Đã bổ sung tiện ích `resolveRepoPath` tại `apps/api/src/common/utils/paths.ts` để tự động dò ngược lên các thư mục cha tìm `pnpm-workspace.yaml` hoặc `docs/multi-worker/`, đảm bảo định vị đường dẫn tuyệt đối ổn định và tất định bất kể lệnh được kích hoạt từ thư mục gốc monorepo hay thư mục con.
- Đã chuẩn hóa toàn bộ các điểm truy xuất fixture, dữ liệu demo và thư mục lưu trữ cục bộ sang `resolveRepoPath` trong `demo-seed.ts`, `import.service.ts`, `local-fs.storage.ts`, `import-jobs.test.ts` và `publish.test.ts`.

---

## 3. Bằng chứng kiểm thử (Verification & Acceptance Proofs)

### 3.1. `pnpm test:import-jobs`
- **Tập tin**: `apps/api/src/modules/import/import-jobs.test.ts`
- **Kết quả**: 9/9 tests pass (100% đạt, exit code 0).
- **Phạm vi kiểm tra**:
  1. Từ chối tệp tải lên nếu không phải ZIP hợp lệ (magic bytes zip signature).
  2. Từ chối gói ZIP thiếu các tệp bắt buộc (`manifest.json`, `exam.json`).
  3. Từ chối gói có checksum media sai lệch.
  4. Từ chối gói không khớp với blueprint yêu cầu.
  5. Đảm bảo rollback toàn vẹn khi có lỗi xảy ra trong transaction ghi DB (không có dữ liệu dở dang).
  6. Xử lý đúng đắn cơ chế idempotency: `IDEMPOTENT_SKIP` và phát hiện `REJECT_CONFLICT`.
  7. Thực thi luồng `pnpm demo:seed` thành công với tài khoản Editor/Reviewer/Publisher riêng biệt.
  8. Kiểm tra chạy lại `demo:seed` không tạo trùng lặp dữ liệu (`idempotent: true`).

### 3.2. `pnpm test:publish`
- **Tập tin**: `apps/api/src/modules/exam/publish.test.ts`
- **Kết quả**: 7/7 tests pass (100% đạt, exit code 0).
- **Phạm vi kiểm tra**:
  1. Kiểm tra phân quyền: Editor không thể tự duyệt câu hỏi do chính mình tạo (Separation of Duties).
  2. Từ chối xuất bản đề thi nếu còn câu hỏi chưa được duyệt (`status !== 'approved'`).
  3. Xuất bản đề thi thành công với version bất biến, tạo snapshot trên storage và bảng `exam_answer_keys`.
  4. Xác nhận snapshot public tuân thủ nguyên tắc Zero Answer Leak (`assertNoAnswerLeak`).
  5. Bắn đầy đủ sự kiện outbox transactional (`content.published`).
  6. Khả năng hạ đề thi (`unpublish`) và bắn sự kiện `content.taken_down`.
  7. API tra cứu đề thi public (`GET /exams`, `GET /exams/:slug`) hoạt động đúng chuẩn hợp đồng schema.

### 3.3. Kiểm tra kiểu dữ liệu toàn workspace
- `pnpm --filter @jlpt/api typecheck`: 0 errors.
- `pnpm typecheck`: 19/19 packages pass without any errors (exit code 0).
- `pnpm demo:seed`: Hoàn tất thành công với exit code 0.

### 3.4. Kiểm tra mã nguồn và tiêu chuẩn ESLint (Strict TypeScript & Zero Any)
- `pnpm --filter @jlpt/api lint`: 0 errors, 0 warnings.
- `pnpm lint`: Toàn bộ 13 packages trong workspace đều pass sạch không còn lỗi (exit code 0).
- Loại bỏ toàn bộ các import và biến không sử dụng (`path` trong `publish.test.ts` và `import.service.ts`).

### 3.5. Kiểm tra toàn bộ test suite (`pnpm test`)
- `turbo run test --concurrency=1 -- --fileParallelism=false`: 19/19 successful, 14 test files passed (154/154 tests passed), exit code 0.
- `pnpm build`: 12/12 packages build successful, exit code 0.

