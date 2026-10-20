# Quyết định kỹ thuật I19: Khắc phục lỗi 415 khi tải gói ZIP trong container và đồng bộ cấu hình Fastify

## Bối cảnh và vấn đề

Trong môi trường container staging/production (`infra/docker/api.Dockerfile`), file `dist/src/main.js` được thay thế bằng `infra/docker/entrypoint.js`. Trước task I19:
1. `entrypoint.js` khởi tạo `FastifyAdapter` với tham số toàn cục `{ bodyLimit: 52428800 }` (50 MB) nhưng không gọi `configureImportFastify`, không đăng ký parser buffer (`multipart/form-data`, `application/zip`, `application/octet-stream`). Do đó, mọi request gửi lên route `POST /api/v1/admin/imports` dưới dạng multipart hoặc binary zip đều bị Fastify từ chối với mã lỗi `415 Unsupported Media Type`.
2. Tham số `bodyLimit: 52428800` toàn cục trong `entrypoint.js` và lệnh replace trong `api.Dockerfile` làm vô hiệu hóa giới hạn 1 MB mặc định của các route khác, khiến các request 2 MB gửi tới các route không phải nhập gói không bị chặn với mã lỗi `413 Payload Too Large`.

## Quyết định kỹ thuật

1. **Tách và dùng chung cấu hình HTTP Fastify (`fastify-http-config.ts`)**:
   - `apps/api/src/modules/import/fastify-http-config.ts` cung cấp hàm `configureImportFastify(fastify: FastifyInstance)` dùng chung cho cả môi trường phát triển local (`apps/api/src/main.ts`) và môi trường container (`infra/docker/entrypoint.js`).
   - Hàm đăng ký content type parser dạng buffer cho các định dạng: `multipart/form-data`, `application/zip`, `application/x-zip`, `application/x-zip-compressed`, `application/octet-stream` với `bodyLimit` mặc định 1 MB (`DEFAULT_BODY_LIMIT_BYTES`).
   - Đăng ký hook `onRoute` gán `routeOptions.bodyLimit = maxImportBytes` (đọc từ biến môi trường `IMPORT_MAX_BYTES`, mặc định 50 MB) riêng cho route `POST /api/v1/admin/imports` (và alias `/admin/imports`).

2. **Cập nhật `infra/docker/entrypoint.js`**:
   - Bỏ cấu hình `bodyLimit: 52428800` toàn cục khi khởi tạo `FastifyAdapter`.
   - Gọi `configureImportFastify(adapter.getInstance())` trước khi khởi tạo Nest application. Nhờ đó, Fastify trên container hỗ trợ đầy đủ `multipart/form-data` và `application/zip` mà không trả về 415.
   - Các route khác tự động áp dụng giới hạn mặc định 1 MB của Fastify; request 2 MB gửi tới các route này trả về HTTP 413.

3. **Cập nhật `infra/docker/api.Dockerfile`**:
   - Xóa bỏ lệnh vá đè chuỗi `new FastifyAdapter({ bodyLimit: 52428800 })` vào `apps/api/src/main.ts` trong Dockerfile builder stage.

4. **Kiểm thử nghiệm thu và E2E staging**:
   - Cập nhật test tích hợp `apps/api/src/modules/import/import-body-limit.test.ts` kiểm chứng gói 12 MB vào `/api/v1/admin/imports` được chấp nhận không bị 413, trong khi body 2 MB vào route khác trả 413.
   - Thêm test E2E `I19 E2E` trong `tests/playwright/integration.spec.ts`: nhân sự tải `fixtures/imports/draft.zip` qua multipart ở chế độ draft thành công (HTTP 201), tải lại trang gọi `GET /api/v1/admin/imports` hiển thị job ở trạng thái `DRAFT_ONLY`; kiểm tra giới hạn 12 MB / 2 MB trên container staging thật.
