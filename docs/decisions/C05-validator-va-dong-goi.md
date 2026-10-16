# Quyết định kỹ thuật C05: Validator gói nhập kiểm tra dữ liệu và đóng gói

- **Task:** C05
- **Worker:** W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Tính năng liên quan:** PDF-21, PDF-22, PDF-23, PDF-27.
- **Dependencies:** F06, F08 (đã merge).
- **Điều kiện ngoài:** `sample-rights` (MISSING - BLOCKED_EXTERNAL). Thực hiện kiểm thử toàn bộ bằng fixtures tự soạn và bộ demo sandbox `docs/multi-worker/demo-data/demo-n5-1.zip`.

---

## 1. Bối cảnh và nguyên tắc chỉ thị

1. **Phạm vi task C05:**
   - Xây dựng và hoàn thiện bộ kiểm tra dữ liệu nhập đề thi (Import v2) ở cấp độ thư viện TypeScript (`packages/content-tools`) và CLI (`tools/import-data/`).
   - Kiểm tra JSON Schema, đáp án, nhóm đọc/nghe, references, media/checksums, archive paths, issues và idempotency.
   - Tuyệt đối không phân tích PDF trong ứng dụng, không tích hợp OCR hay gọi AI sửa ngầm dữ liệu.
2. **Quy tắc an toàn dữ liệu và bản quyền:**
   - Không tự suy đoán đáp án: thiếu đáp án bắt buộc khai báo `correctOption: null` kèm issue `blocking`.
   - Bảo tồn Unicode NFC cho toàn bộ văn bản tiếng Nhật.
   - Bản quyền chính thức (`sample-rights`) chưa sẵn sàng: ghi nhận `BLOCKED_EXTERNAL`, không giả lập đã được cấp quyền thật.

---

## 2. Các quyết định kỹ thuật đã triển khai

### 2.1. Đọc và giải nén ZIP trong bộ nhớ bằng TypeScript thuần (`packages/content-tools/src/zip.ts`)

- **Vấn đề:** Trước đây việc kiểm tra gói ZIP phụ thuộc script Python `validate_import.py` bên ngoài hoặc trả về lỗi không hỗ trợ file ZIP trong TypeScript.
- **Giải pháp:**
  - Hiện thực bộ đọc cấu trúc ZIP Central Directory bằng `node:zlib` và `Buffer` thuần trong TypeScript.
  - Phòng vệ nghiêm ngặt chống tấn công:
    - **Zip bomb:** Giới hạn tối đa 2000 files, kích thước file đơn lẻ tối đa 120 MiB, tổng dung lượng giải nén tối đa 500 MiB, tỷ lệ nén tối đa 200:1.
    - **Path traversal:** Chặn các đường dẫn có `..`, `\`, ổ đĩa `:`, null byte `\0`, đường dẫn tuyệt đối bắt đầu bằng `/`.
    - **Symlinks & Encryption:** Chặn symlinks trong ZIP (`0o120000` attribute) và ZIP mã hóa (flag bit 0).
    - **Duplicate files:** Chặn các file trùng tên (kể cả chỉ khác chữ hoa/thường).
    - **import.json:** Bắt buộc có ở gốc gói, giới hạn tối đa 10 MiB, kiểm tra JSON không có key trùng lặp.
  - `loadPackageArchive` và `validatePackagePath` hỗ trợ trực tiếp cả thư mục giải nén lẫn tệp nén `.zip`.

### 2.2. Tính toán Content Hash và cơ chế Idempotency chống trùng lặp (Feature PDF-27, Acceptance 4)

- **Mã băm nội dung chuẩn hóa (`computePackageContentHash`):**
  - Thực hiện serialize JSON canonical với các khóa được sắp xếp theo thứ tự bảng chữ cái và chuẩn hóa Unicode NFC.
  - Kết hợp với danh sách mã băm SHA-256 đã sắp xếp của toàn bộ tệp media và sourceFiles.
  - Tạo ra mã băm SHA-256 duy nhất đại diện cho toàn bộ nội dung gói.
- **Bộ đánh giá Idempotency (`evaluatePackageImportIdempotency`):**
  - **`IDEMPOTENT_SKIP` (200 OK):** Cùng `packageId`, cùng `revision`, cùng `contentHash`. Trả về trạng thái đã tồn tại, không sinh bản sao trùng trong database/kho lưu trữ.
  - **`REJECT_CONFLICT` (409 Conflict):** Cùng `packageId`, cùng `revision` nhưng `contentHash` thay đổi. Báo lỗi xung đột nội dung và yêu cầu tăng `revision` để sửa.
  - **`PROCEED_NEW_REVISION` (200 OK):** Cùng `packageId`, `revision` lớn hơn revision cũ, `contentHash` mới. Cho phép cập nhật phiên bản mới của đề.
  - **`REJECT_REGRESSION` (409 Conflict):** Cùng `packageId`, nhưng `revision` gửi lên nhỏ hơn revision hiện tại. Chặn hạ phiên bản.
  - **`PROCEED_INITIAL_IMPORT` (201 Created):** `packageId` mới hoàn toàn.

### 2.3. Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu (Feature PDF-22, Acceptance 1)

- **Thiếu câu:**
  - Nhóm câu hỏi rỗng (`group.questions.length === 0`): báo lỗi `/groups/${gi}/questions: nhóm không có câu hỏi`.
  - Thân câu hỏi rỗng: báo lỗi `/groups/${gi}/questions/${qi}/stem: nội dung câu hỏi rỗng`.
  - Lựa chọn rỗng hoặc số lựa chọn không thuộc [3, 4]: báo lỗi `/groups/${gi}/questions/${qi}/options`.
- **Thiếu đáp án:**
  - `correctOption === null`: Ở chế độ `ready`, báo lỗi chưa có đáp án. Ở chế độ `draft`, nếu có issue `blocking` bao phủ thì được chấp nhận ở trạng thái `DRAFT_ONLY`.
  - `correctOption` ngoài khoảng `1..options.length`: báo lỗi `/groups/${gi}/questions/${qi}/correctOption: đáp án ngoài số lựa chọn`.
- **Trùng câu và trùng lựa chọn:**
  - Trùng `id` câu hỏi toàn gói: báo lỗi `${qp}/id: question id trùng toàn gói`.
  - Trùng số thứ tự câu hỏi `number` trong đề: báo lỗi `${qp}/number: số thứ tự câu (${q.number}) bị trùng trong đề`.
  - Trùng toàn bộ câu hỏi (stem + options): báo lỗi `${qp}: phát hiện câu hỏi bị trùng lặp với câu ...`.
  - Trùng nội dung lựa chọn trong cùng một câu: báo lỗi `${qp}/options: các lựa chọn [i] và [j] trong câu bị trùng nội dung`.

### 2.4. Đối chiếu cấu trúc đề và kiểm tra số câu theo Blueprint (Feature PDF-23, Acceptance 5)

- Module `validateExamAgainstBlueprint`:
  - So sánh tổng số câu của đề (`exam.totalQuestions`) với tổng số câu cấu hình trong blueprint.
  - So sánh từng phần thi (`section.code`) và từng dạng câu hỏi (`mondai.type`):
    - Đếm số câu thực tế của từng `mondaiType` trong các groups của section đó.
    - Đối chiếu chính xác với `questionCount` của từng `mondai` trong blueprint.
    - Nếu không khớp số câu: báo lỗi chi tiết có path `/exam/sections/${si}/mondai/${mondaiType}`.
- Kiểm chứng thực tế:
  - Gói demo `docs/multi-worker/demo-data/demo-n5-1.zip` (29 câu hỏi, 15 nhóm câu, 3 phần thi) đối chiếu với blueprint `synthetic-n5-demo-v1.json` đạt độ khớp 100% và trạng thái `READY_FOR_REVIEW`.

### 2.5. Đánh dấu câu có độ tin cậy OCR thấp và quản lý Issues (Feature PDF-21, Acceptance 2)

- Module `packages/content-tools/src/issues.ts`:
  - `formatPackageIssues`: Thống kê tổng số issue, số issue blocking, warning, và phân loại riêng các vấn đề liên quan đến OCR độ tin cậy thấp (chứa từ khóa ocr, confidence, tin cậy, không đọc rõ, chữ mờ).
  - `getQuestionIssues`: Tra cứu issue theo mã câu hỏi hoặc JSON pointer.
  - `findUnresolvedOcrMarkers`: Quét toàn bộ nội dung tìm các nhãn `[KHONG_DOC_RO]`, xác nhận có issue blocking tương ứng hay chưa.

### 2.6. Bảo đảm đường dẫn lỗi cụ thể (Acceptance 1)

- Mọi lỗi phát hiện đều mang tiền tố JSON pointer hoặc file path cụ thể:
  - Lỗi checksum: `/media/${i}/sha256` hoặc `/sourceFiles/${i}/sha256`
  - Lỗi thiếu file: `/media/${i}/path` hoặc `/sourceFiles/${i}/path`
  - Lỗi timeline: `${tp}/startMs`, `${tp}/endMs`, `${tp}/audioEndMs`, `${tp}/mediaKey`
  - Lỗi đáp án: `${qp}/correctOption`
  - Lỗi lựa chọn: `${qp}/options`
  - Lỗi blueprint: `/exam/sections/${si}/mondai/${mondaiType}`
  - Lỗi file không khai báo: `/files`

---

## 3. Nghiệm thu và Bằng chứng

- **Test contracts:** `pnpm test:import-contracts` (31/31 passed)
- **Test validation:** `pnpm test:import-validation` (40/40 passed)
- **CLI validate ready fixture:** `pnpm import:validate -- fixtures/imports/ready` (exit code 0, READY_FOR_REVIEW)
- **CLI validate demo zip:** `pnpm import:validate -- docs/multi-worker/demo-data/demo-n5-1.zip` (exit code 0, READY_FOR_REVIEW)
- **TypeScript build & typecheck:** `pnpm --filter @jlpt/content-tools build && pnpm --filter @jlpt/content-tools typecheck` (0 errors)
