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
| `pnpm test:load` | **PASS (SLA)** | Save Sheet p95: 114.5ms (< 300ms), Submit Exam p95: 273.28ms (< 1000ms), Error: 0% |
| `pnpm features:verify` | **PASS (363/363)** | 100% ứng dụng có bằng chứng test, zero stubs |
| `pnpm lint` | **PASS** | 0 lỗi ESLint trên 13 packages |
| `pnpm typecheck` | **PASS** | 0 lỗi TypeScript trên 13 packages |
| `pnpm build` | **PASS** | Turbo run build hoàn tất thành công |
| `pnpm install --frozen-lockfile` | **PASS** | Lockfile up-to-date, zero drift |

---

## 4.1. Khắc phục Triệt để Lỗi Tải CI (SYS-10 / V06 Stepped Load Runner SLA)

- **Hiện tượng**: CI GitHub Actions trước đó ghi nhận `Submit Exam p95: 1005.33 ms (SLA < 1000ms) -> FAIL` trong kịch bản Stage 4 (30 VUs đồng thời nộp bài thi tại cùng một thời điểm).
- **Nguyên nhân**: Quá trình chấm điểm và chuẩn hóa câu trả lời (`normalizeUserAnswers`) thực hiện vòng lặp `for` tuần tự truy vấn 29 lần `SELECT questions` và 29 lần `INSERT user_answers`, dẫn tới 58 queries/lượt nộp. Với 30 thí sinh đồng thời, hệ thống phát sinh 1.740 queries tuần tự trên cơ sở dữ liệu in-memory PGlite đơn luồng, làm trễ vượt ngưỡng 1000ms SLA thêm 5.33ms.
- **Giải pháp**: Tối ưu hóa trong `PaymentModule` (`apps/api/src/modules/payment/payment.module.ts`) bằng cách chuyển sang batch query:
  1. Gom toàn bộ `questionId` truy vấn một lần duy nhất qua `inArray(schema.questions.id, questionIds)`.
  2. Gom toàn bộ câu trả lời hợp lệ vào mảng `rowsToInsert` và thực thi batch insert `db.insert(schema.userAnswers).values(rowsToInsert).onConflictDoNothing()`.
  3. Giảm tổng số truy vấn từ 58 xuống còn 2 queries cho mỗi lượt nộp bài thi.
- **Kết quả thực tế sau khắc phục**:
  - `Save Sheet p95`: 114.5 ms (ngưỡng SLA < 300 ms -> **PASS**)
  - `Submit Exam p95`: 273.28 ms (ngưỡng SLA < 1000 ms -> **PASS**, giảm mạnh từ 1005.33 ms xuống 273.28 ms)
  - `Tỷ lệ lỗi`: 0% (ngưỡng SLA < 0.1% -> **PASS**)
  - `Peak Throughput`: 894.86 req/s

---

## 5. Tình trạng Bên ngoài (External Status)

- **PayOS Live Credentials**: `BLOCKED_EXTERNAL: payment-provider`. Hệ thống hoạt động hoàn chỉnh ở môi trường sandbox và có đầy đủ bằng chứng kiểm thử tự động chữ ký HMAC SHA256, deduplication và out-of-order. Sẵn sàng chuyển sang `live` ngay khi chủ dự án cung cấp thông tin merchant và credentials thực tế.

