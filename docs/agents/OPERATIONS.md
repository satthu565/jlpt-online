# Vận hành

File này không chứa mật khẩu hay token. Không ghi secret vào đây.

## Môi trường

| Môi trường | Ở đâu | Ghi chú |
|---|---|---|
| Máy ảo `jlpt-vm` | Hyper-V trên máy chủ dự án, Ubuntu 24.04, 8 vCPU, RAM 6–12 GB | `ssh jlpt-vm`. Đây là nơi chạy coordinator, worker, preview, staging check và công cụ trích xuất đề. |
| Preview | http://jlpt-vm.mshome.net:3000 (web), :3001 (admin) | Tự build lại sau mỗi 5 phút khi `main` đổi. API, Postgres và Mailpit chạy ở `/srv/jlpt-demo` (docker compose project `jlpt-demo`). |
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

## Kiểm tra giao diện bằng mắt

Test đạt chưa đủ để báo giao diện đã xong. Phải mở trang thật trên preview hoặc staging, chụp màn hình ở 390 px và 1366 px, rồi xem lại ảnh. Trên máy ảo có công cụ chụp `/opt/shot`.

## Quy trình PR

1. Làm trên nhánh riêng tách từ `origin/main` mới nhất. Không commit thẳng vào `main`.
2. Trước khi đẩy: chạy các cổng kiểm tra trong [AGENTS.md](../../AGENTS.md), rồi chạy E2E staging nếu cần.
3. Mở PR. Mô tả PR ghi: làm gì, vì sao, đã kiểm tra những gì (lệnh và kết quả).
4. **Agent không merge và không bật auto-merge.** Chủ dự án bật merge; CI đạt thì PR tự gộp.
5. CI đỏ thì đọc log, sửa, rồi chạy lại staging trên máy ảo trước khi đẩy tiếp.

## Coordinator

Coordinator là service `jlpt-coordinator` trên máy ảo. Mã chạy ở `/opt/jlpt-coordinator`, cấu hình ở `/srv/jlpt-coordinator/coordinator.json`. Danh sách task sinh từ `docs/multi-worker/tools/build_docs.py`. Xem [WORKFLOW-6-WORKER.md](WORKFLOW-6-WORKER.md).

## Trích xuất đề (ngoài repo)

Đề gốc dạng PDF được trích thành gói nhập (ZIP theo `docs/import-format`) bằng một runner riêng ở `/srv/jlpt-extract` trên máy ảo, theo hướng dẫn của template `trich-xuat-de-template`. Ứng dụng không đọc PDF. Gói ZIP được tải lên qua admin `/imports`.
