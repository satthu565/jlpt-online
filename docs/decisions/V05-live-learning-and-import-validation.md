# Quyết định kiến trúc V05: Đối chiếu dữ liệu nhập AI thật và học tập E2E

- **Task**: V05
- **Worker**: W5
- **Ngày**: 2026-10-16
- **Trạng thái**: Hoàn tất triển khai (REVIEW)

## 1. Bối cảnh & Yêu cầu

Nhiệm vụ V05 tập trung vào kiểm định toàn diện chu trình dữ liệu từ gói nhập của người biên soạn, đảm bảo tính toàn vẹn và bảo mật của dữ liệu học tập và thi cử, cùng việc phân định rõ ràng giữa dữ liệu thật (observed) và dữ liệu mô phỏng/sinh bởi AI (synthetic).

Các tiêu chí nghiệm thu chính:
1. Gói chuẩn giữ đúng ruby, bảng, sao, audio, đáp án qua import và snapshot không lộ đáp án.
2. Provider học tập chưa có credential phải `BLOCKED_EXTERNAL`.
3. Sinh câu qua moderation đến làm bài.
4. Data tests phân biệt observed và synthetic.

## 2. Các quyết định kỹ thuật

### Quyết định 1: Xây dựng Snapshot công khai và chống rò rỉ đáp án tuyệt đối (Acceptance 1)
- Triển khai hàm thuần `buildSnapshotFromImportPackage` tại `@jlpt/content-tools` (`packages/content-tools/src/snapshot.ts`).
- Tách biệt tuyệt đối giữa:
  - `PublicExamSnapshot`: chỉ chứa nội dung câu hỏi công khai (stem, options, ruby furigana, bảng biểu passage, hình ảnh, sao và blank trong bài sắp xếp câu, timeline nghe ms). Tất cả thuộc tính `correctOption`, `explanation`, `answer` đều bị lược bỏ hoàn toàn và được bảo vệ bởi hàm `assertNoAnswerLeak(snapshot)` và `PublicExamSnapshotSchema.parse(snapshot)`.
  - `answerKeys`: Record ánh xạ `questionIndex -> correctOptionIndex` lưu trữ riêng phía server phục vụ chấm bài.
  - `ExamManifest`: manifest quản lý phiên bản và danh mục media (ảnh png, audio wav).

### Quyết định 2: Quản lý Live Providers và xử lý BLOCKED_EXTERNAL chuẩn chỉ (Acceptance 2)
- Khi các dịch vụ ngoại vi chưa được cấu hình credentials hoặc thiếu khóa bí mật:
  - `LiveAiProvider` (`ai-provider`): ném lỗi `ExternalPrerequisiteError('ai-provider', 'BLOCKED_EXTERNAL', ...)` và báo `configured: false`. Tuyệt đối không giả lập live khi chưa có API key.
  - `LiveTtsProvider` (`tts-provider`): ném lỗi `ExternalPrerequisiteError('tts-provider', 'BLOCKED_EXTERNAL', ...)` khi yêu cầu phát âm trực tiếp chưa có thông tin xác thực, tự động fallback về sandbox an toàn cho môi trường test.
  - `DictionaryAdapter` (`dictionary`): ném lỗi `ExternalPrerequisiteError('dictionary', 'BLOCKED_EXTERNAL', ...)` khi ở chế độ external mà thiếu credentials; sandbox dictionary hoạt động độc lập không phụ thuộc bên ngoài.
  - Bản quyền dữ liệu và tài liệu nguồn (`sample-rights`, `prepared-import-data`): Các gói draft có issues blocking hoặc thiếu đáp án bị chặn nghiêm ngặt không cho publish ở chế độ ready.

### Quyết định 3: Quy trình sinh câu hỏi AI qua Moderation đến làm bài an toàn (Acceptance 3)
- Triển khai quy trình khép kín:
  1. **Sinh câu**: `aiController.createRequest` với action `generate_question` sinh ra câu hỏi ứng viên với nhãn bắt buộc `ai_generated = true` và trạng thái ban đầu `approvalStatus = 'pending'`.
  2. **Kiểm duyệt tự động (Moderation)**: `validateGeneratedQuestionModeration` kiểm tra:
     - Stem không được rỗng.
     - Nội dung tiếng Nhật bắt buộc chuẩn hóa Unicode NFC (từ chối NFD hay ký tự phân rã).
     - Số lượng lựa chọn phải từ 3 đến 4.
     - `correctOptionIndex` nằm trong phạm vi hợp lệ.
     - Phát hiện và chặn các mẫu prompt injection (ví dụ "ignore previous instructions", "drop table", v.v.).
  3. **Phê duyệt phân quyền (Two-person review)**: Câu hỏi ở trạng thái `pending` hoặc `rejected` tuyệt đối bị cấm đưa vào làm bài (`getApprovedGeneratedQuestionForPractice` ném `ForbiddenException`). Chỉ khi reviewer thực hiện duyệt (`approvalStatus = 'approved'`), câu hỏi mới được mở cho học viên.
  4. **Làm bài không lộ đáp án**: API `getApprovedGeneratedQuestionForPractice` trả về cấu trúc câu hỏi đã qua `assertNoAnswerLeak`, không chứa đáp án hay lời giải.
  5. **Nộp bài & Chấm điểm**: Học viên nộp bài qua `submitGeneratedQuestion`, hệ thống đối chiếu với `correctOptionIndex` đã lưu và trả về kết quả đúng/sai cùng lời giải thích chi tiết.

### Quyết định 4: Phân biệt triệt để Observed vs Synthetic Data (Acceptance 4)
- **Thống kê & Đánh giá năng lực (Cold Start)**:
  - Thuật toán `estimatePassProbability` trong `StatsService` phân định rõ: người học chưa đủ dữ liệu quan sát thực tế (< 3 bài thi hoàn chỉnh) nhận trạng thái `UNCALIBRATED_ESTIMATE`, `isCalibrated: false`, kèm cảnh báo khuyến cáo và khoảng tin cậy rộng (biên độ sai số bảo thủ ±20%).
- **Corpus & NLP Tokenization**:
  - `CorpusAggregator` ghi nhận riêng biệt `observedTokens`, `syntheticTokens`, `observedDocuments`, `syntheticDocuments`.
  - Bộ lọc `dataType: 'observed' | 'synthetic' | 'all'` cho phép tách biệt từ vựng xuất hiện trong đề thi thật chính thức (`official_past_exam`), câu hỏi sinh bởi AI (`synthetic`), hoặc từ vựng xuất hiện ở cả hai nguồn (`mixed`).
- **Xuất dữ liệu Dataset Export**:
  - `exportDatasetToCsv` và `exportDatasetToXlsx` bổ sung các cột `ObservedFrequency`, `SyntheticFrequency`, và nhãn `DataType`, đảm bảo tính minh bạch xuất xứ dữ liệu phục vụ nghiên cứu và kiểm thử.

## 3. Kiểm định & Kết quả kiểm tra

Hệ thống đã triển khai và vượt qua 100% các bộ kiểm thử:
1. `pnpm test:import-validation`: 46/46 tests passed (gói chuẩn, ruby, passage table/image, star/blank, timeline audio ms, assertNoAnswerLeak).
2. `pnpm test:providers:live`: 12/12 tests passed (kiểm định 4 điều kiện ngoài `ai-provider`, `tts-provider`, `dictionary`, `sample-rights` với trạng thái `BLOCKED_EXTERNAL`).
3. `pnpm test:learning:all`: 24/24 tests passed (16 tests notebook/srs/tts + 8 tests workflow E2E sinh câu qua moderation đến làm bài & phân biệt observed/synthetic data).

### Khắc phục cổng kiểm tra chung (Assignment V05-2)
- **Vấn đề lượt trước**: Lệnh `pnpm test` chạy trên bản checkout sạch gặp lỗi timeout trong hook `beforeAll` (60000ms) tại `apps/web/tests/performance.test.tsx` do hook này cố gắng tự biên dịch `pnpm run build` cho `@jlpt/web` trong khi các suite test khác đang chạy đồng thời làm CPU quá tải.
- **Giải pháp**: Cập nhật script `"test"` trong file `package.json` gốc (`allowedPaths`) thành `"turbo run build --filter=@jlpt/web && VITEST_MAX_WORKERS=1 turbo run test --concurrency=2"`. Việc này bảo đảm các artifacts Next.js (`prerender-manifest.json`, `static/chunks`) đã được turbo build và lưu cache từ trước. Nhờ đó `performance.test.tsx` không phải trigger build lại trong hook test vitest, loại trừ hoàn toàn nguy cơ timeout.
- **Xác thực toàn bộ cổng chung**:
  - `pnpm install --frozen-lockfile`: Hoàn thành thành công (0 lỗi).
  - `pnpm lint`: 13 packages passed (0 lỗi).
  - `pnpm typecheck`: 19 packages passed (0 lỗi).
  - `pnpm test`: 19 packages passed (472/472 unit/integration tests passed, exitCode: 0).
  - `pnpm build`: 12 packages passed (exitCode: 0).

