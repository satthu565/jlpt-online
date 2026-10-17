# Bảng Kiểm Tra An Toàn và Đánh Giá Lỗ Hổng OWASP ASVS L2 (SYS-10 / Task V06)

> Tham chiếu tiêu chuẩn OWASP Application Security Verification Standard (ASVS) Level 2 và hợp đồng T1.9.3.
> **Thời điểm xác minh:** \`2026-10-17\`
> **Quy tắc nghiệm thu:** Không chấp nhận âm thầm bất kỳ lỗi mức P0/P1 nào (No P0/P1 accepted silently); Không còn lỗ hổng mức High/Critical trong phụ thuộc.

---

## 1. Rà Soát Phụ Thuộc (Dependency Audit & Supply Chain)

- **Lệnh kiểm tra:** \`pnpm audit --audit-level=high\`
- **Trạng thái:** **PASS (0 lỗ hổng mức High / Critical)**
- **Khóa lockfile:** \`pnpm install --frozen-lockfile\` tuân thủ chính sách chuỗi cung ứng, không dùng \`latest\`.

| Mức độ | Số lượng phát hiện | Hành động xử lý |
|---|---|---|
| **Critical** | 0 | Không phát hiện |
| **High** | 0 | Không phát hiện |
| **Moderate** | 1 (dev tooling: esbuild dev server) | Cách ly trong build tool, không xuất hiện ở runtime production |
| **Low** | 1 (dev tooling: eslint regex) | Cách ly trong linter, không xuất hiện ở runtime production |

---

## 2. Bảng Đánh Giá Chi Tiết Theo OWASP ASVS Level 2

| Nhóm kiểm tra (ASVS Category) | Mục kiểm tra | Kiểm chứng tự động | Trạng thái | Ghi chú an toàn |
|---|---|---|---|---|
| **V1: Kiến trúc & Mô hình đe dọa** | Tách biệt ranh giới thuê bao (Tenant Isolation) | \`tests/integration/security-matrix.test.ts\` | **PASS** | Chặn đứng Cross-tenant (403 TENANT_FORBIDDEN), không dùng tenantId từ client |
| **V2: Xác thực (Authentication)** | Bảo vệ phiên & Cookie an toàn | \`apps/api/src/common/guards/security-hardening.test.ts\` | **PASS** | Cookies \`Secure\`, \`HttpOnly\`, \`SameSite=Lax\`, prefix \`__Host-\` |
| **V3: Quản lý phiên (Session)** | Chống thao túng Lease Token và chiếm phiên thi | \`tests/integration/security-matrix.test.ts\` | **PASS** | Từ chối lease giả mạo với 409 LEASE_INVALID, kiểm tra seq tăng dần |
| **V4: Kiểm soát truy cập (Access Control)** | Phòng chống IDOR giữa các thí sinh | \`tests/integration/security-matrix.test.ts\` | **PASS** | Thí sinh B không thể xem, sửa phiếu, chuyển phần, nộp bài hay xem review của Thí sinh A (404 NOT_FOUND) |
| **V4: Kiểm soát truy cập (RBAC)** | Nguyên tắc 4 mắt (4-Eyes Principle) | \`tests/integration/security-matrix.test.ts\` | **PASS** | Editor không thể tự duyệt phiên bản đề thi của chính mình (403 Forbidden) |
| **V4: Kiểm soát truy cập (Admin Boundary)** | Chặn truy cập route quản trị từ public host | \`infra/cloudflared/config.yml\` & \`security-matrix.test.ts\` | **PASS** | Cloudflared Tunnel chặn rule \`^/api/v1/admin\` trước rule public; API Guard chặn mọi quyền student (403) |
| **V5: Mã hóa & Token (Cryptography)** | Chữ ký HMAC Media Token & Hạn giờ | \`packages/media-token\` & \`tests/integration/security-matrix.test.ts\` | **PASS** | Token giả mạo hoặc hết hạn bị từ chối ngay lập tức; không lộ audio đề thi |
| **V8: Bảo vệ dữ liệu (Data Protection)** | Tuyệt đối không lộ đáp án trước quyền xem | \`apps/api/src/modules/attempt/no-answer-leak.test.ts\` | **PASS** | Snapshot đề thi, bài thi đang làm, export dữ liệu đều chạy qua \`assertNoAnswerLeak\` |
| **V8: Bảo vệ dữ liệu (Embargo)** | Embargo kết quả thi đồng loạt | \`apps/api/src/modules/classroom/event.test.ts\` | **PASS** | Kết quả kỳ thi tập trung bị khóa (403 RESULTS_EMBARGOED) đến đúng giờ công bố |
| **V14: Cấu hình an toàn (Configuration)** | Tiêu đề HTTP an toàn (CSP, HSTS, X-Frame-Options) | \`apps/api/src/common/guards/security-hardening.test.ts\` | **PASS** | \`X-Frame-Options: DENY\`, \`X-Content-Type-Options: nosniff\`, strict CSP |

---

## 3. Kết Luận Nghiệm Thu An Toàn

- [x] Đã hoàn thành 100% các hạng mục kiểm tra theo hợp đồng T1.9.3 và SYS-10.
- [x] Không có bất kỳ lỗi mức P0 hoặc P1 nào bị chấp nhận âm thầm (tất cả các trường hợp tiêu cực đều trả về mã lỗi và envelope chuẩn).
- [x] CodeQL workflow đã được thiết lập tại \`.github/workflows/codeql.yml\` để tự động quét tĩnh trên CI.
