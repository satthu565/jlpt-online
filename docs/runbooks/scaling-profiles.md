# Runbook: Nâng và Hạ gói cấu hình theo mùa thi (Contract A12 & B4)

## 1. Lịch định kỳ theo mùa thi JLPT
Kỳ thi JLPT tại Việt Nam diễn ra vào **đầu tháng 7** và **đầu tháng 12**.

| Giai đoạn | Thời điểm thực hiện | Cấu hình | Mục đích |
|---|---|---|---|
| Nâng gói kỳ tháng 7 | ~ 01/06 | **large** (Dedicated 8 GB G6) | Chuẩn bị tải cao, thi thử tập trung và thi chính thức |
| Hạ gói sau kỳ tháng 7 | ~ 15/07 | **small** (Shared 4 GB) | Tiết kiệm chi phí vận hành ngoài mùa cao điểm |
| Nâng gói kỳ tháng 12 | ~ 15/10 | **large** (Dedicated 8 GB G6) | Mùa cao điểm cuối năm |
| Hạ gói sau kỳ tháng 12 | ~ 15/12 | **small** (Shared 4 GB) | Hạ về mức vận hành cơ bản |

## 2. Thông số kỹ thuật của hai Profile
| Thành phần | Profile `small` (4 GB) | Profile `large` (8 GB Dedicated) |
|---|---|---|
| `web` (Next.js) | `mem_limit: 448m`, `--max-old-space-size=320` | `mem_limit: 1024m`, `--max-old-space-size=768` |
| `admin` (Next.js) | `mem_limit: 320m`, `--max-old-space-size=256` | `mem_limit: 512m`, `--max-old-space-size=384` |
| `api` (NestJS/Fastify) | `mem_limit: 512m`, `API_WORKERS=1` | `mem_limit: 1280m`, `API_WORKERS=3` |
| `worker` (Background) | `mem_limit: 320m`, `--max-old-space-size=256` | `mem_limit: 512m`, `--max-old-space-size=384` |
| `postgres` | `mem_limit: 1024m`, `shared_buffers: 256MB` | `mem_limit: 2560m`, `shared_buffers: 768MB` |
| `redis-core` | `mem_limit: 160m`, `maxmemory: 128mb` | `mem_limit: 320m`, `maxmemory: 256mb` |
| `redis-cache` | `mem_limit: 96m`, `maxmemory: 64mb` | `mem_limit: 320m`, `maxmemory: 256mb` |

## 3. Trình tự nâng gói (small → large)
1. Thực hiện vào khung giờ thấp điểm (01:00 – 04:00 giờ Việt Nam).
2. Kiểm tra không có bài thi thật nào đang mở.
3. Tạo backup thủ công:
   ```bash
   docker compose -f compose.prod.yml exec -T postgres wal-g backup-push "$PGDATA"
   ```
4. Trên Linode Cloud Manager: Chọn máy chủ → **Resize** → **Dedicated 8 GB G6** → **BỎ CHỌN Auto Resize Disk** → chọn **warm resize**.
5. Sau khi server hoàn tất resize và khởi động lại:
   ```bash
   cd /opt/jlpt
   ./switch-profile.sh large
   ```
6. Kiểm tra lại tài nguyên và dịch vụ: `free -h`, `docker stats`, truy cập trang chủ và làm thử bài kiểm tra.

## 4. Trình tự hạ gói (large → small)
1. Sao lưu hệ thống trước khi thao tác.
2. **Trước khi resize server:** Chuyển profile ứng dụng về small:
   ```bash
   cd /opt/jlpt
   ./switch-profile.sh small
   ```
3. Kiểm tra tổng dung lượng ổ đĩa: Tổng dung lượng disk phải ≤ 80 GB (81920 MB) trước khi hạ gói về Shared 4 GB.
4. Trên Linode Cloud Manager: **Resize** → **Shared 4 GB** → warm resize.
5. Kiểm tra health và độ ổn định sau khi máy khởi động lại.
