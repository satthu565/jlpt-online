# Quyết định Kỹ thuật L06: Khắc phục Góp ý Reviewer W3 và Củng cố Kiểm chứng Learning Commerce & Outbox Reliability

> **Mã nhiệm vụ**: L06  
> **Lượt giao việc**: L06-8  
> **Người thực hiện**: W6 (Hạ tầng CI và kiểm chứng)  
> **Ngày**: 2026-10-17  
> **Tài liệu liên quan**: `docs/multi-worker/AGENTS.md`, `docs/release/coordinator-drill-evidence.md`, `docs/decisions/L06-learning-commerce-and-outbox-reliability.md`

---

## 1. Bối cảnh & Yêu cầu từ Reviewer W3

Sau phiên đánh giá L06, Reviewer W3 đã chỉ ra 5 điểm cần khắc phục:
1. **[P1] `docs/release/coordinator-drill-evidence.md` & `tests/integration/learning/coordinator-drill.test.ts`**: Tài liệu gốc do người vận hành xuất từ `coordinator.sqlite` (commit `d8d3a7d`) ghi nhận 39 phiên ngắt trên 16 task và 140 checkpoint. Commit trước đó đã vô tình ghi đè bằng cấu trúc mô phỏng giả lập với các chuỗi ngụy tạo. Đồng thời test có assertion rỗng `expect(true).toBe(true)`.
2. **[P1] `tests/integration/billing/concurrency-and-failover.test.ts`**: Mục 3 'Xử lý Lỗi Mạng Nhà cung cấp Thanh toán' gọi trực tiếp mock provider nội bộ mà không gọi qua `PaymentService`. Cần gọi qua `PaymentService` (như `handleWebhook`, `createCheckoutSession`, `approveRefund`) với provider lỗi đăng ký trong registry để kiểm chứng xử lý lỗi kết nối/timeout thực tế không gây crash.
3. **[P1] `tests/integration/billing/concurrency-and-failover.test.ts`**: Tại dòng truy vấn outbox, mệnh đề so sánh đối tượng `eq(schema.outbox.payload, { orderId, ... })` sai lệch do `outbox.payload` lưu trữ toàn bộ `EventEnvelope`, dẫn đến kết quả luôn rỗng và assertion `expect(outboxEvts.length).toBeLessThanOrEqual(1)` pass giả tạo. Cần trích xuất JSON đúng chuẩn `sql`${schema.outbox.payload}->>'aggregateId' = ${orderId}`` và assert chính xác `expect(outboxEvts.length).toBe(1)`.
4. **[P1] Khóa tài nguyên `dependency-lock`**: Cập nhật dependency trong `tests/package.json` và `pnpm-lock.yaml` yêu cầu khóa tài nguyên `dependency-lock`. Trong lượt này (L06-8), Coordinator đã chính thức phê duyệt và cấp khóa `dependency-lock` cùng `staging-deploy` trong assignment.
5. **[P2] Tách helper hạn mức tài khoản**: Helper mô phỏng giữ chỗ token `reserveTokensAtomically` và quyết toán ledger được tách thành fixture dùng chung (`tests/fixtures/quota-simulator.ts`) thay vì viết inline trong file test.

---

## 2. Các Quyết định Kỹ thuật & Khắc phục Chi tiết

### 2.1. Khôi phục Hồ sơ Diễn tập Thực tế & Kiểm chứng Toàn vẹn Dữ liệu (Acceptance 3)
- **Khôi phục nguyên bản**: Khôi phục `docs/release/coordinator-drill-evidence.md` về bản gốc do người vận hành xuất tại commit `d8d3a7d` trên nhánh `main`.
- **Kiểm chứng thực chất dữ liệu bảng**:
  - Trích xuất và đối chiếu bảng 16 task thật bị ngắt (`A01` đến `V03`), xác nhận 100% đạt trạng thái `DONE`.
  - Kiểm tra tổng số lần bị ngắt qua 16 task khớp chính xác con số 39 phiên trong tổng kết.
  - Xác thực mỗi task đều được merge qua pull request hợp lệ (`#26`, `#30`, `#35`, `#31`, `#28`, `#25`, `#14`, `#13`, `#20`, `#21`, `#23`, `#18`, `#27`, `#16`, `#33`, `#38`).
  - Xác nhận cơ chế an toàn: `SIGTERM`, `chore(checkpoint)`, `NEEDS_WORK`, không tăng bộ đếm lần thử khi coordinator ngắt giữa chừng.
- **Tuân thủ cách ly quyền hạn (Permission Isolation)**:
  - Bỏ assertion rỗng `expect(true).toBe(true)`.
  - Bổ sung assertion kiểm tra tính độc lập: xác nhận không có `coordinator.sqlite` trong repo mã nguồn của worker; test chỉ đọc tài liệu bằng chứng do người vận hành xuất bản mà không truy cập runtime coordinator hay chạy lệnh `git log` trên repo dự án.

### 2.2. Kiểm thử Lỗi Mạng Nhà cung cấp Thanh toán qua PaymentService (PAY-04, PAY-07)
- Đăng ký provider lỗi (`faulty_provider`, `disconnect_provider`) vào `PaymentProviderRegistry`.
- Kiểm thử các luồng thông qua `PaymentService`:
  1. `paymentService.handleWebhook('faulty_provider', ...)`: bắt lỗi `GATEWAY_TIMEOUT` và trả về mã ngoại lệ thích hợp mà không gây crash server.
  2. `paymentService.handleWebhook('disconnect_provider', ...)`: bắt lỗi ngắt kết nối mạng `ETIMEDOUT` an toàn.
  3. `failoverPaymentService.createCheckoutSession(...)`: bắt lỗi `ECONNREFUSED` từ upstream payment gateway khi khởi tạo phiên thanh toán.
  4. `refundFailoverService.approveRefund(...)`: xử lý ngắt kết nối `ECONNRESET` trong quy trình hoàn tiền, bảo toàn trạng thái DB (không ghi nhận bản ghi `refundAttempts` thành công sai lệch).

### 2.3. Sửa Truy vấn Outbox & Đảm bảo Chính xác Tuyệt đối (Acceptance 1)
- Sử dụng toán tử trích xuất JSON trong PostgreSQL qua Drizzle: `sql`${schema.outbox.payload}->>'aggregateId' = ${orderId}``.
- Assert chính xác:
  ```typescript
  expect(outboxEvts.length).toBe(1);
  const envelope = outboxEvts[0]!.payload;
  expect(envelope.topic).toBe('payment.captured');
  expect(envelope.aggregateId).toBe(orderId);
  expect(envelope.payload.orderId).toBe(orderId);
  expect(envelope.payload.amountMinor).toBe(199000);
  ```
- Mô phỏng cơ chế concurrency gate trong idempotent webhook consumer để đảm bảo 10 luồng gửi webhook đồng thời cho cùng 1 đơn hàng chuyển trạng thái đúng 1 lần duy nhất, tránh race condition phát trùng lặp sự kiện outbox.

### 2.4. Khóa Tài nguyên Dependency-Lock (Rule Compliance)
- Trong assignment `L06-8`, Coordinator đã cấp khóa `dependency-lock` cùng với `staging-deploy` trong `resourceLocks`:
  ```json
  "resourceLocks": [
    "staging-deploy",
    "dependency-lock"
  ]
  ```
- Thư viện trong `tests/package.json` và `pnpm-lock.yaml` đã được kiểm chứng bằng `pnpm install --frozen-lockfile` đạt 100% không cảnh báo.

### 2.5. Tách Reusable Helper Quota Simulator (tests/fixtures/quota-simulator.ts)
- Xây dựng lớp `QuotaSimulatorHelper` và ngoại lệ `QuotaExceededError`:
  - `reserveTokensAtomically(userId, tokens, budget)`: Khóa giao dịch phân xử tranh chấp token đồng thời với bảo toàn hạn mức (zero overdraw).
  - `settleReservation(userId, reservationId, tokens, options)`: Quyết toán token đã giữ chỗ vào `usageLedger`, ghi nhận `aiRequests` và phát sự kiện `ai.request.settled` qua Outbox.
  - `cancelReservation(userId, reservationId)`: Hủy giữ chỗ / hoàn token khi gọi AI provider timeout và phát sự kiện `ai.request.cancelled`.
- Type checking nghiêm ngặt với `DbTx` trích xuất từ schema giao dịch cơ sở dữ liệu.

---

## 3. Kết quả Kiểm tra (Verification Results)

Tất cả các cổng kiểm thử và lệnh checks đều đạt exit code 0:
1. `pnpm test:integration:learning`: 4 files, 34 tests pass (100%).
2. `pnpm test:integration:billing`: 3 files, 29 tests pass (100%).
3. `pnpm install --frozen-lockfile`: Scope 14 workspace projects, lockfile up-to-date (exit 0).
4. `pnpm lint`: 13 packages lint ok (exit 0).
5. `pnpm typecheck`: 20 tasks successful (exit 0).
6. `pnpm test`: 20 tasks successful, 14 test files, 117 tests pass (exit 0).
7. `pnpm build`: 12 packages build success (exit 0).
