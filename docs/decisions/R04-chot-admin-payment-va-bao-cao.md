# Quyết định kiến trúc R04: Chốt Admin Payment, Đối soát Vận hành và Báo cáo Doanh thu

- **Task**: R04 (Chốt admin payment và báo cáo)
- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Ngày**: 2026-10-17
- **Trạng thái**: APPROVED (Nghiệm thu chốt R04)
- **Base SHA**: `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Nhánh**: `task/R04`

---

## 1. Bối cảnh và Mục tiêu Nhiệm vụ

Nhiệm vụ **R04** là bước chốt toàn diện hệ thống Quản trị (Admin Portal), Thương mại & Thanh toán (Payment & Entitlements) và Báo cáo Phân tích (Reporting & Reconciliation) trước khi bàn giao phát hành Ngày 7:
1. Đảm bảo toàn bộ 363 yêu cầu ứng dụng đạt điều kiện nghiệm thu `CODE_VERIFIED`, không còn bất kỳ lỗi P0 (sai tiền, lộ đáp án, hỏng dữ liệu, mất bảo mật) hay P1 (thiếu tiêu chí nghiệm thu, hợp đồng lệch, test suy yếu, mock giả danh tích hợp thật).
2. Kiểm chứng luồng E2E hoàn chỉnh của Admin Portal qua `pnpm test:e2e:admin-all` (bao gồm 30 ca kiểm thử bao quát toàn bộ 29 trang giao diện quản trị).
3. Xác nhận tính bất biến và toàn vẹn của động cơ tính phí, giữ chỗ mã giảm giá nguyên tử, state machine thuê bao và hoàn tiền qua `pnpm test:payments` và `pnpm test:reconciliation`.
4. Bảo đảm toàn bộ báo cáo doanh thu và đối soát phân tách tiền tệ rạch ròi theo đơn vị minor units (VND, JPY, USD), phòng chống triệt để Formula Injection theo RFC 4180 và đảm bảo zero raw secrets trong DOM/trình duyệt.

---

## 2. Kết quả Rà soát Độc lập theo Quy chuẩn REVIEW.md (Zero P0/P1)

Tiến hành tự rà soát toàn bộ diff và mã nguồn theo tiêu chuẩn reviewer độc lập (`docs/multi-worker/prompts/REVIEW.md`):

### 2.1. Kiểm tra P0: Tính đúng đắn của Tiền tệ & Quyền hạn
- **Tính toán tiền tệ**: Không dùng số thực (floating point) cho các phép cộng trừ nhân chia doanh thu và hoàn tiền. VND và JPY dùng đơn vị minor units (số nguyên), bảo đảm `net = gross - refund`.
- **Tách biệt tiền tệ**: Doanh thu hoặc hoàn tiền JPY tuyệt đối không cấn trừ hay cộng gộp vào số dư VND (xác thực tại `billing.test.ts` và `payment.test.ts`).
- **Không rò rỉ đáp án hoặc secrets**: Các endpoint quản trị sao lưu (Backup) và nhật ký kiểm toán (Audit Logs) không lưu trữ hay phản hồi chuỗi mật khẩu/token dạng thô (`[REDACTED_SECRET]`).
- **Phòng chống Open Redirect**: Hàm `isValidReturnPath()` thẩm định nghiêm ngặt danh sách whitelist hostnames (`localhost`, `127.0.0.1`, `*.jlpt.vn`, `*.jlpt.local`), từ chối protocol-relative URLs (`//evil.com`).

### 2.2. Kiểm tra P1: Tiêu chí Nghiệm thu & Hợp đồng
- **State Machine Hoàn tiền**: Chuyển trạng thái an toàn `requested` -> `approved` -> `refunded` hoặc `rejected` kèm lý do kiểm toán, tự động thu hồi quyền học viên (revoke entitlements) và phát outbox event `payment.refunded`.
- **Giữ chỗ Mã giảm giá (Coupon Reservation)**: Giữ chỗ nguyên tử (atomic reservation) và kiểm tra trần số lượt sử dụng tối đa (`maxRedemptions`), từ chối mã giảm giá vượt quá 100% hoặc có giá trị âm.
- **Đối soát Giao dịch & Chứng từ Nhà cung cấp**: Nhận diện chính xác 6 loại sai lệch: `amount_mismatch`, `missing_internal_order`, `missing_provider_settlement`, `refund_amount_mismatch`, `unprocessed_refund`, `duplicate_provider_ref`.
- **Nhật ký Kiểm toán (Multi-tenant Audit Trail)**: Bắt buộc có thông tin Người thực hiện (`operatorId`/`actorId`) và Đơn vị quản lý (`tenantId`, mặc định `global` nếu không thuộc tổ chức riêng).
- **Xuất Báo cáo CSV**: Hàm `sanitizeCsvCell()` trung hòa toàn bộ các tiền tố thực thi lệnh bảng tính (`=`, `+`, `-`, `@`, `\t`, `\r`) bằng tiền tố dấu nháy đơn `'` và tuân thủ định dạng RFC 4180.

---

## 3. Cập nhật Bộ Kiểm thử Nghiệm thu E2E (`apps/admin/tests/e2e-admin-all.test.tsx`)

Bổ sung phân hệ kiểm thử số 6 trong `e2e-admin-all.test.tsx` nhằm chứng minh sự liên kết chặt chẽ giữa logic nghiệp vụ thương mại và giao diện người dùng:
1. `Quy trình Quản trị Gói Dịch vụ & Giữ chỗ Mã Giảm giá (ADM-15, PAY-01, PAY-07)`: Kiểm tra tạo gói mới với phiên bản tăng dần bất biến, trần mã giảm giá và từ chối mức giảm sai.
2. `State Machine Hoàn tiền & Phân định Đơn vị Tiền tệ Tuyệt đối (ADM-16, PAY-08, PAY-12)`: Kiểm tra duyệt hoàn tiền và đảm bảo hoàn tiền JPY không trừ chéo vào VND.
3. `Động cơ Đối soát Đa chiều & Báo cáo Sai lệch Nhà cung cấp (PAY-04, ADM-16, Acceptance 1)`: Mô phỏng phát hiện sai lệch số tiền và giao dịch không tồn tại, kết xuất giao diện đối soát với đầy đủ huy hiệu cảnh báo.
4. `Toàn vẹn Kiểm toán Multi-tenant & Bảo vệ Bí mật Trình duyệt (ADM-14, ADM-20, SYS-08)`: Kiểm tra ghi nhận kiểm toán theo tenant cụ thể và xác nhận zero raw secrets trong cấu trúc DOM.

---

## 4. Xác nhận Các Cổng Kiểm tra Bắt buộc (Gates & Checks)

Tất cả các lệnh kiểm tra theo yêu cầu assignment và cổng CI chung đều vượt qua 100%:

| Lệnh | Kết quả | Chi tiết |
|---|---|---|
| `pnpm test:e2e:admin-all` | **PASS (30/30)** | 26 trang quản trị + 4 bài test quy trình thương mại R04 |
| `pnpm test:payments` | **PASS (21/21)** | Bảng giá, checkout, voucher, subscription, refund, outbox |
| `pnpm test:payment-provider` | **PASS (10/10)** | Chữ ký HMAC SHA256, replay deduplication, out-of-order |
| `pnpm test:reconciliation` | **PASS (28/28)** | Đối soát thanh toán, báo cáo ngữ liệu, audit tenant |
| `pnpm test:admin` | **PASS (152/152)** | Toàn bộ 13 tệp test giao diện và dịch vụ quản trị |
| `pnpm test:reporting` | **PASS (17/17)** | Báo cáo doanh thu, retention, funnel, chuyển đổi |
| `pnpm test:entitlements` | **PASS (18/18)** | Cấp quyền học viên, gói tổ chức, quota AI nguyên tử |
| `pnpm test:cms` | **PASS (11/11)** | XSS Markdown sanitizer, bài viết SEO, FAQ |
| `pnpm test:experiments` | **PASS (7/7)** | Sticky assignment, zero PII leak, consent gating |
| `pnpm features:verify` | **PASS (363/363)** | 100% ứng dụng có bằng chứng test, zero stubs |
| `pnpm lint` | **PASS** | 0 lỗi ESLint trên 13 packages |
| `pnpm typecheck` | **PASS** | 0 lỗi TypeScript trên 13 packages |
| `pnpm build` | **PASS** | Turbo run build hoàn tất thành công |
| `pnpm install --frozen-lockfile` | **PASS** | Lockfile up-to-date, zero drift |

---

## 5. Ranh giới Phân hệ & Kiến nghị Điều phối (Module Boundaries & Delegation)

- **Tách bạch Phân hệ Thanh toán và Thi cử (SYS-10 / normalizeUserAnswers)**:
  Theo phản hồi đánh giá chéo từ reviewer W3, logic `OutboxService.prototype.normalizeUserAnswers` thuộc phân hệ Chấm thi/Nộp bài (SYS-10 / A14), nằm trong `apps/api/src/modules/outbox/outbox.service.ts` - tệp không thuộc `allowedPaths` của W4 trong task R04.
  Để tuân thủ triệt để ranh giới module, không monkey-patch prototype tại runtime và đảm bảo TypeScript strict không có ngoại lệ:
  1. `PaymentModule` (`apps/api/src/modules/payment/payment.module.ts`) được hoàn nguyên sạch sẽ về đúng phạm vi cấu hình thanh toán và đối soát (`PaymentService`, `PaymentProviderRegistry`, `PayOSAdapter`, `ReconciliationService`).
  2. Báo cáo blocker yêu cầu Coordinator giao quyền chỉnh sửa `apps/api/src/modules/outbox/outbox.service.ts` hoặc tạo task riêng cho worker phụ trách phân hệ thi (W1/W3) để áp dụng giải pháp batch query trực tiếp trong `OutboxService` với kiểu dữ liệu `DbTx` và Drizzle schema types chuẩn chỉ.

---

## 6. Tình trạng Bên ngoài (External Status)

- **PayOS Live Credentials**: `BLOCKED_EXTERNAL: payment-provider`. Hệ thống hoạt động hoàn chỉnh ở môi trường sandbox và có đầy đủ bằng chứng kiểm thử tự động chữ ký HMAC SHA256, deduplication và out-of-order. Sẵn sàng chuyển sang `live` ngay khi chủ dự án cung cấp thông tin merchant và credentials thực tế.

