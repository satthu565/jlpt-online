# Checklist chuẩn bị và bàn giao dữ liệu đề

Bạn tự thực hiện các bước dưới đây bằng tay hoặc công cụ riêng. Website không kết nối công cụ đó. Chuẩn chính thức là [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md).

1. Chuẩn bị nguồn đề, file đáp án, ảnh/audio và quyền sử dụng. Ghi cấp độ, năm, kỳ thi; chỗ chưa biết đểnull đúng schema và thêm issue.
2. Lấy blueprintRef từ hệ thống hoặc chủ dự án. Không sao chép cấu trúc/thời gian trong gói mẫu cho đề thật.
3. Nhập sections theo thứ tự, groups theo bài đọc/nghe; giữ nguyên nhóm dùng chung passage/audio.
4. Gõ nội dung RichText, giữ ruby/gạch chân/★/bảng và 3–4 lựa chọn đúng thứ tự nguồn.
5. Điền correctOption từ nguồn đáp án đáng tin cậy. Chưa có thìnull+blocking, không đoán. Lời giải hoặc transcript không có thìnull.
6. Chuẩn bị ảnh/audio thật, tính SHA-256 và đặt tên file; ghi đúng MIME, kích thước/độ dài và references. Chưa có media thì giữ nháp, báo đúng phần thiếu.
7. Đo timeline audio; không suy thời điểm từ PDF hoặc dùng âm báo mẫu thay bài nghe thật.
8. Đính kèm PDF nguồn tùy chọn trong sources/ để người duyệt mở xem; không có yêu cầu phần mềm đọc nó.
9. Chạy validator thư mục trước, kéo import.json/media/sources vào ZIP ở gốc, rồi chạy validator ZIP.
10. Tải ZIP lên admin, đối chiếu từng câu với nguồn, duyệt và xuất bản. PASS validator chỉ là kiểm tra dữ liệu kỹ thuật.

Tính hash trong PowerShell:

```powershell
Get-FileHash -LiteralPath "D:\du-lieu\anh-1.png" -Algorithm SHA256
```

Dùng64ký tự hash viết thường làm tên file. Nếu file thay đổi, hash cũ không dùng được.

Mẫu bàn giao mong muốn:

```text
de-n5-2021-12.zip
Kết quả validator: READY_FOR_REVIEW hoặc DRAFT_ONLY
Tổng câu / tổng nhóm / phần thi: khớp import.json
Chỗ cần chủ dự án xác minh: liệt kê từ issues
Nguồn và quyền sử dụng: đã biết / chưa xác minh
```

Không cần đưa tài khoản, API key, script chạy model, credential DB hoặc code tự động vào gói. Nếu bạn nhờ một agent khác chuẩn bị, đưa cho nó hướng dẫn này, schema và gói mẫu; đó vẫn là thao tác riêng do bạn thực hiện, không phải tích hợp agent vào sản phẩm.
