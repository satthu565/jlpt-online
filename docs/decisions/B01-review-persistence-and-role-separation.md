# Quyết định kiến trúc B01: Lưu trữ biên tập bền vững, tách biệt vai trò 4-Eyes và thu thập Media xuất bản

- **TaskId:** B01
- **AssignmentId:** B01-11
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Ngày:** 2026-10-16
- **Trạng thái:** ACCEPTED

---

## 1. Bối cảnh và vấn đề
Sau vòng đánh giá của Reviewer W1, các vấn đề kỹ thuật trọng yếu được xác định và yêu cầu xử lý:
1. **[P0] Bỏ lọt kiểm tra tách biệt vai trò (4-eyes):** Khi `lastEditorId` là `null`, biến `effectiveEditorId` fallback gán bằng `reviewerId`, nhưng điều kiện kiểm tra lại so sánh `if (lastEditorId === reviewerId)`. Vì `null !== reviewerId` nên kiểm tra bị lọt và ghi nhận bản ghi duyệt có `reviewerId == lastEditorId` vào `content_reviews`.
2. **[P1] Nguy cơ gán nhầm editor của gói khác:** Truy vấn `importJobs` để xác định editor của `group_version` dùng `limit 1` toàn bảng mà không lọc theo source/package tương ứng của nhóm câu hỏi.
3. **[P1] Mất dấu editor khi khởi động lại tiến trình:** Bộ nhớ RAM (`targetLastEditors`) bị xóa sạch khi restart server hoặc chạy đa tiến trình; cần cơ chế lưu vết bền vững trong DB thay vì RAM.
4. **[P1] Thiếu thu thập media khi xuất bản:** `mediaSet` không duyệt qua RichBlock hình ảnh trong passage, mediaKeys và audioSha256, khiến `examManifest.media` và `publicGroups.media` rỗng.
5. **[P1] Phân quyền endpoint publish/unpublish:** Endpoint `POST admin/exams/:id/publish` và `unpublish` mở cho cả `editor` và `reviewer`, vi phạm mục 353 của `HOP_DONG_KY_THUAT.md`.
6. **[P2] Thiếu validation pipe cho review DTO:** Endpoint review chưa áp dụng ZodValidationPipe cho `SubmitReviewDto` và `ReviewDecisionDto`.
7. **[P2] Tính idempotent của CLI demo:seed khi thiếu DATABASE_URL:** Chạy PGlite in-memory giải phóng dữ liệu khi tiến trình kết thúc; thiếu cảnh báo và cấu hình đường dẫn thư mục cố định.

---

## 2. Giải pháp kỹ thuật

### 2.1. Tuân thủ tuyệt đối quy tắc 4-Eyes (P0 & P1)
- Trong `ReviewService.reviewDecision`:
  - Lấy `lastEditorId = await this.getLastEditor(targetType, targetId, version)`.
  - Nếu `!lastEditorId`: lập tức ném `BadRequestException('Không thể xác định người biên tập (lastEditorId) của nội dung này; không thể kiểm duyệt (bảo đảm nguyên tắc 4-eyes)')`. Tuyệt đối không fallback gán sang `reviewerId`.
  - Nếu `lastEditorId === reviewerId`: ném `ForbiddenException('Người duyệt không được là người sửa cuối cùng của nội dung này (tách biệt vai trò editor!=reviewer - Acceptance 3)')`.
  - Bản ghi `schema.contentReviews` lưu trữ chính xác `lastEditorId` của người biên tập gốc.
  - Loại bỏ hoàn toàn việc chèn bản ghi tự duyệt nháp có `reviewerId == lastEditorId` vào bảng `content_reviews`, bảo toàn tính bất biến của bảng này (mọi dòng trong `content_reviews` đều có `reviewerId != lastEditorId`).

### 2.2. Lưu vết định danh người tạo bền vững xuống DB (P1)
- Trong quá trình nạp gói `import.service.ts`:
  - Mỗi nhóm câu hỏi (`group`) được ghi nhận vào bảng `schema.importArtifacts` với `artifactType: 'group'`, `storageKey: groupId`, `jobId: jobId`.
  - Mỗi câu hỏi (`question`) được ghi nhận vào `schema.importArtifacts` với `artifactType: 'question'`, `storageKey: questionId`, `jobId: jobId`.
  - Đề thi (`exam`) được ghi nhận vào `schema.importArtifacts` với `artifactType: 'exam'`, `storageKey: examId`, `jobId: jobId`.
  - Nhóm câu hỏi có mediaKeys được lưu vào `schema.importArtifacts` với `artifactType: 'group_media'`, `storageKey: ${groupId}:${mediaKey}`.
- Trong `ReviewService.getLastEditor`:
  - Bước 1: Tra cứu lịch sử duyệt trước đó trong `content_reviews`.
  - Bước 2: Tra cứu quan hệ trực tiếp trong `importArtifacts` inner join với `importJobs` theo đúng `artifactType` và `storageKey = targetId`, lấy chính xác `importJobs.uploadedBy`.
  - Bước 3: Đối với câu hỏi, tra cứu ngược qua nhóm câu hỏi cha (`questions.groupId`).
  - Bước 4: Đối với nhóm câu hỏi, tra cứu qua `questionGroups.sourceId` -> `examSources.slug` và lọc chính xác `importJobs` theo `packageId`/`examSlug` (loại bỏ hoàn toàn truy vấn `limit 1` toàn bảng).
  - Kết quả: Khi xóa toàn bộ cache RAM hoặc tạo instance `ReviewService` mới hoàn toàn (mô phỏng server restart), hệ thống vẫn truy vết chính xác `editorUserId` và chặn đứng hành vi tự duyệt.

### 2.3. Thu thập Media toàn diện khi xuất bản đề thi (P1)
- Trong `ExamService.publishExam`:
  - Duyệt qua từng nhóm câu hỏi trong từng section:
    - Thu thập `audioSha256` từ `questionGroupVersions`.
    - Tra cứu `mediaAssets` tương ứng với `audioSha256` để lấy storage key.
    - Truy vấn các bản ghi `group_media` từ `importArtifacts`.
    - Phân tích đệ quy `RichBlock[]` trong passage (block hình ảnh `type: 'image'`, đoạn văn bản có segment hình ảnh `t: 'image'`, bảng có ô chứa hình ảnh).
    - Phân tích `stem` và toàn bộ phương án trả lời `opt.content` của các câu hỏi thuộc nhóm.
  - Tổng hợp vào `groupMediaSet` cho từng nhóm (`publicGroups.media = Array.from(groupMediaSet)`).
  - Tổng hợp vào `mediaSet` toàn đề thi cho `examManifest.media = Array.from(mediaSet)`.
  - Kết quả: `examManifest.media` và `publicGroups.media` phản ánh đầy đủ tệp âm thanh và hình ảnh thực tế của đề thi.

### 2.4. Chuẩn hóa phân quyền quản trị Admin (P1)
- Sửa đổi `ExamController`:
  - `@Post('admin/exams/:id/publish')`: chuyển từ `@Roles('admin', 'editor', 'reviewer')` sang `@Roles('admin')`.
  - `@Post('admin/exams/:id/unpublish')`: chuyển sang `@Roles('admin')`.
  - Đảm bảo tuân thủ đặc tả HOP_DONG_KY_THUAT.md mục 353 (chỉ Admin tối cao mới có thẩm quyền xuất bản đề thi chính thức hoặc gỡ bỏ đề thi).

### 2.5. Zod Validation Pipe cho Review DTO (P2)
- Xây dựng `ZodValidationPipe` tại `apps/api/src/common/pipes/zod-validation.pipe.ts`.
- Định nghĩa các schema chặt chẽ trong `review.types.ts`:
  - `SubmitReviewSchema`: kiểm tra `targetType` thuộc enum `['group_version', 'question_version', 'exam_version']`, `targetId` là UUID, `targetVersion` là số nguyên dương.
  - `ReviewDecisionSchema`: kiểm tra `decision` thuộc `['approved', 'rejected']`.
  - `ReviewParamsSchema`: kiểm tra các tham số route URL.
- Áp dụng vào `ReviewController` qua `@UsePipes` và decorator pipe.

### 2.6. Khả năng tái lập và Idempotent của CLI demo:seed (P2)
- Bổ sung cảnh báo rõ ràng khi chạy `demo:seed` thiếu `DATABASE_URL` hoặc `PGLITE_DATA_DIR`.
- Hỗ trợ biến môi trường `PGLITE_DATA_DIR` để lưu trữ CSDL PGlite ra thư mục dev cố định, giúp kiểm tra tính idempotent qua các lần chạy CLI liên tiếp.
- Mặc định `STORAGE_LOCAL_ROOT` vào `node_modules/.cache/storage` (thay vì `.data/storage`) khi chạy độc lập, ngăn chặn hoàn toàn việc tạo tệp untracked trong kho git.

---

## 3. Bằng chứng kiểm thử và nghiệm thu
1. `pnpm test:publish`: Đạt 10/10 tests, bao gồm 3 test mới chứng minh:
   - Thu thập media vào manifest và public groups.
   - Lưu trữ editorId bền vững sau khi wipe RAM cache và chặn tự duyệt.
   - Từ chối với `BadRequestException` khi targetId không rõ editor.
2. `pnpm test:import-jobs`: Đạt 9/9 tests.
3. `pnpm demo:seed`: Chạy lần 1 xuất bản v1, chạy lần 2 với `PGLITE_DATA_DIR` trả về `idempotent: true` không trùng lặp.
4. Git clean checkout: Không còn tệp untracked ngoài phạm vi `allowedPaths`.
