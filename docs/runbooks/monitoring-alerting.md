# Runbook: Giám sát, Cảnh báo và Xử lý sự cố (SYS-09 & B5)

## 1. Hệ thống Giám sát và Cảnh báo
Hệ thống sử dụng mô hình giám sát 3 lớp:
1. **Application Error Monitoring (Sentry):** Tích hợp trên Web, Admin và API; gắn tag release (`IMAGE_TAG`).
2. **Uptime & Healthcheck:** Probe định kỳ 1–5 phút:
   - Public API: `https://example.com/api/v1/health`
   - Public Web: `https://example.com/healthz`
   - Admin Portal: `https://admin.example.com/healthz`
3. **Daily System Healthcheck (`infra/server/health-check.sh`):** Systemd timer chạy hằng ngày kiểm tra:
   - Dung lượng ổ đĩa: Cảnh báo nếu > 80% (nguy cơ đầy ổ đĩa do WAL hoặc log).
   - Độ mới của bản sao lưu: Cảnh báo nếu bản backup mới nhất cũ hơn 26 giờ.
   - Trạng thái container và các endpoint ứng dụng.

## 2. Lệnh kiểm tra thủ công
```bash
/opt/jlpt/health-check.sh
```

## 3. Ma trận Xử lý Sự cố thường gặp (B5)
| Triệu chứng | Kiểm tra | Biện pháp xử lý |
|---|---|---|
| **Không vào được trang** | `systemctl status cloudflared`, `docker compose ps` | Khởi động lại `cloudflared` hoặc container lỗi. Nếu server không phản hồi, dựng server tạm và phục hồi theo runbook backup-restore. |
| **API trả 503 Service Unavailable** | Gọi `/api/v1/health` để xem thành phần nào lỗi (Postgres, Redis Core hay Redis Cache) | `docker compose logs <service>`, khởi động lại container bị sự cố. |
| **Đầy ổ đĩa (> 80%)** | `df -h`, `docker system df` | Dọn dẹp docker cache: `docker system prune -af`. Kiểm tra WAL tồn đọng do lỗi archive lên R2. |
| **Lỗi Archive WAL lên R2** | Log postgres có dòng `archive command failed` | Kiểm tra kết nối mạng và API token Cloudflare R2. Khắc phục ngay trong ngày để tránh WAL làm tràn ổ cứng. |
| **Không tải được audio/hình ảnh** | Lỗi trả về từ `media.example.com` (403 / 404 / 500) | Kiểm tra `MEDIA_TOKEN_SECRET` trên Worker phải khớp với API. Kiểm tra object có tồn tại trên R2. |
| **Hết RAM (OOM Kill)** | `dmesg \| grep -i oom`, `docker stats` | Kiểm tra profile hiện tại (`small` hay `large`). Chuyển lên profile `large` nếu đang trong mùa cao điểm. |
| **Đồng hồ server lệch** | `timedatectl` | Bật lại đồng bộ thời gian ngay lập tức (`timedatectl set-ntp true`) vì đồng hồ server là căn cứ tính giờ thi. |
