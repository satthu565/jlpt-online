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

## Giao việc cho worker agy ngoài coordinator

Coordinator chỉ chạy task trong catalog (`tasks.json`). Việc phát sinh (sửa giao diện, sửa lỗi) giao thẳng cho worker `agy` bằng `tools/ops/vm/run-fix.sh` (chép vào `/home/jlpt/` trên VM). Mỗi việc chạy trong một clone riêng `/srv/jlpt-workers/wN/adhoc/<tên>`, nhánh `fix/<tên>`, tối đa 5 việc song song (W1 đến W5, W6 chưa đăng nhập).

| Lệnh | Việc |
|---|---|
| `BASE=<nhánh> run-fix.sh start <tên> "<mô tả>"` | Chọn worker rảnh, clone `BASE` (mặc định `main`), chạy `agy` ở nền. Mô tả nên chỉ rõ file, phạm vi, điều không được làm. |
| `run-fix.sh status [tên]` | Trạng thái, mã thoát (`exit 0` là xong). |
| `run-fix.sh finish <tên>` | Đẩy nhánh và mở PR. |
| `run-one.sh <tên> <base> <file-mô-tả>` | Xếp hàng, tự giao khi có worker rảnh. |

Quy tắc đã rút ra:
- Worker chỉ commit, không push. Đọc diff và chạy thử trên trang thật (Playwright, :3210) trước khi báo xong. Test đạt chưa đủ: nhiều lỗi (hook sai thứ tự, render object) chỉ lộ khi mở trình duyệt.
- Các việc cùng sửa một file không giao song song. Muốn chạy đua cho nhanh thì giao cùng một yêu cầu cho hai worker và chỉ dùng bản xong trước, không gộp hai bản.
- `BASE` là nhánh chưa ghép thì phải đẩy nhánh đó lên GitHub trước và `git fetch` mới nhất vào kho `paper-exam-20261024`; clone lấy bản cũ nếu kho cục bộ chưa cập nhật.
- Mỗi clone `pnpm install` tốn khoảng 2 GB. Xong việc thì xóa `node_modules`, `.next`, `.turbo` trong clone.

## Biến môi trường của dịch vụ web

Các route `apps/web/app/internal-api/analytics/*` (trang Thống kê) đọc thẳng Postgres, nên dịch vụ web **bắt buộc có `DATABASE_URL`**. Code không còn giá trị mặc định: thiếu biến thì route báo lỗi `DATABASE_URL is not set`.

- Giá trị nằm ở `/etc/jlpt/web-db.env` trên máy ảo (chủ `root:jlpt`, quyền 640). File này ngoài repo; không chép giá trị vào repo, tài liệu hay lệnh trong chat.
- Mỗi dịch vụ web nạp file này bằng drop-in systemd `/etc/systemd/system/<tên>.service.d/db.conf`:

```
[Service]
EnvironmentFile=/etc/jlpt/web-db.env
```

  Đã có drop-in cho `jlpt-preview-web` (:3000), `jlpt-preview-branch` (:3210), `jlpt-preview-3211`, `jlpt-paper-web`, `jlpt-notebook-practice-1110`, `jlpt-heroui-web`. Dịch vụ web mới phải thêm drop-in tương tự rồi `sudo systemctl daemon-reload` và restart; biến chỉ có hiệu lực sau khi dịch vụ khởi động lại.
- Drop-in nằm ngoài `tools/ops/jlpt-preview-branch.service`, nên `preview-branch.sh` ghi đè file unit vẫn không làm mất biến.
- Tiến trình web chạy tay (không qua systemd, ví dụ `next start` mở bằng `ssh`) không nhận biến này; muốn chạy thử route Thống kê thì `set -a; . /etc/jlpt/web-db.env; set +a` trước khi khởi động.
- Đổi mật khẩu DB: sửa `/etc/jlpt/web-db.env` cùng nơi API và Postgres dùng, rồi restart các dịch vụ web ở trên.
- Kiểm tra nhanh một dịch vụ: `systemctl show <tên> -p EnvironmentFiles` phải thấy `/etc/jlpt/web-db.env`, và `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<cổng>/internal-api/analytics/bank` phải ra 200.

Migration `0013_user_wrong_reasons` (bảng lý do sai do người học chọn) phải được áp dụng trước khi bản có trang Thống kê này chạy trên DB mới; trên staging bảng đã được dựng sẵn.

## Triển khai API thủ công

Timer `jlpt-preview-update` chỉ cập nhật web (:3000) và admin (:3001) theo `main`. **API không tự cập nhật.** Ghép PR có sửa `apps/api` hoặc `packages/schema` xong thì API trên VM vẫn là bản cũ, web mới gọi đường mà API chưa có (ví dụ lỗi `Cannot POST /api/v1/guest/attempts`).

1. Dựng image từ `main`: `tools/ops/vm/build-api-image.sh <tag> origin/main` (đã có `--network=host`, cần >= 4 GB trống).
2. Thay container, có tự khôi phục: `sudo tools/ops/vm/deploy-api-image.sh <tag-mới> <tag-cũ>`. Tag cũ xem bằng `sudo docker ps --format '{{.Image}}' --filter name=jlpt-staging-api` trước khi đổi.
3. Kiểm tra bằng đường mới thật sự (không chỉ `/health`), và đếm dòng trong bảng liên quan nếu thay đổi nói không ghi DB.
4. Giữ image cũ vài ngày để quay lại. Chỉ xóa image không container nào dùng (`docker ps -a --filter ancestor=<id>`).

Trước khi dựng, so sánh mã nguồn của image đang chạy với `main` (`git diff --stat <commit-image> origin/main -- apps/api packages/schema`) để chắc dựng từ `main` không làm mất tính năng chưa vào `main`.

Đĩa `/` của VM rất dễ đầy (volume Postgres 19 GB, storage 9 GB, mỗi lần dựng API cần khoảng 3,5 GB tạm). Đầy đĩa làm worker chết giữa chừng mà không báo lỗi (file mã thoát rỗng). Kiểm tra `df -h /` trước khi giao nhiều việc hoặc dựng image.

## Trích xuất đề (ngoài repo)

Đề gốc dạng PDF được trích thành gói nhập (ZIP theo `docs/import-format`) bằng một runner riêng ở `/srv/jlpt-extract` trên máy ảo, theo hướng dẫn của template `trich-xuat-de-template`. Ứng dụng không đọc PDF. Gói ZIP được tải lên qua admin `/imports`.
