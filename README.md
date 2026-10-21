# JLPT Online

Web luyện thi JLPT (N5–N1) cho người Việt:

- làm đề và thi thử có giờ, chấm điểm, nghe có audio;
- sổ tay, flashcard SRS, kế hoạch học;
- tra từ điển, có âm Hán Việt theo từng từ;
- trang quản trị để nhập đề, duyệt nội dung và vận hành.

Monorepo TypeScript gồm Next.js (web học viên và admin), NestJS (API) và PostgreSQL.

## Bắt đầu

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Cách dựng môi trường dev (Postgres, Redis, Mailpit): [docs/runbooks/dev-environment.md](docs/runbooks/dev-environment.md).

## Tài liệu

- [AGENTS.md](AGENTS.md): bản đồ dự án, lệnh chạy, quy ước. Đọc đầu tiên, cả người lẫn agent.
- [docs/agents/](docs/agents/): kiến trúc, database, API, tính năng, các bẫy, vận hành.
- [docs/runbooks/](docs/runbooks/): triển khai, backup, khôi phục.
- [docs/decisions/](docs/decisions/): quyết định thiết kế theo từng task.
