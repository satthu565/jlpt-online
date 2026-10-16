# Quy trình và Bảng kiểm tra Phát hành JLPT Online (Release Checklist)

Tài liệu này quy định đầy đủ các bước chuẩn bị, kiểm chứng tự động, xác thực an toàn và vận hành triển khai bản phát hành cho nền tảng JLPT Online (SYS-08, SYS-09, SYS-11, SYS-15, ADM-20).

---

## 1. Nguyên tắc Cốt lõi của Bản phát hành

1. **Không build trên production server (SYS-15):** Tất cả các container images (`api`, `web`, `admin`, `postgres`) bắt buộc phải được build, kiểm thử và push lên GitHub Container Registry (GHCR) qua CI GitHub Actions. Máy chủ đích chỉ kéo image theo tag bất biến (`IMAGE_TAG` tương ứng `git commit SHA` hoặc semver `vX.Y.Z`).
2. **Bảo vệ kỳ thi thật đang diễn ra (Contract B2):** Script triển khai `infra/server/deploy.sh` tự động kiểm tra số lượng bài thi thật (`mode = 'real'`) đang ở trạng thái `in_progress`. Tuyệt đối cấm deploy khi có bài thi thật chưa kết thúc, trừ trường hợp khẩn cấp có cờ `--force`.
3. **Staging độc lập hoàn toàn với dữ liệu worker:** Quá trình staging và diễn tập phục hồi dữ liệu diễn ra trong môi trường cô lập (`jlpt_staging`, mạng `jlpt-staging-net`), không làm ảnh hưởng đến dữ liệu phát triển của các worker.
4. **Bảo mật Media Edge (SYS-11):** Mọi tài nguyên âm thanh và snapshot đề thi phải kiểm tra chữ ký token hợp lệ trước khi tra cứu cache edge. Hỗ trợ đầy đủ HTTP Range 206 để tua phát âm thanh.
5. **Khôi phục PITR được kiểm chứng (SYS-08 / ADM-20):** Bản phát hành chỉ được chấp thuận khi diễn tập khôi phục điểm thời gian (PITR) thành công với RTO ≤ 1 giờ (3600s) và RPO ≤ 5 phút (300s). Trong quá trình diễn tập, bắt buộc đặt `archive_mode = off` để bảo vệ kho WAL production.

---

## 2. Liên kết Runbook Vận hành Chi tiết

Người vận hành và kỹ sư trực phát hành bắt buộc tham chiếu các runbook kỹ thuật sau:

- **Triển khai và Rollback:** [Runbook Triển khai và Rollback Production](file:///srv/jlpt-workers/w1/repo/docs/runbooks/deployment.md) (`docs/runbooks/deployment.md`)
  - Chi tiết kịch bản triển khai không gián đoạn, cơ chế healthcheck vòng lặp 120s và tự động rollback.
- **Sao lưu và Khôi phục PITR:** [Runbook Sao lưu, Phục hồi PITR và Khắc phục sự cố](file:///srv/jlpt-workers/w1/repo/docs/runbooks/backup-restore.md) (`docs/runbooks/backup-restore.md`)
  - Kiến trúc 4 tầng sao lưu (WAL-G, Base backup, Host Snapshot, Secrets) và các bước diễn tập khôi phục an toàn.
- **Cấu hình Mạng & Tunnel Ingress:** [Runbook Cấu hình Cloudflare & Ingress](file:///srv/jlpt-workers/w1/repo/docs/runbooks/cloudflare-setup.md) (`docs/runbooks/cloudflare-setup.md`)
  - Cấu hình Cloudflare Tunnel, thứ tự luật định tuyến từ chối `/api/v1/admin` từ public và bảo mật SSH qua Access.
- **Mở rộng và Chuyển đổi Profile:** [Runbook Chuyển đổi Profile Tài nguyên](file:///srv/jlpt-workers/w1/repo/docs/runbooks/scaling-profiles.md) (`docs/runbooks/scaling-profiles.md`)
  - Quy trình chuyển đổi giữa profile `small` (4GB RAM) và `large` (8GB RAM) cho mùa thi.
- **Giám sát & Cảnh báo Sức khỏe:** [Runbook Giám sát Sức khỏe và Cảnh báo](file:///srv/jlpt-workers/w1/repo/docs/runbooks/monitoring-alerting.md) (`docs/runbooks/monitoring-alerting.md`)
  - Các ngưỡng tài nguyên cảnh báo (Disk > 85%, RAM > 90%) và endpoint sức khỏe của hệ thống.

---

## 3. Cổng Kiểm chứng Tự động Tiên quyết (Pre-flight Gates)

Trước khi tiến hành tạo thẻ release hoặc merge vào nhánh `main`, tất cả các lệnh sau phải chạy thành công trên không gian làm việc sạch:

```bash
# 1. Cài đặt chuẩn với lockfile đóng băng
pnpm install --frozen-lockfile

# 2. Kiểm tra chuẩn mã nguồn và quy tắc định dạng
pnpm lint
pnpm format --check

# 3. Kiểm tra kiểu tĩnh TypeScript trên toàn monorepo
pnpm typecheck

# 4. Kiểm thử toàn bộ đơn vị và tích hợp trong monorepo
pnpm test

# 5. Kiểm thử Edge Media Worker (SYS-11 / Signed token / Range 206)
pnpm test:media-edge

# 6. Kiểm chứng cổng hạ tầng (SYS-08, SYS-09, SYS-11, SYS-15, ADM-20)
pnpm infra:check

# 7. Kiểm chứng quá trình biên dịch các ứng dụng và thư viện
pnpm build
```

---

## 4. Bảng Kiểm tra Chi tiết (Operator Sign-off Matrix)

| Giai đoạn | Hạng mục kiểm tra | Tiêu chuẩn chấp thuận | Người thực hiện | Trạng thái |
|---|---|---|---|---|
| **Chuẩn bị** | GitHub Actions CI xanh | Toàn bộ các job `staging-verify` và `test` pass trên PR | Release Manager | [ ] |
| **Chuẩn bị** | Ghim thư viện trong lockfile | Không có dependency dùng bản `latest`, lockfile đóng băng | Release Manager | [ ] |
| **Chuẩn bị** | Hợp đồng nhập liệu (F06) | Không chứa thư viện OCR/PDF parser trong ứng dụng | QA / Reviewer | [ ] |
| **Đóng gói** | Build image trên CI | Container images được push lên GHCR với tag bất biến SHA | CI Automated | [ ] |
| **Đóng gói** | Kiểm tra Dockerfile dependencies | Đã build `@jlpt/schema` và `@jlpt/ui` trước app build | CI Automated | [ ] |
| **Staging** | Dựng profile small | Staging tạm dựng compose profile small từ image pre-built | CI Automated | [ ] |
| **Staging** | Healthcheck probes | `/api/v1/health`, Web `/healthz`, Admin `/healthz` trả HTTP 200 | CI Automated | [ ] |
| **Staging** | Diễn tập PITR | RTO ≤ 3600s, RPO ≤ 300s, `archive_mode = off` | CI Automated | [ ] |
| **Trước Deploy** | Kiểm tra bài thi thật | `ACTIVE_EXAMS == 0` trên database production | deploy.sh | [ ] |
| **Trước Deploy** | Ghi nhận phiên bản trước | Ghi nhận `IMAGE_TAG` cũ vào `/opt/jlpt/RELEASES` | deploy.sh | [ ] |
| **Triển khai** | Kéo image từ GHCR | `docker compose pull` thành công 100% | deploy.sh | [ ] |
| **Triển khai** | Migration schema database | Chạy lệnh migrate theo chuẩn expand-contract | deploy.sh | [ ] |
| **Triển khai** | Khởi động compose service | Khởi động 7 container với cấu hình bind 127.0.0.1 | deploy.sh | [ ] |
| **Sau Deploy** | Healthcheck vòng lặp (120s) | Các service đạt trạng thái healthy trong 120s | deploy.sh | [ ] |
| **Sau Deploy** | Dọn dẹp bản phát hành | Xóa image cũ, giữ lại 3 bản phát hành gần nhất | deploy.sh | [ ] |
| **Khẩn cấp** | Khả năng Rollback tức thì | Tự động hoặc thủ công rollback về tag cũ không gây gián đoạn | Operator | [ ] |

---

## 5. Kế hoạch Xử lý Sự cố & Rollback Khẩn cấp

Nếu trong hoặc sau khi deploy phát sinh sự cố nghiêm trọng (API không phản hồi, tỷ lệ lỗi 5xx tăng cao, phát hiện regression bảo mật):

1. **Kích hoạt Rollback về tag đã lưu:**
   ```bash
   cd /opt/jlpt
   ./rollback.sh
   ```
2. **Hoặc chỉ định tag ổn định trước đó với cờ khẩn cấp:**
   ```bash
   ./deploy.sh <tag-on-dinh-truoc> --force
   ```
3. **Quy tắc Rollback Database:**
   > [!WARNING]
   > Tuyệt đối không tự ý chạy down migration hoặc xóa bảng dữ liệu khi rollback. Theo nguyên tắc tương thích ngược (expand-contract), schema mới vẫn cho phép phiên bản ứng dụng cũ đọc ghi bình thường.
4. **Phục hồi Dữ liệu Thảm họa (Disaster Recovery):**
   Trong trường hợp hỏng hóc vật lý hoặc sự cố hỏng dữ liệu, thực hiện quy trình khôi phục PITR theo [docs/runbooks/backup-restore.md](file:///srv/jlpt-workers/w1/repo/docs/runbooks/backup-restore.md).
