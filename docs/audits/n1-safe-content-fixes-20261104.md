# N1 safe content fixes - 2026-11-04

## Phạm vi

- Nguồn: 31 báo cáo `BAO_CAO_OCR_N1_*.md`.
- Chỉ áp dụng sửa chữ/OCR/trợ từ/dấu câu/lựa chọn/transcript có cặp `current -> expected` rõ ràng.
- Không sửa khóa đáp án, mục mâu thuẫn nguồn, placeholder, câu/media bị thiếu hoặc nội dung cần biên soạn.
- Tất cả thay đổi đi qua API editor -> reviewer; không ghi SQL trực tiếp.

## Sao lưu

- File: `/srv/jlpt-backups/manual/n1-content-fixes-20261104T111151Z.dump`
- Kích thước: 40.794.694 byte.
- SHA-256: `8155ab46a4210a5c997999b64cc5e08a0b1d2db9a71580f954b30ba39a9ede16`

## Kết quả lọc và áp dụng

- Mirai trích xuất: 542 ứng viên.
- Bộ lọc cứng chấp nhận: 270; loại: 272.
- Dry-run API: 171 sửa câu/bài/lựa chọn trong 120 nhóm; 99 ứng viên transcript trong 84 câu.
- Áp dụng và xác minh cuối:
  - 120/120 nhóm tạo phiên bản mới và được reviewer duyệt.
  - 83 phiên bản lời giải mới được tạo và duyệt.
  - 268 sửa được tái xuất và xác minh: 171 nội dung + 97 transcript.
  - 2 ứng viên chồng lặp của N1 12/2021 Q71 bị loại vì chuỗi hiện hành không khớp chính xác báo cáo; không ép sửa suy đoán.
  - 26 đề có thay đổi nhóm câu hỏi đã được republish.

## Xác minh

- Tái xuất 29 đề có sửa nội dung hoặc transcript: không có failure.
- Kiểm tra trực tiếp 26 snapshot mới: 171/171 sửa nội dung xuất hiện trong snapshot, không có failure.
- Trang thật `http://192.168.114.206:3000/de-thi/n1-2014-12`: HTTP 200, hiển thị phiên bản v2.
- Không migration, không sửa production, không bỏ qua review/CI.

## Tệp vận hành

- `dry-run.mjs`: xác minh precondition qua API và tạo kế hoạch có hash.
- `apply.mjs`: tạo phiên bản mới, submit review, approve, republish; có journal/resume và dừng ngay khi lỗi.
- `verify-public.mjs`: kiểm tra snapshot đã publish chứa toàn bộ sửa nội dung.
- `manifest.json`: danh sách ứng viên được chấp nhận/từ chối cùng lý do kiểm toán.
