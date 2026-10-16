# Quyết định kỹ thuật V02: API Security Hardening, Media Token Expiry, Path Traversal Defense & Isolated Rate Limiting

- **Task:** V02
- **Assignment:** V02-1
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/V02`
- **Base SHA:** `5312dce2ef046affbda7947574cae4e052196244`
- **Dependencies:** A02, A05 (Đã tích hợp đầy đủ)
- **Resource Locks:** `api-hardening`
- **Feature IDs:** Nền tảng bảo mật API toàn diện (SEC-01..SEC-10, SYS-07, SYS-19, TEA-13, GAME-06..GAME-09)

---

## 1. Bối cảnh và mục tiêu

Task V02 giải quyết triệt để các lỗ hổng an ninh API, kiểm thử phân quyền đa tầng (ownership, multi-tenant isolation, entitlement gating), phòng chống tấn công path traversal khi tải tệp, kiểm soát thời hạn URL/token media, và cô lập namespace rate limit giữa các worker cũng như môi trường staging/production.

### Ba tiêu chí nghiệm thu bắt buộc (Acceptance Criteria):

1. **Mọi endpoint có ownership / tenant / entitlement tests:**
   - **Ownership Protection:** Đảm bảo dữ liệu cá nhân (profile, phiên đăng nhập, GDPR export, tài khoản) chỉ người sở hữu được truy cập/thao tác; người dùng khác không thể xem hay thu hồi phiên của nhau; bình luận thảo luận chỉ tác giả hoặc admin mới có quyền xóa (`FORBIDDEN`); bài thi (`exam_attempts`) được xác thực quyền sở hữu nghiêm ngặt, thí sinh khác không thể xem hoặc nộp bài của người khác.
   - **Tenant Isolation (Cross-Tenant Protection):** Giáo viên thuộc Organization A bị chặn tuyệt đối khi đọc danh sách lớp, thành viên hoặc giao bài tập cho học viên thuộc Organization B (`TENANT_FORBIDDEN`, `INVALID_LEARNER`); `TenantGuard` kiểm tra và chặn header mạo danh `x-organization-id`; việc cấp phát ghế bản quyền (seat allocation) được cô lập giữa các tổ chức.
   - **Entitlement & Role Gating:** Học viên bị chặn khỏi toàn bộ endpoint admin (`/admin/imports`, `/admin/media`, `/admin/audit-logs`) trả về 403 `FORBIDDEN`; người dùng gói miễn phí bị chặn khỏi các tính năng cao cấp (`FEATURE_GATED`); sự kiện thi đồng loạt áp dụng embargo nghiêm ngặt không lộ kết quả trước `resultReleaseAt` (`RESULTS_EMBARGOED`); học viên chưa hoàn thành bài thi bị chặn khỏi thảo luận câu hỏi.

2. **Unsafe upload path và expired URL fail:**
   - **Path Traversal Defense:** Xây dựng hàm kiểm định nghiêm ngặt `isSafeUploadPath(filePath)` và `assertSafeUploadPath(filePath)` chặn đứng mọi chuỗi duyệt thư mục (`..`), dấu gạch chéo ngược (`\`), đường dẫn tuyệt đối (`/`), ký tự null byte (`\0`), URL-encoded traversal (`%2e%2e`), và ký tự nguy hiểm. Áp dụng đồng bộ vào:
     - `StorageService`, `LocalFsStorage`, `R2Storage`: `sanitizeKey` từ chối đường dẫn không an toàn với `StorageSecurityError`.
     - `POST /api/v1/admin/media`: Kiểm tra tên tệp trong payload upload, từ chối với 400 `BadRequestException`.
     - `POST /api/v1/me/avatar`: Kiểm tra `avatarUrl`, chặn chuỗi traversal và các URI scheme nguy hiểm (`javascript:`, `data:`, `vbscript:`, `file:`).
     - `POST /api/v1/admin/imports`: Kiểm tra tên tệp gói import multipart và raw payload, từ chối tệp không an toàn.
   - **Expired & Tampered URL Rejection:**
     - `GET /api/v1/media/:id` và `GET /api/v1/media/by-sha/:sha256`: Kiểm tra token ký bảo mật HMAC (`token`) qua thư viện chuẩn `@jlpt/media-token`, và kiểm tra tham số thời hạn (`exp`).
     - Khi token hết hạn hoặc giá trị `exp` trong quá khứ, endpoint từ chối ngay với 403 `EXPIRED_URL`.
     - Khi chữ ký hoặc token bị giả mạo/chỉnh sửa trái phép, endpoint từ chối với 403 `EXPIRED_URL`.
     - `MediaService.verifySignedMediaUrl(urlStr)` cung cấp cơ chế thẩm tra tính hợp lệ của URL ký trước.

3. **Rate-limit không dùng chung namespace staging / worker:**
   - Cải tiến `RateLimitGuard` để xác định namespace động qua hàm `getRateLimitNamespace()`:
     - Phân định độc lập theo `WORKER_ID` (`worker:w1`, `worker:w2`, ..., `worker:w6`).
     - Phân định độc lập theo môi trường `APP_ENV` (`staging`, `production`).
     - Hỗ trợ tiền tố Redis `REDIS_CACHE_KEY_PREFIX` và namespace tùy biến `RATE_LIMIT_NAMESPACE`.
     - Fallback an toàn cho môi trường kiểm thử: `test:isolated`.
   - Cấu trúc khóa lưu trữ: `${namespace}:${prefix}:${clientIp}`.
   - Hàm `reset(keyPrefix)` chỉ xóa hạn mức thuộc namespace hiện hành, đảm bảo các worker song song (W1..W6) và môi trường staging không bao giờ triệt tiêu hạn mức lẫn nhau.

---

## 2. Chi tiết các tệp thay đổi và triển khai

1. **`apps/api/src/common/utils/paths.ts`:**
   - Bổ sung `isSafeUploadPath(filePath: string): boolean`.
   - Bổ sung `assertSafeUploadPath(filePath: string): void` ném `UnsafePathError`.
   - Nhận diện và loại bỏ: relative path traversal (`..`), backslashes, leading slash, Windows drive letters, null bytes, double URL encoding (`%2e%2e`, `%2f`, `%5c`).

2. **`apps/api/src/modules/storage/local-fs.storage.ts` & `apps/api/src/modules/storage/r2.storage.ts`:**
   - Tích hợp `isSafeUploadPath` vào phương thức nội bộ `sanitizeKey`. Ném lỗi `StorageSecurityError` có mã lỗi rõ ràng khi phát hiện tấn công traversal.

3. **`apps/api/src/modules/media/media.controller.ts` & `media.service.ts`:**
   - Kiểm tra `isSafeUploadPath` trên tên tệp tải lên của `@Post('admin/media')`.
   - Bổ sung kiểm tra chữ ký và hạn dùng token trên `@Get('media/:id')` và `@Get('media/by-sha/:sha256')`: giải mã token bằng `@jlpt/media-token` `validateMediaAccess(token, secret, id)`, kiểm tra `exp` timestamp, trả về 403 `EXPIRED_URL` khi hết hạn.
   - Bổ sung helper `generateSignedMediaUrl` và `verifySignedMediaUrl` trong `MediaService`.

4. **`apps/api/src/modules/user/user.service.ts`:**
   - Nâng cấp `uploadAvatar`: kiểm tra tính an toàn của `avatarUrl` đối với path traversal và các scheme độc hại.

5. **`apps/api/src/modules/import/import.controller.ts`:**
   - Nâng cấp `@Post('admin/imports')`: kiểm tra an toàn đường dẫn cho tên tệp gói import cả dạng multipart và JSON payload.

6. **`apps/api/src/common/guards/rate-limit.guard.ts`:**
   - Bổ sung hàm `getRateLimitNamespace()` giải quyết phân vùng môi trường và worker ID.
   - Điều chỉnh cấu trúc khóa `getRateLimitKey()` gắn namespace phân định.
   - Điều chỉnh hàm `reset()` cô lập theo namespace.

7. **`apps/api/src/common/guards/security-hardening.test.ts`:**
   - Bộ kiểm thử bảo mật độc lập bao phủ toàn bộ 3 Acceptance Criteria với 24 kịch bản kiểm thử:
     - 1.1 Ownership Protection: Session isolation, GDPR data isolation, comment deletion authorization, exam attempt view/submit isolation.
     - 1.2 Tenant Isolation: Cross-tenant class listing, member access, cross-tenant assignment blocking, `TenantGuard` header rejection, seat allocation isolation.
     - 1.3 Entitlement & Role Gating: Admin route protection (imports, media, audit-logs), feature gate checks, exam event embargo result suppression, question discussion prerequisite completion.
     - 2.1 Unsafe Upload Paths: Unit tests `isSafeUploadPath`, storage driver rejection, admin media upload rejection, avatar URL traversal rejection, import package filename traversal rejection.
     - 2.2 Expired URL Failures: Expired signed token 403, expired `exp` timestamp 403, tampered token 403, valid signed token 200, URL verification utility.
     - 3.1 Rate Limit Namespaces: Environment and worker-specific namespace resolution, cross-worker quota isolation proof.

8. **`package.json` & `apps/api/package.json`:**
   - Bổ sung lệnh bắt buộc:
     - `"test:security"`: Chạy bộ kiểm thử an ninh bảo mật chuyên sâu (`security-hardening.test.ts`, `authorization.test.ts`, `no-answer-leak.test.ts`).
     - `"test:api:all"`: Chạy toàn bộ 31 bộ kiểm thử API backend.

---

## 3. Kết quả chạy kiểm thử và nghiệm thu (Checks & Gates)

Mọi kiểm tra bắt buộc và cổng chung đều đạt kết quả tuyệt đối trên workspace:

1. **`pnpm test:security`:**
   - 3 test files (`security-hardening.test.ts`, `authorization.test.ts`, `no-answer-leak.test.ts`).
   - 56/56 tests PASS.
   - Thời gian thực thi: ~10.5 giây. Exit code: 0.

2. **`pnpm test:api:all`:**
   - 31 test files.
   - 414/414 tests PASS.
   - Exit code: 0.

3. **Common Gates:**
   - `pnpm install --frozen-lockfile`: PASS (Exit code: 0).
   - `pnpm lint`: PASS (0 errors, 0 warnings trên 13 packages).
   - `pnpm typecheck`: PASS (19 tasks successful, strict TypeScript).
   - `pnpm test`: PASS (19 tasks successful across all packages).
   - `pnpm build`: PASS (Tất cả ứng dụng và thư viện build thành công).
