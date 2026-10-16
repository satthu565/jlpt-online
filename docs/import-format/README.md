# Chuẩn dữ liệu nhập đề thi JLPT phiên bản 2 (Import v2)

Tài liệu này quy định cấu trúc gói dữ liệu, định dạng JSON Schema, biểu diễn tiếng Nhật và quy trình chuẩn bị dữ liệu thủ công dành cho chủ dự án và đội ngũ nhập liệu.

---

## 1. Nguyên tắc cốt lõi

1. **Chuẩn bị dữ liệu hoàn toàn bên ngoài hệ thống (External Preparation):**
   - Chủ dự án tự chuẩn bị dữ liệu, chuẩn hóa nội dung, gán đáp án và đính kèm media thật trước khi tải lên trang quản trị.
   - Ứng dụng **không** tích hợp công cụ OCR, bộ đọc/phân tích cú pháp PDF, hay agent tự động trích xuất đề thi.
   - Các tính năng trích xuất PDF lịch sử (PDF-06 đến PDF-16, PDF-18) được xếp loại `EXTERNAL_PREPARATION` thuộc trách nhiệm của chủ dự án; hệ thống chỉ tiếp nhận gói dữ liệu đã chuẩn hóa theo chuẩn Import v2.
2. **Bất biến và minh bạch (Immutability & Auditability):**
   - Mỗi gói đề thi tương ứng một `packageId` (UUID) và `revision` (số nguyên tăng dần).
   - Mọi tệp ảnh/audio được đặt tên theo đúng mã băm SHA-256 (64 ký tự hex viết thường) của nội dung tệp.
3. **Không đoán đáp án (Strict Ground Truth):**
   - Nếu nguồn đề chưa có đáp án hoặc chưa xác định chắc chắn: đặt `correctOption: null` kèm một bản ghi `issue` có mức độ `blocking` trỏ đúng đường dẫn JSON Pointer của câu hỏi.
   - Tuyệt đối không tự suy diễn đáp án hoặc điền giá trị giả để vượt qua kiểm tra.
4. **Bảo mật đề thi:**
   - Gói Import v2 chứa đáp án và giải thích nguồn, chỉ dành cho nhân sự quản trị (staff/reviewer).
   - Snapshot phục vụ thí sinh thi trực tuyến bắt buộc phải lược bỏ hoàn toàn các trường đáp án.

---

## 2. Cấu trúc gói bàn giao (ZIP Package)

Mỗi đề thi được bàn giao dưới dạng một tệp nén ZIP độc lập, không bọc thêm thư mục cha ở ngoài:

```text
ten-de.zip
├── import.json                        (Bắt buộc: siêu dữ liệu, cấu trúc đề, câu hỏi, issues)
├── media/                             (Bắt buộc nếu đề có hình ảnh hoặc bài nghe)
│   ├── <sha256-cua-anh>.png
│   └── <sha256-cua-audio>.wav (hoặc .mp3, .m4a)
└── sources/                           (Tùy chọn: chỉ dùng để người duyệt đối chiếu)
    └── <sha256-cua-pdf>.pdf
```

- **`import.json`**: Mã hóa UTF-8, toàn bộ chuỗi tiếng Nhật chuẩn hóa Unicode NFC, không chứa comment, không bọc mã Markdown.
- **`media/`**: Chứa tệp nhị phân thật, đúng hash SHA-256. Không dùng liên kết mạng cá nhân hay dữ liệu base64.
- **`sources/`**: Tệp PDF nguồn dùng để đối chiếu khi review. Phần mềm không quét tự động tệp này.

---

## 3. Cấu trúc chi tiết của `import.json`

JSON Schema máy đọc được đặt tại [`import-v2.schema.json`](./import-v2.schema.json). Các trường cấp gốc bao gồm:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `formatVersion` | `2` (hằng số) | Phiên bản chuẩn dữ liệu. Bắt buộc bằng 2. |
| `packageId` | `string` (UUID v4) | Định danh định đề thi qua các lần sửa đổi. |
| `revision` | `integer` (>= 1) | Số thứ tự phiên bản sửa đổi (bắt đầu từ 1). |
| `source` | `object` | Thông tin nguồn, cấp độ, kỳ thi, bản quyền. |
| `sourceFiles` | `array` | Danh sách tệp PDF đối chiếu nguồn (tùy chọn). |
| `exam` | `object` | Cấu trúc đề thi, slug, các phần thi và thời lượng. |
| `groups` | `array` | Danh sách nhóm câu hỏi (giữ nguyên bài đọc/đoạn nghe chung). |
| `media` | `array` | Manifest khai báo toàn bộ tệp media trong gói. |
| `issues` | `array` | Danh sách điểm chưa rõ hoặc vấn đề cần xử lý. |

### 3.1. Đối tượng `source`
```json
{
  "name": "Đề thi N5 tháng 12 năm 2021",
  "level": "N5",
  "year": 2021,
  "session": 12,
  "provenance": "official_past_exam",
  "licenseRef": "license-official-2021",
  "rightsStatus": "owner_confirmed"
}
```
- `level`: `N1`, `N2`, `N3`, `N4`, hoặc `N5`.
- `year`: Số nguyên từ 1984 đến 2200, hoặc `null` nếu không xác định.
- `session`: `7` (tháng 7), `12` (tháng 12), hoặc `null`.
- `provenance`: `official_past_exam` (đề thi chính thức), `self_authored` (tự biên soạn), hoặc `third_party` (bên thứ ba/sách tham khảo).
- `rightsStatus`: `unverified` hoặc `owner_confirmed`. Khi chưa xác minh bản quyền, hệ thống chỉ lưu nháp và chặn xuất bản.

### 3.2. Cấu trúc đề thi (`exam`) và các phần thi (`sections`)
- `exam.kind`: `original` (đề thi chuẩn) hoặc `practice` (đề luyện tập).
- Với đề `original`:
  - Cấp độ N1, N2 gồm 2 phần theo thứ tự: `language_reading`, `listening`.
  - Cấp độ N3, N4, N5 gồm 3 phần theo thứ tự: `language_vocab`, `language_grammar_reading`, `listening`.
- `durationSec`: Thời lượng tính bằng giây. Nếu chưa rõ mốc thời lượng, đặt `null` kèm issue blocking.
- `totalQuestions`: Tổng số câu hỏi trong toàn bộ đề (phải khớp chính xác số câu trong `groups`).
- `groupIds`: Danh sách ID nhóm câu thuộc phần thi, sắp xếp theo thứ tự `orderInSection` liên tục từ 1.

---

## 4. Biểu diễn nội dung tiếng Nhật (RichText & RichBlock)

Để bảo tồn đầy đủ định dạng văn bản tiếng Nhật mà không phụ thuộc vào HTML hay Markdown không chuẩn, hệ thống sử dụng cấu trúc AST mảng các đoạn:

### 4.1. Đoạn nội dòng (`RichText`)
Một mảng gồm các đối tượng `segment`:
- **Chữ thông thường:** `{"t": "text", "text": "がっこう"}` (nghiêm cấm chứa ký tự xuống dòng `\r`, `\n`).
- **Furigana (Ruby):** `{"t": "ruby", "text": "学校", "rt": "がっこう"}`
- **Gạch chân:** `{"t": "underline", "children": [...]}`
- **Nhấn mạnh:** `{"t": "emphasis", "children": [...]}`
- **Xuống dòng:** `{"t": "br"}`
- **Ô trống:** `{"t": "blank", "label": "1"}` (label là tùy chọn)
- **Ký hiệu ngôi sao (câu sắp xếp từ):** `{"t": "star"}`
- **Ảnh trong dòng:** `{"t": "image", "mediaKey": "media/<hash>.png", "alt": "...", "width": 100, "height": 50}`

> **Quy tắc quan trọng:**
> - Tuyệt đối không lồng `underline` bên trong `underline` hoặc `emphasis` bên trong `emphasis`.
> - Không dùng ký tự `\n` trong đoạn `text`. Muốn xuống dòng, dùng segment `{"t": "br"}`.
> - Toàn bộ chuỗi phải ở dạng chuẩn hóa **Unicode NFC**.

### 4.2. Khối nội dung (`RichBlock`) dùng cho đoạn văn (`passage`)
- **Đoạn văn:** `{"type": "paragraph", "content": RichText}`
- **Hình ảnh:** `{"type": "image", "mediaKey": "media/<hash>.png", "alt": "...", "width": 400, "height": 300}`
- **Bảng biểu:** `{"type": "table", "rows": [[RichText, RichText], [RichText, RichText]]}`

### 4.3. Câu hỏi sắp xếp từ có dấu ★ (`sentence_composition`)
Câu hỏi thuộc dạng `sentence_composition` bắt buộc phần `stem` phải chứa chính xác:
- **3 ô trống:** `{"t": "blank"}`
- **1 dấu sao:** `{"t": "star"}`

Ví dụ:
```json
[
  {"t": "text", "text": "わたしは "},
  {"t": "blank"},
  {"t": "blank"},
  {"t": "star"},
  {"t": "blank"},
  {"t": "text", "text": "。"}
]
```

---

## 5. Câu hỏi, lựa chọn và mốc timeline nghe

### 5.1. Câu hỏi (`question`)
- `options`: Mảng từ 3 đến 4 lựa chọn. Nhãn `label` bắt buộc phải là chuỗi tuần tự `"1"`, `"2"`, `"3"` (và `"4"`).
- `correctOption`: Số nguyên từ 1 đến số lượng lựa chọn (đánh số 1-based). Nếu chưa có đáp án, bắt buộc đặt `null` kèm issue blocking.
- `mondaiType`: 21 dạng 問題 chuẩn JLPT (ví dụ: `kanji_reading`, `sentence_composition`, `comprehension_short`, `quick_response`, v.v.).

### 5.2. Mốc dòng thời gian nghe (`listeningTimeline`)
Trong phần thi `listening`, mỗi đoạn nghe cần có cấu hình timeline liên tục:
```json
{
  "groupId": "g-listening-01",
  "mediaKey": "media/00d0ad3e26f73d387098dddab2d5f79b9f270d9a7be23a5ef15dec78ef9395f1.wav",
  "startMs": 0,
  "endMs": 2000,
  "audioStartMs": 0,
  "audioEndMs": 2000,
  "gapAfterMs": 28000
}
```
- Các mốc tính theo mili giây.
- `endMs - startMs` phải bằng `audioEndMs - audioStartMs`.
- Mốc bắt đầu của đoạn tiếp theo phải khớp chính xác với `endMs + gapAfterMs` của đoạn trước.
- Mọi nhóm câu hỏi trong phần nghe đều phải được gán ít nhất một đoạn audio hợp lệ.

---

## 6. Xử lý điểm chưa rõ và chế độ nháp (Draft vs Ready)

Khi dữ liệu chưa đầy đủ hoặc cần xác minh:
1. Ghi nhận vào mảng `issues`:
```json
{
  "id": "missing-answer-q1",
  "severity": "blocking",
  "path": "/groups/0/questions/0/correctOption",
  "reason": "Chưa có đáp án chính thức từ nguồn; cần chủ dự án xác minh.",
  "sourcePages": []
}
```
- `path`: Đường dẫn JSON Pointer trỏ chính xác đến trường dữ liệu.
- `severity`:
  - `blocking`: Dành cho các lỗi nghiêm trọng (thiếu đáp án, thiếu audio, chữ không đọc rõ `[KHONG_DOC_RO]`, thiếu blueprint).
  - `warning`: Ghi chú lưu ý, không chặn chuyển trạng thái review.

2. Trạng thái kiểm tra:
- **`READY_FOR_REVIEW`**: Không còn bất kỳ issue blocking nào, toàn bộ file media khớp hash và cấu trúc đạt chuẩn.
- **`DRAFT_ONLY`**: Có issue blocking được khai báo hợp lệ cho mọi trường chưa hoàn thiện. Cho phép lưu nháp trên hệ thống nhưng bị chặn xuất bản.
- **`INVALID`**: Sai schema, tệp media thiếu/sai hash, hoặc có trường thiếu dữ liệu nhưng không khai báo issue blocking tương ứng.

---

## 7. Công cụ kiểm tra (CLI Tools)

Có thể kiểm tra trực tiếp trên máy trước khi tải gói lên:

```bash
# Kiểm tra gói ở chế độ ready (mặc định)
pnpm import:validate -- fixtures/imports/ready

# Kiểm tra gói ở chế độ nháp
node tools/import-data/bin/validate.js fixtures/imports/draft --mode draft

# Chạy bộ test hợp đồng dữ liệu nhập
pnpm test:import-contracts
```
