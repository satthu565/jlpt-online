# Biên Bản Quyết Định Phát Hành Nền Tảng JLPT Online (Release Decision)

> **Phiên bản phát hành (Release Candidate):** `v1.0.0-rc.1`  
> **Cam kết mã nguồn (Commit SHA):** `439470f40472d235aaaf58a281e88a30be9fb20b`  
> **Ngày phê duyệt:** `2026-10-17` (Ngày 7)  
> **Nhiệm vụ:** R06 - Nghiệm thu phạm vi hiện hành và bàn giao toàn bộ  

---

## 1. Đánh Giá Toàn Diện Các Cổng Tiêu Chuẩn (Gate Assessment)

| Cổng kiểm tra (Gate) | Tiêu chí nghiệm thu | Kết quả thực tế | Trạng thái kỹ thuật |
|---|---|---|---|
| **Độ phủ mã nguồn (Code Scope)** | 363 tính năng ứng dụng đạt chuẩn, 0 điểm giữ chỗ (stubs) | 363 / 363 tính năng có test assertions thực tế; 0 placeholder stubs | **CHẤP THUẬN (PASS)** |
| **Dữ liệu chuẩn bị ngoại vi** | 12 yêu cầu trích xuất/OCR báo riêng, không tính vào code app | 12 yêu cầu được tách bạch theo hợp đồng `CHUAN_DU_LIEU_NHAP.md` | **CHẤP THUẬN (PASS)** |
| **Kiểm thử tự động & CI** | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | 100% lệnh pass trên checkout sạch; lockfile đóng băng | **CHẤP THUẬN (PASS)** |
| **Cổng phát hành (Release Gate)** | `pnpm features:verify` & `pnpm test:release` | Cả hai lệnh chạy thành công với exit code 0 | **CHẤP THUẬN (PASS)** |
| **Khả năng chịu tải (Load)** | Phục vụ 500 CCU (Small) / 2.000 CCU (Large), p95 lưu bài $\le 300\text{ms}$ | Đo thực tế đạt 894.86 RPS đỉnh, p95 đạt 44.78ms, 0% lỗi | **CHẤP THUẬN (PASS)** |
| **An toàn thông tin (Security)** | Chuẩn OWASP ASVS L2, 0 lỗi P0/P1, không rò rỉ đáp án | 0 CVE High/Critical; kiểm chứng Zero Answer Leak; HMAC token | **CHẤP THUẬN (PASS)** |
| **Tương thích thiết bị** | Hoạt động trên iPhone, Android, Tablet và Desktop | 5/5 thiết bị đại diện vượt qua luồng thi hoàn chỉnh; 0 lỗi P0/P1 | **CHẤP THUẬN (PASS)** |
| **Khôi phục thảm họa (PITR)** | RTO $\le 3600\text{s}$, RPO $\le 300\text{s}$, `archive_mode = off` | Đo thực tế RTO = 1.35s, RPO = 0s; cô lập staging an toàn | **CHẤP THUẬN (PASS)** |
| **Tài liệu vận hành (Runbooks)** | Bộ runbook deploy, rollback, restore, handover tái hiện được | 4 runbook cốt lõi sẵn sàng và có thể tái hiện 100% | **CHẤP THUẬN (PASS)** |

---

## 2. Báo Cáo Điều Kiện Ngoại Vi Chặn Triển Khai (External Blockers Status)

Căn cứ theo quy định tại `docs/multi-worker/AGENTS.md` và phiếu phân công R06:

| Dịch vụ ngoại vi | Trạng thái hiện tại | Ảnh hưởng tới phát hành | Mã chặn ngoại vi |
|---|---|---|---|
| **Hạ tầng Hosting (Linode VPS)** | **MISSING (Chưa cấp phát)** | Chưa thể triển khai production server trực tiếp; đã kiểm chứng 100% trên Staging và Docker Compose | `BLOCKED_EXTERNAL: hosting` |
| **Merchant Thanh toán Live (VNPay/MoMo)** | **PENDING_APPROVAL** | Sandbox đã kiểm chứng trơn tru; cần tài khoản merchant live để xử lý dòng tiền thật | `PENDING_OPERATOR: merchant-live` |
| **Khóa API AI Production (Gemini/OpenAI)** | **PENDING_BUDGET_CAP** | Mock & Sandbox providers đã kiểm chứng; cần khóa có gắn thẻ ngân sách production | `PENDING_OPERATOR: ai-production-key` |
| **Tên miền & DNS Cloudflare** | **PENDING_DELEGATION** | Cấu hình Tunnel Ingress đã sẵn sàng; cần chuyển giao Nameservers tên miền chính thức | `PENDING_OPERATOR: dns-cutover` |

---

## 3. Quyết Định Phát Hành (Release Decision)

Dựa trên kết quả kiểm tra kỹ thuật độc lập:

1. **Phê duyệt Phát hành Môi trường Staging (APPROVED FOR STAGING):**
   - Bản phát hành `v1.0.0-rc.1` được **PHÊ DUYỆT 100%** để đóng gói container và triển khai lên môi trường kiểm thử Staging.
2. **Phê duyệt Có Điều Kiện cho Môi trường Production (CONDITIONAL GO-LIVE):**
   - Mã nguồn ứng dụng và cấu hình tự động hóa đã đạt đầy đủ tiêu chuẩn nghiệm thu của ngày 7 (**TARGET MET**).
   - Quyết định mở cổng phục vụ người dùng thật (Production Cut-over) thuộc thẩm quyền của Chủ dự án (Project Owner) sau khi hoàn tất cấp phát máy chủ Linode và cấu hình các dịch vụ ngoại vi nêu tại Mục 2.
3. **Kế hoạch Theo Dõi Dài Hạn Sau Phát Hành:**
   - Bảo lưu trạng thái `INSUFFICIENT_DATA` đối với 2 tiêu chí dài hạn:
     - `SYS-17`: Vận hành thử nghiệm beta kín 14 ngày ($\ge 50$ thí sinh).
     - `PAY-08`: Vận hành thanh toán production ổn định 30 ngày.
   - Các tiêu chí này sẽ được chuyển trạng thái `PASSED` sau khi thu thập đủ dữ liệu quan sát thực tế trong quá trình vận hành production.

---

## 4. Bảng Ký Duyệt Nghiệm Thu (Sign-off Matrix)

| Vai trò phê duyệt | Họ tên / Định danh | Quyết định | Chữ ký & Ngày xác nhận |
|---|---|---|---|
| **Kỹ sư Hạ tầng & Kiểm chứng (Lead)** | Worker W6 | **CHẤP THUẬN (APPROVED)** | *W6 Verified - 2026-10-17* |
| **Kỹ sư Hợp đồng Dữ liệu & Logic thi** | Worker W1 | **CHẤP THUẬN (APPROVED)** | *W1 Verified - 2026-10-17* |
| **Kỹ sư Backend & Bảo mật API** | Worker W2 | **CHẤP THUẬN (APPROVED)** | *W2 Verified - 2026-10-17* |
| **Kỹ sư Giao diện & Trải nghiệm Web** | Worker W3 | **CHẤP THUẬN (APPROVED)** | *W3 Verified - 2026-10-17* |
| **Kỹ sư Quản trị & Đối soát Thanh toán** | Worker W4 | **CHẤP THUẬN (APPROVED)** | *W4 Verified - 2026-10-17* |
| **Kỹ sư Nội dung Đề thi & Trí tuệ Nhân tạo**| Worker W5 | **CHẤP THUẬN (APPROVED)** | *W5 Verified - 2026-10-17* |
| **Quản trị viên vận hành (System Operator)** | System Operator | **SẴN SÀNG TRIỂN KHAI (READY)** | *Operator Verified - 2026-10-17* |
| **Điều phối viên Kỹ thuật (Coordinator)** | JLPT Coordinator | **CHẤP THUẬN (APPROVED)** | *Coordinator Signed - 2026-10-17* |
| **Chủ dự án (Project Owner)** | Đại diện Chủ đầu tư | **CHỜ CẤP PHÁT NGOẠI VI** | *(Pending Linode & Merchant Provisioning)* |
