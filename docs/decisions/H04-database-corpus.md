# H04: Bộ ngữ liệu đề thi lưu vào database, tự tách từ khi xuất bản đề

## Vấn đề

Trước đây, `CorpusService` (`apps/api/src/modules/vocab/corpus.service.ts`) lưu trữ toàn bộ dữ liệu ngữ liệu của tập đề thi "Tập ngữ liệu đề thi JLPT N1–N5" (slug `jlpt-official`) trong bộ nhớ RAM qua `Map<string, CorpusAggregator>`.

Thiết kế này dẫn đến các nhược điểm nghiêm trọng:
1. **Mất sạch dữ liệu khi restart API:** Dữ liệu chỉ tồn tại khi có request nạp thủ công, mất toàn bộ ngay khi service khởi động lại.
2. **Không tự động cập nhật:** Khi biên tập viên duyệt và xuất bản đề thi thật (N1–N5), đề thi không tự động đi vào bộ ngữ liệu.
3. **Trang người dùng bị trống:** `GET /api/v1/datasets/jlpt-official/vocabulary` trả `{"total": 0, "items": []}`, làm cho các trang `/tu-vung`, `/thong-ke-tu-vung`, và trang quản trị Từ vựng & Ngữ pháp đều không có dữ liệu thực tế.

## Kiến trúc và Giải pháp

### 1. Bảng cơ sở dữ liệu `corpus_terms` (Migration `0008_corpus_terms`)

Tạo bảng `corpus_terms` để lưu trữ các từ vựng xuất hiện trong từng đề thi và câu hỏi:
- `id`: UUIDv7 khóa chính.
- `dataset_id`: Khóa ngoại tham chiếu `datasets.id` (mặc định là UUID cố định của `jlpt-official`).
- `term`: Dạng từ điển chuẩn (base form / lemma, ví dụ: 食べる).
- `reading`: Cách đọc kana (furigana/hiragana).
- `level`: Cấp độ JLPT (N1..N5) theo đề thi.
- `exam_id`: Khóa ngoại tham chiếu `exams.id`.
- `question_id`: Khóa ngoại tham chiếu `questions.id` (có thể NULL cho bài đọc hiểu hoặc transcript chung của nhóm).
- `section`: Phần thi (ví dụ: `language_knowledge`, `reading`, `listening`).
- `skill`: Kỹ năng câu hỏi (`vocabulary`, `kanji`, `grammar`, `reading`, `listening`).
- `count`: Số lần xuất hiện của từ trong phạm vi câu hỏi/ngữ cảnh đó.
- `created_at`: Thời điểm trích xuất (UTC).

**Ràng buộc duy nhất chống trùng lặp:**
```sql
CREATE UNIQUE INDEX "corpus_terms_dataset_term_exam_question_uidx"
ON "corpus_terms" ("dataset_id", "term", "exam_id", "question_id") NULLS NOT DISTINCT;
```
Chỉ số `NULLS NOT DISTINCT` đảm bảo ngay cả khi `question_id IS NULL`, việc chạy lại vẫn phát hiện xung đột và chạy `ON CONFLICT DO UPDATE` (tăng hoặc giữ nguyên số đếm) mà không bị nhân bản dòng.

Các chỉ số hỗ trợ truy vấn:
- `corpus_terms_dataset_term_idx` trên `(dataset_id, term)`
- `corpus_terms_dataset_level_idx` trên `(dataset_id, level)`
- `corpus_terms_exam_id_idx` trên `(exam_id)`

### 2. Tách từ và chuẩn hóa từ vựng (`corpus-indexer.ts`)

Module `apps/api/src/modules/vocab/corpus-indexer.ts` chịu trách nhiệm phân tích văn bản tiếng Nhật và lọc từ:
- **Lemmatization:** Sử dụng tokenizer sẵn có (`tokenizeJapaneseText`, `tokenizeRichBlocks`, `tokenizeRichText`) gom toàn bộ dạng chia (ví dụ: 食べた, 飲んだ, 行かない) về dạng từ điển chuẩn (`食べる`, `飲む`, `行く`).
- **Bộ lọc từ vựng hợp lệ (`shouldIncludeCorpusTerm`):**
  - Loại bỏ trợ từ (particles: は, が, を, に, で, と, も, から, まで, へ, v.v.).
  - Loại bỏ dấu câu và ký hiệu đặc biệt (、, 。, 「」, !?, …).
  - Loại bỏ kana đơn lẻ (các ký tự đơn như ぁ, あ, ぃ, v.v. không mang nghĩa độc lập).
  - Loại bỏ chuỗi thuần chữ số hoặc ký tự ASCII.
- **Nguồn văn bản trích xuất:**
  - Thân câu hỏi (stem).
  - Tất cả các phương án trả lời (options).
  - Đoạn văn đọc hiểu của nhóm câu hỏi (group passage).
  - Hướng dẫn phần nghe và transcript (nếu có).
- **Nguyên tắc Zero Answer Leak (Không lộ đáp án):**
  - Không truy vấn bảng `correct_answers` hoặc `exam_answer_keys`.
  - Không lưu thông tin đáp án đúng vào `corpus_terms`.
  - Mọi phương án trả lời đều được xem như ngữ cảnh xuất hiện từ vựng tương đương nhau.

### 3. Tự động đồng bộ theo vòng đời đề thi (`exam.service.ts`)

Tích hợp trực tiếp vào quy trình xuất bản đề thi trong `ExamService`:
- Khi xuất bản (`publishExam` / `approveAndPublishExam`):
  - Chạy hàm `indexExamForCorpus(this.dbClient, exam.id, tx)` bên trong transaction xuất bản.
  - Tự động trích xuất và chèn toàn bộ từ vựng vào `corpus_terms`.
- Khi gỡ xuất bản (`unpublishExam`):
  - Chạy hàm `removeExamFromCorpus(this.dbClient, exam.id, tx)` bên trong transaction gỡ xuất bản.
  - Xóa sạch các dòng `corpus_terms` liên quan đến `exam_id` đó.

### 4. Script Backfill (`apps/api/scripts/lexicon/backfill-corpus.mjs`)

Script dòng lệnh cho phép bù dữ liệu cho mọi đề thi đã xuất bản:
- Truy vấn tất cả đề thi có `publishedVersion IS NOT NULL` và `deletedAt IS NULL`.
- Lần lượt gọi `indexExamForCorpus` cho từng đề.
- Tính toán idempotent: chạy bao nhiêu lần cũng không sinh ra dòng trùng lặp hay thay đổi số lượng từ vựng.

### 5. Kết hợp từ điển JMdict và Hán-Việt H01

Trong `CorpusService.getVocabularyFromDb`:
- Nhóm và phân trang các từ vựng theo tần suất xuất hiện và cấp độ.
- Truy vấn batch vào `lexical_entries`, `entry_readings` (primary), và `entry_meanings` (`locale = 'en'`).
- Bổ sung các thông tin:
  - `reading`: Cách đọc furigana chuẩn từ JMdict hoặc từ tokenizer.
  - `meaning`: Nghĩa tiếng Anh đầu tiên từ JMdict.
  - `partOfSpeech`: Từ loại (danh từ, động từ, tính từ...).
  - `hanViet` và `hanVietConfidence`: Âm Hán-Việt chuẩn và độ tin cậy được kế thừa từ tính năng H01 (`computeHanViet` / `getHanVietForWord`).

### 6. Tương thích ngược API

Các endpoint giữ nguyên cấu trúc dữ liệu trả về:
- `GET /api/v1/datasets`
- `GET /api/v1/datasets/:id/vocabulary?level=&q=&page=&limit=`
- `GET /api/v1/datasets/:id/trends`
- `GET /api/v1/datasets/:id/compare/levels`
- `POST /api/v1/datasets/:id/study-lists`
- `GET /api/v1/datasets/:id/words/:word/questions`
- `GET /api/v1/datasets/:id/words/:word/stats`

Khi cơ sở dữ liệu `corpus_terms` có dữ liệu của dataset, hệ thống ưu tiên tính toán trực tiếp từ cơ sở dữ liệu; nếu trống (như trong các unit test cũ nạp package tạm thời vào bộ nhớ), hệ thống tự động fallback về aggregator in-memory để đảm bảo toàn bộ test case kế thừa đều tiếp tục pass.
