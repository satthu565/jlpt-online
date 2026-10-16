# Quyết định kiến trúc N01: Thuật toán luyện và trộn tất cả chế độ thi

- Mã task: `N01`
- Phụ trách: `W1` (Hợp đồng dữ liệu và logic thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED` / `READY_FOR_REVIEW`

## 1. Bối cảnh & Mục tiêu

Task N01 chịu trách nhiệm xây dựng bộ máy sinh đề thi và bài luyện tập thuần toán học (pure deterministic algorithms) cho JLPT Online trong package `@jlpt/exam-engine`, bao gồm hai hệ thống con:
1. **Mix Engine** (`packages/exam-engine/src/mix/` và `packages/exam-engine/mix/`): Thuật toán sinh đề trộn đa nguồn theo blueprint chính thức, tuân thủ tỷ lệ nguồn, cấu trúc phần thi, độ khó và hạn mức phơi nhiễm câu hỏi.
2. **Practice Engine** (`packages/exam-engine/src/practice/` và `packages/exam-engine/practice/`): Thuật toán sinh bài luyện tập có định hướng theo kỹ năng, dạng câu hỏi 問題, số lượng câu chuẩn (10/20/30/50 câu), thời gian tùy chọn/không giới hạn và các kho luyện chuyên biệt (câu sai, câu chưa gặp, câu đã đánh dấu, thẻ từ vựng/ngữ pháp).

Các tính năng phụ trách và nghiệm thu:
- `MIX-01`: Chọn cấp độ N1–N5
- `MIX-02`: Chọn 2 kỳ thi để trộn
- `MIX-03`: Chọn từ 3 kỳ thi trở lên
- `MIX-04`: Chọn tỷ lệ câu lấy từ từng kỳ thi (sourceWeights & source ratios)
- `MIX-05`: Trộn riêng từng kỹ năng
- `MIX-06`: Trộn chi tiết theo từng dạng 問題
- `MIX-07`: Giữ số lượng câu phù hợp với cấu trúc đề mục tiêu (blueprint question counts)
- `MIX-08`: Giữ nguyên bài đọc và nhóm câu hỏi liên quan (reading group preservation)
- `MIX-09`: Giữ nguyên nhóm audio, hình ảnh và câu hỏi nghe hiểu (listening group preservation)
- `MIX-10`: Không lấy trùng câu trong cùng một đề
- `MIX-12`: Cho phép tạo nhiều phiên bản đề với seed khác nhau
- `MIX-18`: Tạo đề theo độ khó mục tiêu (`difficultyRange`)
- `MIX-19`: Hạn chế câu mà người dùng đã gặp quá nhiều lần (`maxExposure`)
- `PRA-01`: Luyện riêng Kanji
- `PRA-02`: Luyện riêng từ vựng
- `PRA-03`: Luyện riêng ngữ pháp
- `PRA-04`: Luyện riêng đọc hiểu
- `PRA-05`: Luyện riêng nghe hiểu
- `PRA-06`: Luyện theo từng dạng 問題
- `PRA-07`: Tạo bài 10 / 20 / 30 / 50 câu theo bộ lọc
- `PRA-08`: Luyện không giới hạn thời gian (`timeLimitSec` undefined/null)
- `PRA-09`: Luyện có thời gian do người dùng chọn (`timeLimitSec > 0`)
- `PRA-14`: Luyện ngẫu nhiên từ nhiều nguồn đề
- `PRA-15`: Luyện theo độ khó được hệ thống đánh giá
- `PRA-16`: Luyện theo mẫu ngữ pháp hoặc nhóm từ vựng (tagIds filter)

Tiêu chí nghiệm thu cốt lõi:
- 1000 property cases giữ nhóm, đúng level, không trùng, đủ tài nguyên và license.
- Cùng seed/config/engineVersion ra cùng đề (tính tất định).
- Thiếu pool trả shortage (`POOL_SHORTAGE`); không âm thầm sai tỷ lệ.

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Sinh số ngẫu nhiên có hạt giống và tính tất định (Determinism & PRNG)
- Sử dụng thuật toán Mulberry32 (`SeededRandom`) 32-bit nhanh và phân phối đều.
- Cùng bộ ba `(seed, config, engineVersion)` và kho câu hỏi đầu vào luôn tạo ra kết quả `GeneratedExam` hoàn toàn trùng khớp từng byte:
  - `configHash`: Chuẩn hóa JSON đệ quy sắp xếp khóa (`canonicalJsonStringify`) và băm SHA-256 hex.
  - `id` và `examId`: Sinh UUID v4 tất định (`deterministicUuid`) dựa trên SHA-256 từ hạt giống và muối chuỗi, đảm bảo tuân thủ định dạng RFC4122 v4 UUID mà vẫn tái hiện chính xác.
  - Thứ tự chọn `selectionGroupIds` và bảng tổng hợp nguồn `sourceSummary` bất biến giữa các lần chạy lặp lại.

### 2.2. Phân bổ hạn ngạch câu hỏi nguyên theo tỷ lệ nguồn (Hare-Niemeyer / Largest Remainder)
- Khi trộn đề từ 2 nguồn (MIX-02) hoặc từ 3 nguồn trở lên (MIX-03) với tỷ lệ trọng số `sourceWeights` (MIX-04):
  - Số lượng câu hỏi yêu cầu cho từng dạng 問題 là số nguyên `Q`.
  - Hàm `allocateIntegerQuotas(sessions, weights, totalCount)` áp dụng phương pháp phần dư lớn nhất (Hare-Niemeyer method) để phân bổ hạn ngạch câu hỏi nguyên cho từng nguồn:
    - Tính phần nguyên `Math.floor((w_i / W) * Q)`.
    - Sắp xếp phần dư giảm dần (kèm tie-break theo tên session để đảm bảo tất định) và chia đều các câu hỏi thiếu hụt.
    - Đảm bảo tổng số câu hỏi phân bổ của các nguồn luôn đúng bằng `Q`, không phát sinh sai lệch làm tròn dấu phẩy động.

### 2.3. Bất biến bảo tồn nhóm câu hỏi (Group Preservation: Rule 3, MIX-08, MIX-09)
- Đơn vị lựa chọn cơ sở luôn là `QuestionGroup` (bài đọc kèm các câu hỏi đi cùng, hoặc bài nghe kèm audio/hình ảnh).
- Nghiêm cấm chia tách hay lấy lẻ câu hỏi thuộc một bài đọc hoặc đoạn nghe.
- Thuật toán `findSubsetSumGroups` sử dụng nhánh cận (branch-and-bound) với mảng tổng hậu tố (suffixSum pruning) và ghi nhớ (memoization) để tìm tập con các nhóm câu hỏi nguyên vẹn có tổng số câu đúng bằng hạn ngạch yêu cầu:
  - Nếu kho câu hỏi của một nguồn chỉ có các nhóm kích thước không chia hết cho hạn ngạch (ví dụ hạn ngạch 1 câu nhưng bài đọc có kích thước 2 câu), hệ thống báo lỗi thiếu kho câu hỏi (`POOL_SHORTAGE`) thay vì tùy tiện cắt rời bài đọc hoặc lấy thừa/thiếu câu.

### 2.4. Bảy chế độ trộn đề (7 Mix Modes)
1. `Random`: Xáo trộn ngẫu nhiên đồng đều trong các nhóm thỏa mãn điều kiện.
2. `Balanced`: Ưu tiên các câu hỏi có độ khó gần trung vị 0.5 để đề thi cân bằng.
3. `Weakness`: Ưu tiên các nhóm câu hỏi có số lần làm sai cao (`totalWrongCount`) và tỷ lệ chính xác thấp (`1 - averageAccuracy`).
4. `Unseen`: Ưu tiên tuyệt đối các câu hỏi người dùng chưa từng gặp (`exposureCount === 0`).
5. `Challenge`: Ưu tiên các câu hỏi có độ khó cao nhất (`averageDifficulty`).
6. `Revision`: Ưu tiên các câu hỏi người dùng đã đánh dấu hoặc làm sai trước đó để ôn tập củng cố.
7. `Custom`: Tuân thủ nghiêm ngặt các tham số bộ lọc tùy chỉnh (`difficultyRange`, `maxExposure`, `sourceSessions`, `mondaiTypes`).

### 2.5. Kiểm soát độ khó mục tiêu và hạn mức phơi nhiễm (MIX-18, MIX-19)
- `difficultyRange: [min, max]`: Loại bỏ các nhóm câu hỏi có độ khó trung bình nằm ngoài dải mục tiêu.
- `maxExposure: N`: Loại bỏ tất cả câu hỏi mà người dùng đã làm từ `N` lần trở lên.
- Nếu việc áp dụng các điều kiện lọc này khiến kho câu hỏi không đủ số lượng để thỏa mãn hạn ngạch, hệ thống kích hoạt cơ chế báo thiếu (`POOL_SHORTAGE`), không tự ý hạ tiêu chuẩn hoặc lấy câu vi phạm.

### 2.6. Nguyên tắc xử lý thiếu hụt kho câu hỏi (Pool Shortage: Acceptance 3)
- Tuyệt đối không âm thầm làm sai tỷ lệ, không tự ý bổ sung câu từ nguồn khác khi chưa được yêu cầu, và không tự sinh đề thiếu câu.
- Khi không thỏa mãn hạn ngạch, ném ngoại lệ `PoolShortageError` với mã lỗi chuẩn `POOL_SHORTAGE` (tương ứng HTTP 422 theo hợp đồng OpenAPI):
  - Chi tiết gồm danh sách `ShortageDetail`: `{ mondaiType, sourceSession, requested, available, shortage, reason }`.

### 2.7. Kiểm soát bản quyền và tính hợp lệ của tài nguyên (Rule 5 & Licensing)
- Chỉ chọn các nhóm câu hỏi thỏa mãn:
  - `isApproved === true`: Đã được duyệt nội dung.
  - `hasAnswerKeys === true`: Có đáp án đầy đủ.
  - `hasMedia === true`: Có media hợp lệ đối với câu hỏi nghe hoặc câu có hình ảnh.
  - `license.remixAllowed === true`: Được phép trộn đề (đối với Mix Engine).
  - `license.displayAllowed !== false`: Được phép hiển thị làm bài (đối với Practice Engine).
  - `license.expiresAt`: Giấy phép còn hiệu lực so với thời điểm máy chủ.
- Nhóm câu hỏi vi phạm các điều kiện trên bị loại bỏ khỏi ứng viên ngay từ đầu.

### 2.8. Bộ máy sinh bài luyện tập (Practice Engine)
- Hỗ trợ các bộ lọc chuyên biệt:
  - Kỹ năng đơn lẻ: Kanji (PRA-01), Từ vựng (PRA-02), Ngữ pháp (PRA-03), Đọc hiểu (PRA-04), Nghe hiểu (PRA-05).
  - Dạng câu hỏi cụ thể (PRA-06).
  - Kích thước bài luyện cố định (PRA-07): 10, 20, 30, hoặc 50 câu hỏi.
  - Đa nguồn ngẫu nhiên hoặc giới hạn trong danh sách `sourceIds` (PRA-14).
  - Luyện theo độ khó (PRA-15) và luyện theo thẻ chủ đề ngữ pháp/từ vựng (PRA-16).
  - Chế độ thời gian: Luyện tự do không giới hạn thời gian (PRA-08: `timeLimitSec` vắng mặt) hoặc luyện bấm giờ theo thời gian người dùng cấu hình (PRA-09: `timeLimitSec > 0`).
  - Sáu loại kho luyện (`PracticePool`): `wrong`, `unseen`, `marked`, `random`, `tagged`, `difficulty`.

### 2.9. Cấu trúc đối tượng GeneratedExam bất biến và không lộ đáp án
- Kết quả sinh đề `GeneratedExam` tuân thủ strict schema của `@jlpt/schema`:
  - `id`: UUID.
  - `examId`: UUID.
  - `version`: Số phiên bản nguyên.
  - `seed`: Hạt giống số nguyên.
  - `engineVersion`: Phiên bản engine (ví dụ "1.0.0").
  - `configHash`: Băm cấu hình đầu vào.
  - `selectionGroupIds`: Mảng UUID của các nhóm câu hỏi đã chọn.
  - `sourceSummary`: Bảng tổng hợp số câu và tỷ lệ đóng góp của từng nguồn.
  - `warnings`: Mảng cảnh báo.
  - `blueprintConformant`: boolean (`true` cho đề trộn blueprint, `false` cho bài luyện tập).
- Tuyệt đối không chứa bất kỳ trường đáp án (`correctOption`, `answerKeys`, `explanations`) trong `GeneratedExam`, bảo vệ an toàn tính bất biến và bảo mật trước khi thí sinh nộp bài.

---

## 3. Chiến lược kiểm thử và bằng chứng xác nhận

1. **Property-based Testing 1000 Cases (`test:mix:property`)**:
   - Chạy 1000 trường hợp ngẫu nhiên bao phủ toàn bộ 5 cấp độ N1–N5, 7 chế độ trộn, tổ hợp 2 đến 4 nguồn thi với trọng số khác nhau, có và không có thiếu hụt kho câu hỏi.
   - Xác thực 7 bất biến cốt lõi:
     - Bất biến 1: Giữ nguyên nhóm câu hỏi (tất cả câu hỏi trong nhóm được chọn đều có mặt đầy đủ).
     - Bất biến 2: Đúng cấp độ mục tiêu.
     - Bất biến 3: Tuyệt đối không trùng lặp `groupId` hay `questionId`.
     - Bất biến 4: Đủ tài nguyên (approved, answer keys, media) và bản quyền (`remixAllowed: true`, chưa hết hạn).
     - Bất biến 5: Đúng số lượng câu hỏi quy định trong blueprint.
     - Bất biến 6: Tái hiện tất định 100% khi cùng hạt giống và cấu hình.
     - Bất biến 7: Trả lỗi `POOL_SHORTAGE` chính xác khi thiếu pool, không âm thầm làm sai tỷ lệ nguồn.
   - Thời gian thực thi: ~750ms cho 1000 ca kiểm thử.

2. **Kiểm thử chi tiết Mix Engine (`tests/mix-engine.test.ts`)**:
   - 22 ca kiểm thử chuyên sâu cho toàn bộ MIX-01 đến MIX-10, MIX-12, MIX-18, MIX-19.

3. **Kiểm thử chi tiết Practice Engine (`tests/practice-engine.test.ts`)**:
   - 21 ca kiểm thử chuyên sâu cho toàn bộ PRA-01 đến PRA-09, PRA-14 đến PRA-16, 6 loại kho luyện, và các giới hạn kích thước 10/20/30/50 câu.

4. **Kiểm thử hợp đồng và hồi quy toàn monorepo**:
   - `pnpm contracts:check`: 0 drift so với `openapi.yaml`.
   - `pnpm typecheck`: 17/17 tasks thành công trên 13 packages.
   - `pnpm test:exam-engine`: 88/88 bài test đạt 100%, độ phủ dòng code đạt trên 96%.
