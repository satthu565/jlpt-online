# Quyết định kỹ thuật N03: Hoàn tất thi nghe, khôi phục kết quả và thư viện đề thi công khai

- **Task:** N03
- **Assignment ID:** `N03-1`
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

## 1. Bối cảnh và mục tiêu

Task N03 kế thừa nền tảng phòng thi trực tuyến của C03, hệ thống API backend bảo mật của N02 và xác thực F03 để hoàn thiện:
1. **Thi nghe chuẩn hóa (Listening Section Engine):** Quản lý timeline audio đồng bộ chặt chẽ với server time, khóa tua/phát lại trong thi thật (`real` mode), cho phép tùy chỉnh tốc độ và phát lại trong luyện tập (`practice` mode), kiểm tra loa/tai nghe trước khi vào phần nghe (`EXAM-05`), tự phục hồi lỗi tải media (`AUDIO-10`).
2. **Tiện ích công thái học phòng thi (Exam Ergonomics):** Phóng to thu nhỏ cỡ chữ tiếng Nhật chuyên dụng (`EXAM-23`), phím tắt điều hướng và chọn đáp án 1-4, gắn cờ F (`EXAM-24`), chế độ tập trung Zen Mode ẩn bớt palette (`EXAM-25`).
3. **Thư viện đề thi công khai (Public Exam Library):** Danh sách đề thi đầy đủ cấp độ N1–N5 (`LIB-01`), bộ lọc cấp độ, năm thi, kỳ thi, loại đề, trạng thái cá nhân (`LIB-02..06, LIB-08`), thẻ thông tin chi tiết (`LIB-07`), nguồn gốc bản quyền và số phiên bản (`LIB-15`), bảo đảm không lộ PII trong SSR/HTML công khai (Acceptance 3).
4. **Khôi phục kết quả & Xem lại chi tiết (Results Review & Persisted History):** Xem lại bài làm kèm đáp án đúng sau khi nộp (`SCORE-07, SCORE-08`), phát lại âm thanh từng câu nghe trong màn review (`AUDIO-07`), bộ lọc trạng thái câu hỏi palette (`SCORE-09`), so sánh tiến độ với lần thi trước (`SCORE-10`), bảng lịch sử thi cá nhân lưu trữ lâu dài (`STAT-01, SCORE-11`), phân quyền xem kết quả chỉ chính chủ hoặc admin (Acceptance 4).

---

## 2. Các quyết định kỹ thuật chính

### 2.1. Cấu trúc Fixtures Chuẩn Hóa N1–N5 (Acceptance 1)
- **Vị trí bàn giao:** `apps/web/features/exam/fixtures/exam-fixtures.ts`.
- Toàn bộ dữ liệu 5 cấp độ (N1, N2, N3, N4, N5) được kiểm định nghiêm ngặt qua `PublicExamSnapshotSchema.parse()` tại thời điểm nạp, đảm bảo tuyệt đối không có sự sai lệch với hợp đồng `@jlpt/schema`.
- Mỗi snapshot bao gồm đầy đủ cấu trúc phần thi theo định dạng JLPT chuẩn (ví dụ N1, N2 có 2 phần: Kiến thức ngôn ngữ & Đọc hiểu; Nghe hiểu; N3-N5 có 3 phần theo đúng quy định).
- Phần nghe hiểu chứa đầy đủ `listeningTimeline` (danh sách các audio item, mốc `startMs`, `endMs`, `gapAfterMs`, `mediaKey`, `audioStartMs`, `audioEndMs`), sẵn sàng cho kiểm thử tái hiện sai số timeline.
- Đồng thời cung cấp danh mục `SAMPLE_EXAM_SUMMARIES` đồng bộ slug, metadata nguồn đề (Japan Foundation & JEES), bản quyền học tập phi thương mại và version công khai.

### 2.2. Kiểm soát Luồng Âm Thanh & Khóa Tua (AUDIO-01..06, AUDIO-10, EXAM-05, Acceptance 2)
- **Vị trí bàn giao:** `apps/web/features/exam/components/audio-player.tsx`, `apps/web/features/exam/components/modals/speaker-test-modal.tsx`.
- **Đồng bộ thời gian thực (Audio Timeline Synchronization - AUDIO-01, AUDIO-02):**
  - Vị trí phát trong bài nghe được tính toán dựa trên `now + serverOffsetMs - sectionStartedAt`.
  - Sử dụng hàm thuần `getListeningPlaybackPosition(timeline, elapsedMs)` để xác định chính xác trạng thái phát: `before_start`, `playing`, `gap` (khoảng nghỉ giữa các câu), `finished`.
  - Khi reload trang hoặc kết nối lại, hệ thống tính toán vị trí phát hiện tại. Nếu độ lệch giữa phần tử `<audio>` và thời gian máy chủ vượt quá 2.0 giây (`drift > 2.0`), hệ thống tự động gán lại `audioRef.current.currentTime = expectedSec` (đảm bảo tiêu chí sai số <= 2s theo Acceptance 2).
- **Khóa tua nghiêm ngặt trong thi thật (AUDIO-04):**
  - Trong chế độ `mode === 'real'`, thanh tiến trình chỉ hiển thị trực quan dạng progress bar không cho kéo/seek.
  - Vô hiệu hóa và ẩn hoàn toàn các nút tua, phát lại (`↺ Phát lại`) và nút chỉnh tốc độ.
- **Tùy biến trong luyện tập (AUDIO-05, AUDIO-06):**
  - Trong chế độ `mode === 'practice'`, học viên có thể tạm dừng/tiếp tục, phát lại đoạn audio của câu hiện tại (`handleReplay`), và chuyển đổi tốc độ phát: 0.75x, 1.0x, 1.25x.
- **Tự phục hồi lỗi tải âm thanh (AUDIO-10):**
  - Bắt sự kiện `onError` của phần tử HTML `<audio>`.
  - Hiển thị thông báo thân thiện và nút "Thử lại" (`🔄 Thử lại`) kích hoạt reload media key và tăng `retryCount`.
- **Xác nhận tai nghe trước phần thi nghe (EXAM-05):**
  - Component `SpeakerTestModal` hiển thị hộp thoại hướng dẫn, cho phép học viên phát đoạn âm thanh thử mẫu (`sample-chime.mp3`) để chỉnh âm lượng trước khi chính thức bấm "Tôi đã nghe rõ & Bắt đầu phần nghe".

### 2.3. Trải nghiệm Công thái học: Cỡ chữ, Phím tắt, Zen Mode (EXAM-23, EXAM-24, EXAM-25)
- **Vị trí bàn giao:**
  - `apps/web/features/exam/components/exam-toolbar.tsx`
  - `apps/web/features/exam/hooks/use-keyboard-shortcuts.ts`
  - `apps/web/features/exam/components/modals/shortcuts-help-modal.tsx`
- **Tùy chỉnh cỡ chữ tiếng Nhật (EXAM-23):**
  - Hỗ trợ 4 mức: Nhỏ (`base` - 18px), Chuẩn (`lg` - 20px), Lớn (`xl` - 24px), Rất lớn (`2xl` - 28px).
  - Cỡ chữ được áp dụng cho toàn bộ nội dung câu hỏi, furigana ruby, đoạn văn passage và các lựa chọn đáp án.
- **Phím tắt điều hướng nhanh (EXAM-24):**
  - `1`, `2`, `3`, `4`: Chọn nhanh phương án A, B, C, D.
  - `F`: Bật/tắt cờ đánh dấu câu hỏi cần xem lại.
  - `ArrowLeft` / `J`: Chuyển về câu hỏi trước đó.
  - `ArrowRight` / `K`: Chuyển sang câu hỏi kế tiếp.
  - `Z`: Bật/tắt chế độ Zen Mode.
  - `?`: Mở bảng tra cứu phím tắt (`ShortcutsHelpModal`).
  - Tự động bỏ qua khi học viên đang nhập liệu trong `<input>` hoặc `<textarea>`.
- **Chế độ Zen Mode tập trung tối đa (EXAM-25):**
  - Ẩn toàn bộ thanh palette bên hông để mở rộng không gian đọc bài, đặc biệt hữu ích với bài đọc dài N1/N2 hoặc trên màn hình nhỏ.

### 2.4. Khả năng chống mất dữ liệu khi rớt mạng (Acceptance 2)
- **Vị trí bàn giao:** `apps/web/features/exam/storage/indexeddb.ts`, `apps/web/features/exam/sync/sync-engine.ts`.
- Mọi câu trả lời được ghi đồng thời vào bảng `attempts` và `outbox` cục bộ qua cơ chế IndexedDB Write-Ahead.
- Khi mất kết nối Internet (`navigator.onLine === false` hoặc mạng lỗi), phiếu làm bài vẫn an toàn tuyệt đối trong IndexedDB outbox.
- Khi mạng phục hồi, các bản ghi outbox đang chờ sẽ tự động được gửi lên máy chủ tuần tự theo `seq` và chỉ đánh dấu xóa/acked khi nhận phản hồi xác nhận hợp lệ.

### 2.5. Thư viện đề thi công khai & Bảo mật PII (LIB-01..08, LIB-15, Acceptance 3)
- **Vị trí bàn giao:** `apps/web/features/library/`, `apps/web/app/(library)/de-thi/page.tsx`, `apps/web/app/(library)/de-thi/[slug]/page.tsx`.
- **Bộ lọc đa tiêu chí:** Cấp độ (`N1`–`N5`), năm (`2020`–`2024`), kỳ thi (`Tháng 7` / `Tháng 12`), loại đề (`Thi thật`, `Luyện tập`, `Đề trộn`), và trạng thái học viên (`Chưa làm`, `Đang làm dở`, `Đã hoàn thành`).
- **Thẻ đề thi (`ExamCard`):** Hiển thị tổng số câu, tổng thời lượng, phân bổ từng phần thi, nhãn trạng thái người dùng cá nhân hóa.
- **Thông tin bản quyền và phiên bản (`LIB-15`):** Hiển thị rõ nguồn đề thi gốc, tuyên bố bản quyền học tập phi thương mại và phiên bản phát hành (`v1`).
- **Bảo đảm không lộ PII trong HTML công khai (Acceptance 3):**
  - Toàn bộ HTML sinh ra từ trang `/de-thi` và `/de-thi/[slug]` tuyệt đối không chứa dữ liệu cá nhân định danh (PII) như email, `userId`, số điện thoại hay token người dùng.

### 2.6. Khôi phục kết quả, Xem lại & Phân quyền bảo mật (SCORE-07..11, STAT-01, Acceptance 4)
- **Vị trí bàn giao:**
  - `apps/web/features/results/`
  - `apps/web/app/(results)/ket-qua/[id]/page.tsx`
  - `apps/web/app/(account)/lich-su/page.tsx`
- **Xem lại bài thi chi tiết (`SCORE-07, SCORE-08`):**
  - Hiển thị bài nộp hoàn chỉnh, đối chiếu giữa đáp án của thí sinh và đáp án chính xác của đề thi.
  - Phân loại rõ ràng: Đúng (xanh lục), Sai (đỏ), Bỏ trống (xám), Có gắn cờ (vàng).
- **Phát lại âm thanh từng câu (`AUDIO-07`):**
  - Trong màn hình xem lại, mỗi câu nghe có gắn media sẽ hiển thị trình phát mini (`QuestionAudioPlayer`), cho phép thí sinh nghe lại riêng đoạn audio của câu đó để rút kinh nghiệm.
- **Bộ lọc palette câu hỏi (`SCORE-09`):**
  - Cho phép thí sinh lọc nhanh danh sách câu hỏi: Tất cả, Làm đúng, Làm sai, Bỏ trống, Có gắn cờ.
- **So sánh tiến độ học tập (`SCORE-10`):**
  - Component `ScoreComparisonCard` tính toán chênh lệch điểm tổng (`deltaScore`), tỷ lệ chính xác (`deltaAccuracy`) so với lần thi gần nhất cùng đề hoặc cùng cấp độ, đưa ra lời khuyên khuyến khích.
- **Lịch sử thi được lưu trữ lâu dài (`STAT-01, SCORE-11`):**
  - Trang `/lich-su` hiển thị bảng danh sách các lần làm bài đã lưu trữ trong cơ sở dữ liệu kèm ngày nộp, cấp độ, tên đề, điểm thi, kết quả Đỗ/Trượt và liên kết trực tiếp để mở lại trang xem chi tiết (`/ket-qua/[id]`).
- **Kiểm tra phân quyền truy cập kết quả (Review Authorization - Acceptance 4):**
  - Trang `/ket-qua/[id]` kiểm tra danh tính thí sinh thông qua session đăng nhập. Nếu người dùng hiện tại không phải chủ nhân của lượt thi (`attempt.candidateId !== currentUser.id`) và không có vai trò `admin`, hệ thống chặn truy cập và hiển thị thông báo lỗi 403 `FORBIDDEN` từ chối quyền xem, ngăn chặn hành vi rò rỉ kết quả thi của thí sinh khác.

---

## 3. Bằng chứng kiểm thử và nghiệm thu

### 3.1. Các lệnh bắt buộc theo assignment
1. `pnpm test:e2e:exam`: 16/16 test PASS (Full exam N1–N5, audio reload sai số <= 2s, seek restrictions, IndexedDB offline resilience, lease conflict modal, ergonomics shortcuts & Zen mode).
2. `pnpm test:e2e:library`: 14/14 test PASS (Thư viện đề thi N1–N5, bộ lọc cấp độ/năm/loại đề, không rò rỉ PII trong public HTML, xem lại bài thi chi tiết, audio replay từng câu, so sánh tiến độ, bảng lịch sử thi).

### 3.2. Toàn bộ test suite web
- `pnpm --filter @jlpt/web test`: 76/76 test PASS qua 8 files kiểm thử độc lập.
- `pnpm --filter @jlpt/web typecheck`: 0 lỗi type (TypeScript strict mode).
- `pnpm --filter @jlpt/web lint`: 0 lỗi, 0 cảnh báo.
