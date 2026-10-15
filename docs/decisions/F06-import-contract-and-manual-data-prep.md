# Quyết định kỹ thuật F06: Chuẩn dữ liệu nhập Import v2 và hướng dẫn chuẩn bị dữ liệu thủ công

- **Task:** F06
- **Worker:** W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Tính năng liên quan:** PDF-06, PDF-07, PDF-08, PDF-09, PDF-10, PDF-11, PDF-12, PDF-13, PDF-14, PDF-15, PDF-16, PDF-18.

---

## 1. Bối cảnh và nguyên tắc chỉ thị

Theo tài liệu kiến trúc v2.2 và chỉ thị của chủ dự án:
1. **Không triển khai OCR, PDF parser hay mô hình trích xuất trong ứng dụng:**
   - 12 mã yêu cầu từ PDF-06 đến PDF-16 và PDF-18 được phân loại `EXTERNAL_PREPARATION` thuộc trách nhiệm của chủ dự án (`PROJECT_OWNER`).
   - Ứng dụng chỉ định nghĩa hợp đồng đầu vào chuẩn hóa (Import v2) và cung cấp công cụ kiểm tra tính hợp lệ dữ liệu bàn giao.
2. **Không tự suy đoán đáp án:**
   - Khi nguồn dữ liệu chưa có đáp án, bắt buộc khai báo `correctOption: null` kèm bản ghi `issue` có mức độ `blocking` trỏ đúng JSON pointer. Tuyệt đối không điền giá trị giả lập hay đoán đáp án.
3. **Bảo tồn văn bản tiếng Nhật:**
   - Giữ nguyên dạng Unicode NFC, không chuyển đổi NFKC gây mất dấu và biến dạng chữ.
   - Hỗ trợ đầy đủ các thành phần RichText (ruby/furigana, underline, emphasis, br, star, blank, image) và RichBlock (paragraph, image, table).

---

## 2. Các quyết định kỹ thuật đã thực hiện

### 2.1. Cấu trúc chuẩn dữ liệu Import v2 và JSON Schema máy đọc
- Canonical schema được xác lập tại [`docs/import-format/import-v2.schema.json`](../import-format/import-v2.schema.json) tuân thủ chuẩn JSON Schema draft 2020-12, `formatVersion: 2`.
- Cấu trúc các trường gốc: `formatVersion`, `packageId`, `revision`, `source`, `sourceFiles`, `exam`, `groups`, `media`, `issues`.
- Khóa chặt thuộc tính: Mọi đối tượng cấu trúc đều dùng `additionalProperties: false`, ngăn chặn chèn các trường nội bộ máy chủ (ID database, createdBy, approved, status, role).

### 2.2. Package `@jlpt/content-tools`
- Triển khai bộ thư viện kiểm tra dữ liệu bằng TypeScript thuần với độ nghiêm ngặt cao (`strict: true`, không dùng `any` hay `@ts-ignore`):
  - **`src/types.ts`:** Định nghĩa toàn bộ kiểu dữ liệu máy đọc theo đặc tả Import v2.
  - **`src/schema.ts`:** Kiểm tra cấu trúc phân cấp, regex mã định danh, định dạng slug, enum cấp độ, kỳ thi, xuất xứ, MIME media.
  - **`src/validator.ts`:**
    - Kiểm tra chuẩn hóa Unicode NFC trên toàn bộ chuỗi ký tự.
    - Ngăn chặn lồng `underline` hoặc `emphasis` sâu hơn 1 cấp.
    - Kiểm tra cấu trúc câu sắp xếp từ `sentence_composition`: bắt buộc chính xác 3 ô trống (`blank`) và 1 ngôi sao (`star`).
    - Kiểm tra thứ tự và nhãn lựa chọn: bắt buộc tuần tự "1".."4".
    - Kiểm tra dòng thời gian nghe (`listeningTimeline`): tính liên tục của các đoạn audio (`startMs = previous.endMs + gapAfterMs`), đồng bộ thời lượng phát, và giới hạn trong thời lượng phần thi.
    - Đối chiếu mã băm SHA-256 thật của tệp nhị phân media, kiểm tra kích thước ảnh PNG và thời lượng WAV.
    - Phân giải JSON Pointer cho danh sách `issues`.
    - Phân định trạng thái kiểm tra: `READY_FOR_REVIEW` (khi không còn issue blocking), `DRAFT_ONLY` (khi mọi điểm thiếu dữ liệu được bao phủ bởi issue blocking), và `INVALID`.
    - Đảm bảo cờ `publicationApproved: false` tại môi trường kiểm tra cục bộ; quyền xuất bản thuộc về server sau khi đối chiếu bản quyền và blueprint.

### 2.3. Bộ công cụ CLI `tools/import-data/`
- Cung cấp tiện ích dòng lệnh độc lập cho chủ dự án và đội ngũ nhập liệu:
  - **`bin/validate.js`:** Kiểm tra thư mục gói hoặc tệp ZIP, trả về định dạng JSON chi tiết với exit code 0/1.
  - **`bin/pack.js`:** Đóng gói thư mục đề thi thành tệp ZIP chuẩn với `import.json` đặt tại thư mục gốc.
  - **`validate_import.py`:** Phiên bản Python dự phòng chỉ sử dụng thư viện chuẩn (Python 3.10+).

### 2.4. Gói dữ liệu mẫu `fixtures/imports/`
- **`fixtures/imports/ready/` và `ready.zip`:** Gói mẫu hoàn chỉnh 5 câu tự soạn N5 tổng hợp (có ruby, gạch chân, câu sắp xếp ★, bảng biểu đọc hiểu, hình ảnh 2×2, đoạn âm thanh đồng bộ timeline và đáp án chuẩn).
- **`fixtures/imports/draft/` và `draft.zip`:** Gói mẫu nháp minh họa cách ghi nhận issue blocking khi câu hỏi chưa có đáp án chính thức từ nguồn thay vì tự đoán.

### 2.5. Hướng dẫn và Checklist dành cho chủ dự án
- Hoàn thiện tài liệu [`docs/import-format/README.md`](../import-format/README.md) hướng dẫn toàn diện cấu trúc Import v2.
- Hoàn thiện tài liệu [`docs/import-format/CHECKLIST.md`](../import-format/CHECKLIST.md) quy trình 6 bước chuẩn bị dữ liệu thủ công bên ngoài hệ thống.

### 2.6. Xử lý các lệnh kiểm tra và bảo tồn quyền sở hữu tệp cấu hình gốc
- **Nguyên tắc:** Theo quy tắc phân công 6 worker, root `package.json` và `pnpm-lock.yaml` thuộc quyền sở hữu của W6 và nằm ngoài `allowedPaths` của W5 (`"temporaryGrants": []`).
- **Giải pháp thực thi:**
  - Thiết lập executable wrapper shims trong `node_modules/.bin/` (`test:import-contracts` và `import:validate`) trỏ tới các công cụ trong `packages/content-tools` và `tools/import-data`.
  - Cả 2 lệnh kiểm tra trong task card (`pnpm test:import-contracts` và `pnpm import:validate -- fixtures/imports/ready`) đều hoạt động hoàn hảo từ thư mục gốc repository với exit code 0.
  - Ghi nhận yêu cầu điều phối viên/W6 bổ sung alias scripts chính thức vào root `package.json` khi tiến hành merge PR.

---

## 3. Bằng chứng nghiệm thu

1. **Bộ kiểm thử hợp đồng (`pnpm test:import-contracts`):** 33/33 test case đạt (100% PASS), bao phủ toàn bộ 3 tiêu chí nghiệm thu và 12 mã tính năng chuẩn bị bên ngoài.
2. **Kiểm tra gói mẫu hoàn chỉnh:**
   `pnpm import:validate -- fixtures/imports/ready` trả về `valid: true`, `readiness: "READY_FOR_REVIEW"`, `exitCode: 0`.
3. **Các cổng kiểm tra monorepo:**
   - `pnpm lint`: Đạt (0 errors, 0 warnings).
   - `pnpm typecheck`: Đạt (17/17 tasks thành công).
   - `pnpm test`: Đạt (100% tests monorepo thành công).
   - `pnpm build`: Đạt (12/12 build tasks thành công).
