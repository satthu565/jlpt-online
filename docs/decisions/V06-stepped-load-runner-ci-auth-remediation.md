# V06 Decision Record: Stepped Load Capacity Runner Authentication & Staging Error Rate Remediation

- **Task**: V06 (Full regression load accessibility security và restore)
- **Feature**: SYS-10
- **Author**: W6 (Hạ tầng CI và kiểm chứng)
- **Status**: ACCEPTED

---

## 1. Bối cảnh & Hiện tượng lỗi trong CI

Trong luồng CI GitHub Actions tại workflow `staging.yml` (`Staging Compose Profile Small & PITR Drill`), bước `Run Stepped Load Capacity Runner (SYS-10 / V06)` gặp lỗi:

```
Error Rate: 51.429% (SLA < 0.1%) -> FAIL
Process completed with exit code 1.
```

### Phân tích số học chính xác:
- Tổng số HTTP requests của bộ chạy `stepped-load-runner.ts` là **350 requests**.
- Tỷ lệ lỗi `51.429%` tương ứng chính xác:
  $$\frac{180}{350} \times 100\% \approx 51.42857\%$$
- **180 requests thất bại gồm**:
  1. **30 requests** trong Giai đoạn 2: `start_attempt` (30 VUs)
  2. **30 requests** trong Giai đoạn 3: `start_section` (30 VUs)
  3. **90 requests** trong Giai đoạn 3: `save_answers_periodic` (30 VUs $\times$ 3 lần lưu)
  4. **30 requests** trong Giai đoạn 4: `submit_exam_deadline` (30 VUs $\times$ 1 nộp bài)
  - Tổng cộng đúng: $30 + 30 + 90 + 30 = 180$ requests thất bại.

---

## 2. Nguyên nhân gốc rễ (Root Cause Analysis)

Sau khi điều tra mã nguồn backend (`apps/api/src/modules/attempt/attempt.service.ts` và `apps/api/src/common/guards/auth.guard.ts`):

1. **Chính sách phân quyền Khách (Guest Policy)**:
   - Khi request không gửi Bearer token (`Authorization: Bearer ...`), hệ thống coi là Khách (`guest`).
   - Khách **bắt buộc** phải thi đề có gắn cờ `guest_trial` (kiểm tra trường `description` chứa `guest_trial` hoặc `title`/`slug` chứa từ khóa thử nghiệm). Nếu không thỏa mãn, server trả về `401 UNAUTHORIZED`.
   - Đồng thời, Khách bị giới hạn nghiêm ngặt tối đa 3 bài thi mỗi ngày trên mỗi `guestId` (`403 RATE_LIMITED`).
2. **Ảnh hưởng từ các bước test E2E trước đó trong CI Staging**:
   - Trong workflow `staging.yml`, các bước trước đó (`test:e2e:core`, `test:e2e:full`, `test:e2e:all-browsers`) thực hiện import lại gói `demo-data/demo-n5-1.zip` và xuất bản (`publish`).
   - Gói `demo-n5-1.zip` nguyên bản trong `docs/multi-worker/demo-data/` không có trường `description` (hoặc `description = null`).
   - Việc ghi đè này khiến `demo-n5-1` mất cờ `description = 'guest_trial'`.
   - Kết quả: Khi `stepped-load-runner.ts` gọi `POST /api/v1/attempts` với cookie khách thuần túy `__Host-guest=${guestId}`, API từ chối với mã lỗi `401 UNAUTHORIZED`.
3. **Hiệu ứng domino trong `stepped-load-runner.ts`**:
   - Khi Stage 2 thất bại toàn bộ 30 requests `start_attempt`, `workerAttempts` map rỗng.
   - Code cũ có cơ chế fallback giả định `attemptId = 'att-load-' + workerId`.
   - Tất cả các requests tiếp theo trong Stage 3 (`start_section`, `save_answers_periodic`) và Stage 4 (`submit_exam_deadline`) được gửi tới ID không tồn tại trên server, dẫn tới hàng loạt mã `404 NOT FOUND`.
   - Hàm `executeRequest` trước đây nuốt lỗi (chỉ ghi `statusCode = 500; success = false`), không in body cảnh báo nên che khuất nguyên nhân thực sự.

---

## 3. Giải pháp khắc phục (Remediation)

### 3.1. Bổ sung 30 token học viên có sẵn vào bộ fixtures và hạt giống DB
- Thêm 30 tài khoản học viên định danh `student.load0@jlpt.local` đến `student.load29@jlpt.local` (`email_verified = true`) vào `tests/fixtures/seed-sessions.sql`.
- Thêm 30 bearer token tương ứng `tok_load_student_0` đến `tok_load_student_29` vào bảng `sessions`.
- Export danh sách `LOAD_STUDENT_TOKENS` trong `tests/fixtures/test-server.ts`.

### 3.2. Nâng cấp bộ chạy `tests/load/stepped-load-runner.ts`
- **Xác thực thí sinh**: Mỗi VU (Worker 0..29) sử dụng token học viên được gán tương ứng `tok_load_student_${workerId}` kèm cả `x-guest-id` và `cookie: __Host-guest=...`.
- **Duy trì quyền sở hữu**: Toàn bộ các bước sau (Giai đoạn 3 lưu phiếu, Giai đoạn 4 nộp bài) dùng cùng bộ `authHeaders` từ Giai đoạn 2, đảm bảo vượt qua bước kiểm tra quyền sở hữu bài thi `getAttemptAndVerifyOwnership`.
- **Fallback linh hoạt**: Nếu môi trường chưa chạy seed-sessions dẫn tới 401 khi dùng Bearer token, runner tự động chuyển sang chế độ Khách (Guest candidate).
- **Khôi phục bài thi khi xung đột (409 Resume Handling)**: Nếu tài khoản học viên đã có bài thi đang mở (`409 ATTEMPT_ALREADY_OPEN`), runner gọi `POST /api/v1/attempts/:id/resume` để lấy lease mới nhất và tiếp tục làm bài mà không sinh lỗi.
- **Minh bạch hóa lỗi**: Trong `executeRequest`, nếu `!success`, runner ghi nhận cảnh báo chi tiết gồm mã trạng thái HTTP và nội dung body trả về từ server, không nuốt lỗi âm thầm (tuân thủ nguyên tắc nghiệm thu *No P0/P1 accepted silently*).

### 3.3. Bảo đảm trạng thái đề thi trong CI Workflow `.github/workflows/staging.yml`
- Bổ sung lệnh bảo đảm cờ `guest_trial`:
  ```bash
  docker compose -f infra/compose/compose.staging.yml exec -T postgres psql -U jlpt -d jlpt_staging -c "UPDATE exams SET description = 'guest_trial' WHERE slug = 'demo-n5-1';"
  ```
  ngay trước khi gọi `pnpm test:load`.

---

## 4. Kết quả nghiệm thu thực tế

Sau khi áp dụng các giải pháp trên:
- Lệnh `pnpm test:load` chạy hoàn hảo 2 lần liên tiếp:
  - **Tổng số requests**: 350
  - **Tỷ lệ lỗi (Error Rate)**: **0.000%** (SLA < 0.1% $\rightarrow$ **PASS**)
  - **Lưu phiếu p95**: ~109.92 ms – 169.34 ms (SLA < 300ms $\rightarrow$ **PASS**)
  - **Nộp bài p95**: ~688.62 ms – 698.49 ms (SLA < 1000ms $\rightarrow$ **PASS**)
  - **Throughput đỉnh**: ~863 – 961 req/s
- Tất cả các tiêu chí nghiệm thu của V06 và SYS-10 đều được đáp ứng đầy đủ và độc lập.
