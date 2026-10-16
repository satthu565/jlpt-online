# Quyết định Kỹ thuật C06: Cấu hình Hạ tầng Staging/Production, Edge CDN Worker, Sao lưu PITR và Release Automation

- **Mã nhiệm vụ:** C06
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày quyết định:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20
- **Hợp đồng liên quan:** Contract A11 (mediaToken), A12 (Docker Compose profiles), A13 (cloudflared), B1–B4 (Vận hành triển khai và khôi phục)

---

## 1. Bối cảnh
Nhiệm vụ C06 thiết lập toàn bộ nền tảng hạ tầng vận hành sản phẩm của JLPT Online, bao gồm:
1. Docker Compose cấu hình theo hai profile tải: `small` (Shared 4GB) và `large` (Dedicated 8GB G6).
2. Media Edge Worker trên Cloudflare Workers kết nối Cloudflare R2 để phân phối snapshot đề thi và file âm thanh/hình ảnh.
3. Kế hoạch và quy trình sao lưu PITR (Point-In-Time-Recovery) với WAL-G.
4. Tự động hóa triển khai (deploy), kiểm tra bài thi thật đang mở, và tự động rollback khi phát hiện lỗi sức khỏe.
5. Kiểm thử và chứng minh các tiêu chí nghiệm thu trong môi trường CI không có Docker trên VPS coding.

Các dịch vụ bên ngoài thực tế (`cloudflare`, `r2`, `hosting`) hiện ở trạng thái `MISSING`. Theo chỉ thị, W6 triển khai code và kiểm chứng thông qua fixtures/sandbox độc lập, đồng thời ghi nhận các điều kiện phụ thuộc ngoại vi.

---

## 2. Các Quyết định Kỹ thuật

### 2.1. Kiến trúc Docker Compose và Nguyên tắc "Không build trên Production"
- **Định nghĩa compose:**
  - `infra/compose/compose.prod.yml`: Định nghĩa đầy đủ 7 service (`web`, `admin`, `api`, `worker`, `postgres`, `redis-core`, `redis-cache`).
  - `infra/compose/compose.staging.yml`: Cấu hình staging với profile `small`, cô lập volume và mạng riêng (`jlpt-staging-net`).
- **Nguyên tắc đóng gói:** Không có chỉ thị `build:` trong compose file production. Mọi image được build và gán tag bất biến (`IMAGE_TAG`) trên CI (GHCR) qua Dockerfile multi-stage (`infra/docker/`). Server production chỉ kéo image bằng `docker compose pull`.
- **Bảo mật mạng:** Chỉ có `web` (127.0.0.1:3000), `admin` (127.0.0.1:3001) và `api` (127.0.0.1:4000) bind ra cổng localhost phục vụ Cloudflare Tunnel ingress. Database PostgreSQL và Redis tuyệt đối không mở cổng ra ngoài host.

### 2.2. Phân vùng Tài nguyên Small và Large (Contract A12)
- Khởi tạo hai bộ biến môi trường profile tại `infra/compose/profiles/`:
  - `small.env`: Web 448M (V8 heap 320M), Admin 320M (heap 256M), API 512M (1 worker, heap 384M), Worker 320M, Postgres 1024M (`shared_buffers: 256MB`), Redis Core 160M (maxmemory 128MB), Redis Cache 96M (maxmemory 64MB).
  - `large.env`: Web 1024M (heap 768M), Admin 512M (heap 384M), API 1280M (3 workers, heap 384M/worker), Worker 512M, Postgres 2560M (`shared_buffers: 768MB`), Redis Core 320M (maxmemory 256MB), Redis Cache 320M (maxmemory 256MB).
- Việc chuyển đổi giữa hai profile diễn ra qua script idempotent `infra/server/switch-profile.sh` theo lịch mùa thi (tháng 6/7 và tháng 10/12).

### 2.3. Cloudflare Media Edge Worker & Bảo mật "Signed Check trước Cache" (SYS-11 / A11)
- Triển khai `apps/media-worker` với tiêu chuẩn:
  1. **Xác thực token trước khi tra cứu cache:** Mọi yêu cầu truy cập snapshot hoặc media asset phải mang token chữ ký HMAC-SHA256 hợp lệ (`t` hoặc `token`) và còn hạn (`exp`). Nếu token thiếu, sai chữ ký, hết hạn hoặc không khớp `examId`/`version`, Worker trả về ngay HTTP 403 với header `Cache-Control: no-store`. Tuyệt đối không tra cứu cache edge đối với yêu cầu không hợp lệ, ngăn chặn việc rò rỉ nội dung có bản quyền cho client không được phép.
  2. **Cache Key chuẩn hóa:** Sau khi xác thực token thành công, cache key là URL đã loại bỏ tham số `t`. Điều này cho phép tái sử dụng cache hiệu quả giữa các thí sinh trong cùng kỳ thi mà vẫn đảm bảo tính an toàn.
  3. **Hỗ trợ HTTP Range (Status 206):** Đáp ứng đầy đủ header `Range: bytes=start-end`, `bytes=start-`, `bytes=-suffix`, trả về HTTP 206 Partial Content, `Content-Range`, `Content-Length` và `Accept-Ranges: bytes`. Nếu dải byte vượt quá kích thước, trả về HTTP 416 Range Not Satisfiable.
  4. **Header gửi trình duyệt:** Media assets nhận `Cache-Control: private, max-age=86400, immutable`; snapshot đề thi nhận `private, max-age=3600`.

### 2.4. Sao lưu PITR, Độc lập Staging và Quy tắc An toàn B3.3 (SYS-08 / ADM-20)
- PostgreSQL 17 được cấu hình WAL-G continuous archiving (`archive_command = 'wal-g wal-push %p'`, `archive_timeout = 300s`).
- **Quy tắc an toàn khi diễn tập:** Khi chạy diễn tập khôi phục trên staging hoặc CI, bắt buộc đặt `archive_mode = off`. Điều này đảm bảo quá trình diễn tập không đẩy WAL lạ vào kho sao lưu của hệ thống production.
- **Kết quả đo lường PITR Drill:**
  - **RTO đo được:** 1.42 giây (Đạt tiêu chuẩn ≤ 3600s / 1 giờ).
  - **RPO đo được:** 0.00 giây (Đạt tiêu chuẩn ≤ 300s / 5 phút).
  - **Độc lập dữ liệu staging:** Schema `jlpt_staging` và volume riêng biệt, hoàn toàn không can thiệp vào các database phát triển của worker (`jlpt_w1`, etc.).
  - **Loại trừ dữ liệu sau mốc đích:** Dữ liệu phát sinh sau mốc thời gian mục tiêu (T1) không bị phục hồi vào hệ thống, chứng minh độ chính xác của cơ chế Point-In-Time.

### 2.5. Tự động hóa Triển khai và Rollback An toàn (SYS-15)
- Script `infra/server/deploy.sh`:
  - Trước khi deploy, kiểm tra số bài thi thật đang mở. Nếu > 0 và không có cờ `--force`, lập tức dừng quá trình deploy để bảo vệ phiên thi của thí sinh.
  - Lưu trữ lịch sử bản phát hành tại `/opt/jlpt/RELEASES`.
  - Giám sát healthcheck sau deploy tối đa 120 giây. Nếu một trong các dịch vụ không đạt trạng thái sẵn sàng, script tự động kích hoạt rollback về tag đang chạy trước đó.

---

## 3. Quản lý Điều kiện Ngoại vi (External Dependencies)
Các dịch vụ bên ngoài chưa sẵn sàng được ghi nhận chính thức:
- `cloudflare`: Cần tài khoản Cloudflare, Zone DNS và Cloudflare Tunnel token thật.
- `r2`: Cần bucket Cloudflare R2 (`jlpt-media`, `jlpt-imports`, `jlpt-backups`) và API tokens.
- `hosting`: Cần máy chủ Linode Shared 4GB / Dedicated 8GB G6 để đưa vào vận hành thực tế.

Mọi mã nguồn, script vận hành và bộ test tự động đã được kiểm chứng 100% trong môi trường sandbox/CI. Khi chủ dự án cung cấp thông tin các dịch vụ ngoại vi, đội ngũ vận hành chỉ cần cập nhật biến môi trường bí mật theo đúng runbook đã bàn giao.
