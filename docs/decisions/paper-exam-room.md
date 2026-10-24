# Cuốn đề HTML trong khung phòng thi cũ

Ngày 24/10/2026, chủ dự án xác định phạm vi bằng ảnh khoanh đỏ: giữ header, tab phần thi, thanh công cụ và footer hiện có; thay toàn bộ vùng làm bài ở giữa bằng cuốn đề HTML và phiếu tô đáp án mới.

## Giao diện được giữ lại

`ExamRoom` giữ khung ngoài, đồng hồ, đồng bộ, nút nộp, tab phần thi, thanh công cụ và audio. `ExamWorkspace` thay toàn bộ vùng câu hỏi đơn, bảng số câu và điều hướng trước/sau bằng nhiều câu liên tiếp trong phần thi hiện tại. Phím mũi tên cuộn đến câu thay vì thay nội dung bằng một câu.

Máy tính có phiếu tô và tiến độ bám khi cuộn, danh sách đáp án cuộn riêng. Mobile có thanh mở phiếu cố định dưới màn hình. Có tô đáp án từ phiếu, nhảy tới câu, đánh dấu từng câu, tìm câu chưa làm/cần xem lại, tẩy đáp án riêng, ghi nháp, tô đoạn, mở lại bài đọc và phóng to hình. Zen vẫn giữ khả năng mở phiếu trả lời.

## Phần nội dung được nâng cấp

`PaperBooklet` nhận snapshot thật và dựng HTML giữ ruby, gạch chân, ★ và bài đọc. Chỉ gộp chỉ dẫn liên tiếp có cùng số 問題 và cấu trúc trùng nhau; bài đọc chung hiển thị một lần. Bảng cuộn trong vùng riêng khi hẹp; hình mở lớn được. URL ảnh và audio dùng API cùng nguồn để hoạt động trong container và qua LAN. Ghi nháp/tô đoạn lưu riêng theo lượt thi trên thiết bị, không đưa vào đáp án chấm điểm.

CSS cuốn đề không ẩn header/footer hoặc thay theme toàn trang. Overflow trang phòng thi chuyển từ hidden sang clip để sticky hoạt động. Không thêm dữ liệu minh họa, không thay đề đã xuất bản. Định dạng chưa lưu trong snapshot, như ô bảng gộp, cần bổ sung qua quy trình nội dung/schema.

## Tính tương thích

Giữ các sửa về countdown, guest cookie, sequence, deadline phục hồi và ghi hàng đợi đã thực hiện. Khôi phục hình thức điều khiển cũ, bao gồm các tùy chọn tra từ và furigana có sẵn. Thử loa vẫn phát tệp WAV thật; không dùng timeout để giả lập thành công.

## Kiểm tra

Các test nội dung/cuốn đề kiểm tra ruby, gạch chân, bài đọc chung, phân nhóm, cờ, giá trị đáp án và tìm câu xem lại. Kịch bản API thật `tests/playwright/exam-content-journey.ts` kiểm tra khung cũ + nhiều câu mới, đáp án ở hai câu khác nhau, tô phiếu, đánh dấu, lưu/tải lại, sticky và nộp bài ở 390px/1366px.
