# Ma trận 375 tính năng trong tuần

Giữ375 mã nguồn để truy vết. Theo chỉ thị mới,363 yêu cầu nằm trong ứng dụng (một số đổi thành nhập gói chuẩn);12 yêu cầu đọc/trích xuất PDF chuyển sang agent bên ngoài. Không xây dịch vụ nhận dạng PDF và không tính12 mã bên ngoài vào tỷ lệ code hoàn tất. [Chuẩn dữ liệu](CHUAN_DU_LIEU_NHAP.md) là hợp đồng đầu vào.

| Mã | Tính năng theo nguồn | Hành vi hiện hành | Phạm vi | Ưu tiên | Task hỗ trợ | Worker | Ngày | Kiểm tra hoặc đầu vào | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| ACC-01 | Đăng ký tài khoản bằng email | Đăng ký tài khoản bằng email | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-01 | TODO |
| ACC-02 | Đăng nhập, đăng xuất | Đăng nhập, đăng xuất | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-02 | TODO |
| ACC-03 | Đăng nhập bằng Google | Đăng nhập bằng Google | APPLICATION | P1 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-03 | TODO |
| ACC-04 | Quên mật khẩu, đặt lại mật khẩu | Quên mật khẩu, đặt lại mật khẩu | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-04 | TODO |
| ACC-05 | Xác minh email | Xác minh email | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-05 | TODO |
| ACC-06 | Chỉnh sửa tên, ảnh đại diện, thông tin cá nhân | Chỉnh sửa tên, ảnh đại diện, thông tin cá nhân | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/ACC-06 | TODO |
| ACC-07 | Chọn cấp độ JLPT đang ôn: N1–N5 | Chọn cấp độ JLPT đang ôn: N1–N5 | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-07 | TODO |
| ACC-08 | Đặt mục tiêu kỳ thi tháng 7 hoặc tháng 12 | Đặt mục tiêu kỳ thi tháng 7 hoặc tháng 12 | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/ACC-08 | TODO |
| ACC-09 | Đặt mục tiêu điểm số | Đặt mục tiêu điểm số | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/ACC-09 | TODO |
| ACC-10 | Xem tổng số đề đã hoàn thành | Xem tổng số đề đã hoàn thành | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-10 | TODO |
| ACC-11 | Xem thời gian đã dành cho việc ôn tập | Xem thời gian đã dành cho việc ôn tập | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/ACC-11 | TODO |
| ACC-12 | Quản lý thiết bị và phiên đăng nhập | Quản lý thiết bị và phiên đăng nhập | APPLICATION | P1 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/ACC-12 | TODO |
| ACC-13 | Xuất dữ liệu cá nhân và yêu cầu xóa tài khoản | Xuất dữ liệu cá nhân và yêu cầu xóa tài khoản | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/ACC-13 | TODO |
| ACC-14 | Thiết lập ngôn ngữ giao diện Việt / Nhật / Anh | Thiết lập ngôn ngữ giao diện Việt / Nhật / Anh | APPLICATION | P2 | [F04](KE_HOACH_TRIEN_KHAI.md#f04) | W3 | 1 | feature/ACC-14 | TODO |
| LIB-01 | Hiển thị danh sách đề N1–N5 | Hiển thị danh sách đề N1–N5 | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-01 | TODO |
| LIB-02 | Lọc theo cấp độ JLPT | Lọc theo cấp độ JLPT | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-02 | TODO |
| LIB-03 | Lọc theo năm | Lọc theo năm | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-03 | TODO |
| LIB-04 | Lọc theo kỳ thi tháng 7 / tháng 12 | Lọc theo kỳ thi tháng 7 / tháng 12 | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-04 | TODO |
| LIB-05 | Phân biệt đề gốc, đề luyện tự biên soạn và đề trộn | Phân biệt đề gốc, đề luyện tự biên soạn và đề trộn | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-05 | TODO |
| LIB-06 | Tìm kiếm đề thi | Tìm kiếm đề thi | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-06 | TODO |
| LIB-07 | Hiển thị số câu, thời gian làm, các phần thi | Hiển thị số câu, thời gian làm, các phần thi | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-07 | TODO |
| LIB-08 | Hiển thị trạng thái: chưa làm / đang làm / hoàn thành | Hiển thị trạng thái: chưa làm / đang làm / hoàn thành | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-08 | TODO |
| LIB-09 | Hiển thị điểm cao nhất của từng đề | Hiển thị điểm cao nhất của từng đề | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-09 | TODO |
| LIB-10 | Hiển thị số lần đã làm đề | Hiển thị số lần đã làm đề | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-10 | TODO |
| LIB-11 | Đánh dấu đề yêu thích | Đánh dấu đề yêu thích | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-11 | TODO |
| LIB-12 | Lọc các đề chưa từng làm | Lọc các đề chưa từng làm | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-12 | TODO |
| LIB-13 | Lọc đề đã làm nhưng chưa đạt mục tiêu | Lọc đề đã làm nhưng chưa đạt mục tiêu | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-13 | TODO |
| LIB-14 | Đề xuất đề tiếp theo | Đề xuất đề tiếp theo | APPLICATION | P2 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/LIB-14 | TODO |
| LIB-15 | Hiển thị thông tin nguồn, phiên bản, quyền sử dụng đề | Hiển thị thông tin nguồn, phiên bản, quyền sử dụng đề | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/LIB-15 | TODO |
| EXAM-01 | Chọn đề thi | Chọn đề thi | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-01 | TODO |
| EXAM-02 | Chọn chế độ thi thật hoặc luyện tập | Chọn chế độ thi thật hoặc luyện tập | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-02 | TODO |
| EXAM-03 | Hiển thị hướng dẫn làm bài | Hiển thị hướng dẫn làm bài | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-03 | TODO |
| EXAM-04 | Hiển thị thời gian thi từng phần | Hiển thị thời gian thi từng phần | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-04 | TODO |
| EXAM-05 | Kiểm tra loa/tai nghe trước phần nghe | Kiểm tra loa/tai nghe trước phần nghe | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/EXAM-05 | TODO |
| EXAM-06 | Hiển thị lưu ý về chuyển phần và nộp bài | Hiển thị lưu ý về chuyển phần và nộp bài | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-06 | TODO |
| EXAM-07 | Bắt đầu thi và ghi nhận thời điểm bắt đầu | Bắt đầu thi và ghi nhận thời điểm bắt đầu | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-07 | TODO |
| EXAM-08 | Đồng hồ đếm ngược | Đồng hồ đếm ngược | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-08 | TODO |
| EXAM-09 | Tự động chuyển hoặc kết thúc phần khi hết giờ | Tự động chuyển hoặc kết thúc phần khi hết giờ | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/EXAM-09 | TODO |
| EXAM-10 | Hiển thị câu hỏi và đáp án lựa chọn | Hiển thị câu hỏi và đáp án lựa chọn | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-10 | TODO |
| EXAM-11 | Chọn, đổi, bỏ chọn đáp án | Chọn, đổi, bỏ chọn đáp án | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-11 | TODO |
| EXAM-12 | Chuyển câu trước / câu sau | Chuyển câu trước / câu sau | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-12 | TODO |
| EXAM-13 | Danh sách câu hỏi dạng phiếu trả lời | Danh sách câu hỏi dạng phiếu trả lời | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-13 | TODO |
| EXAM-14 | Đánh dấu câu cần xem lại | Đánh dấu câu cần xem lại | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-14 | TODO |
| EXAM-15 | Phân biệt câu đã làm / chưa làm / đánh dấu | Phân biệt câu đã làm / chưa làm / đánh dấu | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-15 | TODO |
| EXAM-16 | Hiển thị tiến độ hoàn thành | Hiển thị tiến độ hoàn thành | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-16 | TODO |
| EXAM-17 | Tự động lưu đáp án | Tự động lưu đáp án | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-17 | TODO |
| EXAM-18 | Khôi phục phiên thi sau sự cố kết nối theo quy định chế độ thi | Khôi phục phiên thi sau sự cố kết nối theo quy định chế độ thi | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/EXAM-18 | TODO |
| EXAM-19 | Xác nhận trước khi nộp bài sớm | Xác nhận trước khi nộp bài sớm | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-19 | TODO |
| EXAM-20 | Tự động nộp khi hết thời gian | Tự động nộp khi hết thời gian | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/EXAM-20 | TODO |
| EXAM-21 | Không cho xem đáp án khi đang thi | Không cho xem đáp án khi đang thi | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-21 | TODO |
| EXAM-22 | Không cho quay lại phần đã khóa | Không cho quay lại phần đã khóa | APPLICATION | P0 | [C03](KE_HOACH_TRIEN_KHAI.md#c03) | W3 | 2 | feature/EXAM-22 | TODO |
| EXAM-23 | Phóng to/thu nhỏ cỡ chữ tiếng Nhật | Phóng to/thu nhỏ cỡ chữ tiếng Nhật | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/EXAM-23 | TODO |
| EXAM-24 | Phím tắt chọn đáp án, chuyển câu trên máy tính | Phím tắt chọn đáp án, chuyển câu trên máy tính | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/EXAM-24 | TODO |
| EXAM-25 | Giao diện tối giản, ẩn các yếu tố gây xao nhãng | Giao diện tối giản, ẩn các yếu tố gây xao nhãng | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/EXAM-25 | TODO |
| EXAM-26 | Chế độ sáng / tối | Chế độ sáng / tối | APPLICATION | P2 | [F04](KE_HOACH_TRIEN_KHAI.md#f04) | W3 | 1 | feature/EXAM-26 | TODO |
| AUDIO-01 | Phát audio theo từng bài hoặc luồng thi | Phát audio theo từng bài hoặc luồng thi | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-01 | TODO |
| AUDIO-02 | Ghép đúng audio, hình ảnh và nhóm câu hỏi | Ghép đúng audio, hình ảnh và nhóm câu hỏi | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-02 | TODO |
| AUDIO-03 | Hiển thị hình ảnh minh họa nếu có | Hiển thị hình ảnh minh họa nếu có | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-03 | TODO |
| AUDIO-04 | Không cho tua/phát lại trong chế độ thi thật | Không cho tua/phát lại trong chế độ thi thật | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-04 | TODO |
| AUDIO-05 | Cho phát lại trong chế độ luyện tập | Cho phát lại trong chế độ luyện tập | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-05 | TODO |
| AUDIO-06 | Điều chỉnh tốc độ 0.75x, 1x, 1.25x trong chế độ luyện tập | Điều chỉnh tốc độ 0.75x, 1x, 1.25x trong chế độ luyện tập | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-06 | TODO |
| AUDIO-07 | Phát audio riêng từng câu sau khi nộp bài | Phát audio riêng từng câu sau khi nộp bài | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-07 | TODO |
| AUDIO-08 | Hiển thị transcript nếu có quyền sử dụng | Hiển thị transcript nếu có quyền sử dụng | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/AUDIO-08 | TODO |
| AUDIO-09 | Đồng bộ transcript với đoạn audio | Đồng bộ transcript với đoạn audio | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/AUDIO-09 | TODO |
| AUDIO-10 | Phát hiện lỗi tải audio và xử lý sự cố | Phát hiện lỗi tải audio và xử lý sự cố | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/AUDIO-10 | TODO |
| PRA-01 | Luyện riêng Kanji | Luyện riêng Kanji | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-01 | TODO |
| PRA-02 | Luyện riêng từ vựng | Luyện riêng từ vựng | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-02 | TODO |
| PRA-03 | Luyện riêng ngữ pháp | Luyện riêng ngữ pháp | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-03 | TODO |
| PRA-04 | Luyện riêng đọc hiểu | Luyện riêng đọc hiểu | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-04 | TODO |
| PRA-05 | Luyện riêng nghe hiểu | Luyện riêng nghe hiểu | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-05 | TODO |
| PRA-06 | Luyện theo từng dạng 問題 | Luyện theo từng dạng 問題 | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-06 | TODO |
| PRA-07 | Tạo bài 10 / 20 / 30 / 50 câu theo bộ lọc | Tạo bài 10 / 20 / 30 / 50 câu theo bộ lọc | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-07 | TODO |
| PRA-08 | Luyện không giới hạn thời gian | Luyện không giới hạn thời gian | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-08 | TODO |
| PRA-09 | Luyện có thời gian do người dùng chọn | Luyện có thời gian do người dùng chọn | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-09 | TODO |
| PRA-10 | Xem đáp án ngay sau mỗi câu | Xem đáp án ngay sau mỗi câu | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/PRA-10 | TODO |
| PRA-11 | Chỉ luyện các câu đã làm sai | Chỉ luyện các câu đã làm sai | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/PRA-11 | TODO |
| PRA-12 | Chỉ luyện câu chưa từng gặp | Chỉ luyện câu chưa từng gặp | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/PRA-12 | TODO |
| PRA-13 | Luyện câu đã đánh dấu | Luyện câu đã đánh dấu | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/PRA-13 | TODO |
| PRA-14 | Luyện ngẫu nhiên từ nhiều nguồn đề | Luyện ngẫu nhiên từ nhiều nguồn đề | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-14 | TODO |
| PRA-15 | Luyện theo độ khó được hệ thống đánh giá | Luyện theo độ khó được hệ thống đánh giá | APPLICATION | P2 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-15 | TODO |
| PRA-16 | Luyện theo mẫu ngữ pháp hoặc nhóm từ vựng | Luyện theo mẫu ngữ pháp hoặc nhóm từ vựng | APPLICATION | P2 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/PRA-16 | TODO |
| PRA-17 | Tiếp tục bài luyện còn dở | Tiếp tục bài luyện còn dở | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/PRA-17 | TODO |
| MIX-01 | Chọn cấp độ N1–N5 | Chọn cấp độ N1–N5 | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-01 | TODO |
| MIX-02 | Chọn 2 kỳ thi để trộn | Chọn 2 kỳ thi để trộn | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-02 | TODO |
| MIX-03 | Chọn từ 3 kỳ thi trở lên | Chọn từ 3 kỳ thi trở lên | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-03 | TODO |
| MIX-04 | Chọn tỷ lệ câu lấy từ từng kỳ thi | Chọn tỷ lệ câu lấy từ từng kỳ thi | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-04 | TODO |
| MIX-05 | Trộn riêng từng kỹ năng | Trộn riêng từng kỹ năng | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-05 | TODO |
| MIX-06 | Trộn chi tiết theo từng dạng 問題 | Trộn chi tiết theo từng dạng 問題 | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-06 | TODO |
| MIX-07 | Giữ số lượng câu phù hợp với cấu trúc đề mục tiêu | Giữ số lượng câu phù hợp với cấu trúc đề mục tiêu | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-07 | TODO |
| MIX-08 | Giữ nguyên bài đọc và nhóm câu hỏi liên quan | Giữ nguyên bài đọc và nhóm câu hỏi liên quan | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-08 | TODO |
| MIX-09 | Giữ nguyên nhóm audio, hình ảnh và câu hỏi nghe hiểu | Giữ nguyên nhóm audio, hình ảnh và câu hỏi nghe hiểu | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-09 | TODO |
| MIX-10 | Không lấy trùng câu trong cùng một đề | Không lấy trùng câu trong cùng một đề | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-10 | TODO |
| MIX-11 | Phát hiện câu giống nhau ở nhiều nguồn | Phát hiện câu giống nhau ở nhiều nguồn | APPLICATION | P1 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/MIX-11 | TODO |
| MIX-12 | Cho phép tạo nhiều phiên bản đề | Cho phép tạo nhiều phiên bản đề | APPLICATION | P1 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-12 | TODO |
| MIX-13 | Lưu đề đã tạo | Lưu đề đã tạo | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/MIX-13 | TODO |
| MIX-14 | Làm lại đề trộn trước đó | Làm lại đề trộn trước đó | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/MIX-14 | TODO |
| MIX-15 | Tạo đề trộn mới chỉ bằng một nút | Tạo đề trộn mới chỉ bằng một nút | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/MIX-15 | TODO |
| MIX-16 | Hiển thị thông tin nguồn câu hỏi trong kết quả nếu được phép | Hiển thị thông tin nguồn câu hỏi trong kết quả nếu được phép | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/MIX-16 | TODO |
| MIX-17 | Chia sẻ đề trộn bằng liên kết | Chia sẻ đề trộn bằng liên kết | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/MIX-17 | TODO |
| MIX-18 | Tạo đề theo độ khó mục tiêu | Tạo đề theo độ khó mục tiêu | APPLICATION | P2 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-18 | TODO |
| MIX-19 | Hạn chế câu mà người dùng đã gặp quá nhiều lần | Hạn chế câu mà người dùng đã gặp quá nhiều lần | APPLICATION | P2 | [N01](KE_HOACH_TRIEN_KHAI.md#n01) | W1 | 3 | feature/MIX-19 | TODO |
| SCORE-01 | Tự động chấm bài sau khi nộp | Tự động chấm bài sau khi nộp | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-01 | TODO |
| SCORE-02 | Hiển thị tổng số câu đúng / sai / bỏ trống | Hiển thị tổng số câu đúng / sai / bỏ trống | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-02 | TODO |
| SCORE-03 | Hiển thị tỷ lệ chính xác | Hiển thị tỷ lệ chính xác | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-03 | TODO |
| SCORE-04 | Thống kê kết quả theo từng kỹ năng | Thống kê kết quả theo từng kỹ năng | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-04 | TODO |
| SCORE-05 | Thống kê kết quả theo từng dạng 問題 | Thống kê kết quả theo từng dạng 問題 | APPLICATION | P1 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-05 | TODO |
| SCORE-06 | Hiển thị thời gian làm bài thực tế | Hiển thị thời gian làm bài thực tế | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-06 | TODO |
| SCORE-07 | Xem đáp án đúng từng câu | Xem đáp án đúng từng câu | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/SCORE-07 | TODO |
| SCORE-08 | Xem lại toàn bộ bài đã làm | Xem lại toàn bộ bài đã làm | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/SCORE-08 | TODO |
| SCORE-09 | Lọc riêng câu đúng, sai, bỏ trống | Lọc riêng câu đúng, sai, bỏ trống | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/SCORE-09 | TODO |
| SCORE-10 | So sánh với lần làm trước | So sánh với lần làm trước | APPLICATION | P1 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/SCORE-10 | TODO |
| SCORE-11 | Lưu kết quả vĩnh viễn theo tài khoản | Lưu kết quả vĩnh viễn theo tài khoản | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/SCORE-11 | TODO |
| SCORE-12 | Tạo báo cáo kết quả dạng PDF | Tạo báo cáo kết quả dạng PDF | APPLICATION | P2 | [V01](KE_HOACH_TRIEN_KHAI.md#v01) | W1 | 6 | feature/SCORE-12 | TODO |
| SCORE-13 | Hiển thị mức đạt mục tiêu điểm luyện tập | Hiển thị mức đạt mục tiêu điểm luyện tập | APPLICATION | P1 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SCORE-13 | TODO |
| SCORE-14 | Ước lượng khả năng đạt kỳ thi dựa trên lịch sử làm bài | Ước lượng khả năng đạt kỳ thi dựa trên lịch sử làm bài | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/SCORE-14 | TODO |
| SCORE-15 | Phân tích thời gian trung bình mỗi câu và mỗi phần | Phân tích thời gian trung bình mỗi câu và mỗi phần | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/SCORE-15 | TODO |
| EXPL-01 | Giải thích vì sao đáp án đúng | Giải thích vì sao đáp án đúng | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-01 | TODO |
| EXPL-02 | Giải thích vì sao từng đáp án còn lại sai | Giải thích vì sao từng đáp án còn lại sai | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-02 | TODO |
| EXPL-03 | Dịch nghĩa câu hỏi sang tiếng Việt | Dịch nghĩa câu hỏi sang tiếng Việt | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-03 | TODO |
| EXPL-04 | Hiển thị cách đọc Kanji / Furigana | Hiển thị cách đọc Kanji / Furigana | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-04 | TODO |
| EXPL-05 | Giải thích từ vựng quan trọng trong câu | Giải thích từ vựng quan trọng trong câu | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-05 | TODO |
| EXPL-06 | Phân tích mẫu ngữ pháp xuất hiện | Phân tích mẫu ngữ pháp xuất hiện | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-06 | TODO |
| EXPL-07 | Dịch và phân tích bài đọc | Dịch và phân tích bài đọc | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-07 | TODO |
| EXPL-08 | Hiển thị transcript bài nghe | Hiển thị transcript bài nghe | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-08 | TODO |
| EXPL-09 | Chỉ ra chi tiết trong bài đọc/nghe dẫn đến đáp án | Chỉ ra chi tiết trong bài đọc/nghe dẫn đến đáp án | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-09 | TODO |
| EXPL-10 | Cho phép lưu câu hỏi vào danh sách ôn lại | Cho phép lưu câu hỏi vào danh sách ôn lại | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-10 | TODO |
| EXPL-11 | Hỏi AI giải thích sâu hơn về một câu | Hỏi AI giải thích sâu hơn về một câu | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/EXPL-11 | TODO |
| EXPL-12 | Báo cáo giải thích sai hoặc khó hiểu | Báo cáo giải thích sai hoặc khó hiểu | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-12 | TODO |
| EXPL-13 | Kiểm duyệt và phiên bản hóa nội dung giải thích | Kiểm duyệt và phiên bản hóa nội dung giải thích | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/EXPL-13 | TODO |
| STAT-01 | Lịch sử tất cả lần thi | Lịch sử tất cả lần thi | APPLICATION | P0 | [N03](KE_HOACH_TRIEN_KHAI.md#n03) | W3 | 3 | feature/STAT-01 | TODO |
| STAT-02 | Biểu đồ điểm theo thời gian | Biểu đồ điểm theo thời gian | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-02 | TODO |
| STAT-03 | Độ chính xác từng kỹ năng | Độ chính xác từng kỹ năng | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-03 | TODO |
| STAT-04 | Độ chính xác từng dạng câu | Độ chính xác từng dạng câu | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-04 | TODO |
| STAT-05 | Số câu làm sai nhiều lần | Số câu làm sai nhiều lần | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-05 | TODO |
| STAT-06 | Phân tích lỗi thường gặp | Phân tích lỗi thường gặp | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-06 | TODO |
| STAT-07 | So sánh kết quả theo từng tháng | So sánh kết quả theo từng tháng | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-07 | TODO |
| STAT-08 | Thống kê thời gian ôn tập | Thống kê thời gian ôn tập | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-08 | TODO |
| STAT-09 | So sánh tốc độ và độ chính xác khi làm bài | So sánh tốc độ và độ chính xác khi làm bài | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/STAT-09 | TODO |
| STAT-10 | Theo dõi tiến độ so với mục tiêu | Theo dõi tiến độ so với mục tiêu | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-10 | TODO |
| STAT-11 | Gợi ý kỹ năng nên ưu tiên học tiếp | Gợi ý kỹ năng nên ưu tiên học tiếp | APPLICATION | P1 | [L03](KE_HOACH_TRIEN_KHAI.md#l03) | W3 | 4 | feature/STAT-11 | TODO |
| STAT-12 | Phân tích câu thường đổi đáp án từ đúng sang sai | Phân tích câu thường đổi đáp án từ đúng sang sai | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/STAT-12 | TODO |
| STAT-13 | Thống kê tỷ lệ tiến bộ trên những câu chưa từng gặp | Thống kê tỷ lệ tiến bộ trên những câu chưa từng gặp | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/STAT-13 | TODO |
| STAT-14 | Phân biệt tiến bộ thực và tiến bộ do làm lại câu quen thuộc | Phân biệt tiến bộ thực và tiến bộ do làm lại câu quen thuộc | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/STAT-14 | TODO |
| VOC-01 | Bấm vào từ tiếng Nhật để tra nghĩa khi chữa bài | Bấm vào từ tiếng Nhật để tra nghĩa khi chữa bài | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-01 | TODO |
| VOC-02 | Hiển thị cách đọc Hiragana / Katakana | Hiển thị cách đọc Hiragana / Katakana | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-02 | TODO |
| VOC-03 | Hiển thị nghĩa tiếng Việt | Hiển thị nghĩa tiếng Việt | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-03 | TODO |
| VOC-04 | Hiển thị loại từ | Hiển thị loại từ | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-04 | TODO |
| VOC-05 | Hiển thị câu ví dụ | Hiển thị câu ví dụ | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-05 | TODO |
| VOC-06 | Lưu từ vựng vào sổ tay cá nhân | Lưu từ vựng vào sổ tay cá nhân | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-06 | TODO |
| VOC-07 | Lưu Kanji và thông tin cách đọc | Lưu Kanji và thông tin cách đọc | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-07 | TODO |
| VOC-08 | Lưu mẫu ngữ pháp | Lưu mẫu ngữ pháp | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-08 | TODO |
| VOC-09 | Đánh dấu từ đã thuộc / chưa thuộc | Đánh dấu từ đã thuộc / chưa thuộc | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-09 | TODO |
| VOC-10 | Tạo flashcard tự động | Tạo flashcard tự động | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-10 | TODO |
| VOC-11 | Ôn tập bằng lặp lại ngắt quãng (SRS) | Ôn tập bằng lặp lại ngắt quãng (SRS) | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-11 | TODO |
| VOC-12 | Tìm kiếm trong sổ tay | Tìm kiếm trong sổ tay | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-12 | TODO |
| VOC-13 | Nhóm từ theo chủ đề và cấp độ | Nhóm từ theo chủ đề và cấp độ | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-13 | TODO |
| VOC-14 | Luyện trắc nghiệm từ những từ đã lưu | Luyện trắc nghiệm từ những từ đã lưu | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-14 | TODO |
| VOC-15 | Xuất danh sách từ vựng CSV | Xuất danh sách từ vựng CSV | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-15 | TODO |
| VOC-16 | Phát âm từ vựng | Phát âm từ vựng | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-16 | TODO |
| VOC-17 | Học từ bằng ví dụ lấy từ ngân hàng câu hỏi | Học từ bằng ví dụ lấy từ ngân hàng câu hỏi | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-17 | TODO |
| VOC-18 | Đồng bộ trạng thái học từ giữa các thiết bị | Đồng bộ trạng thái học từ giữa các thiết bị | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/VOC-18 | TODO |
| DATA-01 | Trích xuất từ vựng từ văn bản đề thi | Trích xuất từ vựng từ văn bản đề thi | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-01 | TODO |
| DATA-02 | Chuẩn hóa các biến thể về dạng từ điển | Chuẩn hóa các biến thể về dạng từ điển | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-02 | TODO |
| DATA-03 | Tính tần suất xuất hiện của từng từ | Tính tần suất xuất hiện của từng từ | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-03 | TODO |
| DATA-04 | Thống kê theo N1–N5 | Thống kê theo N1–N5 | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-04 | TODO |
| DATA-05 | Thống kê theo năm và kỳ thi | Thống kê theo năm và kỳ thi | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-05 | TODO |
| DATA-06 | Thống kê theo Kanji, từ vựng, đọc hiểu, nghe hiểu | Thống kê theo Kanji, từ vựng, đọc hiểu, nghe hiểu | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-06 | TODO |
| DATA-07 | Phân biệt từ xuất hiện trong đề và từ được hỏi trực tiếp | Phân biệt từ xuất hiện trong đề và từ được hỏi trực tiếp | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-07 | TODO |
| DATA-08 | Phân biệt từ trong câu hỏi, đáp án và bài đọc | Phân biệt từ trong câu hỏi, đáp án và bài đọc | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-08 | TODO |
| DATA-09 | Xếp hạng từ vựng xuất hiện nhiều nhất | Xếp hạng từ vựng xuất hiện nhiều nhất | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-09 | TODO |
| DATA-10 | Hiển thị số đề khác nhau có chứa từ | Hiển thị số đề khác nhau có chứa từ | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-10 | TODO |
| DATA-11 | Xem các câu hỏi chứa từ đó nếu được phép | Xem các câu hỏi chứa từ đó nếu được phép | APPLICATION | P1 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-11 | TODO |
| DATA-12 | Tra cứu một từ để xem thống kê | Tra cứu một từ để xem thống kê | APPLICATION | P1 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-12 | TODO |
| DATA-13 | So sánh mức xuất hiện giữa các cấp độ | So sánh mức xuất hiện giữa các cấp độ | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-13 | TODO |
| DATA-14 | Thống kê theo khoảng thời gian | Thống kê theo khoảng thời gian | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-14 | TODO |
| DATA-15 | Tạo danh sách từ thường gặp để ôn tập | Tạo danh sách từ thường gặp để ôn tập | APPLICATION | P1 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-15 | TODO |
| DATA-16 | Kết nối từ vựng với sổ tay cá nhân | Kết nối từ vựng với sổ tay cá nhân | APPLICATION | P1 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-16 | TODO |
| DATA-17 | So sánh danh sách từ thường gặp với các từ đã học | So sánh danh sách từ thường gặp với các từ đã học | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-17 | TODO |
| DATA-18 | Xuất báo cáo CSV / Excel | Xuất báo cáo CSV / Excel | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-18 | TODO |
| DATA-19 | Xác định các mẫu ngữ pháp trong câu hỏi | Xác định các mẫu ngữ pháp trong câu hỏi | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-19 | TODO |
| DATA-20 | Thống kê tần suất từng mẫu ngữ pháp | Thống kê tần suất từng mẫu ngữ pháp | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-20 | TODO |
| DATA-21 | Xem những đề từng kiểm tra mẫu ngữ pháp đó | Xem những đề từng kiểm tra mẫu ngữ pháp đó | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-21 | TODO |
| DATA-22 | Thống kê số lần Kanji xuất hiện | Thống kê số lần Kanji xuất hiện | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-22 | TODO |
| DATA-23 | Phân loại Kanji theo cấp độ và nhóm kiến thức | Phân loại Kanji theo cấp độ và nhóm kiến thức | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/DATA-23 | TODO |
| DATA-24 | So sánh xu hướng xuất hiện qua các năm | So sánh xu hướng xuất hiện qua các năm | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-24 | TODO |
| DATA-25 | Liên kết mẫu ngữ pháp với bài luyện tương ứng | Liên kết mẫu ngữ pháp với bài luyện tương ứng | APPLICATION | P1 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-25 | TODO |
| DATA-26 | Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo | Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/DATA-26 | TODO |
| PLAN-01 | Chọn kỳ thi mục tiêu | Chọn kỳ thi mục tiêu | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-01 | TODO |
| PLAN-02 | Đếm ngược đến ngày thi | Đếm ngược đến ngày thi | APPLICATION | P1 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-02 | TODO |
| PLAN-03 | Chọn thời gian học mỗi ngày | Chọn thời gian học mỗi ngày | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-03 | TODO |
| PLAN-04 | Tạo lộ trình 30 / 60 / 90 ngày | Tạo lộ trình 30 / 60 / 90 ngày | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-04 | TODO |
| PLAN-05 | Lập lịch làm đề định kỳ | Lập lịch làm đề định kỳ | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-05 | TODO |
| PLAN-06 | Phân bổ thời gian theo kỹ năng yếu | Phân bổ thời gian theo kỹ năng yếu | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-06 | TODO |
| PLAN-07 | Đề xuất bài học và đề thi hôm nay | Đề xuất bài học và đề thi hôm nay | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-07 | TODO |
| PLAN-08 | Theo dõi tỷ lệ hoàn thành kế hoạch | Theo dõi tỷ lệ hoàn thành kế hoạch | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-08 | TODO |
| PLAN-09 | Nhắc học hoặc làm đề | Nhắc học hoặc làm đề | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-09 | TODO |
| PLAN-10 | Tự điều chỉnh kế hoạch khi bỏ lỡ buổi học | Tự điều chỉnh kế hoạch khi bỏ lỡ buổi học | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-10 | TODO |
| PLAN-11 | Giai đoạn tổng ôn trước ngày thi | Giai đoạn tổng ôn trước ngày thi | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-11 | TODO |
| PLAN-12 | Đánh giá mức sẵn sàng trước kỳ thi | Đánh giá mức sẵn sàng trước kỳ thi | APPLICATION | P2 | [L05](KE_HOACH_TRIEN_KHAI.md#l05) | W5 | 4 | feature/PLAN-12 | TODO |
| AI-01 | Giải thích câu hỏi bằng tiếng Việt | Giải thích câu hỏi bằng tiếng Việt | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-01 | TODO |
| AI-02 | Phân tích ngữ pháp trong câu | Phân tích ngữ pháp trong câu | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-02 | TODO |
| AI-03 | So sánh các đáp án tương tự nhau | So sánh các đáp án tương tự nhau | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-03 | TODO |
| AI-04 | Giải thích bài đọc theo từng đoạn | Giải thích bài đọc theo từng đoạn | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-04 | TODO |
| AI-05 | Phân tích transcript bài nghe | Phân tích transcript bài nghe | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-05 | TODO |
| AI-06 | Đặt câu hỏi trực tiếp về nội dung đang học | Đặt câu hỏi trực tiếp về nội dung đang học | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-06 | TODO |
| AI-07 | Đề xuất cách ghi nhớ từ vựng | Đề xuất cách ghi nhớ từ vựng | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-07 | TODO |
| AI-08 | Tạo ví dụ mới cho mẫu ngữ pháp | Tạo ví dụ mới cho mẫu ngữ pháp | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-08 | TODO |
| AI-09 | Sinh câu luyện mới từ kiến thức đã học | Sinh câu luyện mới từ kiến thức đã học | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-09 | TODO |
| AI-10 | Phát hiện dạng lỗi học viên lặp lại | Phát hiện dạng lỗi học viên lặp lại | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-10 | TODO |
| AI-11 | Đề xuất bài luyện phù hợp với năng lực | Đề xuất bài luyện phù hợp với năng lực | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-11 | TODO |
| AI-12 | Tóm tắt kết quả học tập mỗi tuần | Tóm tắt kết quả học tập mỗi tuần | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-12 | TODO |
| AI-13 | Sinh bộ flashcard từ câu làm sai | Sinh bộ flashcard từ câu làm sai | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-13 | TODO |
| AI-14 | Giới hạn và kiểm duyệt nội dung AI tạo ra | Giới hạn và kiểm duyệt nội dung AI tạo ra | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/AI-14 | TODO |
| PDF-01 | Upload một file PDF đề thi | Nhập một gói dữ liệu chuẩn; PDF gốc tùy chọn để đối chiếu | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-01 | TODO |
| PDF-02 | Upload nhiều PDF cùng lúc | Nhập nhiều gói dữ liệu chuẩn theo lô | APPLICATION | P1 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-02 | TODO |
| PDF-03 | Upload file đáp án | Nhận đáp án trong correctOption của JSON, không đọc file đáp án | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-03 | TODO |
| PDF-04 | Upload audio nghe hiểu | Nhận audio và timeline đã được chuẩn bị trong gói nhập | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-04 | TODO |
| PDF-05 | Khai báo N1–N5, năm, kỳ thi, nguồn | Khai báo N1–N5, năm, kỳ thi, nguồn | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-05 | TODO |
| PDF-06 | Tự nhận diện PDF dạng text hoặc PDF scan | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-06 | EXTERNAL_INPUT_REQUIRED |
| PDF-07 | Trích xuất text tiếng Nhật | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-07 | EXTERNAL_INPUT_REQUIRED |
| PDF-08 | OCR hình ảnh trong PDF scan | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-08 | EXTERNAL_INPUT_REQUIRED |
| PDF-09 | Nhận diện Kanji, Kana, Furigana | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-09 | EXTERNAL_INPUT_REQUIRED |
| PDF-10 | Nhận diện câu hỏi và số thứ tự | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-10 | EXTERNAL_INPUT_REQUIRED |
| PDF-11 | Nhận diện đáp án trắc nghiệm | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-11 | EXTERNAL_INPUT_REQUIRED |
| PDF-12 | Nhận diện tiêu đề 問題 và các nhóm câu | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-12 | EXTERNAL_INPUT_REQUIRED |
| PDF-13 | Nhận diện đoạn văn đọc hiểu | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-13 | EXTERNAL_INPUT_REQUIRED |
| PDF-14 | Nhận diện hình ảnh và bảng biểu trong đề | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-14 | EXTERNAL_INPUT_REQUIRED |
| PDF-15 | Nhận diện câu sắp xếp có ký hiệu ★ | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-15 | EXTERNAL_INPUT_REQUIRED |
| PDF-16 | Liên kết đáp án từ file đáp án | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P0 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-16 | EXTERNAL_INPUT_REQUIRED |
| PDF-17 | Liên kết câu hỏi với audio | Kiểm tra liên kết nhóm câu với audio và timeline do agent cung cấp | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-17 | TODO |
| PDF-18 | Cho AI đề xuất phân loại câu hỏi | Chủ dự án tự chuẩn bị dữ liệu bên ngoài theo import v2; không xây chức năng này | EXTERNAL_PREPARATION | P1 | [F06](KE_HOACH_TRIEN_KHAI.md#f06) | W5 | 1 | data-preparation/PDF-18 | EXTERNAL_INPUT_REQUIRED |
| PDF-19 | Hiển thị PDF gốc bên cạnh dữ liệu trích xuất | Đối chiếu JSON với PDF nguồn tùy chọn, không trích xuất | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-19 | TODO |
| PDF-20 | Cho phép biên tập viên sửa nội dung | Cho phép biên tập viên sửa nội dung | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-20 | TODO |
| PDF-21 | Đánh dấu câu có độ tin cậy OCR thấp | Hiển thị vấn đề chưa xác minh do agent ghi trong issues | APPLICATION | P1 | [C05](KE_HOACH_TRIEN_KHAI.md#c05) | W5 | 2 | feature/PDF-21 | TODO |
| PDF-22 | Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu | Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu | APPLICATION | P0 | [C05](KE_HOACH_TRIEN_KHAI.md#c05) | W5 | 2 | feature/PDF-22 | TODO |
| PDF-23 | Kiểm tra tổng số câu theo cấu trúc đề | Kiểm tra tổng số câu theo cấu trúc đề | APPLICATION | P0 | [C05](KE_HOACH_TRIEN_KHAI.md#c05) | W5 | 2 | feature/PDF-23 | TODO |
| PDF-24 | Xem trước đề trên giao diện làm bài | Xem trước đề trên giao diện làm bài | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-24 | TODO |
| PDF-25 | Duyệt dữ liệu trước khi xuất bản | Duyệt dữ liệu trước khi xuất bản | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-25 | TODO |
| PDF-26 | Lưu file PDF gốc và liên kết nguồn đến từng câu | Lưu file PDF gốc và liên kết nguồn đến từng câu | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-26 | TODO |
| PDF-27 | Nhập lại file mà không tạo trùng dữ liệu | Nhập lại file mà không tạo trùng dữ liệu | APPLICATION | P1 | [C05](KE_HOACH_TRIEN_KHAI.md#c05) | W5 | 2 | feature/PDF-27 | TODO |
| PDF-28 | Theo dõi trạng thái và lỗi xử lý | Theo dõi trạng thái và lỗi xử lý | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-28 | TODO |
| PDF-29 | Quản lý phiên bản khi sửa nội dung đề | Quản lý phiên bản khi sửa nội dung đề | APPLICATION | P1 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-29 | TODO |
| PDF-30 | Import và export ngân hàng câu hỏi dạng JSON/CSV | Import và export ngân hàng câu hỏi dạng JSON/CSV | APPLICATION | P1 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/PDF-30 | TODO |
| QB-01 | Lưu từng câu hỏi có mã định danh riêng | Lưu từng câu hỏi có mã định danh riêng | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-01 | TODO |
| QB-02 | Liên kết câu với cấp độ, năm, kỳ thi | Liên kết câu với cấp độ, năm, kỳ thi | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-02 | TODO |
| QB-03 | Phân loại kỹ năng và dạng 問題 | Phân loại kỹ năng và dạng 問題 | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-03 | TODO |
| QB-04 | Lưu nội dung và các phương án trả lời | Lưu nội dung và các phương án trả lời | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-04 | TODO |
| QB-05 | Lưu đáp án đúng | Lưu đáp án đúng | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-05 | TODO |
| QB-06 | Lưu bài đọc và nhóm câu hỏi liên quan | Lưu bài đọc và nhóm câu hỏi liên quan | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-06 | TODO |
| QB-07 | Lưu audio, hình ảnh liên quan | Lưu audio, hình ảnh liên quan | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-07 | TODO |
| QB-08 | Lưu giải thích, bản dịch, transcript | Lưu giải thích, bản dịch, transcript | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/QB-08 | TODO |
| QB-09 | Gắn từ vựng, Kanji, mẫu ngữ pháp | Gắn từ vựng, Kanji, mẫu ngữ pháp | APPLICATION | P1 | [N05](KE_HOACH_TRIEN_KHAI.md#n05) | W5 | 3 | feature/QB-09 | TODO |
| QB-10 | Gắn nhãn độ khó | Gắn nhãn độ khó | APPLICATION | P1 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/QB-10 | TODO |
| QB-11 | Tìm kiếm, lọc, sửa câu hỏi | Tìm kiếm, lọc, sửa câu hỏi | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-11 | TODO |
| QB-12 | Phát hiện câu hỏi trùng hoặc gần trùng | Phát hiện câu hỏi trùng hoặc gần trùng | APPLICATION | P1 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/QB-12 | TODO |
| QB-13 | Tạm ẩn câu lỗi, câu chưa kiểm duyệt | Tạm ẩn câu lỗi, câu chưa kiểm duyệt | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-13 | TODO |
| QB-14 | Ghi lịch sử chỉnh sửa và người chỉnh sửa | Ghi lịch sử chỉnh sửa và người chỉnh sửa | APPLICATION | P1 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-14 | TODO |
| QB-15 | Lưu phiên bản nội dung, đáp án | Lưu phiên bản nội dung, đáp án | APPLICATION | P1 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-15 | TODO |
| QB-16 | Quản lý trạng thái quyền sử dụng nội dung | Quản lý trạng thái quyền sử dụng nội dung | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-16 | TODO |
| QB-17 | Ghi nhận nguồn gốc của từng câu hỏi | Ghi nhận nguồn gốc của từng câu hỏi | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/QB-17 | TODO |
| QB-18 | Theo dõi câu từng xuất hiện trong các đề trộn nào | Theo dõi câu từng xuất hiện trong các đề trộn nào | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/QB-18 | TODO |
| QB-19 | Thống kê độ khó thực tế từ lịch sử làm bài | Thống kê độ khó thực tế từ lịch sử làm bài | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/QB-19 | TODO |
| QB-20 | Kiểm định chất lượng câu hỏi dựa trên tỷ lệ chọn đáp án | Kiểm định chất lượng câu hỏi dựa trên tỷ lệ chọn đáp án | APPLICATION | P2 | [L01](KE_HOACH_TRIEN_KHAI.md#l01) | W1 | 4 | feature/QB-20 | TODO |
| ADM-01 | Dashboard tổng quan hệ thống | Dashboard tổng quan hệ thống | APPLICATION | P0 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-01 | TODO |
| ADM-02 | Quản lý người dùng | Quản lý người dùng | APPLICATION | P0 | [C04](KE_HOACH_TRIEN_KHAI.md#c04) | W4 | 2 | feature/ADM-02 | TODO |
| ADM-03 | Phân quyền Admin / Biên tập viên / Người duyệt | Phân quyền Admin / Biên tập viên / Người duyệt | APPLICATION | P0 | [C04](KE_HOACH_TRIEN_KHAI.md#c04) | W4 | 2 | feature/ADM-03 | TODO |
| ADM-04 | Quản lý bộ đề thi | Quản lý bộ đề thi | APPLICATION | P0 | [C04](KE_HOACH_TRIEN_KHAI.md#c04) | W4 | 2 | feature/ADM-04 | TODO |
| ADM-05 | Quản lý câu hỏi và đáp án | Quản lý câu hỏi và đáp án | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/ADM-05 | TODO |
| ADM-06 | Quản lý file PDF, hình ảnh, audio | Quản lý file PDF, hình ảnh, audio | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/ADM-06 | TODO |
| ADM-07 | Duyệt và xuất bản đề | Duyệt và xuất bản đề | APPLICATION | P0 | [N04](KE_HOACH_TRIEN_KHAI.md#n04) | W4 | 3 | feature/ADM-07 | TODO |
| ADM-08 | Quản lý cấu trúc và thời gian thi theo cấp độ | Quản lý cấu trúc và thời gian thi theo cấp độ | APPLICATION | P0 | [C04](KE_HOACH_TRIEN_KHAI.md#c04) | W4 | 2 | feature/ADM-08 | TODO |
| ADM-09 | Quản lý báo lỗi câu hỏi từ người dùng | Quản lý báo lỗi câu hỏi từ người dùng | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-09 | TODO |
| ADM-10 | Quản lý nội dung giải thích và bản dịch | Quản lý nội dung giải thích và bản dịch | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-10 | TODO |
| ADM-11 | Quản lý các đề trộn đã tạo | Quản lý các đề trộn đã tạo | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-11 | TODO |
| ADM-12 | Quản lý từ vựng và mẫu ngữ pháp | Quản lý từ vựng và mẫu ngữ pháp | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-12 | TODO |
| ADM-13 | Quản lý bài viết và nội dung trang chủ | Quản lý bài viết và nội dung trang chủ | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-13 | TODO |
| ADM-14 | Xem lịch sử thao tác quản trị | Xem lịch sử thao tác quản trị | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/ADM-14 | TODO |
| ADM-15 | Quản lý gói thành viên | Quản lý gói thành viên | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/ADM-15 | TODO |
| ADM-16 | Quản lý thanh toán | Quản lý thanh toán | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/ADM-16 | TODO |
| ADM-17 | Xem báo cáo sử dụng hệ thống | Xem báo cáo sử dụng hệ thống | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-17 | TODO |
| ADM-18 | Cấu hình thông báo và email | Cấu hình thông báo và email | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/ADM-18 | TODO |
| ADM-19 | Quản lý quyền sử dụng và yêu cầu gỡ nội dung | Quản lý quyền sử dụng và yêu cầu gỡ nội dung | APPLICATION | P0 | [C02](KE_HOACH_TRIEN_KHAI.md#c02) | W2 | 2 | feature/ADM-19 | TODO |
| ADM-20 | Sao lưu, phục hồi và xuất dữ liệu quản trị | Sao lưu, phục hồi và xuất dữ liệu quản trị | APPLICATION | P0 | [C06](KE_HOACH_TRIEN_KHAI.md#c06) | W6 | 2 | feature/ADM-20 | TODO |
| TEA-01 | Đăng ký tài khoản giáo viên | Đăng ký tài khoản giáo viên | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-01 | TODO |
| TEA-02 | Tạo lớp học | Tạo lớp học | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-02 | TODO |
| TEA-03 | Mời học viên bằng mã lớp/link | Mời học viên bằng mã lớp/link | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-03 | TODO |
| TEA-04 | Giao một đề có sẵn cho cả lớp | Giao một đề có sẵn cho cả lớp | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-04 | TODO |
| TEA-05 | Tạo đề trộn riêng cho lớp | Tạo đề trộn riêng cho lớp | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-05 | TODO |
| TEA-06 | Đặt thời hạn hoàn thành bài | Đặt thời hạn hoàn thành bài | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-06 | TODO |
| TEA-07 | Xem học viên nào đã nộp bài | Xem học viên nào đã nộp bài | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-07 | TODO |
| TEA-08 | Xem điểm và phân tích kết quả từng học viên | Xem điểm và phân tích kết quả từng học viên | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-08 | TODO |
| TEA-09 | Thống kê lỗi chung của cả lớp | Thống kê lỗi chung của cả lớp | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-09 | TODO |
| TEA-10 | Giao bài bổ sung cho nhóm học viên yếu | Giao bài bổ sung cho nhóm học viên yếu | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-10 | TODO |
| TEA-11 | Xuất bảng điểm lớp | Xuất bảng điểm lớp | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-11 | TODO |
| TEA-12 | Quản lý nhiều lớp/trung tâm | Quản lý nhiều lớp/trung tâm | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-12 | TODO |
| TEA-13 | Quản lý quyền truy cập dữ liệu học viên | Quản lý quyền truy cập dữ liệu học viên | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/TEA-13 | TODO |
| GAME-01 | Ghi nhận chuỗi ngày học liên tục (streak) | Ghi nhận chuỗi ngày học liên tục (streak) | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-01 | TODO |
| GAME-02 | Huy hiệu hoàn thành đề | Huy hiệu hoàn thành đề | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-02 | TODO |
| GAME-03 | Huy hiệu hoàn thành mục tiêu tuần | Huy hiệu hoàn thành mục tiêu tuần | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-03 | TODO |
| GAME-04 | Bảng xếp hạng tự nguyện | Bảng xếp hạng tự nguyện | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-04 | TODO |
| GAME-05 | Thử thách ôn tập 7 / 30 / 60 ngày | Thử thách ôn tập 7 / 30 / 60 ngày | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-05 | TODO |
| GAME-06 | Tổ chức kỳ thi thử đồng loạt | Tổ chức kỳ thi thử đồng loạt | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/GAME-06 | TODO |
| GAME-07 | Chia sẻ thành tích cá nhân | Chia sẻ thành tích cá nhân | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/GAME-07 | TODO |
| GAME-08 | Thảo luận về câu hỏi sau khi hoàn thành bài | Thảo luận về câu hỏi sau khi hoàn thành bài | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/GAME-08 | TODO |
| GAME-09 | Bình luận và báo cáo nội dung không phù hợp | Bình luận và báo cáo nội dung không phù hợp | APPLICATION | P2 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/GAME-09 | TODO |
| GAME-10 | Thống kê thành tích theo nhóm/lớp | Thống kê thành tích theo nhóm/lớp | APPLICATION | P2 | [A05](KE_HOACH_TRIEN_KHAI.md#a05) | W5 | 5 | feature/GAME-10 | TODO |
| PAY-01 | Gói tài khoản miễn phí | Gói tài khoản miễn phí | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-01 | TODO |
| PAY-02 | Gói Premium tháng / quý / năm | Gói Premium tháng / quý / năm | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-02 | TODO |
| PAY-03 | Giới hạn tính năng theo gói | Giới hạn tính năng theo gói | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-03 | TODO |
| PAY-04 | Thanh toán qua phương thức phù hợp thị trường | Thanh toán qua phương thức phù hợp thị trường | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-04 | TODO |
| PAY-05 | Quản lý trạng thái đăng ký | Quản lý trạng thái đăng ký | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-05 | TODO |
| PAY-06 | Lịch sử giao dịch | Lịch sử giao dịch | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-06 | TODO |
| PAY-07 | Mã giảm giá | Mã giảm giá | APPLICATION | P2 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-07 | TODO |
| PAY-08 | Quản lý hoàn tiền, hủy gói | Quản lý hoàn tiền, hủy gói | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-08 | TODO |
| PAY-09 | Nâng cấp hoặc gia hạn gói | Nâng cấp hoặc gia hạn gói | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-09 | TODO |
| PAY-10 | Gói giáo viên/trung tâm | Gói giáo viên/trung tâm | APPLICATION | P2 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-10 | TODO |
| PAY-11 | Giới hạn lượt sử dụng AI theo gói | Giới hạn lượt sử dụng AI theo gói | APPLICATION | P2 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-11 | TODO |
| PAY-12 | Báo cáo doanh thu | Báo cáo doanh thu | APPLICATION | P1 | [L04](KE_HOACH_TRIEN_KHAI.md#l04) | W4 | 4 | feature/PAY-12 | TODO |
| NOTI-01 | Email xác minh tài khoản | Email xác minh tài khoản | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/NOTI-01 | TODO |
| NOTI-02 | Email đặt lại mật khẩu | Email đặt lại mật khẩu | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/NOTI-02 | TODO |
| NOTI-03 | Nhắc tiếp tục bài luyện dang dở | Nhắc tiếp tục bài luyện dang dở | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-03 | TODO |
| NOTI-04 | Thông báo có đề mới | Thông báo có đề mới | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-04 | TODO |
| NOTI-05 | Nhắc ôn các từ đến hạn SRS | Nhắc ôn các từ đến hạn SRS | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-05 | TODO |
| NOTI-06 | Thống kê kết quả tuần | Thống kê kết quả tuần | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-06 | TODO |
| NOTI-07 | Nhắc lịch thi mục tiêu | Nhắc lịch thi mục tiêu | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-07 | TODO |
| NOTI-08 | Thông báo kết quả thi thử đồng loạt | Thông báo kết quả thi thử đồng loạt | APPLICATION | P2 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-08 | TODO |
| NOTI-09 | Thông báo tình trạng thanh toán | Thông báo tình trạng thanh toán | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-09 | TODO |
| NOTI-10 | Cho phép bật/tắt từng loại thông báo | Cho phép bật/tắt từng loại thông báo | APPLICATION | P1 | [L02](KE_HOACH_TRIEN_KHAI.md#l02) | W2 | 4 | feature/NOTI-10 | TODO |
| SEO-01 | Trang giới thiệu cho từng cấp độ N1–N5 | Trang giới thiệu cho từng cấp độ N1–N5 | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-01 | TODO |
| SEO-02 | Trang danh sách đề theo năm và kỳ | Trang danh sách đề theo năm và kỳ | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-02 | TODO |
| SEO-03 | Trang giới thiệu từ vựng và mẫu ngữ pháp | Trang giới thiệu từ vựng và mẫu ngữ pháp | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-03 | TODO |
| SEO-04 | Trang thống kê từ thường gặp | Trang thống kê từ thường gặp | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-04 | TODO |
| SEO-05 | Blog hướng dẫn thi JLPT | Blog hướng dẫn thi JLPT | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/SEO-05 | TODO |
| SEO-06 | Sitemap và metadata SEO | Sitemap và metadata SEO | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-06 | TODO |
| SEO-07 | Structured data cho các trang phù hợp | Structured data cho các trang phù hợp | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-07 | TODO |
| SEO-08 | Open Graph khi chia sẻ link | Open Graph khi chia sẻ link | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-08 | TODO |
| SEO-09 | Trang giới thiệu gói thành viên | Trang giới thiệu gói thành viên | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/SEO-09 | TODO |
| SEO-10 | Trang liên hệ, hỗ trợ, FAQ | Trang liên hệ, hỗ trợ, FAQ | APPLICATION | P0 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-10 | TODO |
| SEO-11 | Công cụ đo lường nguồn truy cập | Công cụ đo lường nguồn truy cập | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SEO-11 | TODO |
| SEO-12 | Trang đích cho chiến dịch ôn thi 60 ngày | Trang đích cho chiến dịch ôn thi 60 ngày | APPLICATION | P2 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/SEO-12 | TODO |
| SYS-01 | Giao diện responsive trên điện thoại, tablet, desktop | Giao diện responsive trên điện thoại, tablet, desktop | APPLICATION | P0 | [F04](KE_HOACH_TRIEN_KHAI.md#f04) | W3 | 1 | feature/SYS-01 | TODO |
| SYS-02 | Tải trang nhanh, tối ưu ảnh/audio | Tải trang nhanh, tối ưu ảnh/audio | APPLICATION | P0 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SYS-02 | TODO |
| SYS-03 | Tự động lưu đáp án an toàn | Tự động lưu đáp án an toàn | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-03 | TODO |
| SYS-04 | Đồng hồ thi đồng bộ với thời gian máy chủ | Đồng hồ thi đồng bộ với thời gian máy chủ | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SYS-04 | TODO |
| SYS-05 | Khôi phục phiên thi sau mất kết nối theo chính sách | Khôi phục phiên thi sau mất kết nối theo chính sách | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-05 | TODO |
| SYS-06 | Bảo vệ dữ liệu người dùng và mã hóa kết nối | Bảo vệ dữ liệu người dùng và mã hóa kết nối | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/SYS-06 | TODO |
| SYS-07 | Phân quyền truy cập API và tài nguyên | Phân quyền truy cập API và tài nguyên | APPLICATION | P0 | [F03](KE_HOACH_TRIEN_KHAI.md#f03) | W2 | 1 | feature/SYS-07 | TODO |
| SYS-08 | Sao lưu database định kỳ | Sao lưu database định kỳ | APPLICATION | P0 | [C06](KE_HOACH_TRIEN_KHAI.md#c06) | W6 | 2 | feature/SYS-08 | TODO |
| SYS-09 | Theo dõi lỗi hệ thống và cảnh báo | Theo dõi lỗi hệ thống và cảnh báo | APPLICATION | P0 | [C06](KE_HOACH_TRIEN_KHAI.md#c06) | W6 | 2 | feature/SYS-09 | TODO |
| SYS-10 | Kiểm tra tải khi nhiều thí sinh làm bài cùng lúc | Kiểm tra tải khi nhiều thí sinh làm bài cùng lúc | APPLICATION | P0 | [V06](KE_HOACH_TRIEN_KHAI.md#v06) | W6 | 6 | feature/SYS-10 | TODO |
| SYS-11 | CDN cho hình ảnh, audio và nội dung tĩnh | CDN cho hình ảnh, audio và nội dung tĩnh | APPLICATION | P1 | [C06](KE_HOACH_TRIEN_KHAI.md#c06) | W6 | 2 | feature/SYS-11 | TODO |
| SYS-12 | Chống spam, giới hạn truy cập API | Chống spam, giới hạn truy cập API | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-12 | TODO |
| SYS-13 | Quản lý cookie và chính sách quyền riêng tư | Quản lý cookie và chính sách quyền riêng tư | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-13 | TODO |
| SYS-14 | Thiết kế hỗ trợ người dùng có nhu cầu trợ năng | Thiết kế hỗ trợ người dùng có nhu cầu trợ năng | APPLICATION | P1 | [F04](KE_HOACH_TRIEN_KHAI.md#f04) | W3 | 1 | feature/SYS-14 | TODO |
| SYS-15 | Quy trình triển khai, rollback, môi trường thử nghiệm | Quy trình triển khai, rollback, môi trường thử nghiệm | APPLICATION | P0 | [C06](KE_HOACH_TRIEN_KHAI.md#c06) | W6 | 2 | feature/SYS-15 | TODO |
| SYS-16 | Kiểm thử tự động cho chấm điểm, timer và đề trộn | Kiểm thử tự động cho chấm điểm, timer và đề trộn | APPLICATION | P0 | [C01](KE_HOACH_TRIEN_KHAI.md#c01) | W1 | 2 | feature/SYS-16 | TODO |
| SYS-17 | Giám sát truy cập và bảo vệ dữ liệu trả phí | Giám sát truy cập và bảo vệ dữ liệu trả phí | APPLICATION | P1 | [V03](KE_HOACH_TRIEN_KHAI.md#v03) | W3 | 6 | feature/SYS-17 | TODO |
| SYS-18 | Lưu sự kiện làm bài phục vụ phục hồi và kiểm tra lỗi | Lưu sự kiện làm bài phục vụ phục hồi và kiểm tra lỗi | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-18 | TODO |
| SYS-19 | Quản lý thời hạn lưu trữ và xóa dữ liệu | Quản lý thời hạn lưu trữ và xóa dữ liệu | APPLICATION | P1 | [A02](KE_HOACH_TRIEN_KHAI.md#a02) | W2 | 5 | feature/SYS-19 | TODO |
| SYS-20 | Quy trình xử lý lỗi hoặc sự cố nội dung/audio trong khi thi | Quy trình xử lý lỗi hoặc sự cố nội dung/audio trong khi thi | APPLICATION | P0 | [N02](KE_HOACH_TRIEN_KHAI.md#n02) | W2 | 3 | feature/SYS-20 | TODO |
| REPORT-01 | Số người dùng mới theo ngày/tháng | Số người dùng mới theo ngày/tháng | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-01 | TODO |
| REPORT-02 | Số người dùng hoạt động hàng ngày/hàng tháng | Số người dùng hoạt động hàng ngày/hàng tháng | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-02 | TODO |
| REPORT-03 | Số lượt bắt đầu và hoàn thành bài thi | Số lượt bắt đầu và hoàn thành bài thi | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-03 | TODO |
| REPORT-04 | Tỷ lệ bỏ dở bài thi | Tỷ lệ bỏ dở bài thi | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-04 | TODO |
| REPORT-05 | Thống kê cấp độ được luyện nhiều nhất | Thống kê cấp độ được luyện nhiều nhất | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-05 | TODO |
| REPORT-06 | Thống kê bộ đề phổ biến | Thống kê bộ đề phổ biến | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-06 | TODO |
| REPORT-07 | Thời gian sử dụng trung bình | Thời gian sử dụng trung bình | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-07 | TODO |
| REPORT-08 | Tỷ lệ quay lại sau 7/30 ngày | Tỷ lệ quay lại sau 7/30 ngày | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-08 | TODO |
| REPORT-09 | Phân tích phễu đăng ký và bắt đầu làm đề | Phân tích phễu đăng ký và bắt đầu làm đề | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-09 | TODO |
| REPORT-10 | Thống kê kết quả kiểm duyệt PDF | Thống kê kết quả duyệt gói dữ liệu nhập | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-10 | TODO |
| REPORT-11 | Thống kê lỗi OCR, lỗi câu hỏi và lỗi audio | Thống kê lỗi dữ liệu nhập, câu hỏi và audio; không có chỉ số nhận dạng PDF | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-11 | TODO |
| REPORT-12 | Thống kê lượt sử dụng tính năng trộn đề | Thống kê lượt sử dụng tính năng trộn đề | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-12 | TODO |
| REPORT-13 | Báo cáo chuyển đổi Free → Premium | Báo cáo chuyển đổi Free → Premium | APPLICATION | P1 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-13 | TODO |
| REPORT-14 | Báo cáo chi phí AI và lưu trữ | Báo cáo chi phí AI và lưu trữ | APPLICATION | P2 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-14 | TODO |
| REPORT-15 | Theo dõi hiệu quả các thử nghiệm cải tiến giao diện | Theo dõi hiệu quả các thử nghiệm cải tiến giao diện | APPLICATION | P2 | [A04](KE_HOACH_TRIEN_KHAI.md#a04) | W4 | 5 | feature/REPORT-15 | TODO |
