# Quyết định kiến trúc I21: Cho phép đề gốc lệch số câu so với số tham chiếu của Blueprint

## Bối cảnh và vấn đề

Hàm `validateExamAgainstBlueprint` (`packages/content-tools/src/blueprint-validator.ts`) trước đây kiểm tra nghiêm ngặt tính đồng nhất giữa đề thi và Blueprint:
1. So khớp chính xác tổng số câu hỏi (`exam.totalQuestions === expectedTotalQuestions`).
2. So khớp chính xác số câu hỏi trong từng dạng bài (`actualCount === m.questionCount` cho từng `mondaiType`).

Tuy nhiên, theo thông tin chính thức từ Hiệp hội Giáo dục Quốc tế Nhật Bản (JEES) và The Japan Foundation trên trang jlpt.jp, số lượng câu hỏi công bố cho từng dạng 問題 của các cấp độ chỉ mang tính chất tham chiếu ước lượng (**目安 - meyasu**). Các đề thi thật qua từng năm có thể có độ lệch câu hỏi nhất định (ví dụ: đề JLPT N3 thực tế tháng 7/2023 có 問題3 contextual gồm 10 câu thay vì 11 câu như số tham chiếu).

Do cơ chế cũ coi mọi sự khác biệt về số lượng câu hỏi là lỗi (`error`), các đề thi JLPT thật của các năm khác bị từ chối nhập hoặc bị hạ cấp readiness thành `INVALID`, ngăn cản luồng duyệt và xuất bản đề thi thật.

## Quyết định kỹ thuật

### 1. Phân tách quy tắc kiểm tra theo loại đề thi (`exam.kind`)

- **Với đề thi gốc (`exam.kind === 'original'`):**
  - Blueprint chỉ đóng vai trò khung cấu trúc sườn (structural skeleton):
    1. Bắt buộc đủ các phần thi (`sections`) theo chuẩn cấp độ và đúng thứ tự quy định.
    2. Mọi `mondaiType` có trong đề phải nằm trong danh mục dạng bài cho phép của phần thi đó trong Blueprint.
  - Sự sai lệch về:
    - Số câu hỏi ở từng `mondaiType` (`actualCount !== m.questionCount`),
    - Tổng số câu hỏi (`exam.totalQuestions !== expectedTotalQuestions`),
    - Thời lượng phần thi (`examSec.durationSec !== bpSec.durationSec`),
    chỉ được xem là **cảnh báo (`warning`)**, không phải lỗi (`error`).
  - Nội dung cảnh báo ghi rõ số câu thực tế và số câu tham chiếu của Blueprint theo định dạng `actual/reference` (ví dụ: `10/11`, `95/96`).
  - Cảnh báo này **không chặn** quá trình nhập liệu, kiểm duyệt hay xuất bản đề thi (`readiness` vẫn đạt `READY_FOR_REVIEW` nếu không có lỗi nào khác).
  - Thiếu hẳn một phần thi (ví dụ thiếu `listening`), sai thứ tự phần thi, hoặc xuất hiện `mondaiType` không thuộc Blueprint vẫn là **lỗi (`error`)** và chặn nhập (`readiness: INVALID`).

- **Với đề tự biên tập, luyện tập hoặc trộn (`exam.kind !== 'original'`):**
  - Tiếp tục áp dụng đối chiếu nghiêm ngặt số lượng câu hỏi như trước đây: sai khác số câu từng dạng hoặc tổng số câu là lỗi (`error`).

### 2. Đề trộn (`kind === 'mixed'`) sinh đúng số câu tham chiếu

- Bộ sinh đề trộn `generateMixedExam` (`packages/exam-engine/src/mix/generator.ts`) sử dụng Blueprint làm định mức chuẩn. Khi sinh đề trộn từ ngân hàng câu hỏi, hệ thống phân bổ chỉ tiêu số câu theo trọng số các nguồn và chọn đúng chính xác số câu tham chiếu của Blueprint cho từng dạng bài và tổng đề.

### 3. Quy đổi điểm số của đề gốc theo số câu thực tế

- Hàm chấm điểm `calculateStandardExamResult` (`packages/exam-engine/src/scoring.ts`) tính toán điểm quy đổi (scaled score) trên thang điểm chuẩn (ví dụ 60 điểm cho mỗi phần điểm) dựa trên tỷ lệ số câu đúng trên **số câu thực tế của phần thi** (`rawMax`), không chia theo số câu tham chiếu của Blueprint:
  $$\text{scaled} = \text{round}\left(\frac{\text{raw}}{\text{rawMax}} \times \text{maxScaled}\right)$$
  với `rawMax` được tính bằng số câu thực tế xuất hiện trong `answerKey` của thí sinh.

### 4. Cập nhật tài liệu chuẩn nhập liệu

- Bổ sung mục `3.3. Quy tắc đối chiếu Blueprint: Đề gốc được lệch số câu tham chiếu (Task I21)` vào `docs/import-format/README.md` để hướng dẫn đội ngũ nhập liệu và chủ dự án.

## Nghiệm thu và Bằng chứng kiểm thử

Bổ sung test suite toàn diện tại `packages/content-tools/tests/blueprint-deviation.test.ts` và `apps/api/src/modules/scoring/blueprint-deviation.test.ts` đáp ứng trọn vẹn 4 tiêu chí nghiệm thu của task I21:
1. Đề N3 có 問題3 gồm 10 câu (tham chiếu 11 câu) nhập thành công, `valid: true`, `readiness: READY_FOR_REVIEW`, sinh warning nêu rõ `10/11` (`packages/content-tools/tests/blueprint-deviation.test.ts`).
2. Đề N3 thiếu phần `listening` hoặc có `mondaiType` lạ (`task_based` trong phần từ vựng) bị báo lỗi, `valid: false`, `readiness: INVALID` (`packages/content-tools/tests/blueprint-deviation.test.ts`).
3. Bộ sinh đề trộn `generateMixedExam` cho đề N3 sinh đúng chính xác số câu tham chiếu (tổng 96 câu, 問題3 đúng 11 câu) (`apps/api/src/modules/scoring/blueprint-deviation.test.ts`).
4. Chấm điểm đề gốc sử dụng số câu thực tế (`rawMax = 10`), điểm quy đổi hoàn hảo đạt 60/60 (thay vì bị giảm còn 55 nếu chia sai cho 11) (`apps/api/src/modules/scoring/blueprint-deviation.test.ts`).
