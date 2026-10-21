# H05: API từ điển cho tra nhanh khi bôi đen và trang chi tiết từ vựng

- **Mã task**: H05
- **Worker**: W5 (Chuẩn nhập liệu dữ liệu và học thông minh)
- **Nhánh**: `task/H05`
- **Hợp đồng**: API, DB
- **Phục vụ**: H06 (khung tra từ nổi Popover khi bôi đen chữ trong bài thi / luyện tập và trang chi tiết `/tu-vung/:term`)

---

## 1. Bối cảnh và Yêu cầu

Trong bài thi và luyện tập JLPT, học viên cần tra cứu nhanh từ vựng khi bôi đen đoạn văn bản hoặc câu hỏi (phục vụ H06). Việc tra cứu khi bôi đen thực tế gặp nhiều thách thức:
1. **Từ bị chia thì / thể**: `食べた` -> `食べる`, `高かった` -> `高い`, `勉強して` -> `勉強する` hoặc `勉強`.
2. **Bôi đen dư okurigana**: Người dùng chọn chuột/cảm ứng thường bị thừa ký tự kana ở cuối (ví dụ `予約す` thay vì `予約`). Cần tự động cắt bỏ dần các ký tự kana ở cuối để khớp từ vựng gốc và trả về `matchedText`.
3. **Từ loại dễ hiểu bằng tiếng Việt**: Các mã JMdict (như `n`, `v1`, `v5k`, `vs`, `adj-i`, `adj-na`...) cần được ánh xạ sang nhãn từ loại tiếng Việt chuẩn mực (`posLabels`), ví dụ: `Động từ`, `Tính từ đuôi い`, `Tính từ đuôi な`, `Danh từ`, `Danh động từ (đi với する)`...
4. **Trang chi tiết từ vựng (`GET /api/v1/dictionary/entries/:term`)**:
   - Trả đầy đủ mọi cách đọc (`readings`).
   - Mọi nghĩa theo từng sense kèm từ loại riêng của từng sense (`senses`).
   - `posLabels` tổng quát và theo từng sense.
   - Âm Hán Việt theo H01 (`hanViet`, `hanVietConfidence`, `hanVietPerKanji`).
   - Thông tin từng chữ Hán cấu thành từ KANJIDIC2 (âm On, âm Kun, số nét, nghĩa tiếng Anh, cấp JLPT cũ nếu có).
   - Số lần xuất hiện trong đề thi theo cấp (`corpusOccurrences` / `occurrences` - mảng rỗng nếu chưa có H04).
   - Bản quyền (`license`) và nguồn trích dẫn (`attribution`) EDRDG JMdict / KANJIDIC2.
   - Trả 404 nếu không tìm thấy từ.
5. **Bảo vệ và hiệu năng**:
   - Chuỗi dài hơn 20 ký tự hoặc không chứa chữ Nhật trả 400 (`BadRequestException`), tuyệt đối không bao giờ 500.
   - Cache trong bộ nhớ có giới hạn kích thước (LRU Map, tối đa 2000 mục, TTL 5 phút) để phục vụ tra cứu lặp lại liên tục khi học viên bôi đen.
   - Giới hạn tần suất hợp lý (`@RateLimit` 120 req/phút), công khai không cần đăng nhập (`@Public()`).

---

## 2. Thiết kế và Quyết định kỹ thuật

### 2.1. Cấu trúc cơ sở dữ liệu và Migration `0009_entry_meanings_senses`

Để lưu trữ nghĩa theo từng sense và từ loại của sense đó:
- Bảng `entry_meanings` được bổ sung hai cột:
  - `sense_index`: `integer DEFAULT 0 NOT NULL` (đánh số thứ tự nhóm nghĩa).
  - `pos`: `text` (mã từ loại JMdict riêng của sense đó nếu có).
- Migration ban đầu đánh số 0008, sau khi hợp nhất với nhánh main (đã có migration `0008_corpus_terms.sql` từ H04), đã được chuẩn hóa thành `apps/api/src/db/migrations/0009_entry_meanings_senses.sql` và cập nhật journal meta tương ứng.
- Cập nhật `import-lexicon.mjs` và bộ parser `parse.mjs` để khi import dữ liệu JMdict, các sense được lưu tương ứng vào `sense_index` và `pos`.
- Kết nối `corpusOccurrences` / `occurrences` với bảng `corpus_terms` của H04: tổng hợp số lần xuất hiện của từ theo cấp JLPT từ đề thi đã xuất bản, trả về danh sách thực tế hoặc mảng rỗng nếu chưa có đề thi.

### 2.2. Bảng ánh xạ mã từ loại JMdict (`pos-labels.ts`)

Tất cả logic chuyển đổi mã JMdict được đặt trong một module độc lập dùng chung: `apps/api/src/modules/vocab/pos-labels.ts`, đi kèm bộ kiểm thử bao phủ toàn bộ các mã: `apps/api/src/modules/vocab/pos-labels.test.ts`.

Quy tắc ánh xạ:
- `n` -> `Danh từ`
- `v1`, `v1-s`, `v5*` (tất cả các mã `v5k`, `v5s`, `v5r`, `v5g`, `v5b`, `v5m`, `v5n`, `v5t`, `v5u`...) -> `Động từ`
- `vs`, `vs-i`, `vs-s`, `vs-c` -> `Danh động từ (đi với する)`
- `vt` -> `Ngoại động từ`
- `vi` -> `Nội động từ`
- `adj-i` -> `Tính từ đuôi い`
- `adj-na` -> `Tính từ đuôi な`
- `adv`, `adv-to` -> `Phó từ`
- `prt` -> `Trợ từ`
- `conj` -> `Liên từ`
- `int` -> `Thán từ`
- `pn` -> `Đại từ`
- `ctr` -> `Trợ số từ`
- `exp` -> `Cụm từ`
- Mã khác: giữ nguyên trong ngoặc `(${code})`.

### 2.3. Thuật toán phân giải tra cứu từ vựng (`lookupDictionary`)

Khi nhận chuỗi đầu vào:
1. **Kiểm tra hợp lệ**: Nếu rỗng, dài hơn 20 ký tự hoặc không chứa chữ Nhật (`/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/`), ném ngay `BadRequestException` (HTTP 400).
2. **Kiểm tra cache**: Kiểm tra in-memory cache theo `${text}:${locale}`. Nếu còn hiệu lực, trả ngay kết quả.
3. **Khớp chính xác (Direct Match)**: Tra cứu trực tiếp trên `lexicalEntries.term` hoặc `entryReadings.reading` trong DB; nếu DB chưa nạp thì tra qua `dictionaryAdapter`. Nếu khớp -> `matchedText = trimmed`, `lemma = entry.term`.
4. **Khớp dạng từ điển qua Lemmatizer**:
   - Sử dụng `lemmatize(trimmed)` từ `@jlpt/content-tools`.
   - Nếu `baseForm` khác `trimmed`: tra cứu theo `baseForm`.
   - Đối với động từ nhóm する (ví dụ `勉強する`): nếu không thấy cả cụm thì tra tiếp phần gốc `stem` (`勉強`).
   - Nếu khớp -> `matchedText = trimmed`, `lemma = entry.term`.
5. **Cắt tỉa okurigana thừa khi bôi đen dư**:
   - Vòng lặp cắt dần từng ký tự kana ở cuối chuỗi (`candidate = candidate.slice(0, -1)`).
   - Ở mỗi bước: thử tra cứu trực tiếp `candidate` và thử lemmatize `candidate`.
   - Nếu khớp -> `matchedText = candidate`, `lemma = entry.term`.
6. Nếu tất cả đều không khớp -> ném `NotFoundException` (HTTP 404).

### 2.4. Dữ liệu chữ Hán KANJIDIC2 (`kanjidic-data.ts`)

Module `apps/api/src/modules/vocab/kanjidic-data.ts` cung cấp hàm `getKanjiDetailsForWord`:
- Truy vấn bảng `kanji_entries` trong DB cho các chữ Hán có trong từ.
- Cung cấp cơ chế fallback phong phú qua `KANJIDIC_FALLBACK_DATABASE` và `KANJI_DATABASE` cho môi trường sandbox/test, đảm bảo các chữ Hán như `要`, `約`, `静`, `高`, `食`... luôn có đầy đủ thông tin âm On, âm Kun, số nét, nghĩa tiếng Anh và cấp JLPT cũ.

### 2.5. Xử lý phản hồi lỗi tra cứu và tương thích UI web (`DictionaryLookupValidationFilter`)

Để đảm bảo vừa tuân thủ tiêu chí Acceptance 5 (trả mã HTTP 400 BadRequest khi chuỗi > 20 ký tự hoặc không có chữ Nhật, tuyệt đối không trả 500) vừa tương thích hoàn hảo với giao diện web `/tu-vung` (H02) và các bài kiểm thử E2E:
- Tạo bộ lọc ngoại lệ `DictionaryLookupValidationFilter` áp dụng trên endpoint `@Get('dictionary/lookup')`.
- Khi client truyền chuỗi không hợp lệ (> 20 ký tự hoặc không có chữ Nhật như `tuvungkhongtontaixyz999`), endpoint trả HTTP 400 và cấu trúc lỗi tuân thủ chuẩn `ApiErrorResponse` (`code: 'VALIDATION_ERROR'`), đồng thời bổ sung thông điệp `message: "No dictionary entry found: ..."` ở cấp cao nhất.
- Nhờ đó, client web (`corpus-client.ts` và `vocab-explorer.tsx`) nhận biết đây là trạng thái không tìm thấy mục từ và hiển thị đúng khối thông báo "Không tìm thấy" (`[data-testid="dict-not-found"]`), không gây hiểu lầm là lỗi hệ thống mạng (Alert đỏ), đáp ứng trọn vẹn cả H05 và E2E H02-AC2.

---

## 3. Nghiệm thu và Bằng chứng

Toàn bộ 6 tiêu chí nghiệm thu của task H05 được kiểm thử tự động trong `apps/api/src/modules/vocab/vocab.test.ts` và `apps/api/src/modules/vocab/pos-labels.test.ts`:
1. `lookup 食べた` trả `entry: 食べる`, `lemma: 食べる`, `matchedText: 食べた`, `posLabels` có `Động từ`.
2. `lookup 高かった` trả `高い`, `posLabels` có `Tính từ đuôi い`; `lookup 静か` trả `posLabels` có `Tính từ đuôi な`; `lookup 予約` trả `Danh từ` và `Danh động từ`.
3. Bôi đen dư okurigana (`予約す`) khớp `予約`, `matchedText: '予約'`.
4. `GET /api/v1/dictionary/entries/要約` trả các nghĩa theo sense, thông tin chữ `要` và `約` từ KANJIDIC2, Hán Việt H01; từ không có trả 404.
5. Chuỗi dài hơn 20 ký tự hoặc không có chữ Nhật trả 400 (`BadRequestException`), không bao giờ 500.
6. Test ánh xạ từ loại phủ mọi mã JMdict đã nêu.
