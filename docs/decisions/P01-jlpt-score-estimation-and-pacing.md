# Quyết định kỹ thuật P01: Ước lượng điểm quy đổi JLPT, điểm sàn từng phần và nhịp làm bài

- **Task:** P01
- **Worker:** W1 (Hợp đồng dữ liệu và logic thi)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-18
- **Branch:** `task/P01`
- **Base SHA:** `f53bd8ab0cebf776ae4259ede7f8ce19e9aad573`
- **Dependencies:** I01
- **Resource Locks:** `engine-contract`, `schema-contract`
- **Feature IDs:** Nền tảng và tích hợp toàn bộ phạm vi (hỗ trợ toàn bộ 5 cấp độ N1–N5)

---

## 1. Bối cảnh và mục tiêu

Kỳ thi Năng lực Tiếng Nhật (JLPT) áp dụng thang điểm quy đổi chuẩn hóa 0–180 điểm cùng hệ thống điểm sàn bắt buộc cho từng phần thi. Để phục vụ việc thi thử, luyện tập và phân tích kết quả bài thi trong hệ sinh thái JLPT Online (đặc biệt cung cấp nền tảng trực tiếp cho task P03 và hệ thống phân tích nhịp làm bài):
1. **Hàm thuần ước lượng điểm quy đổi 0–180:** Xử lý điểm số theo từng phần thi cho cả 5 cấp độ N1–N5.
   - N1–N3: 3 phần tính điểm riêng biệt (Kiến thức ngôn ngữ: 60, Đọc hiểu: 60, Nghe hiểu: 60).
   - N4–N5: 2 phần tính điểm (Kiến thức ngôn ngữ & Đọc hiểu gộp điểm: 120; Nghe hiểu: 60).
2. **Quy tắc đỗ/trượt 2 điều kiện đồng thời:** Đánh giá điểm tổng so với ngưỡng đỗ và điểm từng phần so với ngưỡng sàn. Trả về trạng thái đỗ/trượt và danh sách chính xác các phần thi dưới điểm sàn (`failedSections`).
3. **Bảng quy đổi và ngưỡng có phiên bản (Versioned Configuration):** Toàn bộ ngưỡng điểm và bảng tra quy đổi được tách thành dữ liệu cấu hình có phiên bản (không viết cứng trong logic hàm). Thay đổi bảng quy đổi hoặc cập nhật phiên bản mới không cần sửa bất kỳ dòng code logic nào.
4. **Cờ và nhãn "ước lượng" bắt buộc:** Mọi kết quả điểm thi do hệ thống tính toán luôn mang cờ `isEstimated: true`, nhãn `label: 'ước lượng'` cùng khuyến cáo miễn trừ trách nhiệm pháp lý rõ ràng.
5. **Mô hình nhịp làm bài (Pacing Model):** Cung cấp thời gian khuyến nghị cho toàn bộ 21 dạng 問題 (`MondaiType`) trên cả 5 cấp độ, xây dựng các mốc tiến độ (`milestones`) trong mỗi phần thi, và thuật toán đánh giá nhịp làm bài thời gian thực (`evaluatePacing`) cũng như sinh nhịp làm bài tự động từ đề thi (`calculateBlueprintPacing`).

---

## 2. Nguồn ngưỡng điểm chính thức của JLPT (Threshold Sources)

### 2.1. Căn cứ và tài liệu chính thức
Toàn bộ thông số ngưỡng điểm chuẩn và điểm sàn từng phần được chuẩn hóa theo tài liệu công bố chính thức của đơn vị tổ chức kỳ thi JLPT:
- **Tổ chức chủ quản:** The Japan Foundation (国際交流基金) & Japan Educational Exchanges and Services (JEES - 日本国際教育支援協会).
- **Tài liệu tham chiếu:** *JLPT Guidelines for Result Notification & Scoring Sections* (Cập nhật quy định thang điểm và phân bố phần thi từ tháng 7/2010 và điều chỉnh thời lượng các cấp N4/N5 năm 2020).
- **Liên kết chính thức:** [https://www.jlpt.jp/e/guideline/results.html](https://www.jlpt.jp/e/guideline/results.html).

### 2.2. Bảng ma trận ngưỡng đỗ và điểm sàn chính thức N1–N5

| Cấp độ | Thang điểm tổng | Điểm đỗ tổng (Pass Mark) | Phần 1: Kiến thức ngôn ngữ (Language Knowledge) | Phần 2: Đọc hiểu (Reading) | Phần 3: Nghe hiểu (Listening) | Phần gộp: Ngôn ngữ & Đọc hiểu (N4, N5) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **N1** | 180 | **100** (>= 55.6%) | 60 max / **sàn 19** | 60 max / **sàn 19** | 60 max / **sàn 19** | Không áp dụng (tách 3 phần) |
| **N2** | 180 | **90** (>= 50.0%) | 60 max / **sàn 19** | 60 max / **sàn 19** | 60 max / **sàn 19** | Không áp dụng (tách 3 phần) |
| **N3** | 180 | **95** (>= 52.8%) | 60 max / **sàn 19** | 60 max / **sàn 19** | 60 max / **sàn 19** | Không áp dụng (tách 3 phần) |
| **N4** | 180 | **90** (>= 50.0%) | — | — | 60 max / **sàn 19** | 120 max / **sàn 38** |
| **N5** | 180 | **80** (>= 44.4%) | — | — | 60 max / **sàn 19** | 120 max / **sàn 38** |

### 2.3. Giải thích điểm sàn 38 điểm của N4 và N5
- Ở cấp độ N4 và N5, phần thi Kiến thức ngôn ngữ (Chữ Hán, Từ vựng, Ngữ pháp) và phần Đọc hiểu được gộp chung thành một cột điểm tổng 120 điểm trong phiếu kết quả JLPT.
- Do đó, ngưỡng sàn cho phần gộp này được quy định bằng $19 \times 2 = 38$ điểm trên thang 120 điểm (tương ứng cùng tỷ lệ $\approx 31.7\%$ như ngưỡng 19/60 của từng phần đơn lẻ).

### 2.4. Bất biến đỗ/trượt (Pass/Fail Invariants)
Thí sinh được công nhận **ĐỖ (PASS)** khi và chỉ khi thỏa mãn **đồng thời** cả hai điều kiện:
$$\text{TotalScaled} \ge \text{TotalPass} \quad \text{VÀ} \quad \forall i, \text{SectionScaled}_i \ge \text{MinPass}_i$$
Hệ thống xử lý chính xác 4 trường hợp kết quả:
1. `PASSED` (Đỗ): Đủ điểm tổng và vượt điểm sàn toàn bộ các phần.
2. `FAILED_SECTION_FLOOR` (Trượt do điểm sàn): Tổng điểm vượt ngưỡng đỗ nhưng có một hoặc nhiều phần dưới sàn (ví dụ: N1 đạt 115/180 nhưng Nghe đạt 15/60 < 19).
3. `FAILED_TOTAL_SCORE` (Trượt do tổng điểm): Toàn bộ các phần đều đạt hoặc vượt điểm sàn nhưng tổng điểm không đủ ngưỡng đỗ (ví dụ: N1 đạt 30/30/30 = 90/180 < 100).
4. `FAILED_TOTAL_AND_SECTION` (Trượt do cả hai): Vừa thiếu tổng điểm vừa có phần dưới điểm sàn.

---

## 3. Lý giải nhãn và cờ "Ước lượng" (Estimated Score Rationale)

1. **Bản chất điểm số JLPT thật (Scale Score - 尺度得点):**
   - Kỳ thi thật của JLPT sử dụng mô hình trắc nghiệm hiện đại **Item Response Theory (IRT)** để tính điểm quy đổi chuẩn hóa (Scale Score) từ 0–180.
   - Điểm số trong kỳ thi thật không tính bằng điểm thô cộng dồn (Raw Score) hay tỷ lệ phần trăm số câu đúng đơn giản. Điểm số phụ thuộc vào việc cân chỉnh độ khó (item difficulty) và độ phân biệt (item discrimination) của từng câu hỏi dựa trên dữ liệu phản hồi của hàng trăm nghìn thí sinh toàn cầu trong đợt thi đó.
2. **Tại sao hệ thống thi thử chỉ ước lượng:**
   - Một ứng dụng thi thử trực tuyến hoặc làm bài độc lập không thể có tập dữ liệu mẫu toàn cầu thời gian thực của JEES.
   - Vì vậy, giải pháp tối ưu được áp dụng là **Mô hình Quy đổi Tuyến tính Tham chiếu (Linear Reference Scaling)** kết hợp chuẩn hóa phân bố blueprint và trọng số nhóm câu hỏi.
3. **Bắt buộc gắn cờ và nhãn minh bạch:**
   - Để đảm bảo tính trung thực học thuật, tuân thủ đạo đức sản phẩm và tôn trọng quyền sở hữu trí tuệ của The Japan Foundation, kết quả điểm do hệ thống tính toán **BẮT BUỘC** luôn chứa:
     - Cờ boolean: `isEstimated: true`
     - Nhãn văn bản: `label: 'ước lượng'`
     - Miễn trừ trách nhiệm: `disclaimer: 'Điểm quy đổi chỉ mang tính chất ước lượng tham chiếu (Linear Reference Scaling), không thay thế chứng chỉ JLPT chính thức do Japan Foundation / JEES cấp.'`
   - AI, giao diện web, ứng dụng di động hay phiếu xuất điểm PDF/XLSX tuyệt đối không được tự ý xóa bỏ nhãn ước lượng này.

---

## 4. Thiết kế cấu hình bảng quy đổi có phiên bản (Versioned Configuration)

### 4.1. Kiến trúc tách rời cấu hình và mã thực thi
Thay vì viết cứng các câu lệnh `switch-case` hay mảng điểm trong thân hàm, toàn bộ logic được cấu trúc:
- **Schema hợp đồng:** `JlptScoringTableConfigSchema`, `LevelScoringConfigSchema`, `ScoringSectionConfigSchema` trong `@jlpt/schema`.
- **Cấu hình chuẩn mặc định:** `OFFICIAL_JLPT_SCORING_TABLE_V1` với `version: 'official-2024-v1'`.
- **Registry mở rộng:** `tableRegistry = new Map<string, JlptScoringTableConfig>()`.
- **Hàm thuần tiếp nhận cấu hình:**
  ```ts
  export function estimateJlptScore(params: {
    level: Level;
    sections: SectionScoreInput[] | Record<string, number | SectionScoreInput>;
    tableConfig?: JlptScoringTableConfig | LevelScoringConfig;
    version?: string;
  }): EstimatedScoreResult
  ```

### 4.2. Khả năng thay đổi bảng không cần sửa code (Hot-swappable)
- Người dùng hoặc bài kiểm tra có thể truyền trực tiếp một `tableConfig` mới (ví dụ: bảng điểm tuyển dụng gắt gao hơn với điểm đỗ 120 điểm, điểm sàn 25 điểm, hoặc bảng tra phi tuyến tính `rawToScaledTable`).
- Hệ thống hỗ trợ đăng ký phiên bản qua hàm `registerScoringTable(tableConfig)`. Khi gọi `estimateJlptScore({ level: 'N1', version: 'custom-v2', ... })`, hệ thống sẽ áp dụng quy tắc của phiên bản đó mà không làm biến đổi bất kỳ dòng mã logic nào trong engine.

---

## 5. Mô hình nhịp làm bài (Pacing Model)

### 5.1. Phân bổ thời gian khuyến nghị từng dạng 問題
Dựa trên cấu trúc đề thi chính thức của JLPT (bao gồm các thay đổi về thời gian thi N4/N5 từ tháng 12/2020), hệ thống định nghĩa bảng tốc độ chuẩn `RECOMMENDED_MONDAI_PACE` cho toàn bộ 21 dạng câu hỏi:
- **Từ vựng & Chữ Hán:** 35–45s/câu (N1–N2: 35s cho `kanji_reading`, 55s cho `contextual`, 75–80s cho `usage`).
- **Ngữ pháp:** 45–50s cho `grammar_form`, 60–75s cho `sentence_composition` (dấu sao), 80–90s cho `text_grammar`.
- **Đọc hiểu:**
  - Đoạn ngắn (`comprehension_short`): 150s (2.5 phút/bài).
  - Đoạn trung (`comprehension_mid`): 150–170s/câu (~7.5–8.5 phút cho bài 3 câu).
  - Đoạn dài (`comprehension_long`): 180–190s/câu (~10–12 phút cho bài 3–4 câu).
  - Đọc tổng hợp / So sánh (`integrated_reading`): 180s/câu (~9 phút cho bài 3 câu).
  - Tìm kiếm thông tin (`info_retrieval`): 180–210s/câu (~7 phút cho bài 2 câu).
- **Nghe hiểu:** Được điều phối theo nhịp âm thanh thực tế của file nghe (35–40s cho phản xạ nhanh `quick_response`, 100–140s cho các dạng nghe tình huống và hội thoại dài).

### 5.2. Mốc tiến độ (Progress Milestones)
Trong mỗi phần thi, mô hình xây dựng từ 3 đến 6 mốc tiến độ then chốt. Mỗi mốc ghi nhận:
- `targetQuestionIndex`: Câu hỏi mục tiêu cần hoàn thành.
- `targetElapsedSec`: Thời gian trôi qua mục tiêu kể từ đầu phần thi.
- `targetRemainingSec`: Thời gian còn lại tối thiểu để đảm bảo tiến độ.
- `cumulativePercent`: Tỷ lệ phần trăm thời gian hoàn thành.

### 5.3. Đánh giá nhịp làm bài (`evaluatePacing`)
Thuật toán phân loại trạng thái thí sinh thành 4 mức:
1. `AHEAD`: Nhanh hơn tiến độ (vượt $\ge 2$ câu hoặc $\ge 90$ giây dự phòng).
2. `ON_TRACK`: Nhịp chuẩn (trong khoảng sai số $\pm 1$ câu hoặc $\pm 60$ giây).
3. `BEHIND`: Chậm hơn tiến độ (chậm từ 1 đến 3 câu). Đưa ra gợi ý thời gian còn lại trung bình cho mỗi câu (`recommendedPacePerRemainingQuestionSec`).
4. `CRITICAL`: Nguy cơ thiếu giờ nghiêm trọng (chậm $> 3$ câu hoặc thời gian còn lại $< 25$ giây/câu). Cảnh báo cần bỏ qua câu khó để bảo vệ điểm sàn.

---

## 6. Bằng chứng nghiệm thu (Acceptance & Test Evidence)

### 6.1. Nghiệm thu Tiêu chí 1: Test cho cả 5 cấp độ (N1–N5)
- **Đỗ khi đủ tổng và đủ sàn:**
  - N1: 35/35/35 (Tổng 105 >= 100, mọi sàn >= 19) -> `PASS`.
  - N2: 32/32/32 (Tổng 96 >= 90, mọi sàn >= 19) -> `PASS`.
  - N3: 33/33/33 (Tổng 99 >= 95, mọi sàn >= 19) -> `PASS`.
  - N4: Ngôn ngữ & Đọc hiểu gộp 60/120, Nghe 35/60 (Tổng 95 >= 90, cả 2 >= sàn 38 và 19) -> `PASS`.
  - N5: Ngôn ngữ & Đọc hiểu gộp 55/120, Nghe 30/60 (Tổng 85 >= 80, cả 2 >= sàn 38 và 19) -> `PASS`.
- **Trượt khi đủ tổng nhưng dưới sàn một phần:**
  - N1: 50/50/15 (Tổng 115 >= 100, Listening 15 < 19) -> `FAIL` (`failedSections: ['listening']`).
  - N2: 18/42/40 (Tổng 100 >= 90, Language 18 < 19) -> `FAIL` (`failedSections: ['language']`).
  - N3: 45/17/43 (Tổng 105 >= 95, Reading 17 < 19) -> `FAIL` (`failedSections: ['reading']`).
  - N4: 75/120, Listening 18/60 (Tổng 93 >= 90, Listening 18 < 19) -> `FAIL` (`failedSections: ['listening']`).
  - N4: 37/120, Listening 55/60 (Tổng 92 >= 90, LR 37 < 38) -> `FAIL` (`failedSections: ['language_reading']`).
  - N5: 70/120, Listening 15/60 (Tổng 85 >= 80, Listening 15 < 19) -> `FAIL` (`failedSections: ['listening']`).
  - N5: 36/120, Listening 46/60 (Tổng 82 >= 80, LR 36 < 38) -> `FAIL` (`failedSections: ['language_reading']`).
- **Trượt khi thiếu tổng dù các phần đều đủ sàn:**
  - N1: 30/30/30 (Tổng 90 < 100) -> `FAIL` (`failedSections: []`).
  - N2: 28/29/28 (Tổng 85 < 90) -> `FAIL` (`failedSections: []`).
  - N3: 30/30/30 (Tổng 90 < 95) -> `FAIL` (`failedSections: []`).
  - N4: 50/120, Listening 30/60 (Tổng 80 < 90) -> `FAIL` (`failedSections: []`).
  - N5: 48/120, Listening 27/60 (Tổng 75 < 80) -> `FAIL` (`failedSections: []`).

### 6.2. Nghiệm thu Tiêu chí 2: Bảng quy đổi có phiên bản, đổi bảng không cần sửa code
- Xác thực bảng mặc định `official-2024-v1`.
- Nạp cấu hình tùy biến `strict-mock-v2` nâng điểm đỗ N1 lên 120 điểm và điểm sàn lên 25 điểm. Kết quả 105 điểm (đỗ ở bảng chính thức) tự động chuyển thành trượt mà không sửa code engine.
- Đăng ký bảng thử nghiệm `experimental-2027` qua `registerScoringTable` và kích hoạt bằng chuỗi phiên bản trong tham số hàm.
- Hỗ trợ bảng tra cứu phi tuyến `rawToScaledTable` ánh xạ điểm trực tiếp qua cấu hình.

### 6.3. Nghiệm thu Tiêu chí 3: Kết quả luôn có nhãn ước lượng và giải thích nguồn ngưỡng
- Mọi đối tượng kết quả `EstimatedScoreResult` luôn chứa thuộc tính `isEstimated: true` và `label: 'ước lượng'`.
- Miễn trừ trách nhiệm `disclaimer` chuẩn quốc tế được tự động đính kèm.
- Chi tiết độ lệch điểm sàn `margin` được tính toán cho từng phần.

### 6.4. Kết quả kiểm thử tự động
- `pnpm test:engines:all`: 20 test files, 199 tests PASS 100%.
- `pnpm contracts:check`: OpenAPI 3.1 & fixtures check PASSED (0 drift).
- Common gates: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` đều vượt qua.
