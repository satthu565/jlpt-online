# Quyết định kiến trúc C02: Lưu trữ media, nguồn license và ngân hàng câu hỏi có phiên bản

- Mã task: `C02`
- Phụ trách: `W2` (API tài khoản nội dung và thi)
- Ngày: 2026-10-16
- Trạng thái: `DECIDED` / `READY_FOR_REVIEW`

## 1. Bối cảnh & Mục tiêu

Task C02 phụ trách hạ tầng lưu trữ media, kiểm soát an toàn tệp tải lên (magic bytes, chống giả mạo đuôi, chống Zip-Slip, chống Zip-Bomb), kiểm soát bản quyền xuất xứ nguồn tài liệu (licensing & provenance enforcement), và hệ thống ngân hàng câu hỏi có quản lý phiên bản bất biến (immutable versioning), quy trình duyệt độc lập (separation of duties), nhập gói câu hỏi idempotent và public preview an toàn không lộ đáp án.

Các tính năng phụ trách theo phân công:
- `QB-01`: Quản lý danh mục nhóm câu hỏi (Question Group CRUD)
- `QB-02`: Quản lý câu hỏi đơn lẻ và câu hỏi con trong nhóm
- `QB-03`: Quản lý các phương án lựa chọn và đáp án đúng
- `QB-04`: Quản lý phiên bản câu hỏi (versioning, diff, audit log)
- `QB-05`: Gắn nhãn phân loại (JLPT Level N5-N1, Skill, Mondai Type)
- `QB-06`: Quản lý media đính kèm câu hỏi (audio nghe, hình ảnh bài đọc)
- `QB-07`: Quản lý giải thích chi tiết câu hỏi (explanation)
- `QB-11`: Tìm kiếm và lọc câu hỏi nâng cao (level, skill, mondai, status, tags)
- `QB-13`: Ẩn tạm thời câu hỏi có lỗi (status: hidden)
- `QB-14`: Xem trước câu hỏi phía học viên (public preview, cam kết không lộ đáp án)
- `QB-15`: Phê duyệt câu hỏi độc lập (người duyệt khác người tạo/sửa)
- `QB-16`: Quản lý nguồn gốc và giấy phép bản quyền (source provenance & license)
- `QB-17`: Lịch sử thay đổi và phiên bản câu hỏi
- `ADM-05`: Quản lý ngân hàng câu hỏi tổng thể
- `ADM-06`: Quản lý kho media tập trung (upload, preview, deduplication)
- `ADM-19`: Takedown nội dung vi phạm bản quyền hoặc hết hạn quyền

## 2. Các quyết định kỹ thuật chính

### 2.1. Kiến trúc lưu trữ tệp (Storage Abstraction: Local vs R2)

- **Abstraction Interface (`ObjectStorage`)**:
  - Định nghĩa chuẩn `put`, `get`, `head`, `delete` và `RangeQuery` (`start`, `end`).
  - Hỗ trợ HTTP Range Requests phục vụ streaming audio/video mượt mà (HTTP 206 Partial Content), tránh tải toàn bộ tệp âm thanh nghe vào bộ nhớ máy chủ.
- **Local Filesystem Storage (`LocalFsStorage`)**:
  - Lưu trữ trên đĩa cục bộ phục vụ môi trường development và test.
  - Bảo vệ chống đường dẫn độc hại: chuẩn hóa đường dẫn với `path.resolve` và kiểm tra `resolved.startsWith(baseDir)`. Mọi nỗ lực `../` đều bị từ chối với lỗi bảo mật.
  - Tính toán mã băm SHA-256 của tệp trong luồng ghi.
- **Cloudflare R2 Storage (`R2Storage`)**:
  - Tích hợp chuẩn S3 client của AWS SDK v3 (`@aws-sdk/client-s3`).
  - Khử độc key lưu trữ (loại bỏ `../`, `..\\`, ký tự điều khiển).
  - Điều kiện ngoài `r2: MISSING` trên host được ghi nhận là `BLOCKED_EXTERNAL` cho việc kiểm thử với bucket thật trên cloud, nhưng code và integration sandbox được hoàn thiện 100%.

### 2.2. Kiểm soát an toàn tệp tải lên (Acceptance 1: Chống giả mạo đuôi, Zip-Slip, Zip-Bomb)

- **Nhận diện định dạng tệp qua Magic Bytes (`detectMagicMimeType`)**:
  - Không tin tưởng vào `Content-Type` của HTTP Header hay phần mở rộng đuôi tệp do client gửi.
  - Phân tích trực tiếp các byte đầu (header signatures):
    - PNG: `89 50 4E 47 0D 0A 1A 0A`
    - JPEG: `FF D8 FF`
    - WebP: `52 49 46 46 ... 57 45 42 50`
    - AVIF: `.... ftyp avif / avis`
    - MP3: `49 44 33` (ID3 tag) hoặc `FF FB / FF F3 / FF F2` (MPEG sync frame)
    - WAV: `52 49 46 46 ... 57 41 56 45`
    - M4A: `.... ftyp M4A `
    - PDF: `25 50 44 46 2D` (`%PDF-`)
  - Chặn ngay tệp giả mạo: file thực thi PE/MZ (`4D 5A`), ELF (`7F 45 4C 46`), script shell (`#!`), HTML/PHP.
  - Giới hạn dung lượng nghiêm ngặt: Audio tối đa 100MB, Ảnh tối đa 5MB, PDF tối đa 100MB.
- **Trích xuất thông tin media tự động**:
  - Trích xuất thời lượng audio (WAV, MP3, M4A) và kích thước ảnh (PNG, JPEG, WebP) ngay khi tải lên.
- **Bảo mật giải nén ZIP (`zip-security.ts`)**:
  - Chống **Zip-Slip**: Kiểm tra từng đường dẫn trong tệp nén; từ chối tuyệt đối đường dẫn chứa `../`, `..\\`, đường dẫn tuyệt đối bắt đầu bằng `/` hoặc `C:`.
  - Chống **Zip-Bomb**:
    - Tỷ lệ nén giải nén tối đa 200:1 (`uncompressedSize / compressedSize <= 200`).
    - Kích thước từng tệp giải nén không vượt quá 120MB.
    - Tổng dung lượng toàn bộ gói giải nén không vượt quá 500MB.
    - Tổng số lượng entry trong tệp nén không vượt quá 2000 tệp.
  - Từ chối tệp ZIP có mã hóa password hoặc chứa symlink/hardlink.

### 2.3. Quản lý phiên bản bất biến (Acceptance 2: Sửa nội dung approved tạo phiên bản mới)

- **Bất biến của phiên bản đã duyệt (Approved Immutability)**:
  - Khi nhóm câu hỏi hoặc câu hỏi đang ở trạng thái `draft` hoặc `rejected`, người biên tập có thể sửa trực tiếp trên phiên bản hiện hành (in-place update).
  - Khi phiên bản hiện hành đang ở trạng thái `approved` (hoặc `published`), mọi chỉnh sửa nội dung **không được phép ghi đè** lên phiên bản đó.
  - Hệ thống tự động tạo phiên bản mới (`version = currentVersion + 1`) với trạng thái ban đầu là `draft`, sao chép cấu trúc và cập nhật các trường mới. Phiên bản `approved` cũ được bảo toàn nguyên vẹn 100%.
- **Quy trình duyệt độc lập (Separation of Duties - QB-15)**:
  - Lưu vết `lastEditorId` trên từng phiên bản.
  - Khi duyệt (`reviewGroup`), người kiểm tra (`reviewerId`) **không được trùng** với người tạo hoặc người sửa cuối cùng (`reviewerId !== lastEditorId`). Vi phạm sẽ bị từ chối với mã lỗi `HTTP 403 Forbidden: Tự phê duyệt bị từ chối`.
- **Ẩn tạm thời câu hỏi có lỗi (`QB-13`)**:
  - Cho phép người kiểm duyệt hoặc quản trị viên chuyển trạng thái phiên bản sang `hidden` kèm lý do giải trình (`reason`), ngăn câu hỏi xuất hiện trong đề thi mới.
- **Bảo vệ rò rỉ đáp án phía học viên (`QB-14`)**:
  - Endpoint `GET /groups/:id/preview` chỉ trả về `groupId`, `stem`, `passage`, `media`, và danh sách `options` (chỉ gồm `label` và `content`).
  - Triệt để loại bỏ `correctOption`, `explanation`, `explanationNotes`, `isCorrect`.
  - Xác thực qua hàm `assertNoAnswerLeak` của `@jlpt/schema`.

### 2.4. Bản quyền xuất xứ và kiểm soát phân phối (Acceptance 3: Nguồn chưa cấp quyền không xuất bản hoặc trộn)

- **Quản lý nguồn (`exam_sources`) và giấy phép (`content_licenses`)**:
  - Lưu trữ xuất xứ (tác giả, nhà xuất bản, năm, ISBN, mức độ tin cậy).
  - Mỗi giấy phép có hiệu lực theo thời gian (`effectiveFrom` đến `expiresAt`) và các cờ quyền lợi (`rightsJson: { allowPublish, allowRemix, attributionRequired, commercialUse }`).
- **Thực thi bản quyền (`enforcePublishable` & `enforceMixable`)**:
  - Khi xuất bản câu hỏi hoặc phát hành đề thi: nếu nguồn không có giấy phép hợp lệ, hoặc giấy phép đã hết hạn, hoặc giấy phép bị thu hồi/gỡ bản quyền (`revokedAt !== null`), hệ thống ném ngoại lệ `LicenseDeniedError` (`HTTP 403 LICENSE_DENIED`).
  - Khi trộn đề từ nhiều nguồn (`mixable`): nếu giấy phép có `allowRemix: false`, câu hỏi bị từ chối đưa vào đề thi trộn.
- **Takedown tức thì (`ADM-19`)**:
  - Quản trị viên gọi `takedownLicense(licenseId, reason, adminId)` sẽ lập tức ghi nhận `revokedAt = NOW()` và `revocationReason`. Mọi yêu cầu xuất bản hay trộn đề liên quan đến nguồn này sẽ bị chặn ngay lập tức.
- **Bảo vệ toàn vẹn khóa ngoại**:
  - Không cho phép xóa nguồn hoặc giấy phép đang được câu hỏi tham chiếu.

### 2.5. Nhập gói dữ liệu Idempotent (Acceptance 4: Import trùng checksum idempotent)

- **Xử lý idempotent dựa trên SHA-256**:
  - Mỗi gói tệp ZIP tải lên được tính toán mã băm SHA-256 (`packageSha256`).
  - Bảng `import_jobs` lưu trữ lịch sử các gói đã nhập.
  - Nếu tệp tải lên có cùng `packageSha256` với một tác vụ đã hoàn thành trước đó: hệ thống phát hiện trùng lặp và trả về ngay kết quả đã lưu (`idempotent: true`, `jobId`, `status: 'completed'`), không thực hiện lặp lại thao tác ghi cơ sở dữ liệu.
  - Nếu gói tải lên có cùng `packageId` và `revision` nhưng nội dung tệp khác nhau (checksum không khớp): hệ thống từ chối với lỗi xung đột `HTTP 409 Conflict: IDEMPOTENCY_CONFLICT`.

## 3. Kết quả kiểm thử & Bằng chứng

- Bộ kiểm thử bộ nhớ PGlite WASM thực thi toàn diện các ràng buộc cơ sở dữ liệu và giao dịch thực tế:
  1. `pnpm test:storage`: 8/8 tests passed (LocalFs traversal protection, Range requests, R2 key sanitization & S3 commands, Range header parser).
  2. `pnpm test:upload`: 11/11 tests passed (Magic bytes MIME detection, reject disguised MZ/ELF/scripts, enforce size limits, WAV/PNG metadata extraction, Zip-Slip rejection, Zip-Bomb rejection, safe zip extraction, deduplication by SHA-256).
  3. `pnpm test:content`: 14/14 tests passed (Question group CRUD, immutable versioning on approved content edit, separation of duties review rejection, hidden status, public preview zero-leak assertion, idempotent package import, source CRUD, license expiration/takedown enforcement, remix denial).
- Toàn bộ 17 packages trong repo vượt qua `pnpm typecheck` với TypeScript strict mode hoàn toàn không lỗi.
