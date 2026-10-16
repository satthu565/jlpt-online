# Dịch vụ phát triển và cách ly sáu coding worker (F07)

Tài liệu hướng dẫn cấu hình, khởi chạy và kiểm chứng hạ tầng phát triển độc lập cho 6 worker theo [DAC_TA_RUNNER.md](../../docs/multi-worker/DAC_TA_RUNNER.md) và [VAN_HANH_VPS_WORKER.md](../../docs/multi-worker/VAN_HANH_VPS_WORKER.md).

## 1. Phân bổ tài nguyên và cách ly 6 worker

| Worker | Vai trò                          | Linux User | Cổng Web | Cổng Admin | Cổng API | Database  | Redis Core Prefix | Redis Cache Prefix | BullMQ Prefix | Thư mục Storage             |
| ------ | -------------------------------- | ---------- | -------- | ---------- | -------- | --------- | ----------------- | ------------------ | ------------- | --------------------------- |
| **W1** | Hợp đồng dữ liệu & logic thi     | `jlpt-w1`  | 3100     | 3101       | 4100     | `jlpt_w1` | `jlpt:w1:core:`   | `jlpt:w1:cache:`   | `jlpt-w1`     | `/srv/jlpt-workers/w1/data` |
| **W2** | API tài khoản, nội dung, thi     | `jlpt-w2`  | 3200     | 3201       | 4200     | `jlpt_w2` | `jlpt:w2:core:`   | `jlpt:w2:cache:`   | `jlpt-w2`     | `/srv/jlpt-workers/w2/data` |
| **W3** | Giao diện học viên               | `jlpt-w3`  | 3300     | 3301       | 4300     | `jlpt_w3` | `jlpt:w3:core:`   | `jlpt:w3:cache:`   | `jlpt-w3`     | `/srv/jlpt-workers/w3/data` |
| **W4** | Quản trị, báo cáo, thương mại    | `jlpt-w4`  | 3400     | 3401       | 4400     | `jlpt_w4` | `jlpt:w4:core:`   | `jlpt:w4:cache:`   | `jlpt-w4`     | `/srv/jlpt-workers/w4/data` |
| **W5** | Chuẩn nhập liệu & học thông minh | `jlpt-w5`  | 3500     | 3501       | 4500     | `jlpt_w5` | `jlpt:w5:core:`   | `jlpt:w5:cache:`   | `jlpt-w5`     | `/srv/jlpt-workers/w5/data` |
| **W6** | Hạ tầng CI & kiểm chứng          | `jlpt-w6`  | 3600     | 3601       | 4600     | `jlpt_w6` | `jlpt:w6:core:`   | `jlpt:w6:cache:`   | `jlpt-w6`     | `/srv/jlpt-workers/w6/data` |

## 2. Dịch vụ phát triển chung (chỉ bind 127.0.0.1)

- **PostgreSQL 17** (`127.0.0.1:5432`):
  - Tạo 6 database độc lập (`jlpt_w1` … `jlpt_w6`) và 6 user tương ứng.
  - Thu hồi quyền `CONNECT` từ `PUBLIC` để đảm bảo user `jlpt_w1` không thể truy cập DB `jlpt_w2`.
  - Kích hoạt extension `pg_bigm` trên `template1` và từng worker DB cho tìm kiếm tiếng Nhật (nếu dùng PostgreSQL image tùy chỉnh hoặc host packages, cần cài gói `postgresql-17-pg-bigm`; trên image chuẩn script sẽ bỏ qua an toàn nếu chưa có gói).
- **Redis Core** (`127.0.0.1:6379`):
  - `appendonly yes`, `maxmemory-policy noeviction` cho dữ liệu phiên, state, queue.
  - Phân tách key theo prefix `jlpt:w<N>:core:`.
- **Redis Cache** (`127.0.0.1:6380`):
  - `maxmemory 64mb`, `maxmemory-policy allkeys-lru` cho cache dữ liệu tạm.
  - Phân tách key theo prefix `jlpt:w<N>:cache:`.
- **Mailpit** (`127.0.0.1:1025` SMTP, `127.0.0.1:8025` Web UI):
  - Nhận và lưu email dev/test nội bộ, không gửi ra ngoài internet.
  - Định tuyến phân biệt theo tag `+w<N>`.

## 3. Khởi chạy và kiểm tra

Khởi chạy bằng Docker Compose (yêu cầu quyền quản trị viên máy chủ / trusted executor):

```bash
docker compose -f infra/dev/compose.dev.yml up -d
```

Kiểm tra trạng thái cấu hình và cách ly worker:

```bash
pnpm infra:dev:check
```

Sinh file `.env` mẫu cho từng worker:

```bash
node --experimental-strip-types infra/dev/generate-env.ts W1 --write
```
