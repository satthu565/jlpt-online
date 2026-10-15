# Checklist chuẩn bị và kiểm tra dữ liệu đề thi Import v2

Chủ dự án và đội ngũ nhập liệu thực hiện tuần tự các bước dưới đây để chuẩn bị dữ liệu bên ngoài hệ thống.

---

## Bước 1: Thu thập và kiểm tra nguồn đề
- [ ] Xác định đề thi: cấp độ (`N1`–`N5`), năm thi (`year`), kỳ thi (`7` hoặc `12`), và xuất xứ (`official_past_exam`, `self_authored`, hoặc `third_party`).
- [ ] Kiểm tra tình trạng bản quyền / nguồn sử dụng (`licenseRef`, `rightsStatus: "owner_confirmed"`).
- [ ] Chuẩn bị tệp PDF gốc lưu trữ vào thư mục `sources/` (tùy chọn, dùng để đối chiếu).

## Bước 2: Chuẩn bị tệp đa phương tiện (Media)
- [ ] Trích xuất các tệp hình ảnh (.png, .jpg, .webp, .avif) và âm thanh (.wav, .mp3, .m4a).
- [ ] Tính mã băm SHA-256 thật của từng tệp:
  - Trên Linux/macOS: `sha256sum tệp.png`
  - Trên Windows PowerShell: `Get-FileHash -Algorithm SHA256 tệp.png`
- [ ] Đổi tên tệp thành `<sha256>.<ext>` và chuyển vào thư mục `media/`.
- [ ] Khai báo đầy đủ kích thước `width`, `height` cho ảnh; thời lượng `durationMs` cho audio trong manifest.

## Bước 3: Soạn thảo `import.json`
- [ ] Khởi tạo `packageId` (UUID v4) và `revision: 1` (tăng lên 2, 3... nếu cập nhật bản cũ).
- [ ] Chia cấu trúc `sections` theo đúng cấp độ JLPT:
  - N1, N2: `language_reading`, `listening`.
  - N3, N4, N5: `language_vocab`, `language_grammar_reading`, `listening`.
- [ ] Nhập các nhóm câu hỏi (`groups`), bảo toàn liên kết đoạn văn chung (`passage`) và đoạn nghe.
- [ ] Nhập nội dung RichText tiếng Nhật:
  - Chuẩn hóa Unicode NFC toàn bộ chuỗi.
  - Sử dụng thẻ `ruby` cho furigana, `underline` cho gạch chân, `emphasis` cho in đậm.
  - Câu sắp xếp từ (dạng `sentence_composition`): đảm bảo đúng 3 `blank` và 1 `star`.
  - Không lồng `underline` trong `underline` hay `emphasis` trong `emphasis`.
- [ ] Nhập các câu hỏi (`questions`):
  - Nhãn lựa chọn tuần tự `"1"`, `"2"`, `"3"` (và `"4"`).
  - Điền `correctOption` (1-based index). Nếu không chắc, đặt `null`.
- [ ] Thiết lập dòng thời gian phần nghe (`listeningTimeline`):
  - Xác định mốc `startMs`, `endMs`, `audioStartMs`, `audioEndMs`, `gapAfterMs`.
  - Đảm bảo tính liên tục giữa các đoạn nghe.

## Bước 4: Xử lý các điểm chưa chắc chắn
- [ ] Kiểm tra danh sách câu hỏi: nếu thiếu đáp án, chữ không đọc rõ (`[KHONG_DOC_RO]`), hoặc thiếu audio, khai báo bản ghi `issue` với mức `blocking` trỏ đúng JSON pointer.
- [ ] Không tự đoán đáp án để làm gói "đạt chuẩn".

## Bước 5: Kiểm tra cục bộ bằng công cụ
- [ ] Chạy lệnh kiểm tra cấu trúc và tệp:
  ```bash
  # Đối với gói đã hoàn thiện (Ready for Review)
  pnpm import:validate -- duong-dan-den-thu-muc-de

  # Đối với gói đang soạn thảo (Draft Only)
  node tools/import-data/bin/validate.js duong-dan-den-thu-muc-de --mode draft
  ```
- [ ] Xác nhận kết quả trả về `READY_FOR_REVIEW` (với đề hoàn chỉnh) hoặc `DRAFT_ONLY` (với đề nháp).

## Bước 6: Đóng gói và tải lên
- [ ] Nén các tệp thành file ZIP sao cho `import.json` nằm ngay tại thư mục gốc của ZIP.
- [ ] Chạy kiểm tra lại trên tệp ZIP vừa nén:
  ```bash
  pnpm import:validate -- ten-de.zip
  ```
- [ ] Đăng nhập giao diện quản trị (Admin portal) và tải gói ZIP lên hệ thống để tiến hành review và xuất bản.
