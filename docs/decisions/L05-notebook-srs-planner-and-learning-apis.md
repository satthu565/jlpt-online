# Quyết định kỹ thuật L05: Notebook SRS Learning APIs và Planner

- **Task:** L05
- **Worker:** W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Assignment ID:** L05-4
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Tính năng liên quan:**
  - Từ vựng, Sổ tay, SRS, Flashcard, TTS: `VOC-01` đến `VOC-18`
  - Lộ trình học, Kế hoạch 30/60/90 ngày, Thống kê Readiness: `PLAN-01` đến `PLAN-12`
- **Dependencies:** N05, L01, N02 (đã merge và kế thừa hợp đồng DB/Schema).
- **Điều kiện ngoài (External Status):**
  - `dictionary`: MISSING (`BLOCKED_EXTERNAL`) - Đã hoàn thiện VocabService sandbox/fallback với cấu trúc ngữ liệu và tra cứu từ vựng; chặn dịch vụ live production dictionary API.
  - `tts-provider`: MISSING (`BLOCKED_EXTERNAL`) - Đã hoàn thiện TTSService sandbox với kiểm tra bản quyền `Open-Voice-License-1.0`, attribution và quota; chặn dịch vụ cloud TTS provider live.

---

## 1. Bối cảnh và nguyên tắc chỉ đạo

1. **Phạm vi L05:**
   - Triển khai các API phục vụ học tập cá nhân hóa:
     - `apps/api/src/modules/learning/`: Sổ tay học tập (Notebook CRUD), flashcards tự động, kiểm tra trắc nghiệm 4 đáp án (Quiz generator), xuất dữ liệu CSV an toàn, tổng hợp giọng đọc TTS có kiểm soát bản quyền, và thuật toán lặp lại ngắt quãng SRS (FSRS/SM-2).
     - `apps/api/src/modules/planner/`: Lập kế hoạch học tập 30/60/90 ngày theo mục tiêu kỳ thi JLPT N1–N5, điều chỉnh phân bổ thời gian cho kỹ năng yếu, tính toán đếm ngược theo timezone của học viên, tự động tái lập lịch khi bỏ lỡ buổi học (replanning), theo dõi streak và tỷ lệ hoàn thành.
     - `apps/api/src/modules/stats/`: Đánh giá độ sẵn sàng thi (Readiness), tổng hợp dữ liệu tốc độ/độ chính xác, thống kê thay đổi đáp án, tiến độ thực chất (true progress) và cập nhật độ khó câu hỏi.
2. **Quy tắc và tiêu chí nghiệm thu bắt buộc:**
   - **Acceptance 1:** Cross-device review duplicate không nhân đôi lịch.
   - **Acceptance 2:** Timezone goal dates và missed-session replanning có deterministic tests.
   - **Acceptance 3:** No-data readiness không bịa kết quả.
   - **Acceptance 4:** CSV formula injection neutralized; TTS license kiểm tra.
3. **Tuân thủ ranh giới và kiến trúc:**
   - Không vi phạm `allowedPaths`. Chỉ sửa đổi các module được giao (`learning`, `planner`, `stats`) và `package.json` để bổ sung lệnh kiểm tra.
   - Không dùng `any` hay `@ts-ignore`. TypeScript strict 100%.
   - Bảo toàn chuẩn Unicode NFC cho văn bản tiếng Nhật.
   - Toàn bộ thời gian trong cơ sở dữ liệu lưu trữ dưới chuẩn UTC; các tính toán chu kỳ học, hạn nộp, và đếm ngược sử dụng timezone của học viên một cách tất định (deterministic).

---

## 2. Thiết kế chi tiết và giải pháp kỹ thuật

### 2.1. SRS và Sổ tay học tập (`apps/api/src/modules/learning/`)

#### A. Thuật toán SRS và chống trùng lặp đa thiết bị (Acceptance 1 & VOC-18)
- **Vấn đề:** Khi học viên sử dụng nhiều thiết bị (web trên máy tính, app trên điện thoại), các lượt ôn tập offline hoặc request gửi đồng thời có thể khiến thẻ từ vựng bị tính điểm nhiều lần, làm sai lệch bước lặp lại (repetition count, interval, ease factor) hoặc nhân đôi lịch thi.
- **Giải pháp:**
  - Mỗi lượt ôn tập gửi lên mang một định danh duy nhất `clientReviewId` (UUID v7 hoặc idempotency key do client sinh ra).
  - Bảng `srs_reviews` lưu trữ `clientReviewId`. Trước khi cập nhật thẻ (`cards`), hệ thống kiểm tra tồn tại của `clientReviewId`.
  - Nếu đã tồn tại bản ghi với `clientReviewId` này:
    - Hệ thống trả về trạng thái hiện tại của thẻ (`isDuplicate: true`) và không tăng `repetitionCount`, không thay đổi khoảng cách lặp lại (`intervalDays`), không dời lịch `dueAt`.
  - Khoảng cách lặp lại được căn chỉnh theo nửa đêm (00:00:00) theo timezone của học viên (`alignIntervalToMidnight`) để toàn bộ thẻ đến hạn trong ngày xuất hiện đồng bộ vào đầu ngày học.

#### B. Sổ tay từ vựng, ngữ pháp, chữ Hán (VOC-06..13, VOC-17)
- CRUD sổ tay hỗ trợ mọi loại kiến thức: `vocab`, `kanji`, `grammar`.
- Lưu trữ nghĩa, cách đọc kana/romaji, cấu trúc ngữ pháp, ví dụ, nhãn (tags), ghi chú cá nhân, và trạng thái `isMastered`.
- Optimistic Concurrency Control thông qua trường `version`, ngăn chặn ghi đè mất mát dữ liệu giữa các thiết bị.
- Tìm kiếm từ vựng linh hoạt theo từ khóa, tags, trạng thái thuần thục.
- `findQuestionExamples`: Tìm kiếm câu hỏi thực tế trong ngân hàng câu hỏi (`questions`, `questionVersions`) có chứa từ vựng đang học để làm ví dụ minh họa ngữ cảnh.

#### C. Sinh Flashcard và Quiz tự động (VOC-10, VOC-11, VOC-14)
- Khi thêm một mục vào sổ tay, hệ thống tự động tạo bộ thẻ Flashcard đa chiều:
  - `term_to_meaning`: Hỏi từ vựng/chữ Hán/ngữ pháp -> Yêu cầu nhớ ý nghĩa.
  - `meaning_to_term`: Cho ý nghĩa -> Yêu cầu nhớ từ gốc.
  - `kanji_to_reading`: Cho chữ Hán -> Yêu cầu nhớ cách đọc Furigana/Kana.
  - `grammar_pattern`: Cho cấu trúc ngữ pháp -> Yêu cầu phân tích ý nghĩa và cách kết nối.
- Module Quiz sinh ngẫu nhiên bài kiểm tra 4 đáp án (1 đáp án đúng + 3 đáp án nhiễu) dựa trên tập từ vựng đã lưu trong sổ tay của người dùng hoặc ngân hàng từ vựng chung.

#### D. Xuất CSV an toàn chống Formula Injection (Acceptance 4 & VOC-15)
- **Vấn đề:** Khi người dùng xuất danh sách từ vựng ra file CSV để nhập vào Anki hoặc Excel/Google Sheets, các từ vựng hoặc ví dụ bắt đầu bằng ký tự công thức (`=`, `+`, `-`, `@`, `\t`, `\r`, `|`, `%`, `;`) có thể kích hoạt thực thi mã độc hoặc rò rỉ dữ liệu (CSV Formula Injection / DDE attack).
- **Giải pháp:**
  - `sanitizeCsvField`: Kiểm tra ký tự đầu tiên của mọi trường dữ liệu. Nếu bắt đầu bằng các ký tự nguy hiểm, tự động chèn tiền tố dấu nháy đơn (`'`) trước khi bao bọc bằng dấu ngoặc kép theo chuẩn RFC 4180.
  - Toàn bộ ký tự ngoặc kép bên trong được escape thành song kép (`""`).

#### E. Tổng hợp giọng đọc TTS và bản quyền (Acceptance 4 & VOC-16)
- **Vấn đề:** Giọng đọc TTS cần tuân thủ giấy phép bản quyền giọng nói, quota ký tự mỗi ngày và có cơ chế fallback khi chưa tích hợp nhà cung cấp live.
- **Giải pháp:**
  - `TTSService` kiểm tra chính sách giấy phép: Cho phép các giọng đọc đạt chuẩn cấp phép `Open-Voice-License-1.0` (như `ja-JP-Standard-A`, `ja-JP-Neural2-F`), từ chối các giọng đọc vi phạm hoặc không có nguồn gốc rõ ràng.
  - Gắn kèm thông tin ghi công (`attribution`) và giới hạn hạn mức ký tự theo ngày (`MAX_DAILY_TTS_CHARS = 20,000`).
  - Khi dịch vụ `tts-provider` ở trạng thái `MISSING`, hệ thống tự động trả về `SANDBOX` stream URL an toàn, không làm ngắt quãng trải nghiệm của người dùng.

---

### 2.2. Lập kế hoạch học tập thông minh (`apps/api/src/modules/planner/`)

#### A. Tính toán mục tiêu và đếm ngược theo Timezone (Acceptance 2 & PLAN-01..05, PLAN-07)
- **Vấn đề:** Ngày thi JLPT thường được ấn định vào một ngày cụ thể (ví dụ Chủ nhật đầu tiên của tháng 7 hoặc tháng 12). Số ngày còn lại phải được tính toán chính xác theo múi giờ địa phương của thí sinh (ví dụ `Asia/Tokyo`, `Asia/Ho_Chi_Minh`, `America/New_York`) để tránh lệch 1 ngày do chuyển đổi UTC.
- **Giải pháp:**
  - `calculateDaysRemaining`: Sử dụng `Intl.DateTimeFormat` để chuyển đổi thời gian hiện tại và thời gian mục tiêu về chuỗi `YYYY-MM-DD` tại múi giờ người dùng, sau đó tính khoảng cách ngày.
  - Phân kỳ lộ trình theo các giai đoạn:
    - 30 ngày: Giai đoạn tăng tốc (Sprint) tập trung ôn tập cấp tốc và luyện đề.
    - 60 ngày: Củng cố ngữ pháp/từ vựng và luyện đề định kỳ.
    - 90 ngày: Xây dựng nền tảng từ vựng, kanji, ngữ pháp, đọc hiểu, nghe hiểu có hệ thống.
  - Tự động phát hiện giai đoạn nước rút (`isFinalSprint = true`) khi kỳ thi chỉ còn <= 7 ngày, chuyển trọng tâm buổi học sang tổng ôn và thi thử.

#### B. Tự động điều chỉnh phân bổ theo kỹ năng yếu (PLAN-06)
- Dựa trên kết quả thống kê của học viên trong `user_skill_aggregates` hoặc điểm số ban đầu, hệ thống tự động tái cân bằng tỷ lệ thời gian giữa 5 kỹ năng (`vocabulary`, `kanji`, `grammar`, `reading`, `listening`).
- Kỹ năng có độ chính xác < 50% được nâng tỷ lệ phân bổ thời gian học; kỹ năng đã thuần thục (> 85%) được duy trì thời gian ôn tập nhẹ nhàng.

#### C. Tái lập lịch buổi học bị bỏ lỡ mang tính tất định (Acceptance 2 & PLAN-10)
- **Vấn đề:** Khi học viên bận rộn và bỏ lỡ các buổi học đã lên lịch, hệ thống cần tính toán lại lịch học cho các ngày tiếp theo mà không làm biến đổi (mutate) các buổi học đã hoàn thành trong quá khứ.
- **Giải pháp:**
  - Hệ thống truy vấn các buổi học chưa hoàn thành có ngày học trước thời điểm hiện tại (`localToday`).
  - Tổng hợp số phút học và mục tiêu bị bỏ lỡ, chia đều vào các ngày học còn lại trước ngày thi.
  - **Bất biến lịch sử (History Immutability):** Hệ thống tăng `version` của kế hoạch học tập, tạo bản ghi mới trong `study_plan_versions` và cập nhật các buổi học tương lai, giữ nguyên 100% dữ liệu các buổi học đã hoàn thành.

#### D. Quản lý Streak và Hoàn thành buổi học (PLAN-08, PLAN-09)
- Ghi nhận trạng thái hoàn thành buổi học (`study_session_completions`) có kiểm tra tính lũy đẳng (idempotent).
- Tính toán chuỗi ngày học liên tục (streak) dựa trên ngày hoàn thành liên tiếp theo múi giờ địa phương.
- Sinh thông báo nhắc nhở (`reminders`) đúng khung giờ học viên đã đăng ký.

---

### 2.3. Đánh giá độ sẵn sàng và Thống kê học tập (`apps/api/src/modules/stats/`)

#### A. Đánh giá độ sẵn sàng không bịa đặt số liệu (Acceptance 3 & PLAN-12)
- **Vấn đề:** Học viên mới tham gia hệ thống hoặc chưa thi thử đủ số đề không thể có dự đoán chính xác về điểm số hoặc khả năng đỗ JLPT. Các hệ thống thông thường hay ước lượng bừa một con số (ví dụ "Bạn có 50% khả năng đỗ"), gây hiểu lầm nghiêm trọng.
- **Giải pháp:**
  - Quy định ngưỡng tối thiểu: Thí sinh phải hoàn thành ít nhất `MIN_EXAMS_FOR_CALIBRATION = 3` đề thi thử hoàn chỉnh mới đủ cơ sở dữ liệu thống kê.
  - Khi số đề thi thử < 3:
    - `isCalibrated: false`
    - `status: UNCALIBRATED_ESTIMATE`
    - Khoảng tin cậy mở rộng tối đa: `confidenceInterval: [0.05, 0.95]`
    - Hiển thị thông báo khuyến cáo minh bạch: yêu cầu học viên làm đủ tối thiểu 3 bài thi chuẩn hóa trước khi thuật toán đưa ra dự đoán.
  - Khi số đề thi thử >= 3:
    - Thuật toán ước lượng xác suất đỗ (`estimatePassProbability`) từ `@jlpt/exam-engine` được kích hoạt với độ hội tụ hẹp (`isCalibrated: true`, trạng thái `CALIBRATED`).

#### B. Tổng hợp tiến độ thực chất và Phân tích thay đổi đáp án (STAT-12)
- Tích hợp các thuật toán thuần từ `@jlpt/exam-engine`:
  - `analyzeSpeedAndAccuracy`: Đo lường số giây tiêu tốn cho mỗi câu hỏi và tỷ lệ chính xác tương ứng theo từng phần thi.
  - `analyzeAnswerChanges`: Đánh giá xu hướng học viên đổi đáp án (từ Sai sang Đúng, Đúng sang Sai, hoặc Sai sang Sai) để đưa ra lời khuyên tâm lý phòng thi.
  - `analyzeUnseenProgress` & `compareTrueProgress`: Phân biệt điểm số đạt được trên câu hỏi mới tinh (unseen) so với câu hỏi đã từng làm qua để phản ánh năng lực thực chất.
- Cập nhật lũy kế `user_skill_aggregates` và `question_difficulty_stats` theo từng câu trả lời gửi lên.

---


---

## 3. Các điểm khắc phục theo phản hồi Reviewer W2 (L05-4)

Trong phiên review trước, reviewer W2 phát hiện 4 điểm cần xử lý:
1. **[P0] Xác thực quyền sở hữu thẻ trong `srs.service.ts`:**
   - *Nguyên nhân:* Trước khi xử lý review, thiếu bước kiểm tra `cards.userId === userId`. Học viên có thể truyền `cardId` của người khác hoặc cardId không tồn tại gây IDOR/500 foreign key error.
   - *Khắc phục:* Bổ sung truy vấn `cards` với `and(eq(cards.id, dto.cardId), eq(cards.userId, userId))` và ném `NotFoundException` ngay nếu không tìm thấy.
   - *Kiểm thử:* Bổ sung test case trong `learning.test.ts` xác thực ném `NotFoundException` khi card thuộc user khác hoặc cardId ngẫu nhiên không tồn tại.
2. **[P1] Lệnh `test:analytics-data` độc lập:**
   - *Nguyên nhân:* Khi chạy trên clean workspace, `@jlpt/exam-engine` và `@jlpt/schema` chưa có `dist/`, khiến vitest thất bại.
   - *Khắc phục:* Cập nhật script `test:analytics-data` trong `package.json` thành:
     `pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/exam-engine build && vitest run apps/api/src/modules/stats/`
3. **[P2] Trạng thái trung thực khi người dùng chưa có lịch sử làm bài (`stats.service.ts`):**
   - *Nguyên nhân:* Khi `totalAnswered === 0`, `getAnalyticsReport` truyền các câu hỏi giả định (`'q-vocab-sample'`, `'q1'`, `'q2'`) vào thuật toán, vi phạm nguyên tắc "No-data readiness không bịa kết quả".
   - *Khắc phục:* Khi `totalAnswered === 0`, gán `speedAccuracy`, `unseenProgress`, `trueProgress` và `answerChanges` thành `undefined`. Khi `totalAnswered > 0`, tính toán thuần túy dựa trên lịch sử thực tế của học viên từ `user_question_history`.
   - *Kiểm thử:* Bổ sung test case trong `stats.test.ts` kiểm tra trả về `undefined` khi chưa có lịch sử, và trả về đầy đủ metrics khi đã có câu trả lời.
4. **[P2] Transaction cập nhật lịch và bản ghi review SRS:**
   - *Nguyên nhân:* Cập nhật `cardSchedules` và chèn `cardReviews` thực hiện riêng biệt, có nguy cơ bất đồng bộ.
   - *Khắc phục:* Bọc toàn bộ thao tác ghi DB này trong `this.dbClient.db.transaction(async (tx: DbTx) => { ... })`.

---

## 4. Bằng chứng kiểm thử (Verification & Acceptance)

Toàn bộ các tiêu chí nghiệm thu và tính năng giao việc đều được kiểm chứng thông qua bộ unit & integration tests trên cơ sở dữ liệu thật (PGlite in-memory):

1. **`pnpm test:learning`:** 16/16 tests PASS (thời gian chạy ~35s)
   - Kiểm chứng chống trùng lặp `clientReviewId` không tăng lặp lịch ôn tập.
   - Kiểm chứng bảo vệ IDOR ngăn chặn review thẻ của người khác bằng `NotFoundException`.
   - Kiểm chứng trung hòa Formula Injection (`sanitizeCsvField`) và xuất CSV.
   - Kiểm chứng chính sách bản quyền giọng đọc TTS (`Open-Voice-License-1.0`) và fallback sandbox.
   - Kiểm chứng CRUD sổ tay, tìm kiếm, quiz 4 đáp án và trích xuất câu hỏi ví dụ từ ngân hàng đề.
2. **`pnpm test:planner`:** 7/7 tests PASS (thời gian chạy ~18s)
   - Kiểm chứng đếm ngược ngày mục tiêu tất định theo múi giờ (`Asia/Tokyo`, `Asia/Ho_Chi_Minh`, `America/New_York`, `UTC`).
   - Kiểm chứng tái lập lịch các buổi học bị bỏ lỡ mà không làm biến đổi các buổi đã hoàn thành.
   - Kiểm chứng cân bằng thời gian cho kỹ năng yếu và nhận diện tuần nước rút (Sprint <= 7 ngày).
3. **`pnpm test:analytics-data`:** 7/7 tests PASS (thời gian chạy ~16s)
   - Tự động build `@jlpt/schema` và `@jlpt/exam-engine` thành công.
   - Kiểm chứng chính sách Readiness: `isCalibrated: false` khi có 0, 1 hoặc 2 đề thi thử; chỉ chuyển `CALIBRATED` khi đạt >= 3 đề thi.
   - Kiểm chứng No-data analytics: Trả về `undefined` cho speed-accuracy/progress khi `totalAnswered === 0`, không bịa đặt số liệu ảo.
   - Kiểm chứng báo cáo hoàn chỉnh khi đã có dữ liệu làm bài.
   - Kiểm chứng cập nhật thống kê độ khó câu hỏi và thay đổi đáp án.
4. **Common Gates:**
   - `pnpm lint`: Đạt 100% trên toàn bộ các packages.
   - `pnpm typecheck`: Đạt 100% trên toàn bộ các packages.
   - `pnpm test`: Toàn bộ test suites đều PASS.
   - `pnpm build`: Build thành công.
   - `pnpm install --frozen-lockfile`: Khóa lockfile nguyên vẹn.
