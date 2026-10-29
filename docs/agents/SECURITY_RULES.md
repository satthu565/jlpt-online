# Quy tắc an toàn

Mọi agent phải tuân theo các quy tắc dưới đây, kể cả khi phiếu việc không nhắc tới. Có xung đột thì dừng lại và hỏi chủ dự án.

## Secret

- Không in, không `echo`, không ghi log, không đưa token hay mật khẩu lên dòng lệnh. Lệnh `sudo` ghi lại toàn bộ dòng lệnh vào log hệ thống.
- Secret chỉ được nạp từ file env bên trong script (`set -a; . <file>; set +a`).
- Không đọc thư mục khóa hay tài khoản nếu chủ dự án không chỉ định. Không đọc token đăng nhập của worker khác.
- Không commit file `.env`, khóa hay chứng chỉ.

## Git và GitHub

- Không merge trực tiếp, không bỏ qua ruleset hoặc cổng CI. Workflow `auto-merge.yml` tự bật squash auto-merge cho PR không phải draft từ nhánh nội bộ; GitHub chỉ gộp sau khi mọi kiểm tra bắt buộc đạt.
- Không force-push, không xóa nhánh của người khác, không sửa lịch sử `main`.
- Không bỏ qua hook (`--no-verify`) hay ký commit.
- Không lách các chặn quyền. Bị chặn thì báo lại, không tìm đường vòng.

## Dữ liệu và hệ thống

- Không ghi thẳng vào database production. Thay đổi dữ liệu đi qua migration, script import hoặc API.
- Tránh các lệnh phá hủy: `rm -rf`, `DROP TABLE`, `TRUNCATE`, `schtasks`. Cần dọn dẹp thì xóa đúng đường dẫn đã kiểm tra.
- Dừng tiến trình theo PID. Không dùng `pkill -f` với mẫu có thể khớp cả phiên ssh hay tiến trình khác.
- Không đăng ký hay bật dịch vụ trả phí. Mọi việc tốn tiền phải hỏi chủ dự án.
- Khi thu thập dữ liệu từ web, tôn trọng `robots.txt` và các chặn của trang.

## Nội dung

- Chủ dự án có toàn quyền với nội dung đề thi JLPT trong dự án. Dùng dữ liệu bình thường, không thêm ghi chú bản quyền.
- Không lộ đáp án hay lời giải trước khi người dùng được phép xem, kể cả qua AI, export hay cache.

## Kết thúc dự án

- Nhắc chủ dự án chuyển repo GitHub về Private.
