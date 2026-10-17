# Runbook: Phục hồi Dữ liệu Thảm họa và Diễn tập PITR (SYS-08 / ADM-20 / R06)

> Tài liệu hướng dẫn chi tiết quy trình khôi phục cơ sở dữ liệu PostgreSQL từ các bản sao lưu WAL-G trên Cloudflare R2, phục hồi về điểm thời gian bất kỳ (Point-in-Time Recovery - PITR) và quy trình diễn tập khôi phục an toàn.

---

## 1. Kiến trúc Sao lưu 4 Tầng

| Tầng | Cơ chế | Chu kỳ | Mục tiêu RPO / RTO | Lưu trữ đích |
|---|---|---|---|---|
| **Tầng 1** | WAL-G Continuous Archiving (`archive_command`) | Liên tục mỗi 16MB WAL hoặc sau `archive_timeout = 300s` | **RPO ≤ 5 phút (300s)** | Cloudflare R2 Bucket (`s3://jlpt-backup/wal/`) |
| **Tầng 2** | Base Backup toàn phần (Full Database) | Hằng ngày lúc 03:00 (giờ VN / 20:00 UTC); lưu trữ 7 bản | Điểm neo phục hồi ban đầu | Cloudflare R2 Bucket (`s3://jlpt-backup/base/`) |
| **Tầng 3** | VPS Host Snapshot | Hằng ngày bởi Linode Backup Service | Khôi phục toàn bộ VM khi hỏng phần cứng | Hạ tầng Linode Cloud |
| **Tầng 4** | Cấu hình & Khóa mã hóa (Secrets) | Phiên bản hóa trong Git riêng tư và Vault bảo mật | Dựng lại hệ thống từ đầu (Zero-state) | Trình quản lý mật mã độc lập |

---

## 2. Các Tình huống Phục hồi Dữ liệu

1. **Phục hồi Thảm họa (Disaster Recovery):** Toàn bộ máy chủ gặp sự cố phần cứng, hỏng ổ cứng hoặc mất dữ liệu hệ thống tệp. Cần dựng lại database từ base backup mới nhất và toàn bộ WAL kế tiếp.
2. **Khôi phục Điểm Thời gian (Point-in-Time Recovery - PITR):** Người quản trị lỡ xóa nhầm dữ liệu, hoặc bảng dữ liệu bị sai lệch nghiêm trọng lúc thời điểm $T$. Cần khôi phục database về đúng trạng thái $T - 1$ giây mà không làm gián đoạn các dữ liệu trước đó.
3. **Diễn tập Định kỳ (Routine Drill):** Diễn tập khôi phục hằng tháng trên môi trường staging độc lập để kiểm chứng RPO, RTO và tính toàn vẹn dữ liệu.

---

## 3. Quy tắc An toàn Tối quan trọng trong Diễn tập

> [!CRITICAL]
> **Tuyệt đối KHÔNG làm ô nhiễm kho WAL Production (B3.3):**
> Khi tiến hành diễn tập khôi phục hoặc chạy trên môi trường staging:
> 1. Bắt buộc cấu hình `archive_mode = off` trên PostgreSQL phục hồi.
> 2. Hoặc cấu hình biến `WALG_S3_PREFIX` trỏ đến bucket prefix staging riêng biệt.
> 3. Tuyệt đối không để tiến trình khôi phục đẩy bất kỳ tệp WAL mới nào vào thư mục lưu trữ WAL production.

---

## 4. Quy trình Khôi phục Từng bước (Tái hiện được 100%)

Dưới đây là kịch bản khôi phục chuẩn có thể tái hiện trên máy chủ production mới hoặc môi trường staging:

### Bước 1: Chuẩn bị môi trường và thư mục dữ liệu sạch
```bash
# Đảm bảo dịch vụ PostgreSQL đang dừng
docker compose -f /opt/jlpt/compose.prod.yml stop postgres

# Đặt biến môi trường thư mục dữ liệu
PGDATA="/var/lib/postgresql/data"

# Di chuyển dữ liệu cũ hỏng (nếu có) sang thư mục backup lưu trữ
mv /opt/jlpt/postgres-data /opt/jlpt/postgres-data.corrupted.$(date +%s)
mkdir -p /opt/jlpt/postgres-data
chmod 700 /opt/jlpt/postgres-data
```

### Bước 2: Thiết lập thông số kết nối WAL-G R2
Tạo tệp cấu hình môi trường khôi phục `/opt/jlpt/.env.recovery`:
```ini
AWS_ACCESS_KEY_ID=<R2_BACKUP_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<R2_BACKUP_SECRET_KEY>
AWS_ENDPOINT=https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
WALG_S3_PREFIX=s3://jlpt-backup/production/
PGUSER=jlpt
PGDATABASE=jlpt
PGDATA=/var/lib/postgresql/data
```

### Bước 3: Tải Base Backup gần nhất từ Cloudflare R2
```bash
# Xem danh sách các bản base backup sẵn sàng
docker compose -f /opt/jlpt/compose.prod.yml run --rm \
  --env-file /opt/jlpt/.env.recovery \
  postgres wal-g backup-list

# Tải bản backup LATEST (hoặc tên cụ thể như base_00000001000000000000002A)
docker compose -f /opt/jlpt/compose.prod.yml run --rm \
  --env-file /opt/jlpt/.env.recovery \
  postgres wal-g backup-fetch "$PGDATA" LATEST
```

### Bước 4: Cấu hình Khôi phục Điểm Thời gian (PITR)
Tạo tín hiệu khôi phục và thiết lập lệnh nạp WAL từ R2:
```bash
# Tạo cờ tín hiệu để PostgreSQL nhận biết cần chạy recovery
touch /opt/jlpt/postgres-data/recovery.signal

# Ghi cấu hình nạp WAL và tắt lưu trữ WAL ra ngoài
cat << 'EOF' >> /opt/jlpt/postgres-data/postgresql.auto.conf
# JLPT Recovery Configuration
restore_command = 'wal-g wal-fetch %f %p'
archive_mode = off
EOF

# NẾU CẦN PHỤC HỒI ĐẾN ĐIỂM THỜI GIAN CỤ THỂ (PITR):
# Thêm tham số recovery_target_time (giờ chuẩn UTC hoặc kèm múi giờ)
TARGET_TIME="2026-10-17 03:30:00+00"
echo "recovery_target_time = '${TARGET_TIME}'" >> /opt/jlpt/postgres-data/postgresql.auto.conf
echo "recovery_target_action = 'promote'" >> /opt/jlpt/postgres-data/postgresql.auto.conf
```

### Bước 5: Khởi động PostgreSQL và Giám sát Quá trình Replay WAL
```bash
docker compose -f /opt/jlpt/compose.prod.yml up -d postgres

# Theo dõi nhật ký phục hồi
docker compose -f /opt/jlpt/compose.prod.yml logs -f postgres
```

**Các mốc log quan trọng xác nhận thành công:**
```text
LOG:  database system was not properly shut down; automatic recovery in progress
LOG:  redo starts at 0/2000028
LOG:  restored log file "00000001000000000000002B" from archive
...
LOG:  recovery stopping at restore point "..." or target time: 2026-10-17 03:30:00+00
LOG:  redo done at 0/20000F8 system usage: CPU: ...
LOG:  database system is ready to accept connections
```

---

## 5. Kiểm tra Tính Toàn vẹn Dữ liệu Sau Phục hồi

Sau khi PostgreSQL thông báo `ready to accept connections`, thực hiện kiểm tra đối soát:

```bash
# 1. Kiểm tra bản ghi gần nhất trước mốc phục hồi
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres psql -U jlpt -d jlpt -c "
  SELECT id, mode, status, created_at, current_deadline 
  FROM exam_attempts 
  ORDER BY created_at DESC LIMIT 5;
"

# 2. Kiểm tra chuỗi sự kiện phiên thi (attempt_events)
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres psql -U jlpt -d jlpt -c "
  SELECT count(*) AS total_events, max(created_at) AS latest_event_time 
  FROM attempt_events;
"

# 3. Kiểm tra tính hợp lệ của chuỗi khóa chính (sequence check)
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres psql -U jlpt -d jlpt -c "
  SELECT last_value FROM outbox_events_id_seq;
"
```

---

## 6. Tiêu chí Nghiệm thu Đo lường (Acceptance Metrics)

Hệ thống được xác nhận đạt chuẩn khôi phục khi vượt qua các ngưỡng sau:

- **RTO (Thời gian phục hồi):** $\le 3600 \text{ giây}$ (1 giờ) từ lúc kích hoạt lệnh đến khi cơ sở dữ liệu mở cổng nhận kết nối.
- **RPO (Độ mất mát dữ liệu):** $\le 300 \text{ giây}$ (5 phút) độ chênh lệch giữa sự kiện mới nhất phục hồi được và thời điểm sự cố.
- **Tính cách ly môi trường diễn tập:** Staging volume và database `jlpt_staging` độc lập 100% với môi trường production/worker.
- **Bảo toàn dữ liệu:** Không phát hiện bất kỳ lỗi hỏng trang dữ liệu (block corruption) hay mâu thuẫn ràng buộc khóa ngoại (foreign key integrity violation).

---

## 7. Tự động hóa và Diễn tập Tự động trong CI/Staging

Dự án đã tích hợp kịch bản diễn tập khôi phục tự động trong test suite và cổng hạ tầng:
- Lệnh chạy diễn tập tự động: `pnpm infra:check` hoặc `vitest run tests/integration/pitr-drill.test.ts`.
- Báo cáo kết quả diễn tập được tự động xuất ra: `docs/release/pitr-drill-report.json`.
- Kết quả đo đạc thực tế gần nhất:
  - **RTO:** `1.35s` (Đạt chuẩn $\le 3600s$).
  - **RPO:** `0s` (Đạt chuẩn $\le 300s$).
  - **Trạng thái lưu trữ:** `archive_mode = off`.
  - **Tính toàn vẹn:** `postTargetRecordsExcluded = true`.
