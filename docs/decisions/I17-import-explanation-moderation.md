# Quyết định kiến trúc I17: Tích hợp lời giải và transcript trong gói nhập vào quy trình duyệt và hiển thị

- Task ID: `I17`
- Worker: `W2`
- Ngày: 2026-10-20
- Trạng thái: ĐÃ DUYỆT (ACCEPTED)

## 1. Bối cảnh & Vấn đề

1. Trước đây `import.service.ts` lưu `question.explanation` (`{ locale, blocks }`) vào bảng `question_versions.explanation`. Tuy nhiên, màn hình kiểm duyệt lời giải của quản trị (`/reviews/explanations`) và API xem lại bài của học viên (`/attempts/:id/explanations/:index`) chỉ đọc từ bảng `explanation_versions` (với các trường cấu trúc `content.correctReason`, `wrongReasonsByOption`, `translation`, `status: 'approved'`). Do đó, lời giải trong gói nạp không bao giờ được chuyển thành bản ghi lời giải để kiểm duyệt hay hiển thị cho học viên.
2. Script bài nghe: `group.transcript` (RichText) trong các nhóm bài nghe của gói nạp trước đây bị importer bỏ qua, không được gắn vào lời giải của câu hỏi nghe.
3. Nguyên tắc bảo mật đề thi (EXAM-21, AUDIO-08, RESULTS_EMBARGOED):
   - Đề thi lúc đang làm bài tuyệt đối không được lộ đáp án, lời giải, hay script bài nghe qua snapshot hay API làm bài.
   - Học viên chỉ được xem lời giải sau khi đã nộp bài (`status: 'submitted'`) và lời giải đã được reviewer phê duyệt (`status: 'approved'`).
   - Kiểm duyệt lời giải tuân thủ nguyên tắc kiểm duyệt chéo hai người (four-eyes principle): người nạp/biên soạn không được tự duyệt lời giải của chính mình.

## 2. Giải pháp đã thực hiện

### 2.1. Module tách tiền tố lời giải (`apps/api/src/modules/import/explanation-parser.ts`)

- Hàm thuần `parsePackageExplanation(explanation, groupTranscript)`:
  - Phân tích đoạn theo các tiền tố quy chuẩn:
    - `• Dịch nghĩa:` -> `translation` (RichText dạng `[{ t: 'text', text: ... }]`) và `translationVi` (chuỗi văn bản phẳng).
    - `• Đáp án đúng: [n]` + phần sau -> `correctReason` (RichText).
    - Đoạn `• Phân tích các phương án còn lại:` -> duyệt từng dòng theo mẫu `- [n] ...: ...` để trích xuất vào `wrongReasonsByOption[n]`.
  - Fallback an toàn: Nếu nội dung không khớp các tiền tố trên, giữ nguyên toàn bộ `blocks` gốc trong `content.blocks` và dùng toàn bộ văn bản của các block làm `correctReason`.
  - Tự động sinh `explanationMarkdown` tổng hợp định dạng markdown chuẩn (`**Lý do đúng**: ...`, `**Phân tích các phương án còn lại**: ...`, `**Bản dịch**: ...`, `**Script bài nghe**: ...`) để phục vụ màn hình duyệt trực quan.

### 2.2. Trích xuất transcript cho câu hỏi nghe (AUDIO-08)

- Với các câu hỏi thuộc nhóm nghe (`listening`) có `group.transcript`:
  - Kể cả khi câu hỏi chưa có `explanation` riêng, hệ thống tự động tạo một bản nháp `explanation_versions` (`status: 'draft'`, `authorId = uploadedByUserId`) với `content.transcript = group.transcript`.
  - Màn hình duyệt và trang xem lại bài của học viên sẽ hiển thị script nghe theo quy tắc giấy phép (`transcriptAllowed !== false && revokedAt === null`).

### 2.3. Khớp nối quy trình duyệt quản trị (`apps/api/src/modules/review/review.service.ts`)

- Trong `ReviewService.listExplanations`:
  - Thực hiện left-join bảng `schema.questions` và `schema.users` để bổ sung `level` (`N5`..`N1`) và `authorName` (tên người nạp đề).
  - Ánh xạ trạng thái hiển thị cho UI quản trị: các bản ghi trong DB có trạng thái `'draft'` được trả về với `status: 'pending'` (và kèm `rawStatus: 'draft'`) để giao diện Admin Portal hiển thị nút "Duyệt" và "Từ chối" đúng thiết kế.
  - Bộ lọc `status` trong `listExplanations` hỗ trợ tìm kiếm cả `'pending'` lẫn `'draft'`.

### 2.4. Bảo mật dữ liệu đề thi và chống lộ thông tin

- `getExamSnapshot` (API phục vụ phòng thi): Snapshot cấu trúc đề chỉ chứa câu hỏi, phương án, media công khai; tuyệt đối không chứa `transcript` hay `correctReason`.
- `getLearnerExplanation`:
  - Yêu cầu xác thực chủ sở hữu lượt thi (`userId` hoặc `guestId`).
  - Chế độ thi thật (`real`): Kiểm tra bắt buộc `attempt.status === 'submitted'`. Nếu lượt thi còn đang làm bài (`in_progress`), API ném lỗi `ConflictException` (`RESULTS_EMBARGOED`).
  - Chỉ trả về lời giải khi có phiên bản `explanation_versions` với `status === 'approved'`. Nếu chưa duyệt, trả về `hasExplanation: false, explanation: null`.

## 3. Bằng chứng nghiệm thu

1. `apps/api/src/modules/import/explanation-parser.test.ts`: 5/5 unit tests đạt chuẩn, kiểm tra đầy đủ việc tách tiền tố, fallback an toàn, và gắn transcript bài nghe.
2. `apps/api/src/modules/import/import-explanations.test.ts`: 4/4 integration tests đạt chuẩn:
   - AC1: Nạp gói có explanation tách tiền tố -> màn duyệt hiện bản nháp với bản dịch, lý do đúng, lý do sai từng phương án.
   - AC2: Reviewer duyệt -> học viên hiện đủ lời giải; chưa duyệt thì không hiện; editor không thể tự duyệt.
   - AC3: Test âm: không lộ lời giải trước khi nộp bài (`RESULTS_EMBARGOED`).
   - AC4: Gói có group nghe kèm transcript -> màn duyệt và trang xem lại bài hiện script; API làm bài không trả transcript.
3. `tests/playwright/integration.spec.ts`: Bổ sung test case E2E Playwright `I17 E2E` kiểm tra quy trình duyệt tại `/reviews/explanations` và an toàn API.
