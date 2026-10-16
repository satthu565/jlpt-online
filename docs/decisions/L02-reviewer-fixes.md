# Quyết định kỹ thuật L02: Khắc phục phản hồi kiểm duyệt của W1

## 1. Bối cảnh và phản hồi của Reviewer W1
Trong lượt review L02 trước đó, Reviewer W1 đã chỉ ra một số điểm cần khắc phục:
1. **[P0]** Lộ thông tin đáp án và lời giải thô qua endpoint quản trị: `GET /explanations` và `GET /explanations/:id` trong `ReviewController` thiếu tiền tố `admin/` và thiếu decorator `@Roles`, khiến học sinh có thể đọc toàn bộ lời giải và đáp án thô trước khi làm bài thi.
2. **[P1]** Lệch hợp đồng OpenAPI và SDK `@jlpt/api-client`: Các đường dẫn quản trị lời giải trong OpenAPI và API client đều sử dụng `/api/v1/admin/explanations`, `/api/v1/admin/explanations/:id` và `/api/v1/admin/explanations/:id/reviews`.
3. **[P1]** Thiếu chặn xem giải thích thi thật và sai mã lỗi: `GET /attempts/:id/explanations/:index` ném `403 FORBIDDEN` thay vì `409 RESULTS_EMBARGOED` theo chuẩn OpenAPI, và không chặn khi bài thi thật ở trạng thái khác `in_progress` nhưng chưa nộp (`submitted`), cũng như chưa kiểm tra embargo kết quả thi đồng loạt (`exam_events.resultReleaseAt`).
4. **[P1]** Bỏ sót kiểm tra giấy phép bị thu hồi trong tạo đề: `loadCandidateGroups` trong `practice.service.ts` không kiểm tra `lic.revokedAt !== null`, dẫn đến câu hỏi có license bị thu hồi vẫn có thể được engine đưa vào đề luyện và đề trộn.
5. **[P2]** Kiểm tra quyền transcript bài nghe (AUDIO-08) thiếu điều kiện `lic.revokedAt` và `lic.expiresAt`.
6. **[P2]** Hàm `isInQuietHours` trong `notification.service.ts` có thể bị lỗi `RangeError` làm sập tiến trình khi timezone của profile người dùng không hợp lệ.
7. **[P2]** Hàm `updateExplanation` trong `review.service.ts` chưa xác thực `mergedContent` qua `ExplanationDraftSchema` trước khi ghi vào database.

## 2. Giải pháp kỹ thuật

### 2.1. Bảo mật endpoint quản trị lời giải (P0 & P1)
- Cập nhật toàn bộ các route quản trị trong `ReviewController`:
  - `POST /admin/explanations` với `@Roles('admin', 'editor')`
  - `GET /admin/explanations` với `@Roles('admin', 'editor', 'reviewer')`
  - `GET /admin/explanations/:id` với `@Roles('admin', 'editor', 'reviewer')`
  - `PATCH /admin/explanations/:id` với `@Roles('admin', 'editor')`
  - `POST /admin/explanations/:id/reviews` với `@Roles('admin', 'reviewer', 'editor')`
- Học viên (`learner` / `student`) chỉ được truy cập lời giải qua endpoint duy nhất: `GET /attempts/:id/explanations/:index`. Bất kỳ truy cập nào của học viên vào `/admin/explanations` đều bị `RolesGuard` từ chối với HTTP 403 Forbidden.

### 2.2. Kiểm soát xem lời giải thi thật và embargo kết quả (P1)
- Trong `review.service.ts` phương thức `getLearnerExplanation`:
  - Đối với bài thi thật (`attempt.mode === 'real'`), chỉ cho phép xem lời giải khi bài thi đã được nộp (`attempt.status === 'submitted'`). Mọi trạng thái khác đều trả về `409 RESULTS_EMBARGOED` với thông báo "Kết quả chưa được công bố." theo đúng hợp đồng OpenAPI.
  - Kiểm tra liên kết sự kiện thi đồng loạt qua bảng `event_attempts` và `exam_events`: nếu thời điểm hiện tại chưa vượt qua `examEvents.resultReleaseAt`, ném `ConflictException` với mã lỗi `RESULTS_EMBARGOED`.

### 2.3. Kiểm tra thu hồi giấy phép trong tạo đề luyện và đề trộn (P1)
- Trong `practice.service.ts` hàm `loadCandidateGroups`:
  - Bổ sung kiểm tra `const isRevoked = lic.revokedAt !== null;` và `const isExpired = lic.expiresAt ? new Date(lic.expiresAt) <= new Date() : false;`.
  - Nếu giấy phép đã bị thu hồi hoặc hết hạn, đặt `remixAllowed = false` và `displayAllowed = false`, đảm bảo engine lọc bỏ hoàn toàn các nhóm câu hỏi này khỏi đề luyện tập và đề trộn mới.

### 2.4. Bản quyền transcript âm thanh (P2)
- Trong `review.service.ts` mục kiểm tra `AUDIO-08`:
  - Bổ sung điều kiện kiểm tra `lic.revokedAt !== null` hoặc `lic.expiresAt && new Date(lic.expiresAt) <= new Date()`. Nếu vi phạm, đặt `transcriptAllowed = false` và trả về `transcript: null`.

### 2.5. Phòng chống sập tiến trình khi timezone không hợp lệ (P2)
- Trong `notification.service.ts` hàm `isInQuietHours`:
  - Bọc khối khởi tạo `new Intl.DateTimeFormat('en-US', { timeZone: timezone, ... })` trong `try / catch`.
  - Nếu gặp `RangeError` (hoặc bất kỳ lỗi định dạng múi giờ nào), tự động fallback về timezone mặc định `'Asia/Ho_Chi_Minh'` một cách an toàn.

### 2.6. Xác thực bản thảo giải thích khi cập nhật (P2)
- Trong `review.service.ts` hàm `updateExplanation`:
  - Gọi `const validatedContent = ExplanationDraftSchema.parse(mergedContent);` trước khi thực hiện câu lệnh `db.update(...)`.
  - Đảm bảo dữ liệu lời giải sau khi merge vẫn tuân thủ đầy đủ schema hợp lệ.

## 3. Kiểm thử và xác nhận nghiệm thu
- Bổ sung và cập nhật đầy đủ test suite:
  - `pnpm test:explanations`: 13/13 tests pass. Xác nhận chặn 403 học viên vào admin, xác nhận Zod validation khi update explanation, xác nhận lược bỏ transcript khi revoked license, xác nhận 409 RESULTS_EMBARGOED khi bài thi thật chưa nộp hoặc đang trong thời gian embargo.
  - `pnpm test:practice-api`: 15/15 tests pass. Xác nhận chặn chia sẻ đề và loại trừ candidate groups khi license bị thu hồi (`revokedAt !== null`).
  - `pnpm test:notifications`: 15/15 tests pass. Xác nhận `isInQuietHours` không ném RangeError khi timezone không hợp lệ.
