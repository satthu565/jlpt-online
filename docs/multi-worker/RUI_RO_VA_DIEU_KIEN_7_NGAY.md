# Điều kiện và rủi ro của mục tiêu bảy ngày

Phạm vi V1–V4 hiện hành gồm 363 yêu cầu ứng dụng và 12 yêu cầu chuẩn bị dữ liệu bên ngoài trong bảy ngày là mục tiêu rất gấp và có rủi ro cao. Sáu worker tăng lượng việc độc lập nhưng không loại bỏ phụ thuộc, review, tích hợp, quota hoặc thời gian dịch vụ ngoài. Chưa có benchmark coding throughput, không thể đưa ra xác suất hay cam kết hoàn tất đáng tin cậy.

## Điều kiện để lịch có cơ hội đạt

1. Operator sẵn sàng tài khoản và quyết định quan trọng trước khi task cần, đặc biệt gói dữ liệu chuẩn, AI học tập/payment/dictionary/rights và blueprint.
2. Native CLI hoạt động hợp lệ trên VPS; không mặc định quota sáu tài khoản là tổng hạn mức được phép. Pause worker affected, chấp nhận khả năng lịch trễ khi quota hết.
3. F01/F02/F08 bàn giao sớm, khóa schema/API, fixtures và migrations; frontend/admin làm theo mock contract rồi nối API thật.
4. Mỗi gói việc đủ nhỏ để review, CI và integration; không đợi cuối tuần mới ghép cả module.
5. Resources đủ chạy sáu phiên và bounded heavy tests; CI/load target không tranh tài nguyên với build không được kiểm soát.
6. Reviewer dùng trong sáu worker; thời gian review/sửa lại là chi phí thật, không tính sáu coding workers cộng thêm reviewer miễn phí.

## Mức rủi ro và phản ứng

| Rủi ro | Dấu hiệu | Phản ứng giữ nguyên phạm vi |
|---|---|---|
|Throughput ước lượng quá thấp|Actual/estimate>1.5 hoặc critical path trễ|Chia nhỏ PR, ưu tiên unlock dependencies, thông báo forecast mới; không cắt tính năng|
|Schema/lockfile xung đột|Nhiều owner đổi contract/journal|Một owner và lock; regenerate trên manifests hợp nhất, test lại|
|Coordinator chưa sẵn ở ngày 0|Runtime tests fail/restart mất task|Chưa bật auto; operator cấp assignment cùng policy/log trong thời gian sửa|
|Provider/merchant thiếu|Credentials/legal/onboarding chưa đủ|Hoàn tất code độc lập, giữ external blocker và không pass fake|
|Dữ liệu chuẩn bị sai hoặc thiếu|Thiếu đáp án, hình, audio, timeline hoặc người duyệt phát hiện sai|Trả lỗi có JSON path, giữ draft, bạn sửa gói và tăng revision; không gọi model sửa ngầm|
|Load thiếu capacity|p95/error/RAM vượt ngưỡng|Profile tuning theo số đo, operator duyệt tài nguyên; không giảm correctness hoặc test load giả|
|Migration/payment/event lỗi|Race, replay, embargo/tenant leak|Chặn release, sửa owner, rerun affected regression trên RC mới|
|Feature coverage có tên nhưng thiếu hành vi|375IDs nhưng test trống/button giả|Verifier và reviewer reject; status chưa đạt|
|Scope kéo toàn bộV4|Teacher, AI, community báo cáo cùng đòi core data|Hợp đồng platform trước, streams theo task DAG; không thay microservices cho nhanh|

## Cách diễn giải mô phỏng lịch

`tools/validate_plan.py` mô phỏng dependencies và một task/worker từ ước lượng giờ và baseline notBefore. Đây là lower-bound đơn giản, không tính đầy đủ human/provider delays, review độc lập, các vòng sửa, bounded build contention hay throughput thực tế. Validator xuất cả task trễ target ngày và tổng thời gian; không sửa giờ ước lượng chỉ để làm báo cáo xanh.

Daily forecast dùng actual durations, queue waits và quota; ước lượng remaining recompute theo graph. Nếu forecast vượt168 giờ, ghi TARGET_AT_RISK ngay; cuối ngày 7chưa đủ 363 yêu cầu ứng dụng ghi TARGET_NOT_MET và còn lại bao nhiêu. Tiếp tục thực hiện scope thay vì tự chuyển thành bản demo.

## Phần giữ quan sát ngoài cửa sổ tuần

Code tính năng planner90 ngày, challenge60 ngày, retention30 ngày, payment30 ngày, beta14 ngày phải được viết và kiểm thử trong tuần. Số liệu người dùng thật hoặc thời gian vận hành quan sát chưa đủ không thể gọi pass; trạng thái code và observation khác nhau. Bảng release decision lưu cả hai, không trì hoãn viết code nhưng cũng không giả vờ đã có dữ liệu.

## Mẫu báo cáo cuối ngày

Actual commits/merged tasks, features code/provider accepted, task blockers, critical path forecast, worker quotas/CPU/CI queue, cost AI học tập/hosting và thời gian chuẩn bị dữ liệu thủ công, defects P0/P1, điều operator cần xử lý và kế hoạch24 giờ tiếp. Báo cáo không dùng phần trăm theo số file hoặc token làm phần trăm hoàn thành sản phẩm.
