# Quyết định kỹ thuật P02: Dữ liệu âm Hán Việt cho Kanji từ Unicode Unihan

- **Task:** P02
- **Worker:** W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Nhánh:** `task/P02`
- **Dependencies:** I01 (đã merge)
- **Tiêu chí nghiệm thu:**
  1. Script nhập chạy lại không tạo trùng, ghi nguồn và giấy phép.
  2. 経済 trả KINH TẾ; chữ không có dữ liệu trả rỗng.
  3. API trả hanViet trong tra từ, sổ tay và giải thích; có test.

---

## 1. Bối cảnh và nguyên tắc chỉ đạo

1. **Phạm vi P02:**
   - Nhập âm Hán Việt cho Kanji từ trường `kVietnamese` của Unicode Unihan (phiên bản 15.1.0, giấy phép Unicode Terms of Use).
   - Chuẩn hóa Unicode NFC và định dạng in hoa (ví dụ: `KINH TẾ`).
   - Lưu trữ dữ liệu Kanji chuẩn hóa và tích hợp vào engine từ điển của `@jlpt/content-tools`.
   - Cung cấp API tra từ, sổ tay cá nhân và giải thích bài tập/quiz trả về trường `hanViet`.
   - Chữ Hán không có dữ liệu (như Quốc tự Kokuji `込`, `峠`, hoặc chữ không có âm Hán Việt chuẩn) thì để trống `""`, tuyệt đối không phỏng đoán hay tự suy diễn.

2. **Quy tắc an toàn, dữ liệu và bản quyền:**
   - Toàn bộ nội dung tiếng Nhật và tiếng Việt bảo tồn chuẩn Unicode NFC, không áp dụng NFKC biến đổi chữ.
   - Tôn trọng giấy phép nguồn: Unicode Character Database Terms of Use (https://www.unicode.org/terms_of_use.html).
   - Nguyên tắc idempotent: Script nhập dữ liệu chạy lại nhiều lần không sinh trùng lặp, không gây lỗi và ghi nhận đầy đủ nguồn gốc (provenance).

---

## 2. Các quyết định kỹ thuật đã triển khai

### 2.1. Nguồn dữ liệu và xử lý biến thể Kanji Nhật Bản (`tools/import-data/`)

- **Vấn đề kVietnamese trong Unihan:**
  - Bảng Unihan chuẩn (`Unihan_Readings.txt`) chứa trường `kVietnamese` chủ yếu dựa trên các dạng chữ Hán phồn thể (Kyujitai) lịch sử.
  - Nhiều chữ Hán Tân tự thể thông dụng trong tiếng Nhật hiện đại (Shinjitai, ví dụ `経` U+7D4C, `済` U+6E08) không có trường `kVietnamese` trực tiếp, trong khi dạng chính thể truyền thống của chúng (`經` U+7D93, `濟` U+6FDF) có âm Hán Việt tương ứng là `KINH` và `TẾ`.
- **Giải pháp:**
  - Xây dựng seed dataset `tools/import-data/data/unihan-hanviet-seed.json` (19.403 chữ) kết hợp từ `kVietnamese` và bảng biến thể `kJapaneseOldVariant` / `kTraditionalVariant` của Unicode Unihan.
  - Script nhập `tools/import-data/bin/import-hanviet.js` tự động chuẩn hóa từng mục:
    - Loại bỏ dấu thanh Nôm không hợp lệ, chuẩn hóa Unicode NFC.
    - Chuyển thành in hoa (UPPERCASE) theo chuẩn Hán Việt.
    - Ghi nhận đầy đủ metadata: Nguồn `Unicode Unihan Database (Unicode Character Database)`, Version `15.1.0`, License `Unicode Terms of Use`.
    - Đảm bảo tính idempotent: Thực thi nhiều lần cho kết quả nhất quán 100%, không sinh bản ghi trùng.

### 2.2. Gói NLP và thư viện phân giải âm Hán Việt (`packages/content-tools/src/nlp/`)

- **Vấn đề:** Các dịch vụ ứng dụng cần phân giải âm Hán Việt nhanh chóng, không gọi mạng ngoài và không vi phạm quy tắc offline-first.
- **Giải pháp:**
  - `hanviet-data.ts` & `hanviet-data.json`: Nhúng tập dữ liệu Unihan đã nén và chỉ mục hóa vào `@jlpt/content-tools`.
  - `hanviet.ts`: Cung cấp các hàm thuần (pure functions):
    - `getHanVietForKanji(kanji: string): string`: Tra cứu âm Hán Việt cho 1 ký tự Kanji. Trả về dạng NFC in hoa (ví dụ: `経` -> `'KINH'`). Nếu là Kokuji hoặc không có dữ liệu, trả về chuỗi rỗng `''`.
    - `getHanVietForWord(word: string): string`: Tách các chữ Hán trong từ, tra cứu âm từng chữ và ghép lại bằng dấu cách (ví dụ: `経済` -> `'KINH TẾ'`, `食べる` -> `'THỰC'`, `打ち合わせ` -> `'ĐẢ HỢP'`, từ thuần kana `さようなら` -> `''`).
    - `hasHanVietData(text: string): boolean`: Kiểm tra xem từ/chữ có âm Hán Việt hay không.
    - `getHanVietLicenseInfo()`: Cung cấp thông tin bản quyền và nguồn trích xuất dữ liệu.
  - Tích hợp vào `kanji-dict.ts`, `vocab-dict.ts` và `dictionary-adapter.ts`: Mọi tra cứu từ vựng và chữ Hán tự động bổ sung trường `hanViet`.

### 2.3. Tích hợp API Tra từ, Sổ tay và Giải thích (`apps/api/`)

1. **Tra cứu từ điển (Tra từ):**
   - `apps/api/src/modules/vocab/vocab.service.ts`: `lookupDictionary` trả về `hanViet` cho cả tra cứu từ vựng phức hợp và tra cứu đơn ký tự Kanji.
   - `apps/api/src/modules/vocab/vocab.controller.ts`: Bổ sung endpoint công khai `GET /api/v1/dictionary/hanviet` nhận query `text` hoặc `q`, trả về âm Hán Việt tổng thể, phân rã từng chữ Hán và giấy phép bản quyền Unihan.
2. **Sổ tay từ vựng (Sổ tay):**
   - `apps/api/src/modules/vocab/corpus.service.ts`: Khi thêm từ vào sổ tay qua `addWordsToNotebook`, hệ thống tự động trích xuất âm Hán Việt và lưu vào tags với tiền tố `hanviet:${hanViet}`, đồng thời trả về `hanViet` trong danh sách kết quả.
   - `apps/api/src/modules/learning/notebook.service.ts`: Khi người dùng tạo hoặc xem sổ tay (`createItem`, `getItem`, `listItems`), trường `hanViet` được tự động trích xuất từ tags hoặc tính toán tự động qua `getHanVietForWord`.
   - `apps/api/src/modules/learning/flashcard.service.ts`: Khi tạo flashcard (`generateCardForNotebookItem`), mặt sau của thẻ học chứa trường `hanViet` để hỗ trợ ghi nhớ từ Hán Việt.
3. **Giải thích câu hỏi và bài tập (Giải thích):**
   - `apps/api/src/modules/learning/quiz.service.ts`: Trong `generateNotebookQuiz`, mỗi câu hỏi trắc nghiệm được sinh ra trả về trường `hanViet` và chèn âm Hán Việt trực tiếp vào phần giải thích `explanation` (ví dụ: `「経済」 [KINH TẾ] (けいざい): Kinh tế`).

### 2.4. Khắc phục các điểm góp ý từ Review (Vòng 3)

- **Root `package.json`**: Revert script `import:hanviet` ở root `package.json` để bảo toàn phạm vi task P02 và không vi phạm khóa `dependency-lock`/manifest. Lệnh `import-hanviet` đã sẵn sàng trong `tools/import-data/package.json` và có thể chạy qua `pnpm --filter @jlpt/import-data import-hanviet`.
- **Dải Unicode CJK BMP**: Cập nhật regex `KANJI_CHAR_REGEX` và `KANJI_GLOBAL_REGEX` từ `[\u4e00-\u9faf\u3400-\u4dbf]` thành `[\u4e00-\u9fff\u3400-\u4dbf]` theo đúng chuẩn CJK Unified Ideographs Unicode 15.1.
- **Xác thực đầu vào `getHanVietForKanji`**: Bổ sung `if (Array.from(normalized).length !== 1) return '';`. Đảm bảo gọi `getHanVietForKanji('経済')` trả về chuỗi rỗng `''` thay vì tự ý cắt ký tự đầu, yêu cầu gọi đúng hàm `getHanVietForWord('経済')` để lấy `'KINH TẾ'`.

---

## 3. Bằng chứng kiểm thử và nghiệm thu

1. **Kiểm tra script nhập và idempotency (`pnpm test:import-validation`):**
   - 56/56 tests đạt chuẩn.
   - Xác minh script `node tools/import-data/bin/import-hanviet.js` chạy nhiều lần không lỗi, không tạo trùng.
   - Kiểm tra `getHanVietLicenseInfo()` trả về đầy đủ nguồn Unicode Unihan 15.1.0 và giấy phép Unicode Terms of Use.
2. **Kiểm tra nghiệp vụ âm Hán Việt:**
   - `getHanVietForWord('経済')` -> `'KINH TẾ'`.
   - `getHanVietForKanji('経済')` -> `''` (xác thực độ dài đơn ký tự nghiêm ngặt).
   - Chữ không có dữ liệu: Kokuji `getHanVietForKanji('込')` -> `''`, `getHanVietForWord('さようなら')` -> `''`.
   - Từ hỗn hợp Kanji và Kana: `getHanVietForWord('食べる')` -> `'THỰC'`.
3. **Kiểm tra API học thông minh và từ điển (`pnpm test:learning:all` & `vocab.test.ts`):**
   - `pnpm test:learning:all`: 31/31 tests đạt chuẩn (bao gồm lưu sổ tay, sinh bài tập giải thích có âm Hán Việt và tạo flashcard).
   - `vocab.test.ts`: 16/16 tests đạt chuẩn (tra từ điển trả về `hanViet`, endpoint `GET /api/v1/dictionary/hanviet` trả về đúng cấu trúc).

