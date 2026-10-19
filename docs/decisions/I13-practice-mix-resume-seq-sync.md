# Quyết định kiến trúc I13: Khắc phục đồng bộ Sequence khi tiếp tục bài dở và Bảo mật chia sẻ đề trộn

## Bối cảnh và vấn đề

Trong đợt nghiệm thu I13-6, reviewer W2 đã phát hiện một số vấn đề liên quan đến trạng thái phiên làm bài dở dang (PRA-10, PRA-17) và modal chia sẻ đề trộn (MIX-14):

1. **[P1] Lệch Sequence khi tiếp tục phiên làm bài (Sequence Drift on Resume):**
   - Trong `PracticeRunner`, `lastSeqRef` khởi tạo cứng là `useRef<number>(0)`.
   - Khi học viên tiếp tục làm bài (`resumeAttempt`), server trả về `lastSeq` hiện tại (ví dụ: `lastSeq = 1`).
   - Khi chọn phương án cho câu hỏi kế tiếp, client gửi `PUT /sheet` với `seq = 1`.
   - Backend `attempt.service.ts` kiểm tra điều kiện `input.seq > sheet.lastSeq`; do `seq <= sheet.lastSeq` nên server bỏ qua cập nhật `sheet.answers`.
   - Khi học viên bấm "Kiểm tra đáp án ngay (PRA-10)", backend kiểm tra thấy `answers[index] === 0` và trả về lỗi 422 `QUESTION_UNANSWERED`.
   - Khi nộp bài (`submitAttempt`), các câu trả lời sau resume cũng bị mất.

2. **[P1] Test E2E chưa kiểm tra hành vi tương tác sau khi tiếp tục bài dở:**
   - Trong `tests/playwright/integration.spec.ts`, test AC1 sau khi bấm nút resume chỉ kiểm tra `practice-runner-container` hiển thị mà chưa chọn đáp án mới và kiểm tra kết quả `POST /check`.

3. **[P2] Race condition giữa `updateAnswerSheet` và `checkAnswer`:**
   - Trong `handleOptionSelect`, `apiClient.updateAnswerSheet` được gọi bất đồng bộ mà không lưu pending promise. Nếu học viên bấm đáp án rồi lập tức bấm "Kiểm tra đáp án ngay", request `POST /check` có thể tới trước khi `PUT /sheet` hoàn tất ghi nhận vào DB.

4. **[P2] Fallback về `examId` thô trong `ShareExamModal`:**
   - Trong `ShareExamModal`, `const shareToken = token || examId` sử dụng fallback về `examId` khi `token` chưa được tạo hoặc API lỗi.
   - Endpoint `/shared-exams/:token` tra cứu theo `sha256(token)` trong bảng `exam_shares`, do đó truy cập bằng `examId` thô sẽ dẫn đến lỗi 404 NOT_FOUND.

5. **[P2] Quay lại câu 1 thay vì câu hỏi chưa hoàn thành khi tiếp tục bài dở:**
   - `currentIndex` luôn khởi tạo bằng 0, khiến học viên phải bấm duyệt lại từ câu đầu tiên dù đã làm trước đó.

## Giải pháp kỹ thuật

### 1. Đồng bộ `initialSeq` và lưu trạng thái `activeSeq`
- Mở rộng interface `PracticeRunnerProps` với thuộc tính `initialSeq?: number`.
- Khởi tạo `const lastSeqRef = useRef<number>(initialSeq ?? 0);`.
- Trong `apps/web/app/(practice)/luyen-tap/page.tsx`, lưu `resumeRes.lastSeq` vào state `activeSeq` và truyền vào `<PracticeRunner key={activeAttemptId || 'new'} initialSeq={activeSeq} ... />`.
- Đảm bảo khi tạo mới phiên, `activeSeq` là 0, và khi tiếp tục phiên dở, `activeSeq` nhận giá trị chính xác từ DB.

### 2. Theo dõi `pendingSyncRef` trước khi kiểm tra đáp án hoặc nộp bài
- Khởi tạo `const pendingSyncRef = useRef<Promise<unknown> | null>(null);`.
- Trong `handleSelectOption`, gán `pendingSyncRef.current = apiClient.updateAnswerSheet(...)`.
- Trong `handleCheckAnswer` và `handleNext` (submit), thực hiện `if (pendingSyncRef.current) await pendingSyncRef.current;` trước khi gửi request tiếp theo tới server.

### 3. Tự động định vị tới câu hỏi chưa trả lời đầu tiên
- Trong `PracticeRunner`, khởi tạo `currentIndex` bằng `initialAnswers.findIndex((a) => a === 0)`.
- Nếu tìm thấy câu hỏi chưa làm (`index >= 0 && index < flatQuestions.length`), người dùng được đưa thẳng tới câu hỏi này, giữ nguyên luồng học liền mạch.

### 4. Loại bỏ fallback `examId` trong `ShareExamModal`
- Gỡ bỏ `token || examId`, chỉ hiển thị input chia sẻ và nút sao chép khi `token` hợp lệ đã được API `/generated-exams/:id/shares` trả về thành công.
- Hỗ trợ prop `initialToken?: string` phục vụ SSR và các trường hợp đề đã có token sẵn.
- Khi đang tạo hoặc có lỗi, hiển thị rõ trạng thái loading hoặc thông báo lỗi thân thiện, không để lộ mã định danh nội bộ.

### 5. Tăng cường kịch bản kiểm thử E2E Playwright
- Trong `tests/playwright/integration.spec.ts`, sau khi resume bài thi dở dang, bổ sung các bước:
  1. Chọn phương án cho câu hỏi hiện tại (`[data-testid="practice-option-1"]`).
  2. Bấm nút "Kiểm tra đáp án ngay" (`[data-testid="practice-check-answer-btn"]`).
  3. Bắt và xác nhận phản hồi `POST /check` thành công (`res.ok() === true`).
  4. Xác nhận hiển thị rõ kết quả giải thích (`[data-testid="practice-check-result"]`).
