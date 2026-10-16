# Quyết định kiến trúc C01: Logic thời gian, chấm điểm tham khảo, phiếu trả lời, listening timeline và media token

- Mã task: `C01`
- Phụ trách: `W1` (Hợp đồng dữ liệu và logic thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED` / `READY_FOR_REVIEW`

## 1. Bối cảnh & Mục tiêu

Task C01 triển khai logic thi thuần, tính toán thời gian, chấm điểm tuyến tính tham khảo, kiểm tra tính hợp lệ của phiếu trả lời, xác thực listening timeline theo chuẩn import v2, guard kích hoạt blueprint và ký/xác thực media token bằng WebCrypto API cho hai package `@jlpt/exam-engine` và `@jlpt/media-token`.

Các tính năng phụ trách:
- `SCORE-01`: Tự động chấm bài sau khi nộp
- `SCORE-02`: Hiển thị tổng số câu đúng / sai / bỏ trống
- `SCORE-03`: Hiển thị tỷ lệ chính xác (%)
- `SCORE-04`: Thống kê kết quả theo từng kỹ năng (`bySkill`: kanji, vocabulary, grammar, reading, listening)
- `SCORE-05`: Thống kê kết quả theo từng dạng 問題 (`byMondai`: stats theo từng mondai_type)
- `SCORE-06`: Hiển thị thời gian làm bài thực tế (`durationSec`)
- `SCORE-13`: Hiển thị mức đạt mục tiêu điểm luyện tập (`targetEvaluation`: so sánh điểm thực tế với điểm mục tiêu, tỷ lệ đạt và chênh lệch)
- `SYS-04`: Đồng hồ thi đồng bộ với thời gian máy chủ (tính offset, deadline, thời gian còn lại, và kiểm soát trễ)
- `SYS-16`: Kiểm thử tự động toàn diện cho chấm điểm, timer, timeline và quy tắc trộn đề

## 2. Các quyết định kỹ thuật chính

### 2.1. Quản lý thời gian, deadline, grace period và late sync window (Acceptance 1 & SYS-04)
- Mốc thời gian do máy chủ quyết định:
  - `computeSectionDeadline(startedAt, durationSec)` tính hạn chót của từng phần thi.
  - `computeServerOffset(serverNow, clientNow)` tính độ lệch đồng hồ máy khách: `serverNow - clientNow`.
  - `computeClientRemainingMs(deadline, serverNow, clientNow)` tính thời gian còn lại chuẩn xác theo giờ máy chủ ước lượng.
- Phân định chế độ thi:
  - Chế độ luyện tập (`practice`): Đồng hồ mang tính hướng dẫn và thống kê (`PRACTICE_OPEN`), không bao giờ từ chối nộp bài do quá hạn deadline, không gắn cờ `late_sync`.
  - Chế độ thi thật (`real`):
    - `delayMs <= 0`: Đúng hạn (`ON_TIME`).
    - `0 < delayMs <= graceSec` (mặc định 10s): Trong khoảng ân hạn truyền mạng (`GRACE_PERIOD`), được chấp nhận và không gắn cờ.
    - `graceSec < delayMs <= (graceSec + lateSyncWindowSec)` (mặc định 10 phút / 600s): Trong khoảng nộp bù mất kết nối (`LATE_SYNC`), được chấp nhận nhưng bắt buộc gắn cờ `late_sync` trong kết quả.
    - `delayMs > (graceSec + lateSyncWindowSec)`: Quá hạn (`EXPIRED`), bị từ chối với lý do `DEADLINE_PASSED`.
- Khóa phần thi (`EXAM-22`):
  - Hàm `applySectionLocking` ở chế độ thi thật bảo lưu đáp án của các phần đã thi trước đó, chỉ cho phép cập nhật các câu hỏi thuộc `currentSectionRange`.

### 2.2. Chấm điểm tuyến tính và luôn ghi rõ tham khảo (Acceptance 2)
- Phương pháp chấm là `linear_reference`:
  - Điểm quy đổi từng phần: `rawMax > 0 ? Math.round((raw / rawMax) * maxScaled) : 0`.
  - Điều kiện đỗ ước tính (`passEstimate`): tổng điểm quy đổi >= `totalPass` VÀ tất cả các phần điểm đều đạt mức điểm liệt (`minPass`).
- Ghi nhận bắt buộc:
  - Kết quả chấm trong `scoring` luôn có trường `method: 'linear_reference'` và trường `disclaimer`:
    `REFERENCE_SCORING_DISCLAIMER = "Điểm quy đổi chỉ mang tính chất tham khảo (Linear Reference Scaling), không thay thế chứng chỉ JLPT chính thức."`
  - Bổ sung phân rã theo dạng câu hỏi `byMondai` (SCORE-05) và đánh giá mục tiêu `targetEvaluation` (SCORE-13).

### 2.3. Từ chối phiếu trả lời sai số phương án lựa chọn (Acceptance 3)
- Hàm `validateAnswerSheet` và `assertValidAnswerSheet`:
  - Kiểm tra độ dài phiếu phải khớp chính xác với `totalQuestions`.
  - Mọi câu trả lời phải là số nguyên không âm (`0` là bỏ trống).
  - Đối với từng câu hỏi `i`, giá trị lựa chọn không được vượt quá số phương án thực tế của câu hỏi đó (`optionCounts[i]`, thường là 3 hoặc 4).
  - Nghiêm cấm chọn phương án 4 đối với câu 3 lựa chọn, hoặc chọn giá trị >= 5 đối với bất kỳ câu hỏi nào. Vi phạm sẽ bị từ chối ngay lập tức.

### 2.4. Xác thực Listening Timeline theo chuẩn import v2 (Acceptance 5)
- Hàm `validateListeningTimeline`:
  - Kiểm tra bắt buộc bất biến (invariance): `endMs - startMs === audioEndMs - audioStartMs`.
  - Kiểm tra tính đơn điệu và khoảng nghỉ (monotonicity & gap continuity): mỗi đoạn phải bắt đầu sau khi đoạn trước và `gapAfterMs` đã kết thúc.
  - Kiểm tra tổng thời lượng nghe không vượt quá thời gian quy định của phần thi (`durationSec`).
- Hàm `getListeningPlaybackPosition`:
  - Ánh xạ mili giây đã trôi qua (`elapsedMs`) ra trạng thái phát thực tế (`playing`, `gap`, `before_start`, `finished`), kèm `mediaKey`, `groupId`, và vị trí phát chính xác trong file audio (`audioOffsetMs`).

### 2.5. Cơ chế kích hoạt Blueprint và tương thích Đề Demo (Acceptance 6 & 7)
- Hàm `validateBlueprint` và `canActivateBlueprint`:
  - Blueprint synthetic (như file `docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json`) được phép kích hoạt ngay để phục vụ làm bài thử nghiệm, đề demo và thi thử.
  - Blueprint chính thức (`kind: 'official'` hoặc `isOfficial: true`):
    - Bắt buộc phải có `sourceRef` trỏ về tên miền chính thức `jlpt.jp`.
    - Không được phép chứa giá trị 0 placeholder ở thời lượng hoặc số câu hỏi.
    - **Chỉ được phép kích hoạt khi điều kiện ngoài `jlpt-blueprints` được chuyển sang trạng thái xác nhận (`CONFIRMED` hoặc `READY`)**. Hiện tại điều kiện ngoài đang ở trạng thái `MISSING`, hệ thống tự động ngăn chặn kích hoạt đề thi thật với lý do rõ ràng.

### 2.6. Bảo mật mediaToken bằng WebCrypto (A11)
- Ký HMAC-SHA256 chuẩn WebCrypto (`crypto.subtle`):
  - Payload dạng `{ a: attemptId, e: examId, v: version, k: 'attempt' | 'review', exp: unixTimestamp }`.
  - So sánh chữ ký theo thời gian hằng định để chống timing attack.
  - `generateAttemptTokenExp`: thời gian thi + 30 phút.
  - `generateReviewTokenExp`: 2 giờ.
  - `validateMediaAccess`: kiểm tra tính toàn vẹn, hạn dùng, khớp `examId`/`version` cho snapshot, và kiểm tra file có trong `manifestMedia` đối với tài nguyên media.

## 3. Nghiệm thu và Kiểm chứng

- `pnpm test:exam-engine`: 44/44 unit tests đạt 100%.
- `pnpm test:media-token`: 12/12 unit tests đạt 100%.
- `pnpm test:coverage`:
  - Statements: **98.14%** (vượt ngưỡng >= 90%)
  - Lines: **98.66%** (vượt ngưỡng >= 90%)
  - Branches: **91.56%** (vượt ngưỡng >= 90%)
  - Functions: **100%**
- `pnpm contracts:check`: 0 drift, hoàn toàn tương thích hợp đồng chung.
- `pnpm typecheck`: 17/17 package đạt không có lỗi TypeScript strict.
- `pnpm lint`: 13/13 package đạt, không có lỗi any/ts-ignore.
- `pnpm test`: Toàn bộ monorepo test suite (17 tasks) đạt.

## 4. Blockers điều kiện ngoài

- `jlpt-blueprints`: Điều kiện ngoài nguồn chính thức cho đề thi N1–N5 hiện tại là `MISSING`. Hệ thống đã cài đặt guard chặn kích hoạt blueprint thi thật và gắn cờ `BLOCKED_EXTERNAL`. Blueprint synthetic demo N5 hoạt động hoàn chỉnh và đã được kiểm chứng.
