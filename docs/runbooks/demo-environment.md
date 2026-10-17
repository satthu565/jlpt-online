# Runbook: Môi trường Demo Đầy Đủ bằng Docker Compose (Demo Environment)

Runbook hướng dẫn khởi dựng, vận hành và nghiệm chuyển môi trường Demo (`jlpt-demo`) hoàn chỉnh bằng Docker Compose, đồng bộ với kiến trúc reverse proxy cùng origin (`/api/v1`), hệ thống gửi nhận email Mailpit thật và tài khoản định danh nhân sự/học viên đã seed sẵn.

---

## 1. Kiến trúc môi trường Demo

Môi trường Demo mô phỏng toàn diện mô hình production (Cloudflare Tunnel) trên môi trường VPS hoặc kiểm thử tích hợp:
- **Web App (Học viên)**: Phục vụ tại `http://127.0.0.1:3200`. Các yêu cầu đến `/api/*` được Caddy reverse proxy trực tiếp sang container `api:4000`, đảm bảo chung origin (`NEXT_PUBLIC_API_URL=/api/v1`).
- **Admin Portal (Quản trị viên)**: Phục vụ tại `http://127.0.0.1:3201`. Các yêu cầu đến `/api/*` được reverse proxy sang container `api:4000`.
- **API Service**: Container `api` chạy chế độ HTTP REST API trên cổng nội bộ `4000` (và cổng host `4200` phục vụ kiểm tra trực tiếp).
- **Worker Service**: Container `worker` chạy xử lý tác vụ ngầm (Outbox dispatcher, chấm thi bất đồng bộ, import).
- **PostgreSQL 17**: Cơ sở dữ liệu độc lập với volume `demo-postgres-data` và cấu hình tham số `postgresql.small.conf`.
- **Redis Core**: Lưu trữ session, lease thi thật và idempotency lock (AOF everysec, noeviction).
- **Redis Cache**: Lưu cache snapshot đề thi và dữ liệu từ vựng (LRU, max 64MB).
- **Mailpit**: Máy chủ SMTP giả lập thu thập toàn bộ email gửi đi từ API. Giao diện Web UI tại `http://127.0.0.1:8226`, cổng SMTP tại `127.0.0.1:1026`.
- **Caddy Reverse Proxy**: Gom Web, Admin và `/api` về cùng origin, loại bỏ rủi ro CORS và sai lệch SameSite cookie.

---

## 2. Bản đồ cổng mạng (Port Mapping)

| Dịch vụ | Cổng Host (Demo) | Cổng Nội bộ | Giao thức / Mục đích |
| :--- | :--- | :--- | :--- |
| **Web + API Proxy** | `127.0.0.1:3200` | `3000` | Web giao diện học viên và API `/api/v1` |
| **Admin + API Proxy** | `127.0.0.1:3201` | `3001` | Cổng thông tin quản trị và API `/api/v1` |
| **Mailpit Web UI** | `127.0.0.1:8226` | `8025` | Xem email xác minh, OTP và thông báo |
| **Mailpit SMTP** | `127.0.0.1:1026` | `1025` | Nhận email gửi từ NestJS EmailService |
| **API Direct** | `127.0.0.1:4200` | `4000` | Kiểm thử trực tiếp API endpoint |

---

## 3. Quy trình khởi dựng môi trường Demo

### Bước 1: Chuẩn bị mã nguồn và biến môi trường
```bash
git checkout main
pnpm install --frozen-lockfile
```

### Bước 2: Build container images một lần
Tuân thủ hợp đồng kỹ thuật: hình ảnh container được build một lần bằng tag cam kết (commit SHA), tuyệt đối không build lại tại runtime:

```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
export IMAGE_REGISTRY=ghcr.io
export IMAGE_REPO=jlpt

# Build API & Worker image
docker build -t jlpt/jlpt-api:${IMAGE_TAG} -f infra/docker/api.Dockerfile .

# Build Web image với NEXT_PUBLIC_API_URL=/api/v1
docker build --build-arg NEXT_PUBLIC_API_URL=/api/v1 -t jlpt/jlpt-web:${IMAGE_TAG} -f infra/docker/web.Dockerfile .

# Build Admin image với NEXT_PUBLIC_API_URL=/api/v1
docker build --build-arg NEXT_PUBLIC_API_URL=/api/v1 -t jlpt/jlpt-admin:${IMAGE_TAG} -f infra/docker/admin.Dockerfile .

# Build Postgres image với WAL-G
docker build -t jlpt/jlpt-postgres:${IMAGE_TAG} -f infra/postgres/Dockerfile infra/postgres
```

### Bước 3: Khởi chạy các dịch vụ bằng Compose
```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
docker compose -p jlpt-demo -f infra/compose/compose.demo.yml up -d
```

### Bước 4: Kiểm tra trạng thái sức khỏe dịch vụ
Đợi toàn bộ container đạt trạng thái `healthy`:
```bash
for i in {1..30}; do
  API_OK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4200/api/v1/health || true)
  WEB_OK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3200/healthz || true)
  ADMIN_OK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3201/healthz || true)
  MAIL_OK=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8226/api/v1/info || true)

  echo "Probe $i: API=${API_OK}, Web=${WEB_OK}, Admin=${ADMIN_OK}, Mailpit=${MAIL_OK}"
  if [ "$API_OK" = "200" ] && [ "$WEB_OK" = "200" ] && [ "$ADMIN_OK" = "200" ] && [ "$MAIL_OK" = "200" ]; then
    echo "Toàn bộ dịch vụ Demo đã sẵn sàng!"
    break
  fi
  sleep 3
done
```

### Bước 5: Nạp dữ liệu mẫu và tài khoản Seed
```bash
# 1. Nạp gói đề thi chuẩn N5 blueprint demo
docker compose -p jlpt-demo -f infra/compose/compose.demo.yml exec -T api node dist/src/modules/import/demo-seed.js

# 2. Nạp tài khoản nhân sự có mật khẩu, TOTP và phiên đăng nhập xác thực
docker compose -p jlpt-demo -f infra/compose/compose.demo.yml exec -T postgres psql -U jlpt -d jlpt_demo < tests/fixtures/seed-sessions.sql

# 3. Kích hoạt tính năng thi thử tự do (guest_trial) cho đề N5 demo
docker compose -p jlpt-demo -f infra/compose/compose.demo.yml exec -T postgres psql -U jlpt -d jlpt_demo -c "UPDATE exams SET description = 'guest_trial' WHERE slug = 'demo-n5-1';"
```

---

## 4. Danh sách tài khoản thử nghiệm (Seed Credentials)

| Vai trò | Email đăng nhập | Mật khẩu | Mã bí mật TOTP (2FA) |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `publisher@jlpt.local` | `Admin123456!` | `JBSWY3DPEHPK3PXP` |
| **Quản trị thanh toán** | `billing.admin@jlpt.local` | `Admin123456!` | `JBSWY3DPEHPK3PXP` |
| **Biên tập viên (Editor)** | `editor@jlpt.local` | `Admin123456!` | `JBSWY3DPEHPK3PXP` |
| **Người duyệt đề (Reviewer)**| `reviewer@jlpt.local` | `Admin123456!` | `JBSWY3DPEHPK3PXP` |
| **Học viên đã xác minh** | `student.verified@jlpt.local` | `Student123456!` | Không áp dụng |

> **Hướng dẫn tạo mã TOTP**: Nhập mã bí mật `JBSWY3DPEHPK3PXP` vào ứng dụng xác thực (Google Authenticator, Authy, Bitwarden) hoặc chạy lệnh kiểm thử tích hợp Playwright `pnpm test:e2e:integration` để tự sinh mã 6 số chuẩn RFC 6238.

---

## 5. Truy cập từ máy tính cá nhân qua SSH Tunneling

Khi triển khai môi trường demo trên máy chủ VPS từ xa, thực hiện forward cổng về máy phát triển:
```bash
ssh -N \
  -L 3200:127.0.0.1:3200 \
  -L 3201:127.0.0.1:3201 \
  -L 8226:127.0.0.1:8226 \
  root@<IP_MAY_CHU_VPS>
```

Sau khi thiết lập kết nối, truy cập trực tiếp trên trình duyệt của máy bạn:
- **Cổng học viên**: [http://localhost:3200](http://localhost:3200)
- **Cổng quản trị**: [http://localhost:3201](http://localhost:3201)
- **Hộp thư Mailpit**: [http://localhost:8226](http://localhost:8226)

---

## 6. Kiểm tra nghiệm thu tự động

### Kiểm tra tích hợp Playwright thật
Chạy bộ kiểm thử Playwright trên môi trường thật:
```bash
pnpm test:e2e:integration -- --list
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3200 ADMIN_URL=http://127.0.0.1:3201 pnpm test:e2e:integration
```

### Kiểm tra cổng chặn dữ liệu giả (No Mock UI)
```bash
pnpm check:no-mock-ui
```
Lệnh này quét toàn bộ `apps/web` và `apps/admin`, đối chiếu với baseline `tests/integration/mock-ui-baseline.json`. CI sẽ từ chối nếu có bất kỳ route hoặc file nào chứa mảng mẫu, `ALL_SAMPLE` hoặc đăng nhập giả ngoài danh mục baseline.

---

## 7. Dừng và dọn dẹp môi trường Demo

Khi hoàn thành phiên diễn tập hoặc kiểm thử:
```bash
docker compose -p jlpt-demo -f infra/compose/compose.demo.yml down -v --remove-orphans
```
Lệnh trên giải phóng toàn bộ container, mạng bridge `jlpt-demo-net` và các volume dữ liệu độc lập.
