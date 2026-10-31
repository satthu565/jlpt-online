# Vận hành

File này không chứa mật khẩu hay token. Không ghi secret vào đây.

## Môi trường

| Môi trường | Ở đâu | Ghi chú |
|---|---|---|
| Máy ảo `jlpt-vm` | Hyper-V trên máy chủ dự án, Ubuntu 24.04, 8 vCPU, RAM 6–12 GB | `ssh jlpt-vm`. Đây là nơi chạy coordinator, worker, preview, staging check và công cụ trích xuất đề. |
| Preview (ổn định) | http://192.168.114.206:3000 (web), :3001 (admin) | Tự build từ `main` mỗi 5 phút khi `main` đổi (timer `jlpt-preview-update`, web ở cổng 13000, admin ở 13001, nginx chuyển tiếp). Trạng thái: `sudo -n cat /srv/jlpt-preview/status.txt`. API, Postgres và Mailpit chạy ở `/srv/jlpt-demo` (docker compose project `jlpt-demo`, container `jlpt-staging-api`). Build image API từ `main` trong timer đang lỗi (xem PITFALLS), nên API là image build tay. |
| Xem thử nhánh | http://192.168.114.206:3210 (chỉ web) | `tools/ops/preview-branch.sh <nhánh>`. Xem [DEV_WORKFLOW.md](DEV_WORKFLOW.md). Dùng chung API và database với :3000. |
| Staging CI | GitHub Actions, workflow "Staging Verification" | Dựng compose staging rồi chạy Playwright. PR chỉ chạy Chromium, main chạy 5 trình duyệt. |
| Production | Chưa có | Chờ chủ dự án chọn hosting |

Tài khoản thử trên preview: học viên `hocvien@jlpt.demo`, admin `publisher@jlpt.local`. Mật khẩu hỏi chủ dự án, không ghi vào repo.

## Kiểm tra E2E trước khi đẩy

Mỗi vòng CI mất khoảng 30 phút, nên trước khi đẩy commit sửa giao diện, E2E hoặc API phải chạy staging trên máy ảo:

| Ai chạy | Lệnh |
|---|---|
| Worker (trong clone của mình) | `sudo -n /usr/local/bin/jlpt-stage-test` (mặc định), `check` (chạy trên checkout sạch của coordinator) hoặc `full` (đủ 5 trình duyệt) |
| Agent ngoài, với nhánh đã có trên GitHub | `ssh jlpt-vm '/usr/local/bin/claude-stage-check <tên-nhánh>'` |

- Lệnh dựng staging giống CI, rồi chạy Playwright integration và `test:e2e:core`.
- Log nằm ở `/srv/jlpt-stagecheck/<worker>/last.log`.
- Mỗi lần chỉ chạy một lượt; lượt sau tự xếp hàng.
- Mất 10–20 phút.
- Compose lấy từ `main`, nên thay đổi compose trong nhánh chỉ được CI GitHub kiểm tra.
- **Hiện trạng (30/10/2026):** các lệnh trên đang lỗi ở bước build image API (`pnpm install --frozen-lockfile` trong Docker). Cùng lỗi xảy ra khi `jlpt-preview-update` build API. Chưa rõ nguyên nhân (cùng lệnh chạy được ngoài Docker). Chưa sửa được thì dựa vào CI GitHub, và xem thử trước trên :3210 để không phải chờ CI.

## Kiểm tra giao diện bằng mắt

Test đạt chưa đủ để báo giao diện đã xong. Phải mở trang thật trên preview hoặc staging, chụp màn hình ở 390 px và 1366 px, rồi xem lại ảnh. Trên máy ảo có công cụ chụp `/opt/shot`.

## Quy trình PR

1. Làm trên nhánh riêng tách từ `origin/main` mới nhất. Không commit thẳng vào `main`.
2. Trước khi đẩy: chạy các cổng kiểm tra trong [AGENTS.md](../../AGENTS.md). Với thay đổi giao diện: chạy `tools/ops/preview-branch.sh <nhánh>` và báo chủ dự án link :3210 để xem trong lúc CI chạy (xem [DEV_WORKFLOW.md](DEV_WORKFLOW.md)).
3. Mở PR. Mô tả PR ghi: làm gì, vì sao, đã kiểm tra những gì (lệnh và kết quả).
4. Workflow `auto-merge.yml` tự bật squash auto-merge cho PR không phải draft từ nhánh nội bộ. Agent không merge trực tiếp và không được bỏ qua ruleset; GitHub chỉ gộp sau khi mọi kiểm tra bắt buộc đạt. **Với thay đổi giao diện, mặc định tắt auto-merge cho đến khi chủ dự án xem xong** (xem [DEV_WORKFLOW.md](DEV_WORKFLOW.md)).
5. CI đỏ thì đọc log, sửa, rồi chạy lại staging trên máy ảo trước khi đẩy tiếp.

## Coordinator

Coordinator là service `jlpt-coordinator` trên máy ảo. Mã chạy ở `/opt/jlpt-coordinator`, cấu hình ở `/srv/jlpt-coordinator/coordinator.json`. Danh sách task sinh từ `docs/multi-worker/tools/build_docs.py`. Xem [WORKFLOW-6-WORKER.md](WORKFLOW-6-WORKER.md).

## Trích xuất đề (ngoài repo)

Đề gốc dạng PDF được trích thành gói nhập (ZIP theo `docs/import-format`) bằng một runner riêng ở `/srv/jlpt-extract` trên máy ảo, theo hướng dẫn của template `trich-xuat-de-template`. Ứng dụng không đọc PDF. Gói ZIP được tải lên qua admin `/imports`.
