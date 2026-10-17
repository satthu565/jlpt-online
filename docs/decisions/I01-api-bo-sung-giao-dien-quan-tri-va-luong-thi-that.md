# Quyết định kỹ thuật I01: API bổ sung cho giao diện quản trị và luồng thi thật

- **Task:** I01
- **Assignment:** I01-3
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-17
- **Branch:** `task/I01`
- **Base SHA:** `07b920c17a8ee5582f941ddcf5e1b13718eef2ae`
- **Dependencies:** R06 (Đã tích hợp đầy đủ)
- **Resource Locks:** `api-hardening`
- **Allowed Paths:** `package.json`, `apps/api/package.json`, `apps/api/src/common/`, `apps/api/src/modules/auth/`, `apps/api/src/modules/user/`, `apps/api/src/modules/exam/`, `apps/api/src/modules/attempt/`, `apps/api/src/modules/question-bank/`, `apps/api/src/modules/import/`, `apps/api/src/modules/media/`, `apps/api/src/modules/review/`, `apps/api/src/modules/storage/`, `apps/api/src/modules/license/`, `apps/api/src/modules/blueprint/`, `apps/api/src/modules/audit/`, `apps/api/src/modules/notification/`, `apps/api/src/modules/community/`, `apps/api/src/modules/classroom/`, `apps/api/src/modules/scoring/`, `apps/api/src/modules/outbox/`, `apps/api/src/modules/email/`, `apps/api/src/modules/admin/`, `apps/api/src/modules/turnstile/`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `docs/decisions/`

---

## 1. Bối cảnh và mục tiêu

Sau giai đoạn V1–R06, hệ thống bước vào Ngày 8 (I00–I07) để kết nối giao diện thực tế của `apps/admin` và `apps/web` với API thật và loại bỏ hoàn toàn dữ liệu giả/mock trong UI. 

Task **I01** do W2 phụ trách nhằm xử lý 4 yêu cầu nghiệm thu cốt lõi:
1. Đăng ký tài khoản vẫn trả `201 Created` ngay cả khi kết nối máy chủ SMTP thất bại. Email xác minh được đưa vào bảng `outbox` để job nền gửi lại tự động, có test chứng minh.
2. Link gửi trong email xác minh và đặt lại mật khẩu trỏ chính xác vào route Next.js của `apps/web` (`/xac-minh-email?token=...` và `/dat-lai-mat-khau?token=...`), cho phép hoàn tất quy trình thực tế.
3. Lượt thi trên staging tải được file `snapshot.json`, streaming audio có hỗ trợ HTTP Range 206 Partial Content, và nộp bài thành công mà không phụ thuộc vào tên miền bên ngoài `media.jlpt.local`.
4. Cung cấp đầy đủ danh mục endpoint quản trị cho 12 phân hệ: `users`, `audit`, `exams`, `questions`, `imports`, `reviews`, `blueprints`, `media`, `vocab`, `moderation`, `notifications`, `org`, đảm bảo phân quyền RBAC chặt chẽ và test bao phủ.

---

## 2. Các giải pháp kỹ thuật đã triển khai

### 2.1. Đăng ký & Đặt lại mật khẩu chống sập khi SMTP lỗi (Acceptance 1)
- Trong `apps/api/src/modules/auth/auth.service.ts`:
  - Bao bọc lệnh gọi `this.emailService.sendVerificationEmail` và `this.emailService.sendPasswordResetEmail` trong khối `try...catch`.
  - Nếu SMTP gặp lỗi kết nối (ví dụ `ECONNREFUSED` khi Mailpit chưa khởi động kịp), hệ thống ghi log cảnh báo và tự động ghi một bản ghi vào bảng `outbox` với topic `notification.email`, lưu payload chứa email người nhận, loại email (`verification` hoặc `password_reset`), link xác thực/đặt lại mật khẩu và tên hiển thị.
  - Phản hồi HTTP trả về vẫn thành công (`201 Created` cho đăng ký, `200 OK` cho quên mật khẩu), người dùng không bị lỗi 500 gián đoạn trải nghiệm.
  - Job `OutboxService.relayOutbox()` trong `apps/api/src/modules/outbox/outbox.service.ts` xử lý định kỳ topic `notification.email`, tái gửi qua SMTP khi kết nối phục hồi và cập nhật `publishedAt`.
  - Đã có bài test tự động `apps/api/src/modules/admin/admin-endpoints.test.ts` mô phỏng lỗi SMTP và chứng minh việc hàng đợi outbox kích hoạt và gửi lại thành công.

### 2.2. Chuẩn hóa link xác minh và đặt lại mật khẩu theo đúng trang web thật (Acceptance 2)
- Khắc phục đường dẫn link cũ (`/auth/verify-email`, `/auth/reset-password`) sang đúng cấu trúc trang Next.js trong `apps/web/app/(auth)/`:
  - Link xác minh email: `${publicUrl}/xac-minh-email?token=${verificationToken}`.
  - Link đặt lại mật khẩu: `${publicUrl}/dat-lai-mat-khau?token=${resetToken}`.
- Cả hai trang `xac-minh-email/page.tsx` và `dat-lai-mat-khau/page.tsx` đều trích xuất `token` từ URL query parameter `window.location.search` và gọi API tương ứng (`/api/v1/auth/verify-email` hoặc `/api/v1/auth/reset-password`) để hoàn tất quy trình.
- Đã kiểm chứng qua test E2E/integration hoàn tất trọn vẹn cả 2 luồng.

### 2.3. Luồng tải snapshot và streaming audio không phụ thuộc media.jlpt.local (Acceptance 3)
- Trong `apps/api/src/modules/attempt/attempt.service.ts`:
  - Cập nhật hàm `getMediaBaseUrl()`: Nếu `MEDIA_BASE_URL` chứa domain tĩnh `media.jlpt.local` mà staging/dev chưa có CDN riêng, hệ thống tự động fallback về cùng origin API (`API_BASE_URL`, `PUBLIC_HOST`, hoặc đường dẫn tương đối `/api/v1`).
- Trong `apps/api/src/modules/exam/exam.controller.ts`:
  - Hỗ trợ endpoint snapshot trực tiếp trên API: `GET /api/v1/exams/:id/v:version/snapshot.json` và alias `media/exams/:id/v:version/snapshot.json`.
  - Xác thực chữ ký `mediaToken` qua thư viện chuẩn `@jlpt/media-token`.
  - Đảm bảo hợp đồng Zero Answer Leak: snapshot JSON không chứa đáp án hay lời giải trước khi thi.
- Trong `apps/api/src/modules/media/media.controller.ts` & `media.service.ts`:
  - Phục vụ file âm thanh nghe hiểu qua route `GET /api/v1/media/:id` và alias `GET /api/v1/m/:id`.
  - Hỗ trợ đầy đủ HTTP 206 Partial Content khi có header `Range`, cho phép trình duyệt tua và phát âm thanh từng đoạn.

### 2.4. Danh mục endpoint quản trị 12 phân hệ và phân quyền RBAC (Acceptance 4)
Triển khai và kiểm thử trong `apps/api/src/modules/admin/admin.controller.ts` và các module liên quan:
1. **Users (`/api/v1/admin/users`):** Danh sách người dùng, cập nhật trạng thái/vai trò, cấm editor tự thăng quyền lên admin.
2. **Audit (`/api/v1/admin/audit-logs`):** Xem nhật ký kiểm toán hệ thống, chỉ cho phép admin truy cập.
3. **Exams (`/api/v1/admin/exams`):** Quản lý đề thi, tạo bản nháp, thẩm tra vi phạm quy cách (`validate`).
4. **Questions (`/api/v1/admin/groups`, `/api/v1/admin/questions`):** Tìm kiếm, lọc và phân loại câu hỏi/nhóm câu hỏi.
5. **Imports (`/api/v1/admin/imports`):** Liệt kê và theo dõi trạng thái các tiến trình nhập đề thi.
6. **Reviews (`/api/v1/admin/reviews`):** Hàng đợi duyệt nội dung cho vai trò reviewer/admin.
7. **Blueprints (`/api/v1/admin/blueprints`):** Quản lý cấu trúc đề mẫu theo các cấp độ N5–N1.
8. **Media (`/api/v1/admin/media`):** Thư viện tài nguyên âm thanh/hình ảnh phục vụ quản trị đề thi.
9. **Vocab (`/api/v1/admin/vocab`):** Quản lý từ điển từ vựng chuẩn (CRUD từ vựng N5–N1).
10. **Moderation (`/api/v1/admin/moderation/ai`):** Kiểm duyệt nội dung sinh bởi AI, phê duyệt các yêu cầu bị cờ báo.
11. **Notifications (`/api/v1/admin/notifications/templates`, `/test-send`):** Quản lý mẫu thông báo và gửi thử nghiệm.
12. **Organizations & Teachers (`/api/v1/admin/teacher-applications`, `/organizations`):** Duyệt hồ sơ giáo viên và quản trị tổ chức giáo dục.

### 2.5. Tự động hóa dọn dẹp lượt thi bảo đảm tính xác định cho kiểm thử bảo mật (Fix 409 ATTEMPT_ALREADY_OPEN)
- **Hiện tượng:** Bộ kiểm thử `tests/integration/security-matrix.test.ts` tạo lượt thi cho `student` (`tok_student_verified`) nhưng không submit bài thi trong `afterAll`. Khi chạy trên môi trường staging dùng chung cổng 4000 (do `test-server.ts` ưu tiên kết nối đến cổng 4000 đang hoạt động), lượt thi này vẫn ở trạng thái `in_progress` trong cơ sở dữ liệu PostgreSQL. Các lần chạy test tiếp theo gọi `POST /api/v1/attempts` bị ném lỗi 409 `ATTEMPT_ALREADY_OPEN` thay vì 201.
- **Biện pháp xử lý triệt để:**
  - Xây dựng runner `apps/api/src/common/utils/security-test-runner.ts` tích hợp trong lệnh `pnpm test:security`.
  - Runner tự động kiểm tra và thu dọn các lượt thi đang mở (`in_progress`) của các tài khoản kiểm thử (`tok_student_verified`, `tok_other_student`) trước và sau khi chạy Vitest bằng cách gọi `resume` và `submit` hoàn tất bài thi.
  - Đảm bảo tính cô lập và xác định (idempotent) 100% qua mọi lần chạy liên tiếp của coordinator trên bản checkout sạch và máy chủ staging.

---

## 3. Bằng chứng kiểm thử và nghiệm thu

Tất cả các lệnh kiểm tra bắt buộc và cổng chung đều đạt 100%:

1. **`pnpm test:api:all`**:
   - Exit code: 0
   - 40/40 test suite đạt, 517/517 test case PASSED.

2. **`pnpm test:security`**:
   - Exit code: 0
   - 4/4 test suite đạt (gồm `security-matrix.test.ts`, `security-hardening.test.ts`, `authorization.test.ts`, `no-answer-leak.test.ts`), 85/85 test case PASSED.

3. **`pnpm install --frozen-lockfile`**:
   - Exit code: 0
   - Lockfile đồng bộ hoàn toàn với dependencies.

4. **`pnpm lint`**:
   - Exit code: 0
   - 13/13 gói mã nguồn đạt chuẩn linting.

5. **`pnpm typecheck`**:
   - Exit code: 0
   - Không có lỗi TypeScript (`tsc --noEmit` đạt 20/20 gói).

6. **`pnpm test`**:
   - Exit code: 0
   - 20/20 nhiệm vụ test toàn monorepo thành công.

7. **`pnpm build`**:
   - Exit code: 0
   - 12/12 ứng dụng và thư viện build thành công.
