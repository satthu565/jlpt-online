# Lịch triển khai toàn bộ tính năng trong bảy ngày

Ngày 1 là lúc bắt đầu sau khi chuẩn bị tối thiểu; không tự gắn ngày 15/10/2026 là ngày bắt đầu. Mỗi ngày có 24 giờ lịch; các phiên agent chạy tự động nhưng có quota, review, chờ CI và giới hạn tài nguyên. Ước lượng task trong catalog chưa đo, không đồng nghĩa sáu worker làm hiệu quả liên tục 24/24.

Mục tiêu: code đủ 363 yêu cầu ứng dụng hiện hành;12 yêu cầu đọc PDF do chủ dự án chuẩn bị bên ngoài, không phải task xây phần mềm. Nghiệm thu trên candidate tích hợp ngày 7. Chưa đạt thì báo đúng phần thiếu và tiếp tục cùng scope; không tự cắt các yêu cầu còn trong phạm vi như thanh toán, AI, lớp học hoặc phần khó để giữ ngày kết thúc.

## Lịch bàn giao

| Ngày | W1 Dữ liệu và engine | W2 API | W3 Web | W4 Admin thương mại | W5 Dữ liệu và học AI | W6 Hạ tầng kiểm chứng |
|---|---|---|---|---|---|---|
|1|F02 contract; F08 DB|F03 auth RBAC email|F04 layout i18n auth|F05 admin auth|F06 chuẩn dữ liệu và mẫu bàn giao|F01 repo/CI; F07 kiểm chứng coordinator/VPS|
|2|C01 timer score token|C02 storage nội dung license|C03 exam UI sync|C04 editor qbank blueprint|C05 validator gói nhập|C06 staging CDN backup release|
|3|N01 mix/practice engine|N02 attempts/security; B01 import/publish|N03 thi nghe results library|N04 PDF đối chiếu duyệt xuất bản|N05 NLP từ điển dữ liệu|N06 kiểm chứng vertical slice|
|4|L01 SRS difficulty dedupe|L02 API luyện giải thích notifications|L03 UI mix/practice analytics|L04 payment plans refunds coupons|L05 notebook/planner APIs|L06 integration learning/payment|
|5|A01 schema nâng cao|A02 teacher events community privacy|A03 UI learning teacher billing|A04 admin CMS reporting experiments|A05 AI gamification corpus API|Chuẩn bị full suite, review chéo và kiểm tra staging|
|6|V01 hardening export PDF|V02 API security fixes|V03 AI UI SEO corpus exports|V04 admin reconciliation|V05 dữ liệu nhập và AI học tập|A06 coverage toàn bộ, rồi V06 full regression load restore|
|7|R01 chốt engine contract|R02 chốt API|R03 sửa lỗi thiết bị web|R04 chốt admin payment|R05 chốt dữ liệu nhập AI học|R06 RC cuối, matrix evidence, bàn giao|

## Bàn giao trong ngày 1

F01 ưu tiên hoàn tất nền sớm; F02 xuất schema/OpenAPI/fixtures đầu tiên ngay sau đó. F08 tạo schema DB. F03 auth cần F08; web/admin chuẩn bị đọc/thiết kế trước nhưng nghiệm thu F04/F05 phải chờ auth thật. W5 chuẩn bị hợp đồng và gói mẫu sau F01, không thực hiện đọc PDF tự động. Coordinator được xây ở ngày 0 trong repo riêng; F07 kiểm chứng nó trên VPS trước khi bật giao việc tự động. Khi chưa sẵn, operator cấp task bằng cùng assignment format và log thủ công. F07 không nằm trên đường găng: C06 chỉ phụ thuộc F01 và F08. Không triển khai bằng nhiều bản runner A/B cũ.

## Gate và bằng chứng từng ngày

| Mốc | Bằng chứng tối thiểu | Khi chưa đạt |
|---|---|---|
|D1|Fresh clone build/tests, DB migration, auth chạy với Mailpit/OAuth thử, OpenAPI+fixtures, `workers check` và dry-run của coordinator|Ghi task chậm và critical path; worker khác làm task đủ deps|
|D2|Engine unit/coverage, qbank storage tests, gói import v2 hợp lệ và nháp lỗi, staging backup/restore baseline|Không dùng mock/provider lỗi làm bằng chứng pass|
|D3|Bạn chuẩn bị gói→upload→validate→edit→review→publish→thi→score→review trên staging|Chặn task cần dữ liệu/core sai; cho phần độc lập tiếp tục|
|D4|Mix đủ 7 chếđộ, SRS/planner, payment sandbox/provider evidence, outbox replay|Báo external blocker có owner và task ảnh hưởng|
|D5|363 yêu cầu ứng dụng có delivery path/test spec;12 yêu cầu chuẩn bị dữ liệu được theo dõi riêng|Chưa có test thật hoặc feature thiếu vẫn TODO; A06 không tự biến coverage thành DONE|
|D6|Full regression3 browser, security/tenant, stepped load, restore/rollback và thiết bị thật|Sửa P0/P1 đúng owner, không hạ ngưỡng|
|D7|Final commit,363 yêu cầu ứng dụng có evidence;12 đầu vào thủ công báo riêng, provider matrix, acceptance decision, runbooks|TARGET_NOT_MET nếu thiếu; không đổi thành scope rút gọn|

Daily gates báo tiến độ, không ép các task độc lập chờ qua ngày. notBeforeHour trong catalog là baseline để mô phỏng; coordinator có thể kéo task lên sớm khi đủ deps/locks nếu owner xác nhận, ghi scheduledAt. Không bỏ dependency bảo vệ correctness để kéo lịch.

## Đường phụ thuộc cần theo dõi

F01→F02→F08→F03 mở web/admin/API; C01+C02→N02→N03 và B01→N04→N06 mở vertical slice. N01/N05→L01→L05 cùng L04 mở learning/billing; A01→A02→A03→A06 và V01→V03→V06 là chuỗi dễ chậm. R06 chỉ sau cả năm owner chốt.

Mô phỏng bản nháp cho thấy A06 chưa thể hoàn tất ngày 5 vì phải chờ toàn bộ module, nên lịch hiện hành đặt việc này đầu ngày 6 trước regression V06. Không giảm giờ ước lượng để làm báo cáo xanh. Mô phỏng không tính đủ provider latency, mọi vòng sửa, review hoặc contention; dùng làm cảnh báo cấu trúc, không bằng chứng đảm bảo7 ngày.

## Ngày 0 chuẩn bị

Bắt buộc trước ngày 1 (chặn bắt đầu): repo product riêng và CI, VPS coding, 6 worker login hợp lệ. Nên xong ở ngày 0: coordinator đã qua 12 tình huống kiểm thử. Các điều kiện còn lại chỉ chặn nghiệm thu, nhưng có càng sớm càng đỡ trễ: gói dữ liệu chuẩn, blueprint chính thức, quyền sử dụng, AI học tập, dictionary/TTS, payment sandbox, OAuth, staging/R2 và email. Operator chuẩn bị thiết bị iPhone/Android và thời gian xác nhận JLPT/rights. Những điều chưa đủ ghi trong external board; lịch không xóa chúng khỏi nhiệm vụ ngày 7.
