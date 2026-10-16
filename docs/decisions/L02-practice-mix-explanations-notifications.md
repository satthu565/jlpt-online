# Quyết định kỹ thuật L02: API Luyện trộn, Giải thích và Thông báo

## 1. Bối cảnh
Task L02 giao cho Worker W2 triển khai API thi luyện tập (practice), thi trộn đề (mix), ngân hàng giải thích & kiểm duyệt (explanations & moderation), cùng hệ thống cấu hình thông báo và gửi lịch trình (notifications & preferences).

Các tiêu chí nghiệm thu chính:
1. `Check chỉ trả câu đã trả lời ở practice; không mở answer key thi thật` (PRA-10).
2. `Chia sẻ đề không vượt license và owner scope` (MIX-17).
3. `Thông báo opt-out quiet hours idempotent` (NOTI-03..NOTI-10).
4. `Qbank tracks generated-exam usage` (QB-18, MIX-13).

## 2. Kiến trúc giải pháp

### 2.1. Module Practice & Mix (`apps/api/src/modules/exam/`)
- Tích hợp trực tiếp engine thuần `@jlpt/exam-engine` (`generatePracticeExam`, `generateMixedExam`).
- **Lưu trữ đề sinh (`generated_exams`)**:
  - Mỗi lần tạo đề luyện hoặc đề trộn thành công, hệ thống ghi bản ghi bất biến vào `generated_exams` (seed, configJson, engineVersion, selectionHash) và các câu hỏi tương ứng vào `generated_exam_items (generatedExamId, questionId, orderIndex)`.
  - Cập nhật lượt tiếp cận câu hỏi trong `question_exposures (userId, questionId, exposureCount)`.
  - Đồng thời tạo bản ghi đề thi tương ứng trong `exams` với `kind: 'practice'` hoặc `kind: 'mixed'` kèm phiên bản, sections, items và answer key để học viên có thể bắt đầu làm bài ngay qua `POST /attempts`.
- **Chế độ kiểm tra câu hỏi tức thì (`POST /attempts/:id/check`)**:
  - Chỉ cho phép trong `mode = 'practice'`. Nếu `mode = 'real'`, trả về lỗi `403 FORBIDDEN` ngay lập tức.
  - Chỉ kiểm tra và trả lời đúng/sai cho câu hỏi mà học viên đã chọn đáp án (`answers[index] > 0`). Nếu chưa chọn, trả về `422 QUESTION_UNANSWERED`.
  - Tuyệt đối không trả về toàn bộ answer key hay đáp án của các câu khác.
- **Chia sẻ đề qua liên kết (`POST /generated-exams/:id/shares` & `GET /shared-exams/:token`)**:
  - Chỉ chủ sở hữu (owner) của đề thi đã sinh mới được tạo liên kết chia sẻ.
  - Kiểm tra bản quyền (license) của toàn bộ các câu hỏi trong đề: nếu bất kỳ câu hỏi nào có `remixAllowed === false`, `displayAllowed === false`, hoặc license đã hết hạn/bị thu hồi, từ chối chia sẻ với lỗi `403 FORBIDDEN` / `422 LICENSE_RESTRICTION`.
  - Sinh token ngẫu nhiên an toàn bằng `crypto.randomBytes(32)`, lưu mã băm SHA-256 vào `exam_shares`.
  - Endpoint công khai `GET /shared-exams/:token` trả về thông tin metadata của đề (tiêu đề, cấp độ, số câu, thời lượng) nhưng không lộ bảng đáp án. Người nhận muốn làm bài vẫn phải bắt đầu attempt thông thường theo đúng chính sách cấp quyền.

### 2.2. Module Giải thích & Kiểm duyệt (`apps/api/src/modules/review/`)
- **Phiên bản hóa và nội dung giải thích (`explanation_versions`)**:
  - Lưu trữ theo phiên bản tăng dần cho từng câu hỏi với nội dung JSON chuẩn: `correctReason`, `wrongReasonsByOption`, `translation`, `furigana`, `vocabTags`, `grammarTags`, `readingAnalysis`, `transcript`, `evidenceRanges`.
- **Kiểm duyệt bốn mắt (`EXPL-13`)**:
  - Nguyên tắc bắt buộc: tác giả không được tự duyệt giải thích của chính mình (`reviewerId !== authorId`). Nếu cố tình tự duyệt, trả về lỗi `400 BAD_REQUEST` / `403 FORBIDDEN`.
  - Khi duyệt thành công (`status = 'approved'`), ghi nhận lịch sử vào `content_reviews`.
- **Xem lời giải bài thi (`GET /attempts/:id/explanations/:index`)**:
  - Trong lúc đang thi thật (`mode = 'real'` và `status = 'in_progress'`), chặn truy cập với lỗi `403 FORBIDDEN`.
  - Kiểm tra bản quyền transcript (AUDIO-08): nếu nguồn âm thanh/câu hỏi có `transcriptAllowed === false`, lược bỏ transcript trong phản hồi.
  - Khi transcript được phép, trả kèm dải vị trí bằng chứng (`evidenceRanges`) và timeline đồng bộ với âm thanh (AUDIO-09).
- **Báo cáo nội dung (`POST /content-reports`)**:
  - Cho phép người học gửi báo cáo sai sót cho câu hỏi hoặc lời giải, lưu vào `question_reports` kèm giới hạn tần suất gửi (rate limiting).

### 2.3. Module Thông báo & Lịch trình (`apps/api/src/modules/notification/`)
- **Cấu hình tùy chọn thông báo (`notification_preferences`)**:
  - Hỗ trợ bật/tắt theo kênh và theo từng loại sự kiện cụ thể (`practice_reminder`, `new_exam`, `srs_due`, `weekly_stats`, `target_exam_reminder`, `exam_result_released`, `payment_status`).
  - Hỗ trợ khung giờ yên tĩnh `quietHours` (`start: "HH:mm"`, `end: "HH:mm"`) và múi giờ (`timezone`).
- **Xử lý Quiet Hours và Tính lũy đẳng (Idempotency)**:
  - Trước khi gửi thông báo không khẩn cấp (nhắc học, đề mới, thống kê tuần), kiểm tra giờ địa phương của người dùng theo múi giờ đã cấu hình. Nếu rơi vào khung giờ yên tĩnh (ví dụ: từ 22:00 đến 07:00), hoãn gửi (`status: 'deferred_quiet_hours'`) và lên lịch gửi vào cuối khung giờ yên tĩnh.
  - Thông báo khẩn cấp giao dịch (thanh toán, bảo mật) được gửi ngay lập tức, không bị chặn bởi quiet hours.
  - Hỗ trợ khóa chống trùng lặp (`dedupeKey`): nếu cùng một sự kiện đã được lập lịch hoặc gửi trong cùng chu kỳ, hệ thống sẽ bỏ qua (`status: 'duplicate_suppressed'`), đảm bảo không gửi trùng lặp email/push.
