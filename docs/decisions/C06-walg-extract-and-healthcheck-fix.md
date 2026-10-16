# Quyết định Kỹ thuật C06: Khắc phục lỗi giải nén WAL-G trong Postgres Dockerfile và bổ sung curl cho Healthcheck Containers

- **Mã nhiệm vụ:** C06
- **Assignment ID:** C06-13
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20

---

## 1. Bối cảnh và Nguyên nhân Gốc (Root Cause)

Trong workflow CI `Staging Compose Profile Small & PITR Drill` (`.github/workflows/staging.yml`), bước `Build staging container images once` thất bại tại stage build Postgres Dockerfile:
```
#9 [4/7] RUN curl -L -o wal-g.tar.gz "https://github.com/wal-g/wal-g/releases/download/v3.0.3/wal-g-pg-ubuntu-20.04-amd64.tar.gz"   && tar -xzf wal-g.tar.gz -C /usr/local/bin   && chmod +x /usr/local/bin/wal-g   && rm -f wal-g.tar.gz
chmod: cannot access '/usr/local/bin/wal-g': No such file or directory
ERROR: process ... did not complete successfully: exit code: 1
```

### Phân tích nguyên nhân:
1. Gói nén chính thức của WAL-G (`wal-g-pg-ubuntu-20.04-amd64.tar.gz`) chứa một file nhị phân duy nhất mang tên `wal-g-pg-ubuntu-20.04-amd64`, chứ không mang tên `wal-g`. Khi chạy `tar -xzf wal-g.tar.gz -C /usr/local/bin`, file được giải nén ra là `/usr/local/bin/wal-g-pg-ubuntu-20.04-amd64`. Do đó, lệnh `chmod +x /usr/local/bin/wal-g` báo lỗi không tìm thấy file.
2. Các container runner (`web.Dockerfile`, `admin.Dockerfile`, `api.Dockerfile`) sử dụng base image `node:24-alpine`, vốn không cài sẵn công cụ `curl` theo mặc định. Trong khi đó, định nghĩa healthcheck trong `compose.staging.yml` và `compose.prod.yml` gọi `curl -fsS http://...`. Nếu container không có sẵn `curl`, healthcheck có thể thất bại.
3. Trong `.github/workflows/staging.yml`, lệnh build image trước đó chỉ gắn tag `jlpt/<app>:${IMAGE_TAG}`, trong khi `compose.staging.yml` thiết lập `IMAGE_REGISTRY: docker.io`, cần gắn thêm tag `docker.io/jlpt/<app>:${IMAGE_TAG}` để đảm bảo Docker Compose nhận diện ngay lập tức cache image cục bộ mà không thử pull từ Docker Hub.

---

## 2. Giải pháp Thực hiện

### 2.1. Chuẩn hóa giải nén và đổi tên WAL-G trong `infra/postgres/Dockerfile`
Cập nhật layer cài đặt WAL-G:
```dockerfile
ARG WALG_VERSION=v3.0.3
ARG WALG_ARCH=ubuntu-20.04-amd64
RUN curl -L -o wal-g.tar.gz "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-${WALG_ARCH}.tar.gz" \
  && tar -xzf wal-g.tar.gz \
  && mv wal-g-pg-* /usr/local/bin/wal-g \
  && chmod +x /usr/local/bin/wal-g \
  && /usr/local/bin/wal-g --version \
  && rm -f wal-g.tar.gz
```
Lệnh `/usr/local/bin/wal-g --version` được thêm trực tiếp vào layer build để xác thực nhị phân có thể thực thi ngay trong container.

### 2.2. Bổ sung `curl` cho các runner container
Cập nhật `web.Dockerfile`, `admin.Dockerfile`, và `api.Dockerfile` để cài đặt `apk add --no-cache curl` trong runner stage, đồng thời đồng bộ hóa directive `HEALTHCHECK` trong Dockerfile sang `curl -fsS`.

### 2.3. Bổ sung multi-tagging và log diagnostic cho workflow Staging
- Trong `.github/workflows/staging.yml`, bổ sung tag `docker.io/jlpt/<app>:${IMAGE_TAG}` song song với `jlpt/<app>:${IMAGE_TAG}`.
- Bổ sung lệnh dump log tự động (`docker compose -f infra/compose/compose.staging.yml logs`) nếu probe kiểm tra sức khỏe quá thời gian chờ (150s).

### 2.4. Cập nhật Infrastructure Gate & Integration Tests
- Cập nhật `infra/check-infra.ts` để kiểm tra bắt buộc `mv wal-g-pg-* /usr/local/bin/wal-g` và sự hiện diện của `curl` trong các runner Dockerfile.
- Cập nhật `tests/integration/staging-profile.test.ts` để kiểm tra cú pháp đổi tên binary WAL-G.

---

## 3. Kết quả Kiểm chứng

1. `pnpm test:media-edge`: PASS (21/21 tests, SYS-11, Range 206, signed check before cache).
2. `pnpm infra:check`: PASS (29/29 checks, bao gồm WAL-G rename, Dockerfiles curl, compose isolation, A12, A13, và PITR drill).
3. `pnpm exec vitest run tests/integration`: PASS (6 test suites, 30/30 tests).
4. Thử nghiệm trích xuất binary cục bộ: `wal-g version v3.0.3` chạy trơn tru và trả về mã thoát 0.
