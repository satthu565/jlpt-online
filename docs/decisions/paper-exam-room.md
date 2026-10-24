# Cuốn đề HTML và phiếu tô trong phòng thi

Ngày: 24/10/2026. Nhánh triển khai: `feat/paper-exam-room`.

## Quyết định

Trang `/phong-thi` trình bày dữ liệu snapshot đã xuất bản bằng HTML, theo nhóm 問題 và cụm bài đọc. PDF chỉ dùng để đối chiếu nội dung. Không đưa đáp án đúng, lời giải hay script vào dữ liệu công khai.

Desktop hiển thị cuốn đề và phiếu tô bám màn hình. Tablet và mobile dùng cuốn đề một cột, đồng hồ bám trên và thanh mở phiếu bám dưới. Bảng phiếu và bài đọc dùng Modal chung để giữ hành vi focus và bàn phím thống nhất.

## Chức năng

- Nhiều câu liên tiếp, giữ rich text, ruby, gạch chân, ★, hình và bảng có trong snapshot.
- Chọn tại câu hoặc phiếu dùng cùng trạng thái; chọn lại không tẩy, có nút tẩy riêng.
- Cờ xem lại tại mỗi câu và phiếu, độc lập với đáp án.
- Tiến độ theo phần; đi tới câu trống hoặc câu có cờ, có quay vòng trong phần.
- Bấm số câu mở đúng vị trí; cuộn đọc không tự đổi câu nhận phím số.
- Rà soát trước chuyển phần hoặc nộp cả bài; cảnh báo rõ nếu kết thúc cả các phần chưa làm.
- Cỡ chữ, font Mincho hoặc Gothic, điều chỉnh chiều rộng desktop và công cụ thu gọn.
- Tô đoạn chữ, ghi nháp từng câu và vùng nháp thứ tự cho bài sắp xếp câu.
- Mở lại đoạn đọc trong bảng riêng; đóng bảng trả về vị trí trước đó.
- Phím số, F, các phím điều hướng và trợ giúp; bỏ qua khi đang nhập nháp, dùng IME hoặc mở dialog.
- Lưu nháp, dấu tô và vị trí đọc cục bộ, tách theo attempt, exam và version. Có thông báo khi bộ nhớ trình duyệt lỗi.
- Deadline và sequence phục hồi từ server; giữ thay đổi cục bộ mới hơn chưa ACK trong phần hiện tại.
- Chờ ghi cục bộ và ACK trước chuyển phần; khi nộp gửi toàn bộ phiếu tới API và chỉ báo thành công sau phản hồi.
- Đối chiếu trạng thái server trước chuyển phần để retry không vô tình bỏ qua phần kế tiếp.
- Thử loa bằng tệp WAV tiếng bíp thật, xác nhận bằng sự kiện phát xong trước chuyển sang phần nghe; không giả lập thành công bằng timeout.
- Phần nghe có âm lượng và đường cho phép phát khi trình duyệt chặn. Thi thật không tự điều hướng theo audio và không có tua, tạm dừng hoặc đổi tốc độ.
- Luyện tập có thể bật theo audio, furigana và tra từ. Thi thật giữ furigana gốc, không mở tra từ.

## Tương thích dữ liệu

Không thay đổi nội dung đề đã xuất bản và không yêu cầu migration. Chỉ gộp chỉ dẫn lặp khi các nhóm liền nhau có cùng cấu trúc chỉ dẫn và cùng số 問題 được in rõ; không suy nhóm chỉ bằng mondaiType. Không có chỉ dẫn rõ thì giữ ranh giới group.

Các định dạng chưa có trong snapshot không thể được khôi phục bằng CSS. Ví dụ schema bảng hiện tại lưu các hàng và ô, chưa có mô tả ô gộp. Đề cần thông tin này phải được bổ sung qua quy trình nội dung và schema riêng, không tự đoán vị trí hoặc sửa dữ liệu đã xuất bản.

Ghi nháp và dấu tô hiện lưu trên thiết bị, không tuyên bố đồng bộ sang máy khác. Đáp án và cờ tiếp tục qua API và IndexedDB như phiên thi hiện có.

## Kiểm tra

Unit và render tests nằm trong `apps/web/tests/paper-exam.test.tsx`, `paper-sync.test.ts`, cùng các bộ kiểm tra phòng thi hiện có. Kịch bản trình duyệt có API thật được đăng ký từ `tests/playwright/paper-exam-journey.ts` vào bộ integration.

Kiểm tra trình duyệt phải bao gồm chọn lại không mất đáp án, cờ, ghi nháp, tô đoạn, thời gian thực sự giảm, mất mạng rồi đồng bộ, tải lại và lớp bám màn hình ở 390px và 1366px. Luồng học từ điển được kiểm tra ở chế độ luyện tập; chế độ thi thật phải không mở công cụ tra cứu.
