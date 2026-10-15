# Runbook: Môi trường phát triển cục bộ (Dev Environment)

## Yêu cầu môi trường
- Node.js >= 24
- pnpm >= 12.11.2
- Docker & Docker Compose

## Khởi động hạ tầng dev
```bash
docker compose -f infra/compose/compose.dev.yml up -d
```

Các dịch vụ sẽ khởi chạy:
- PostgreSQL 17 (port 5432)
- Redis Core (port 6379, policy noeviction)
- Redis Cache (port 6380, policy allkeys-lru, max 64mb)
- Mailpit (SMTP 1025, Web UI 8025)

## Cài đặt thư viện
```bash
pnpm install --frozen-lockfile
```

## Chạy kiểm tra chất lượng
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Chạy ứng dụng dev
```bash
pnpm dev
```
- Web: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api/v1/health
