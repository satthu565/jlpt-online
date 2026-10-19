# Quyết định kỹ thuật P04: Giao diện học viên - Điểm từng phần, Hán Việt, Furigana, Nhịp làm bài và Lịch thi JLPT

## 1. Bối cảnh và Mục tiêu (Context & Objectives)

Task P04 thuộc vai trò Worker W3 (Giao diện học viên) triển khai hoàn chỉnh 5 tính năng cốt lõi trên ứng dụng Web (`apps/web`) và gói thành phần giao diện dùng chung (`packages/ui`):
1. **Trang kết quả thi (`/ket-qua/[attemptId]`):** Hiển thị điểm quy đổi từng phần (`sections`), đỗ/trượt (`passEstimate`), điểm dưới sàn từng phần (`failedSections`, `margin`), nhãn ước lượng bắt buộc (`isEstimated: true`, `(ước lượng)`), và phân tích các câu tốn thời gian nhất so với chuẩn (`timeSpentMs`).
2. **Âm Hán Việt:** Hiển thị âm Hán Việt cạnh Kanji ở tra từ vựng (`VocabExplorer`), sổ tay (`NotebookView`), thẻ ghi nhớ (`FlashcardView`), và lời giải thích câu hỏi (`ExplanationView`).
3. **Bật/tắt Furigana:** Nút bật/tắt furigana (`FuriganaToggle`) trong phòng thi, luyện tập và xem lại bài làm; đồng bộ qua CSS data-attribute `data-furigana="on"|"off"`, CustomEvent `jlpt:furigana-changed`, và ghi nhớ lựa chọn qua `localStorage` (`jlpt_furigana_enabled`).
4. **Cảnh báo nhịp làm bài trong phòng thi:** Trong chế độ luyện tập (`mode === 'practice'`), hiển thị cảnh báo nhịp nổi bật (`data-testid="pacing-warning"`) khi chậm hơn mốc tiến độ chuẩn; trong chế độ thi thật (`mode === 'real'`), hiển thị mốc tiến độ kín đáo (`data-testid="discreet-pacing-milestone"`). Sau bài thi có widget phân tích câu tốn thời gian nhất.
5. **Trang lịch thi JLPT tại Việt Nam (`/lich-thi`):** Tích hợp API công khai `GET /api/v1/jlpt-schedules`, hiển thị dữ liệu quản trị nhập, trạng thái rỗng khi chưa công bố, lỗi API rõ ràng với nút thử lại, và cài đặt bật/tắt nhắc hạn đăng ký lưu tùy chọn vào `localStorage`.

---

## 2. Các quyết định kỹ thuật chính (Architectural Decisions)

### 2.1. Kiến trúc Furigana Toggle và ẩn Furigana 2 tầng (Two-Tier Hiding)
- **Vấn đề:** Khi học viên tắt furigana, chữ ruby `<rt>` phải lập tức ẩn trên toàn bộ câu hỏi và đoạn văn mà không yêu cầu re-render toàn bộ DOM nặng nề, đồng thời khi tải lại trang (`page.reload()`) thì lựa chọn vẫn phải được bảo toàn.
- **Giải pháp:**
  1. *Tầng CSS toàn cục:* Khi người dùng bật/tắt furigana, component `FuriganaToggle` cập nhật thuộc tính `data-furigana="on"|"off"` trên thẻ `<html>`. CSS toàn cục trong `@jlpt/ui` và `apps/web/app/globals.css` áp dụng:
     ```css
     [data-furigana="off"] rt,
     .hide-furigana rt {
       display: none !important;
     }
     ```
  2. *Tầng Component (`RichTextView` & `PassageView`):* Nhận prop `showFurigana?: boolean`. Khi `showFurigana === false`, thẻ `<rt>` được gắn style inline `{ display: 'none' }`. Điều này đảm bảo cả việc render server-side, render unit test trong môi trường Node, và các bộ kiểm thử Playwright (`toBeHidden()`) đều phản ánh chính xác trạng thái ẩn.
  3. *Lưu trữ bền vững (Persistence):* Khóa `jlpt_furigana_enabled` trong `localStorage` được đọc ngay khi khởi tạo hook `useFurigana()` và dispatch `window.dispatchEvent(new CustomEvent('jlpt:furigana-changed', { detail: { enabled } }))` để đồng bộ giữa các component đang mount.

### 2.2. Đánh giá nhịp làm bài thời gian thực (`evaluatePacing`)
- Tận dụng hàm thuần `evaluatePacing` từ `@jlpt/exam-engine`:
  - Trong `ExamRoom`, theo dõi thời gian trôi qua trong phần thi hiện tại (`elapsedSec`) và chỉ số câu hỏi tương đối trong phần thi (`currentQuestionIndex - firstQuestionOfSection + 1`).
  - Khi ở chế độ luyện tập (`mode === 'practice'`), nếu `paceStatus === 'BEHIND' || paceStatus === 'CRITICAL'`, component hiển thị cảnh báo nhịp (`data-testid="pacing-warning"`) với khuyến nghị tốc độ làm bài trên mỗi câu còn lại để giữ điểm sàn.
  - Khi ở chế độ thi thật (`mode === 'real'`), tuân thủ quy chế thi quốc tế, giao diện chỉ hiển thị mốc tiến độ kín đáo (`data-testid="discreet-pacing-milestone"`) ở thanh trạng thái để không gây phân tâm thí sinh.
  - Theo dõi thời gian thực tế người dùng dừng lại ở mỗi câu (`timeSpentMs: number[]`), gửi lên server khi nộp bài qua `apiClient.submitAttempt(..., { timeSpentMs })`.

### 2.3. Bảng điểm quy đổi và Phân tích câu tốn thời gian (`PacingAnalysisWidget`)
- Bảng điểm `ScoreSummaryCard` hiển thị:
  - Điểm quy đổi từng phần (`sections`), điểm đạt tối thiểu từng phần (`passScore`), và độ chênh lệch so với sàn (`margin`: e.g. `+12 điểm so với sàn` hoặc `-19 điểm dưới sàn`).
  - Đỗ / Chưa đạt (`passEstimate`), nhãn bắt buộc `(ước lượng)` kèm cảnh báo miễn trừ trách nhiệm theo tiêu chuẩn JEES / The Japan Foundation.
- Component mới `PacingAnalysisWidget` so sánh `timeSpentMs` của từng câu hỏi với thời gian chuẩn khuyến nghị (`RECOMMENDED_MONDAI_PACE` từ `@jlpt/exam-engine`) và liệt kê top 3 câu hỏi thí sinh mất nhiều thời gian nhất để hỗ trợ rút kinh nghiệm.

### 2.4. Hiển thị Âm Hán Việt
- Âm Hán Việt được bổ sung vào các hợp đồng kiểu dữ liệu giao diện:
  - `VocabTermDto.hanViet?: string`
  - `NotebookItem.hanViet?: string`
  - `DueFlashcard.back.hanViet?: string`
  - `LearnerExplanation.hanViet?: string | string[] | Array<{ kanji: string; reading: string }>`
- Các component hiển thị badge Hán Việt nổi bật cạnh chữ Hán:
  - `data-testid="vocab-hanviet"` trong thẻ từ vựng
  - `data-testid="notebook-item-hanviet"` trong danh sách sổ tay
  - `data-testid="flashcard-hanviet"` ở mặt sau thẻ ghi nhớ flashcard
  - `data-testid="explanation-hanviet"` trong khung giải thích đáp án

### 2.5. Trang Lịch thi JLPT tại Việt Nam (`/lich-thi`)
- Định tuyến tại `apps/web/app/(info)/lich-thi/page.tsx` và bổ sung liên kết vào `nav-shell.tsx` (cả menu "Thêm" trên Header và danh sách Footer).
- Tích hợp gọi API thực `GET /api/v1/jlpt-schedules?level=...`.
- Tuyệt đối không mock hay seed ngày thi giả:
  - Khi API trả rỗng: hiển thị `data-testid="schedule-empty-state"`.
  - Khi đang tải: hiển thị `data-testid="schedule-loading"`.
  - Khi có lỗi: hiển thị `data-testid="schedule-error"` kèm nút thử lại.
  - Khi có dữ liệu: hiển thị danh sách đợt thi với ngày thi, hạn đăng ký, các điểm tiếp nhận hồ sơ tại Hà Nội, TP.HCM, Đà Nẵng, Huế..., cấp độ tổ chức và link đăng ký chính thức.
- Nút bật/tắt nhắc hạn đăng ký (`data-testid="schedule-reminder-toggle"`) lưu tùy chọn vào `localStorage.getItem('jlpt_schedule_reminders_enabled')` và hiển thị phản hồi tức thì.
- Tuân thủ nghiêm ngặt kiểm tra UI primitives: 100% sử dụng component từ `@jlpt/ui`, không xuất hiện bất kỳ thẻ `<button>`, `<input>`, `<select>`, `<textarea>` nguyên thủy nào.

---

## 3. Xác minh và Kiểm thử (Verification & Test Evidence)

- **Cổng kiểm tra bắt buộc của task (Assignment Checks):**
  - `pnpm test:web`: 20/20 test files, 263/263 test cases đạt (exit 0).
  - `pnpm check:no-mock-ui`: Quét apps/web và apps/admin tìm dữ liệu giả, vi phạm mới: 0, đạt (exit 0).
  - `pnpm check:ui-primitives`: Quét apps/web tìm thẻ nguyên thủy, vi phạm: 0, đạt (exit 0).
  - `sudo -n /usr/local/bin/jlpt-stage-test check`: Dựng staging hoàn chỉnh (API + Postgres + Redis + Mailpit), chạy toàn bộ integration E2E trên Chromium, Firefox và Mobile Safari, đạt PASS (exit 0).

- **Cổng kiểm tra chất lượng chung (Common Gates):**
  - `pnpm install --frozen-lockfile`: Hoàn tất không thay đổi lockfile (exit 0).
  - `pnpm lint`: 13 packages đạt tiêu chuẩn ESLint strict (exit 0).
  - `pnpm typecheck`: 20 packages TypeScript strict không có lỗi type (exit 0).
  - `pnpm test`: Toàn bộ unit/integration test monorepo đạt (exit 0).
  - `pnpm build`: Toàn bộ 12 packages/apps build thành công tối ưu production (exit 0).

- **E2E Playwright Suite (P04):**
  - Bộ test `Real Web Learner Experience & JLPT Schedules Integration Suite (P04)` trong `tests/playwright/integration.spec.ts` kiểm thử toàn bộ 6 tiêu chí nghiệm thu:
    1. AC1 & AC2: Học viên làm đề demo N5 thấy điểm quy đổi từng phần, đỗ/trượt, nhãn ước lượng; bật/tắt furigana và kiểm tra persistence qua reload trang.
    2. AC3: Cảnh báo nhịp làm bài trong chế độ luyện tập (`mode=practice`) và mốc tiến độ kín đáo trong chế độ thi thật (`mode=real`).
    3. AC4: Trang lịch thi (`/lich-thi`) hiển thị dữ liệu quản trị nhập, xử lý trạng thái rỗng và bật/tắt nhắc hạn đăng ký lưu tùy chọn bền vững.
    4. AC5: Viewport responsive 390px và 1366px, không cuộn ngang, chụp ảnh màn hình artifact CI.
    5. AC6: Đa ngôn ngữ 3 locale (vi, ja, en), không lộ key dịch thô.
