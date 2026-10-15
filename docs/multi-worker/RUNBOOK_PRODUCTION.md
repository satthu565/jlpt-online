# Vận hành triển khai và khôi phục production

Giữ quy trình cụ thể từ kế hoạch gốc dưới đây, áp dụng thêm quy tắc ở đầu file này. Đây là runbook mẫu phải được W6 diễn tập và cập nhật bằng version đã chọn và kết quả thật; chưa có server được tạo/deploy bởi việc viết tài liệu.

## Điều kiện bổ sung của phạm vi đầy đủ

1. Production tách VPS coding. Giới hạn4/8GB ở nguồn là điểm bắt đầu tham khảo, chưa được chứng minh đủ cho363 yêu cầu ứng dụng. Profile phải qua load test; không có dịch vụ tự đọc PDF; AI học tập không đặt cùng process thi.
2. Giá/gói/vùng và trình tự resize phải đối chiếu nhà cung cấp lúc thao tác; không tự mua/nâng gói. D1/D3 và quyền operator vẫn là gate.
3. Release immutable theo tag và digest; contract/migration compatibility, payment webhook idempotency, SRS/planner jobs và event-result embargo có release checks.
4. Người vận hành xác nhận payment live, email, OAuth, push, R2, AI học tập, dữ liệu nhập, ngân sách, legal content và data retention trước release. Chỉ bản sandbox không đủ LIVE_VERIFIED.
5. Backup phải bao phủ DB, object manifest/content versions, cấu hình và provider reconciliation metadata; secret backup trong password manager. Dữ liệu AI và analytics áp dụng retention riêng.
6. Demo/staging chứa synthetic/approved samples; tách bucket/prefix, payment webhook secret, domain cookie, Redis/queue và WALG prefix. Restore drill không ghi WAL vào backup production.
7. Tạm khóa scheduler học/thông báo/payment outbox khi restore drill để tránh gửi thật hoặc thu tiền lại. Khi phục hồi production, reconcile provider trước mở lại webhook consumers.
8. Một deploy lock và một migration lock; không deploy trong active real exam hoặc event window. Emergency override cần operator ghi lý do và kế hoạch xử lý bài thi.
9. Mục tiêu ngày 7 là candidate đủ phạm vi ứng dụng hiện hành;12 yêu cầu chuẩn bị dữ liệu được quản lý bên ngoài và không tính là code. Release công khai là quyết định riêng có checklist; beta14 ngày, ổn định payment30 ngày chưa thể được chứng minh trong 7 ngày.
10. Nhà cung cấp hosting chưa được chốt (điều kiện ngoài `hosting` trong QUYET_DINH_VA_DICH_VU.md). Các bước B1–B4 bên dưới giữ ví dụ Linode của kế hoạch gốc. Nếu chọn nhà cung cấp khác, W6 viết lại lớp snapshot máy ở B3 và quy trình nâng/hạ gói ở B4 theo tài liệu của nhà cung cấp đó, rồi diễn tập lại.

## Quy trình nền từ kế hoạch V1


### B1. Dựng server (`infra/server/bootstrap.sh`)

Script chạy được nhiều lần (idempotent), theo thứ tự:

1. `apt update && apt -y full-upgrade`; cài `unattended-upgrades`, `fail2ban`, `ca-certificates`, `curl`, `gnupg`, `jq`.
2. Tạo user `deploy` (có sudo, thuộc nhóm `docker`), chép SSH public key. File `/etc/ssh/sshd_config.d/99-hardening.conf`: `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`; khởi động lại sshd.
3. Swap 2 GB: `/swapfile` (quyền 600), thêm vào `/etc/fstab`; `vm.swappiness=10`.
4. Múi giờ hệ thống UTC; bật đồng bộ thời gian (`timedatectl` phải báo `System clock synchronized: yes`). **Đồng hồ thi dựa vào giờ server, nên đồng bộ thời gian là bắt buộc.**
5. Docker Engine + Compose plugin từ repo chính thức của Docker; `/etc/docker/daemon.json`: `{"log-driver":"json-file","log-opts":{"max-size":"20m","max-file":"5"},"live-restore":true}`.
6. Thư mục `/opt/jlpt/` (chủ sở hữu `deploy`): `compose.prod.yml`, `profiles/`, `.env` (quyền 600), `RELEASES`, các script.
7. `docker login ghcr.io` bằng token chỉ có quyền đọc package, token chỉ lưu trên server và trong trình quản lý mật khẩu.
8. Cài `cloudflared` và các systemd timer cho backup, kiểm tra hằng ngày (C06).

### B2. Deploy và rollback (`infra/server/deploy.sh <tag> [--force]`)

1. Kiểm tra tag tồn tại trên GHCR (`docker manifest inspect`).
2. Đếm bài thi thật đang mở (`docker compose exec -T api node dist/cli.js attempts:count-open --mode real`). Lớn hơn 0 và không có `--force` → dừng, in số lượng.
3. Ghi tag đang chạy vào `/opt/jlpt/RELEASES` để rollback.
4. `IMAGE_TAG=<tag> docker compose pull`.
5. Migration: `IMAGE_TAG=<tag> docker compose run --rm api node dist/cli.js db:migrate`. Vì migration theo kiểu expand → contract, code của bản cũ vẫn chạy được trên schema mới nếu phải rollback.
6. `IMAGE_TAG=<tag> docker compose up -d --remove-orphans`.
7. Chờ tối đa 120 giây cho mọi service `healthy`; gọi `curl -fsS http://127.0.0.1:4000/api/v1/health` và `http://127.0.0.1:3000/healthz`.
8. Lỗi → tự rollback: `IMAGE_TAG=<tag cũ> docker compose up -d`, thoát với mã 1.
9. Thành công → ghi `IMAGE_TAG=<tag>` vào `/opt/jlpt/.env`, cập nhật `RELEASES`, xóa image cũ (giữ 3 bản gần nhất).

Rollback thủ công: `deploy.sh <tag cũ> --force`. Không chạy migration ngược bằng tay. Bản nào có migration phá vỡ tương thích ngược thì không được phát hành. Không build image trên server.

### B3. Backup và khôi phục

| Lớp | Cách làm | Mục đích |
|---|---|---|
| 1 | `archive_command` của PostgreSQL đẩy WAL lên R2 bằng WAL-G; `archive_timeout = 300` | khôi phục về thời điểm bất kỳ, RPO ≤ 5 phút |
| 2 | base backup hằng ngày lúc 03:00 giờ Việt Nam (`docker compose exec -T postgres wal-g backup-push "$PGDATA"`); hằng tuần `wal-g delete retain FULL 7 --confirm` | điểm khởi đầu để khôi phục |
| 3 | Linode Backup (snapshot cả máy hằng ngày) | khôi phục nhanh toàn bộ server |
| 4 | bản sao `.env` trong trình quản lý mật khẩu | dựng lại server mới |

**Khôi phục** (diễn tập hằng tháng trên server tạm; dùng y hệt khi có sự cố thật):

1. Tạo một Linode tạm cùng vùng (tính theo giờ), chạy `bootstrap.sh`.
2. Chép `compose.prod.yml`, profile, `.env` (lấy từ trình quản lý mật khẩu).
3. **Khi diễn tập:** đặt `archive_mode = off` (hoặc dùng `WALG_S3_PREFIX` khác) trên server tạm để không ghi WAL lạ vào backup của production.
4. Tạo volume trống; chạy container postgres một lần với lệnh `wal-g backup-fetch "$PGDATA" LATEST`.
5. Tạo file `recovery.signal`; đặt `restore_command = 'wal-g wal-fetch %f %p'` (thêm `recovery_target_time` nếu cần khôi phục về một thời điểm cụ thể).
6. Khởi động postgres, chờ log `database system is ready to accept connections`; kiểm tra số dòng các bảng chính và thời điểm của bản ghi `attempt_events` mới nhất (đo RPO).
7. Chạy các service còn lại, kiểm tra health. Với sự cố thật: chuyển Tunnel sang server mới (cài `cloudflared` với credentials của tunnel cũ, hoặc tạo tunnel mới rồi đổi DNS).
8. Ghi thời gian từng bước (đo RTO) vào `docs/runbooks/restore-test-<ngày>.md`; xóa server tạm sau khi diễn tập.

### B4. Nâng/hạ gói theo mùa thi

JLPT ở Việt Nam thi vào đầu tháng 7 và đầu tháng 12. Lịch mặc định (chủ dự án điều chỉnh theo số liệu thật):

| Việc | Thời điểm |
|---|---|
| Nâng gói + chạy k6 cho kỳ tháng 7 | khoảng 01/06 |
| Hạ gói sau kỳ tháng 7 | khoảng 15/07 |
| Nâng gói + chạy k6 cho kỳ tháng 12 | khoảng 15/10 |
| Hạ gói sau kỳ tháng 12 | khoảng 15/12 |

**Nâng gói** (Shared 4 GB → Dedicated 8 GB G6):

1. Chọn giờ ít người dùng (01:00–04:00 giờ Việt Nam).
2. Xác nhận không có bài thi thật đang mở (lệnh đếm ở B2, bước 2).
3. Backup thủ công: `wal-g backup-push` + Linode Backup → "Take Snapshot".
4. Cloud Manager → Linode → **Resize** → chọn **Dedicated 8 GB thế hệ G6** (gói có giá theo tháng, không chọn G8) → **bỏ chọn "Auto Resize Disk"** → chọn **warm resize** → nhập label để xác nhận.
5. Khi máy chạy lại: `./switch-profile.sh large`.
6. Kiểm tra: health, `free -h`, `docker stats`, trang chủ, làm thử 1 bài.
7. Đêm hôm sau chạy k6 (như V06), ghi vào bảng sức chịu bên dưới.

**Hạ gói** (Dedicated 8 GB → Shared 4 GB):

1. Làm bước 1–3 như khi nâng gói.
2. **Trước khi resize:** `./switch-profile.sh small`, kiểm tra hệ thống chạy ổn với cấu hình RAM nhỏ.
3. Kiểm tra ổ đĩa: Cloud Manager → Storage → tổng dung lượng các disk ≤ 80 GB (81920 MB). Nếu lỡ mở rộng ổ trước đó: tắt máy, resize disk chính về 81920 trừ dung lượng swap disk (ví dụ 81920 − 512 = 81408 MB). Chỉ làm được khi dữ liệu đang dùng (`df -h`) nhỏ hơn mức đó; kiểm tra thêm `df -i`.
4. Resize → **Shared 4 GB** → warm resize (lỗi thì chuyển sang cold resize).
5. Kiểm tra như bước 6 của phần nâng gói.

**Lưu ý về tiền:** Linode tính theo giờ, có mức trần theo tháng; nâng rồi hạ trong cùng một tháng thì hóa đơn có nhiều dòng và tổng có thể vượt giá tháng của một gói; tắt máy vẫn bị tính tiền; giá Linode Backup thay đổi theo gói; giá có thể khác theo vùng, xem trong Cloud Manager trước khi chọn.

**Bảng sức chịu** (điền sau V06 và sau mỗi lần nâng gói):

| Gói | Profile | Số người thi cùng lúc tối đa (p95 lưu phiếu < 300 ms, lỗi < 0,1%) | Ngày đo |
|---|---|---|---|
| Shared 4 GB | small | chưa đo | |
| Dedicated 8 GB G6 | large | chưa đo | |

### B5. Sự cố thường gặp

| Triệu chứng | Kiểm tra | Xử lý |
|---|---|---|
| Không vào được trang | trạng thái Cloudflare; `systemctl status cloudflared`; `docker compose ps` | khởi động lại service lỗi; server không phản hồi → khôi phục theo B3 |
| API trả 503 | `/api/v1/health` cho biết DB hay Redis nào lỗi | `docker compose logs <service>`, khởi động lại |
| Đầy ổ đĩa | `df -h`; `docker system df` | xóa image cũ, log; kiểm tra WAL có bị tồn do archive lỗi không |
| Archive WAL lỗi | log PostgreSQL có `archive command failed` | kiểm tra key R2 và mạng; WAL tồn sẽ làm đầy ổ, phải xử lý trong ngày |
| Không tải được đề/audio | lỗi trả về từ `media.example.com`; `wrangler tail` | secret của Worker phải khớp `MEDIA_TOKEN_SECRET`; manifest có trên R2 |
| Hết RAM | `dmesg \| grep -i oom`; `docker stats` | kiểm tra đúng profile; nâng gói nếu đang mùa thi |
| Đồng hồ server lệch | `timedatectl` | bật lại đồng bộ thời gian ngay |

---
