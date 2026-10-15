# Đặc tả coordinator và runtime sáu worker

Tài liệu để xây coordinator ở **ngày 0**, trong repo riêng `jlpt-coordinator` (không nằm trong repo sản phẩm, không do coding worker sửa); F07 chỉ kiểm chứng coordinator trên VPS. Bản đầu của runtime nằm ở thư mục `coordinator/` cạnh bộ tài liệu này (README riêng), đã qua 12 tình huống kiểm thử bên dưới với git thật và Gemini/GitHub giả lập; cách ly user Linux và Gemini/GitHub thật được kiểm chứng ở F07. Installer mới đặt tên `install-coordinator.sh`, không dùng lại `setup-vps.sh` cũ. Không dùng schema mẫu để chạy runner A/B cũ. Coordinator là một process có state SQLite; worker là CLI subprocess dưới identity/workspace riêng. Không cần OpenClaw/9Router để đáp ứng luồng này.

## Mô hình trạng thái

Task: TODO→READY→ASSIGNED→RUNNING→VERIFYING→REVIEW→MERGE_PENDING→DONE. Nhánh phụ: BLOCKED_DEPENDENCY, BLOCKED_EXTERNAL, PAUSED_QUOTA, RETRY_PENDING, FAILED, CANCELLED. Feature states riêng: TODO, IN_PROGRESS, CODE_VERIFIED, PROVIDER_VERIFIED, ACCEPTED, BLOCKED. DONE của task không tự đặt feature DONE khi thiếu evidence;363 yêu cầu ứng dụng và 12 đầu vào chuẩn bị thủ công được báo riêng.

SQLite tables: tasks, catalog_versions, assignments, workers, worker_quota_windows, resource_locks, checkpoints, verification_runs, reviews, merge_requests, feature_evidence, external_prerequisites, events, notifications. Một writer coordinator, SQLite WAL/transactions; dashboard đọc snapshot. PID/flock bảo vệ một instance. Nếu restart, trước hết reconcile subprocess/lease/PR/branch; không đổi tất cả RUNNING thành TODO và giao lại ngay.

Assignment gồm assignmentId, taskId, workerId, baseSHA, branch, allowedPaths, resources, startedAt, expiresAt, lastHeartbeatAt, fencingToken. Task reservation và locks trong cùng transaction. Worker heartbeat khoảng 30s, lease2min là giá trị ban đầu cần test; expiry là nghi ngờ, không cho process cũ tiếp tục ghi sau cấp lại. Không chạy hai writer vào clone. Nếu không fence được local child, kill/wait process group rồi checkpoint trước reassignment.

## Scheduler

Chỉ chọn task chưa có active assignment, dependencies DONE/merged, effective notBefore phù hợp, worker role đúng, mọi `startPrerequisites` đã sẵn và resource locks còn trống. `acceptancePrerequisites` không chặn giao task hay dependency: task code và test bằng sandbox/fixtures, feature liên quan giữ BLOCKED_EXTERNAL ở PROVIDER_VERIFIED/nghiệm thu tới khi điều kiện ngoài có. Khóa phải thuộc danh sách `locks` trong catalog; ghi ngoài `allowedRoots` của worker cộng `temporaryGrants` của task bị từ chối. Có thể chọn phần không phụ thuộc provider theo subtask được ghi rõ; không coi task bị thiếu provider là đạt. Ưu tiên mở critical path rồi targetByHour, không random chỉ để đủ sáu worker bận.

Một worker một tác vụ ghi; review dùng worker rảnh và không đồng tác giả. Limits tối đa6 coding sessions tổng gồm reviewer; khởi điểm heavyBuilds2, browserSuites1, activeReviews1, loadRuns1. Chờ build/review không giữ tài nguyên không cần thiết vô hạn; task locks vẫn theo chính sách. Load test có dedicated target window, không so kết quả khi đang có builds hoặc restore.

## Native auth và secrets

Mỗi worker user Linux/home/clone native login riêng. Operator login tương tác; coordinator chỉ biết accountRef, không đọc/token-forward/copy OAuth sang proxy. Coding subscription không provider API credits. Hạn mức theo account/user thực tế và chính sách Google, không giả định sáu account cho phép cộng quota. Credential production/merchant/SSH không trong environment của worker.

Chỉ coordinator có token GitHub scoped repository; push/PR/merge qua service credential. Environment allowlist, không chỉ xóa4biến quen thuộc; sanitize subprocess args/logs. Worker khác user vẫn không an toàn nếu có global Docker socket hoặc quyền đọc coordinator home; F07 phải test deny. Clone root owned worker; coordinator dùng broker import patch/git bundle và push từ trusted checkout thay vì cấp token vào worker.

## Checkpoint và quota

1. Khi provider trả quota, timeout, cancel hoặc cần nghỉ: stop nhận task mới cho worker đó.
2. Worker/coordinator ghi commits, git diff binary, staged/unstaged patches, untracked files manifest, task output logs và file hashes vào checkpoint private. Secrets không được đưa patch vào GitHub; scan trước upload.
3. Coordinator xác nhận durable checkpoint, ghi current head/remote branch; nếu chưa có safe commit thì giữ nguyên clone, không reset/clean.
4. PAUSED_QUOTA theo worker/account/model+window; parse Retry-After/resetAt nếu có, honor tối đa cần thiết, bounded backoff nếu không biết. Không hard-code giờ reset chung hoặc pause cả cluster.
5. Resume đúng assignment/branch, verify checkpoint rồi làm tiếp. Không tự đổi sang tài khoản khác để vượt giới hạn. Reassign task cho role khác chỉ khi có yêu cầu vận hành hợp lệ, quota policy rõ và checkpoint bàn giao, không dùng để né quota.

Đặc biệt sửa lỗi cũ: return khi limited trước push/checkpoint và prepareBranch reset/clean có thể mất uncommitted changes. Test phải mô phỏng giới hạn giữa lúc có untracked file và partial edit, khôi phục chính xác bytes.

## Verification và review

Task chỉ VERIFYING khi commit có feature list, commands và acceptance. Common scripts bắt buộc sau F01: frozen install, lint, typecheck, test, build; task-specific pytest, migration, contract, E2E, provider/load/restore theo scope. Command không tồn tại là FAIL. Full checks giữ ở CI/integration; local filtered checks dùng để feedback sớm, không thay common gates. CI artifacts immutable gắn headSHA/baseSHA/dataVersion/env.

Reviewer nhận diff+task+contracts+reports, không credential; output APPROVE, CHANGES hoặcUNCLEAR. UNCLEAR/BLOCKED/error không thành approve sau hai lần. Reviewer có thể yêu cầu thử lại; không cài dependency/sửa code trong checkout read-only. Tự nhận xét của worker tác giả không thay reviewer.

## Merge serial

Coordinator merge từng PR sau checks/review đúng headSHA và integration base. Nhánh sau cập nhật main phải invalidate review khi diff/base thay đổi, rerun impacted tests và mandatory security checks. Merge request dùng expectedHeadSHA để tránh TOCTOU. External push/branch drift cần reconcile, không force-merge. Migrations/root lock giữ tới integration checkpoint phù hợp.

DONE khi PR merge và có evidence; worker có thể nhận task mới khi code đã nộp, nhưng dependencies chỉ mở sau merge. Nếu task đang review dùng clone review riêng, không checkout vào clone worker đang code. Có limits reviewer riêng và không tạo vô hạn worktrees.

## Task catalogs và tiến độ

`tasks.json` và `features.json` là baseline do tools generate; coordinator import catalog hash/version. Edit catalog lúc chạy cần pause allocation, validate DAG, migrate IDs không mất state rồi resume. Không sửa IDs task đã có history. Báo cáo Markdown chỉ view, không nguồn ghi trạng thái. Mỗi quyết định file theo task, không append đồng thời checklist hoặc tu-quyet.md.

## Kiểm thử runtime bắt buộc

| Tình huống | Kết quả |
|---|---|
|Hai tick cùng task|Một assignment thắng atomically|
|Restart khi child còn sống|Reconcile/fence, không giao task trùng|
|Lease hết trong lúc build|Không reset clone trước kill/checkpoint|
|W2 hết quota|Chỉ W2 pause; W3 đủ deps tiếp tục|
|Quota trước commit và có binary/untracked|Checkpoint restore đúng hash|
|Sáu tasks gọi build/E2E|Semaphores đúng limits|
|Hai task sửa schema/migration/lockfile|Một owner/lock; không commit chồng|
|Review UNCLEAR/provider error|Không merge|
|Main/head đổi sau review|Invalidation+rereview/CI theo policy|
|Worker cố đọc secrets hoặc gọi Docker host|Deny có audit|
|Task catalog đổi/mất dependency|Validation fail trước cấp việc|
|External missing/live chưa test|BLOCKED_EXTERNAL, không DONE giả|

## CLI cần triển khai

`plan validate`, `workers check`, `worker login-instructions <id>`, `run --dry-run`, `run`, `status`, `pause`, `resume`, `retry <taskId>`, `checkpoint <taskId>`, `evidence verify`, `release report`. Dry-run không gọi model/GitHub/provider và không đổi state thật. Trước triển khai F07 ghi rõ script/command nào có thật; README hướng dẫn chạy phải đồng bộ với runtime đã kiểm thử.
