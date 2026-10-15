# Kiến trúc JLPT Online đầy đủ V1 V2 V3 V4

## Mục tiêu

Sản phẩm V1–V4 dùng chung lõi câu hỏi, nhóm đọc/nghe, blueprint và immutable exam versions. Phạm vi hiện hành là363 yêu cầu ứng dụng;12 yêu cầu đọc PDF chuyển người chuẩn bị dữ liệu. Sáu worker xây modular monolith TypeScript monorepo, không phải sáu microservice. Dữ liệu được nhập từ gói chuẩn, NLP chỉ xử lý JSON/RichText đã duyệt.

## Thành phần

| Thành phần | Trách nhiệm |
|---|---|
|apps/web|Next.js App Router: public SSG/ISR, exam client lazy-loaded, learning/teacher/account dashboards private|
|apps/admin|Next.js CMS: nhập gói import v2 và đối chiếu với PDF nguồn tùy chọn, question/version/license, explanations, users, billing, reports, moderation|
|apps/api|NestJS+Fastify: auth/tenant, exams/content, attempts, learning, billing, teacher/community, reporting; global default-deny|
|APP_MODE=worker|Cùng image API: outbox relay, expired attempts, analytics, SRS/planner, notifications, provider jobs và retention|
|apps/media-worker|Cloudflare edge kiểm tra token/manifest/entitlement scope trước cache, Range206 và versioned objects|
|tools/import-data và packages/content-tools|Schema/semantic validation, pack/checksum và NLP trên JSON; không mở PDF để nhận dạng câu hỏi|
|packages/schema/api-client|Zod+JSON Schema/OpenAPI executable contract, client generated, fixtures|
|packages/exam-engine|Deadline, score, sheet, timeline, blueprint, mix, difficulty; hàm thuần|
|packages/srs|Adapter FSRS pinned, repeatable reference vectors|
|packages/ui/config|Shared UI, RichText, i18n, theme, tsconfig/lint/build rules|

F01 phải chọn và khóa phiên bản thực tế đã kiểm chứng. Mặc định kế thừa Node24, PostgreSQL17 và stack nguồn; không coi phiên bản/package API hoặc giá trong tài liệu cũ là đã xác minh hiện tại. F02 thực hiện integration spike auth/adapter/ORM/Next self-host theo tài liệu chính thức phiên bản cài.

## Lõi thi

Blueprint theo cấp độ, thời kỳ áp dụng, scoring sections; không hard-code số câu/thời gian. Snapshot không chứa answer key, dùng media keys thay signed URLs. Attempt ghim exam version, server deadline, một write lease. Client IndexedDB trước network; batch seq, one-in-flight; ACK sau DB commit. Submit và expired job dùng cùng transaction/row lock và idempotency. Điểm quy đổi luôn ghi tham khảo.

Event thi đồng loạt thêm registration/start/end/resultReleaseAt. Không trả correct/explanation/transcript/check/export/AI trước embargo dù đã submit. Separate ranking theo level/kind/mode/conditions; opt-in và nickname privacy. Khả năng chống gian lận audio ở client có giới hạn; không hứa kỹ thuật bảo đảm người dùng không thể thu lại file nghe.

## Nội dung và dữ liệu học

QuestionGroup là đơn vị bảo toàn đọc/nghe. ContentLicense kiểm quyền display, remix, transcript, commercial, derivative, AI processing, export; approval hai actor khác nhau. Version immutable, takedown ẩn public nhưng giữ dữ liệu lịch sử cần thiết theo policy. Explanation/transcript cũng versioned và moderation.

Mix lưu seed/config/engineVersion/selection; validate đủ pool, tránh duplicate/near duplicate, weights rounded theo nhóm. Practice có check từng câu đã trả lời; mở answer chỉ trong quyền/chế độ phù hợp. Difficulty/weakness/unseen dùng user_answers projection; không đủ dữ liệu có cold-start behavior và nhãn rõ.

Notebook lexical entries/kanji/grammar có license/attribution; FSRS schedules tách mỗi user/card, review idempotent cross-device. Planner theo timezone và local target date, deterministic plan version, missed-day adjustments không sửa đè audit. NLP corpus theo approved version, dedupe document, frequency type rõ, công bố dataset size/source/date. Không dùng frequency dự báo chắc chắn đề thi tương lai.

## Payment AI và dịch vụ ngoài

EntitlementService dùng chung cho API, web, teacher, AI. Orders/subscriptions/payment attempts/refunds có state machine. Provider webhook raw body signature, replay guards, idempotent event ID, out-of-order reconciliation. Money integer minor units/currency, không float; coupon reserve atomic; không log card/bank secrets. Một provider thật được chọn; fake adapter phục vụ tests nhưng không đủ live acceptance.

AI module học tập giữ adapter, moderation, rate/cost budget atomic, reserve/settle/refund, cancel, timeouts và circuit breaker. Không truy cập đáp án active real exam; generated questions cần duyệt. API học tập khác tài khoản agent đọc PDF bên ngoài; không có chi phí nhận dạng PDF trong sản phẩm.

## Data và events

PostgreSQL authoritative. Ghi event outbox trong transaction, relay BullMQ trên redis-core noeviction. Consumers dùng processed_events unique(eventId, consumer). Failure/retry/DLQ có operator recovery, không double-count payment/stats/streak. Redis-cache có eviction riêng, không dùng cache làm nguồn quyền hoặc số dư. Tenant keys và queries kiểm server-side.

Web analytics tách transactional learning data; consent/retention theo policy. Experiments sticky pseudonymous assignment, metrics định nghĩa trước, không claim tác động nhân quả khi chưa đủ mẫu.

## Nhập dữ liệu chuẩn do người chuẩn bị dữ liệu chuẩn bị

Chủ dự án đọc PDF/ảnh/đáp án/audio theo [chuẩn import v2](CHUAN_DU_LIEU_NHAP.md). Chủ dự án tải ZIP lên admin. API quarantine, kiểm schema, hash, safe paths, media references, đáp án/timeline/nhóm; tạo draft trong transaction, không suy ra hoặc sửa ngầm câu hỏi bằng model. PDF nguồn chỉ là attachment private để đối chiếu, không trigger parser/job nhận dạng. Issues blocking hoặc đáp án/thời lượng chưa biết cho phép lưu nháp nhưng chặn publish. Blueprint chính thức và license vẫn phải kiểm phía server. NLP, thống kê từ vựng, trộn đề chạy trên nội dung có cấu trúc sau duyệt.

## Hạ tầng

Tách coding VPS, staging và production. Coding VPS có sáu user/clone và executor CI với semaphores. Production dùng API, web, admin, app worker, Postgres, redis-core/cache, cloudflared và media edge. Không có service/executor/callback nhận dạng PDF; AI học tập không nằm trong process save/submit. small/large vẫn cần load-test thực tế.

Chỉ thêm shared Next cache khi chạy nhiều web replicas; read replica/search service/managed DB/AWS theo số đo. Việc code phạm vi hiện hành363 yêu cầu ứng dụng không buộc triển khai AWS tuần này. Target tải phải do D2 chốt và đo trên cấu hình thật; 2000/10000 là mục tiêu nếu chọn, không phải kết quả đã có.

## Chỉ tiêu

Engine coverage>=90%; p95 save<300ms, submit<1s, error<0.1% ở tải đã chốt. Lighthouse lab mobile Performance>=90 SEO>=95 JS public<=150KB gzip; RUM p75 LCP<2.5s INP<200ms CLS<0.1 có gắn đo, chưa giả số liệu thực. Backup RPO<=5min, RTO<=1h qua drill. No-answer-leak, tenant/owner/entitlement và idempotent payment/SRS/outbox là release blockers. Chi tiết [KIEM_THU_VA_CHAT_LUONG.md](KIEM_THU_VA_CHAT_LUONG.md).
