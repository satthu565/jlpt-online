# Quyết định kỹ thuật L01: SRS độ khó dedupe và hợp đồng learning

- **Mã task:** `L01`
- **Worker:** `W1` (Hợp đồng dữ liệu và logic thi)
- **Ngày:** 2026-10-16
- **Trạng thái:** `DECIDED` / `READY_FOR_REVIEW`
- **Tính năng liên quan:** `QB-10`, `QB-12`, `QB-19`, `QB-20`, `MIX-11`, `SCORE-14`, `STAT-09`, `STAT-12`, `STAT-13`, `STAT-14`.
- **Dependencies:** `N01`, `N05` (đã merge).
- **Resource locks:** `schema-contract`, `engine-contract`.

---

## 1. Bối cảnh và Tiêu chí nghiệm thu

Task L01 chịu trách nhiệm xây dựng nền tảng thuật toán, hợp đồng dữ liệu và thư viện tính toán cho hệ thống học thông minh Spaced Repetition System (SRS), đánh giá độ khó thực nghiệm, kiểm định chất lượng câu hỏi, phát hiện trùng lặp câu hỏi xuyên nguồn, và các mô hình phân tích tiến bộ học tập trong JLPT Online:

1. **Bốn tiêu chí nghiệm thu cốt lõi (Acceptance Criteria):**
   - **Acceptance 1:** Lịch SRS khớp reference vectors; timezone midnight đúng.
   - **Acceptance 2:** Difficulty đủ mẫu mới có kết luận (ngưỡng tối thiểu `MIN_SAMPLE_SIZE = 30`).
   - **Acceptance 3:** Báo xác suất đỗ là ước lượng chưa được hiệu chỉnh nếu thiếu dữ liệu (`isCalibrated: false`, kèm disclaimer rõ ràng và khoảng tin cậy).
   - **Acceptance 4:** Tag grammar/vocab luyện được trong Practice Engine.

2. **Ba sản phẩm bàn giao (Deliverables):**
   - Thư viện SRS: `packages/srs/`
   - Bộ máy độ khó và kiểm định: `packages/exam-engine/difficulty/` (và các module phân tích mở rộng)
   - Hợp đồng và schema học tập: `packages/schema/learning/`

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Thư viện SRS FSRS và Xử lý ranh giới múi giờ (Acceptance 1 & packages/srs/)

- **FSRS Core:** Sử dụng thư viện FSRS đã ghim phiên bản chuẩn `ts-fsrs@5.4.2`.
- **Bất biến Reference Vectors:**
  - Lịch ôn tập tuân thủ đúng các trạng thái FSRS: `New (0) -> Learning (1) -> Review (2) -> Relearning (3)`.
  - Đánh giá 4 mức: `Again (1)`, `Hard (2)`, `Good (3)`, `Easy (4)`.
  - Đảm bảo tính tất định và khớp hoàn toàn các vector kiểm thử chuẩn của thuật toán FSRS về độ ổn định (stability), độ khó (difficulty) và khoảng thời gian ôn tập (scheduled days).
- **Xử lý ranh giới nửa đêm theo múi giờ (Timezone Midnight Alignment):**
  - Trong thẻ flashcard/SRS thực tế, thời điểm đến hạn (`dueAt`) được neo vào ranh giới ngày theo múi giờ của người học (mặc định `Asia/Ho_Chi_Minh` UTC+7, hoặc `Asia/Tokyo` UTC+9).
  - Thuật toán `alignIntervalToMidnight` chuyển đổi thời điểm review thành ngày cục bộ của người dùng, cộng thêm `scheduledDays`, và đưa về mốc nửa đêm (00:00:00 local time) chuyển đổi sang UTC.
  - Hỗ trợ giờ bắt đầu ngày tùy biến (`cutoffHour`, ví dụ 4:00 sáng cho người học đêm muộn).
  - Hàm `isCardDue` và `filterDueCards` xác định chính xác thẻ đến hạn trong ngày hiện tại của người dùng, không bị lệch ngày do chênh lệch múi giờ UTC.
- **Chống lặp ôn tập đa thiết bị (Idempotency):**
  - Sử dụng định danh `clientReviewId` (UUID) để ghi nhận từng lượt ôn tập. Nếu client gửi lại review cùng `clientReviewId`, hệ thống trả về kết quả đã tính toán trước đó, không nhân đôi interval hay tăng số lần lặp `reps`.

### 2.2. Đánh giá độ khó thực nghiệm và Ngưỡng mẫu tối thiểu (Acceptance 2 & QB-10, QB-19)

- **Nguyên tắc:** Độ khó không thể tự bịa đặt khi chưa đủ dữ liệu thực tế (`PHAM_VI_VA_NGHIEM_THU.md`).
- **Ngưỡng mẫu tối thiểu:** `MIN_SAMPLE_SIZE = 30` lượt làm bài.
- **Hành vi khi thiếu dữ liệu (`sampleSize < 30`):**
  - `hasConclusion = false`
  - `status = 'INSUFFICIENT_DATA'`
  - `confidence = 'uncalibrated'`
  - Giá trị `preliminaryDifficulty` chỉ mang tính chất ước đoán ban đầu, không được dùng làm căn cứ kết luận chính thức.
- **Hành vi khi đủ dữ liệu (`sampleSize >= 30`):**
  - `hasConclusion = true`
  - `status = 'CALIBRATED'`
  - Tính toán tỷ lệ sai sót thực nghiệm (error rate) $p_{err} = 1 - (correct / total)$ và chuyển đổi sang thang đo chuẩn $0..100$.
  - Tính sai số chuẩn (Standard Error) và khoảng tin cậy Wilson Score Interval 95%.

### 2.3. Kiểm định chất lượng câu hỏi và Phân tích phương án nhiễu (QB-20)

- **Phân bố lựa chọn phương án:** Đếm số lượng và tỷ lệ % thí sinh chọn từng phương án 1, 2, 3, 4 và để trống (0).
- **Phương án nhiễu không hoạt động (Non-functional distractor):** Tỷ lệ chọn $< 5\%$, cho thấy phương án quá lộ hoặc không có tác dụng phân loại.
- **Phương án nhiễu gây nhầm lẫn quá mức (Deceptive distractor):** Tỷ lệ chọn phương án sai cao hơn cả phương án đúng.
- **Chỉ số phân biệt (Discrimination Index $D$):**
  - Áp dụng phương pháp phân vị 27% nhóm điểm cao ($P_{upper}$) và 27% nhóm điểm thấp ($P_{lower}$): $D = P_{upper} - P_{lower}$.
  - Phân loại:
    - $D \ge 0.40$: Xuất sắc (`EXCELLENT`)
    - $0.30 \le D < 0.40$: Tốt (`GOOD`)
    - $0.20 \le D < 0.30$: Trung bình (`FAIR`)
    - $0 \le D < 0.20$: Kém (`POOR`)
    - $D < 0$: Lỗi đáp án hoặc câu hỏi có vấn đề (`FLAWED_KEY`) - thí sinh điểm thấp lại làm đúng nhiều hơn thí sinh điểm cao.
- Ngưỡng kết luận chất lượng câu hỏi cũng yêu cầu tối thiểu 30 lượt làm bài.

### 2.4. Phát hiện câu hỏi trùng và gần trùng xuyên nguồn (MIX-11, QB-12)

- **Chuẩn hóa văn bản tiếng Nhật:**
  - Bảo tồn chuẩn Unicode NFC.
  - Loại bỏ khoảng trắng, dấu câu tiếng Nhật và phương Tây.
  - Tách và loại bỏ thẻ ruby `<ruby>...<rt>...</rt></ruby>` để so sánh nội dung cốt lõi của câu hỏi.
- **Đo lường độ tương đồng (Similarity Algorithm):**
  - Sử dụng chỉ số Jaccard trên tập hợp character bigrams (2-gram) của thân câu hỏi (stem).
  - So sánh tập hợp các phương án lựa chọn (options).
  - Độ tương đồng tổng hợp kết hợp trọng số thân câu ($70\%$) và phương án ($30\%$).
- **Phân loại trùng lặp:**
  - $S = 1.0$: Trùng khớp tuyệt đối (`EXACT`).
  - $0.88 \le S < 1.0$: Gần trùng (`NEAR_DUPLICATE`) - thường do thay đổi nhỏ về từ nối, trợ từ hoặc dạng biến thể.
  - $0.65 \le S < 0.88$: Tương tự (`SIMILAR`).
  - $S < 0.65$: Khác biệt (`DISTINCT`).
- **Phát hiện xuyên nguồn (`MIX-11`):** Quét các câu hỏi từ các kỳ thi khác nhau (ví dụ kỳ 2023-12 và 2022-07), phát hiện các câu hỏi lịch sử được tái sử dụng giữa các kỳ thi.

### 2.5. Ước lượng khả năng đỗ kỳ thi (Acceptance 3 & SCORE-14)

- **Yêu cầu nghiệm thu:** Báo xác suất đỗ là ước lượng chưa được hiệu chỉnh nếu thiếu dữ liệu.
- **Điều kiện phân định:**
  - Nếu người học có ít hơn 3 bài thi hoàn chỉnh HOẶC chưa làm đủ tối thiểu 50 câu cho mỗi phần thi bắt buộc:
    - `isCalibrated = false`
    - `status = 'UNCALIBRATED_ESTIMATE'`
    - Khoảng tin cậy mở rộng (biên độ sai số lớn $\pm 20\%$).
    - Bắt buộc kèm dòng giải thích cảnh báo: *"Ước lượng chưa được hiệu chỉnh do thiếu dữ liệu lịch sử làm bài. Điểm số chỉ mang tính tham khảo sơ bộ và cần thêm tối thiểu 3 bài thi hoàn chỉnh hoặc 100 câu hỏi mỗi phần để có mô hình hiệu chuẩn chính xác."*
  - Khi có đủ từ 3 bài thi hoàn chỉnh trở lên và bao phủ toàn bộ các kỹ năng:
    - `isCalibrated = true`
    - `status = 'CALIBRATED'`
    - Ước lượng xác suất đỗ dựa trên mô hình logistic sigmoid so với điểm sàn từng phần và tổng điểm sàn JLPT của cấp độ mục tiêu.

### 2.6. Phân tích Tốc độ, Độ chính xác và Mô hình Tiến bộ (STAT-09, STAT-12, STAT-13, STAT-14)

1. **Tốc độ và độ chính xác (STAT-09):**
   - Tính toán thời gian trung bình làm câu đúng so với câu sai.
   - Phân loại ma trận 4 góc phần tư:
     - `FAST_AND_ACCURATE`: Thông thạo (Tốc độ nhanh, chính xác cao).
     - `SLOW_AND_ACCURATE`: Cẩn trọng (Chính xác cao nhưng tốn thời gian).
     - `FAST_AND_INACCURATE`: Vội vàng / đoán mò (Nhanh nhưng sai nhiều).
     - `SLOW_AND_INACCURATE`: Gặp khó khăn (Chậm và vẫn sai nhiều).
2. **Phân tích thay đổi đáp án từ đúng sang sai (STAT-12):**
   - Dựa vào lịch sử thay đổi `changes: [{ i, v, at }]` trong bài làm.
   - Thống kê các trường hợp:
     - `CORRECT_TO_WRONG`: Đổi từ đúng sang sai (thiệt hại điểm do nghi ngờ bản thân).
     - `WRONG_TO_CORRECT`: Đổi từ sai sang đúng (có lợi nhờ kiểm tra lại).
     - `WRONG_TO_WRONG`: Đổi giữa các phương án sai.
   - Đưa ra khuyến nghị chẩn đoán cá nhân hóa cho người học.
3. **Tiến bộ trên câu chưa từng gặp (STAT-13):**
   - Lọc riêng các câu hỏi có số lần phơi nhiễm `exposureCount === 0`.
   - Đánh giá xu hướng biến thiên tỷ lệ làm đúng trên câu mới theo thời gian.
4. **Phân biệt tiến bộ thực chất và tiến bộ do quen câu (STAT-14):**
   - So sánh $Acc_{unseen}$ (câu mới) và $Acc_{familiar}$ (câu làm lại).
   - Tính chỉ số lạm phát do quen câu: `familiarityInflationIndex = (Acc_familiar - Acc_unseen) / max(Acc_unseen, 1)`.
   - Cảnh báo người học khi điểm số tăng ảo do chỉ làm đi làm lại các câu đã nhớ đáp án.

### 2.7. Luyện tập theo nhãn ngữ pháp và từ vựng (Acceptance 4 & packages/exam-engine/)

- Tích hợp nhãn từ `VocabService` (N05) như `grammar:<pattern>`, `vocab:<word>`, `target_vocab:<word>`, `kanji:<char>` vào engine luyện tập.
- Practice Engine lọc và tạo đề luyện tập tập trung vào một hoặc nhiều mẫu ngữ pháp/từ vựng cụ thể, hỗ trợ người học ôn luyện đúng trọng tâm điểm yếu.
