# H01: âm Hán Việt theo từng từ vựng

## Vấn đề

Trước đây `hanviet-data.json` chỉ lưu một âm cho mỗi chữ, lấy từ trường kVietnamese của Unihan. Trường này lẫn âm Nôm, ví dụ 予 = "nhừ". Âm của từ được ghép từ âm từng chữ, nên khoảng 15% từ JLPT bị sai:

| Từ | Ra | Đúng |
|---|---|---|
| 予約 | DƯ YÊU | DỰ ƯỚC |
| 音楽 | ÂM LẠC | ÂM NHẠC |
| 社長 | XÃ TRƯỜNG | XÃ TRƯỞNG |

## Cách làm: bốn lớp

### 1. Bảng chữ và âm On

File `tools/import-data/data/hanviet-onyomi.tsv` có 2.860 dòng, định dạng `kanji<TAB>âm On<TAB>Hán Việt<TAB>ghi chú`.

- Phủ mọi âm On (KANJIDIC2) của toàn bộ 2.136 chữ Jōyō.
- Kiểm tra bằng `node tools/import-data/bin/check-hanviet-onyomi.mjs`: báo 0 chữ thiếu, 0 âm thiếu.
- Một chữ có thể có nhiều âm Hán Việt tùy âm On: 楽 ガク NHẠC / ラク LẠC; 易 エキ DỊCH / イ DỊ; 悪 アク ÁC / オ Ố.

File `hanviet-primary.tsv` có 19.405 dòng, mỗi chữ một âm chính. Âm chính chỉ dùng khi từ đọc âm Kun hoặc chữ không có trong bảng âm On.

### 2. Ngoại lệ theo nghĩa

File `hanviet-word-overrides.tsv` có 414 từ. Đây là những từ cùng âm On nhưng tiếng Việt đọc khác tùy nghĩa:

| Chữ | Ví dụ |
|---|---|
| 長 チョウ | 社長 XÃ TRƯỞNG / 長期 TRƯỜNG KỲ |
| 行 コウ | 銀行 NGÂN HÀNG / 旅行 LỮ HÀNH |
| 重 チョウ | 重複 TRÙNG PHỨC / 貴重 QUÝ TRỌNG |

**Danh sách chữ đổi âm theo nghĩa** (`MEANING_DEPENDENT_KANJI`): 長, 行, 重, 分, 降, 処, 著, 卒, 質, 創, 丁, 否, 正, 伝, 便, 復, 説.

- Từ có một trong các chữ này mà không nằm trong file ngoại lệ thì gắn `review` để người duyệt xem.
- Những chữ mà âm On đã đủ phân biệt (楽, 易, 悪, 画, 読) không có trong danh sách. Đó là lý do bản nháp của worker có mà bản này bỏ.

### 3. Thuật toán và độ tin cậy

Hàm `computeHanViet(term, reading)` nằm trong `packages/content-tools/src/nlp/hanviet.ts`. Nó trả về `{ hanViet, perKanji, confidence, source }` theo thứ tự sau:

1. **Có trong ngoại lệ:** dùng giá trị ngoại lệ; `high`, nguồn `override`.
2. **Tách được bằng âm On:** đổi cách đọc sang katakana rồi tách theo từng chữ.
   - Chấp nhận biến âm: đục hóa, bán đục hóa, âm ngắt ッ. Okurigana đi qua nguyên.
   - Kết quả `high`, hoặc `review` nếu có chữ đổi âm theo nghĩa. Nguồn `rule`.
3. **Không tách được (đọc âm Kun):** ghép âm chính của từng chữ; `kun`. Giao diện hiện là "âm của chữ", không phải từ Hán Việt.
4. **Có chữ không có dữ liệu:** để trống, `review`. Không đoán.

### 4. Lưu cho mọi mục từ điển

**Migration `0007_lexicon_hanviet`:**
- Thêm vào `lexical_entries` các cột `han_viet`, `han_viet_confidence`, `han_viet_source` (`rule`, `override`, `manual`) và `han_viet_updated_at`.
- Tạo bảng `lexicon_hanviet_reports` lưu báo sai của học viên.

**Script `apps/api/scripts/lexicon/backfill-hanviet.mjs`** (cần `pnpm --filter @jlpt/api build` trước):
- Tính cho mọi mục, dùng cách đọc chính.
- Không ghi đè dòng `manual`.
- Mục đang có báo sai chưa xử lý thì giữ `review`.
- Chạy lại cho kết quả như cũ.

**Script `import-lexicon.mjs`:**
- Tính Hán Việt cho mục mới.
- Với `--replace`, giữ lại giá trị sửa tay cho mục có cùng mặt chữ và cách đọc.

## Thống kê trên từ điển preview

Từ điển preview có 22.647 mục JMdict common. Kết quả tính bằng `computeHanViet` trên cách đọc chính:

| Nhóm | Số mục |
|---|---|
| Không có chữ Hán (chỉ kana hoặc katakana, không có Hán Việt) | 4.524 |
| `high` (âm Hán Việt của từ) | 11.156 (trong đó 359 từ lấy từ ngoại lệ) |
| `kun` (đọc âm Kun, hiện âm từng chữ) | 6.510 |
| `review` (chờ duyệt ở H03) | 457 |

Nhóm `review` gồm:
- 341 mục có chữ đổi âm theo nghĩa, ví dụ 室長 THẤT TRƯỜNG (đúng là TRƯỞNG), 孝行 HIẾU HÀNH (đúng là HẠNH), 国務長官.
- 116 mục có chữ không có âm Hán Việt, ví dụ kokuji 込, 峠.

## API

| Route | Quyền | Thay đổi |
|---|---|---|
| `GET /dictionary/lookup` | công khai | Trả thêm `hanVietConfidence`, `hanVietSource`, `hanVietPerKanji`; vẫn giữ `hanViet` |
| `GET /dictionary/hanviet?text=&reading=` | công khai | Thêm tham số `reading` tùy chọn; trả thêm `confidence`, `perKanji` |
| `GET /admin/lexicon/hanviet?confidence=&q=&page=&pageSize=` | editor, reviewer, admin | Danh sách duyệt. Mục có báo sai lên đầu. Có cách đọc, nghĩa đầu, âm theo từng chữ, số báo sai |
| `PATCH /admin/lexicon/:id/hanviet { hanViet }` | editor, reviewer, admin | Đặt `manual`, `high`; đóng các báo sai đang mở; ghi audit log `lexicon.hanviet.update` |
| `POST /dictionary/hanviet-reports { entry, reading?, suggestion?, note? }` | học viên đã đăng nhập; 10 lần mỗi giờ | Lưu báo cáo, chuyển mục sang `review` |

`getHanVietForWord(term)` ở API (sổ tay, flashcard, quiz, danh sách ôn tập) dùng giá trị đã lưu của mục từ điển khớp từ. Giá trị này được nạp vào bộ nhớ khi API khởi động và cập nhật khi biên tập viên sửa. Không có mục khớp thì tính theo lớp 1–3.

Bộ nhớ đệm là bộ nhớ trong của từng tiến trình. Khi chạy nhiều bản API, bản khác sẽ thấy giá trị sửa tay sau lần khởi động kế tiếp. Riêng `lookup` luôn đọc thẳng từ database.

## Quy ước chữ viết

- Hán Việt viết HOA, chuẩn NFC.
- Dấu đặt theo kiểu đang dùng trong từ điển cho người học: HÒA, HÓA, HỌA, THỦY, TÙY (QUÝ giữ nguyên).
- Bản nháp lấy từ Unihan dùng lẫn kiểu HOÀ/THUỶ; đã thống nhất lại 276 dòng.
- Kokuji (込, 峠, 枠, 畑, 匂, 栃) không có âm Hán Việt nên để trống. Trước đây các chữ này mang nghĩa tiếng Việt như ĐÈO, KHUNG, đó là đoán.
- Đã sửa âm 降 コウ thành GIÁNG (HÀNG chỉ có qua ngoại lệ như 降伏, 投降) và 率 thành SUẤT (確率 XÁC SUẤT).

## Kiểm tra

| Lệnh | Nội dung |
|---|---|
| `pnpm --filter @jlpt/content-tools test` | Golden 417 từ N5–N1 đạt 100%; test thuật toán: kun, review, biến âm 学校 がっこう, 一本 いっぽん |
| `pnpm test:vocab-data` | lookup 要約; backfill (thống kê, giữ manual, chạy lại không đổi); PATCH và audit; báo sai, review và giới hạn tần suất |
