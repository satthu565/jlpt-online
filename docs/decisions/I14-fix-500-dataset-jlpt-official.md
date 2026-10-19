# Quyết định kiến trúc I14: Sửa lỗi 500 ở /api/v1/datasets/jlpt-official/*

## Bối cảnh

Trên staging, khi truy cập trang Thống kê tần suất từ vựng / ngữ liệu JLPT (`/thong-ke-tu-vung`), giao diện web gọi các endpoint:
- `GET /api/v1/datasets/jlpt-official/trends`
- `GET /api/v1/datasets/jlpt-official/vocabulary`
- `GET /api/v1/datasets/jlpt-official/grammar`
- `GET /api/v1/datasets/jlpt-official/compare/levels`

Các endpoint trên bị lỗi HTTP 500 (`Failed query: select id, name, version, license_id ...`) do:
1. Cột `id` của bảng `datasets` trong cơ sở dữ liệu là kiểu `uuid`. Khi chuỗi slug `jlpt-official` truyền vào câu truy vấn Drizzle/Postgres `where(eq(datasets.id, id))`, Postgres ném ngoại lệ `invalid input syntax for type uuid: "jlpt-official"`.
2. Ở task I11 trước đó, pipe `UuidParamPipe` chặn cứng mọi chuỗi không phải UUID và trả 400 (`INVALID_UUID`), ngăn cản truy cập slug chính thức `jlpt-official`.
3. Bảng `datasets` thiếu cột `slug` để ánh xạ giữa định danh tĩnh (`jlpt-official`) và UUIDv7 lưu trong DB.
4. Khi thêm migration 0004, việc chèn trực tiếp lệnh `INSERT` vào file migration DDL gây phá vỡ tính cô lập của migration và làm hỏng các test kiểm tra trạng thái cơ sở dữ liệu rỗng (`reporting-reconciliation.test.ts`).

## Quyết định kiến trúc

1. **Bổ sung cột `slug` và tách biệt DDL migration với DML seed**:
   - Migration `0004_dataset_slug.sql` chỉ thực hiện DDL: `ALTER TABLE "datasets" ADD COLUMN IF NOT EXISTS "slug" text;` và `CREATE UNIQUE INDEX IF NOT EXISTS "datasets_slug_idx" ON "datasets" USING btree ("slug");`.
   - Tuyệt đối không nhúng lệnh `INSERT` vào migration DDL để đảm bảo migration luôn là DDL thuần túy, an toàn cho rollback và không ảnh hưởng tới các test giả lập trạng thái database sạch ban đầu.
   - Cập nhật số lượng migration từ 4 lên 5 trong `apps/api/src/db/db.test.ts` (0000, 0001, 0002, 0003, 0004).

2. **Khởi tạo dữ liệu mẫu trong Seed**:
   - Trong `apps/api/src/db/seed.ts`, bổ sung bước khởi tạo idempotent cho tập ngữ liệu chuẩn:
     - `id`: `018e0000-0000-7000-8000-0000000000d1` (`DEFAULT_CORPUS_DATASET_ID`)
     - `slug`: `jlpt-official`
     - `name`: `Tập ngữ liệu đề thi JLPT N1–N5`
     - `version`: `1.0.0`
     - Sử dụng `.onConflictDoNothing()`.

3. **Validation Pipe linh hoạt (`DatasetIdPipe`)**:
   - Thay thế `UuidParamPipe` trên các route `datasets/:id/*` của `VocabController` bằng `DatasetIdPipe`.
   - `DatasetIdPipe` cho phép tham số là UUID hợp lệ hoặc slug chuẩn `jlpt-official`.
   - Các chuỗi định danh rác hoặc không hợp lệ khác tiếp tục bị từ chối với 400 Bad Request (`INVALID_UUID`), không bao giờ để lọt xuống database gây lỗi 500.

4. **Xử lý Graceful Fallback trong `CorpusService`**:
   - `findDatasetRecord(idOrSlug)`: kiểm tra xem chuỗi là UUID thì query theo `id`, ngược lại query theo `slug`, hoặc fallback về `DEFAULT_CORPUS_DATASET_ID`.
   - Trong trường hợp database hoàn toàn mới (chưa chạy seed), khi gọi tới `jlpt-official`, `getDataset` trả về metadata mặc định hợp lệ (`documentCount: 0, totalTokens: 0`) thay vì ném lỗi 404 hoặc 500.
   - Các API phân tích (`trends`, `vocabulary`, `grammar`, `compare/levels`) khởi tạo aggregator tương ứng và trả về 200 với danh sách rỗng hợp lệ khi chưa có dữ liệu, và trả về dữ liệu tần suất đầy đủ khi đã seed hoặc ingest đề thi.

5. **Kiểm thử và nghiệm thu**:
   - Bổ sung unit/integration test trong `vocab.test.ts` kiểm tra cả 2 trường hợp: chưa có dataset (unseeded clean state) trả 200 danh sách rỗng, và đã có dataset kèm đề thi ingested trả 200 dữ liệu thật.
   - Cập nhật E2E test Playwright trong `tests/playwright/integration.spec.ts` kiểm tra cả 4 endpoint trả về HTTP 200 và giao diện `/thong-ke-tu-vung` render thành công, không gặp lỗi 500.
