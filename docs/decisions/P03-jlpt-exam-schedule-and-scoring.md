# Quyết định kỹ thuật P03: Kết quả đỗ/trượt theo JLPT, lịch thi tại Việt Nam và nhắc hạn đăng ký

- **Task:** P03
- **Worker:** W2 (API tài khoản nội dung và thi)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-18
- **Branch:** `task/P03`
- **Base SHA:** `2f3f891ef64ad7738926080e56051240a6e2cd63`
- **Dependencies:** P01
- **Resource Locks:** `db-migration`
- **Feature IDs:** Nền tảng và tích hợp toàn bộ phạm vi

---

## 1. Bối cảnh và mục tiêu

Task P03 kế thừa kết quả từ P01 (Ước lượng điểm quy đổi JLPT, điểm sàn từng phần và nhịp làm bài) và mở rộng hệ thống backend API để giải quyết 3 bài toán trọng tâm:
1. **Kết quả bài thi demo N5 và lịch sử bài thi theo chuẩn JLPT (Khớp P01):**
   - Kết quả chấm điểm bài thi (`scoreAttempt`) tính toán chính xác điểm quy đổi theo phương pháp Linear Reference Scaling.
   - Thang điểm N5: tổng điểm tối đa 180, điểm đỗ 80; phần gộp Kiến thức ngôn ngữ & Đọc hiểu (tối đa 120, sàn 38); phần Nghe hiểu (tối đa 60, sàn 19).
   - Đánh giá đỗ/trượt theo 2 điều kiện đồng thời: `passEstimate` = (tổng >= 80 && mọi phần >= sàn).
   - Trả về danh sách các phần dưới sàn (`failedSections`), độ lệch so với sàn (`margin` = `scaled - minPass`), lý do chi tiết (`PASSED`, `FAILED_SECTION_FLOOR`, `FAILED_TOTAL_SCORE`, `FAILED_TOTAL_AND_SECTION`).
   - Gắn nhãn và khuyến cáo bắt buộc: `isEstimated: true`, `label: 'ước lượng'`, và `disclaimer`.
   - Lưu trữ dữ liệu thời gian làm bài từng câu (`timeSpentMs: number[]`) vào `attempt_answer_sheets` và trả về trong kết quả chi tiết / review để phục vụ phân tích nhịp làm bài.
   - Endpoint lịch sử `GET /api/v1/me/attempts` trả về đầy đủ `score`, `passed`, `sections`, `failedSections`, `isEstimated`, `label`.
2. **Thực thể và API Lịch thi JLPT tại Việt Nam (JLPT Exam Schedules):**
   - Lưu trữ lịch thi chính thức tại Việt Nam: kỳ thi, ngày thi, hạn mở/đóng đăng ký, địa điểm (Hà Nội, Đà Nẵng, TP.HCM), đường link đăng ký chính thức, các cấp độ tổ chức thi (N1–N5), trạng thái `draft`/`published`/`archived`.
   - Phân quyền (RBAC): Chỉ Quản trị viên (`admin`) có quyền tạo, cập nhật, công bố (`publish`), ẩn (`unpublish`), xóa lịch thi. Học viên thường chỉ được đọc bản đã xuất bản (`published`).
   - Kiểm tra Audit: Mọi hành vi tạo, sửa, công bố, ẩn, xóa đều được ghi nhận đầy đủ vào bảng `operator_actions` với `targetType: 'jlpt_schedule'`.
   - Không seed dữ liệu giả: Khi chưa có dữ liệu, API công khai trả mảng rỗng `[]` (không tự bịa ngày thi).
3. **Thông báo nhắc hạn đăng ký và trước ngày thi qua Outbox (Deduplication & Opt-out):**
   - Nhắc trước hạn đăng ký (mặc định 7 ngày và 1 ngày) và nhắc trước ngày thi (mặc định 3 ngày).
   - Gửi sự kiện qua bảng `outbox` với topic `notification.jlpt_registration_reminder` và `notification.jlpt_exam_reminder`.
   - Cơ chế Idempotent / Deduplication: Sinh `idempotencyKey` duy nhất theo `user_id`, `schedule_id` và `reminder_type` (ví dụ: `jlpt_reg_7d:<userId>:<scheduleId>`). Đảm bảo mỗi thông báo chỉ được tạo đúng một lần, tránh gửi lặp khi cron hoặc job quét lại.
   - Tôn trọng cài đặt tắt nhắc: Kiểm tra cấu hình thông báo của người dùng (`examReminders` trong `userNotificationPreferences` và chi tiết `typeSettings.jlpt_registration_reminder` / `jlpt_exam_reminder`). Khi người dùng tắt nhắc, hệ thống tự động bỏ qua (`skippedOptOut`).

---

## 2. Thiết kế Cơ sở dữ liệu và Migration

### 2.1. Bảng `jlpt_exam_schedules`
Được định nghĩa trong `apps/api/src/modules/exam/jlpt-schedule.schema.ts` và tích hợp tự động qua migration helper `ensureJlptExamSchedulesTable`:
- `id`: varchar(36) PK (UUIDv7)
- `title`: text NOT NULL (ví dụ: "Kỳ thi JLPT Tháng 12/2026")
- `exam_date`: date NOT NULL (ví dụ: "2026-12-06")
- `registration_deadline`: timestamp with time zone NOT NULL
- `registration_opens_at`: timestamp with time zone (tùy chọn)
- `locations`: jsonb NOT NULL (danh sách địa điểm thi tại Hà Nội, Đà Nẵng, TP.HCM kèm địa chỉ)
- `official_url`: text NOT NULL (link đăng ký chính thức từ các điểm thi tại Việt Nam)
- `levels`: jsonb NOT NULL (mảng các cấp độ tổ chức: N1–N5)
- `status`: varchar(20) NOT NULL DEFAULT 'draft' ('draft' | 'published' | 'archived')
- `notes`: text
- `published_at`: timestamp with time zone
- `published_by`: varchar(36)
- `created_at`: timestamp with time zone NOT NULL DEFAULT NOW()
- `updated_at`: timestamp with time zone NOT NULL DEFAULT NOW()

### 2.2. Phân chia lệnh DDL cho PGlite & Postgres
Do PGlite không hỗ trợ thực thi nhiều câu lệnh DDL gộp chung trong một chuỗi prepared statement (`client.query`), module migration `apps/api/src/common/database/jlpt-schedule-migration.ts` chia tách từng câu lệnh DDL (CREATE TABLE, CREATE INDEX...) thành các truy vấn đơn lẻ có `IF NOT EXISTS`, đảm bảo tương thích 100% trên cả PGlite (chạy test cục bộ) và PostgreSQL (staging/production).

---

## 3. Thiết kế API và Phân quyền (RBAC)

### 3.1. API Công khai (Public Endpoints)
- `GET /api/v1/jlpt-schedules` & `GET /api/v1/exams/schedules`:
  - Khách và học viên đều có thể truy cập không cần đăng nhập (`@AllowGuest()`).
  - Bộ lọc mặc định: chỉ trả về các bản ghi có `status = 'published'`.
  - Hỗ trợ lọc theo cấp độ (`level`) và sắp xếp theo `exam_date` tăng dần.
  - Khi không có dữ liệu: trả về `{ items: [], total: 0 }`. Tuyệt đối không sinh dữ liệu giả.
- `GET /api/v1/jlpt-schedules/:id` & `GET /api/v1/exams/schedules/:id`:
  - Trả về chi tiết lịch thi đã xuất bản. Bản nháp (`draft`) trả về 404 đối với người dùng thông thường.

### 3.2. API Quản trị (Admin Endpoints)
Được bảo vệ bởi `@Roles('admin')`, kiểm tra quyền hạn và ghi nhận audit log:
- `GET /api/v1/admin/jlpt-schedules`: Liệt kê mọi lịch thi (cả draft, published, archived).
- `POST /api/v1/admin/jlpt-schedules`: Tạo mới lịch thi (trạng thái ban đầu draft), ghi audit `targetType: 'jlpt_schedule'`, `action: 'create'`.
- `PATCH /api/v1/admin/jlpt-schedules/:id`: Cập nhật thông tin lịch thi, ghi audit `action: 'update'`.
- `POST /api/v1/admin/jlpt-schedules/:id/publish`: Xuất bản lịch thi, gán `published_at` và `published_by`, ghi audit `action: 'publish'`.
- `POST /api/v1/admin/jlpt-schedules/:id/unpublish`: Đưa về bản nháp, ghi audit `action: 'unpublish'`.
- `DELETE /api/v1/admin/jlpt-schedules/:id`: Xóa lịch thi, ghi audit `action: 'delete'`.
- `POST /api/v1/admin/jlpt-schedules/:id/remind-registration`: Kích hoạt quét nhắc hạn đăng ký theo lịch thi cụ thể.
- `POST /api/v1/admin/jlpt-schedules/trigger-reminders`: Kích hoạt quét nhắc hạn đăng ký và ngày thi toàn hệ thống.

---

## 4. Xử lý Chấm điểm N5 và Nhịp làm bài

### 4.1. Điểm quy đổi và Ngưỡng điểm sàn N5
Theo công thức chuẩn từ P01:
- `language_reading`: 120 điểm tối đa, điểm sàn tối thiểu 38 điểm.
- `listening`: 60 điểm tối đa, điểm sàn tối thiểu 19 điểm.
- Điểm đỗ tổng: 80 điểm.
- Tính chất ước lượng: mọi kết quả trả về từ `ScoringService.scoreAttempt` đều có `isEstimated: true`, `label: 'ước lượng'`, và `disclaimer: REFERENCE_SCORING_DISCLAIMER`.
- Trường `margin`: chênh lệch giữa điểm quy đổi phần thi và điểm sàn (`scaled - minPass`). Giúp thí sinh nhận biết khoảng cách an toàn so với điểm liệt.

### 4.2. Dữ liệu nhịp làm bài (Per-question Pacing)
- Khi thí sinh nộp bài (`POST /api/v1/attempts/:id/submit`), mảng `timeSpentMs` (thời gian làm bài tính bằng mili-giây cho từng câu hỏi) được truyền lên và lưu nguyên vẹn vào cột `time_spent_ms` trong `attempt_answer_sheets`.
- Khi gọi `GET /api/v1/attempts/:id`, `GET /api/v1/attempts/:id/review`, trường `result.timeSpentMs` được đính kèm vào kết quả trả về để UI hiển thị phân tích nhịp làm bài (nhanh/chậm so với benchmark của P01).
- Khi gọi `GET /api/v1/me/attempts`, lịch sử làm bài của học viên trả về chi tiết `sections`, `failedSections`, `isEstimated`, `label` cùng `score` và `passed`.

---

## 5. Cơ chế Nhắc hạn Đăng ký và Tránh lặp (Outbox Deduplication)

### 5.1. Quy trình xử lý
1. Quét các kỳ thi đã xuất bản (`published`) có hạn đăng ký hoặc ngày thi nằm trong khoảng thời gian nhắc (ví dụ: sắp hết hạn đăng ký trong vòng 7 ngày).
2. Lấy danh sách học viên đăng ký nhận thông báo (`examReminders = true`).
3. Kiểm tra chi tiết `typeSettings`: người dùng có thể tắt riêng `jlpt_registration_reminder` hoặc `jlpt_exam_reminder`.
4. Sinh `idempotencyKey` duy nhất cho cặp (user, schedule, reminder_type).
5. Kiểm tra trong bảng `outbox`: nếu sự kiện với khóa này đã tồn tại, bỏ qua (idempotent, không gửi lặp).
6. Nếu chưa gửi: ghi sự kiện vào `outbox` với đầy đủ payload (thông tin kỳ thi, hạn đăng ký, link chính thức, địa điểm) để background worker chuyển phát email/in-app notification.

---

## 6. Bằng chứng kiểm thử (Verification Proofs)

Hệ thống đã được kiểm thử toàn diện với 3 bộ test chuyên biệt:
1. `src/modules/exam/jlpt-schedule.test.ts` (6 tests):
   - Trả mảng rỗng khi chưa có lịch xuất bản (không seed dữ liệu giả).
   - Chặn học viên thường tạo lịch thi (403 Forbidden).
   - Quản trị viên tạo lịch nháp, ghi audit log, kiểm tra trang công khai không nhìn thấy bản nháp.
   - Quản trị viên cập nhật và xuất bản, trang công khai nhìn thấy ngay lập tức.
   - Quản trị viên hủy xuất bản (unpublish), trang công khai lập tức ẩn đi.
   - Quản trị viên xóa lịch thi, ghi audit log xóa thành công.
2. `src/modules/notification/jlpt-registration-reminder.test.ts` (4 tests):
   - Nhắc hạn đăng ký phát sự kiện outbox cho người dùng bật nhận nhắc và bỏ qua người dùng tắt nhắc.
   - Exactly-once delivery: chạy lại job nhắc hạn đăng ký không sinh bất kỳ sự kiện outbox trùng lặp nào.
   - Tôn trọng cài đặt tắt nhắc riêng lẻ của người dùng (`typeSettings.jlpt_registration_reminder = false`).
   - Nhắc ngày thi phát sự kiện outbox đúng 1 lần và tôn trọng cài đặt tắt nhắc.
3. `src/modules/attempt/demo-n5-scoring.test.ts` (4 tests):
   - ĐỖ (PASSED): Vượt ngưỡng tổng (180 >= 80) và vượt điểm sàn mọi phần (120 >= 38, 60 >= 19), margin dương, lưu và trả về `timeSpentMs`, lịch sử `me/attempts` có đầy đủ thông tin.
   - TRƯỢT DO ĐIỂM SÀN (FAILED_SECTION_FLOOR): Tổng điểm 120 >= 80 nhưng Nghe hiểu 0 < 19, `failedSections: ['listening']`, margin âm (-19).
   - TRƯỢT DO CẢ TỔNG VÀ SÀN (FAILED_TOTAL_AND_SECTION): Điểm 0 < 80, `failedSections: ['language_reading', 'listening']`.
   - TRƯỢT DO TỔNG ĐIỂM (FAILED_TOTAL_SCORE): Các phần đạt điểm sàn nhưng tổng điểm không đủ ngưỡng đỗ.
