# Quyết định kiến trúc I13: Nối API thật cho trang Luyện tập và Đề trộn

## Bối cảnh và vấn đề

Trang `/luyen-tap` trước đây vẫn import `ALL_SAMPLE_EXAMS` từ fixture mẫu (`apps/web/features/exam/fixtures`), dẫn đến phụ thuộc vào dữ liệu viết cứng và vi phạm nguyên tắc kiểm tra tích hợp thật.
Đồng thời, học viên cần khả năng:
1. Tạo bài luyện tập (PRA-10) theo kỹ năng, số câu hỏi, độ khó, kiểm tra đáp án tức thì có giải thích chi tiết, và tiếp tục phiên làm bài dở (PRA-17).
2. Tạo đề trộn (MIX-13..15) bằng các thuật toán (Random, Balanced, Weakness, Unseen, Challenge, Revision, Custom) hoặc Trộn nhanh 1 chạm (Quick Mix), sau đó chia sẻ liên kết cho người khác (MIX-14) với cấu trúc đề và seed bất biến.
3. Không để lộ đáp án trước khi học viên nộp hoặc kiểm tra từng câu, tuân thủ nghiêm ngặt bảo mật bài thi.
4. Xóa bỏ hoàn toàn fixtures khỏi bundle chạy thật của `apps/web/`, loại bỏ các route vi phạm khỏi `tests/integration/mock-ui-baseline.json`.

## Quyết định kỹ thuật

### 1. Di chuyển toàn bộ fixtures sang thư mục test
- Chuyển `apps/web/features/exam/fixtures/*` sang `apps/web/tests/fixtures/*`.
- Cập nhật toàn bộ các file test import sang đường dẫn mới.
- Xóa 2 mục vi phạm `apps/web/features/exam/fixtures/exam-fixtures.ts` và `sample-exam.ts` khỏi `tests/integration/mock-ui-baseline.json`.
- Chạy `pnpm check:no-mock-ui` kiểm tra nghiêm ngặt: không phát hiện vi phạm mới ngoài baseline.

### 2. Tự động suy diễn `mondaiTypes` từ `skills`
- Schema API `PracticeConfigSchema` và `MixConfigSchema` yêu cầu mảng `mondaiTypes: MondaiType[]`.
- Nếu người dùng chỉ chọn kỹ năng tổng quát (ví dụ: Chữ Hán, Từ vựng, Ngữ pháp, Đọc hiểu, Nghe hiểu) mà không chọn chi tiết từng dạng bài, client tự động suy diễn mảng `mondaiTypes` tương ứng qua bảng tra `SKILL_MONDAI_TYPES`.
- Điều này ngăn chặn tình trạng `mondaiTypes: []` làm bộ lọc `parsedConfig.mondaiTypes.includes(g.mondaiType)` loại bỏ toàn bộ câu hỏi và gây lỗi `POOL_SHORTAGE`.

### 3. Quy trình Luyện tập chuyên đề (PRA) & Tiếp tục bài thi dở (PRA-17)
- Khi tạo bài luyện, client gọi `POST /api/v1/practice-exams`, sau đó khởi tạo phiên làm bài bằng `ExamApiClient.initAttempt({ mode: 'practice' })`.
- Kiểm tra đáp án tức thì gọi `POST /api/v1/attempts/:id/check`, hiển thị kết quả và giải thích mà không lộ các câu hỏi chưa làm.
- Danh sách bài dở được tải qua `GET /api/v1/me/practice-sessions/in-progress`. Nút tiếp tục gọi `ExamApiClient.resumeAttempt(attemptId)`, lấy snapshot url và tải lại giao diện `PracticeRunner` với câu hỏi và các đáp án đã chọn trước đó.

### 4. Quy trình Trộn đề (MIX) & Chia sẻ đề thi (MIX-14)
- Hỗ trợ trộn tùy chỉnh qua `POST /api/v1/mixed-exams` và trộn nhanh 1 chạm qua `POST /api/v1/mixed-exams/quick`.
- Modal chia sẻ gọi `POST /api/v1/generated-exams/:id/shares` để lấy token chia sẻ có thời hạn.
- Trang người nhận `/shared-exams/[token]` gọi `GET /api/v1/shared-exams/:token` (endpoint công khai) để hiển thị thông tin đề thi và điều hướng vào phòng thi `/phong-thi?examId=...`.

### 5. Khả năng đáp ứng (Responsive) & Đa ngôn ngữ (i18n)
- Giao diện đạt chuẩn hiển thị ở cả 390px (Mobile) và 1366px (Desktop), đảm bảo không có thanh cuộn ngang (`scrollWidth <= innerWidth + 1`).
- Đầy đủ bản dịch trong `vi.json`, `ja.json`, `en.json`, không để lọt raw translation keys.

### 6. Xử lý thiếu hụt câu hỏi (Shortage UX) & Độ ổn định bộ lọc
- Cấu hình mặc định của trang Luyện tập sử dụng kho ngẫu nhiên (`random`), tránh việc cạn kiệt kho câu hỏi chưa gặp (`unseen`) khi một tài khoản kiểm thử làm nhiều lần liên tiếp qua các trình duyệt và thiết bị khác nhau.
- Bổ sung bộ phân tích chi tiết lỗi `POOL_SHORTAGE` từ mảng `shortages` của API, cho phép nút "Luyện tập với X câu hiện có" (`shortage-proceed-btn`) tự động sinh đề với số lượng câu thực tế có trong ngân hàng.
- Bộ kiểm thử E2E Playwright chọn kho ngẫu nhiên (`practice-pool-random`) và có nhánh xử lý tiếp tục với câu hỏi hiện có khi ngân hàng câu hỏi bị hạn chế bởi dữ liệu seed tối thiểu.

