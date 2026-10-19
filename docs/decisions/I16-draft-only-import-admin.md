# Quyết định kiến trúc I16: Nhập gói đề ở chế độ nháp (DRAFT_ONLY) qua API và trang quản trị

## Bối cảnh và vấn đề

Trước đây, `apps/api/src/modules/import/import.controller.ts` không nhận tham số `mode` và `import.service.ts` luôn thực thi kiểm tra gói ở chế độ `ready`. Do đó, các gói đề chưa hoàn thiện đáp án (như `fixtures/imports/draft.zip`) luôn bị từ chối với lỗi `VALIDATION_FAILED`, không phù hợp với chuẩn định dạng gói đề tại `docs/import-format/README.md`.

Theo đặc tả `DRAFT_ONLY`:
1. Cho phép nạp các gói đề ở chế độ nháp (`mode=draft`) vào hệ thống để biên tập viên/giáo viên rà soát cấu trúc nội dung mà không bắt buộc có đủ đáp án đúng (`correctOption`).
2. Gói nạp chế độ nháp phải được lưu với trạng thái `DRAFT_ONLY`, ghi nhận danh sách chi tiết các vấn đề chặn (`blocking issues`: mã lỗi, mức độ, đường dẫn JSON, lý do, trang nguồn).
3. Tuyệt đối không cho phép đưa bản nháp vào hàng đợi duyệt (`submitForReview`), phê duyệt (`reviewDecision`), hoặc xuất bản (`publishExam`).
4. Khi nạp lại bản `ready` với cùng `packageId` và `revision` cao hơn, hệ thống phải tự động thay thế bản nháp cũ (`status: 'replaced'`, lưu vết `replacedByJobId`).
5. Trang quản trị phải có tùy chọn "Nạp bản nháp", hiển thị rõ trạng thái `DRAFT_ONLY` và danh sách issue chặn; không dùng dữ liệu viết cứng hay mock trong UI.

## Quyết định kỹ thuật

### 1. Mở rộng API Ingest Package hỗ trợ `mode=draft|ready`

- Endpoint `POST /api/v1/admin/imports` tiếp nhận tham số `mode`:
  - Query parameter: `?mode=draft` hoặc `?mode=ready` (mặc định: `ready`).
  - Multipart form field: `mode`.
  - JSON body field: `mode`.
- Validator `validateImportData` tiếp nhận `mode`:
  - Khi `mode === 'ready'`: các issue mức độ `blocking` (ví dụ thiếu `correctOption`) sẽ kích hoạt từ chối gói ngay lập tức với mã lỗi HTTP 400 kèm thông báo rõ ràng từng issue (`VALIDATION_FAILED: ...`).
  - Khi `mode === 'draft'`: các issue mức độ `blocking` không làm gián đoạn việc lưu trữ. Gói được nạp vào cơ sở dữ liệu với trạng thái `DRAFT_ONLY`, `readiness: 'DRAFT_ONLY'`, và toàn bộ danh sách issue được lưu vào `errorLog` dưới dạng cấu trúc chuẩn `ImportIssue[]`.

### 2. Tự động thay thế bản nháp khi nạp bản `ready` có revision cao hơn

- Trong `ImportService.createJobFromPackage`:
  - Trước khi tạo bản ghi mới, dịch vụ truy vấn các job đã có cùng `packageId`.
  - Nếu tồn tại bản nháp (`DRAFT_ONLY`) và gói mới có `mode === 'ready'` với `revision > oldJob.revision`:
    - Cập nhật trạng thái của bản nháp cũ thành `replaced`.
    - Ghi nhận `replacedByJobId: newJob.id` để bảo đảm truy vết vòng đời gói.
  - Sử dụng `pkg.revision` thực tế của gói (thay vì giá trị mặc định 1) cho tất cả các bản ghi phiên bản câu hỏi, nhóm câu hỏi và đáp án liên quan.

### 3. Cơ chế phòng thủ chặn duyệt và xuất bản bản nháp (Negative Guards)

- **Review Module (`ReviewService`)**:
  - Tại `submitForReview`: kiểm tra gói đề và từng câu hỏi. Nếu câu hỏi thuộc gói `DRAFT_ONLY` hoặc thiếu `correctOption`, hệ thống chặn và trả về lỗi `BadRequestException`.
  - Tại `reviewDecision`: kiểm tra trước khi chuyển trạng thái sang `APPROVED`. Nếu câu hỏi thuộc gói `DRAFT_ONLY` hoặc không có đáp án đúng, hệ thống từ chối phê duyệt (`BadRequestException: Cannot approve draft question ... without correctOption`).
  - Tối ưu hóa truy vấn: sử dụng toán tử `inArray` theo lô và chuyển ngữ cảnh transaction `tx ?? this.dbClient.db` đồng nhất, ngăn ngừa hiện tượng deadlock trên cơ sở dữ liệu PGlite/PostgreSQL.
- **Exam Module (`ExamService`)**:
  - Tại `publishExam`: kiểm tra trạng thái gói đề và các câu hỏi trong đề thi. Nếu đề thi thuộc gói `DRAFT_ONLY` hoặc có câu hỏi thiếu đáp án đúng, hệ thống từ chối xuất bản với mã lỗi thích hợp.

### 4. Nâng cấp Giao diện Quản trị (`apps/admin`)

- `apps/admin/lib/api-client.ts`:
  - Mở rộng hàm `uploadImportPackage(file, options?: { mode?: 'draft' | 'ready' })`, tự động truyền `mode` qua cả URL query và FormData body.
- `apps/admin/features/import/import-components.tsx`:
  - Bổ sung checkbox "Nạp bản nháp" (`data-testid="draft-mode-checkbox"`).
  - Hiển thị badge trạng thái `DRAFT_ONLY` trong danh sách gói (`data-testid="job-status-${job.id}"`).
  - Bổ sung bảng/danh sách chi tiết các issue chặn cho từng job (`data-testid="job-issues-${job.id}"`) với đầy đủ các trường `severity`, `path`, `reason` (`data-testid="issue-severity"`, `data-testid="issue-path"`, `data-testid="issue-reason"`).
  - Ẩn/vô hiệu hóa nút "Gửi duyệt" đối với các gói `DRAFT_ONLY`.
- Không sử dụng dữ liệu mẫu hoặc mock UI: bảo đảm tuân thủ quy tắc kiểm tra `pnpm check:no-mock-ui`.

### 5. Kiểm thử tự động và Bằng chứng nghiệm thu

- **API Integration Tests (`apps/api/src/modules/import/import-jobs.test.ts`)**:
  - Bổ sung nhóm kiểm thử `I16: Nhập gói đề ở chế độ nháp (DRAFT_ONLY) qua API và trang quản trị` bao quát 4 tiêu chí cốt lõi:
    1. Gói `fixtures/imports/draft.zip` nạp thành công ở `mode=draft`, trả về `readiness: 'DRAFT_ONLY'` và danh sách `issues`.
    2. Gói `draft.zip` ở `mode=ready` bị từ chối với HTTP 400 và thông báo lỗi chi tiết.
    3. Chặn gửi duyệt và phê duyệt đối với các câu hỏi nháp thiếu `correctOption`.
    4. Nạp lại gói `ready` cùng `packageId` với `revision` cao hơn thành công và đánh dấu bản cũ là `replaced`.
- **Admin E2E Unit Tests (`apps/admin/tests/e2e-import-publish.test.ts`)**:
  - Xác nhận toàn bộ luồng import, validator phía admin, và các trạng thái gói đề.
- **E2E Playwright Tests (`tests/playwright/integration.spec.ts`)**:
  - Bổ sung kịch bản kiểm thử giao diện thật: bật chế độ "Nạp bản nháp", kiểm tra hiển thị trạng thái `DRAFT_ONLY`, danh sách issue chặn, và nút gửi duyệt bị vô hiệu hóa.
