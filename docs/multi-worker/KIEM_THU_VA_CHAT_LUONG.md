# Kiểm thử363 yêu cầu ứng dụng và kiểm tra dữ liệu bàn giao

Các lệnh trong catalog là script contract cần tạo, không phải lệnh đã chạy trên ứng dụng hiện có. Việc tạo test rỗng mang tên feature không đủ coverage. W6 kiểm363 yêu cầu APPLICATION trong `features.json`↔test metadata↔assertions/report↔commit;12 yêu cầu EXTERNAL_PREPARATION không thuộc code coverage; reviewer kiểm test có kiểm hành vi tương ứng.

## Các lớp kiểm tra

| Lớp | Kiểm tra |
|---|---|
|Static|Frozen lock, lint, typecheck, build, secret scan, generated client/schema no drift|
|Unit|Timer/scoring/sheet/timeline, mix, SRS, planner, coupon math, cold-start/analytics; fake timers đúng biên|
|Integration|Postgres thật,2Redis/outbox, storage/Mailpit; auth/tenant/entitlement, DB constraints/payment/webhook race|
|Contract|Every API typed payload, response, error, permission matrix; gói import v2/provider học tập adapters mock+recorded sanitized fixture|
|E2E|Browser flows đủ 363 feature ứng dụng references;12 đầu vào ngoài không giả làm test ứng dụng, all buttons actual API, auth+roles+tenant+visibility;3engines|
|Provider|Actual sandbox/live requests labeled by environment, AI học tập/dictionary/TTS/email/OAuth/R2/payment/push; no credentials in artifacts|
|NFR|Load/security/a11y/i18n/performance/restore/rollback; actual hardware/runtime recorded|
|Human|iPhone/Android audio, content gold/license/official blueprint, billing/legal/release decisions|

## Nhóm test tối thiểu theo phân hệ

| Nhóm mã | Scenario và negative case bắt buộc |
|---|---|
|ACC|Email/Google/reset/session/profile/avatar/goals/i18n/export/delete; invalid state, expired token, role injection, other-user export|
|LIB|Level/year/session/kind/search/favorites/status/best score/next recommendation/source; public HTML không PII, private labels client-only|
|EXAM AUDIO|Prepare/speaker/timer/selection/marks/seq/save/reload/section-lock/submit/audio speed mode; offline30s, two-tab, seq2-before1, deadline+grace boundaries, seek real rejected|
|PRA MIX|All skill/mondai/count/time pools,7mix modes, ratios/seed/versions/group preservation;1000property cases, license/unapproved/audio missing/shortage errors|
|SCORE EXPL|Hand-calculated reference result, wrong/blank/filter/compare/time/PDF, target/no-data prediction; pre-submit correct/transcript/AI leak tests, approved version only|
|STAT|By-skill/mondai/month/time/answer-change/new-vs-seen; seed data replay identical, insufficient-data response|
|VOC|Lookup/readings/POS/meaning/license, notebook/card/FSRS/quiz/export/TTS/sync; duplicate review/concurrent version, foreign-owner card, CSV formula|
|DATA|Text normalization, NLP word baseforms, source-role distinctions, count by dataset/level/time/rank, grammar/kanji, CSV/XLSX/gaps; document dedupe, provenance/rights|
|PLAN|30/60/90day schedule, timezone/date/countdown/minutes/goals/missed-day replan/revision; fake time not real90day evidence|
|AI|All13content actions+policy14, budgetreserve/settle/refund/cancel, moderation/labeled output; prompt injection, cross-user retrieval, real-exam denial, provider failure|
|PDF QB|Gói chuẩn, batch, answers/audio/ruby/star/table, image, issues, source-page tham chiếu, version, JSON/CSV, reimport; không test chức năng tự trích PDF; corrupt/encrypted/oversized/zip-slip/bomb/magic-bytes cases|
|ADM|Every20admin capability has UI+API+role guard+audit; editor cannot self-approve, admin wrong Host404, unauthorized restore/export denied|
|TEA|13capabilities teacher/org/class/invite/assignment/analytics/supplement/export; cross-tenant, membership expiry, role change, enrollment checks|
|GAME|Streak/badge/challenge/ranking/share/discussion/event/class stats; replay/timezone, ranking consent, incomparable modes, result embargo, moderation|
|PAY|Free/Premium/org/coupons/upgrade/renew/cancel/refund/AI quota/revenue; invalid signature, replayed/out-of-order webhook, race double charge, negative rounding/amount tamper|
|NOTI|All10notification types+preferences+quietHours, push permission denied, email retry; opt-out at delivery, dedup/idempotent weekly/event jobs|
|SEO|All12public/CMS/metadata/sitemap/JSON-LD/OG/price/FAQ/analytics/landing; SSG no cookie, private noindex, sanitize blog, consent before tracking|
|SYS|All20NFR tracked by named suite; access/backup/load/session/privacy/incident/retention; record actual target/environment|
|REPORT|All15metrics calculated from known fixture dataset, retention cohort maturity, import-data/errors/mix/conversion/cost/experiments; synthetic/observed labels, no fake causal claim|

## Ngưỡng và môi trường

Engine coverage>=90%, không hạ coverage/bundle/Lighthouse để CI xanh. Perf lab mobile>=90, SEO>=95, public initial JS<=150KB gzip; check actual version output/build analyzer thay script đo sai framework version. RUM targets p75 LCP<2.5s INP<200ms CLS<0.1; production chưa có traffic thì chỉ ghi instrumentation verified.

k6 tăng bậc đến mục tiêu D2, đo p95save<300ms/submit<1s, error<0.1%; target hosting profile và background jobs cùng bật theo sản phẩm thật. Generator ở máy khác, không testload lúc đangbuild/restore. Record ramp, arrival pattern, cache state, DB size, connection pool, CPU/RAM/I/O, errors. Không mặc định2000/10000pass.

Backup drill actual timestamps, RPO<=5min/RTO<=1h, fresh restore verify counts/checksums, rollback old code on expanded schema. Restore dry-run không gửi notification/payment thật. Security matrix auth/session/2FA/CSRF/Origin/IDOR/tenant/entitlement/answer embargo, secret redaction; ZAP/CodeQL/deps issue có triage thật.

## Bằng chứng

Mỗi run lưu taskId, featureIds, testFiles, testNames, headSHA, baseSHA, environment, dataVersion, providerMode, startedAt, finishedAt, command, exitCode, report/artifact paths, reviewer verdict. Screenshot/video chỉ bổ sung UI, không thay assertion/DB checks. Artifacts ở CI/private storage, không commit secrets, copyrighted PDFs/audio hoặc raw PII.

Một test có thể cover nhiều yêu cầu khi assertions kiểm từng hành vi. Ma trận375 mã nguồn không tương đương363 yêu cầu ứng dụng đã pass;12 mã chuẩn bị thủ công không có test ứng dụng giả. Missing/empty/skipped tests, provider placeholder hoặc thiếu lệnh làm verifier fail. Baseline yêu cầu ứng dụngTODO, đầu vào thủ côngEXTERNAL_INPUT_REQUIRED và evidence rỗng.

## Nghiệm thu cuối

R06 chạy trên một release candidate immutable, tổng hợp PASS/FAIL/BLOCKED từng yêu cầu ứng dụng, báo riêng12 đầu vào chuẩn bị bên ngoài và lớpcode/provider/production. P0/P1 defect chặn code acceptance; P2 feature chưa xong vẫn làm scope chưa đạt. Không chỉ lấy nhãn ưu tiên gốcP2 để bỏ qua. Báo cáo ngày 7 bao gồm phần còn thiếu, thời gian/cost actual và lịch quan sát dài hạn; không tự xin thông qua bằng việc đổi tiêu chí.
