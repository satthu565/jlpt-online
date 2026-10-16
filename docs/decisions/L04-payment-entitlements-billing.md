# Quyết định kỹ thuật L04: Payment entitlements coupons refunds và admin thương mại

- **Task:** L04
- **Worker:** W4 (Quản trị báo cáo và thương mại)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/L04`
- **Base SHA:** `c7b6c9c3a6901c09f0ef46b002e23ddf73302726`
- **Dependencies:** C04, N02, F08

---

## 1. Bối cảnh và mục tiêu

Task L04 triển khai toàn bộ hệ thống thanh toán, phân quyền tính năng theo gói (entitlements), mã giảm giá, quản trị thuê bao, quy trình hoàn tiền và giao diện quản trị thương mại cho JLPT Online:
- **14 mã tính năng được giao:**
  - `PAY-01`: Gói tài khoản miễn phí (Free tier defaults & daily limits).
  - `PAY-02`: Gói Premium tháng / quý / năm (bảng giá, chu kỳ thanh toán, phiên bản gói bất biến).
  - `PAY-03`: Giới hạn tính năng theo gói (Feature gating: thi thử, giải thích AI, phân tích nâng cao, tải ngoại tuyến).
  - `PAY-04`: Thanh toán qua phương thức phù hợp thị trường (Adapter PayOS, HMAC SHA256 signature verification).
  - `PAY-05`: Quản lý trạng thái đăng ký (State machine: none, active, past_due, cancelled, expired).
  - `PAY-06`: Lịch sử giao dịch học viên và quản trị viên.
  - `PAY-07`: Mã giảm giá (Giữ chỗ nguyên tử với TTL 15 phút, giới hạn maxRedemptions, trừ tiền chính xác).
  - `PAY-08`: Quản lý hoàn tiền và hủy gói (State machine: requested, approved, refunded, rejected; bất biến refund <= captured - priorRefunds).
  - `PAY-09`: Nâng cấp và gia hạn gói (Proration quote, chuyển đổi gói, renew).
  - `PAY-10`: Gói giáo viên / trung tâm (Tenant plans state machine: trial, active, suspended, expired; quản lý seats).
  - `PAY-11`: Giới hạn lượt sử dụng AI theo gói (State machine nguyên tử: reserve, settle, refund; zero token leak, no double debit).
  - `PAY-12`: Báo cáo doanh thu tài chính (Tách biệt tiền tệ VND, JPY, USD; tính Gross, Refund, Net theo minor units).
  - `ADM-15`: Quản lý gói thành viên (Giao diện Admin cấu hình gói, phiên bản và mã giảm giá).
  - `ADM-16`: Quản lý thanh toán (Giao diện Admin quản trị giao dịch, thuê bao, hoàn tiền và đối soát).

- **4 tiêu chí nghiệm thu đạt được:**
  1. *Webhook chữ ký sai bị từ chối; lặp/out-of-order không cấp quyền sai:* Xác thực HMAC SHA256 timing-safe; webhook lặp được deduplicate; sự kiện out-of-order không thể hạ cấp đơn hàng đã thanh toán thành công.
  2. *Hoàn tiền hủy gia hạn đổi gói và tenant plans có state machine:* Toàn bộ quy trình có kiểm soát chuyển trạng thái hợp lệ, cập nhật database giao dịch và phát sự kiện outbox tương ứng.
  3. *Quota AI reserve/settle/refund nguyên tử:* Kiểm soát token trong giao dịch CSDL, settle ghi nhận usage_ledger một lần duy nhất, refund xóa reservation giải phóng token, không trừ đúp.
  4. *Không coi mock là live verified:* Bộ adapter PayOS xác định rõ trạng thái `isLive() === false` khi thiếu production keys; ghi nhận `BLOCKED_EXTERNAL` cho dịch vụ thật.

---

## 2. Kiến trúc và các quyết định kỹ thuật

### 2.1. Cấu trúc Adapter cổng thanh toán (PAY-04)
- Xây dựng giao diện trừu tượng `IPaymentProvider` với các hàm chuẩn: `createCheckoutSession`, `verifyWebhook`, `refundPayment`, `isLive`, `getProviderStatus`.
- Triển khai cụ thể `PayOSAdapter`:
  - Mã hóa HMAC SHA256 theo chuỗi tham số sắp xếp theo bảng chữ cái (`key1=value1&key2=value2...`).
  - So sánh chữ ký an toàn với `crypto.timingSafeEqual` phòng chống tấn công dò thời gian (timing attacks).
  - Kiểm tra tính hợp lệ của timestamp và chữ ký webhook, trả về `INVALID_SIGNATURE` nếu không khớp.

### 2.2. Kiểm soát lặp và Out-of-Order Webhook (Acceptance 1)
- Bảng `payment_webhook_events` lưu vết mọi sự kiện webhook cùng `provider` và `eventId`.
- Khi webhook trùng lặp gửi đến: hệ thống trả về ngay `{ received: true, deduplicated: true }` mà không kích hoạt lại quy trình cấp quyền hay tăng bộ đếm coupon.
- Khi webhook báo `FAILED` gửi đến sau khi đơn hàng đã chuyển trạng thái `paid` hoặc `refunded`: hệ thống ghi nhận webhook nhưng không hạ cấp trạng thái của đơn hàng (`ignoredOutOfOrder: true`).

### 2.3. State Machine Thuê bao và Hoàn tiền (PAY-05, PAY-08, PAY-09)
- **Thuê bao học viên:**
  - `none` -> `active` (khi webhook `payment.captured` xác nhận thành công).
  - `active` -> `cancelled` (khi học viên bấm hủy; `cancelAtPeriodEnd = true`, học viên vẫn giữ quyền đến hết kỳ hiện tại).
  - `cancelled` -> `active` (khi học viên bấm gia hạn lại trước khi kỳ kết thúc; `cancelAtPeriodEnd = false`).
  - `active` / `cancelled` -> `expired` (khi thời gian hiện tại vượt quá `currentPeriodEnd`).
  - Đổi gói: ghi nhận lịch sử vào `subscription_changes`, cập nhật `planId` và quyền lợi mới.
- **Hoàn tiền (Refunds):**
  - Trạng thái: `requested` -> `approved` -> `refunded` hoặc `rejected`.
  - Bất biến bắt buộc: `totalRefunded <= order.totalAmount`. Đơn hàng đã hoàn tiền toàn bộ sẽ không cho phép gửi thêm yêu cầu hoàn tiền mới và sẽ chuyển gói học viên sang `expired`.

### 2.4. Giữ chỗ mã giảm giá nguyên tử (PAY-07)
- Bảng `coupon_reservations` lưu các lượt giữ chỗ tạm thời (TTL 15 phút).
- Khi tạo checkout session: kiểm tra điều kiện `timesRedeemed + activeReservations < maxRedemptions`. Nếu đạt giới hạn, từ chối ngay lập tức.
- Khi thanh toán thành công: chuyển reservation thành `coupon_redemptions`, tăng `timesRedeemed` và xóa reservation trong một transaction DB.
- Khi đơn hàng thất bại: giải phóng reservation để nhường lượt cho học viên khác.

### 2.5. Quota AI Reserve / Settle / Refund nguyên tử (PAY-11)
- Mọi lượt gọi AI trước tiên phải gọi `reserveAIQuota`: kiểm tra hạn mức còn lại trong tháng + các reservation đang chờ. Nếu vượt hạn mức, ném lỗi `QUOTA_EXCEEDED`.
- Khi AI sinh kết quả xong: `settleAIQuota` đánh dấu `settledAt = now()`, chèn dòng vào `usage_ledger` và phát sự kiện outbox `ai.request.settled`.
- Nếu AI gặp lỗi hoặc timeout: `refundAIQuota` xóa reservation và phát sự kiện `ai.request.cancelled`, đảm bảo không mất token và không trừ đúp.

### 2.6. Tách biệt tiền tệ trong Báo cáo Doanh thu (PAY-12)
- Toàn bộ tính toán tài chính sử dụng đơn vị số nguyên (minor units: VND, JPY cents, USD cents).
- Báo cáo doanh thu tách bạch rõ ràng theo từng đơn vị tiền tệ (`VND`, `JPY`, `USD`), không tự động quy đổi ngoại tệ tại tầng API.
- Doanh thu gộp (Gross) = Tổng các đơn hàng đã thanh toán; Hoàn tiền (Refund) = Tổng tiền đã duyệt hoàn; Doanh thu thuần (Net) = Gross - Refund.

---

## 3. Điều kiện ngoài và Blockers (`BLOCKED_EXTERNAL`)

Theo chỉ thị của task L04, các dịch vụ sau chưa sẵn sàng trong môi trường thực tế:
1. `payment-provider`: Thiếu tài khoản merchant PayOS live và webhook production URL (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`). Toàn bộ luồng đã được kiểm chứng bằng test suite và adapter sandbox.
2. `billing-policy`: Chính sách kinh doanh, tỷ lệ hoàn tiền và điều khoản thương mại chưa được phê duyệt chính thức bởi chủ sở hữu.

---

## 4. Xử lý các phản hồi từ Reviewer (Remediations P0 & P1)

1. **[P0] Thu phí chênh lệch (proration) khi nâng cấp gói thuê bao (`changeSubscriptionPlan`):**
   - Không cho phép cập nhật ngay lên gói cao hơn mà không thanh toán.
   - Tính toán `prorationFee = newPlan.priceMinor - oldPlan.priceMinor` và tạo đơn hàng bổ sung kèm checkout session.
   - Chỉ khi webhook xác nhận thanh toán đơn hàng nâng cấp thành công thì gói thuê bao mới chính thức được chuyển sang gói mới.
2. **[P0] Kiểm tra hạn mức hoàn tiền trong DB lock và tính cả trạng thái `requested`:**
   - Trong `requestRefund`, tổng tiền hoàn trước đó (`priorRefunds`) tính cả các yêu cầu đang ở trạng thái `'requested'` và `'refunded'`, ngăn chặn tấn công spam nhiều yêu cầu hoàn tiền vượt quá giá trị đơn hàng.
   - Trong `approveRefund`, thực hiện kiểm tra điều kiện `priorRefunded + refundReq.amount <= order.totalAmount` bên trong transaction với khóa `FOR UPDATE` trên dòng đơn hàng, và chuyển trạng thái sang `processing` trước khi gọi provider refund.
3. **[P0] Ngăn ngừa trừ chéo tiền tệ trong Báo cáo Doanh thu Admin (`BillingManager.getRevenueReport`):**
   - Bổ sung trường `currency` vào `AdminRefundItem`.
   - `getRevenueReport` lọc chính xác hoàn tiền theo đúng đơn vị tiền tệ (`rf.currency === currency`) trước khi trừ vào doanh thu gộp.
4. **[P1] Thu hồi quyền trong `entitlement_grants` khi hoàn tiền toàn bộ:**
   - Khi hoàn tiền toàn bộ đơn hàng (`newTotalRefunded >= order.totalAmount`), hệ thống cập nhật `expiresAt: new Date()` cho các bản ghi tương ứng trong `schema.entitlementGrants`, thu hồi quyền ngay lập tức.
   - Test assert kiểm tra cụ thể `hasEntitlement === false` và số lượng `activeGrants === 0`.
5. **[P1] Lưu trữ bền vững gói tổ chức (Tenant Plans) trong cơ sở dữ liệu:**
   - Chuyển toàn bộ dữ liệu tổ chức và ghế học viên từ in-memory `Map` sang bảng `tenant_plans` trong PostgreSQL/PGlite.
   - Thao tác gán ghế sử dụng khóa `FOR UPDATE` bảo đảm tính nhất quán và bảo toàn dữ liệu sau khi khởi động lại server.
6. **[P1] Bảo vệ nguyên tử chống TOCTOU khi giữ hạn mức AI (`reserveAIQuota`):**
   - Đặt toàn bộ kiểm tra hạn mức và trừ quota trong `db.transaction`.
   - Sử dụng `.for('update')` trên dòng người dùng trong `schema.users` để ngăn chặn race condition khi nhiều request đồng thời gửi đến.
7. **[P1] Khóa hàng nguyên tử khi giữ chỗ mã giảm giá (`reserveCoupon`):**
   - Bao bọc việc kiểm tra `timesRedeemed` và tạo reservation trong `db.transaction`.
   - Sử dụng `.for('update')` trên dòng mã giảm giá trong `schema.coupons` để bảo đảm không vượt quá `maxUses`.
8. **[P1] Phòng chống Open Redirect trên tham số `returnPath`:**
   - Bổ sung hàm kiểm tra `isValidReturnPath(returnPath)`: chỉ cho phép đường dẫn nội bộ hợp lệ bắt đầu bằng `/` và thuộc danh sách trắng (`/pricing`, `/account/billing`, `/dashboard`, `/cart`, `/checkout`, `/tai-khoan`).
   - Chặn tuyệt đối các URL chứa giao thức (`http://`, `https://`, `//`) hoặc đường dẫn tùy ý.
9. **[P1] Loại bỏ module ngoài phạm vi `apps/api/src/modules/reporting/`:**
   - Toàn bộ thư mục `apps/api/src/modules/reporting/` đã được xóa sạch để bàn giao cho task A04 (Phân tích học tập và báo cáo).
10. **[P1] Đăng ký `PaymentModule` và `EntitlementModule` vào `AppModule`:**
    - Đã import và khai báo `PaymentModule` cùng `EntitlementModule` trong danh sách `imports` của `AppModule` (`apps/api/src/app.module.ts`), bảo đảm các endpoint API sẵn sàng hoạt động trong hệ thống.

---

## 5. Bằng chứng kiểm thử (Verification Evidence)

Các lệnh kiểm tra bắt buộc đã được chạy thành công:
1. `pnpm test:payments`: 21/21 tests passed (exitCode: 0).
2. `pnpm test:entitlements`: 18/18 tests passed (exitCode: 0, bao gồm DB persistence test).
3. `pnpm test:payment-provider`: 10/10 tests passed (exitCode: 0).
4. `pnpm test:admin-billing`: 13/13 tests passed (exitCode: 0).
5. `pnpm typecheck`: 18/18 packages passed (exitCode: 0).
6. `pnpm lint`: 13/13 packages passed (0 errors, exitCode: 0).
7. `pnpm test`: 18/18 tasks passed (187/187 tests api, exitCode: 0).
8. `pnpm build`: 12/12 build tasks passed (exitCode: 0).

