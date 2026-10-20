# Quyết định kỹ thuật I18: Giới hạn kích thước body cho multipart, zip và octet-stream

## Bối cảnh và vấn đề

Trong I16, hệ thống thêm `addContentTypeParser` cho `multipart/form-data`, `application/zip`, và `application/octet-stream` để gom body thành `Buffer` phục vụ nạp gói đề. Tuy nhiên, nếu gom stream không kiểm soát `bodyLimit` của Fastify, request chạy trước guard xác thực có thể gửi body kích thước tùy ý vào bất kỳ route POST nào, gây cạn kiệt bộ nhớ (OOM / DoS).

## Quyết định kiến trúc và giải pháp

1. **Parser Buffer chung với `bodyLimit` mặc định 1 MB**:
   - Sử dụng một `addContentTypeParser` duy nhất cho `['multipart/form-data', 'application/zip', 'application/octet-stream', 'application/x-zip-compressed']` với cấu hình `{ parseAs: 'buffer', bodyLimit: 1024 * 1024 }` (1 MB).
   - Mọi route POST thông thường (không phải import) khi nhận payload vượt 1 MB (ví dụ: 2 MB `application/octet-stream`, `application/zip` hoặc `multipart/form-data`) sẽ bị Fastify cắt stream ngay lập tức và trả HTTP 413 Payload Too Large mà không cần đăng nhập (chạy trước NestJS AuthGuard).

2. **Cấu hình route-level `bodyLimit` cho `POST /api/v1/admin/imports`**:
   - Sử dụng hook `onRoute` của Fastify để thiết lập `routeOptions.bodyLimit = maxImportBytes` cho route `POST /api/v1/admin/imports` (và alias `/admin/imports`).
   - Giá trị `maxImportBytes` được đọc từ biến môi trường `IMPORT_MAX_BYTES` (mặc định 50 MB, fallback an toàn nếu NaN hoặc <= 0).
   - Fastify's `rawBody` ưu tiên `options.limit` của route nếu được cấu hình; nếu vượt quá sẽ trả HTTP 413.

3. **Bảo toàn hành vi nạp gói đề I16 và xử lý slug nhất quán**:
   - Giữ nguyên toàn bộ logic xử lý multipart, zip nhị phân và JSON base64 của I16 trong `apps/api/src/modules/import/import.controller.ts` và `import.service.ts`.
   - Trong `import.service.ts`, khi nạp gói đề, kiểm tra nếu `pkg.exam.slug` đã tồn tại trong bảng `exams` thì tái sử dụng `existingExam.id` để đảm bảo tính toàn vẹn khóa ngoại `exam_sections_exam_id_exams_id_fk`.
   - Các gói fixture hợp lệ `fixtures/imports/draft.zip` (chế độ draft) và `fixtures/imports/ready.zip` (chế độ ready) nạp thành công qua cả binary và multipart.

4. **Kiểm thử nghiệm thu đầy đủ**:
   - Tạo bộ test tích hợp `apps/api/src/modules/import/import-body-limit.test.ts` kiểm chứng toàn bộ tiêu chí nghiệm thu của I18.
