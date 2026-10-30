# Quy trình sửa tính năng và xem thử

Đọc file này trước khi sửa bất cứ thứ gì trên `jlpt-vm`. Mục tiêu: chủ dự án thấy kết quả sau vài phút (không phải chờ CI ~30 phút), và code luôn nằm trong git.

## Môi trường trên `jlpt-vm`

| Địa chỉ (từ máy chủ dự án) | Là gì | Cập nhật thế nào |
|---|---|---|
| `http://192.168.114.206:3000` | Web học viên, bản ổn định | Tự build từ `main` mỗi 5 phút (timer `jlpt-preview-update`) |
| `http://192.168.114.206:3001` | Admin, bản ổn định | Như trên |
| `http://192.168.114.206:3210` | **Bản xem thử của một nhánh** (chỉ web) | `tools/ops/preview-branch.sh <nhánh>` |
| API `127.0.0.1:4000` | Container `jlpt-staging-api`, không mở ra ngoài | Dùng chung cho cả ba địa chỉ trên |
| Database | Container `jlpt-staging-postgres` | **Dùng chung và chứa dữ liệu thật** (đề đã nhập, nghĩa tiếng Việt) |

Máy chủ dự án (Windows, `192.168.114.206`) chuyển tiếp các cổng 3000, 3001, 3100, 3101 và 3210 vào VM. Cổng khác không vào được từ máy chủ dự án, nên không tự mở cổng mới để cho chủ dự án xem.

## Các bước

(Bản tóm tắt nằm trong [AGENTS.md](../../AGENTS.md), mục "Quy trình sửa tính năng". Nếu hai nơi khác nhau thì sửa cả hai cho khớp.)

1. **Chuẩn bị nhánh (worktree riêng).** Không sửa trong thư mục copy, không sửa trong thư mục mà service đang chạy.
   ```bash
   cd /home/jlpt/paper-exam-20261024
   git fetch origin main
   git worktree add /home/jlpt/wt-<tên> -b <loai>/<ten-ngan> origin/main
   cd /home/jlpt/wt-<tên>
   pnpm install --frozen-lockfile --prefer-offline
   pnpm --filter @jlpt/schema --filter @jlpt/exam-engine --filter @jlpt/ui build   # cần cho typecheck và test web
   ```
2. **Sửa và kiểm tra tại chỗ.** Chạy các cổng trong [AGENTS.md](../../AGENTS.md) cho phần mình sửa (ít nhất `typecheck` và `test` của gói liên quan). Chuỗi giao diện **mới** phải có đủ vi, ja, en. Sửa chuỗi **có sẵn** thì chỉ sửa ngôn ngữ được yêu cầu (nếu ja/en cũng cần đồng bộ, hỏi chủ dự án). Đổi tên một nút thì tìm cả chỗ khác nhắc tới tên đó (aria-label, hướng dẫn, test).
3. **Commit và push nhánh.** `git push -u origin <nhánh>`. Không push thẳng vào `main`.
4. **Xem thử.** `ssh jlpt-vm 'cd /home/jlpt/wt-<tên> && tools/ops/preview-branch.sh <nhánh>'`. Mất khoảng 0,5–3 phút, in ra link `http://192.168.114.206:3210`. **Báo chủ dự án link này và chờ phản hồi.** Chưa cần chờ CI.
5. **Mở PR vào `main`** (`gh pr create`). Mô tả PR ghi: làm gì, vì sao, đã kiểm tra những gì, **và những gì chưa kiểm tra**. CI chạy song song với lúc chủ dự án xem.
6. **CI.** Ba job bắt buộc phải xanh: `Lint, Typecheck, Test, Build` (~15–18 phút), `Dev Services & Full Integration Gate` (~15 phút), `Staging Compose Profile Small & PITR Drill` (~25–35 phút). CI đỏ thì đọc log, sửa, push lại.
7. **Merge** khi CI xanh. Xem mục "Auto-merge" bên dưới.
8. **Sau merge.** `:3000` và `:3001` tự cập nhật trong khoảng 5–10 phút. Xem trạng thái: `sudo -n cat /srv/jlpt-preview/status.txt` (dòng `OK <commit>` là xong, `BUILD FAILED` thì xem `/srv/jlpt-preview/build.log`). Muốn chạy ngay: `sudo -n systemctl start jlpt-preview-update`. Mở trang thật và xem lại bằng mắt (xem [OPERATIONS.md](OPERATIONS.md)).

## Phân loại thay đổi: quyết định xem thử thế nào

| Loại | Xem thử trên :3210? | Lưu ý |
|---|---|---|
| Web thuần (chữ, bố cục, giao diện, logic phía trình duyệt) | Có | Cách làm bình thường ở trên |
| Có sửa API hoặc admin | Chỉ phần web | Bản xem thử vẫn gọi API của `main`. Endpoint mới sẽ không chạy. Nói rõ với chủ dự án phần nào xem được. |
| **Migration database, sửa hoặc xóa dữ liệu** | **Không.** Script từ chối nhánh có migration. | Database dùng chung nên migration đã chạy thì khó quay lại. Cần sao lưu và chủ dự án đồng ý, rồi đợi CI xanh. |
| Đăng nhập, phân quyền, thanh toán | Không đẩy lên trước CI | Lỗi ở đây có thể ảnh hưởng dữ liệu thật |

Chỉ có **một** bản xem thử tại một thời điểm: chạy `preview-branch.sh` lần nữa sẽ thay bản trước. Nếu nghi ngờ agent khác đang dùng (xem `/home/jlpt/preview-3210/.preview-info`), hỏi chủ dự án trước khi ghi đè. Tắt bản xem thử: `sudo -n systemctl stop jlpt-preview-branch`.

Bản xem thử dùng chung database với `:3000`. Thao tác ghi khi thử (nộp bài, lưu nghĩa, sửa đề) là thật.

## Auto-merge

Workflow `auto-merge.yml` bật auto-merge cho PR và **bật lại sau mỗi lần push**. Khi chủ dự án muốn xem hoặc duyệt trước khi vào `main`, chạy `gh pr merge <số PR> --disable-auto` sau **mỗi** lần push, rồi kiểm tra bằng `gh pr view <số> --json autoMergeRequest`. Merge là việc của chủ dự án nếu họ đã yêu cầu như vậy.

## Quay lại khi có vấn đề

- Bản xem thử lỗi: không ảnh hưởng `:3000`. Dừng bằng `sudo -n systemctl stop jlpt-preview-branch` hoặc chạy lại `preview-branch.sh` với nhánh khác.
- Bản `main` mới làm hỏng `:3000`/`:3001`: revert PR bằng nút Revert trên GitHub, CI chạy lại, timer tự build lại bản revert. Cần nhanh hơn thì báo chủ dự án.
- Cấu hình nginx cũ lưu ở `/etc/nginx/sites-available/jlpt-demo.bak-before-autodeploy-20261030`.

## Không được làm

- Không sửa trực tiếp trên thư mục service đang chạy (`/srv/jlpt-preview/repo`, `/home/jlpt/preview-3210`) hoặc các thư mục copy cũ trong `/home/jlpt`. Mọi thay đổi phải nằm trong git.
- Không bỏ qua CI, không force-push, không merge khi CI đỏ (xem [SECURITY_RULES.md](SECURITY_RULES.md)).
- Không tự xin thêm quyền cho token GitHub trên VM (ví dụ scope `workflow`). Sửa file trong `.github/workflows/` thì báo chủ dự án.
- Không chạy migration hoặc sửa dữ liệu trên database dùng chung khi chưa có sao lưu và đồng ý của chủ dự án.
- Không báo "xong" khi chưa mở trang thật. Ghi trung thực cái gì đã chạy, cái gì chưa.
