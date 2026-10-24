# Nội dung HTML trong giao diện phòng thi cũ

Ngày 24/10/2026, chủ dự án yêu cầu giữ giao diện cũ và chỉ nâng cấp nội dung. Quyết định này thay thế phương án cuốn đề dài và phiếu tô mới đã triển khai trước đó.

## Giao diện được giữ lại

Khôi phục ExamRoom cũ: một câu mỗi lần, khung câu hỏi, các nút đáp án, thanh công cụ, bảng số câu, tiến độ, đánh dấu và điều hướng trước/sau. Không dùng cuốn đề cuộn dài, phiếu tô dạng mới, thanh mở phiếu mobile hoặc vùng ghi nháp/tô đoạn của bản thiết kế đã bỏ.

## Phần nội dung được nâng cấp

QuestionView tiếp tục nhận snapshot thật và sử dụng ExamText, ExamPassage, ExamContentImage. Nội dung được dựng bằng HTML, giữ khoảng trắng và xuống dòng gốc, ruby, gạch chân, ★ và các đoạn bài đọc. Bảng cuộn trong vùng nội dung khi hẹp; hình không bị cắt chiều cao và có thể mở lớn. URL ảnh và audio dùng API cùng nguồn để hoạt động trong container và qua LAN.

CSS chỉ áp dụng trong nội dung câu hỏi; không áp theme hoặc bố cục mới cho toàn trang. Không thêm dữ liệu minh họa vào giao diện, không thay đề đã xuất bản. Định dạng chưa được lưu trong snapshot, như ô bảng gộp, vẫn cần bổ sung qua quy trình nội dung/schema.

## Tính tương thích

Giữ các sửa về countdown, guest cookie, sequence, deadline phục hồi và ghi hàng đợi đã thực hiện. Khôi phục hình thức điều khiển cũ, bao gồm các tùy chọn tra từ và furigana có sẵn. Thử loa vẫn phát tệp WAV thật; không dùng timeout để giả lập thành công.

## Kiểm tra

Kiểm tra render nội dung nằm trong `apps/web/tests/exam-content.test.tsx`. Kịch bản API thật `tests/playwright/exam-content-journey.ts` kiểm tra khung cũ, chọn đáp án, đánh dấu, trước/sau, lưu, tải lại và nộp bài; có ảnh ở 390px và 1366px. Các bộ kiểm tra phòng thi cũ được khôi phục để kiểm tra hành vi cũ.