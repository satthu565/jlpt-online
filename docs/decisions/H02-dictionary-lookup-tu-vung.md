# H02: Trang /tu-vung tra từ trong từ điển JMdict, hiện cách đọc, nghĩa và âm Hán Việt

## Bối cảnh và hiện trạng

Trước H02, trang `/tu-vung` (`apps/web/features/corpus/components/vocab-explorer.tsx`) chỉ lọc dữ liệu cục bộ từ tập ngữ liệu `jlpt-official`. Do tập ngữ liệu này chưa có từ vựng nào (0 từ), trang hiển thị hộp thông báo trống "Không tìm thấy từ vựng nào phù hợp", chiếm toàn bộ màn hình khiến trang như bị hỏng/trống.
Trong khi đó, cơ sở dữ liệu và sandbox API đã có sẵn từ điển JMdict + KANJIDIC2 (hơn 22.000 mục thông dụng) cùng bảng âm Hán Việt hoàn thiện từ H01. API `GET /api/v1/dictionary/lookup?text=<từ>` đã hỗ trợ tra cứu theo mặt chữ hoặc cách đọc kana, trả về thông tin chi tiết kèm độ tin cậy Hán Việt (`high`, `review`, `kun`) và phân tách theo chữ `hanVietPerKanji`.

## Quyết định kỹ thuật

### 1. Khu tra từ điển ở đầu trang `/tu-vung`

- Đặt khu vực "Tra từ điển" ở đầu trang `/tu-vung` trước danh sách ngữ liệu.
- Sử dụng `Input` và `Button` của `@jlpt/ui`.
- Chỉ kích hoạt tìm kiếm khi người dùng nhấn Enter hoặc bấm nút "Tra từ", không tìm kiếm theo từng ký tự gõ (`onChange`) nhằm tối ưu hiệu năng và tránh spam API.
- Ở trạng thái chưa tra (`idle`), cung cấp các chip ví dụ phổ biến bấm được: `学生`, `勉強`, `よやく`. Khi bấm vào từ ví dụ, hệ thống điền vào ô và tự động tra cứu.
- Trạng thái đang tra sử dụng `Skeleton` từ `@jlpt/ui`.
- Trạng thái 404 hiển thị thông điệp "Không tìm thấy từ ... trong từ điển" rõ ràng, không sinh lỗi 500.
- Trạng thái lỗi mạng/5xx hiển thị `Alert variant="error"` kèm nút "Thử lại".

### 2. Thẻ kết quả và hiển thị âm Hán Việt

- Thẻ kết quả sử dụng `Card` của `@jlpt/ui` (`data-testid="dict-result-card"`).
- Từ vựng cỡ lớn `text-3xl font-extrabold font-japanese` (`data-testid="dictionary-entry"`).
- Các cách đọc hiển thị font Nhật (`data-testid="dictionary-readings"`).
- Nhãn âm Hán Việt (`data-testid="dictionary-hanviet"`):
  - `confidence === 'high'`: hiển thị âm Hán Việt viết hoa thông thường (ví dụ: `HỌC SINH`).
  - `confidence === 'review'`: hiển thị kèm Badge "Đang chờ xác nhận" (`data-testid="hanviet-review-badge"`).
  - `confidence === 'kun'`: hiển thị tiền tố "Âm của chữ: " (do từ đọc âm thuần Nhật Kun'yomi, không phải từ ghép Hán Việt).
- Phân tách theo chữ Hán:
  - Khi có dữ liệu `hanVietPerKanji`, nút "Xem phân tách theo chữ" cho phép mở rộng xem chi tiết từng chữ: mặt chữ Kanji - âm On (nếu có) - âm Hán Việt tương ứng.
- Danh sách nghĩa tiếng Anh (JMdict) có tiêu đề rõ ràng và số thứ tự (`data-testid="dictionary-meanings"`).
- Dòng ghi nguồn dữ liệu rõ ràng: "Từ điển JMdict/KANJIDIC2 – EDRDG, CC BY-SA 4.0" kèm link tới `/gioi-thieu#nguon-du-lieu` (`data-testid="dictionary-attribution"`).

### 3. Lưu vào sổ tay và Báo sai âm Hán Việt

- **Lưu vào sổ tay** (`data-testid="save-to-notebook-btn"`):
  - Khách chưa đăng nhập: nút dẫn trực tiếp tới `/dang-nhap`.
  - Học viên đã đăng nhập: gọi `POST /api/v1/me/notebook-items` (`defaultLearningClient.createNotebookItem`) với `{ kind: 'vocab', term, reading, meaning, hanViet, partOfSpeech }`. Khi lưu thành công, từ xuất hiện trên `/so-tay`.
- **Báo sai âm Hán Việt** (`data-testid="report-hanviet-btn"`):
  - Khách chưa đăng nhập: nút dẫn trực tiếp tới `/dang-nhap`.
  - Học viên đã đăng nhập: mở `Modal` nhập âm đề xuất (`hanviet-suggestion-input`) và ghi chú (`hanviet-note-input`), gọi `POST /api/v1/dictionary/hanviet-reports` (`client.reportHanViet`), thông báo gửi thành công.

### 4. Xử lý tập ngữ liệu trống

- Khi tập ngữ liệu có 0 từ (`items.length === 0`), không hiển thị hộp thông báo trống chiếm chỗ ("Không tìm thấy từ vựng nào phù hợp.").
- Chỉ hiển thị thông báo trống khi tập ngữ liệu có từ nhưng bộ lọc/tìm kiếm của người dùng không khớp kết quả nào (`items.length > 0 && filteredItems.length === 0`).
- Nhờ vậy, khi tập ngữ liệu trống, trang `/tu-vung` vẫn đầy đủ công năng với khu tra từ điển hiện diện nổi bật ở đầu trang.

### 5. Tiêu chuẩn giao diện và i18n

- Tuân thủ 100% UI primitives của `@jlpt/ui`: không sử dụng thẻ HTML thô `<input>`, `<button>`, `<select>`, `<textarea>` hay inline styles `style={{}}`.
- Toàn bộ chuỗi giao diện được đưa vào `apps/web/messages/` cho cả ba locale `vi.json`, `ja.json`, `en.json`, đảm bảo chuẩn Unicode NFC và không để lộ key dịch thô.
- Thiết kế responsive không cuộn ngang ở cả 390px và 1366px viewports.
