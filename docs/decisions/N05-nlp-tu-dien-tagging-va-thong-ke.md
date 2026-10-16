# Quyết định kỹ thuật N05: NLP từ điển tagging và dữ liệu thống kê

- **Task:** N05
- **Worker:** W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Trạng thái:** Hoàn tất triển khai (REVIEW)
- **Tính năng liên quan:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, DATA-09, DATA-10, DATA-19, DATA-20, DATA-21, DATA-22, DATA-23, QB-09.
- **Dependencies:** C05, C02 (đã merge).
- **Điều kiện ngoài (External Status):**
  - `dictionary`: MISSING (`BLOCKED_EXTERNAL`) - Đã sẵn sàng adapter từ điển sandbox với đầy đủ cấu trúc bản quyền (CC-BY-SA-4.0 EDRDG JMdict); chặn dịch vụ live production.
  - `sample-rights`: MISSING (`BLOCKED_EXTERNAL`) - Đã hoàn thiện việc gắn provenance, licenseRef và nguồn trong ngữ liệu; chặn bộ đề bản quyền thương mại trực tiếp.

---

## 1. Bối cảnh và nguyên tắc chỉ đạo

1. **Phạm vi N05:**
   - Xây dựng tokenizer và morphological analyzer bằng TypeScript thuần trên RichText và JSON đề thi đã duyệt.
   - Chuẩn hóa dạng từ điển (lemmatization) cho động từ, tính từ và các dạng biến thể tiếng Nhật.
   - Không tích hợp OCR hay đọc trực tiếp file PDF trong ứng dụng.
   - Thống kê tần suất từ vựng, ngữ pháp, chữ Hán theo kỳ thi, cấp độ N1–N5, kỹ năng, vai trò câu.
   - Phân biệt rõ từ xuất hiện ngẫu nhiên trong đề với từ được hỏi trực tiếp.
   - Gắn nhãn tự động cho câu hỏi (QB-09).
   - Quản lý tập ngữ liệu (Corpus Dataset) có đầy đủ metadata và giấy phép từ điển.
2. **Quy tắc an toàn và bản quyền:**
   - Bảo tồn chuẩn Unicode NFC cho toàn bộ văn bản tiếng Nhật (không tự biến đổi full-width sang half-width NFKC trên nội dung gốc).
   - Tôn trọng giấy phép từ điển mẫu JMdict (CC-BY-SA 4.0) và khai báo attribution rõ ràng.
   - Các hàm SRS, mix, scoring, thống kê là hàm thuần, không để AI suy diễn điểm hoặc gán sai đáp án.

---

## 2. Các quyết định kỹ thuật đã triển khai

### 2.1. Bộ tách từ và chuẩn hóa từ điển TypeScript thuần (`packages/content-tools/src/nlp/`)

- **Vấn đề:** Dự án không sử dụng thư viện native binding (như mecab-c) hay thư viện nặng không thuộc dependency-lock để tránh rủi ro bảo mật và biên dịch.
- **Giải pháp:**
  - `lemmatizer.ts`: Hiện thực quy tắc lemmatize hình thái học tiếng Nhật theo nguyên tắc so khớp hậu tố dài nhất trước (longest-suffix first):
    - Động từ bất quy tắc (`する`, `くる`, `行く`) và tính từ bất quy tắc (`いい` / `よい`).
    - Dạng lịch sự `〜ませんでした`, `〜ました`, `〜ません`, `〜ましょう`, `〜ます` cho cả Godan và Ichidan.
    - Dạng quá khứ và thể Te âm biến (Onbin): `〜って/った`, `〜んで/んだ`, `〜いて/いた`, `〜いで/いだ`, `〜して/した`.
    - Dạng phủ định `〜くなかった`, `〜なかった`, `〜くない`, `〜ない`.
    - Tính từ đuôi `い` và tính từ đuôi `な`.
  - `tokenizer.ts`:
    - Tách từ ngữ liệu kết hợp từ điển danh từ/từ ghép Kanji, từ mượn Katakana, từ phái sinh okurigana và trợ từ.
    - Xử lý RichText: trích xuất ngữ âm ruby (`rt`), xác định vai trò câu (`stem`, `option`, `passage`, `instruction`, `transcript`).
    - Trích xuất nhãn từ mục tiêu (`isTarget: true`) khi từ nằm trong thẻ `underline` hoặc là đối tượng hỏi trực tiếp.

### 2.2. Phân biệt từ xuất hiện trong đề và từ được hỏi trực tiếp (Acceptance 1 & DATA-07)

- **Vấn đề:** Trong đề thi JLPT, nhiều từ xuất hiện trong ngữ cảnh câu văn nhưng chỉ có 1 từ cụ thể được gạch chân để kiểm tra cách đọc hoặc ý nghĩa. Nếu chỉ đếm tần suất tổng sẽ làm sai lệch độ quan trọng của từ vựng mục tiêu.
- **Giải pháp:**
  - Khi phân tích RichText, segment có `t: 'underline'` được đánh dấu `isTarget = true`.
  - Trong thống kê `CorpusAggregator`, mỗi từ lưu trữ độc lập:
    - `targetCount`: số lần được hỏi trực tiếp.
    - `incidentalCount`: số lần xuất hiện phụ trong văn cảnh, đáp án nhiễu hoặc bài đọc.
    - `count`: tổng số lần xuất hiện (`targetCount + incidentalCount`).

### 2.3. Thống kê đa chiều (Acceptance 2 & DATA-03..06, DATA-08..10)

- `CorpusAggregator` tổ chức thống kê đa chiều:
  - **Theo cấp độ (DATA-04):** `byLevel: { N1, N2, N3, N4, N5 }`.
  - **Theo kỳ và năm thi (DATA-05):** `bySession: { '2023-12': ..., '2022-07': ... }`.
  - **Theo kỹ năng (DATA-06):** `bySkill: { kanji, vocabulary, grammar, reading, listening }`.
  - **Theo vai trò câu (DATA-08):** `byRole: { stem, option, passage, instruction, transcript }`.
  - **Theo nguồn đề (provenance):** `bySource: { [sourceName]: count }`.
  - **Xếp hạng từ vựng (DATA-09):** `rankings` xếp thứ tự tần suất giảm dần kèm thứ hạng `rank`.
  - **Đếm số đề thi khác nhau (DATA-10):** `distinctExamsCount` và danh sách định danh đề thi `examIds`.

### 2.4. Phân tích mẫu ngữ pháp và Hán tự (DATA-19..23)

- `GrammarAnalyzer` (`grammar-dict.ts` & `grammar-analyzer.ts`):
  - Cơ sở dữ liệu mẫu ngữ pháp từ N5 đến N1 (ví dụ `てはいけない`, `なければならない`, `わけにはいかない`, `につれて`, `に対して`, `であれ`...).
  - Quét văn bản đề thi, xác định mẫu ngữ pháp, đếm tần suất và trả về danh sách các đề từng kiểm tra mẫu đó (`getExamsForPattern`).
- `KanjiAnalyzer` (`kanji-dict.ts` & `kanji-analyzer.ts`):
  - Phân tích từng chữ Hán theo cấp độ JLPT, số nét, âm On, âm Kun.
  - Phân loại nhóm kiến thức (Knowledge Group): con người (`human`), tự nhiên (`nature`), thời gian (`time`), hành động (`action`), giao tiếp (`communication`), giáo dục (`education`), xã hội (`society`), tâm lý (`mind`).

### 2.5. Gắn nhãn tự động cho câu hỏi ngân hàng đề (QB-09)

- `tagQuestion` trích xuất và tạo nhãn chuẩn hóa:
  - Nhãn từ vựng thông thường: `vocab:<baseForm>` (category: `vocab`).
  - Nhãn từ vựng được hỏi trực tiếp: `target_vocab:<baseForm>` (category: `target_vocab`).
  - Nhãn chữ Hán: `kanji:<char>` (category: `kanji`).
  - Nhãn mẫu ngữ pháp: `grammar:<patternId>` (category: `grammar`).
  - Nhãn cấp độ và kỹ năng: `level:<N1..N5>`, `skill:<skill>`, `mondai:<number>`.
- `VocabService.tagQuestion`: Tự động lưu trữ các nhãn trên vào bảng `question_tags` trong cơ sở dữ liệu.

### 2.6. Quản lý tập ngữ liệu và từ điển có bản quyền (Acceptance 3 & 4)

- `CorpusService` (`apps/api/src/modules/vocab/`):
  - Quản lý các tập ngữ liệu trong bảng `datasets`, `dataset_documents`, `corpus_aggregates`.
  - Đảm bảo mỗi dataset có đầy đủ metadata: `version`, `documentCount`, `totalTokens`, `uniqueVocabCount`, `source`, `date`, `license`.
  - Cung cấp các endpoint theo hợp đồng OpenAPI:
    - `GET /api/v1/datasets`: Danh sách tập ngữ liệu công khai.
    - `GET /api/v1/datasets/:id`: Chi tiết tập ngữ liệu.
    - `GET /api/v1/datasets/:id/vocabulary`: Thống kê từ vựng kèm lọc và phân trang.
    - `GET /api/v1/datasets/:id/grammar`: Thống kê ngữ pháp và các đề kiểm tra.
    - `GET /api/v1/datasets/:id/kanji`: Thống kê Hán tự theo cấp độ và nhóm kiến thức.
    - `GET /api/v1/dictionary/lookup`: Tra cứu từ điển có bản quyền.
    - `POST /api/v1/vocab/tag-question`: Gắn nhãn tự động cho câu hỏi.
- `DictionaryAdapter`:
  - Trả về đầy đủ trường `license: 'CC-BY-SA-4.0'` và `attribution: 'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0'`.
  - Xử lý trạng thái dịch vụ ngoài: `SANDBOX` khi dùng dữ liệu mẫu nội bộ, sẵn sàng chuyển `READY` khi nhà cung cấp live được tích hợp.

### 2.7. Độc lập hoá module và tương thích Typecheck sạch (`apps/api/src/modules/vocab/nlp/`)

- **Vấn đề:** Trong monorepo, `apps/api/tsconfig.json` định nghĩa `"rootDir": "."`, ngăn cản việc import TypeScript source trực tiếp từ ngoài thư mục `apps/api`. Đồng thời, việc import từ `packages/content-tools/dist/` gặp lỗi khi chạy `pnpm typecheck` trên một checkout sạch do Turbo chưa build `packages/content-tools` trước đó (và `apps/api/package.json` không nằm trong `allowedPaths` của W5 để thêm dependency).
- **Giải pháp:** Cung cấp submodule NLP tự thân nội bộ tại `apps/api/src/modules/vocab/nlp/` bên cạnh bàn giao độc lập tại `packages/content-tools/nlp/`. Cả hai đều nằm 100% trong `allowedPaths`, giúp `apps/api:typecheck` và `content-tools:typecheck` độc lập hoàn toàn, pass 100% không phụ thuộc thứ tự build artifacts, không vi phạm khóa dependency hay sửa ngoài allowedPaths.

---

## 3. Bằng chứng kiểm thử và nghiệm thu

1. `pnpm test:nlp`: Chạy 19 bài kiểm thử đơn vị và tích hợp trong `packages/content-tools/tests/nlp.test.ts` (100% đạt, exit code 0).
2. `pnpm test:vocab-data`: Chạy 9 bài kiểm thử dịch vụ cơ sở dữ liệu thực trên PGlite PostgreSQL 16 trong `apps/api/src/modules/vocab/vocab.test.ts` (100% đạt, exit code 0).
3. Đảm bảo toàn bộ 4 tiêu chí nghiệm thu của task N05 và 16 mã tính năng được chứng minh bằng test tự động.
