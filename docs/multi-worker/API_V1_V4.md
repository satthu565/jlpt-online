# Hợp đồng API toàn bộ V1 V2 V3 V4

Đây là hợp đồng thiết kế để F02 chuyển thành OpenAPI/Zod executable, không phải mô tả endpoint đã tồn tại. API V1 core ở [hợp đồng nền A8](HOP_DONG_KY_THUAT.md). Các route dưới đây bổ sung và làm rõ đầy đủ admin và V2–V4; không cho mỗi worker tự đoán payload. F02 phải xuất schema/example cho từng route và CI phát hiện drift. Đổi route/schema sau F02 cần contract PR.

## Quy ước chung

Prefix `/api/v1` giữ cho toàn bộ phiên bản sản phẩm; V1–V4 là nhóm tính năng, không tự đổi HTTP prefix. JSON camelCase, UTC ISO8601, UUIDv7; cursor paging `{items, nextCursor}` với limit1–100. Envelope lỗi `{error:{code, message, details, requestId}}`; message i18n hoặc locale request nhưng client quyết định theo code.

POST tạo resource trả201; action trả200/202 nếu async; DELETE mềm trả204. POST request có side effect retry dùng header `Idempotency-Key`; owner/tenant và body hash cùng key phải khớp, body khác trả409 IDEMPOTENCY_CONFLICT. Webhook dedupe theo provider eventId, không tin client idempotency key.

Vai trò theo mục A2 của [HOP_DONG_KY_THUAT.md](HOP_DONG_KY_THUAT.md): public; self có session; staff (`admin`, `editor`, `reviewer`, `moderator`, `billing_admin`) cần role +2FA +ADMIN_HOST; `org_manager`/`teacher` là vai trò theo tổ chức, cần org membership và quyền assignment; operator là người vận hành hạ tầng, không phải tài khoản ứng dụng và khác coding worker. Mọi write có Origin/CSRF/session guard trừ webhook/callback dùng chữ ký riêng. Không serialize DB entity trực tiếp. Header/body/userId không được tự quyết tenant.

MediaToken có scope attempt/review; share token chỉ cho đề/cấu hình được phép, không answer key. Event result embargo áp dụng cho tất cả route, không chỉ endpoint review. Cấm AI học tập trong active real attempt. Exports có download job + URL scope user hết hạn.

## Schema chung mở rộng

| Schema | Trường và ràng buộc |
|---|---|
|PageQuery|cursor?, limit?, sort? theo allowlist; không truyền raw SQL/filter|
|Money|amountMinor integer>=0, currency enum theo provider; rounding policy ghi trong billing decision|
|ActorContext|server-derived userId, tenantId?, roles, entitlements; không nhận làm authoritative từ client|
|ResourceVersion|id, version, createdAt, createdBy, status; PATCH có If-Match version,409 VERSION_CONFLICT|
|AsyncJob|id, status queued/running/succeeded/failed/cancelled, progress, artifacts, errorCode?, retryable; không có provider key|
|SourceRights|sourceId, licenseId, displayAllowed, remixAllowed, commercialAllowed, transcriptAllowed, aiProcessingAllowed, exportAllowed, expiresAt?|
|QuestionDraft|level, sectionCode, mondaiType, skill, instructions:RichText, passage:RichBlock[]?, mediaIds, questions[{tempId, stem, options, correctOption, explanationId?, tags}], sourceRef, sourcePage, rights; đáp án chỉ staff|
|PracticeConfig|level, skills[], mondaiTypes[], questionCount in10/20/30/50, sourceIds[], pool wrong/unseen/marked/random/tagged/difficulty, timeLimitSec? >0, tagIds[], difficultyRange?; count theo nhóm có shortage|
|MixConfig|level, sourceSessions[], sourceWeights, skills[], mondaiTypes[], mode Random/Balanced/Weakness/Unseen/Challenge/Revision/Custom, seed?, blueprintVersion, questionCount?, difficultyRange?, maxExposure?|
|GeneratedExam|id, examId, version, seed, engineVersion, configHash, selectionGroupIds, sourceSummary, warnings, blueprintConformant; không answer keys|
|ExplanationDraft|questionId, contentVersion, correctReason, wrongReasonsByOption, translation, grammarTags, vocabTags, transcript?, evidenceRanges[], language, origin, humanReviewed; public chỉ approved và được phép|
|CardReview|clientReviewId UUID, cardId, rating enum FSRS adapter, reviewedAtUTC, durationMs, expectedVersion; server validate time/skew|
|StudyPlanConfig|targetExamDate local date, timezone, minutesPerDay, days30/60/90, skillWeights, daysOff[], goals; server schedule versioned|
|PaymentCreate|planId, term month/quarter/year, quantity?, couponCode?, returnPath allowlisted; amount tính lại server|
|AIRequest|action enum trong bảng AI, questionId?/attemptId?/notebookId?, message?, locale; không nhận system prompt/providerKey/answerKey từ client|
|AssignmentCreate|examId hoặc mixConfig, dueAtUTC, opensAtUTC, attemptPolicy, learnerIds?; membership validate server|
|EventCreate|examId, opensAt, startsAt, endsAt, resultReleaseAt, capacity, lateSyncWindowSec=0, rankingScope; require opens<=starts<ends<=release|
|ReportQuery|from, to, timezone, groupBy allowlist, level?, tenantId server-scoped, cohortMode; bounds hạn chế scan|
|ExportRequest|kind PDF/CSV/XLSX/JSON, resourceId?, filters?, locale; license/role/tenant check ở create và download|

## Tài khoản và quyền riêng tư

| Route | Quyền | Request | Response hoặc invariant |
|---|---|---|---|
|`/auth/*`|public/self|Theo Better Auth version F01 khóa|Email verify/reset, Google OAuth, state, session, TOTP; adapter không tự đoán cookie API|
|`GET/PATCH /me`|self|name, targetLevel, targetExamDate, targetScore, locale, timezone|Profile và counters; không sửa role/tenant/plan qua đây|
|`POST /me/avatar`|self|multipart image|Sanitized image URL; max size/MIME/magic bytes|
|`GET/DELETE /me/sessions/:id?`|self|sessionId khi revoke|Chỉ session chính mình; revoke current logout|
|`POST /me/data-exports`|self|ExportRequest kind JSON|AsyncJob; scoped download; audit|
|`POST/GET /me/deletion-request`|self|confirmation/reason optional|DeletionRequest status; không tự xóa ledger phải giữ theo policy|
|`GET/PATCH /me/consents`|self|purpose/version/granted|Consent records; analytics chỉ bật sau đồng ý khi cần|
|`GET/PATCH /me/notification-preferences`|self|channel, type, enabled, quietHours, timezone|Preference version; required transactional/security policy tách marketing|

## Admin nội dung và nhập gói dữ liệu chuẩn

Mọi route bảng này nằm dưới `/admin`, cần staff/2FA/ADMIN_HOST; reviewer quyền duyệt, editor quyền soạn, admin quyền cấu hình. Bulk actions kiểm quyền từng resource, không dùng quyền đọc để ghi.

| Resource route | Request và thao tác | Response và kiểm tra |
|---|---|---|
|`GET/POST /sources`, `GET/PATCH/DELETE /sources/:id`|Source name, level, year, session, origin, licenseId, sourceUrl|SourceVersion; license referenced không xóa cứng|
|`GET/POST /licenses`, `GET/PATCH /licenses/:id`|SourceRights+evidenceRef+legalApproval|License; expire/takedown ngừng publish/remix/download theo policy|
|`POST /media`, `GET /media/:id`|multipart bytes, type, sourceId; safe preview|Media sha256, MIME, duration, width, height; upload không public đáp án/PDF|
|`GET/POST /groups`, `GET/PATCH/DELETE /groups/:id`|QuestionDraft, If-Match; filters level/source/skill/status/text|Versioned Group; answer fields chỉ authorized staff|
|`POST /groups/:id/submit-review`|expectedVersion|in_review; không sửa bản đã submit mà không version transition|
|`POST /groups/:id/reviews`|decision approve/reject, comment, expectedVersion|Review; reviewer!=lastEditor; invalid version/state409|
|`POST /groups/:id/hide`|reason|Ẩn khỏi future pool, giữ historical snapshot|
|`GET /groups/:id/versions`|PageQuery|Immutable version history/actor/diff|
|`POST /duplicates/scan`, `POST /duplicates/:id/resolve`|scope; decision duplicate/distinct|AsyncJob/curator resolution; không tự merge historical IDs|
|`GET/POST /blueprints`, `POST /blueprints/:id/versions`|Blueprint schema nguồn confirmed|Immutable version, sourceRef required|
|`POST /blueprints/:id/activate`|version|Chỉ blueprint có official validation; synthetic fixture không publish original|
|`GET/POST /exams`, `GET/PATCH /exams/:id`|kind, level, title, slug, blueprintVersion, sourceRefs|Exam draft, version; slug unique|
|`PUT /exams/:id/items`|ordered groupVersionIds, sectionCodes|Validate group/pool/version/rights; giữ reading/audio groups|
|`POST /exams/:id/validate`|expectedVersion|Violations code/severity/expected/actual|
|`POST /exams/:id/publish`|expectedVersion, Idempotency-Key|ExamVersion và outbox; snapshot strict no answers; atomic DB + object publication staging protocol|
|`POST /exams/:id/unpublish`|reason|Takedown event, CDN purge; không xóa answer keys bài cũ|
|`POST /imports`|multipart packages[] là ZIP import v2 theo CHUAN_DU_LIEU_NHAP.md|202 AsyncJob validate/import; PDF đơn lẻ không khởi động trích xuất; source rights và content hash|
|`GET /imports`, `GET /imports/:id`|filters/status|Progress/schema errors/issues; không tác vụ nhận dạng hoặc provider trích xuất|
|`POST /imports/:id/retry`, `POST /imports/:id/cancel`|expectedState|Idempotent; không ghi artifact của lần stale|
|`GET/PATCH /imports/:id/groups/:groupId`|QuestionDraft correction|DraftVersion, sourcePages, issues; PDF tham chiếu tùy chọn chỉ để người duyệt xem|
|`PUT /imports/:id/listening-timeline`|segments `{groupId, mediaKey, startMs, endMs, audioStartMs, audioEndMs, gapAfterMs}`, đúng dạng import v2 và snapshot (A5)|Validate order/nonnegative/duration/reference|
|`GET /imports/:id/preview`|authorized format|Student-shaped snapshot without answers|
|`POST /bank/imports`, `POST /bank/exports`|JSON/CSV file; ExportRequest|AsyncJob, roundtrip schema, formula injection protection|
|`GET/POST /explanations`, `PATCH /explanations/:id`|ExplanationDraft|draft version; source/license|
|`POST /explanations/:id/reviews`|decision/comment/version|Approved explanation; author!=reviewer|
|`GET/PATCH /content-reports/:id?`|type/question/explanation report, status/resolution|Staff moderation; reporter privacy|
|`GET/PATCH /users/:id?`|role/block flags; administrative scopes|Cannot self-grant prohibited roles; audit mandatory|
|`GET /audit-logs`, `GET /dashboard`|ReportQuery|Redacted audit/counters; tenant scope|

Publish object protocol: tạo staged objects content hash, validate, DB transaction reserve immutable version+outbox; publish-state pending/ready; chỉ list/download ready; lỗi object upload retry idempotent không để public version thiếu media. CDN revalidate/purge qua outbox và retry. Không tuyên bố object store và SQL có chung transaction.

## Thi luyện trộn và chữa bài

Attempt endpoints create/section/sheet/submit/resume/media-token/get/review trong hợp đồng nền. Cùng các response đã định nghĩa, bổ sung assignmentId/eventId optional ở create, nhưng server kiểm enrollment/time/entitlement. `Result` có reference score và event visibility status; trước event result release không trả answer-bearing fields.

| Route | Quyền | Request | Response và invariant |
|---|---|---|---|
|`POST /practice-exams`|self+entitlement|PracticeConfig|GeneratedExam hoặc422 POOL_SHORTAGE; count/group policy rõ|
|`POST /mixed-exams`|self+entitlement|MixConfig|GeneratedExam warnings/ratioActual; sourceWeight shortage không bỏ qua|
|`GET /generated-exams`, `GET /generated-exams/:id`|owner|PageQuery|Saved config/selection, không keys|
|`POST /generated-exams/:id/regenerate`|owner|newSeed?; Idempotency-Key|Bản mới, không sửa bản từng làm|
|`POST /generated-exams/:id/shares`|owner+rights|expiresAt?, accessPolicy|Share token scope; link không bypass paywall/license|
|`GET /shared-exams/:token`|public hoặc authorized theo policy|token|Metadata; start vẫn cần quyền và mode|
|`PUT/DELETE /me/question-marks/:id`|self|questionVersionId, tag?|Mark/unmark for practice|
|`POST /attempts/:id/check`|owner practice|lease, index|Correct/explanation chỉ câu đã trả lời; forbidden real/event embargo|
|`GET /attempts/:id/explanations/:index`|owner đúng visibility|index|Approved ExplanationDraft public subset +evidenceRanges|
|`POST /content-reports`|self|questionVersionId/explanationId, reason, details|Report id, status; rate limited|
|`GET /me/exam-status`|self|level|BestScore, attempts, favorite, status; không nằm public cached HTML|
|`PUT/DELETE /me/favorite-exams/:id`|self|examId|Favorite state|
|`GET /me/recommendations`|self|level, goal?|Source/dataset/method labels và cold-start fallback|
|`POST /attempts/:id/exports`|owner+visibility|ExportRequest PDF|AsyncJob/download; private noindex|

## Notebook SRS planner và dữ liệu từ vựng

| Route | Quyền | Payload/query | Response |
|---|---|---|---|
|`GET /dictionary/lookup`|self hoặc public license|text, locale|entry, readings, POS, meaning, examples, license, pronunciationUrl?|
|`GET/POST /me/notebook-items`, `PATCH/DELETE /me/notebook-items/:id`|self|kind vocab/kanji/grammar, entryId, sourceQuestionId?, mastered, tags|Versioned notebook item; source content visibility check|
|`POST /me/notebook-items/:id/cards`|self|template|Cards idempotent; canonical learning item reference|
|`GET /me/srs/due`|self|timezone, limit|Due cards safe content|
|`POST /me/srs/reviews`|self|CardReview|nextDueAt, scheduleVersion; stale version409, duplicate clientReviewId same outcome|
|`POST /me/notebook-quizzes`|self|filters, count, seed?|Practice resource; do not mix real exam modes|
|`POST /me/notebook-exports`|self|CSV/JSON filters|AsyncJob authorized; escape spreadsheet formula|
|`GET/POST /me/study-plans`, `PATCH /me/study-plans/:id`|self|StudyPlanConfig|Versioned plan, local day sessions|
|`POST /me/study-plans/:id/replan`|self|missedSessions, reason|New plan version; no historical mutation|
|`PUT /me/study-sessions/:id/completion`|self|clientEventId, status, durationMs|Completion idempotent; events for streak/notifications|
|`GET /me/analytics`|self|ReportQuery|By skill/mondai/time, new-vs-seen, answer-change patterns; sampleSize/method|
|`GET /datasets`, `GET /datasets/:id`|public rights|PageQuery|Corpus source, size, version, updatedAt, dedupe method|
|`GET /datasets/:id/vocabulary`, `/grammar`, `/kanji`|public rights|level/year/session/time range/skill|Stats counts/ranks/provenance, không full question text nếu chưa có quyền|
|`GET /datasets/:id/entries/:id`|public/self rights|entryId|Occurrences count/allowed examples, comparisons/trends|
|`GET /me/dataset-gaps`|self|datasetId|Frequent-not-mastered links to notebook/practice|
|`POST /datasets/:id/exports`|authorized rights|CSV/XLSX, ReportQuery|AsyncJob; source attribution|
|`POST /tts`|self+quota+license|entryId, locale, voice allowlist|Scoped audio or provider failure; budget reservation|

## AI

`POST /ai/requests` self+entitlement nhận AIRequest, trả202 AsyncJob hoặc stream đã định nghĩa qua SSE. `GET /ai/requests/:id` và `DELETE /ai/requests/:id` chỉ owner, cancel phải settle/refund budget. `GET /me/ai-usage` trả quota/spend/reset windows, không provider key. Provider timeout/circuit-open trả retry policy, không giả response học tập thành công.

Actions: explain_question, analyze_grammar, compare_options, explain_reading, analyze_transcript, ask_context, memory_hint, grammar_example, generate_question, detect_repeated_errors, recommend_practice, weekly_summary, generate_flashcards. Các action sinh nội dung công khai tạo draft/ai_generated, đi staff review qua `/admin/ai-content/:id/reviews`; chưa approve không xuất bản. Action14 giới hạn/kiểm duyệt là policy bắt buộc toàn bộ, có API admin budget/moderation settings.

## Thanh toán và gói

| Route | Quyền | Payload/query | Response hoặc invariant |
|---|---|---|---|
|`GET /plans`|public|locale, org?|Plan terms/price, currency/entitlements; no hidden feature promise|
|`POST /checkout-sessions`|self|PaymentCreate|checkout URL provider allowlist, server amount/orderId|
|`GET /me/subscription`, `GET /me/transactions`|self|PageQuery|State/history; no sensitive provider payload|
|`POST /me/subscription/change`, `/cancel`, `/renew`|owner|plan/term, effectiveAt policy, Idempotency-Key|Subscription transition/proration quote if applicable|
|`POST /me/refund-requests`|owner|transactionId, reason|Request pending/approved/provider state; không tự coi provider refund done|
|`POST /webhooks/payment/:provider`|signature only|Raw body+signature+timestamp|Verify raw bytes; dedupe+out-of-order, state reconcile; no session CSRF|
|`GET /me/entitlements`|self|scope?|Effective grants/expiry/quota; server vẫn kiểm mọi request|
|`/admin/plans`, `/admin/coupons`|admin|Versioned plan/coupon, maxUses, expiry, scope|Atomic reserve/redeem, zero/negative/expired rejected|
|`/admin/payments`, `/admin/refunds`, `/admin/subscriptions`|admin billing|Query/approved actions|Audit provider reconciliation and approval limits|
|`GET /admin/reports/revenue`|admin|ReportQuery|Gross/refund/net, minor units, currency separated|

## Giáo viên lớp học sự kiện và cộng đồng

| Route | Quyền | Payload/query | Response hoặc invariant |
|---|---|---|---|
|`POST /teacher-applications`|self|profile, org?|Application state; approval/admin policy|
|`GET/POST /organizations`, `GET/PATCH /organizations/:id`|membership/manager|name, settings|Org; quotas/entitlements tenant plan|
|`GET/POST /organizations/:id/classes`|teacher/manager|name, level|Class; teacher scope|
|`POST /classes/:id/invitations`|teacher|expiresAt, maxUses|Invitation token hash stored, revoke/expiry|
|`POST /class-invitations/:token/join`|self|token|Enrollment; duplicate membership idempotent|
|`GET/DELETE /classes/:id/members/:userId?`|teacher/self policy|PageQuery|Only class membership, not arbitrary user data|
|`POST /classes/:id/assignments`|teacher|AssignmentCreate|Assignment; license+tenant entitlement|
|`GET /assignments/:id`, `/submissions`, `/analytics`|teacher/member scoped|ReportQuery|Learner views self; teacher authorized cohort|
|`POST /assignments/:id/supplements`|teacher|learnerIds, PracticeConfig|Target weak group only enrollment checked|
|`POST /classes/:id/grade-exports`|teacher|CSV/XLSX filters|Job authorized; no cross-tenant exports|
|`GET/POST /exam-events`, `GET /exam-events/:id`|public/self/authorized creator|EventCreate|Event metadata/time/capacity; creator entitlement|
|`POST /exam-events/:id/register`|self|Idempotency-Key|Registration/capacity atomic|
|`GET /exam-events/:id/lobby`|registered|eventId|ServerNow/startAt/entryWindow, no snapshot before permitted|
|`POST /exam-events/:id/attempts`|registered correct window|mode fixed real|Attempt no late sync, one identity/lease policy|
|`GET /exam-events/:id/results`|eligible after release|PageQuery|Separated ranking and participant consent|
|`GET /me/achievements`, `/me/streak`, `/challenges`|self|timezone/period|Method/sample labels; no duplicate event credit|
|`POST /challenges/:id/join`, `GET /leaderboards`|self/opt-in|level, kind, mode, period, tenant?|Never combine incomparable conditions|
|`POST /me/achievement-shares`|self|achievementId, expiresAt|Pseudonymous share token, minimal disclosure|
|`GET/POST /questions/:id/discussions`|completed and released|body/cursor|Sanitized text, rate limit, moderation, no embargo leak|
|`POST /comments/:id/reports`, `DELETE /comments/:id`|self/owner/moderator|reason|Report/hide; owner scope|
|`GET/PATCH /admin/community-reports/:id?`|moderator|status/action|Audit/reason; no staff privilege escalation|

## CMS báo cáo vận hành và experiments

Public `GET /articles`, `/articles/:slug`, `/landing-pages/:slug`, `/faq`, `/site-content`; staff CRUD+review/version tại `/admin` tương ứng. Markdown sanitize, no raw script/iframe allowlist chưa duyệt. Metadata/sitemap/OpenGraph/hreflang do web sinh từ licensed public resources.

`GET /admin/reports/:kind` kinds acquisition, activity, exam-completion, abandonment, levels, exams, session-duration, retention, funnel, content-review, content-incidents, mix-usage, conversion, provider-costs, experiments; ReportQuery typed theo kind. Retention trả sampleSize, cohortMaturity, dataMode observed/synthetic; chưa đủ ngày không hiển thị0% như kết luận thật.

`POST /analytics/events` chỉ sự kiện allowlist có consent khi cần, eventId, occurredAt, anonymousId/user context server; rate/schema/size validation, không chứa answer/payment secrets. `/admin/experiments` tạo hypothesis, target metric, eligible cohorts, variants, start/end; assignment sticky, logs pseudonymous. `/experiments/assignments` chỉ trả presentation flags không quyền API. Không gọi kết quả là có ý nghĩa thống kê nếu chưa đạt điều kiện.

## Nội bộ và lỗi mở rộng

Không có endpoint nội bộ giao việc hoặc nhận kết quả đọc PDF từ agent. `POST /internal/provider-jobs/:id/callback` dùng auth tương tự khi provider cần callback. Private network+signature, không cho payload tự chỉ định filesystem path/shell command. Callback provider học tập chỉ dùng khi cần; không có relay/callback chuẩn bị dữ liệu PDF.

Ngoài lỗi nền: POOL_SHORTAGE422, LICENSE_DENIED403, ENTITLEMENT_REQUIRED403, TENANT_FORBIDDEN404, VERSION_CONFLICT409, IDEMPOTENCY_CONFLICT409, EVENT_NOT_STARTED409, RESULTS_EMBARGOED409, QUOTA_EXHAUSTED429, PROVIDER_UNAVAILABLE503, CONTENT_REVIEW_REQUIRED409, INSUFFICIENT_DATA200 có dataStatus. Request validation errors chứa field path nhưng không raw secret. Cần contract tests cho từng lỗi và mọi permission matrix trước consumer DONE.
