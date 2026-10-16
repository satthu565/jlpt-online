# Quyết định Kỹ thuật C06: Khắc phục lỗi build image Docker Web/Admin do thiếu build Workspace Dependencies

- **Mã nhiệm vụ:** C06
- **Assignment ID:** C06-5
- **Worker phụ trách:** W6 (Hạ tầng CI và kiểm chứng)
- **Trạng thái:** ACCEPTED
- **Ngày:** 2026-10-16
- **Tính năng liên quan:** SYS-08, SYS-09, SYS-11, SYS-15, ADM-20

---

## 1. Bối cảnh và Nguyên nhân Gốc (Root Cause)

Trong workflow CI `Staging Compose Profile Small & PITR Drill` (`.github/workflows/staging.yml`), bước `Build staging container images once` thất bại khi thực hiện:
```bash
docker build -t jlpt/jlpt-web:${IMAGE_TAG} -f infra/docker/web.Dockerfile .
```
với thông báo lỗi:
```
Module not found: Can't resolve '@jlpt/exam-engine'
./apps/web/features/exam/hooks/use-countdown-timer.ts:4:1
Import map: aliased to relative '../../packages/exam-engine/dist/index.js' inside of [project]/apps/web
```

### Nguyên nhân:
1. Khi commit tính năng thi thực tế (`feat(C03)`) được merge, file `apps/web/features/exam/hooks/use-countdown-timer.ts` đã import `computeClientRemainingMs` từ `@jlpt/exam-engine`, và cấu hình `apps/web/next.config.mjs` Turbopack alias tới `../../packages/exam-engine/dist/index.js`.
2. Trong `infra/docker/web.Dockerfile`, lệnh build trước đó chỉ chạy:
   ```dockerfile
   RUN pnpm --filter @jlpt/schema build && pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web build
   ```
   Do đó, `@jlpt/exam-engine` không được build trước khi Next.js Turbopack khởi chạy, thư mục `packages/exam-engine/dist` không tồn tại trong container builder, dẫn đến lỗi Module Not Found.
3. Tương tự, nếu các gói khác trong `packages/*` (`@jlpt/content-tools`, `@jlpt/srs`, `@jlpt/api-client`, v.v.) được sử dụng trong tương lai, việc liệt kê thủ công từng package trong Dockerfile sẽ tiềm ẩn rủi ro gãy build lặp lại.
4. Thư mục `apps/web/public` và `apps/admin/public` không có trong source control, nếu không được tạo sẵn trong image builder sẽ gây lỗi `COPY --from=builder /app/apps/web/public ./apps/web/public` ở runner stage.

---

## 2. Giải pháp Thực hiện

### 2.1. Đồng bộ hóa build toàn bộ Workspace Packages trong Dockerfiles
Cập nhật lệnh build trong:
- `infra/docker/web.Dockerfile`:
  ```dockerfile
  RUN mkdir -p /app/apps/web/public
  RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
  RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/web build
  ```
- `infra/docker/admin.Dockerfile`:
  ```dockerfile
  RUN mkdir -p /app/apps/admin/public
  RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
  RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/admin build
  ```
- `infra/docker/api.Dockerfile`:
  ```dockerfile
  RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
  RUN pnpm --filter @jlpt/schema build && pnpm --filter "./packages/*" build && pnpm --filter @jlpt/api build
  ```

### 2.2. Bổ sung kiểm tra tự động vào Infrastructure Gate (`pnpm infra:check`)
Cập nhật `infra/check-infra.ts` để tự động xác nhận rằng tất cả Dockerfiles đều build đầy đủ workspace packages và tạo thư mục public phòng thủ trước khi đóng gói runner.

---

## 3. Kết quả Kiểm chứng

1. `pnpm infra:check`: PASS (29/29 checks).
2. `pnpm test:media-edge`: PASS (21/21 tests).
3. Test clean build mô phỏng container:
   - Xóa toàn bộ `packages/*/dist`.
   - Chạy `pnpm --filter "./packages/*" build && pnpm --filter @jlpt/web build`: THÀNH CÔNG 100% trong 2.6s mà không gặp bất kỳ lỗi thiếu module nào.
