# infra: hướng dẫn cho agent

Docker, compose, máy chủ, backup. Đọc `AGENTS.md` ở gốc repo và [docs/agents/OPERATIONS.md](../docs/agents/OPERATIONS.md) trước.

## Cấu trúc

```
docker/          api.Dockerfile, web.Dockerfile, admin.Dockerfile, entrypoint.js
compose/         compose.dev.yml, compose.staging.yml, compose.prod.yml, compose.demo.yml, Caddyfile
                 profiles/small.env, large.env (quy mô tài nguyên)
dev/             dịch vụ dev cho 6 worker (Postgres, Redis tách theo worker), check.ts
server/          bootstrap.sh, deploy.sh, rollback.sh, health-check.sh, switch-profile.sh
backup/          backup.sh, restore.sh, drill-pitr.ts (diễn tập khôi phục)
postgres/        image Postgres riêng
cloudflared/     tunnel Cloudflare (chờ cấu hình)
check-infra.ts   kiểm tra cấu hình infra (pnpm infra:check)
features-verify.ts  đối chiếu tính năng với bằng chứng (pnpm features:verify)
```

## Lưu ý

- CI staging dựng `compose.staging.yml` rồi chạy E2E. Đổi compose thì phải chạy CI GitHub, vì lệnh `jlpt-stage-test` trên máy ảo dùng compose của `main`.
- Thêm biến `NEXT_PUBLIC_*` cho web thì phải khai báo `ARG` trong `web.Dockerfile`, vì Next gắn giá trị vào lúc build.
- Không ghi secret vào compose hay Dockerfile. Dùng biến môi trường và file `.env` không commit.
- Hosting production chưa chọn. Không tự cấu hình DNS, Cloudflare hay dịch vụ trả phí.
- Hướng dẫn chi tiết: `docs/runbooks/` (deployment, backup-restore, rollback, monitoring).

## Lệnh

```bash
pnpm infra:check
pnpm infra:dev:check
pnpm features:verify
```
