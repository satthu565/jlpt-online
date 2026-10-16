# Quyết định kỹ thuật N02: API thi thật bảo mật và job nền

- **Task:** N02
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/N02`
- **Base SHA:** `43fecaef9eca7eb47cabfce237fd18680153210f`
- **Dependencies:** C01, C02

---

## 1. Bối cảnh và mục tiêu

Task N02 triển khai các API thi bảo mật, kiểm soát đồng thời (race condition), phòng ngừa rò rỉ đáp án, thực hiện xử lý bất đồng bộ qua outbox và các job nền phục vụ toàn bộ chu trình thi thật và thi thử của hệ thống JLPT Online:
- Đáp ứng đầy đủ 10 tính năng được giao:
  - `EXAM-09`: Đề thi làm thử (Guest Trial) với cookie khách và kiểm tra Turnstile.
  - `EXAM-18`: Vào lại bài thi (Resume) khi mất kết nối, cấp lease mới và vô hiệu hóa lease cũ.
  - `EXAM-20`: Tự động thu bài khi hết giờ (deadline server, grace period, late sync window).
  - `SYS-03`: Đồng bộ phiếu làm bài an toàn (seq, ACK sau commit DB, không mất bài thi).
  - `SYS-05`: Quản lý phiên làm bài đơn nhất (leaseId, ngăn hai tab cùng làm bài đè dữ liệu).
  - `SYS-12`: Giới hạn tốc độ gọi API (Rate limiting) phòng chống spam/brute-force.
  - `SYS-13`: Kiểm soát chặt chẽ không để lộ bảng đáp án và giải thích trước khi nộp bài.
  - `SYS-18`: Cơ chế Outbox pattern và đảm bảo xử lý sự kiện bất đồng bộ tin cậy.
  - `SYS-20`: Cấp token tạm thời có thời hạn (Media Token) truy cập file nghe/hình ảnh đề thi.
  - `ADM-14`: Ghi nhận nhật ký kiểm toán (Audit Logs) cho các hành động quản trị viên.

- Đạt đầy đủ 5 tiêu chí nghiệm thu:
  1. Seq2 trước 1 trùng seq hai tab và submit/job race đúng.
  2. ACK chỉ sau commit DB.
  3. Answer key không xuất hiện trước nộp.
  4. TOTP Origin CSRF rate-limit audit có negative tests.
  5. Guest chỉ làm đề guestTrial, attach history không chiếm attempt người khác.

- Cung cấp và chạy thành công 4 lệnh kiểm tra:
  - `pnpm test:attempts` (12/12 tests passed)
  - `pnpm test:authorization` (23/23 tests passed)
  - `pnpm test:no-answer-leak` (9/9 tests passed)
  - `pnpm test:jobs` (5/5 tests passed)

---

## 2. Các quyết định kỹ thuật và kiến trúc

### 2.1. Quản lý đồng thời và chống Race Condition (EXAM-20, SYS-03, SYS-05)
- **Cơ chế Lease duy nhất:**
  - Mỗi lượt thi được bảo vệ bởi một mã `leaseId` ngẫu nhiên (UUIDv4).
  - Khi thí sinh vào lại bài thi (`POST /api/v1/attempts/:id/resume`), một `leaseId` mới được sinh ra và cập nhật vào CSDL. Mọi request với `leaseId` cũ đều bị từ chối 409 `LEASE_INVALID`.
- **Đồng bộ phiếu trả lời theo số thứ tự (Sequence Number):**
  - Mọi thao tác gửi đáp án (`PUT /api/v1/attempts/:id/sheet`) đều gửi kèm số `seq`.
  - CSDL chỉ cập nhật bảng `attempt_answer_sheets` khi `incoming_seq > current_lastSeq`. Trường hợp lô `seq=2` đến trước `seq=1`, dữ liệu của `seq=2` được giữ nguyên; tuy nhiên mọi sự kiện `seq=1` và `seq=2` đều được lưu đầy đủ vào `attempt_events` để làm audit trail.
  - Trường hợp 2 tab cùng gửi trùng một số `seq`: CSDL xử lý hoàn toàn idempotent, trả về 200 ACK với `lastSeq` hiện tại và không bị trùng lặp dữ liệu hay lỗi khóa.
- **Xử lý đua lệnh giữa nộp bài và job nền thu bài (Submit vs Job Race):**
  - Cả luồng thí sinh chủ động nộp bài (`POST /api/v1/attempts/:id/submit`) và job nền tự động thu bài (`closeExpiredAttempts`) đều sử dụng chung một hàm nguyên tử `lockAndScoreAttempt()`.
  - Sử dụng cơ chế in-memory mutex promise lock theo từng `attemptId` kết hợp giao dịch CSDL với `SELECT ... FOR UPDATE`.
  - Khi một luồng giành được quyền chấm trước và cập nhật trạng thái `status = 'submitted'`, luồng chạy sau sẽ nhận diện bài thi đã được nộp và trả về ngay lập tức mà không thực hiện chấm lần thứ hai.
  - Đảm bảo trong bảng `outbox` chỉ sinh ra duy nhất một sự kiện `attempt.submitted` và kết quả điểm số hoàn toàn nhất quán.

### 2.2. ACK chỉ trả về sau khi Commit Database (Acceptance 2, SYS-03)
- Tuyệt đối không trả ACK sớm từ bộ nhớ tạm hoặc trước khi giao dịch CSDL hoàn thành.
- Endpoint `PUT /api/v1/attempts/:id/sheet` thực hiện toàn bộ việc ghi nhật ký `attempt_events` và cập nhật `attempt_answer_sheets` bên trong transaction CSDL. Chỉ khi commit CSDL thành công mới trả về HTTP 200 ACK chứa `{ lastSeq, serverNow }`.
- Nếu dữ liệu phiếu trả lời vi phạm kích thước hoặc vượt quá số phương án của câu hỏi, hệ thống ném `BadRequestException` với mã `VALIDATION_ERROR` và không trả về ACK.

### 2.3. Phòng chống rò rỉ đáp án tuyệt đối trước khi nộp bài (SYS-03, SYS-13, EXAM-09)
- Trong suốt quá trình làm bài (`status = 'in_progress'`), mọi endpoint gồm:
  - Khởi tạo bài thi: `POST /api/v1/attempts`
  - Chuyển phần thi: `POST /api/v1/attempts/:id/sections/next`
  - Cập nhật đáp án: `PUT /api/v1/attempts/:id/sheet`
  - Tra cứu thông tin bài thi: `GET /api/v1/attempts/:id`
  - Vào lại bài thi: `POST /api/v1/attempts/:id/resume`
  - Đều tuyệt đối loại bỏ các trường `answerKey`, `keys`, `correct`, `result` và lời giải thích.
- Trong chế độ thi thật (`mode = 'real'`), endpoint kiểm tra đáp án từng câu (`POST /api/v1/attempts/:id/check`) bị từ chối 403 `FORBIDDEN`.
- Endpoint xem lại bài thi (`GET /api/v1/attempts/:id/review`) từ chối 409 `ATTEMPT_NOT_SUBMITTED` đối với bài thi chưa nộp. Chỉ sau khi đã nộp bài thành công, thí sinh mới được phép truy cập để xem bảng đáp án đúng và điểm số chi tiết.

### 2.4. Phân quyền, 2FA TOTP, Origin CSRF, Rate Limit và Audit Log (SYS-06, SYS-07, SYS-12, ADM-14)
- **TOTP 2FA:** Sử dụng chuẩn RFC 6238 với secret Base32 an toàn. Decorator `@RequireTotp()` bảo vệ các thao tác quản trị viên nhạy cảm, có đầy đủ negative test khi thiếu mã hoặc gửi mã sai.
- **Bảo vệ Origin & CSRF:** `OriginGuard` xác thực header `Origin` trên các request làm thay đổi dữ liệu (POST, PUT, DELETE, PATCH). Từ chối 403 đối với origin không hợp lệ.
- **Giới hạn tần suất gọi (Rate Limiting):** `RateLimitGuard` theo dõi số lượng gọi theo IP và endpoint trong khung thời gian trượt (Sliding Window), trả về 429 `RATE_LIMITED` khi vượt ngưỡng.
- **Bảo vệ PII:** `PiiMaskingInterceptor` và các helper đệ quy che mặt nạ email (`u***@example.com`), ẩn bearer token và các tham số bí mật trong log.
- **Nhật ký kiểm toán (Audit):** `AuditService` ghi nhận có cấu trúc mọi thao tác quản trị vào bảng `audit_logs` phục vụ giám sát và tra cứu.

### 2.5. Bảo vệ luồng khách thi thử và gắn lịch sử thi (EXAM-09, SYS-18)
- Thí sinh chưa đăng nhập được gán `guestId` thông qua cookie HTTP-only `__Host-guest`.
- Khách chỉ được phép tạo bài thi trên các đề thi được gắn cờ `guest_trial = true`. Mọi yêu cầu thi thử trên đề thi tiêu chuẩn đều bị từ chối 401 `UNAUTHENTICATED`.
- Tài khoản đã đăng ký nhưng chưa xác minh email bị chặn 403 `EMAIL_NOT_VERIFIED`.
- Khi khách đăng ký tài khoản và gọi `POST /api/v1/auth/attach-guest`:
  - Hệ thống chỉ chuyển các bài thi gắn với đúng `guestId` của khách đó và có `userId IS NULL`.
  - Tuyệt đối không thay đổi hay chiếm đoạt bài thi của bất kỳ người dùng nào khác.

### 2.6. Xử lý các job nền và Outbox Pattern (SYS-18, A14)
- **`relayOutbox`:** Quét bảng `outbox` với các bản ghi `publishedAt IS NULL`, đánh dấu thời gian đã phát hành một cách idempotent.
- **`closeExpiredAttempts`:** Quét các bài thi thi thật đã quá hạn nộp cộng thêm thời gian gia hạn và cửa sổ đồng bộ trễ, tự động khóa và chấm bài, bổ sung cờ `late_sync` và phát sinh sự kiện outbox `attempt.submitted`.
- **`abandonBetweenSections`:** Thu hồi và đánh dấu `interrupted` cho các bài thi bị bỏ dở giữa các phần thi quá 24 giờ.
- **`normalizeUserAnswers`:** Chuẩn hóa câu trả lời của thí sinh vào bảng `user_answers` có kiểm tra khóa ngoại tới bảng `questions` và cơ chế `ON CONFLICT DO NOTHING` đảm bảo tính lũy nghiệm.
- **`updateUserStats`:** Cập nhật thống kê bài thi hoàn thành của học viên.
- **`ensurePartitions`:** Tự động tạo phân vùng bảng theo tháng cho `attempt_events`.

---

## 3. Kết quả kiểm tra xác minh

| Kiểm tra | Lệnh thực thi | Kết quả | Số test |
|---|---|---|---|
| Lượt thi & đồng bộ | `pnpm test:attempts` | PASS (Exit code 0) | 12/12 passed |
| Phân quyền & bảo mật | `pnpm test:authorization` | PASS (Exit code 0) | 23/23 passed |
| Chống lộ đáp án | `pnpm test:no-answer-leak` | PASS (Exit code 0) | 9/9 passed |
| Job nền & Outbox | `pnpm test:jobs` | PASS (Exit code 0) | 5/5 passed |
| **Tổng cộng** | | **PASS** | **49/49 passed** |
