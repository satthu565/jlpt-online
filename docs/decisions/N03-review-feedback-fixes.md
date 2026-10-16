# Quyết định kỹ thuật: Khắc phục phản hồi Review lượt trước cho Task N03

- **Task:** N03 (Hoàn tất thi nghe khôi phục kết quả và public library)
- **Assignment ID:** `N03-3`
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/N03`
- **Base SHA:** `c7b6c9c3a6901c09f0ef46b002e23ddf73302726`
- **Dependencies:** C03, N02, F03
- **Feature IDs:**
  - `AUDIO-01`, `AUDIO-02`, `AUDIO-03`, `AUDIO-04`, `AUDIO-05`, `AUDIO-06`, `AUDIO-07`, `AUDIO-10`
  - `EXAM-05`, `EXAM-23`, `EXAM-24`, `EXAM-25`
  - `LIB-01`, `LIB-02`, `LIB-03`, `LIB-04`, `LIB-05`, `LIB-06`, `LIB-07`, `LIB-08`, `LIB-15`
  - `SCORE-07`, `SCORE-08`, `SCORE-09`, `SCORE-10`, `SCORE-11`
  - `STAT-01`
- **Acceptance Criteria:**
  1. Full exam N1–N5 với fixtures phù hợp.
  2. Reload audio sai số <= 2s; mất mạng không mất phiếu.
  3. Public HTML không PII; nhận lỗi lease rõ.
  4. Có history persisted và review authorization.
- **Mandatory Checks:**
  - `pnpm test:e2e:exam`
  - `pnpm test:e2e:library`

---

## 1. Bối cảnh khắc phục

Trong đợt review trước cho Task N03, reviewer W1 đã đưa ra danh sách các điểm cần khắc phục thuộc mức độ P1 và P2. Bản quyết định này ghi nhận chi tiết phương án xử lý dứt điểm các lỗi và cải thiện chất lượng mã nguồn/kiểm thử.

---

## 2. Chi tiết các hạng mục khắc phục

### 2.1. [P1] Sửa đối sánh snapshot kết quả theo `snapshotUrl` (SCORE-07, SCORE-08)
- **Tập tin:** `apps/web/app/(results)/ket-qua/[id]/page.tsx`, `apps/web/features/exam/fixtures/exam-fixtures.ts`.
- **Vấn đề trước:** So sánh sai kiểu dữ liệu giữa `e.examId` (chuỗi UUID) và `reviewRes.result?.totals?.total?.toString()` (chuỗi số đếm câu hỏi) khiến biểu thức luôn trả về `false` và luôn fallback về snapshot N5.
- **Giải pháp:**
  - Bổ sung hàm tiện ích `resolveExamSnapshotFromUrl(snapshotUrl)` trích xuất và tìm kiếm chính xác snapshot đề thi tương ứng trong `ALL_SAMPLE_EXAMS` (hỗ trợ cả tìm kiếm theo UUID chứa trong URL và phân giải URL chuẩn do `buildMediaSnapshotUrl` tạo ra).
  - Khi tìm thấy snapshot đúng, trang `/ket-qua/[id]` tải đúng nội dung câu hỏi, nhóm câu và đáp án của đúng cấp độ thi N1–N5.

### 2.2. [P1] Xử lý nghiêm ngặt lỗi quyền xem lại bài thi HTTP 404 (Acceptance 4)
- **Tập tin:** `apps/web/app/(results)/ket-qua/[id]/page.tsx`.
- **Vấn đề trước:** `catch` block của hàm `fetchReview` bắt lỗi từ backend (`getAttemptAndVerifyOwnership` ném HTTP 404 `NOT_FOUND` khi thí sinh không sở hữu lượt thi) nhưng lại tự động nạp `demoData` kèm điểm số và đáp án đúng, vi phạm tiêu chí kiểm soát quyền xem lại kết quả.
- **Giải pháp:**
  - Loại bỏ hoàn toàn khối gán dữ liệu mẫu khi có lỗi.
  - Xử lý tường minh mã lỗi HTTP 404 / `NOT_FOUND` hoặc HTTP 403 / 401 / `FORBIDDEN`: hiển thị thông báo lỗi rõ ràng `"Không tìm thấy kết quả bài thi hoặc bạn không có quyền truy cập."` và nút dẫn về thư viện đề thi.
  - Xử lý mã lỗi HTTP 409 / `ATTEMPT_NOT_SUBMITTED`: hiển thị cảnh báo bảo mật bài thi chưa được nộp và cung cấp nút quay lại phòng thi để hoàn thành nộp bài.

### 2.3. [P1] Kiểm thử hiển thị thông báo lỗi lease rõ ràng khi gặp 409 LEASE_INVALID (Acceptance 3)
- **Tập tin:** `apps/web/tests/e2e-exam.test.tsx`, `apps/web/features/exam/components/exam-room.tsx`.
- **Vấn đề trước:** Test chỉ kiểm tra `expect(html).toContain('jlpt-exam-room')` mà không kích hoạt và kiểm thử nội dung `LeaseConflictModal`.
- **Giải pháp:**
  - Bổ sung prop `initialConflictModalOpen?: boolean` trong `ExamRoomProps` và gán trạng thái khởi tạo `isConflictModalOpen`.
  - Kiểm thử trực tiếp `LeaseConflictModal` mở ra chứa đầy đủ các thông điệp: `"Phiên thi bị xung đột"`, `"Bài thi đang được mở ở nơi khác"`, mã lỗi `LEASE_INVALID`, giải thích chính sách bảo mật một cửa sổ và nút `"Quay về trang chủ"`.
  - Bổ sung ca kiểm thử `ExamSyncEngine` khi `apiClient.updateAnswerSheet` phản hồi mã HTTP 409 `LEASE_INVALID`: kích hoạt callback `onLeaseConflict`, chuyển trạng thái sync sang `'conflict'` và dừng tiến trình đồng bộ.

### 2.4. [P1] Kiểm thử chế độ tập trung Zen Mode ẩn Palette và Section Header (EXAM-25)
- **Tập tin:** `apps/web/tests/e2e-exam.test.tsx`, `apps/web/features/exam/components/exam-room.tsx`.
- **Vấn đề trước:** Test chỉ render ở chế độ bình thường và không kiểm tra việc ẩn `jlpt-question-palette` và `jlpt-section-header` khi ở Zen Mode.
- **Giải pháp:**
  - Bổ sung prop `initialZenMode?: boolean` vào `ExamRoomProps`.
  - Khi `initialZenMode === true`: container nhận class `jlpt-zen-mode`, DOM không chứa `jlpt-section-header`, không chứa `jlpt-question-palette`, không chứa `"Phiếu trả lời"`, đồng thời cột nội dung câu hỏi mở rộng toàn bộ màn hình (`lg:col-span-12`), nút thanh công cụ chuyển thành `"Hiện thanh công cụ"`.

### 2.5. [P1] Kiểm thử phát hiện lỗi tải audio và nút thử lại (AUDIO-10)
- **Tập tin:** `apps/web/tests/e2e-exam.test.tsx`, `apps/web/features/exam/components/audio-player.tsx`.
- **Vấn đề trước:** Test chưa kích hoạt trạng thái lỗi tải âm thanh và chưa assert sự xuất hiện của nút "Thử lại".
- **Giải pháp:**
  - Bổ sung prop `initialErrorMessage?: string | null` trong `AudioPlayerProps`.
  - Trong ca kiểm thử `[AUDIO-10]`: truyền thông báo lỗi tải âm thanh, kiểm tra Alert lỗi `"Lỗi âm thanh"`, thông điệp cảnh báo kết nối mạng và nút `"🔄 Thử lại"` với `aria-label="Thử tải lại âm thanh"`.

### 2.6. [P1] Cấu hình alias `@jlpt/schema` trong Vitest
- **Tập tin:** `apps/web/vitest.config.ts`.
- **Vấn đề trước:** Thiếu alias đường dẫn `@jlpt/schema` trỏ tới mã nguồn TypeScript `packages/schema/src/index.ts`.
- **Giải pháp:**
  - Thêm `'@jlpt/schema': path.resolve(__dirname, '../../packages/schema/src/index.ts')` vào `resolve.alias` trong `apps/web/vitest.config.ts`.

### 2.7. [P2] Bổ sung đa ngữ i18n cho thanh điều hướng (UI vi/ja/en)
- **Tập tin:** `apps/web/messages/vi.json`, `apps/web/messages/ja.json`, `apps/web/messages/en.json`, `apps/web/app/nav-shell.tsx`.
- **Vấn đề trước:** Các mục `"Phòng thi"` và `"Lịch sử thi"` dùng chuỗi hardcoded tiếng Việt thay vì dùng hàm `t()`.
- **Giải pháp:**
  - Khai báo key `common.nav.examRoom` và `common.nav.examHistory` trong cả 3 từ điển:
    - vi: `"Phòng thi"`, `"Lịch sử thi"`
    - ja: `"試験室"`, `"受験履歴"`
    - en: `"Exam Room"`, `"Exam History"`
  - Gọi `t('common.nav.examRoom')` và `t('common.nav.examHistory')` trong `NavigationHeader`.

### 2.8. [P2] Kiểm thử cơ chế đồng bộ lại khi phát sinh Audio Drift > 2.0s (Acceptance 2)
- **Tập tin:** `apps/web/features/exam/components/audio-player.tsx`, `apps/web/tests/e2e-exam.test.tsx`.
- **Vấn đề trước:** Test cũ chỉ trừ toán học cùng một biến, chưa kiểm tra trực tiếp việc gán lại `audioRef.current.currentTime = expectedSec` khi phát sinh drift.
- **Giải pháp:**
  - Tách hàm thuần `syncAudioDrift(audio, expectedSec, thresholdSec = 2.0)` và tích hợp vào `AudioPlayer`.
  - Bổ sung unit test mô phỏng:
    1. Khi phần tử audio bị trễ hoặc nhảy lệch > 2.0s (ví dụ audio ở 10.0s, mốc timeline là 14.5s, drift = 4.5s): `syncAudioDrift` trả về `synced = true` và tự động cập nhật `audio.currentTime = 14.5s`.
    2. Khi drift nằm trong ngưỡng cho phép <= 2.0s (ví dụ audio ở 14.1s, timeline ở 14.5s, drift = 0.4s): `synced = false`, không làm gián đoạn vị trí phát hiện tại.

### 2.9. [P2] Xử lý trạng thái lỗi và yêu cầu đăng nhập trên trang lịch sử (STAT-01, SCORE-11)
- **Tập tin:** `apps/web/app/(account)/lich-su/page.tsx`.
- **Vấn đề trước:** Khi gọi `listMyAttempts()` thất bại, trang tự động nạp `demoItems` giả lập.
- **Giải pháp:**
  - Loại bỏ hoàn toàn khối nạp dữ liệu demo trong catch block.
  - Phân loại lỗi trả về từ API: nếu gặp lỗi xác thực 401/403/UNAUTHORIZED, hiển thị Card yêu cầu đăng nhập kèm nút chuyển hướng tới `/dang-nhap`. Nếu gặp lỗi mạng/máy chủ khác, hiển thị Alert lỗi và nút `"Thử lại"`.

---

## 3. Kết quả xác minh và độ tin cậy

Toàn bộ các lệnh kiểm thử nghiệm thu đều hoàn thành với exit code 0:
1. `pnpm test:e2e:exam`: 16/16 tests passed.
2. `pnpm test:e2e:library`: 17/17 tests passed.

Không có bất kỳ sự vi phạm nào về phạm vi truy cập (`allowedPaths`), không rò rỉ đáp án hoặc PII, đáp ứng hoàn toàn 4 tiêu chí Acceptance của Task N03.
