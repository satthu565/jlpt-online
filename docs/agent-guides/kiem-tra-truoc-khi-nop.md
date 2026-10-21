# Kiểm tra trước khi nộp

Mỗi vòng CI mất khoảng 30 phút, và mỗi lần trả về tốn thêm một vòng review. Tự kiểm tra kỹ trước khi đẩy.

## 1. Cập nhật nhánh

```bash
git fetch origin
git rebase origin/main      # hoặc merge, theo cách nhánh đang làm
```

Các task khác hay sửa cùng file: `api-client.ts`, messages, `integration.spec.ts`, migration.

## 2. Cổng bắt buộc

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:ui-primitives
pnpm check:no-mock-ui
pnpm docs:map && git status --short docs/agents/   # file tự sinh phải đã commit
```

Chỉ sửa một phần thì chạy riêng phần đó cho nhanh, nhưng phải chạy đủ một lần trước khi đẩy:

- `pnpm vitest run <thư mục>`
- `pnpm --filter @jlpt/admin test`
- `pnpm test:web`

`pnpm test` chạy trên Windows có thể đỏ vì đường dẫn hoặc `python3`. Chạy lại trên Linux (máy ảo `jlpt-vm` hoặc CI) trước khi kết luận.

## 3. E2E trên staging

Bắt buộc khi sửa giao diện, E2E hoặc API mà web/admin dùng.

| Ai | Lệnh |
|---|---|
| Worker của coordinator | `sudo -n /usr/local/bin/jlpt-stage-test` |
| Agent khác, nhánh đã đẩy lên GitHub | `ssh jlpt-vm '/usr/local/bin/claude-stage-check <nhánh>'` |

Chỉ nộp khi log ghi `KẾT QUẢ: PASS`. Một test được đánh dấu "flaky" (lỗi mạng trên Firefox) không chặn nộp, nhưng phải ghi rõ trong mô tả PR.

## 4. Xem tận mắt

Có sửa giao diện thì mở trang thật và chụp ở 390 px và 1366 px. Kiểm tra:

- không tràn ngang;
- không có chữ hiện thành key, ví dụ `kanji.title`;
- không hiện mã nội bộ;
- trạng thái lỗi và rỗng hiện đúng.

## 5. Tài liệu và mô tả PR

- Cập nhật `docs/agents/FEATURES.md`. Gặp bẫy mới thì thêm vào `docs/agents/PITFALLS.md`.
- Mô tả PR ghi:
  - làm gì, vì sao;
  - danh sách lệnh đã chạy và kết quả;
  - điều chưa làm được.
- Không merge, không bật auto-merge.
