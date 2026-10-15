# Phân công sáu worker và quyền sở hữu

Các worker là sáu phiên coding agent, không phải sáu VPS. Cùng một VPS có thể chạy, mỗi worker có user Linux/native login/clone/workspace riêng. Reviewer dùng một trong sáu worker và tạm dừng tác vụ ghi của reviewer; không tăng số worker khi review.

| Worker | Sở hữu chính | Điểm bàn giao | Reviewer mặc định |
|---|---|---|---|
|W1|schema, DB/migration, exam-engine, media-token, SRS|OpenAPI/DTO/events, fixtures, hàm thuần, migrations|W6; khi quá tải W2 nếu không đồng tác giả|
|W2|auth/RBAC, content/import/publish, attempts, notifications, classroom/community APIs|Service/API core đủ authorization, transaction và jobs|W1|
|W3|web học viên, public, exam, learning, teacher portal, UI chung|UI nối API thật, i18n và mobile/a11y|W4|
|W4|admin, CMS, payment/entitlement, reporting/experiments|Admin đầy đủ, billing state machine và reports|W3; payment logic W1 kiểm thêm|
|W5|Chuẩn dữ liệu nhập/NLP/dictionary, vocab/stats, learning/planner, AI/gamification APIs|Validator import v2 và API học tập, provider metering|W2|
|W6|kiểm chứng coordinator trên VPS, CI, infra, media edge, security/E2E/load/restore|Release pipeline, bằng chứng tích hợp, runbooks|W5; security core W1 kiểm thêm|

## Ranh giới chéo phải ghi rõ

- W1 sở hữu `packages/schema` và DB, không để mỗi module tự sinh migration cạnh tranh. Owner tính năng đề xuất field/FK/index; W1 merge migration rồi owner tiếp tục.
- `packages/api-client` do W1 sinh từ OpenAPI, không sửa tay; root workspace/config do W6. F02 được cấp tạm quyền tạo client/contract ở root; cấp quyền ghi trong assignment.
- `packages/ui` do W3 quản lý; W4 yêu cầu component qua task request hoặc dùng component có sẵn. Không tự fork schema/UI để tránh chờ.
- `apps/api/src/main.ts`, app module registration, `common/` và worker entry do W2 quản lý. W4/W5 bàn giao module export/service/events, W2 đăng ký bằng một integration patch hoặc quyền tạm explicit.
- Thư mục được phép sửa của mỗi worker ở `config/workers.example.json` (`allowedRoots`). Mọi `outputs` của task phải nằm trong thư mục của owner hoặc trong `temporaryGrants` của task; `tools/validate_plan.py` kiểm tra. `docs/decisions/` dùng chung, mỗi task một file.
- Bằng chứng (lệnh, exit code, report) lưu ở kho evidence của coordinator/CI, không commit vào repo sản phẩm.
- W6 viết test độc lập trong `tests/`; test nằm cạnh code do owner tính năng viết. Chỉ W6 giữ scripts root/CI. Các task V01/V02 có outputs rộng để diễn tả kiểm tra, nhưng không tự mở toàn bộ quyền; assignment thu hẹp theo diff thực tế.
- W1 hỗ trợ `scoring` adapter của W2, W5 consumer analytics; API modules không đọc trực tiếp bảng miền khác ngoài public service/projected read model đã thỏa thuận.
- W4 quản lý billing, W5 AI budget consumer, W2 quyền API; mọi consumer dùng `EntitlementService`, không nhân bản logic quota.

## Khóa ghi

Coordinator giữ khóa theo đúng danh sách `locks` trong `tasks.json`: `repo-root`, `dependency-lock`, `schema-contract`, `db-migration`, `engine-contract`, `ui-contract`, `ci-workflow`, `staging-deploy`, `heavy-load`, `api-hardening`. Tên khóa ngoài danh sách bị từ chối khi nạp catalog. Mặc định khóa suốt task nếu không có subtask commit boundary an toàn; có thể làm giảm song song, cần tách task lớn thay vì bỏ khóa. Khóa cần owner và assignment lease để tránh tiến trình cũ tiếp tục ghi khi task đã cấp lại.

Chỉ task giữ `dependency-lock` được sửa lockfile. Task khác cần thêm thư viện thì ghi yêu cầu trong kết quả; coordinator gộp thành một bước ngắn có khóa thay vì để mỗi task giữ khóa suốt thời gian chạy. Lockfile không giải bằng chỉ lấy bản main rồi bỏ dependency của nhánh khác. Cập nhật package manifests đã merge, regenerate bằng phiên bản pnpm đã khóa, kiểm tra diff rồi frozen install/test lại. Migration journal cũng do một owner serialize.

## Bàn giao hợp đồng

Mỗi bàn giao gồm version/schema hash, examples hợp lệ và lỗi, test contract, mock fixture, changelog breaking/nonbreaking và impacted consumers. Consumer được phát triển với mock đúng contract; task tích hợp không DONE đến khi dùng API/provider thật và có test. Reviewer không đồng tác giả; không tự review bằng phiên khác cùng code rồi coi độc lập hoàn toàn.

## Tài nguyên và trạng thái

Sáu phiên agent tối đa; khởi điểm hai heavy builds, một E2E suite và một reviewer đồng thời. Quota tracking riêng native account, không tự luân chuyển danh tính. Worker tạm nghỉ có thể được giao nghiên cứu tài liệu cục bộ khi không cần model và không vi phạm task lock; không khởi động worker thứ 7 với tài khoản dự phòng nếu chưa đổi cấu hình được duyệt.
