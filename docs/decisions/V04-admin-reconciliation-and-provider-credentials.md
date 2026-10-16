# Quyết định kiến trúc V04: Admin Reconciliation Vận hành, Chứng từ Provider và Bảo mật Sao lưu

- **Task**: V04 (Admin reconciliation vận hành và chứng từ provider)
- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Ngày**: 2026-10-16
- **Trạng thái**: APPROVED (Triển khai nội bộ V04)

## 1. Bối cảnh và Yêu cầu

Nhiệm vụ V04 mở rộng và hoàn thiện hệ thống quản trị vận hành (Admin Portal), trọng tâm là đối soát dòng tiền và chứng từ nhà cung cấp thanh toán (Reconciliation & Provider Statements), quản lý an toàn quy trình sao lưu và khôi phục cơ sở dữ liệu (Operator Backup & Restore), đảm bảo tính toàn vẹn kiểm toán (Audit Trail với Actor & Tenant) và xuất báo cáo an toàn (CSV RFC 4180 Escaping & Revenue Rounding).

Tiêu chí nghiệm thu bắt buộc:
1. **Webhook/live readiness có bằng chứng riêng sandbox**: Xác nhận rõ ràng trạng thái sandbox mode của PayOS, không nhận vơ là live khi chưa có hợp đồng/credentials thật từ chủ dự án (ghi nhận rõ `BLOCKED_EXTERNAL: payment-provider`). Các cơ chế bảo vệ chữ ký HMAC, chống replay và xử lý out-of-order đều có bằng chứng sandbox kiểm thử tự động.
2. **Admin backup không giữ raw secrets trong browser**: Giao diện và API quản trị sao lưu (ADM-20 / SYS-08) chỉ cho phép kích hoạt các operator job nằm trong danh mục trắng được phê duyệt (`base-backup`, `export-bundle`, `restore-pitr`). Toàn bộ mật khẩu, API key, connection string đều được che giấu (`[REDACTED_SECRET]`) trước khi gửi về client, ngăn chặn rò rỉ bí mật vào DOM/browser state.
3. **Mọi action audit có actor và tenant**: Mọi thao tác quản trị, từ đối soát giao dịch, cập nhật cấu hình đến kích hoạt sao lưu, đều được ghi nhận nhật ký kiểm toán với đầy đủ thông tin Người thực hiện (`actorId`, `actorEmail`, `actorRole`) và Đơn vị quản lý (`tenantId`, mặc định là `global` nếu hệ thống dùng chung).
4. **Report CSV escaping và revenue rounding đúng**: Xuất báo cáo CSV tuân thủ chặt chẽ RFC 4180 và phòng chống triệt để Formula Injection (CSV Injection với các ký tự `=`, `+`, `-`, `@`, `\t`, `\r`). Doanh thu và hoàn tiền được tính toán trên đơn vị số nguyên nhỏ nhất (minor units: VND, JPY không có số thập phân) để loại bỏ hoàn toàn sai số dấu phẩy động (floating point).

---

## 2. Các quyết định kỹ thuật chủ chốt

### 2.1. Động cơ Đối soát Giao dịch & Chứng từ Provider (`apps/api/src/modules/payment/`)
- **Phát hiện sai lệch tự động (Discrepancy Detection)**:
  Hệ thống đối chiếu hai chiều giữa dữ liệu nội bộ (`orders`, `paymentAttempts`, `refundRequests`) và bảng kê giao dịch từ provider (`ProviderStatementItem`), tự động nhận diện 6 kịch bản bất thường:
  1. `amount_mismatch`: Số tiền thanh toán thực tế tại cổng khác với giá trị đơn hàng nội bộ.
  2. `missing_internal_order`: Có chứng từ ghi có từ provider nhưng không tìm thấy đơn hàng tương ứng trong hệ thống (thanh toán lạc dòng).
  3. `missing_provider_settlement`: Đơn hàng nội bộ ghi nhận đã trả nhưng không xuất hiện trong bảng kê quyết toán của provider.
  4. `refund_amount_mismatch`: Số tiền hoàn trả trên cổng không khớp với yêu cầu hoàn tiền nội bộ.
  5. `unprocessed_refund`: Yêu cầu hoàn tiền đã duyệt trong hệ thống nhưng chưa được thực thi tại cổng thanh toán.
  6. `duplicate_provider_ref`: Trùng lặp mã tham chiếu giao dịch giữa nhiều đơn hàng khác nhau.
- **Lưu trữ phiên đối soát (`reconciliation_runs`)**:
  Kết quả mỗi lần đối soát được lưu trữ bất biến vào bảng `reconciliation_runs` gồm tổng số đơn xử lý, số lượng khớp, số lượng sai lệch và mảng chi tiết sai lệch JSONB.
- **Bảo vệ quyền riêng tư (PII Protection)**:
  Sự kiện outbox phát hành sau phiên đối soát (`payment.reconciliation_run`) tuyệt đối không chứa email dạng văn bản thô nhằm tuân thủ quy tắc bảo vệ PII của hệ thống outbox.

### 2.2. Kiểm toán Đa người dùng & Đa đơn vị (Multi-tenant Audit Trail)
- **Đồng bộ hóa mô hình Audit**:
  Mọi mục kiểm toán `AuditLogEntry` trong `apps/admin` và bảng `operator_actions` trong API đều được bổ sung trường `tenantId` bắt buộc.
- **Giá trị mặc định an toàn**:
  Nếu người thực hiện thao tác không thuộc một tenant giáo viên/tổ chức cụ thể, hệ thống tự động gán `tenantId: 'global'`, không bao giờ để giá trị `null` hay `undefined`.
- **Giao diện trực quan**:
  Thành phần `AuditLogTimeline` hiển thị huy hiệu (badge) rõ ràng cho Actor và Tenant, hỗ trợ bộ lọc đa chiều theo `tenantId`.

### 2.3. Quản lý Sao lưu An toàn & Bảo vệ Bí mật Trình duyệt (`apps/admin/features/backup/`)
- **Chính sách Whitelist nghiêm ngặt**:
  Chỉ 3 loại operator job được phép kích hoạt:
  - `base-backup`: Tạo bản sao lưu toàn bộ cơ sở dữ liệu định kỳ.
  - `export-bundle`: Xuất gói lưu trữ dữ liệu nén.
  - `restore-pitr`: Yêu cầu phục hồi dữ liệu về một thời điểm chỉ định (Point-in-Time Recovery).
- **Phòng chống Shell/Command Injection**:
  Mọi tham số lệnh gửi lên đều được thẩm định cú pháp bằng biểu thức chính quy khắt khe, từ chối ngay lập tức các ký tự điều khiển shell nguy hiểm (`;`, `&`, `|`, `` ` ``, `$`, `>`, `<`).
- **Trung hòa Bí mật (Secret Sanitization)**:
  Hàm `sanitizeConfig()` quét đệ quy cấu hình hệ thống, chuyển đổi toàn bộ mật khẩu, access token và private key thành chuỗi cố định `[REDACTED_SECRET]` trước khi đưa vào React state hoặc hiển thị lên HTML DOM.

### 2.4. Báo cáo Ngữ liệu, An toàn CSV & Tính toán Tiền tệ (`apps/api/src/modules/reporting/`)
- **Báo cáo Ngữ liệu (Corpus Report)**:
  Cung cấp báo cáo phân tích ngôn ngữ học tổng hợp số lượng tài liệu (`datasetDocuments`), từ vựng (`vocabOccurrences`, `lexicalEntries`), ngữ pháp (`grammarOccurrences`) và Hán tự (`kanjiOccurrences`) theo từng cấp độ JLPT (N1 đến N5).
- **CSV RFC 4180 Escaping & Anti-Formula Injection**:
  Hàm `sanitizeCsvCell()` kiểm tra và vô hiệu hóa mọi ký tự khởi đầu công thức bảng tính (`=`, `+`, `-`, `@`, `\t`, `\r`) bằng tiền tố dấu nháy đơn (`'`). Các ô chứa ký tự đặc biệt, dấu phẩy, nháy kép hoặc xuống dòng được bao bọc bằng dấu ngoặc kép theo chuẩn RFC 4180.
- **Tiền tệ Minor Units**:
  Mọi phép tính doanh thu, tổng số tiền và hoàn tiền đều sử dụng đơn vị minor units dạng số nguyên (integer), đảm bảo không xảy ra sai số làm tròn số thực dấu phẩy động (IEEE 754 floating point issues).

### 2.5. Khắc phục Timeout Cổng Kiểm thử Clean Checkout (`package.json`)
- Tránh lỗi timeout 60000ms trong `tests/performance.test.tsx` (kiểm tra bundle và prerender của Next.js) khi coordinator chạy kiểm thử từ bản checkout sạch trước khi build (`pnpm test` chạy trước `pnpm build`).
- Cấu hình script root `test` thành `turbo run build && turbo run test --concurrency=2` để đảm bảo Next.js artifacts và bundle manifest được khởi tạo sẵn bằng pipeline build của Turbo trước khi vitest kích hoạt hook xác minh ngân sách tài nguyên.

---

## 3. Điều kiện phụ thuộc bên ngoài (External Status)

- **Trạng thái**: `payment-provider: MISSING`.
- **Đánh giá**:
  Chưa có tài khoản merchant PayOS production và khóa HMAC trực tiếp từ ngân hàng/chủ dự án.
- **Xử lý an toàn**:
  Ghi nhận rõ ràng trạng thái `BLOCKED_EXTERNAL: payment-provider (Thiếu credentials live PayOS merchant)`. Toàn bộ chức năng đối soát và xác thực webhook hoạt động ổn định trên nền tảng sandbox và fixtures kiểm thử tự động, tuyệt đối không giả mạo là đã kiểm chứng live với ngân hàng thật.
