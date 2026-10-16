# Quyết định kỹ thuật L03: Giao diện luyện trộn, chữa bài và dashboard phân tích học viên

- **Mã task**: L03
- **Assignment**: L03-3 (kế thừa từ L03-1)
- **Worker**: W3 (Giao diện học viên)
- **Nhánh**: `task/L03`
- **Các tính năng**: LIB-09, LIB-10, LIB-11, LIB-12, LIB-13, LIB-14, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, STAT-07, STAT-08, STAT-10, STAT-11, SCORE-15 (cùng hỗ trợ PRA-10..13, MIX-13..17, EXPL-01..12, AUDIO-08..09)

---

## 1. Bối cảnh và yêu cầu

Task L03 hoàn thiện trải nghiệm luyện tập cá nhân hóa, bộ tạo đề trộn linh hoạt, hệ thống chữa bài có giải thích chi tiết kèm bảo vệ bản quyền transcript audio, và dashboard thống kê phân tích năng lực học viên.

Tiêu chí nghiệm thu cốt lõi:
1. Mỗi chế độ generator có E2E (Tất cả 7 chế độ Mix: Random, Balanced, Weakness, Unseen, Challenge, Revision, Custom; 6 pool luyện tập: wrong, unseen, marked, random, tagged, difficulty).
2. Nguồn/licensed transcript chỉ hiển thị theo quyền (bảo vệ bản quyền tuyệt đối, không rò rỉ nội dung transcript sang DOM client khi chưa có quyền).
3. Dashboard dữ liệu tính tay đúng, tách bạch tuyệt đối câu quen (familiar) với câu mới (unseen), đo độ lạm phát điểm số.
4. Giao diện cá nhân hóa thư viện có đủ: Favorite, best-score badge, attempts count, below-target status, và next recommendation.
5. Kiểm tra bắt buộc: `pnpm test:e2e:learning` và `pnpm test:analytics` chạy đạt 100%. Toàn bộ common gates đạt chuẩn.

---

## 2. Kiến trúc và quyết định kỹ thuật

### 2.1. Bộ tạo đề trộn (Mix Generator - MIX-13..17) và Luyện tập (Practice Generator - PRA-10..13)
- **7 chế độ trộn đề (`MixMode`)**:
  - `Random`: Trộn ngẫu nhiên câu hỏi theo cấu trúc blueprint.
  - `Balanced`: Phân bổ đều giữa các dạng mondai và độ khó.
  - `Weakness`: Ưu tiên các kỹ năng và dạng bài có tỉ lệ làm sai cao nhất từ lịch sử làm bài.
  - `Unseen`: Chỉ chọn các câu hỏi học viên chưa từng gặp.
  - `Challenge`: Chọn các câu hỏi có độ khó cao (difficulty rating cao).
  - `Revision`: Lọc các câu làm sai hoặc đã đánh dấu để ôn tập lại.
  - `Custom`: Cho phép tùy chỉnh tỉ lệ nguồn đề (source exams) và trọng số từng phần.
- **Shortage UX**: Khi ngân hàng câu hỏi không đủ số lượng yêu cầu theo bộ lọc, giao diện hiển thị cảnh báo thiếu hụt rõ ràng kèm số lượng khả dụng thực tế, nút "Tự động cân bằng" (auto-balance) hoặc "Mở rộng nguồn" thay vì báo lỗi đột ngột.
- **Tính năng chia sẻ đề trộn (MIX-14)**: Tạo link chia sẻ chứa seed token bất biến, cho phép bạn bè làm đúng đề thi với bộ câu hỏi giống hệt mà vẫn tuân thủ quyền truy cập nội dung.
- **1-Click Quick Mix**: Widget tạo nhanh đề thi 10/20/30 câu từ kỹ năng yếu nhất chỉ với một nút bấm.
- **Interactive Practice Runner (PRA-10)**: Chế độ luyện tập từng câu với tính năng "Kiểm tra đáp án" ngay lập tức, hiển thị giải thích chi tiết và cho phép đánh dấu (bookmark) câu hỏi.

### 2.2. Bảo vệ bản quyền Audio Transcript và Chữa bài (EXPL-01..12, AUDIO-08..09)
- **Bảo vệ bản quyền nghiêm ngặt**: Với các bài thi/câu hỏi có `isLicensedAudio = true`, component `TranscriptView` kiểm tra cờ quyền `hasPermission`. Nếu không có quyền, component hiển thị hộp khóa bản quyền yêu cầu nâng cấp gói hoặc mở khóa, tuyệt đối **không render text transcript hoặc timecodes** vào DOM, chống rò rỉ dữ liệu qua Inspect Element / DOM scraping.
- **Hiển thị khi được cấp quyền**: Khi `hasPermission = true`, transcript hiển thị đầy đủ, làm nổi bật các đoạn bằng chứng (evidence ranges) tương ứng với câu hỏi, và ghi rõ thông tin bản quyền (attribution notice).
- **Giải thích phê duyệt (`LearnerExplanation`)**: Hiển thị lý do vì sao đáp án đúng, phân tích bẫy của từng lựa chọn sai, bản dịch tiếng Việt, các từ khóa/ngữ pháp liên quan, và modal báo cáo lỗi nội dung (EXPL-12).

### 2.3. Dashboard phân tích học viên và Tính toán độc lập (STAT-02..08, 10, 11, SCORE-15)
- **Nguyên lý tính toán thuần (Pure Functions)**: Toàn bộ công thức thống kê được hiện thực tại `apps/web/features/analytics/utils/calculator.ts` dưới dạng hàm thuần, không side-effect, dễ dàng kiểm thử độc lập với toán tính tay.
- **Tách bạch Câu mới (Unseen) và Câu quen (Familiar)**:
  - `unseenQuestions`: Các câu hỏi lần đầu tiên học viên làm (`exposureCount === 0`).
  - `familiarQuestions`: Các câu hỏi học viên đã từng gặp ít nhất 1 lần (`exposureCount > 0`).
  - `inflationIndex = familiarAccuracy - unseenAccuracy`: Đo lường mức độ "thuộc đề" thay vì thực lực thật sự. Nếu lạm phát cao, hệ thống khuyến nghị chuyển sang chế độ `Unseen` hoặc `Challenge`.
- **Các chỉ số phân tích chuyên sâu**:
  - `STAT-02`: Tiến trình điểm thi theo thời gian (Score progression) với mốc điểm chuẩn và điểm đỗ (90/180).
  - `STAT-03` & `STAT-04`: Độ chính xác theo từng kỹ năng (Language Knowledge, Reading, Listening) và từng dạng Mondai chi tiết (`MondaiType`).
  - `STAT-05`: Danh sách câu hỏi sai lặp lại (Repeated Mistakes: `wrongCount >= 2`) để ưu tiên ôn tập.
  - `STAT-06`: Phân loại lỗi thường gặp (Common error patterns: grammar trap, time pressure, distractor, vocab confusion, missing keyword).
  - `STAT-07`: So sánh tiến độ tháng này so với tháng trước (Month-over-month comparisons).
  - `STAT-08`: Tổng thời gian học tập thực tế và trung bình mỗi buổi.
  - `STAT-10`: Theo dõi tiến độ mục tiêu cấp độ và điểm số kỳ vọng (`targetScore`).
  - `STAT-11`: Đề xuất độ ưu tiên tiếp theo (Next Priority recommendation) tự động chỉ ra kỹ năng và dạng bài yếu nhất cần tập trung.
  - `SCORE-15`: Phân tích tốc độ và độ chính xác (Speed-Accuracy breakdown) tính thời gian trung bình mỗi câu hỏi theo từng phần thi so với thời gian tiêu chuẩn.

### 2.4. Cá nhân hóa Thư viện đề thi (LIB-09..14)
- Mở rộng `ExamCard`, `LibraryFilters`, và `LibraryView`:
  - `LIB-09`: Hiển thị điểm số cao nhất (`bestScore / totalScore`) trên từng thẻ đề.
  - `LIB-10`: Hiển thị số lượt làm bài (`attemptsCount`).
  - `LIB-11`: Nút chuyển đổi yêu thích (Favorite bookmark toggle) và bộ lọc "Chỉ đề yêu thích".
  - `LIB-12`: Bộ lọc trạng thái "Chưa làm" (`not_started`).
  - `LIB-13`: Trạng thái và huy hiệu cảnh báo "Dưới điểm mục tiêu" (`below_target`) khi điểm cao nhất thấp hơn mục tiêu.
  - `LIB-14`: Banner đề xuất bài thi tiếp theo ("Đề xuất tiếp theo") dựa trên cấp độ mục tiêu và lịch sử học tập.

---

## 3. Cấu trúc file bàn giao

```
apps/web/
├── app/
│   ├── (analytics)/thong-ke/page.tsx               # Trang Dashboard Phân tích học viên
│   └── (practice)/luyen-tap/page.tsx               # Trang Trung tâm Luyện tập & Đề trộn
├── features/
│   ├── analytics/                                  # Module Phân tích & Thống kê
│   │   ├── components/                             # 10 widget trực quan hóa dữ liệu
│   │   │   ├── analytics-dashboard.tsx
│   │   │   ├── common-errors-widget.tsx
│   │   │   ├── monthly-comparison-widget.tsx
│   │   │   ├── next-priority-widget.tsx
│   │   │   ├── repeated-mistakes-widget.tsx
│   │   │   ├── score-progression-chart.tsx
│   │   │   ├── skill-accuracy-widget.tsx
│   │   │   ├── speed-accuracy-widget.tsx
│   │   │   ├── study-time-widget.tsx
│   │   │   ├── target-progress-tracker.tsx
│   │   │   └── true-progress-widget.tsx
│   │   ├── utils/calculator.ts                     # Hàm tính toán toán học thuần
│   │   ├── types.ts                                # Kiểu dữ liệu analytics
│   │   └── index.ts
│   ├── explanations/                               # Module Chữa bài & Bản quyền
│   │   ├── components/
│   │   │   ├── explanation-view.tsx
│   │   │   ├── question-bookmark-button.tsx
│   │   │   ├── question-report-modal.tsx
│   │   │   └── transcript-view.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   ├── mix/                                        # Module Bộ tạo đề trộn
│   │   ├── components/
│   │   │   ├── generated-exam-card.tsx
│   │   │   ├── mix-generator.tsx
│   │   │   ├── mix-shortage-notice.tsx
│   │   │   ├── quick-mix-card.tsx
│   │   │   └── share-exam-modal.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   ├── practice/                                   # Module Luyện tập tương tác
│   │   ├── components/
│   │   │   ├── practice-generator.tsx
│   │   │   ├── practice-runner.tsx
│   │   │   └── practice-shortage-notice.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   └── library/                                    # Cá nhân hóa Thư viện (LIB-09..14)
│       ├── components/exam-card.tsx
│       ├── components/library-filters.tsx
│       ├── components/library-view.tsx
│       └── types.ts
└── tests/
    ├── analytics.test.tsx                          # 14 tests toán tính tay & widget
    └── e2e-learning.test.tsx                       # 28 tests E2E generator, license, library
```

---

## 4. Kết quả nghiệm thu và kiểm tra

- `pnpm test:e2e:learning`: **28/28 tests PASS**
- `pnpm test:analytics`: **14/14 tests PASS**
- `pnpm --filter @jlpt/web test`: **10/10 test files (121 tests) PASS**
- `pnpm install --frozen-lockfile`: **PASS (lockfile in-sync)**
- `pnpm lint`: **PASS (13 packages, 0 errors)**
- `pnpm typecheck`: **PASS (18 tasks, 0 type errors)**
- `pnpm test`: **PASS (18 tasks, all suites pass)**
- `pnpm build`: **PASS (Next.js production build succeeded with static page generation)**
