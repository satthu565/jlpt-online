# Mẫu phiếu giao việc

Giao việc cho agent bằng phiếu này, không giao bằng một câu ngắn. Việc mới lạ thì kèm hướng dẫn từng bước có code mẫu, theo kiểu [H07-admin-lexicon.md](../multi-worker/guides/H07-admin-lexicon.md).

```markdown
# <Mã việc>: <tên ngắn>

**Mục tiêu:** <tính năng gì, cho ai, vì sao cần>

**Đọc trước:** AGENTS.md, <AGENTS.md của thư mục liên quan>, <file trong docs/agents/ liên quan>

**Được sửa:**
- <đường dẫn>

**Không được sửa:**
- <đường dẫn>, package.json gốc, turbo.json, cấu hình test chung

**Các bước:**
1. <bước, kèm tên file, tên bảng, tên endpoint cụ thể>
2. …

**Tiêu chí nghiệm thu (kiểm tra được):**
- [ ] <hành vi cụ thể, ví dụ: GET /api/v1/... trả 200 với ...>
- [ ] <trang ... hiện ... ở 390 px và 1366 px>

**Lệnh kiểm tra:**
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm check:ui-primitives && pnpm check:no-mock-ui
<E2E staging nếu có giao diện hoặc API>

**Sau khi xong:**
- Cập nhật docs/agents/FEATURES.md.
- Gặp bẫy mới thì ghi vào docs/agents/PITFALLS.md.
- Ghi quyết định thiết kế đáng kể vào docs/decisions/<mã>-<slug>.md.
- Mô tả PR: làm gì, vì sao, đã chạy kiểm tra gì và kết quả.
```

## Người review kiểm tra gì

1. Diff có đúng phạm vi phiếu việc không, có sửa ngoài danh sách "được sửa" không.
2. Các tiêu chí nghiệm thu có test hoặc bằng chứng không.
3. Đã cập nhật `FEATURES.md` chưa; có bẫy mới cần ghi vào `PITFALLS.md` không.
4. Có vi phạm [SECURITY_RULES.md](SECURITY_RULES.md) hay quy ước trong `AGENTS.md` không: prettier, chuỗi i18n đủ 3 ngôn ngữ, thẻ thô, dữ liệu giả.
