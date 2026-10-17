# Runbook: Khắc phục Sự cố Khẩn cấp và Rollback Production (SYS-15 / R06)

> Tài liệu hướng dẫn quy trình rollback (hoàn nguyên phiên bản) hệ thống JLPT Online khi phát sinh sự cố trong hoặc sau khi triển khai bản phát hành mới.

---

## 1. Khi nào cần kích hoạt Rollback?

Quy trình Rollback được kích hoạt trong các tình huống sau:

1. **Thất bại trong khâu Healthcheck triển khai:** Script `deploy.sh` tự động kích hoạt rollback nếu một trong ba service (`api`, `web`, `admin`) không trả về HTTP 200 trong vòng 120 giây sau khi khởi động.
2. **Tỷ lệ lỗi 5xx tăng cao bất thường:** Sau khi deploy, hệ thống giám sát ghi nhận tỷ lệ lỗi HTTP 5xx vượt quá 0.5% trong 3 phút liên tiếp.
3. **Phát hiện hồi quy nghiêm trọng (P0/P1):**
   - Rò rỉ đáp án hoặc lời giải trước khi nộp bài thi thật.
   - Thất bại trong việc lưu câu trả lời hoặc khóa lease phiên thi (`409 LEASE_INVALID`).
   - Lỗi tính năng thanh toán hoặc xác thực người dùng.
4. **Nghẽn tài nguyên hoặc Database Lock:** Service tiêu thụ CPU/RAM vượt ngưỡng giới hạn (`cgroup OOM`) hoặc xuất hiện deadlock kéo dài trên PostgreSQL.

---

## 2. Cơ chế Rollback Tự động (Automated Rollback)

Script triển khai `/opt/jlpt/deploy.sh` được tích hợp sẵn vòng lặp kiểm tra sức khỏe tự động:
- Kiểm tra lặp lại mỗi 5 giây trong tối đa 120 giây:
  - `http://127.0.0.1:4000/api/v1/health`
  - `http://127.0.0.1:3000/healthz`
  - `http://127.0.0.1:3001/healthz`
- Nếu hết thời gian 120s mà các endpoint không đạt:
  1. Script ghi nhận trạng thái `FAILED` vào tệp lịch sử `/opt/jlpt/RELEASES`.
  2. Tự động đọc phiên bản ổn định trước đó (`PREVIOUS_TAG`) từ tệp môi trường `.env`.
  3. Kích hoạt lệnh hoàn nguyên: `./deploy.sh "${PREVIOUS_TAG}" --force`.

---

## 3. Quy trình Rollback Thủ công (Từng bước tái hiện được)

Khi người trực vận hành (Operator/On-call Engineer) quyết định rollback chủ động:

### Bước 1: Truy cập máy chủ qua Cloudflare Access SSH
```bash
ssh deploy@ssh.example.com
cd /opt/jlpt
```

### Bước 2: Kiểm tra lịch sử các bản phát hành
```bash
# Xem 5 bản phát hành gần nhất trong lịch sử
tail -n 10 /opt/jlpt/RELEASES

# Ví dụ kết quả:
# 2026-10-17T06:00:00Z | tag=v1.0.0-rc.0 | status=SUCCESS
# 2026-10-17T08:30:00Z | tag=v1.0.0-rc.1 | status=FAILED
```

### Bước 3: Thực thi lệnh Rollback
**Cách 1 - Tự động rollback về bản thành công gần nhất:**
```bash
./rollback.sh
```

**Cách 2 - Chỉ định trực tiếp tag ổn định cần quay về (Kèm cờ `--force` để bỏ qua kiểm tra bài thi):**
```bash
./deploy.sh v1.0.0-rc.0 --force
```

### Script thực hiện các tác vụ tuần tự:
1. Đọc tag đích và kéo image tương ứng từ GitHub Container Registry (`ghcr.io/jlpt/*`).
2. Khởi động lại các container với `IMAGE_TAG=<tag-on-dinh>` qua Docker Compose:
   ```bash
   IMAGE_TAG=v1.0.0-rc.0 docker compose -f compose.prod.yml up -d --remove-orphans
   ```
3. Chạy vòng lặp kiểm tra sức khỏe 120 giây trên các cổng nội bộ `127.0.0.1`.
4. Cập nhật lại `IMAGE_TAG` trong `/opt/jlpt/.env`.
5. Ghi nhật ký vào `/opt/jlpt/RELEASES`.

---

## 4. Nguyên tắc An toàn Dữ liệu Database (Expand-Contract)

> [!CAUTION]
> **Tuyệt đối KHÔNG chạy down-migration hoặc DROP COLUMN/TABLE bằng tay khi rollback.**

1. **Tính tương thích ngược (Backward Compatibility):**
   - Mọi migration trong dự án JLPT Online đều tuân theo mô hình **Expand → Contract**.
   - Khi release code mới kèm migration mới (thêm cột nullable, thêm index, thêm bảng mới), code phiên bản trước (N-1) vẫn đảm bảo truy vấn đọc/ghi bình thường trên schema mới.
   - Khi rollback container ứng dụng về phiên bản cũ, ứng dụng cũ vẫn hoạt động trơn tru với cơ sở dữ liệu đã migrate mà không cần hạ cấp (down-migrate) schema.
2. **Không gây mất mát dữ liệu:**
   - Việc chạy down-migration thủ công có nguy cơ xóa vĩnh viễn các dữ liệu phát sinh trong khoảng thời gian bản mới hoạt động. Giữ nguyên schema bảo đảm an toàn dữ liệu 100%.

---

## 5. Kiểm tra và Xác nhận Sau Rollback (Post-Rollback Verification)

Người vận hành chạy các lệnh kiểm tra sau để xác nhận hệ thống đã ổn định hoàn toàn:

```bash
# 1. Kiểm tra trạng thái toàn bộ 7 container
docker compose -f /opt/jlpt/compose.prod.yml ps

# Kỳ vọng: Tất cả các container (web, admin, api, worker, postgres, redis-core, redis-cache) đều ở trạng thái 'Up' hoặc 'healthy'.

# 2. Kiểm tra trực tiếp endpoint sức khỏe
curl -I -s http://127.0.0.1:4000/api/v1/health | grep "HTTP/1.1 200"
curl -I -s http://127.0.0.1:3000/healthz | grep "HTTP/1.1 200"
curl -I -s http://127.0.0.1:3001/healthz | grep "HTTP/1.1 200"

# 3. Kiểm tra nhật ký lỗi container gần nhất
docker compose -f /opt/jlpt/compose.prod.yml logs --tail=50 api
docker compose -f /opt/jlpt/compose.prod.yml logs --tail=50 web

# 4. Kiểm tra số lượng bài thi thật đang hoạt động
docker compose -f /opt/jlpt/compose.prod.yml exec -T postgres psql -U jlpt -d jlpt -c \
  "SELECT count(*) FROM exam_attempts WHERE mode = 'real' AND status = 'in_progress';"
```

---

## 6. Ghi chép Sự cố và Thông báo

Sau khi hoàn tất rollback:
1. Gửi thông báo tới kênh sự cố kỹ thuật (Incident Channel):
   - Phiên bản bị rollback.
   - Phiên bản hiện tại đang phục vụ.
   - Triệu chứng lỗi và thời gian gián đoạn (nếu có).
2. Lưu giữ log container của phiên bản lỗi để phục vụ phân tích nguyên nhân gốc rễ (RCA):
   ```bash
   docker compose -f /opt/jlpt/compose.prod.yml logs > /tmp/incident-$(date +%Y%m%d-%H%M).log
   ```
3. Tạo issue theo dõi khắc phục lỗi trước khi chuẩn bị bản phát hành tiếp theo.
