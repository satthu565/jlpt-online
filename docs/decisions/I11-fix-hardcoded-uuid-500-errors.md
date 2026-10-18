# Quyết định kiến trúc I11: Sửa lỗi 500 do mã viết cứng ở từ vựng, ngữ pháp, thảo luận

## Bối cảnh

Trên bản demo sau I06, các trang `/tu-vung`, `/ngu-phap`, và `/thao-luan` gặp lỗi:
1. `/tu-vung` và `/ngu-phap` gọi API `/api/v1/datasets/jlpt-official/*`. Giá trị `jlpt-official` không phải là UUID, dẫn tới lỗi Postgres `invalid input syntax for type uuid` và trả về HTTP 500.
2. Trang `/tu-vung` và `/ngu-phap` chứa mảng dữ liệu mẫu viết cứng (`DEFAULT_VOCAB_TERMS`, `DEFAULT_GRAMMAR_PATTERNS`, `DEFAULT_FREQUENCY_STATS`) hiển thị khi API bị lỗi, vi phạm nguyên tắc cấm dữ liệu mẫu/mock trên giao diện.
3. Trang `/thao-luan` viết cứng mã câu hỏi `q-default-1`, gọi `/api/v1/questions/q-default-1/discussions`, dẫn đến lỗi cú pháp UUID trong Postgres và trả về HTTP 500.

## Quyết định

1. **API Validation Pipe chung (`UuidParamPipe`)**:
   - Tạo pipe `UuidParamPipe` tại `apps/api/src/common/pipes/uuid-param.pipe.ts` kiểm tra định dạng UUID (chuẩn RFC 4122 / RFC 9562 UUIDv7).
   - Áp dụng `UuidParamPipe` trên tất cả các route nhận tham số `id` trong `VocabController` (`datasets/:id/*`) và `CommunityController` (`questions/:id/discussions`, `comments/:id/reports`, v.v.).
   - Khi id sai định dạng, API trả về ngay lập tức HTTP 400 Bad Request (hoặc 404 Not Found), tuyệt đối không bao giờ để lọt xuống tầng cơ sở dữ liệu gây lỗi 500.
   - Bổ sung kiểm tra `isUuid` tại tầng service (`CorpusService`, `CommunityService`) như lớp bảo vệ thứ hai.

2. **Khởi tạo dữ liệu tập ngữ liệu chuẩn (Corpus Dataset)**:
   - Trong `CorpusService.listDatasets()`, nếu hệ thống chưa có dataset nào, tự động khởi tạo tập ngữ liệu chuẩn `018e0000-0000-7000-8000-0000000000d1` ("Tập ngữ liệu đề thi JLPT N1–N5") với UUID hợp lệ.

3. **Giao diện Web (`apps/web`)**:
   - `CorpusClient`: Thêm phương thức `listDatasets()` gọi `GET /api/v1/datasets`. Bỏ toàn bộ giá trị mặc định viết cứng `jlpt-official`.
   - `VocabExplorer` (`/tu-vung`): Bỏ hoàn toàn hằng số `DEFAULT_VOCAB_TERMS`. Trạng thái khởi tạo là mảng rỗng `[]`. Tự động gọi `listDatasets()` để lấy `datasetId` thật dạng UUID, sau đó gọi `getVocabulary(datasetId, level)`.
   - `GrammarExplorer` (`/ngu-phap`): Bỏ hoàn toàn hằng số `DEFAULT_GRAMMAR_PATTERNS`. Trạng thái khởi tạo là mảng rỗng `[]`. Lấy `datasetId` thật từ API danh sách dataset.
   - `FrequencyStatsView` (`/thong-ke-tu-vung`): Bỏ toàn bộ mảng mẫu `DEFAULT_FREQUENCY_STATS`, `DEFAULT_LEVEL_COMPARISONS`, `DEFAULT_YEARLY_TRENDS`. Lấy `datasetId` thật từ API.
   - `DiscussionsPage` (`/thao-luan`): Bỏ hoàn toàn mã viết cứng `q-default-1`. Khởi tạo `questionId` là chuỗi rỗng `''`. Chỉ gọi API khi có `questionId` hợp lệ dạng UUID (từ URL param `?questionId=...` hoặc tự động phát hiện câu hỏi đã thi xong từ `/api/v1/me/attempts`). Khi người dùng nhập mã câu hỏi thủ công, kiểm tra định dạng UUID trước khi gửi yêu cầu.

4. **Kiểm tra và kiểm thử**:
   - Thêm unit test cho `UuidParamPipe` kiểm tra các trường hợp UUID hợp lệ và không hợp lệ.
   - Thêm test API trong `vocab.test.ts` và `community.test.ts` xác nhận id sai định dạng trả 400/404, không bao giờ 500.
   - Thêm test web trong `apps/web/tests/i11-no-hardcoded-500.test.tsx` kiểm tra các component không dùng dữ liệu viết cứng và lấy ID thật.
   - Thêm Playwright E2E test trong `tests/playwright/integration.spec.ts` xác nhận luồng người dùng trên 3 trang không có bất kỳ request API nào trả về 5xx.
   - Đảm bảo `pnpm check:no-mock-ui` và các cổng kiểm tra chung đều pass.
