# Quyết định và dịch vụ cần chuẩn bị

Lịch bảy ngày giả định operator chuẩn bị sớm tài khoản và dữ liệu. Worker không tự tạo tài khoản, mua/nâng gói, chấp nhận điều khoản, bật merchant live hoặc chi tiền. API production và subscription coding là hai ngân sách riêng. Tài liệu không xác nhận Google cho phép cộng quota của nhiều tài khoản cùng người dùng; operator cần xác nhận phương thức sử dụng trước auto mode.

## Điều kiện ngoài

**Chặn bắt đầu**: coordinator chưa giao task khi thiếu. **Chặn nghiệm thu**: task vẫn được giao, code và test bằng sandbox/fixtures; chỉ PROVIDER_VERIFIED hoặc nghiệm thu của tính năng liên quan giữ BLOCKED_EXTERNAL. Hai cột này phải khớp `tasks.json`; `tools/validate_plan.py` kiểm tra.

| External ID | Cần chuẩn bị | Chủ trì | Chặn bắt đầu | Chặn nghiệm thu | Bằng chứng |
|---|---|---|---|---|---|
|repo-ci|Repo private, bot credential scoped, GHCR/CI và access|Chủ dự án|F01|—|Fresh clone/CI test token không nằm worker|
|coding-vps|VPS coding cho sáu worker và coordinator, tách khỏi staging/production|Chủ dự án/W6|F01|—|Benchmark CPU/RAM/disk/ports theo VAN_HANH_VPS_WORKER.md|
|coding-accounts|Sáu native CLI login hợp lệ, quyền dùng và quota được xác nhận|Chủ dự án|F01|—|CLI smoke từng user, không log token|
|coordinator-runtime|Coordinator ở repo riêng jlpt-coordinator, xây ở ngày 0 theo DAC_TA_RUNNER.md và qua đủ 12 tình huống kiểm thử|Chủ dự án/Claude|F07|—|Báo cáo test của coordinator; thiếu thì giao task thủ công cùng định dạng assignment|
|hosting|Staging thật và production khi được phép; nhà cung cấp chưa chốt. Trước đó staging tạm chạy trong GitHub Actions|Chủ dự án/W6|—|C06 N06 V06 R06|Benchmark CPU/RAM/disk và isolated target; ghi nhà cung cấp đã chọn vào docs/decisions|
|google-oauth|OAuth app, redirect URI, consent/test users, secret broker|Chủ dự án/W2|—|F03|Login/state/error path trên staging|
|email|Resend/SMTP+domain SPF/DKIM/DMARC, Mailpit dev|Chủ dự án/W2|—|F03|Verification/reset email và deliverability test|
|jlpt-blueprints|Nguồn chính thức cho N1–N5, source date, review con số|Chủ dự án/W1|—|C01, N04|Confirmed blueprint versions; chưa xác nhận không dùng làm thi chính thức|
|sample-rights|PDF text/scan, answer/audio hợp pháp; license display/remix/AI/export/commercial|Chủ dự án|—|C05, N04, N05, V05|Rights register và gold dataset; synthetic data đánh dấu rõ|
|prepared-import-data|Chủ dự án tự chuẩn bị import v2, đáp án, ảnh/audio; không tích hợp agent|Chủ dự án|—|N04, V05|Gói vượt validator, còn cần người xác minh nội dung|
|ai-provider|Provider API key/model/budget chỉ dùng cho AI học tập trong sản phẩm|Chủ dự án/W5|—|A05, V05|Actual request/failure/metering, không coding OAuth proxy|
|dictionary|Từ điển Nhật-Việt/reading/POS/examples có license và attribution|Chủ dự án/W5|—|N05, L05, V05|Lookup thực trên entries mẫu và license evidence|
|tts-provider|TTS/audio pronunciation có quyền, voice/locale/budget|Chủ dự án/W5|—|L05, V05|Actual playback/supported error, không silent stub|
|r2|Bucket/prefix media/imports/backups/staging riêng, token scope|Chủ dự án/W6|—|C02, C06|Upload/range/signed read/restore|
|cloudflare|DNS, Tunnel, Access, Turnstile, CDN rules, origin restrictions|Chủ dự án/W6|—|C06|Domain health+admin deny/public cache/bypass|
|payment-provider|Một provider checkout/webhook/refund, sandbox và live merchant onboarding|Chủ dự án/W4|—|L04, V04|Signature/replay tests, sandbox transaction, live verification riêng|
|billing-policy|Giá Free/Premium/org, term, refund/coupon/proration/entitlement rules|Chủ dự án/W4|—|L04|Versioned plan/policy; không tự đặt giá thật|
|privacy-policy|D1 nơi lưu, consent/retention/deletion, TOS, legal review|Chủ dự án|—|A02, trước production|Decision approved; không code tự chứng nhận pháp lý|
|ai-budget|Spending cap per user/tenant/provider/window, moderation và kill switch|Chủ dự án/W5/W4|—|A05|Quota reserve/settle/refund tests và số tiền được duyệt|
|device-test|iPhone Safari và Android Chrome thật, operator thử audio/network/reload|Chủ dự án/W3/W6|—|V06, R03|Device/OS/browser/time + kết quả, không lấy emulator thay thiết bị thật|

Push notification thêm VAPID keys/consent và application URL; newsletter/weekly summary cần opt-out policy. Chưa có thì NOTI provider layer BLOCKED_EXTERNAL, không biến email mock thành browser push thật. Google OAuth và TOTP setup phải dựa đúng library version đã khóa.

## D1 D8 được viết lại cho scope toàn bộ

| Quyết định | Nội dung |
|---|---|
|D1|Nơi lưu và xử lý dữ liệu, privacy/retention; đợi chuyên môn pháp lý, staging chỉ approved synthetic nếu chưa có|
|D2|Target concurrency theoexam/event và giới hạn load test được phép; đo profile thật|
|D3|License theo từng nguồn và quyền display, remix, commercial, transcript, AI processing, export|
|D4|Guest trial enabled, Turnstile/rate limits và account attachment, retention khách|
|D5|Định dạng import v2 do chủ dự án cung cấp; dictionary/TTS/LLM chỉ cho học tập|
|D6|Domains public/admin/media/staging, callback origins và operator access|
|D7|Policy thi thật/event khi network/audio incident, late sync windows, review/result embargo|
|D8|363 yêu cầu ứng dụng target ngày 7;12 yêu cầu chuẩn bị dữ liệu ngoài không tính code; release public theo acceptance riêng, không bỏ tính năng để khớp ngày|

## Mẫu quyết định

Mỗi quyết định ở `docs/decisions/<id>-<slug>.md`: context, options, decision, actor, dateUTC, affectedTasks, approvedBudget, rollback, reviewDate. Chưa có quyết định thương mại thì có thể làm adapter/schema/tests bằng fixtures, nhưng live acceptance không được coi đạt.

## Không có credential vẫn triển khai tới đâu

Giữ đủ code UI/API/jobs/adapter/negative tests trong tuần. Tích hợp provider thật và sign-off vẫn BLOCKED_EXTERNAL nếu thiếu thông tin; ghi owner, thời điểm cần và task ảnh hưởng. Theo chỉ thị hiện hành, chỉ nhận gói chuẩn do chủ dự án tự chuẩn bị; không tích hợp tác vụ đọc PDF. không bỏ checkout/refund để thay trang giá, không dùng câu trả lời AI cố định để gọi AI hoàn thành.
