# Chuẩn dữ liệu bạn cần chuẩn bị để nhập đề

## Luồng làm việc

**Bạn tự chuẩn bị dữ liệu → tải gói ZIP lên admin → hệ thống kiểm tra → editor đối chiếu → reviewer duyệt → xuất bản.** Website không gọi agent, không điều khiển công cụ đọc PDF, không có dịch vụ OCR hoặc tự suy ra đáp án. Bạn dùng người nhập liệu hay công cụ riêng để chuẩn bị là việc hoàn toàn bên ngoài hệ thống.

Bạn cần bàn giao **một gói cho mỗi đề**. Có thể gửi nhiều gói theo lô. Gói bao gồm câu hỏi, lựa chọn, đáp án, cấu trúc phần thi và ảnh/audio thật nếu đề có dùng. Không chỉ gửi bản chép chữ hoặc Markdown.

## Các file cần trả

```text
ten-de.zip
├─ import.json
├─ media/
│  ├─ <sha256-cua-anh>.png
│  └─ <sha256-cua-audio>.mp3
└─ sources/                         tùy chọn, chỉ để đối chiếu riêng tư
   └─ <sha256-cua-pdf>.pdf
```

`import.json` phải ở ngay gốc ZIP, không bọc thêm thư mục `ten-de/`. JSON UTF-8, chuẩn Unicode NFC, không comment, không dấu phẩy thừa, không bọc bằng code fence. File ảnh/audio có bytes thật, không link máy cá nhân, không base64, không tên file giả. Tất cả file trong gói phải được khai báo; không thêm bản đáp án `.txt` riêng.

Nếu không có ảnh hoặc PDF nguồn, bỏ thư mục tương ứng và để danh sách JSON rỗng. PDF gốc là tùy chọn; nếu khai báo trang nguồn thì phải có sourceFile tương ứng trong gói. PDF chỉ là attachment để người duyệt mở xem, không được phần mềm quét.

## Tài liệu và mẫu dùng ngay

- [JSON Schema đầy đủ](schemas/import-v2.schema.json): hợp đồng máy đọc, `formatVersion: 2`.
- [JSON mẫu hoàn chỉnh](examples/import-v2-ready/import.json) và [ZIP mẫu](examples/import-v2-ready.zip).
- [JSON nháp thiếu đáp án](examples/import-v2-draft/import.json): cách ghi vấn đề thay vì đoán.
- [Checklist chuẩn bị dữ liệu](HUONG_DAN_CHUAN_BI_DU_LIEU.md).

Mẫu là5 câu tự soạn để thử định dạng, có ruby, gạch chân, ★, bảng, ảnh và audio âm báo. Số câu,30giây/phần và blueprint `synthetic-n5-v1` **không phải cấu trúc JLPT chính thức**. Không dùng nguyên mẫu làm đề thi thật. WAV trong mẫu chỉ để thử; audio đề thật nên MP3 hoặc M4A để giảm dung lượng. Ảnh mẫu2×2 không được dùng thay hình của đề thật.

## Các nhóm trường trong import.json

| Trường | Bạn cần cung cấp |
|---|---|
|formatVersion|Số2; không tự gửi formatVersion1 với cấu trúc mới|
|packageId|UUID duy nhất của gói; giữ nguyên khi sửa cùng đề|
|revision|Số nguyên từ 1; tăng khi sửa nội dung gói|
|source|Tên nguồn, cấp độ, năm, kỳ thi, xuất xứ và tham chiếu quyền sử dụng|
|sourceFiles|PDF tham chiếu tùy chọn: id, path, sha256, mimeType|
|exam|Tên đề, slug, kind, blueprintRef, tổng số câu và các phần thi theo thứ tự|
|groups|Các nhóm câu giữ nguyên bài đọc/audio chung|
|media|Manifest ảnh/audio: path, hash, MIME, kích thước hoặc độ dài|
|issues|Danh sách chỗ chưa rõ, không chắc hoặc cần bạn xác minh|

Schema không nhận trường ngoài danh sách. Thông tin nội bộ như ID database, createdBy, approved, status, role không được tự thêm vào gói để cấp quyền hay bỏ duyệt.

## Nguồn và cấu trúc đề

`source.level`: N1, N2, N3, N4 hoặcN5. `year` là số hoặcnull nếu không biết; `session` là7,12 hoặcnull. `provenance`: `official_past_exam` (đề thi chính thức các năm), `self_authored` (tự soạn) hoặc `third_party` (sách, trung tâm hoặc nguồn bên thứ ba khác). Server ghi giá trị này vào `Question.origin` với cùng tên. `licenseRef` lấy từ danh mục nguồn/quyền do chủ dự án quản lý; nếu chưa biết đểnull và `rightsStatus: "unverified"`. Không được tự viết “đã có bản quyền” chỉ vì tìm được PDF trên mạng. `owner_confirmed` trong file vẫn không thay kiểm tra license và quyền thực tế của server.

`exam.kind` chỉ `original` hoặc `practice`; đề trộn tạo bằng chức năng của ứng dụng. `blueprintRef` là `{ "id": "ID được hệ thống cung cấp", "version": 1 }`, không tự bịa ID hoặc số liệu. Nếu chưa biết blueprint dùngnull, thêm issue blocking; phần mềm lưu nháp rồi chủ dự án chọn blueprint trước khi publish.

Phần thi dùng mã:

- N1, N2: `language_reading`, `listening`.
- N3, N4, N5: `language_vocab`, `language_grammar_reading`, `listening`.

`durationSec` là giây. Đề gốc phải đối chiếu nguồn chính thức/blueprint theo thời kỳ; thiếu thìnull + issue blocking. Không lấy thời gian ở mẫu hoặc trí nhớ để điền. Bài practice có thể dùng thời lượng do chủ dự án đặt và ghi rõ không phải đề gốc.

`totalQuestions` phải bằng tổng câu trong groups. Mỗi section có `groupIds` theo thứ tự; mỗi group xuất hiện đúng một section. `orderInSection` từ 1 liên tục theo danh sách đó. Không tách các câu chung bài đọc hoặc đoạn nghe thành các nhóm độc lập làm mất liên hệ.

## Câu hỏi và đáp án

Mỗi group có `id`, `sectionCode`, `mondaiType`, `orderInSection`, `instructions`, `passage`, `mediaKeys`, `sourcePages`, `questions`, `transcript`. GroupId/questionId là mã ASCII duy nhất trong gói, ví dụ `g-reading-01`, `q-001`; không cần UUID database.

Mỗi câu có `number` là nhãn gốc dạng chuỗi, `skill` thuộc kanji/vocabulary/grammar/reading/listening, `stem`, `options`, `correctOption`, `sourcePages`, `explanation`.

- Giữ nguyên thứ tự lựa chọn từ PDF. Options có 3hoặc4mục, label lần lượt"1","2","3","4".
- `correctOption` là số từ 1 đến số lựa chọn,**không đánh số từ 0**. Đây là đáp án theo thứ tự options gốc, không phải index sau khi tự sắp xếp.
- Nếu thiếu file đáp án hoặc không chắc: `correctOption: null`, issue blocking trỏ đúng câu. Không dùng0, không tự giải hoặc đoán để tạo gói “hợp lệ”.
- `explanation: null` nếu nguồn không có lời giải. Muốn bổ sung lời giải phải ghi nội dung riêng có người duyệt, không trộn suy đoán với bản chép nguồn.
- `number` không quyết định thứ tự hiển thị toàn đề; thứ tự là sections→groupIds→questions. Server tự sinh index0..n-1 cho snapshot, không yêu cầu bạn tự chèn index.

`mondaiType` lấy đúng enum trong schema và đúng dạng của blueprint, cấp độ đó. Ví dụ `kanji_reading`, `grammar_form`, `sentence_composition`, `info_retrieval`, `utterance` (発話表現), `quick_response`. Danh sách đầy đủ trùng bảng mã 問題 ở mục A2 của [HOP_DONG_KY_THUAT.md](HOP_DONG_KY_THUAT.md). Nếu không xác định được dạng, chọn nháp và báo issue; không xuất bản một dạng tự đặt.

## Cách biểu diễn tiếng Nhật

Không đưa HTML, ảnh chụp toàn bộ câu hoặc Markdown vào stem/options để thay cấu trúc chữ. Giữ Kanji, Kana, dấu câu, ký tự toàn độ rộng. RichText là mảng các đoạn:

```json
[
  {"t":"text","text":"この"},
  {"t":"underline","children":[{"t":"ruby","text":"地図","rt":"ちず"}]},
  {"t":"text","text":"を見てください。"}
]
```

Nếu bản gốc không có furigana, không tự thêm furigana vào bản chép nguồn. Xuống dòng dùng `{"t":"br"}`; không nhét ký tự xuống dòng trong đoạn `text`. Dùng `emphasis` cho in đậm thực sự có trong nguồn. Không lồng underline/emphasis thêm một cấp.

Câu sắp xếp giữ đủ 3 ôtrống và 1 ô★, không đổi thứ tự lựa chọn:

```json
[
  {"t":"text","text":"あの店の "},
  {"t":"blank"}, {"t":"blank"}, {"t":"star"}, {"t":"blank"},
  {"t":"text","text":" おいしい。"}
]
```

`passage` dùng RichBlock: paragraph có `content: RichText`; table có `rows` là các hàng/cột, mỗi ô là RichText; image có `mediaKey`, `alt`, `width`, `height`. Bảng phải giữ thứ tự hàng/cột, tránh biến bảng thành đoạn chữ làm đổi ý nghĩa câu hỏi.

## Ảnh và audio

Mỗi file được đặt tên theo SHA-256 thật của bytes. Đổi nội dung file phải tính lại hash, đổi tên và cập nhật mọi reference. `mediaKey` đúng bằng path trong manifest, ví dụ `media/<64hex>.png`. Khai báo cả trong `media` ở gốc và `mediaKeys` của group sử dụng. Ảnh có width/height thật, durationMs=null; audio có durationMs thật, width/height=null.

Chấp nhận PNG, JPEG, WebP, AVIF và MP3, M4A, WAV theo schema. Không gán MIME theo đuôi nếu bytes khác loại. Không tự dùng ảnh khác hoặc âm báo để thay media bị thiếu của đề thật.

Phần listening có `listeningTimeline`. Mỗi đoạn gồm groupId, mediaKey, startMs, endMs, audioStartMs, audioEndMs, gapAfterMs. Tất cả đơn vị là **mili giây**:

- startMs/endMs: thời điểm phát trên đồng hồ phần nghe.
- audioStartMs/audioEndMs: đoạn tương ứng bên trong file audio.
- endMs-startMs phải bằng audioEndMs-audioStartMs.
- Đoạn kế tiếp bắt đầu ở endMs+gapAfterMs của đoạn trước; đoạn đầu có thể bắt đầu muộn nếu nguồn có khoảng chờ đầu.
- Không vượt durationMs của file hoặc durationSec của section. Mỗi nhóm nghe cần ít nhất một đoạn thật.

PDF thường không đủ để biết chính xác mốc audio. Nếu bạn chưa có audio hoặc chưa đo được timeline: đừng đoán. Có thể bàn giao nháp với timeline rỗng, mediaKeys rỗng cho audio chưa có và issue blocking tại section listening; gói chưa thể chuyển ready/publish. Không khai báo đường dẫn file chưa tồn tại để lách kiểm tra.

Transcript là riêng tư trong import; đểnull nếu không có nguồn/quyền. Không tự tạo transcript từ PDF nếu PDF không cung cấp. Hệ thống chỉ đưa transcript/lời giải ra người học theo quyền và sau mốc được phép; import.json chứa đáp án tuyệt đối không phục vụ công khai.

## Chỗ chưa chắc và chế độ nháp

```json
{
  "id":"answer-unknown",
  "severity":"blocking",
  "path":"/groups/0/questions/0/correctOption",
  "reason":"Nguồn bàn giao chưa có đáp án câu này; cần chủ dự án xác minh.",
  "sourcePages":[]
}
```

`path` là JSON Pointer trỏ đúng trường hiện có, không phải đường dẫn file. Dùng blocking cho nội dung/đáp án/hình/audio/thời gian còn thiếu hoặc không rõ; warning chỉ cho ghi chú không ảnh hưởng tính đúng. Nội dung chữ không đọc rõ giữ nhãn `[KHONG_DOC_RO]` trong text và issue blocking trỏ stem/passage; không invent chữ. Null chỉ dùng ở field schema cho phép; không bỏ trường bắt buộc.

Nếu có `sourcePages`, mỗi mục `{ "sourceId":"de-goc", "page":3 }` dùng số trang1-based trong PDF, không phải số trang in trên giấy. SourceId phải có trong sourceFiles. Có thể để[] nếu không đính kèm nguồn; người duyệt vẫn phải có cách đối chiếu ngoài hệ thống trước publish.

## Cách tự kiểm tra trên máy

Từ `Multi-worker`, dùng Python3.10 trở lên, không cần cài thư viện ngoài. Trên Windows, nếu lệnh `python` chỉ mở Microsoft Store thì dùng `py` thay cho `python`:

```powershell
python tools/validate_import.py "D:\du-lieu\de-n5.zip"
python tools/validate_import.py "D:\du-lieu\de-n5-nhap.zip" --mode draft
```

Exit0 ở ready là `READY_FOR_REVIEW`:schema/file/references đúng, còn cần người duyệt và server kiểm license/blueprint. Exit0 ở draft là `DRAFT_ONLY`, không cho publish. Exit1 in danh sách lỗi có path; sửa đúng chỗ rồi chạy lại. Công cụ không gọi model, không mở nội dung PDF để nhận dạng, không tự sửa đáp án.

Giới hạn tiện ích local:import.json10MiB, file120MiB, tổng500MiB,2000 file, tỷ lệ nén tối đa200:1. Server cần kiểm codec/kích thước media thật, malware, quyền, license, blueprint và quota theo cấu hình triển khai; local validator không thay các gate đó.

## Những điều phần mềm sẽ tự làm

Resolve blueprint/license đã tồn tại, tạo IDs DB, giữ source refs, validate thêm semantic theo blueprint, import transaction ở trạng thái draft, preview không đáp án, review hai người, version và snapshot/answer key riêng. Nhập lại cùng packageId+revision+content hash là idempotent; cùng ID/revision nhưng bytes thay đổi phải409conflict, tăngrevision để sửa. Không tự suy ra câu hỏi từ PDF hay tự gọi agent sửa dữ liệu.
