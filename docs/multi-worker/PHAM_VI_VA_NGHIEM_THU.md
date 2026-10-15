# Phạm vi toàn bộ tính năng và điều kiện nghiệm thu

## Phạm vi được yêu cầu

Danh mục nguồn có 375 mã thuộc22 phân hệ và 23 prefix. Theo chỉ thị mới,12 mã PDF-06…PDF-16 và PDF-18 là công việc agent chuẩn bị dữ liệu bên ngoài, không phải chức năng trích xuất phải xây.363 yêu cầu còn lại tiếp tục nằm trong ứng dụng V1–V4; các mục nhập PDF/đáp án/audio và lỗi nhận dạng được chuyển thành nhập gói chuẩn, issues và kiểm tra dữ liệu. `MA_TRAN_TINH_NANG.md` giữ cả nội dung nguồn lẫn hành vi mới để không giấu thay đổi phạm vi. Không xây hoặc vận hành dịch vụ tự đọc PDF trong hệ thống.

Đầu vào bắt buộc: import v2 theo [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md). Chủ dự án không có quyền DB/Redis, không gọi API admin tự xuất bản và không được tự xác nhận license/đáp án. Gói vượt validator chỉ đạt kiểm tra cấu trúc, không phải xác nhận nội dung đúng.

Hạ tầng mở rộng AWS/microservices là phương án theo số đo, không phải tính năng buộc chuyển kiến trúc tuần này. Khả năng chịu tải được đo trên cấu hình thực; không hứa10000người bằng cách thêm một mục vào tài liệu. Thanh toán yêu cầu một provider phù hợp được operator chọn và giao dịch/refund thật kiểm chứng khi live credentials sẵn; không cần tích hợp mọi provider thay thế cùng lúc.

## Ba lớp nghiệm thu độc lập

| Lớp | Định nghĩa | Điều kiện đạt |
|---|---|---|
| CODE_VERIFIED | Tính năng có UI/API/data/jobs đầy đủ đúng thiết kế | Test unit/integration/E2E liên quan pass, review đúng SHA, CI xanh; không placeholder |
| PROVIDER_VERIFIED | Các kết nối ngoài đã kiểm chứng đúng môi trường | Contract+failure tests và lượt provider thật có bằng chứng; ghi rõ sandbox/live |
| PRODUCTION_ACCEPTED | Cho phép phục vụ người dùng thật | Quyền nội dung, pháp lý, credential, monitoring, restore/load/device tests và quyết định operator |

Một tính năng không cần provider ngoài có provider trạng thái NOT_APPLICABLE với lý do, không để boolean false gây nhầm. Feature dùng provider mà mới mock không được ghi hoàn tất toàn bộ; giữ CODE_VERIFIED riêng và BLOCKED_EXTERNAL ở acceptance tương ứng.

Ngày 7 nghiệm thu363 yêu cầu ứng dụng hiện hành và báo riêng12 yêu cầu chuẩn bị dữ liệu bên ngoài. Mẫu số code không còn375; không dùng12 mã bên ngoài để tăng phần trăm hoàn tất. Phần ứng dụng chưa đủ ghi TARGET_NOT_MET. Gói dữ liệu chưa có hoặc còn issue blocking giữ BLOCKED_EXTERNAL/BLOCKED_DATA cho nghiệm thu nhập nội dung tương ứng.

## Phần không thể xác nhận bằng việc viết code trong 7 ngày

- Quan sát người dùng thật ổn định14 ngày và payment production ổn định30 ngày như nguồn gốc: giữ bài kiểm tra dài hạn, bắt đầu sau khi có deployment được phép. Không giả lập thời gian để tuyên bố đã quan sát production.
- Báo cáo retention7/30 ngày, planner90 ngày, challenge60 ngày: code và lịch được kiểm bằng synthetic/fake clock; số đo người dùng thật vẫn INSUFFICIENT_DATA đến khi đủ thời gian.
- Độ khó và khả năng đỗ cần mẫu thực và hiệu chỉnh. Có tính năng, có ngưỡng tối thiểu, giải thích phương pháp, không bịa xác suất chính xác.
- Duyệt merchant, domain/DNS, pháp lý, bản quyền và kiểm thử iPhone/Android thật do operator thực hiện; không tự chứng nhận.

Đây là giới hạn của bằng chứng nghiệm thu, không phải hoãn triển khai các tính năng.

## Điều kiện Definition of Done

Mỗi feature phải có đầy đủ tác vụ người dùng, data persistence, quyền, trạng thái lỗi/loading/empty, UI nếu feature có UI, translation và test ánh xạ `feature/<mã>`. Cần commitSHA, baseSHA, reviewer, lệnh/exitcode/timestamps/report, dữ liệu nguồn rõ và provider env khi liên quan. API không thể chỉ trả success cố định. Tính năng disable bởi cờ mặc định mà chưa có đường chạy thật không được DONE.

Chung: lint/typecheck/test/build/frozen lock pass; engine coverage>=90%; DB migrate fresh/seeded; no-answer-leak toàn bộ luồng; security/tenant/entitlement negative tests; exports authorized; migrations compatible; không secrets. Release chặn P0/P1 và các external gate chưa đủ.

## Chế độ thi và học

Thi thật không pause đồng hồ, không tua, không AI gợi ý, không xem đáp án; một lease đang ghi. Practice cho check câu đã trả lời, audio speed/seek và notebook. Event thi đồng loạt giữ đáp án và discussion đến thời điểm publish-results, kể cả bài đã nộp. Lỗi audio/mạng lưu incident flag theo policy đã chốt và có đường operator xử lý.
