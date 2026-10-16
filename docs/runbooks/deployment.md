# Runbook: Triển khai và Rollback Production (SYS-15)

## 1. Nguyên tắc cốt lõi
1. **Không build trên server:** Mọi image (`jlpt-web`, `jlpt-admin`, `jlpt-api`, `jlpt-postgres`) đều được build và push lên GHCR qua CI GitHub Actions. Server production chỉ kéo image theo tag bất biến (`IMAGE_TAG`).
2. **Bảo vệ kỳ thi thật:** Tuyệt đối không deploy khi có bài thi thật (`real`) đang mở, trừ trường hợp khẩn cấp có cờ `--force`.
3. **Migration tương thích ngược:** Sử dụng mô hình expand → contract; code cũ vẫn chạy được trên schema mới nếu phải rollback.
4. **Tự động rollback:** Nếu sau khi deploy các service không đạt trạng thái `healthy` trong vòng 120 giây, hệ thống tự động quay về tag trước đó.

## 2. Quy trình Deploy tiêu chuẩn
Người vận hành chạy trên server qua user `deploy`:
```bash
cd /opt/jlpt
./deploy.sh <tag>
```

### Các bước script tự động thực hiện:
1. Kiểm tra bài thi thật đang mở:
   - Đếm bài thi qua API nội bộ.
   - Nếu > 0 và không có `--force`, hủy bỏ deploy và thông báo số lượng bài thi đang thi.
2. Ghi nhận `IMAGE_TAG` hiện tại vào `/opt/jlpt/RELEASES` để phục vụ rollback.
3. Kéo image mới từ GHCR:
   ```bash
   IMAGE_TAG=<tag> docker compose -f compose.prod.yml pull
   ```
4. Chạy migration schema:
   ```bash
   IMAGE_TAG=<tag> docker compose -f compose.prod.yml run --rm api node dist/cli.js db:migrate
   ```
5. Khởi động các container mới:
   ```bash
   IMAGE_TAG=<tag> docker compose -f compose.prod.yml up -d --remove-orphans
   ```
6. Vòng lặp healthcheck (tối đa 120s):
   - Kiểm tra `http://127.0.0.1:4000/api/v1/health`
   - Kiểm tra `http://127.0.0.1:3000/healthz`
   - Kiểm tra `http://127.0.0.1:3001/healthz`
7. Nếu healthcheck thất bại: Tự động gọi rollback về tag cũ.
8. Nếu thành công: Cập nhật `IMAGE_TAG` trong `.env` và dọn dẹp image cũ (giữ lại 3 bản gần nhất).

## 3. Quy trình Rollback thủ công
Nếu cần khẩn cấp rollback về phiên bản trước:
```bash
cd /opt/jlpt
./rollback.sh [target-tag]
```
Hoặc chỉ định rõ tag:
```bash
./deploy.sh <tag_cũ> --force
```

> [!WARNING]
> Không chạy migration ngược (down migration) bằng tay khi rollback. Schema mới đã được thiết kế theo expand-contract để code cũ tương thích.
