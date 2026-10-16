# Runbook: Sao lưu, Phục hồi PITR và Khắc phục sự cố dữ liệu (SYS-08 & ADM-20)

## 1. Kiến trúc 4 tầng sao lưu
| Tầng | Cơ chế | Chu kỳ | Mục đích |
|---|---|---|---|
| **1** | WAL-G continuous archiving (`archive_command`) | Đẩy WAL lên R2 mỗi khi đủ đoạn hoặc sau `archive_timeout = 300s` | Phục hồi về điểm bất kỳ (PITR), **RPO ≤ 5 phút** |
| **2** | Base backup định kỳ | Hằng ngày lúc 03:00 (giờ VN / 20:00 UTC); giữ 7 bản full | Điểm khởi đầu để áp dụng WAL phục hồi |
| **3** | Host Snapshot | Hằng ngày bởi hạ tầng hosting (Linode Backup) | Phục hồi nhanh toàn bộ máy chủ |
| **4** | Cấu hình & Secrets | Lưu trữ ngoài trong trình quản lý mật khẩu an toàn | Dựng lại server mới hoàn toàn khi có thảm họa |

## 2. Lệnh sao lưu thủ công
Tạo base backup ngay lập tức:
```bash
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres wal-g backup-push "$PGDATA"
```

Kiểm tra danh sách bản backup trên bucket R2:
```bash
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres wal-g backup-list
```

## 3. Quy trình Diễn tập Khôi phục (PITR Drill)
Diễn tập khôi phục được thực hiện hằng tháng trên môi trường staging hoặc CI để kiểm chứng RPO và RTO.

> [!CRITICAL]
> **Quy tắc cách ly an toàn (B3.3):**
> Khi diễn tập khôi phục trên server staging/tạm, bắt buộc phải đặt `archive_mode = off` (hoặc dùng bucket prefix staging riêng). Tuyệt đối không để server diễn tập đẩy WAL lạ vào kho lưu trữ backup của production.

### Các bước thực hiện:
1. Dựng server hoặc container staging độc lập:
   ```bash
   IMAGE_TAG=<tag> docker compose -f infra/compose/compose.staging.yml up -d
   ```
2. Tải bản base backup mới nhất:
   ```bash
   wal-g backup-fetch "$PGDATA" LATEST
   ```
3. Thiết lập tín hiệu và lệnh phục hồi WAL:
   ```bash
   touch "$PGDATA/recovery.signal"
   echo "restore_command = 'wal-g wal-fetch %f %p'" >> "$PGDATA/postgresql.auto.conf"
   echo "archive_mode = off" >> "$PGDATA/postgresql.auto.conf"
   ```
   Nếu muốn phục hồi về mốc thời gian cụ thể:
   ```bash
   echo "recovery_target_time = '2026-10-16 03:30:00+00'" >> "$PGDATA/postgresql.auto.conf"
   ```
4. Khởi động PostgreSQL, theo dõi log cho đến khi:
   `database system is ready to accept connections`
5. Kiểm tra tính toàn vẹn:
   - Truy vấn bản ghi `attempt_events` mới nhất.
   - Đo **RPO** = khoảng cách thời gian giữa sự kiện mong muốn và sự kiện mới nhất phục hồi được (**Mục tiêu: ≤ 300s**).
   - Đo **RTO** = tổng thời gian từ lúc bắt đầu khôi phục đến khi DB nhận kết nối (**Mục tiêu: ≤ 3600s / 1 giờ**).
6. Ghi biên bản nghiệm thu vào `docs/runbooks/restore-test-<ngày>.md`.
