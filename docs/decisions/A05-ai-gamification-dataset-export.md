# Architectural Decision: A05 AI Học Tập Câu Sinh, Gamification, và Dataset Thống Kê Public

## Bối cảnh & Mục tiêu

Task A05 bao gồm 32 tính năng thuộc 3 phân hệ cốt lõi:
1. **AI Học Tập (AI-01..14, EXPL-11)**: Hệ thống AI trợ lý học tập đa năng, giải thích ngữ pháp/từ vựng, hỗ trợ đọc hiểu/nghe hiểu, phân tích lỗi sai, tạo bài tập/flashcard mnemonics, soạn thảo câu hỏi do AI tạo (AI-generated drafting) với quy trình duyệt 2 người (two-person review).
2. **Gamification (GAME-01..05, GAME-10)**: Theo dõi streak học tập hàng ngày với cơ chế chống gian lận lùi/tiến múi giờ (anti-replay timezone protection), streak freeze, tính điểm XP cho mọi hoạt động học tập, hệ thống huy hiệu (badges) đa cấp độ, bảng xếp hạng công khai tự nguyện (voluntary opt-in leaderboards), và thử thách tuần (weekly challenges).
3. **Dataset & Corpus Thống Kê Public (DATA-11..18, DATA-24..26)**: Tra cứu ngược câu hỏi chứa từ vựng/mẫu ngữ pháp (zero answer leak), thống kê phân bố từ vựng theo cấp độ và theo thời gian thi, lập danh sách học ưu tiên, đối sánh độ phủ từ vựng với từ đã học trong sổ tay (personal notebook), xuất báo cáo định dạng chuẩn CSV (UTF-8 BOM chống lỗi font tiếng Nhật, chống CSV formula injection) và Excel XLSX đa sheet kèm thông tin nguồn gốc (provenance), phân tích xu hướng biến động từ vựng đa năm, và thuật toán gợi ý học tập thông minh.

## Phạm vi tính năng chi tiết

### Phân hệ AI (15 features)
- **AI-01**: AI Chat & Query Tutor - Giao diện hỏi đáp ngữ pháp, từ vựng theo ngữ cảnh học tập.
- **AI-02**: Grammar Point Explanation - Phân tích cấu trúc ngữ pháp kèm ví dụ song ngữ Nhật - Việt/Anh.
- **AI-03**: Vocabulary Contextual Usage & Nuance - So sánh sắc thái từ đồng nghĩa và cách kết hợp tự nhiên (collocations).
- **AI-04**: Reading Comprehension Assistant - Phân tích câu phức tạp, cấu trúc ngữ pháp đoạn văn và đơn giản hóa câu.
- **AI-05**: Listening Script Analysis - Phân tích kịch bản nghe, giải thích bẫy thông tin và từ nối.
- **AI-06**: Error Analysis & Tailored Recommendations - Phân tích nguyên nhân chọn sai đáp án và đề xuất bài ôn tập.
- **AI-07**: JLPT Exam Strategy Coaching - Lời khuyên phân bổ thời gian và chiến thuật làm bài theo cấp độ.
- **AI-08**: Writing Evaluation & Feedback - Chấm chữa đoạn văn tiếng Nhật, gợi ý cách diễn đạt tự nhiên hơn.
- **AI-09**: Roleplay Scenario Generator - Tạo tình huống hội thoại thực tế theo cấp độ JLPT.
- **AI-10**: Flashcard Mnemonic Generator - Tạo câu gợi nhớ (mnemonic) kết hợp chiết tự chữ Hán (Kanji).
- **AI-11**: Adaptive Weak Area Quiz - Sinh câu hỏi kiểm tra nhanh nhắm trúng các lỗ hổng kiến thức.
- **AI-12**: Personalized Learning Path Adaptation - Đề xuất điều chỉnh lộ trình học theo tiến độ thực tế.
- **AI-13**: Question Bank Natural Language Search - Tìm kiếm câu hỏi bằng ngôn ngữ tự nhiên theo chủ đề.
- **AI-14**: AI Question Drafting for Creators - Hỗ trợ biên soạn câu hỏi dự thảo kèm nhãn `aiGenerated: true` bắt buộc duyệt hai người.
- **EXPL-11**: Practice Question Explanation Generation - Tự động tạo lời giải chi tiết cho câu hỏi luyện tập.

### Phân hệ Gamification (6 features)
- **GAME-01**: Daily Study Streak - Theo dõi chuỗi ngày học liên tục, tính toán chuẩn theo múi giờ IANA của người dùng, chặn hành vi gửi lặp/thao túng múi giờ để tăng chuỗi giả mạo (anti-replay).
- **GAME-02**: XP Calculation Engine - Tính điểm kinh nghiệm linh hoạt cho các hoạt động: làm bài kiểm tra, ôn flashcard SRS, xem giải thích, hoàn thành mục tiêu ngày.
- **GAME-03**: Multi-tier Achievement Badges - Hệ thống huy hiệu nhiều cấp độ (Bronze, Silver, Gold, Platinum) với tiến độ phần trăm rõ ràng.
- **GAME-04**: Voluntary Separate Leaderboards - Bảng xếp hạng tùy chọn tham gia (opt-in), hỗ trợ ẩn danh/bút danh, phân loại bảng tuần, bảng tháng, bảng toàn cầu.
- **GAME-05**: Weekly Challenges - Thử thách học tập hàng tuần với mục tiêu rõ ràng và phần thưởng XP.
- **GAME-10**: Streak Freeze & Recovery - Cơ chế đóng băng chuỗi ngày khi bận rộn và khôi phục streak bằng điều kiện học bù.

### Phân hệ Dataset & Corpus Export (11 features)
- **DATA-11**: Reverse Question Lookup - Tra cứu các câu hỏi thi/luyện tập chứa từ vựng chỉ định; chặn triệt để lộ đáp án (`answerKey`, `isCorrect`) và chặn khi thí sinh đang làm bài thi thật (real exam) hoặc câu hỏi thuộc kỳ thi đang embargo.
- **DATA-12**: Detailed Word Statistics - Thống kê tần suất xuất hiện, độ phân tán và vị trí phân bố trong đề thi.
- **DATA-13**: Cross-Level Appearance Comparison - So sánh tần suất và mật độ từ vựng/ngữ pháp qua các cấp độ N1 đến N5.
- **DATA-14**: Historical Time-Series Statistics - Thống kê xu hướng xuất hiện theo từng kỳ thi trong quá khứ.
- **DATA-15**: Targeted Study List Creation - Tạo danh sách từ vựng trọng tâm cần học theo cấp độ và ngưỡng tần suất.
- **DATA-16**: Notebook Sync Integration - Chuyển các từ vựng chọn lọc từ corpus vào bảng sổ tay cá nhân (`notebook_items`) chỉ với một thao tác.
- **DATA-17**: Vocabulary Coverage Comparison - So sánh đối chiếu vốn từ đã nắm vững của học viên với tổng thể corpus JLPT.
- **DATA-18**: Dataset Export (CSV/XLSX) with Provenance - Xuất dữ liệu đa định dạng kèm UTF-8 BOM, mã hóa chống CSV formula injection, định dạng XLSX đa sheet (Data + Provenance).
- **DATA-24**: Multi-Year Trend Analysis - Phân loại xu hướng từ vựng (tăng trưởng, suy giảm, mới xuất hiện, ổn định).
- **DATA-25**: Grammar Pattern Practice Linking - Liên kết mẫu ngữ pháp với các bài tập tương ứng trong ngân hàng câu hỏi.
- **DATA-26**: Intelligent Study Recommendations - Thuật toán gợi ý từ vựng dựa trên trọng số tần suất xuất hiện và trạng thái chưa học của học viên.

## Nghiệm thu và các ranh giới an toàn

### 1. Không nhận model-provided tool permission hoặc raw secret
- Tuyệt đối không cho phép model AI tự động thực thi các công cụ có quyền hệ thống hoặc đọc secret nội bộ.
- Mọi prompt và schema phản hồi của AI được kiểm soát chặt chẽ bằng Zod validation. API keys và thông tin xác thực nhà cung cấp không bao giờ được gửi qua client hay lộ ra log.

### 2. AI và câu hỏi thi bị chặn trong active real exam và event embargo
- Cả `AiService` và `CorpusService` đều thực hiện kiểm tra trạng thái trước khi xử lý:
  - Nếu học viên đang có phiên thi thật hoạt động (`mode = 'real'` và `status = 'in_progress'`), hệ thống lập tức từ chối và ném mã lỗi HTTP 403 Forbidden.
  - Các câu hỏi thuộc kỳ thi đang bị embargo (`ends_at <= now < result_release_at`) bị lọc bỏ hoàn toàn khỏi kết quả tra cứu corpus.
  - Toàn bộ kết quả trả về của câu hỏi tra cứu và luyện tập đều bị loại bỏ hoàn toàn các trường đáp án đúng (`answerKey`, `isCorrect`, `correct`) để ngăn chặn lộ đề.

### 3. Token & Cost Budget Atomic, Failures Refund Reservation
- Hạn mức sử dụng AI được theo dõi theo ngày cho từng người dùng qua bảng `ai_daily_quotas`.
- Khi người dùng gửi yêu cầu, hệ thống giữ chỗ hạn mức (reserve) trước bằng thao tác tăng nguyên tử (atomic increment).
- Nếu quá trình gọi nhà cung cấp AI gặp sự cố hoặc bị từ chối, hạn mức đã giữ chỗ được hoàn trả (refund) ngay lập tức trong cùng chu kỳ xử lý, đảm bảo người dùng không bị mất oan quota.

### 4. Generated Label và Approval Mandatory (Two-person Review)
- Mọi nội dung câu hỏi hoặc lời giải do AI sinh ra đều bắt buộc mang cờ `aiGenerated: true`.
- Khi tạo câu hỏi dự thảo qua AI (AI-14), bản ghi được lưu với trạng thái `reviewStatus = 'draft'` và `needsReview = true`.
- Quy trình phê duyệt bắt buộc phải có đủ 2 người kiểm duyệt độc lập (`reviewer1Id`, `reviewer2Id`) trước khi được đưa vào ngân hàng đề thi chính thức.

### 5. Streak Timezone Anti-Replay, Voluntary Separate Leaderboards
- Chuỗi học tập (streak) được chuẩn hóa theo múi giờ IANA của học viên (ví dụ: `Asia/Ho_Chi_Minh`, `Asia/Tokyo`).
- Chống gian lận: Kiểm tra ngày theo lịch địa phương của người dùng, không cho phép cộng dồn nhiều hoạt động trong cùng một ngày thành nhiều ngày streak (anti-replay).
- Bảng xếp hạng hoàn toàn tự nguyện (opt-in qua cờ `leaderboardOptIn`). Hỗ trợ chế độ ẩn danh hiển thị tên và tách biệt các phạm vi (toàn cầu, bạn bè, tuần, tháng).

### 6. Corpus Provenance và CSV/XLSX Roundtrip
- Mọi gói dữ liệu xuất bản (export) đều kèm theo metadata nguồn gốc (Provenance) gồm: Dataset ID, Version, Source, Snapshot SHA, Ngày trích xuất, và Bản quyền.
- Chống tấn công Formula Injection: Mọi chuỗi ký tự bắt đầu bằng `=`, `+`, `-`, `@`, `\t`, `\r`, `|`, `%`, `;` đều được thêm tiền tố `'` khi xuất và được khôi phục nguyên vẹn khi nhập.
- Xuất CSV kèm UTF-8 BOM (`\uFEFF`) đảm bảo hiển thị ký tự tiếng Nhật chính xác trên Microsoft Excel và LibreOffice.
- Xuất file Excel XLSX chuẩn OpenXML đa sheet (Sheet dữ liệu + Sheet `Provenance`) không làm biến dạng dữ liệu và đảm bảo 100% roundtrip fidelity.

## Trạng thái bên ngoài (External Prerequisites)
- `ai-provider`: MISSING (`BLOCKED_EXTERNAL`). Triển khai fallback bằng `SandboxAiProvider` cho môi trường dev và unit/integration testing; chuẩn bị sẵn adapter `LiveAiProvider` cho môi trường production khi cấu hình khóa API.
- `ai-budget`: MISSING (`BLOCKED_EXTERNAL`). Cơ chế quota nội bộ được kích hoạt và kiểm thử qua bảng `ai_daily_quotas`.
