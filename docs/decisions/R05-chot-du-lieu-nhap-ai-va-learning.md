# Quyết định kiến trúc R05: Chốt dữ liệu nhập AI learning và dữ liệu

- **Task**: R05 (Chốt dữ liệu nhập AI learning và dữ liệu)
- **Worker**: W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Ngày**: 2026-10-17
- **Trạng thái**: APPROVED (Nghiệm thu chốt R05)
- **Base SHA**: `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Nhánh**: `task/R05`

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ

Nhiệm vụ **R05** là bước nghiệm thu chốt toàn diện các phân hệ:
1. **Chuẩn nhập liệu và Đóng gói đề thi** (`tools/import-data/`, `packages/content-tools/`, `fixtures/imports/`, `docs/import-format/`):
   - Đảm bảo 100% tuân thủ chuẩn Import v2 (`import-v2.schema.json`).
   - Giữ nguyên vẹn cấu trúc đề thi phong phú: Ruby Furigana (`{ t: 'ruby', text, rt }`), bảng biểu RichBlock trong bài đọc (`{ type: 'table', rows }`), hình ảnh đính kèm có mã băm SHA-256 xác thực, câu sắp xếp từ có 1 sao (`{ t: 'star' }`) và 3 chỗ trống (`{ t: 'blank' }`), cùng mốc thời gian âm thanh nghe (`listeningTimeline`) độ chính xác mili-giây.
   - Chống rò rỉ đáp án tuyệt đối (`assertNoAnswerLeak`, `PublicExamSnapshotSchema`): Tách biệt hoàn toàn `PublicExamSnapshot` công khai không chứa bất kỳ trường đáp án hay lời giải nào (`correctOption`, `correctOptionIndex`, `explanation`, `answer`) khỏi `answerKeys` được lưu trữ riêng biệt phục vụ chấm điểm.
   - Cơ chế phát hiện nháp và cách ly (`DRAFT_ONLY` vs `READY_FOR_REVIEW`): Các gói có vấn đề chưa xác định hoặc chứa nhãn `[KHONG_DOC_RO]` chỉ được lưu ở chế độ draft và bị chặn hoàn toàn ở chế độ ready; `publicationApproved` luôn là `false` ở công cụ local.
   - Công cụ CLI kiểm tra và đóng gói đề thi (`validate.js`, `pack.js`, `validate_import.py`): Hỗ trợ kiểm định đa nền tảng (Node.js native song song Python standalone), hỗ trợ cờ `--blueprint` kiểm tra cấu trúc ma trận đề chuẩn.
2. **Học tập thông minh và Trí tuệ nhân tạo** (`apps/api/src/modules/ai/`, `apps/api/src/modules/learning/`, `apps/api/src/modules/vocab/`, `apps/api/src/modules/stats/`, `apps/api/src/modules/planner/`, `apps/api/src/modules/gamification/`):
   - Quy trình sinh câu hỏi luyện tập AI khép kín: Sinh câu -> Kiểm duyệt tự động (Moderation: độ dài, số lựa chọn 3-4, chuẩn hóa Unicode NFC, lọc prompt injection) -> Duyệt hai người (Two-person review: staff approve/reject) -> Học viên làm bài với dữ liệu đã qua `assertNoAnswerLeak` -> Chấm điểm và trả về lời giải thích chi tiết.
   - Phòng chống xâm nhập và rò rỉ dữ liệu: Chặn triệt để tham số phía client chứa `apiKey`, `rawSecret`, `systemPrompt`, `toolPermissions`, hay `answerKey`.
   - Bảo vệ phòng thi thật và Event Embargo: Chặn 100% yêu cầu AI khi học viên đang trong phiên thi thật chính thức (`mode: 'real', status: 'in_progress'`) hoặc đề thi thuộc sự kiện đang trong thời gian giữ bí mật (`resultReleaseAt > Date.now()`).
   - Phân định triệt để giữa Dữ liệu Thật (Observed) và Dữ liệu Sinh/Mô phỏng (Synthetic): Tách bạch số lượng token và tài liệu trong `CorpusAggregator`; thuật toán đánh giá năng lực `evaluateReadiness` giữ trạng thái trung thực `UNCALIBRATED_ESTIMATE` kèm khuyến cáo và biên độ sai số bảo thủ khi học viên chưa đủ 3 bài thi thật; xuất báo cáo CSV/XLSX với đầy đủ xuất xứ `DataType: observed | synthetic | mixed` và trung hòa Formula Injection theo RFC 4180.

---

## 2. Kết quả Tự Rà soát Độc lập theo Chuẩn REVIEW.md (Zero P0/P1)

Tiến hành tự rà soát toàn bộ diff và mã nguồn theo tiêu chuẩn reviewer độc lập (`docs/multi-worker/prompts/REVIEW.md`):

### 2.1. Kiểm tra P0: An toàn Bảo mật, Không Rò rỉ Đáp án và Toàn vẹn Dữ liệu
- **Không rò rỉ đáp án hoặc lời giải (Zero Answer/Explanation Leak)**:
  - Hàm `buildSnapshotFromImportPackage` tách biệt tuyệt đối `PublicExamSnapshot` và `answerKeys`.
  - Toàn bộ snapshot công khai được kiểm tra qua `assertNoAnswerLeak(snapshot)` và `PublicExamSnapshotSchema.parse(snapshot)`. Bất kỳ trường nào chứa `correctOption`, `correctOptionIndex`, `explanation`, `answer` đều bị ném lỗi ngay lập tức.
  - API `getApprovedGeneratedQuestionForPractice` trả về cấu trúc câu hỏi AI đã qua kiểm tra `assertNoAnswerLeak`, không chứa đáp án hay giải thích.
- **Cách ly phòng thi thật và Embargo**:
  - `AiService.assertNoActiveExamOrEmbargo` chặn toàn bộ hành động AI khi học viên có bài thi thật đang làm dở (`mode: 'real', status: 'in_progress'`) hoặc kỳ thi sự kiện chưa đến giờ công bố kết quả (`resultReleaseAt`).
- **Phòng chống tấn công và tiêm mã (Injection & Secret Exfiltration)**:
  - `AiService.validateClientPayload` từ chối ngay lập tức với mã 400 Bad Request nếu client cố tình gửi các trường `apiKey`, `rawSecret`, `systemPrompt`, `toolPermissions`, `answerKey`.
  - Bộ lọc moderation phát hiện và chặn các mẫu prompt injection phổ biến (`ignore previous instructions`, `jailbreak`, `system override`, `drop table`, `reveal prompt`).
  - Hàm xuất CSV `sanitizeCsvField` và XLSX `sanitizeXlsxValue` trung hòa toàn bộ các ký tự thực thi lệnh (`=`, `+`, `-`, `@`, `\t`, `\r`, `|`, `%`, `;`) bằng cách thêm dấu nháy đơn `'`.
- **Toàn vẹn chi phí và token nguyên tử**:
  - Đặt chỗ token trước khi gọi provider (`usageReservations`), ghi nhận vào sổ cái `usageLedger` và phát sự kiện `ai.request.settled` khi thành công; tự động hoàn lại reservation (`settledAt` với `estimatedTokens: 0`) và phát sự kiện `ai.request.cancelled` khi provider gặp lỗi.

### 2.2. Kiểm tra P1: Tiêu chí Nghiệm thu, Hợp đồng và Tính Độc lập Tích hợp Thật
- **Chuẩn hóa tiếng Nhật bắt buộc NFC**:
  - Toàn bộ văn bản tiếng Nhật trong gói nhập, từ điển và câu hỏi AI sinh ra đều bắt buộc chuẩn hóa Unicode NFC (`text.normalize('NFC') === text`), từ chối các ký tự phân rã NFD hay biến thể NFKC làm sai lệch nội dung gốc.
- **Tính toán năng lực Honest Cold-Start**:
  - Không tự bịa đặt xác suất đỗ khi chưa đủ dữ liệu thực tế (< 3 bài thi hoàn chỉnh), trả về `isCalibrated: false`, `status: UNCALIBRATED_ESTIMATE` kèm khoảng tin cậy rộng và thông điệp cảnh báo rõ ràng.
- **Idempotency trong nhập lại gói đề**:
  - Hàm `computePackageContentHash` tính mã băm nội dung bất biến với thứ tự sắp xếp thuộc tính JSON.
  - Gói trùng `packageId` và cùng `contentHash` không tạo bản ghi mới; gói thay đổi nội dung bắt buộc phải tăng `revision`, ngăn chặn ghi đè mất mát dữ liệu hoặc xung đột phiên bản.
- **Công cụ dòng lệnh Dual-Stack**:
  - `validate.js`: Hỗ trợ kiểm định gói thư mục và tệp nén ZIP, hỗ trợ cờ `--mode ready|draft` và `--blueprint <path>`.
  - `pack.js`: Hỗ trợ đóng gói Node.js native qua `createZipBuffer` của `@jlpt/content-tools` và fallback Python `zipfile` độc lập.
  - `validate_import.py`: Bộ kiểm tra Python chuẩn chạy trực tiếp trên máy chủ dự án không phụ thuộc bên ngoài.

---

## 3. Xác nhận Các Cổng Kiểm tra Bắt buộc (Gates & Checks)

Tất cả các lệnh kiểm tra theo yêu cầu assignment và cổng CI chung đều vượt qua 100%:

| Lệnh | Kết quả | Chi tiết |
|---|---|---|
| `pnpm test:import-validation` | **PASS (50/50)** | Gói chuẩn, ruby, passage tables/images, stars/blanks, timeline ms, zero answer leak, CLI tools validate & pack, python validator parity, re-import idempotency |
| `pnpm test:learning:all` | **PASS (28/28)** | 16 tests notebook/srs/tts + 8 tests V05 learning workflow + 4 tests R05 chốt AI security, real exam guard, token quota & E2E practice workflow |
| `pnpm test:providers:live` | **PASS (12/12)** | Kiểm định 4 điều kiện ngoài `ai-provider`, `tts-provider`, `dictionary`, `sample-rights` với trạng thái `BLOCKED_EXTERNAL` |
| `pnpm test:import-contracts` | **PASS (31/31)** | Hợp đồng nhập liệu F06, cấu trúc dữ liệu không OCR, 12 tính năng chuẩn bị bên ngoài |
| `pnpm test:ai` | **PASS (27/27)** | 15 tính năng AI (AI-01..14, EXPL-11), quota nguyên tử, bảo vệ active real exam, hai người duyệt |
| `pnpm test:dataset-export` | **PASS (32/32)** | Xuất khẩu CSV/XLSX, phân định dữ liệu observed vs synthetic, bảo vệ formula injection |
| `pnpm test:vocab-data` | **PASS (9/9)** | Ingestion, tần suất theo kỳ/level/skill/role, tra cứu từ điển có bản quyền, kanji & grammar tags |
| `pnpm test:nlp` | **PASS (19/19)** | Lemmatizer, tokenizer, kanji analyzer, grammar dict, corpus aggregator |
| `pnpm test:planner` | **PASS (7/7)** | Lập kế hoạch 30/60/90 ngày, đếm ngược timezone, bù buổi lỡ, tổng ôn, đánh giá sẵn sàng |
| `pnpm test:gamification` | **PASS (10/10)** | Streak chống replay, huy hiệu, bảng xếp hạng tự nguyện phân tách theo level, thử thách |
| `pnpm test:analytics-data` | **PASS (7/7)** | Thống kê năng lực, no-data readiness honest state, speed-accuracy |
| `pnpm features:verify` | **PASS (363/363)** | 100% tính năng ứng dụng có bằng chứng test, 12 tính năng chuẩn bị bên ngoài báo riêng, zero stubs |
| `pnpm install --frozen-lockfile` | **PASS** | Lockfile up-to-date, zero drift |
| `pnpm lint` | **PASS** | 0 lỗi ESLint trên toàn bộ 13 packages |
| `pnpm typecheck` | **PASS** | 0 lỗi TypeScript trên toàn bộ 20 packages |
| `pnpm build` | **PASS** | Turbo run build hoàn tất thành công |
| `pnpm test` | **PASS** | Toàn bộ 489+ bài kiểm tra trong monorepo vượt qua |

---

## 4. Tình trạng Bên ngoài (External Status)

- **AI Live Provider**: `BLOCKED_EXTERNAL: ai-provider`. Hệ thống hoạt động độc lập và an toàn ở chế độ sandbox. `LiveAiProvider` báo trạng thái `configured: false` và ném `ExternalPrerequisiteError('ai-provider', 'BLOCKED_EXTERNAL')` khi chưa được cấu hình khóa bí mật trong môi trường. Sẵn sàng tích hợp dịch vụ AI trả phí ngay khi chủ dự án phê duyệt hạn mức và cung cấp API key.
- **TTS Live Provider**: `BLOCKED_EXTERNAL: tts-provider`. Tự động fallback về sandbox an toàn trong môi trường phát triển và kiểm thử; báo `BLOCKED_EXTERNAL` đối với yêu cầu phát âm trực tiếp chưa có credentials.
- **Từ điển Mở rộng**: `BLOCKED_EXTERNAL: dictionary`. Từ điển sandbox tích hợp đầy đủ thông tin bản quyền và xuất xứ theo giấy phép EDRDG / CC-BY-SA 4.0; ném `BLOCKED_EXTERNAL` khi kích hoạt chế độ external provider mà thiếu thông tin xác thực.
- **Bản quyền Dữ liệu & Đề thi Nguồn**: `sample-rights` và `prepared-import-data` được bảo vệ nghiêm ngặt: gói đề có trạng thái `unverified` hoặc thiếu đáp án bị cách ly ở chế độ `draft` và tuyệt đối không được phép xuất bản.
