# Runbook: Thiết lập Cloudflare, Tunnel và Edge Media Worker (T1.8.3, T1.8.4, SYS-11)

Tài liệu hướng dẫn từng bước thiết lập Cloudflare cho chủ dự án và đội ngũ vận hành.

## 1. SSL/TLS và Security Settings
- **SSL/TLS Encryption Mode:** Chọn **Full (strict)**.
- **Always Use HTTPS:** Bật (ON).
- **Minimum TLS Version:** TLS 1.3 (hoặc 1.2 tối thiểu).
- **HSTS:** Bật với max-age = 6 tháng, include subdomains, preload.
- **Bot Fight Mode:** Bật (ON).
- **Web Application Firewall (WAF):**
  - Bật Cloudflare Free Managed Ruleset.
  - Tạo 1 Rate Limiting Rule: Đường dẫn `/api/v1/auth/*` giới hạn tối đa 10 requests / 10 giây trên mỗi IP (chống brute force mật khẩu và flood mã xác nhận).

## 2. Cloudflare Cache Rules
1. **Public Static Content:** Cho phép cache các đường dẫn public và file tĩnh (`/_next/static/*`, `/images/*`, `/favicon.ico`) với TTL 1 tuần.
2. **Bypass Rules (Bắt buộc):**
   - Bypass toàn bộ `/api/*`
   - Bypass toàn bộ `/thi/*` (phiếu làm bài và phòng thi trực tuyến)
   - Bypass toàn bộ `/tai-khoan/*`
   - Bypass toàn bộ subdomain `admin.example.com`
3. **Optimizations:** Tắt Rocket Loader để tránh xung đột với hydration React/Next.js.

## 3. Cloudflare Tunnel (`cloudflared`) & Zero-Trust Access
1. Cài đặt `cloudflared` trên máy chủ Linode.
2. Cấu hình Tunnel bằng file `/opt/jlpt/cloudflared/config.yml` theo contract A13:
   - Chặn `/api/v1/admin(/.*)?$` trên domain public `example.com`.
   - Định tuyến `/api/.*` về `http://127.0.0.1:4000`.
   - Định tuyến `example.com` về `http://127.0.0.1:3000`.
   - Định tuyến `admin.example.com` về `http://127.0.0.1:3001` (qua Cloudflare Access).
   - Định tuyến `ssh.example.com` về `ssh://127.0.0.1:22` (qua Cloudflare Access).
3. **Cloudflare Access Policies:**
   - Tạo Application cho `admin.example.com` và `ssh.example.com`.
   - Policy: Chỉ cho phép danh sách email quản trị viên, xác thực OTP qua email hoặc Google Workspace.
4. Khi SSH qua Tunnel đã hoạt động ổn định: **Xóa rule cổng 22** khỏi Cloud Firewall (server hoàn toàn đóng mọi port ra ngoài Internet).

## 4. Cloudflare R2 & Media Edge Worker (`apps/media-worker`)
- Bucket cấu hình:
  - `jlpt-media`: Chứa âm thanh (mp3), hình ảnh đề thi.
  - `jlpt-imports`: Chứa file import v2 và snapshot nội dung.
  - `jlpt-backups`: Chứa base backup và WAL files từ PostgreSQL WAL-G.
- Media Worker route: `media.example.com/*`
- Cơ chế bảo mật và cache:
  - Worker xác thực token `t` trước khi tra cứu cache edge (**Signed check trước cache**).
  - Cache key là URL đã loại bỏ tham số `t`.
  - Hỗ trợ Range request trả về HTTP 206 Partial Content cho streaming audio bài thi nghe.
