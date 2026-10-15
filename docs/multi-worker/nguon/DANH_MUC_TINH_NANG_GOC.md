# Danh mục tính năng trích từ tài liệu gốc

Nguồn: Bao_cao_day_du_tinh_nang_JLPT_Online.docx. Bản trích văn bản để tra cứu; mã và nội dung giữ theo nguồn.

Danh sách đầy đủ tính năng dự án Website Luyện thi JLPT Online

JLPT Practice Platform — Nền tảng luyện thi JLPT từ N5 đến N1, có khả năng chuyển PDF thành đề thi online, trộn đề nhiều năm, phân tích dữ liệu đề thi và cá nhân hóa quá trình ôn tập.

Bản Feature List / Product Backlog: tài liệu đầu vào để thiết kế UI/UX, database và chia công việc cho đội phát triển.

I. Tổng quan hệ thống

Dự án gồm 4 nhóm người dùng:

| Vai trò | Chức năng chính |
| Khách chưa đăng nhập | Xem danh sách đề, làm thử một số bài, khám phá tính năng |
| Học viên | Thi thử, luyện tập, xem kết quả, học từ vựng, theo dõi tiến độ |
| Giáo viên / Trung tâm | Giao bài, quản lý lớp, theo dõi kết quả học viên |
| Quản trị viên / Biên tập viên | Nhập PDF, quản lý ngân hàng câu hỏi, tạo đề, quản lý website |

Các tính năng được phân thành 3 mức ưu tiên:

P0 — MVP: Bắt buộc cho phiên bản đầu tiên.

P1 — Growth: Nên phát triển sau khi hệ thống thi thử hoạt động ổn định.

P2 — Advanced: Tính năng mở rộng, nâng cao lợi thế cạnh tranh.

II. Danh mục các phân hệ

| STT | Phân hệ | Ưu tiên |
| 01 | Tài khoản và hồ sơ học viên | P0 |
| 02 | Thư viện đề thi JLPT | P0 |
| 03 | Phòng thi thử mô phỏng JLPT | P0 |
| 04 | Luyện tập theo kỹ năng, dạng câu hỏi | P1 |
| 05 | Trộn đề thi từ nhiều năm | P1 |
| 06 | Chấm điểm và xem kết quả | P0 |
| 07 | Chữa bài và giải thích đáp án | P1 |
| 08 | Lịch sử làm bài và phân tích năng lực | P0–P1 |
| 09 | Sổ tay từ vựng, Kanji, ngữ pháp | P1 |
| 10 | Thống kê dữ liệu từ vựng JLPT | P1 |
| 11 | Lộ trình ôn thi cá nhân hóa | P2 |
| 12 | AI hỗ trợ học và luyện thi | P2 |
| 13 | Hệ thống nhập PDF và OCR | P0 |
| 14 | Ngân hàng câu hỏi và quản lý đề | P0 |
| 15 | Quản trị website (Admin CMS) | P0 |
| 16 | Giáo viên, lớp học, trung tâm | P2 |
| 17 | Gamification và cộng đồng | P2 |
| 18 | Gói thành viên và thanh toán | P1 |
| 19 | Thông báo và chăm sóc người dùng | P1 |
| 20 | SEO, nội dung và phát triển người dùng | P1 |
| 21 | Bảo mật, hiệu năng, hạ tầng | P0 |
| 22 | Báo cáo vận hành và phân tích sản phẩm | P1 |

III. Danh sách tính năng chi tiết

01. Tài khoản và hồ sơ học viên

USER ACCOUNT & PROFILE

| Mã | Tính năng | Ưu tiên |
| ACC-01 | Đăng ký tài khoản bằng email | P0 |
| ACC-02 | Đăng nhập, đăng xuất | P0 |
| ACC-03 | Đăng nhập bằng Google | P1 |
| ACC-04 | Quên mật khẩu, đặt lại mật khẩu | P0 |
| ACC-05 | Xác minh email | P0 |
| ACC-06 | Chỉnh sửa tên, ảnh đại diện, thông tin cá nhân | P1 |
| ACC-07 | Chọn cấp độ JLPT đang ôn: N1–N5 | P0 |
| ACC-08 | Đặt mục tiêu kỳ thi tháng 7 hoặc tháng 12 | P1 |
| ACC-09 | Đặt mục tiêu điểm số | P1 |
| ACC-10 | Xem tổng số đề đã hoàn thành | P0 |
| ACC-11 | Xem thời gian đã dành cho việc ôn tập | P1 |
| ACC-12 | Quản lý thiết bị và phiên đăng nhập | P1 |
| ACC-13 | Xuất dữ liệu cá nhân và yêu cầu xóa tài khoản | P1 |
| ACC-14 | Thiết lập ngôn ngữ giao diện Việt / Nhật / Anh | P2 |

Ý tưởng bổ sung: Người dùng không cần tài khoản vẫn có thể làm thử một phần đề. Khi muốn lưu lịch sử, hệ thống mới yêu cầu đăng nhập.

02. Thư viện đề thi JLPT

EXAM LIBRARY

Đây là màn hình quan trọng nhất để người dùng tìm và bắt đầu làm bài.

| HÌNH THAM KHẢO GIAO DIỆN THƯ VIỆN ĐỀ THI / JLPT N1    /    JLPT N2    /    JLPT N3    /    JLPT N4    /    JLPT N5Bộ lọc: Năm  •  Tháng 7 / 12  •  Đề gốc / Đề trộn[Đề N3 – Tháng 7/2015]    [Đề N3 – Tháng 12/2021]    [Đề trộn N3 – 01] |

Hình minh họa dạng tĩnh, mô phỏng hướng giao diện thư viện đề thi trong bản chat.

| Mã | Tính năng | Ưu tiên |
| LIB-01 | Hiển thị danh sách đề N1–N5 | P0 |
| LIB-02 | Lọc theo cấp độ JLPT | P0 |
| LIB-03 | Lọc theo năm | P0 |
| LIB-04 | Lọc theo kỳ thi tháng 7 / tháng 12 | P0 |
| LIB-05 | Phân biệt đề gốc, đề luyện tự biên soạn và đề trộn | P0 |
| LIB-06 | Tìm kiếm đề thi | P0 |
| LIB-07 | Hiển thị số câu, thời gian làm, các phần thi | P0 |
| LIB-08 | Hiển thị trạng thái: chưa làm / đang làm / hoàn thành | P0 |
| LIB-09 | Hiển thị điểm cao nhất của từng đề | P1 |
| LIB-10 | Hiển thị số lần đã làm đề | P1 |
| LIB-11 | Đánh dấu đề yêu thích | P1 |
| LIB-12 | Lọc các đề chưa từng làm | P1 |
| LIB-13 | Lọc đề đã làm nhưng chưa đạt mục tiêu | P1 |
| LIB-14 | Đề xuất đề tiếp theo | P2 |
| LIB-15 | Hiển thị thông tin nguồn, phiên bản, quyền sử dụng đề | P0 |

Tôi đề xuất thêm tính năng Tiếp tục làm bài, xuất hiện ngay trên trang chủ nếu người dùng có bài đang làm dở ở chế độ cho phép tiếp tục.

03. Phòng thi thử JLPT

EXAM SIMULATION ENGINE

Đây là lõi của toàn bộ dự án. Phải tạo cảm giác làm bài gần giống thi thật nhưng vẫn dễ sử dụng trên máy tính và điện thoại.

3.1. Trước khi bắt đầu thi

| Mã | Tính năng | Ưu tiên |
| EXAM-01 | Chọn đề thi | P0 |
| EXAM-02 | Chọn chế độ thi thật hoặc luyện tập | P0 |
| EXAM-03 | Hiển thị hướng dẫn làm bài | P0 |
| EXAM-04 | Hiển thị thời gian thi từng phần | P0 |
| EXAM-05 | Kiểm tra loa/tai nghe trước phần nghe | P0 |
| EXAM-06 | Hiển thị lưu ý về chuyển phần và nộp bài | P0 |
| EXAM-07 | Bắt đầu thi và ghi nhận thời điểm bắt đầu | P0 |

3.2. Trong quá trình làm bài

| Mã | Tính năng | Ưu tiên |
| EXAM-08 | Đồng hồ đếm ngược | P0 |
| EXAM-09 | Tự động chuyển hoặc kết thúc phần khi hết giờ | P0 |
| EXAM-10 | Hiển thị câu hỏi và đáp án lựa chọn | P0 |
| EXAM-11 | Chọn, đổi, bỏ chọn đáp án | P0 |
| EXAM-12 | Chuyển câu trước / câu sau | P0 |
| EXAM-13 | Danh sách câu hỏi dạng phiếu trả lời | P0 |
| EXAM-14 | Đánh dấu câu cần xem lại | P0 |
| EXAM-15 | Phân biệt câu đã làm / chưa làm / đánh dấu | P0 |
| EXAM-16 | Hiển thị tiến độ hoàn thành | P0 |
| EXAM-17 | Tự động lưu đáp án | P0 |
| EXAM-18 | Khôi phục phiên thi sau sự cố kết nối theo quy định chế độ thi | P0 |
| EXAM-19 | Xác nhận trước khi nộp bài sớm | P0 |
| EXAM-20 | Tự động nộp khi hết thời gian | P0 |
| EXAM-21 | Không cho xem đáp án khi đang thi | P0 |
| EXAM-22 | Không cho quay lại phần đã khóa | P0 |
| EXAM-23 | Phóng to/thu nhỏ cỡ chữ tiếng Nhật | P1 |
| EXAM-24 | Phím tắt chọn đáp án, chuyển câu trên máy tính | P1 |
| EXAM-25 | Giao diện tối giản, ẩn các yếu tố gây xao nhãng | P1 |
| EXAM-26 | Chế độ sáng / tối | P2 |

3.3. Phần nghe hiểu

| Mã | Tính năng | Ưu tiên |
| AUDIO-01 | Phát audio theo từng bài hoặc luồng thi | P0 |
| AUDIO-02 | Ghép đúng audio, hình ảnh và nhóm câu hỏi | P0 |
| AUDIO-03 | Hiển thị hình ảnh minh họa nếu có | P0 |
| AUDIO-04 | Không cho tua/phát lại trong chế độ thi thật | P0 |
| AUDIO-05 | Cho phát lại trong chế độ luyện tập | P1 |
| AUDIO-06 | Điều chỉnh tốc độ 0.75x, 1x, 1.25x trong chế độ luyện tập | P1 |
| AUDIO-07 | Phát audio riêng từng câu sau khi nộp bài | P1 |
| AUDIO-08 | Hiển thị transcript nếu có quyền sử dụng | P1 |
| AUDIO-09 | Đồng bộ transcript với đoạn audio | P2 |
| AUDIO-10 | Phát hiện lỗi tải audio và xử lý sự cố | P0 |

Lưu ý kỹ thuật: Quy định thời gian và cấu trúc phần thi cần được cấu hình theo cấp độ và phiên bản kỳ thi. N1/N2 có các nhóm phần thi khác N3–N5; thời gian cũng đã có những thay đổi theo năm. (Tham khảo: tài liệu cấu trúc bài thi JLPT chính thức.)

04. Luyện tập theo kỹ năng và dạng câu hỏi

FOCUSED PRACTICE

Ngoài làm nguyên đề, người dùng cần được luyện đúng nội dung họ đang yếu.

| Mã | Tính năng | Ưu tiên |
| PRA-01 | Luyện riêng Kanji | P1 |
| PRA-02 | Luyện riêng từ vựng | P1 |
| PRA-03 | Luyện riêng ngữ pháp | P1 |
| PRA-04 | Luyện riêng đọc hiểu | P1 |
| PRA-05 | Luyện riêng nghe hiểu | P1 |
| PRA-06 | Luyện theo từng dạng 問題 | P1 |
| PRA-07 | Tạo bài 10 / 20 / 30 / 50 câu theo bộ lọc | P1 |
| PRA-08 | Luyện không giới hạn thời gian | P1 |
| PRA-09 | Luyện có thời gian do người dùng chọn | P1 |
| PRA-10 | Xem đáp án ngay sau mỗi câu | P1 |
| PRA-11 | Chỉ luyện các câu đã làm sai | P1 |
| PRA-12 | Chỉ luyện câu chưa từng gặp | P1 |
| PRA-13 | Luyện câu đã đánh dấu | P1 |
| PRA-14 | Luyện ngẫu nhiên từ nhiều nguồn đề | P1 |
| PRA-15 | Luyện theo độ khó được hệ thống đánh giá | P2 |
| PRA-16 | Luyện theo mẫu ngữ pháp hoặc nhóm từ vựng | P2 |
| PRA-17 | Tiếp tục bài luyện còn dở | P1 |

Đặc biệt, người dùng nên có thể luyện theo chính xác các dạng câu JLPT như chọn cách đọc Kanji, chọn từ phù hợp, sắp xếp câu, đọc tìm thông tin hoặc nghe phản hồi nhanh. Danh mục dạng câu cần tuân theo cấu trúc của từng cấp độ, không sử dụng một bộ dạng câu giống nhau cho tất cả N1–N5. (Tham khảo: cấu trúc JLPT chính thức.)

05. Hệ thống trộn đề từ nhiều năm

SMART EXAM GENERATOR

Đây là tính năng đặc trưng nhất theo ý tưởng ban đầu của bạn.

5.1. Tạo đề trộn

| Mã | Tính năng | Ưu tiên |
| MIX-01 | Chọn cấp độ N1–N5 | P1 |
| MIX-02 | Chọn 2 kỳ thi để trộn | P1 |
| MIX-03 | Chọn từ 3 kỳ thi trở lên | P1 |
| MIX-04 | Chọn tỷ lệ câu lấy từ từng kỳ thi | P1 |
| MIX-05 | Trộn riêng từng kỹ năng | P1 |
| MIX-06 | Trộn chi tiết theo từng dạng 問題 | P1 |
| MIX-07 | Giữ số lượng câu phù hợp với cấu trúc đề mục tiêu | P1 |
| MIX-08 | Giữ nguyên bài đọc và nhóm câu hỏi liên quan | P1 |
| MIX-09 | Giữ nguyên nhóm audio, hình ảnh và câu hỏi nghe hiểu | P1 |
| MIX-10 | Không lấy trùng câu trong cùng một đề | P1 |
| MIX-11 | Phát hiện câu giống nhau ở nhiều nguồn | P1 |
| MIX-12 | Cho phép tạo nhiều phiên bản đề | P1 |
| MIX-13 | Lưu đề đã tạo | P1 |
| MIX-14 | Làm lại đề trộn trước đó | P1 |
| MIX-15 | Tạo đề trộn mới chỉ bằng một nút | P1 |
| MIX-16 | Hiển thị thông tin nguồn câu hỏi trong kết quả nếu được phép | P1 |
| MIX-17 | Chia sẻ đề trộn bằng liên kết | P2 |
| MIX-18 | Tạo đề theo độ khó mục tiêu | P2 |
| MIX-19 | Hạn chế câu mà người dùng đã gặp quá nhiều lần | P2 |

5.2. Các thuật toán bắt buộc

Hệ thống trộn đề nên có 6 quy tắc:

Chỉ trộn câu hỏi cùng cấp độ, trừ khi chủ động chọn chế độ luyện liên cấp.

Trộn trong cùng dạng câu hỏi thay vì trộn tất cả câu tùy ý.

Bảo toàn các nhóm câu đọc hiểu và nghe hiểu.

Kiểm tra số lượng câu, thời gian và thứ tự các phần.

Không dùng câu thiếu đáp án, audio hoặc chưa kiểm duyệt.

Lưu lại cấu hình, mã đề và danh sách câu đã chọn để đề có thể được tái hiện chính xác.

Ví dụ: Trộn đề N2 tháng 7/2015 và tháng 12/2021 theo tỷ lệ 50:50 không có nghĩa mỗi dạng câu phải lấy chính xác một nửa từ mỗi nguồn. Hệ thống cần làm tròn theo số câu, bảo toàn nhóm câu và báo cho người dùng nếu không đủ dữ liệu để đạt tỷ lệ mong muốn.

5.3. Các chế độ tạo đề nâng cao

| Chế độ | Mô tả |
| Random Mix | Trộn ngẫu nhiên từ các kỳ thi được chọn |
| Balanced Mix | Cân bằng dạng câu hỏi, độ khó và nguồn |
| Weakness Mix | Tăng tỷ trọng dạng câu người dùng thường sai |
| Unseen Mix | Ưu tiên câu chưa từng làm |
| Challenge Mix | Ưu tiên các câu khó hơn |
| Revision Mix | Tạo đề từ các câu sai và câu cần ôn lại |
| Custom Mix | Người dùng tự lựa chọn số câu và nhóm kiến thức |

Chỉ nên gọi một đề là mô phỏng đúng cấu trúc JLPT khi hệ thống đã kiểm tra đủ các điều kiện về phần thi và nhóm câu. Các bài trộn linh hoạt nên được ghi rõ là đề luyện tập tùy chỉnh.

06. Chấm điểm và kết quả thi

EXAM RESULT & SCORING

| Mã | Tính năng | Ưu tiên |
| SCORE-01 | Tự động chấm bài sau khi nộp | P0 |
| SCORE-02 | Hiển thị tổng số câu đúng / sai / bỏ trống | P0 |
| SCORE-03 | Hiển thị tỷ lệ chính xác | P0 |
| SCORE-04 | Thống kê kết quả theo từng kỹ năng | P0 |
| SCORE-05 | Thống kê kết quả theo từng dạng 問題 | P1 |
| SCORE-06 | Hiển thị thời gian làm bài thực tế | P0 |
| SCORE-07 | Xem đáp án đúng từng câu | P0 |
| SCORE-08 | Xem lại toàn bộ bài đã làm | P0 |
| SCORE-09 | Lọc riêng câu đúng, sai, bỏ trống | P1 |
| SCORE-10 | So sánh với lần làm trước | P1 |
| SCORE-11 | Lưu kết quả vĩnh viễn theo tài khoản | P0 |
| SCORE-12 | Tạo báo cáo kết quả dạng PDF | P2 |
| SCORE-13 | Hiển thị mức đạt mục tiêu điểm luyện tập | P1 |
| SCORE-14 | Ước lượng khả năng đạt kỳ thi dựa trên lịch sử làm bài | P2 |
| SCORE-15 | Phân tích thời gian trung bình mỗi câu và mỗi phần | P1 |

Điểm cần chú ý: Điểm luyện tập không được đồng nhất với điểm JLPT chính thức, do phương pháp chấm điểm của kỳ thi thật có chuẩn hóa. Hệ thống có thể đưa ra điểm quy đổi tham khảo và đánh giá xu hướng năng lực, nhưng cần ghi rõ phương pháp tính.

07. Chữa bài và giải thích đáp án

ANSWER EXPLANATION

| Mã | Tính năng | Ưu tiên |
| EXPL-01 | Giải thích vì sao đáp án đúng | P1 |
| EXPL-02 | Giải thích vì sao từng đáp án còn lại sai | P1 |
| EXPL-03 | Dịch nghĩa câu hỏi sang tiếng Việt | P1 |
| EXPL-04 | Hiển thị cách đọc Kanji / Furigana | P1 |
| EXPL-05 | Giải thích từ vựng quan trọng trong câu | P1 |
| EXPL-06 | Phân tích mẫu ngữ pháp xuất hiện | P1 |
| EXPL-07 | Dịch và phân tích bài đọc | P1 |
| EXPL-08 | Hiển thị transcript bài nghe | P1 |
| EXPL-09 | Chỉ ra chi tiết trong bài đọc/nghe dẫn đến đáp án | P2 |
| EXPL-10 | Cho phép lưu câu hỏi vào danh sách ôn lại | P1 |
| EXPL-11 | Hỏi AI giải thích sâu hơn về một câu | P2 |
| EXPL-12 | Báo cáo giải thích sai hoặc khó hiểu | P1 |
| EXPL-13 | Kiểm duyệt và phiên bản hóa nội dung giải thích | P1 |

Các lời giải AI nên được kiểm tra trước khi công khai rộng rãi, đặc biệt với câu ngữ pháp có nhiều phương án gần nghĩa.

08. Lịch sử làm bài và phân tích năng lực

LEARNING ANALYTICS

Một dashboard cá nhân giúp học viên biết được họ đang tiến bộ hay đang ôn tập chưa hiệu quả.

| Minh họa Dashboard học viên N3 — 30 ngày / 12 đề đã làm  •  74% độ chính xác  •  18 giờ họcKanji 88%  /  Từ vựng 76%  /  Ngữ pháp 64%  /  Đọc hiểu 81%  /  Nghe hiểu 59%Gợi ý luyện tập: Nghe hiểu và Ngữ pháp đang có tỷ lệ trả lời đúng thấp nhất. Hệ thống nên ưu tiên gợi ý bài luyện ở hai kỹ năng này. |

Dữ liệu ví dụ, không phải kết quả thực tế. Thay cho dashboard tương tác trong giao diện chat.

| Mã | Tính năng | Ưu tiên |
| STAT-01 | Lịch sử tất cả lần thi | P0 |
| STAT-02 | Biểu đồ điểm theo thời gian | P1 |
| STAT-03 | Độ chính xác từng kỹ năng | P1 |
| STAT-04 | Độ chính xác từng dạng câu | P1 |
| STAT-05 | Số câu làm sai nhiều lần | P1 |
| STAT-06 | Phân tích lỗi thường gặp | P1 |
| STAT-07 | So sánh kết quả theo từng tháng | P1 |
| STAT-08 | Thống kê thời gian ôn tập | P1 |
| STAT-09 | So sánh tốc độ và độ chính xác khi làm bài | P2 |
| STAT-10 | Theo dõi tiến độ so với mục tiêu | P1 |
| STAT-11 | Gợi ý kỹ năng nên ưu tiên học tiếp | P1 |
| STAT-12 | Phân tích câu thường đổi đáp án từ đúng sang sai | P2 |
| STAT-13 | Thống kê tỷ lệ tiến bộ trên những câu chưa từng gặp | P2 |
| STAT-14 | Phân biệt tiến bộ thực và tiến bộ do làm lại câu quen thuộc | P2 |

09. Sổ tay từ vựng, Kanji và ngữ pháp

PERSONAL LEARNING NOTEBOOK

| Mã | Tính năng | Ưu tiên |
| VOC-01 | Bấm vào từ tiếng Nhật để tra nghĩa khi chữa bài | P1 |
| VOC-02 | Hiển thị cách đọc Hiragana / Katakana | P1 |
| VOC-03 | Hiển thị nghĩa tiếng Việt | P1 |
| VOC-04 | Hiển thị loại từ | P1 |
| VOC-05 | Hiển thị câu ví dụ | P1 |
| VOC-06 | Lưu từ vựng vào sổ tay cá nhân | P1 |
| VOC-07 | Lưu Kanji và thông tin cách đọc | P1 |
| VOC-08 | Lưu mẫu ngữ pháp | P1 |
| VOC-09 | Đánh dấu từ đã thuộc / chưa thuộc | P1 |
| VOC-10 | Tạo flashcard tự động | P1 |
| VOC-11 | Ôn tập bằng lặp lại ngắt quãng (SRS) | P1 |
| VOC-12 | Tìm kiếm trong sổ tay | P1 |
| VOC-13 | Nhóm từ theo chủ đề và cấp độ | P1 |
| VOC-14 | Luyện trắc nghiệm từ những từ đã lưu | P1 |
| VOC-15 | Xuất danh sách từ vựng CSV | P2 |
| VOC-16 | Phát âm từ vựng | P2 |
| VOC-17 | Học từ bằng ví dụ lấy từ ngân hàng câu hỏi | P1 |
| VOC-18 | Đồng bộ trạng thái học từ giữa các thiết bị | P1 |

10. Thống kê từ vựng và ngữ pháp trong đề JLPT

JLPT VOCABULARY INTELLIGENCE

Đây là phân hệ phân tích dữ liệu từ toàn bộ kho PDF, khác với sổ tay từ vựng của từng người dùng.

10.1. Thống kê từ vựng

| Mã | Tính năng | Ưu tiên |
| DATA-01 | Trích xuất từ vựng từ văn bản đề thi | P1 |
| DATA-02 | Chuẩn hóa các biến thể về dạng từ điển | P1 |
| DATA-03 | Tính tần suất xuất hiện của từng từ | P1 |
| DATA-04 | Thống kê theo N1–N5 | P1 |
| DATA-05 | Thống kê theo năm và kỳ thi | P1 |
| DATA-06 | Thống kê theo Kanji, từ vựng, đọc hiểu, nghe hiểu | P1 |
| DATA-07 | Phân biệt từ xuất hiện trong đề và từ được hỏi trực tiếp | P1 |
| DATA-08 | Phân biệt từ trong câu hỏi, đáp án và bài đọc | P1 |
| DATA-09 | Xếp hạng từ vựng xuất hiện nhiều nhất | P1 |
| DATA-10 | Hiển thị số đề khác nhau có chứa từ | P1 |
| DATA-11 | Xem các câu hỏi chứa từ đó nếu được phép | P1 |
| DATA-12 | Tra cứu một từ để xem thống kê | P1 |
| DATA-13 | So sánh mức xuất hiện giữa các cấp độ | P2 |
| DATA-14 | Thống kê theo khoảng thời gian | P2 |
| DATA-15 | Tạo danh sách từ thường gặp để ôn tập | P1 |
| DATA-16 | Kết nối từ vựng với sổ tay cá nhân | P1 |
| DATA-17 | So sánh danh sách từ thường gặp với các từ đã học | P2 |
| DATA-18 | Xuất báo cáo CSV / Excel | P2 |

10.2. Thống kê ngữ pháp và Kanji

| Mã | Tính năng | Ưu tiên |
| DATA-19 | Xác định các mẫu ngữ pháp trong câu hỏi | P1 |
| DATA-20 | Thống kê tần suất từng mẫu ngữ pháp | P1 |
| DATA-21 | Xem những đề từng kiểm tra mẫu ngữ pháp đó | P1 |
| DATA-22 | Thống kê số lần Kanji xuất hiện | P1 |
| DATA-23 | Phân loại Kanji theo cấp độ và nhóm kiến thức | P1 |
| DATA-24 | So sánh xu hướng xuất hiện qua các năm | P2 |
| DATA-25 | Liên kết mẫu ngữ pháp với bài luyện tương ứng | P1 |
| DATA-26 | Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo | P2 |

Rất quan trọng: Thống kê cần công khai quy mô dữ liệu và nguồn. Ví dụ, một từ xuất hiện nhiều trong bộ PDF bạn sở hữu không có nghĩa chắc chắn từ đó có xác suất xuất hiện cao ở kỳ thi JLPT tiếp theo. Hệ thống nên loại trùng tài liệu, chuẩn hóa từ tiếng Nhật và ghi rõ thống kê dựa trên tập dữ liệu nào.

11. Lộ trình ôn thi cá nhân hóa

STUDY PLANNER

| Mã | Tính năng | Ưu tiên |
| PLAN-01 | Chọn kỳ thi mục tiêu | P2 |
| PLAN-02 | Đếm ngược đến ngày thi | P1 |
| PLAN-03 | Chọn thời gian học mỗi ngày | P2 |
| PLAN-04 | Tạo lộ trình 30 / 60 / 90 ngày | P2 |
| PLAN-05 | Lập lịch làm đề định kỳ | P2 |
| PLAN-06 | Phân bổ thời gian theo kỹ năng yếu | P2 |
| PLAN-07 | Đề xuất bài học và đề thi hôm nay | P2 |
| PLAN-08 | Theo dõi tỷ lệ hoàn thành kế hoạch | P2 |
| PLAN-09 | Nhắc học hoặc làm đề | P2 |
| PLAN-10 | Tự điều chỉnh kế hoạch khi bỏ lỡ buổi học | P2 |
| PLAN-11 | Giai đoạn tổng ôn trước ngày thi | P2 |
| PLAN-12 | Đánh giá mức sẵn sàng trước kỳ thi | P2 |

12. AI hỗ trợ luyện thi JLPT

AI LEARNING ASSISTANT

| Mã | Tính năng | Ưu tiên |
| AI-01 | Giải thích câu hỏi bằng tiếng Việt | P2 |
| AI-02 | Phân tích ngữ pháp trong câu | P2 |
| AI-03 | So sánh các đáp án tương tự nhau | P2 |
| AI-04 | Giải thích bài đọc theo từng đoạn | P2 |
| AI-05 | Phân tích transcript bài nghe | P2 |
| AI-06 | Đặt câu hỏi trực tiếp về nội dung đang học | P2 |
| AI-07 | Đề xuất cách ghi nhớ từ vựng | P2 |
| AI-08 | Tạo ví dụ mới cho mẫu ngữ pháp | P2 |
| AI-09 | Sinh câu luyện mới từ kiến thức đã học | P2 |
| AI-10 | Phát hiện dạng lỗi học viên lặp lại | P2 |
| AI-11 | Đề xuất bài luyện phù hợp với năng lực | P2 |
| AI-12 | Tóm tắt kết quả học tập mỗi tuần | P2 |
| AI-13 | Sinh bộ flashcard từ câu làm sai | P2 |
| AI-14 | Giới hạn và kiểm duyệt nội dung AI tạo ra | P2 |

Nên phân biệt rõ ba loại nội dung: đề gốc đã được cấp quyền, đề trộn từ ngân hàng câu hỏi và câu hỏi mới do AI tạo. Không nên để người dùng nhầm câu AI tạo với câu từng xuất hiện trong kỳ thi JLPT thực tế.

13. Hệ thống nhập PDF và xử lý dữ liệu

PDF IMPORT & OCR PIPELINE

Đây là phân hệ quản trị đặc biệt quan trọng. Nếu làm tốt, bạn có thể bổ sung hàng trăm bộ đề mà không phải nhập thủ công từng câu.

| Mã | Tính năng | Ưu tiên |
| PDF-01 | Upload một file PDF đề thi | P0 |
| PDF-02 | Upload nhiều PDF cùng lúc | P1 |
| PDF-03 | Upload file đáp án | P0 |
| PDF-04 | Upload audio nghe hiểu | P0 |
| PDF-05 | Khai báo N1–N5, năm, kỳ thi, nguồn | P0 |
| PDF-06 | Tự nhận diện PDF dạng text hoặc PDF scan | P0 |
| PDF-07 | Trích xuất text tiếng Nhật | P0 |
| PDF-08 | OCR hình ảnh trong PDF scan | P0 |
| PDF-09 | Nhận diện Kanji, Kana, Furigana | P0 |
| PDF-10 | Nhận diện câu hỏi và số thứ tự | P0 |
| PDF-11 | Nhận diện đáp án trắc nghiệm | P0 |
| PDF-12 | Nhận diện tiêu đề 問題 và các nhóm câu | P0 |
| PDF-13 | Nhận diện đoạn văn đọc hiểu | P0 |
| PDF-14 | Nhận diện hình ảnh và bảng biểu trong đề | P0 |
| PDF-15 | Nhận diện câu sắp xếp có ký hiệu ★ | P0 |
| PDF-16 | Liên kết đáp án từ file đáp án | P0 |
| PDF-17 | Liên kết câu hỏi với audio | P0 |
| PDF-18 | Cho AI đề xuất phân loại câu hỏi | P1 |
| PDF-19 | Hiển thị PDF gốc bên cạnh dữ liệu trích xuất | P0 |
| PDF-20 | Cho phép biên tập viên sửa nội dung | P0 |
| PDF-21 | Đánh dấu câu có độ tin cậy OCR thấp | P1 |
| PDF-22 | Phát hiện thiếu câu, thiếu đáp án hoặc trùng câu | P0 |
| PDF-23 | Kiểm tra tổng số câu theo cấu trúc đề | P0 |
| PDF-24 | Xem trước đề trên giao diện làm bài | P0 |
| PDF-25 | Duyệt dữ liệu trước khi xuất bản | P0 |
| PDF-26 | Lưu file PDF gốc và liên kết nguồn đến từng câu | P0 |
| PDF-27 | Nhập lại file mà không tạo trùng dữ liệu | P1 |
| PDF-28 | Theo dõi trạng thái và lỗi xử lý | P0 |
| PDF-29 | Quản lý phiên bản khi sửa nội dung đề | P1 |
| PDF-30 | Import và export ngân hàng câu hỏi dạng JSON/CSV | P1 |

Quy trình nhập PDF được đề xuất

| Bước 1. Upload bộ tài liệu / PDF đề thi, đáp án, audio và thông tin nguồn |

| Bước 2. AI / OCR nhận diện cấu trúc / Câu hỏi, đáp án, đoạn đọc, dạng 問題, hình ảnh |

| Bước 3. Kiểm tra và chỉnh sửa / Đối chiếu với PDF, xác minh đáp án và audio |

| Bước 4. Duyệt và xuất bản / Đưa dữ liệu hợp lệ vào ngân hàng câu hỏi |

Hệ thống OCR và AI chỉ nên giúp giảm công nhập liệu, không thay thế hoàn toàn bước kiểm tra. Đặc biệt cần giữ nguyên ký tự tiếng Nhật, dấu câu, furigana, bố cục câu sắp xếp và hình ảnh.

14. Ngân hàng câu hỏi JLPT

QUESTION BANK MANAGEMENT

Đây là lõi dữ liệu dùng chung cho thi đề gốc, trộn đề, luyện theo kỹ năng và thống kê từ vựng.

| Mã | Tính năng | Ưu tiên |
| QB-01 | Lưu từng câu hỏi có mã định danh riêng | P0 |
| QB-02 | Liên kết câu với cấp độ, năm, kỳ thi | P0 |
| QB-03 | Phân loại kỹ năng và dạng 問題 | P0 |
| QB-04 | Lưu nội dung và các phương án trả lời | P0 |
| QB-05 | Lưu đáp án đúng | P0 |
| QB-06 | Lưu bài đọc và nhóm câu hỏi liên quan | P0 |
| QB-07 | Lưu audio, hình ảnh liên quan | P0 |
| QB-08 | Lưu giải thích, bản dịch, transcript | P1 |
| QB-09 | Gắn từ vựng, Kanji, mẫu ngữ pháp | P1 |
| QB-10 | Gắn nhãn độ khó | P1 |
| QB-11 | Tìm kiếm, lọc, sửa câu hỏi | P0 |
| QB-12 | Phát hiện câu hỏi trùng hoặc gần trùng | P1 |
| QB-13 | Tạm ẩn câu lỗi, câu chưa kiểm duyệt | P0 |
| QB-14 | Ghi lịch sử chỉnh sửa và người chỉnh sửa | P1 |
| QB-15 | Lưu phiên bản nội dung, đáp án | P1 |
| QB-16 | Quản lý trạng thái quyền sử dụng nội dung | P0 |
| QB-17 | Ghi nhận nguồn gốc của từng câu hỏi | P0 |
| QB-18 | Theo dõi câu từng xuất hiện trong các đề trộn nào | P1 |
| QB-19 | Thống kê độ khó thực tế từ lịch sử làm bài | P2 |
| QB-20 | Kiểm định chất lượng câu hỏi dựa trên tỷ lệ chọn đáp án | P2 |

Những thực thể dữ liệu quan trọng

Tôi đề xuất database có ít nhất các nhóm:

| Cấu trúc thực thể dữ liệu / Exam, ExamSection, QuestionGroup, Question, AnswerOption, CorrectAnswer, MediaAsset, ExamSource, ExamBlueprint, GeneratedExam, ExamAttempt, UserAnswer, Vocabulary, GrammarPoint, QuestionTag, ContentReview, ContentLicense. |

Điểm thiết kế cần lưu ý: Không phải câu hỏi nào cũng hoàn toàn độc lập. Một bài đọc có thể đi kèm nhiều câu hỏi; một đoạn audio cũng vậy. Database phải thể hiện được quan hệ này ngay từ đầu.

15. Trang quản trị hệ thống

ADMIN CMS

| Mã | Tính năng | Ưu tiên |
| ADM-01 | Dashboard tổng quan hệ thống | P0 |
| ADM-02 | Quản lý người dùng | P0 |
| ADM-03 | Phân quyền Admin / Biên tập viên / Người duyệt | P0 |
| ADM-04 | Quản lý bộ đề thi | P0 |
| ADM-05 | Quản lý câu hỏi và đáp án | P0 |
| ADM-06 | Quản lý file PDF, hình ảnh, audio | P0 |
| ADM-07 | Duyệt và xuất bản đề | P0 |
| ADM-08 | Quản lý cấu trúc và thời gian thi theo cấp độ | P0 |
| ADM-09 | Quản lý báo lỗi câu hỏi từ người dùng | P1 |
| ADM-10 | Quản lý nội dung giải thích và bản dịch | P1 |
| ADM-11 | Quản lý các đề trộn đã tạo | P1 |
| ADM-12 | Quản lý từ vựng và mẫu ngữ pháp | P1 |
| ADM-13 | Quản lý bài viết và nội dung trang chủ | P1 |
| ADM-14 | Xem lịch sử thao tác quản trị | P0 |
| ADM-15 | Quản lý gói thành viên | P1 |
| ADM-16 | Quản lý thanh toán | P1 |
| ADM-17 | Xem báo cáo sử dụng hệ thống | P1 |
| ADM-18 | Cấu hình thông báo và email | P1 |
| ADM-19 | Quản lý quyền sử dụng và yêu cầu gỡ nội dung | P0 |
| ADM-20 | Sao lưu, phục hồi và xuất dữ liệu quản trị | P0 |

Ngoài ra nên có cơ chế hai bước duyệt nội dung: người nhập đề và người xác minh có thể là hai tài khoản khác nhau, nhằm hạn chế xuất bản nhầm câu lỗi.

16. Phân hệ giáo viên và trung tâm tiếng Nhật

TEACHER & CLASSROOM

| Mã | Tính năng | Ưu tiên |
| TEA-01 | Đăng ký tài khoản giáo viên | P2 |
| TEA-02 | Tạo lớp học | P2 |
| TEA-03 | Mời học viên bằng mã lớp/link | P2 |
| TEA-04 | Giao một đề có sẵn cho cả lớp | P2 |
| TEA-05 | Tạo đề trộn riêng cho lớp | P2 |
| TEA-06 | Đặt thời hạn hoàn thành bài | P2 |
| TEA-07 | Xem học viên nào đã nộp bài | P2 |
| TEA-08 | Xem điểm và phân tích kết quả từng học viên | P2 |
| TEA-09 | Thống kê lỗi chung của cả lớp | P2 |
| TEA-10 | Giao bài bổ sung cho nhóm học viên yếu | P2 |
| TEA-11 | Xuất bảng điểm lớp | P2 |
| TEA-12 | Quản lý nhiều lớp/trung tâm | P2 |
| TEA-13 | Quản lý quyền truy cập dữ liệu học viên | P2 |

17. Gamification và cộng đồng

ENGAGEMENT & COMMUNITY

| Mã | Tính năng | Ưu tiên |
| GAME-01 | Ghi nhận chuỗi ngày học liên tục (streak) | P2 |
| GAME-02 | Huy hiệu hoàn thành đề | P2 |
| GAME-03 | Huy hiệu hoàn thành mục tiêu tuần | P2 |
| GAME-04 | Bảng xếp hạng tự nguyện | P2 |
| GAME-05 | Thử thách ôn tập 7 / 30 / 60 ngày | P2 |
| GAME-06 | Tổ chức kỳ thi thử đồng loạt | P2 |
| GAME-07 | Chia sẻ thành tích cá nhân | P2 |
| GAME-08 | Thảo luận về câu hỏi sau khi hoàn thành bài | P2 |
| GAME-09 | Bình luận và báo cáo nội dung không phù hợp | P2 |
| GAME-10 | Thống kê thành tích theo nhóm/lớp | P2 |

Các bảng xếp hạng nên tách theo cấp độ, loại bài và điều kiện thi để so sánh công bằng. Không nên xếp chung điểm số luyện tập tự do với bài thi mô phỏng nghiêm ngặt.

18. Gói thành viên và thanh toán

MONETIZATION

| Mã | Tính năng | Ưu tiên |
| PAY-01 | Gói tài khoản miễn phí | P1 |
| PAY-02 | Gói Premium tháng / quý / năm | P1 |
| PAY-03 | Giới hạn tính năng theo gói | P1 |
| PAY-04 | Thanh toán qua phương thức phù hợp thị trường | P1 |
| PAY-05 | Quản lý trạng thái đăng ký | P1 |
| PAY-06 | Lịch sử giao dịch | P1 |
| PAY-07 | Mã giảm giá | P2 |
| PAY-08 | Quản lý hoàn tiền, hủy gói | P1 |
| PAY-09 | Nâng cấp hoặc gia hạn gói | P1 |
| PAY-10 | Gói giáo viên/trung tâm | P2 |
| PAY-11 | Giới hạn lượt sử dụng AI theo gói | P2 |
| PAY-12 | Báo cáo doanh thu | P1 |

Ví dụ phân chia:

| Free | Premium |
| Làm các đề luyện miễn phí | Mở khóa kho đề được cấp quyền |
| Chấm điểm cơ bản | Phân tích chuyên sâu |
| Lưu lịch sử giới hạn | Lịch sử đầy đủ |
| Luyện thử một số dạng câu | Trộn đề và luyện theo điểm yếu |
| Xem một số lời giải | Giải thích chi tiết và flashcard nâng cao |

Mô hình thực tế sẽ phụ thuộc vào bản quyền dữ liệu và chi phí vận hành. Không nên đưa bộ PDF chưa có quyền khai thác vào gói thương mại.

19. Thông báo và nhắc nhở

NOTIFICATIONS

| Mã | Tính năng | Ưu tiên |
| NOTI-01 | Email xác minh tài khoản | P0 |
| NOTI-02 | Email đặt lại mật khẩu | P0 |
| NOTI-03 | Nhắc tiếp tục bài luyện dang dở | P1 |
| NOTI-04 | Thông báo có đề mới | P1 |
| NOTI-05 | Nhắc ôn các từ đến hạn SRS | P1 |
| NOTI-06 | Thống kê kết quả tuần | P2 |
| NOTI-07 | Nhắc lịch thi mục tiêu | P2 |
| NOTI-08 | Thông báo kết quả thi thử đồng loạt | P2 |
| NOTI-09 | Thông báo tình trạng thanh toán | P1 |
| NOTI-10 | Cho phép bật/tắt từng loại thông báo | P1 |

20. SEO, nội dung và phát triển người dùng

CONTENT & GROWTH

| Mã | Tính năng | Ưu tiên |
| SEO-01 | Trang giới thiệu cho từng cấp độ N1–N5 | P1 |
| SEO-02 | Trang danh sách đề theo năm và kỳ | P1 |
| SEO-03 | Trang giới thiệu từ vựng và mẫu ngữ pháp | P1 |
| SEO-04 | Trang thống kê từ thường gặp | P1 |
| SEO-05 | Blog hướng dẫn thi JLPT | P1 |
| SEO-06 | Sitemap và metadata SEO | P1 |
| SEO-07 | Structured data cho các trang phù hợp | P1 |
| SEO-08 | Open Graph khi chia sẻ link | P1 |
| SEO-09 | Trang giới thiệu gói thành viên | P1 |
| SEO-10 | Trang liên hệ, hỗ trợ, FAQ | P0 |
| SEO-11 | Công cụ đo lường nguồn truy cập | P1 |
| SEO-12 | Trang đích cho chiến dịch ôn thi 60 ngày | P2 |

21. Bảo mật, hiệu năng và hạ tầng

NON-FUNCTIONAL REQUIREMENTS

| Mã | Tính năng | Ưu tiên |
| SYS-01 | Giao diện responsive trên điện thoại, tablet, desktop | P0 |
| SYS-02 | Tải trang nhanh, tối ưu ảnh/audio | P0 |
| SYS-03 | Tự động lưu đáp án an toàn | P0 |
| SYS-04 | Đồng hồ thi đồng bộ với thời gian máy chủ | P0 |
| SYS-05 | Khôi phục phiên thi sau mất kết nối theo chính sách | P0 |
| SYS-06 | Bảo vệ dữ liệu người dùng và mã hóa kết nối | P0 |
| SYS-07 | Phân quyền truy cập API và tài nguyên | P0 |
| SYS-08 | Sao lưu database định kỳ | P0 |
| SYS-09 | Theo dõi lỗi hệ thống và cảnh báo | P0 |
| SYS-10 | Kiểm tra tải khi nhiều thí sinh làm bài cùng lúc | P0 |
| SYS-11 | CDN cho hình ảnh, audio và nội dung tĩnh | P1 |
| SYS-12 | Chống spam, giới hạn truy cập API | P0 |
| SYS-13 | Quản lý cookie và chính sách quyền riêng tư | P0 |
| SYS-14 | Thiết kế hỗ trợ người dùng có nhu cầu trợ năng | P1 |
| SYS-15 | Quy trình triển khai, rollback, môi trường thử nghiệm | P0 |
| SYS-16 | Kiểm thử tự động cho chấm điểm, timer và đề trộn | P0 |
| SYS-17 | Giám sát truy cập và bảo vệ dữ liệu trả phí | P1 |
| SYS-18 | Lưu sự kiện làm bài phục vụ phục hồi và kiểm tra lỗi | P0 |
| SYS-19 | Quản lý thời hạn lưu trữ và xóa dữ liệu | P1 |
| SYS-20 | Quy trình xử lý lỗi hoặc sự cố nội dung/audio trong khi thi | P0 |

Với trải nghiệm thi thật, ba chức năng phải đặc biệt ổn định: đồng hồ, lưu đáp án và phát audio. Đây là những phần nên có kiểm thử tự động trước khi đưa vào sử dụng.

22. Báo cáo vận hành và phân tích sản phẩm

PRODUCT ANALYTICS & REPORTING

| Mã | Tính năng | Ưu tiên |
| REPORT-01 | Số người dùng mới theo ngày/tháng | P1 |
| REPORT-02 | Số người dùng hoạt động hàng ngày/hàng tháng | P1 |
| REPORT-03 | Số lượt bắt đầu và hoàn thành bài thi | P1 |
| REPORT-04 | Tỷ lệ bỏ dở bài thi | P1 |
| REPORT-05 | Thống kê cấp độ được luyện nhiều nhất | P1 |
| REPORT-06 | Thống kê bộ đề phổ biến | P1 |
| REPORT-07 | Thời gian sử dụng trung bình | P1 |
| REPORT-08 | Tỷ lệ quay lại sau 7/30 ngày | P1 |
| REPORT-09 | Phân tích phễu đăng ký và bắt đầu làm đề | P1 |
| REPORT-10 | Thống kê kết quả kiểm duyệt PDF | P1 |
| REPORT-11 | Thống kê lỗi OCR, lỗi câu hỏi và lỗi audio | P1 |
| REPORT-12 | Thống kê lượt sử dụng tính năng trộn đề | P1 |
| REPORT-13 | Báo cáo chuyển đổi Free → Premium | P1 |
| REPORT-14 | Báo cáo chi phí AI và lưu trữ | P2 |
| REPORT-15 | Theo dõi hiệu quả các thử nghiệm cải tiến giao diện | P2 |

IV. Danh sách màn hình cần thiết kế UI/UX

Từ các chức năng trên, tôi đề xuất website có các màn hình sau.

| Nhóm | Màn hình |
| Public | Trang chủ, giới thiệu dự án, thư viện đề, chi tiết đề |
| Authentication | Đăng ký, đăng nhập, quên mật khẩu |
| Exam | Chuẩn bị thi, phòng thi, phần nghe, xác nhận nộp bài |
| Results | Kết quả tổng quan, chi tiết từng câu, chữa bài |
| Practice | Chọn kỹ năng, chọn dạng câu, luyện câu sai |
| Mix Exam | Cấu hình trộn đề, xem trước đề, lịch sử đề trộn |
| Learning | Dashboard, lịch sử thi, sổ tay, flashcard, kế hoạch học |
| Statistics | Thống kê từ vựng, Kanji, ngữ pháp theo dữ liệu đề |
| Account | Hồ sơ, cài đặt, gói thành viên, thanh toán |
| Admin | Dashboard, nhập PDF, kiểm duyệt, quản lý đề, quản lý câu hỏi, người dùng |
| Teacher | Quản lý lớp, giao bài, bảng điểm, phân tích học viên |

Nên thiết kế giao diện mobile-first, nhưng ưu tiên tối ưu phòng thi trên desktop vì nội dung đọc hiểu dài, nhiều đáp án và hình ảnh sẽ dễ thao tác hơn trên màn hình lớn.

V. Lộ trình phát triển đề xuất

Không nên triển khai toàn bộ các tính năng cùng một lúc. Tôi đề xuất chia dự án thành 4 phiên bản.

V1 — MVP: Website làm đề JLPT Online

Hệ thống tài khoản và thư viện đề.

Công cụ nhập PDF, đáp án và audio.

Ngân hàng câu hỏi có kiểm duyệt.

Phòng thi mô phỏng thời gian thật.

Tự động chấm bài, lưu lịch sử, xem đáp án.

Admin quản lý nội dung và người dùng.

Mục tiêu: Người dùng có thể chọn đề và hoàn thành một bài thi online ổn định, chính xác.

V2 — Core: Trộn đề và luyện tập thông minh

Trộn đề từ 2 hoặc nhiều kỳ thi.

Luyện tập riêng từng kỹ năng và dạng câu.

Luyện lại câu sai và câu chưa từng gặp.

Giải thích đáp án.

Dashboard phân tích điểm yếu.

Thống kê từ vựng, Kanji và ngữ pháp từ dữ liệu đề.

Mục tiêu: Tạo lợi thế cạnh tranh và giúp người học quay lại thường xuyên.

V3 — Growth: Hệ thống ôn thi cá nhân hóa

Sổ tay từ vựng và flashcard SRS.

Lộ trình ôn thi 30–90 ngày.

AI giải thích và đề xuất bài luyện.

Thông báo nhắc học.

Gói Premium, thanh toán.

SEO, blog và tính năng chia sẻ.

Mục tiêu: Tăng mức độ gắn bó và thử nghiệm khả năng thương mại hóa.

V4 — Scale: Nền tảng JLPT mở rộng

Giáo viên và trung tâm quản lý lớp học.

Tổ chức thi thử đồng loạt.

Bảng xếp hạng và thử thách học tập.

AI tạo câu luyện mới có kiểm duyệt.

Phân tích độ khó câu hỏi từ dữ liệu thực.

Hệ thống báo cáo và sản phẩm dành cho trung tâm.

Mục tiêu: Phát triển từ website luyện thi cá nhân thành nền tảng dành cho cả học viên và tổ chức giáo dục.

VI. Những yếu tố đặc biệt cần làm đúng ngay từ đầu

Có 5 quyết định kỹ thuật và sản phẩm ảnh hưởng lớn nhất đến khả năng mở rộng sau này.

Thiết kế database theo câu hỏi, không theo file PDF. PDF chỉ là nguồn nhập liệu. Mỗi câu phải có dữ liệu độc lập, nhưng vẫn giữ liên kết tới nhóm đọc hiểu/nghe hiểu và nguồn gốc.

Xây bộ cấu hình cấu trúc JLPT riêng. Không hard-code một cấu trúc cho mọi năm, mọi trình độ. Cấu trúc và thời gian từng phần phải có khả năng thay đổi theo quy định chính thức. (Tham khảo: tài liệu JLPT chính thức.)

Mỗi câu phải có trạng thái kiểm duyệt. Chỉ những câu có nội dung, đáp án và tài nguyên đầy đủ mới được đưa vào bộ tạo đề.

Theo dõi quyền sử dụng nội dung. Theo thông tin chính thức, JLPT không công bố nguyên bộ câu hỏi của tất cả các kỳ thi và một số tài liệu có quyền của bên thứ ba. Việc sử dụng lại PDF, audio hoặc xuất bản các đề trộn phải được đánh giá về bản quyền trước khi triển khai công khai.

Tách hệ thống thi thử khỏi hệ thống học tập. Chế độ thi thật phải nghiêm ngặt về đồng hồ, đáp án và nghe hiểu; chế độ học mới cho phép tua audio, tra từ, tạm dừng, xem lời giải và nhận gợi ý.

VII. Tôi đề xuất ưu tiên phát triển những tính năng nào?

Top 10 tính năng tạo nên giá trị chính của sản phẩm

Bạn có thể chọn các tính năng muốn ưu tiên để tạo một backlog MVP riêng. Trong bản Word, danh sách này được trình bày dưới dạng ô đánh dấu tĩnh (không phải nút tương tác).

☑   01  Nhập PDF tự động thành ngân hàng câu hỏi

☑   02  Quản trị kiểm tra và chỉnh sửa dữ liệu OCR

☑   03  Thi thử JLPT với thời gian và phần nghe như thi thật

☑   04  Tự động chấm điểm và xem lại bài

☑   05  Trộn đề nhiều năm theo đúng dạng câu hỏi

☐   06  Làm lại các câu đã sai

☐   07  Luyện riêng từng kỹ năng JLPT

☐   08  Giải thích đáp án bằng tiếng Việt

☐   09  Thống kê từ vựng và ngữ pháp thường gặp

☐   10  Dashboard phân tích năng lực và tiến bộ

Đã chọn 5/10 tính năng trong ví dụ gốc. Tùy chọn “Lập backlog chi tiết” trong chat là một nút tương tác; trong Word, có thể dùng danh sách đã đánh dấu làm đầu vào cho backlog MVP.

Kết luận

Tôi sẽ lấy ba chức năng làm trọng tâm kiến trúc của dự án: PDF → Ngân hàng câu hỏi → Công cụ tạo và làm đề thi.

Khi ba thành phần này được thiết kế tốt, các tính năng khác như thống kê từ vựng, luyện câu sai, AI giải thích, flashcard và phân tích năng lực đều có thể mở rộng trên cùng một nguồn dữ liệu, thay vì phải xây lại từ đầu.

Danh sách trên phù hợp để bắt đầu xây dựng tài liệu yêu cầu sản phẩm (PRD), chia sprint và thiết kế database cho dự án.

