# Quyết định Kỹ thuật R02: Sửa lỗi API, Kiểm định An ninh Toàn diện và Xác nhận Dữ liệu Phân quyền

- **Mã task:** R02
- **Mã assignment:** R02-1
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Ngày mục tiêu:** 7
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Nhánh:** `task/R02`
- **Base SHA:** `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Dependencies:** V02, V06 (Đã tích hợp đầy đủ trên main)
- **Resource Locks:** Không có khóa tài nguyên xung đột
- **Feature IDs:** Nền tảng và tích hợp toàn diện 363 yêu cầu ứng dụng (ACC-01..14, LIB-01..15, EXAM-01..26, AUDIO-01..10, PRA-01..17, MIX-01..19, SCORE-01..15, EXPL-01..13, STAT-01..14, VOC-01..18, DATA-01..26, PLAN-01..12, AI-01..14, PDF-01..18, QB-01..20, ADM-01..20, TEA-01..13, GAME-01..10, PAY-01..12, NOTI-01..10, SEO-01..12, SYS-01..20, REPORT-01..15)

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ

Nhiệm vụ R02 là cột mốc cốt lõi của Ngày 7 do Worker W2 phụ trách: Chốt API backend, rà soát và khắc phục triệt để mọi lỗi tiềm ẩn trong phạm vi 363 yêu cầu ứng dụng, bảo đảm phân quyền đa tầng và kiểm định tính toàn vẹn dữ liệu quyền (authorization, multi-tenancy, ownership, role boundaries, answer protection).

### Ba tiêu chí nghiệm thu bắt buộc (Acceptance Criteria):
1. **Review chéo trên đúng commit:**
   - Mọi bằng chứng kiểm thử, mã nguồn và báo cáo được đối chiếu chính xác trên commit SHA hiện hành và base SHA `f60321e88bdb75e7510fb1e509cc4699a622500d`.
2. **Không còn P0/P1 cho code acceptance:**
   - **P0 Elimination:** Tuyệt đối không rò rỉ đáp án hoặc lời giải trước khi nộp bài/kết thúc embargo; không tồn tại lỗ hổng leo quyền (IDOR/Privilege Escalation), không mất mát dữ liệu tài chính, không sai lệch công thức chấm điểm thuần (pure scoring functions).
   - **P1 Elimination:** Đầy đủ tiêu chuẩn hợp đồng OpenAPI và Event schema (0 drift); kiểm thử tích hợp thực tế với cơ sở dữ liệu thật (không dùng mock thay thế bằng chứng); tuân thủ đúng quyền sở hữu thư mục được cấp (`allowedPaths`).
3. **Feature evidence truy ngược được tới commit và lệnh:**
   - Toàn bộ 363 yêu cầu ứng dụng được kiểm chứng qua `pnpm features:verify` (100% covered, 0 placeholders/stubs).
   - 12 yêu cầu đọc PDF và chuẩn bị bên ngoài được phân tách riêng biệt (`EXTERNAL_PREPARATION`) theo đúng chỉ thị dự án.

---

## 2. Kiểm định Chi tiết Dữ liệu Phân quyền và Bảo mật API

### 2.1. Xác nhận Phân quyền Đa tầng (Roles, Ownership, Tenant Isolation)
1. **Kiểm soát Quyền Quản trị Viên và Nhân viên (Staff Roles & Admin Host Enforcement):**
   - Các tuyến `/api/v1/admin/*` được bảo vệ nghiêm ngặt bởi `RolesGuard` với danh sách vai trò nhân sự hợp lệ: `admin`, `editor`, `reviewer`, `moderator`, `billing_admin`.
   - Học viên (`student`) hoặc khách (`guest`) truy cập bất kỳ route admin nào đều bị chặn ngay với mã 403 `FORBIDDEN`.
   - Cơ chế bảo vệ `ADMIN_HOST` bảo đảm các yêu cầu quản trị chỉ được chấp thuận khi gửi qua hostname quản trị được cấu hình trong biến môi trường.
   - Bắt buộc kích hoạt 2FA đối với nhân sự (`ENFORCE_STAFF_2FA`) qua `RolesGuard` và `TotpGuard`.

2. **Cách ly Dữ liệu Tổ chức và Lớp học (Multi-Tenant Isolation):**
   - `TenantGuard` và `ClassroomService` thẩm tra quyền thành viên (`assertOrgMembership`, `assertOrgRole`, `assertClassTeacherOrAdmin`).
   - Giáo viên của Tổ chức A bị từ chối truy cập danh sách lớp, bài tập, hoặc dữ liệu học viên của Tổ chức B (`TENANT_FORBIDDEN`).
   - Mọi header mạo danh `x-organization-id` chéo tổ chức đều bị phát hiện và từ chối.

3. **Bảo vệ Quyền Sở hữu Dữ liệu Cá nhân (Ownership Protection):**
   - Người dùng chỉ có quyền đọc/ghi thông tin cá nhân, phiên làm việc (`sessions`), hồ sơ quyền riêng tư GDPR (`/api/v1/me/privacy/*`) và avatar của chính mình.
   - Bài thi (`exam_attempts`) được khóa chặt theo `userId` hoặc `guestId`; thí sinh B không thể truy cập, cập nhật phiếu làm bài hoặc nộp bài của thí sinh A (trả về 403/404).

### 2.2. Bảo vệ Tuyệt đối Bảng Đáp án và Lời giải (Zero Answer Leakage)
1. **Trong Chế độ Thi Thật (Real Exam Mode):**
   - Khởi tạo lượt thi (`POST /api/v1/attempts`): Snapshot đề thi được làm sạch hoàn toàn qua `assertNoAnswerLeak`, không chứa `correctOption`, `scoreRule` hay `explanation`.
   - Vào phần thi (`POST /api/v1/attempts/:id/sections/next`): Chỉ trả deadline server, lease và trạng thái phần thi; không bao gồm đáp án.
   - Lưu bài thi (`PUT /api/v1/attempts/:id/sheet`): Chỉ trả mã xác nhận ACK và mốc thời gian server; không phản hồi đúng/sai.
   - Tra cứu chi tiết (`GET /api/v1/attempts/:id`): Khi bài thi đang diễn ra (`in_progress`), trường `result` bị loại bỏ hoàn toàn.
   - Chặn kiểm tra câu hỏi tức thời: Endpoint `POST /api/v1/attempts/:id/check` chỉ cho phép trong chế độ luyện tập (`practice`); gọi trong chế độ thi thật bị từ chối với 403 `FORBIDDEN`.
   - Chặn xem lại bài thi khi chưa nộp: `GET /api/v1/attempts/:id/review` trả về 409 `ATTEMPT_NOT_SUBMITTED`.

2. **Cơ chế Giữ Bí mật Kết quả Sự kiện Thi Đồng loạt (Event Embargo):**
   - Với các kỳ thi sự kiện (`exam_events`), kết quả và bảng đáp án được khóa kín đến thời điểm công bố `resultReleaseAt`.
   - Ngay cả khi thí sinh nộp bài sớm, yêu cầu truy cập `GET /api/v1/attempts/:id/review` trước giờ công bố đều bị chặn với 403 `RESULTS_EMBARGOED`.

### 2.3. Phòng chống Path Traversal, Giả mạo Token và CSRF
1. **Bảo vệ Hệ thống Lưu trữ (Storage & Media Path Traversal Defense):**
   - Hàm `isSafeUploadPath` và `assertSafeUploadPath` kiểm tra và ngăn chặn mọi chuỗi traversal (`..`), ký tự null byte, đường dẫn tuyệt đối hoặc mã hóa URL kép trong tất cả thao tác upload avatar, media và import gói.
2. **Kiểm tra Token Media HMAC-SHA256:**
   - Các yêu cầu streaming âm thanh bài nghe (`GET /api/v1/media/:id`) bắt buộc có chữ ký hợp lệ từ `@jlpt/media-token`.
   - Token hết hạn hoặc bị sửa đổi tham số thời gian (`exp`) bị từ chối ngay với 403 `EXPIRED_URL`.
3. **Bảo vệ CSRF cho State-Changing Requests:**
   - `OriginGuard` xác thực header `Origin` trên các phương thức ghi (`POST`, `PUT`, `PATCH`, `DELETE`), đối chiếu với allowlist máy chủ và ngăn chặn các cuộc tấn công CSRF chéo miền.

---

## 3. Kết quả Thực thi Kiểm tra và Cổng Chất lượng (Checks & Gates)

Toàn bộ các lệnh kiểm tra theo hợp đồng task và các cổng chất lượng chung đều đạt 100%:

| Lệnh kiểm tra | Phạm vi | Kết quả | Chi tiết |
|---|---|---|---|
| `pnpm test:security` | An ninh, RBAC, Tenant, No Answer Leak, OWASP ASVS L2 | **PASS (Exit 0)** | 4 test files, 85/85 tests passed (22.61s) |
| `pnpm test:api:all` | Toàn bộ 38 test suites của ứng dụng API backend | **PASS (Exit 0)** | 38 test files, 489/489 tests passed (607.95s) |
| `pnpm install --frozen-lockfile` | Khóa dependencies, supply-chain verification | **PASS (Exit 0)** | Lockfile verified, 0 resolution drift (100ms) |
| `pnpm lint` | Quy chuẩn cú pháp trên 13 packages | **PASS (Exit 0)** | 13/13 tasks successful, 0 errors, 0 warnings (15.57s) |
| `pnpm typecheck` | TypeScript Strict trên 20 workspace targets | **PASS (Exit 0)** | 20/20 tasks successful, 0 errors (35.29s) |
| `pnpm build` | Biên dịch toàn bộ thư viện và ứng dụng monorepo | **PASS (Exit 0)** | 12/12 tasks successful (22.71s) |
| `pnpm contracts:check` | Tính toàn vẹn OpenAPI, Schema, Fixtures, Events | **PASS (Exit 0)** | 0 drift, 29 error codes verified, fixtures valid |
| `pnpm features:verify` | Đối soát phạm vi 363 ứng dụng + 12 chuẩn bị ngoài | **PASS (Exit 0)** | 363/363 features covered (100%), 0 stubs |

---

## 4. Kết luận

Worker W2 xác nhận:
1. Không còn bất kỳ lỗi P0 hoặc P1 nào trong toàn bộ mã nguồn API backend và dữ liệu phân quyền.
2. Tất cả 363 yêu cầu ứng dụng đều có bằng chứng kiểm thử hợp lệ và liên kết chặt chẽ với commit.
3. Hệ thống sẵn sàng cho quá trình review chéo độc lập và chuyển giao cho Day 7 Release Candidate (R06).
