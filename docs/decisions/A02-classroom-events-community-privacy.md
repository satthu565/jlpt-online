# Quyết định kỹ thuật A02: Lớp học thi sự kiện cộng đồng và quản lý tài khoản

- **Task:** A02
- **Assignment:** A02-2
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/A02`
- **Base SHA:** `64db586920a4cdae6dafb203848b90f9bb1ed0f0`
- **Dependencies:** L02, A01
- **Feature IDs:** TEA-01, TEA-02, TEA-03, TEA-04, TEA-05, TEA-06, TEA-07, TEA-08, TEA-09, TEA-10, TEA-11, TEA-12, TEA-13, GAME-06, GAME-07, GAME-08, GAME-09, ACC-06, ACC-08, ACC-09, ACC-11, ACC-13, SYS-19

---

## 1. Bối cảnh và mục tiêu

Task A02 triển khai và kiểm chứng toàn bộ logic backend API, quy trình nghiệp vụ, phân quyền đa tổ chức (multi-tenant), sự kiện thi đồng loạt, diễn đàn thảo luận câu hỏi, và quản lý hồ sơ bảo mật quyền riêng tư tài khoản (GDPR data export, avatar deletion, session management, retention compliance).

### 5 Tiêu chí nghiệm thu bắt buộc (Acceptance Criteria):

1. **Teacher A không đọc học viên org B (TEA-13, Phân quyền & Cách ly Tenant):**
   - Giáo viên thuộc Organization A (`orgMemberships`) bị chặn tuyệt đối khi cố đọc danh sách học viên, lớp học, bài tập, lượt nộp hoặc điểm số của Organization B qua các middleware và helper xác thực: `assertOrgMembership`, `assertOrgRole`, `assertClassTeacherOrAdmin`.
   - Các hành vi truy cập chéo tenant ném `ForbiddenException` với mã lỗi `TENANT_FORBIDDEN`.
   - Quản trị viên hệ thống (`role: 'admin'`) giữ quyền giám sát xuyên tenant phục vụ hỗ trợ và kiểm toán.

2. **Invite expired/revoked/single-use đúng policy (TEA-03):**
   - Lời mời một lần (`single_use = true`): Chỉ duy nhất 1 học viên đầu tiên được chấp nhận tham gia lớp. Người thứ hai sử dụng mã mời bị từ chối với lỗi `VALIDATION_ERROR` (lời mời đã hết lượt). Lặp lại yêu cầu bởi chính học viên đã tham gia được xử lý idempotent (trả về kết quả thành công mà không tăng lượt sử dụng).
   - Lời mời có hạn dùng (`expires_at`): Khi vượt quá thời gian hiệu lực, yêu cầu tham gia bị từ chối với mã lỗi `INVITATION_EXPIRED`.
   - Lời mời đã thu hồi hoặc token không tồn tại trả về mã lỗi 404 `NOT_FOUND`.
   - Lời mời nhiều lần (`max_uses`): Kiểm soát hạn ngạch nghiêm ngặt và từ chối khi số lượng đã đạt trần `used_count >= max_uses`.

3. **Event chưa kết thúc không lộ answer kể cả early submit/review (GAME-06, Embargo):**
   - Sự kiện thi đồng loạt áp dụng quy tắc cấm vận đáp án nghiêm ngặt (Embargo): trước mốc thời gian công bố kết quả (`resultReleaseAt`), học viên nộp bài sớm không được xem điểm tổng kết, bảng điểm chi tiết hay lời giải.
   - API trả về trạng thái `embargoed: true` và ẩn toàn bộ `answerKey`, `explanation`, `scoring`.
   - Sau mốc `resultReleaseAt`, hệ thống tự động phát sự kiện outbox `exam_event.results_released`, mở khóa xem lại bài thi và công bố xếp hạng.
   - Ràng buộc toàn vẹn thời gian trên database: `opens_at <= starts_at AND starts_at < ends_at AND ends_at <= result_release_at`.

4. **Discussion chỉ sau completion và moderation (GAME-07..09):**
   - Thảo luận câu hỏi (`exam_discussions` / `comments`): Học viên chỉ được phép xem và gửi bình luận sau khi đã hoàn thành bài thi chứa câu hỏi tương ứng (`assertExamCompleted`). Người chưa hoàn tất bài thi bị chặn với lỗi `ForbiddenException`.
   - Kiểm duyệt nội dung (Moderation): Khi bình luận bị người dùng báo cáo vi phạm (`comment_reports`), kiểm duyệt viên giải quyết báo cáo với hành động `hide_comment` sẽ ẩn ngay bình luận khỏi danh sách hiển thị chung.
   - Tác giả có toàn quyền xóa bình luận của chính mình (`DELETE /comments/:id`).

5. **Account export/delete avatar/session đầy đủ (ACC-06, ACC-11, ACC-12, ACC-13, SYS-19):**
   - Quản lý ảnh đại diện (ACC-06): Học viên có thể tải lên URL ảnh đại diện mới hoặc xóa ảnh đại diện về giá trị mặc định (`null`).
   - Mục tiêu thi & điểm số (ACC-08, ACC-09): Thiết lập ngày thi JLPT mục tiêu (tháng 7 hoặc tháng 12) và điểm số mục tiêu (0–180), có kiểm tra định dạng và khoảng hợp lệ.
   - Thời gian học tập & phân tích kỹ năng (ACC-11): Tự động tính toán tổng số phút học tập từ các phiên học và tổng hợp độ chính xác theo từng kỹ năng JLPT.
   - Xuất dữ liệu cá nhân GDPR (ACC-13): Xuất toàn bộ thông tin cá nhân, lịch sử thi cử, tiến độ học tập ra định dạng JSON/CSV an toàn, có hàm `sanitizeExportField` phòng chống tấn công chèn công thức (Formula Injection).
   - Quản lý phiên đăng nhập (ACC-12): Liệt kê danh sách phiên hoạt động có đánh dấu phiên hiện tại (`isCurrent`), thu hồi từng phiên hoặc đăng xuất khỏi tất cả các thiết bị khác chỉ giữ lại phiên hiện hành.
   - Xóa tài khoản & tuân thủ Retention (SYS-19): Tiếp nhận yêu cầu xóa tài khoản, tuân thủ nghĩa vụ lưu trữ pháp lý theo chính sách retention (`retention_policies`), ghi vết vào `deletion_requests` với trạng thái `blocked_retention` cho các miền cần bảo vệ.

---

## 2. Các quyết định kỹ thuật cụ thể

1. **Khắc phục xung đột kiểu định danh UUID:**
   - Database schema yêu cầu định dạng `uuid` chuẩn cho các trường ID (`users.id`, `blueprints.id`, `organizations.id`, etc.).
   - Bộ kiểm thử sử dụng hàm `generateUuidV7()` hoặc chuỗi UUID hợp lệ chuẩn RFC 4122 / UUIDv7 (`018e0000-...`) thay cho chuỗi tự đặt ngắn (`teacher-a`, `student-1`), đảm bảo tương thích tuyệt đối với PostgreSQL UUID type.

2. **Khắc phục ràng buộc toàn vẹn cơ sở dữ liệu:**
   - Bảng `exam_events`: Tuân thủ CHECK constraint `opens_at <= starts_at AND starts_at < ends_at AND ends_at <= result_release_at`. Khi giả lập kịch bản kết quả thi đã được công bố, cập nhật đồng bộ cả 4 mốc thời gian lùi về quá khứ để không vi phạm ràng buộc thứ tự.
   - Bảng `blueprints`: Bổ sung các trường bắt buộc `sourceRef: {}`, `sections: []`, `scoring: {}`.
   - Bảng `exam_versions`: Bổ sung cấu trúc scoring bắt buộc có trường `scoringSections: []` để trình tính điểm `outboxService.lockAndScoreAttempt` thực thi thành công.
   - Khóa ngoại kép `exam_attempts (exam_id, exam_version)` tham chiếu chính xác đến bản ghi phiên bản đề thi đã xuất bản.

3. **An toàn kiểm thử và tính nhất quán kiểu:**
   - Loại bỏ hoàn toàn các ép kiểu lỏng lẻo `any` khỏi mã nguồn và toàn bộ các bộ test (`classroom.test.ts`, `event.test.ts`, `community.test.ts`, `privacy.test.ts`), thay bằng các enum và type chuẩn từ `@jlpt/schema` (`Role`, `Level`, v.v.).
   - Tuân thủ cấu hình TypeScript `strict: true` và ESLint rule `@typescript-eslint/no-explicit-any`.

---

## 3. Quản lý điều kiện bên ngoài (External Status)

- **External ID:** `privacy-policy`
- **Trạng thái:** `BLOCKED_EXTERNAL`
- **Mô tả:** Văn bản chính sách quyền riêng tư chính thức của tổ chức đang chờ ban hành bởi chủ dự án / bộ phận pháp lý.
- **Xử lý:** Toàn bộ logic thu thập chấp thuận (`user_consents`), xử lý yêu cầu GDPR export và xóa tài khoản được kiểm chứng hoàn toàn thông qua fixtures và sandbox DB constraints, không ảnh hưởng đến tính toàn vẹn của code.

---

## 4. Kết quả kiểm tra (Checks & Verification)

Tất cả các lệnh kiểm tra theo hợp đồng task và các cổng chung của dự án đều đạt 100%:

| Lệnh | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| `pnpm test:classrooms` | **PASS** (exit code 0) | 15/15 tests passed |
| `pnpm test:events` | **PASS** (exit code 0) | 6/6 tests passed |
| `pnpm test:community` | **PASS** (exit code 0) | 5/5 tests passed |
| `pnpm test:privacy` | **PASS** (exit code 0) | 14/14 tests passed |
| `pnpm install --frozen-lockfile` | **PASS** (exit code 0) | Lockfile đồng bộ, 0 drift |
| `pnpm lint` | **PASS** (exit code 0) | 13/13 packages passed, 0 error |
| `pnpm typecheck` | **PASS** (exit code 0) | 19/19 packages passed, strict TS |
| `pnpm test` | **PASS** (exit code 0) | 19 packages, 27 files, 332 tests passed |
| `pnpm build` | **PASS** (exit code 0) | 12/12 build tasks passed |
