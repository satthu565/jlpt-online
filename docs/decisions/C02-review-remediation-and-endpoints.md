# Quyết định kỹ thuật C02: Khắc phục phản hồi Reviewer W1 và Hoàn thiện Endpoints Quản trị

- Mã task: `C02`
- Phụ trách: `W2` (API tài khoản nội dung và thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED` / `READY_FOR_REVIEW`

## 1. Bối cảnh

Trong đợt review trước của Task C02, Reviewer W1 đã chỉ ra các điểm cần khắc phục:
1. `[P1]` `magic-bytes.ts`: Chỉ kiểm tra mảng `allowedMimesForExt` khi extension tồn tại trong `extMimeMap`. Các file có đuôi nguy hiểm (.exe, .sh, .php) mang magic bytes hợp lệ không bị từ chối do `allowedMimesForExt` là undefined.
2. `[P1]` `question-bank.controller.ts`: Thiếu 3 endpoint quản trị theo hợp đồng `contracts/openapi.yaml`: `GET /api/v1/admin/groups/{id}`, `DELETE /api/v1/admin/groups/{id}`, và `GET /api/v1/admin/groups/{id}/versions`.
3. `[P1]` `question-bank.service.ts`: `updateGroup` chỉ tạo phiên bản mới khi `currentVersion.status === 'approved'`. Nếu nhóm câu hỏi bị ẩn tạm thời (`status === 'hidden'`), việc sửa đổi bị ghi đè in-place, làm mất tính bất biến của phiên bản đã từng phát hành.
4. `[P1]` `question-bank.controller.ts`: `adminListGroups` trả về mảng trực tiếp thay vì bọc trong `{ items: [...] }` theo schema OpenAPI.
5. `[P2]` `media.controller.ts`: `getMedia` đọc toàn bộ file vào RAM trước khi kiểm tra Range header, gây lãng phí bộ nhớ khi client yêu cầu HTTP 206 streaming.
6. `[P2]` `question-bank.service.ts`: `groupLastEditors` lưu trong in-memory Map, bị xóa sạch khi ứng dụng restart khiến việc kiểm tra người duyệt độc lập (QB-15) không xác định được `lastEditorId`.
7. `[P2]` `question-bank.service.ts`: `getGroupPublicPreview` khi không có tham số version lấy phiên bản mới nhất mà không kiểm tra `status === 'approved'`, có nguy cơ lộ bản nháp (draft) hoặc bản bị ẩn (hidden) ra học viên.

## 2. Giải pháp thực hiện

### 2.1. Whitelist phần mở rộng tệp và từ chối đuôi nguy hiểm (Acceptance 1)
- `validateMediaMagicBytes` kiểm tra `extFromFilename` nghiêm ngặt theo whitelist `extMimeMap` (`png`, `jpg`, `jpeg`, `webp`, `avif`, `mp3`, `m4a`, `wav`, `pdf`).
- Nếu phần mở rộng không nằm trong whitelist hoặc không tương thích với `detectedMime`:
  ```typescript
  const allowedMimesForExt = extMimeMap[extFromFilename];
  if (!allowedMimesForExt || !allowedMimesForExt.includes(detected)) {
    throw new MediaValidationError(
      `Phần mở rộng .${extFromFilename} không được phép hoặc không khớp nội dung thực tế (${detected}) cho tệp ${filename}`,
    );
  }
  ```
- Các tệp như `payload.exe`, `script.sh`, `shell.php` dù mang header giả mạo (PNG/MP3 signature) đều bị từ chối ngay lập tức.

### 2.2. Bổ sung các Endpoint Quản trị & Hợp đồng OpenAPI (QB-01, QB-04, QB-17)
- Bổ sung `GET /api/v1/admin/groups/:id`: Trả về chi tiết nhóm câu hỏi gồm phiên bản hiện tại, danh sách câu hỏi con, các phương án lựa chọn và đáp án đúng.
- Bổ sung `DELETE /api/v1/admin/groups/:id`: Thực hiện soft-delete (cập nhật `deletedAt = NOW()`) cho nhóm câu hỏi và toàn bộ câu hỏi trực thuộc, trả về HTTP 204 No Content.
- Bổ sung `GET /api/v1/admin/groups/:id/versions`: Truy vấn lịch sử phiên bản bất biến của nhóm câu hỏi, trả về `{ items: Array<QuestionGroupVersion> }`.
- Cập nhật `GET /api/v1/admin/groups`: Bọc kết quả tìm kiếm trong `{ items: [...] }` khớp schema OpenAPI `adminListGroups`.

### 2.3. Bảo vệ tính bất biến của phiên bản bị ẩn (`status === 'hidden'`) (Acceptance 2, QB-13)
- Mở rộng điều kiện tạo phiên bản mới trong `updateGroup`:
  ```typescript
  if (currentVersion.status === 'approved' || currentVersion.status === 'hidden') {
    const nextVersionNum = currentVersion.version + 1;
    // Tạo phiên bản mới ở trạng thái draft, giữ nguyên phiên bản cũ bất biến
  }
  ```
- Đảm bảo phiên bản bị ẩn do phát hiện lỗi nội dung trong đề thi thực tế không bị ghi đè, bảo toàn vết dữ liệu kiểm toán và kết quả thi trước đó.

### 2.4. Tối ưu HTTP 206 Partial Content Streaming (`MediaController`)
- Bổ sung phương thức `getMediaMetadata(id)` trong `MediaService` chỉ truy vấn metadata từ bảng `media_assets` (SELECT 1 row) mà không đọc stream từ storage.
- `MediaController.getMedia` kiểm tra `parseRangeHeader` trước:
  - Nếu có Range header hợp lệ: Chỉ gọi `getMedia(id, parsedRange)` một lần duy nhất với khoảng byte cần phát, gửi phản hồi HTTP 206 kèm `Content-Range`.
  - Nếu không có Range: Đọc toàn bộ nội dung và trả về HTTP 200.

### 2.5. Bền vững hóa `lastEditorId` qua nhật ký `content_reviews` (QB-15)
- Khi tạo nhóm (`createGroup`), sửa đổi (`updateGroup`) hoặc nộp duyệt (`submitForReview`), ghi nhận một bản ghi audit log vào bảng `content_reviews` với `lastEditorId: editorId` và `targetType: 'group_version'`.
- Khi thực hiện kiểm duyệt (`reviewGroup`), nếu in-memory cache rỗng (do restart ứng dụng):
  ```typescript
  let lastEditorId = this.groupLastEditors.get(`${groupId}:${expectedVersion}`);
  if (!lastEditorId) {
    const reviewLogs = await this.dbClient.db
      .select()
      .from(contentReviews)
      .where(
        and(
          eq(contentReviews.targetType, 'group_version'),
          eq(contentReviews.targetId, groupId),
          eq(contentReviews.targetVersion, expectedVersion),
        ),
      )
      .orderBy(desc(contentReviews.reviewedAt), desc(contentReviews.id))
      .limit(1);
    if (reviewLogs.length > 0 && reviewLogs[0]?.lastEditorId) {
      lastEditorId = reviewLogs[0].lastEditorId;
    }
  }
  ```
- Đảm bảo quy tắc separation of duties không thể bị vô hiệu hóa bằng cách khởi động lại container/service.

### 2.6. Bảo vệ Public Student Preview (QB-14)
- Khi học viên truy cập `/api/v1/groups/:id/preview` không truyền tham số `version`: Hệ thống chỉ truy vấn phiên bản mới nhất đang có `status === 'approved'`. Nếu nhóm câu hỏi chưa có phiên bản nào được duyệt (toàn bộ đang là draft hoặc hidden), trả về `404 Not Found`.
- Đảm bảo không làm rò rỉ bất kỳ nội dung bản nháp hoặc câu hỏi bị thu hồi ra môi trường học viên.
