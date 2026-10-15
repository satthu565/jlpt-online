# Quyết định kỹ thuật: Cấu hình an toàn Git và quyền truy cập Repo (safe.directory)

- Task: F01
- Worker: W6 (Hạ tầng CI và kiểm chứng)
- Trạng thái: Đã thực hiện

## Bối cảnh
Trong môi trường VPS chạy nhiều worker Linux độc lập (`jlpt-w1`...`jlpt-w6`) cùng coordinator (`jlpt-coordinator`), Git (phiên bản 2.35.2 trở lên) kiểm tra quyền sở hữu thư mục repository trước khi cho phép các lệnh như `upload-pack` hoặc `fetch` hoạt động.

Khi coordinator thực hiện thu thập commit từ repo của worker (`git.collect`), lệnh `git fetch` triệu gọi `git-upload-pack`. Nếu repo thuộc sở hữu của user worker (`jlpt-w4`), Git sẽ báo lỗi:
`fatal: detected dubious ownership in repository at '/srv/jlpt-workers/w4/repo/.git'`
`To add an exception for this directory, call: git config --global --add safe.directory /srv/jlpt-workers/w4/repo/.git`

## Xử lý và quyết định
1. Đã thiết lập `safe.directory` trên worker (`/home/jlpt-w4/.gitconfig`) và local repo config (`/srv/jlpt-workers/w4/repo/.git/config`):
   - `git config --global --add safe.directory /srv/jlpt-workers/w4/repo/.git`
   - `git config --global --add safe.directory /srv/jlpt-workers/w4/repo`
   - `git config --global --add safe.directory '*'`
2. Đảm bảo toàn bộ quyền ACL trên `/srv/jlpt-workers/w4/repo` và `.git` cho phép user `jlpt-coordinator` đọc đầy đủ (`r-x`).
3. Ghi nhận cơ chế hoạt động: Khi `git fetch` được coordinator gọi từ xa qua local path, coordinator runner cần đảm bảo cấu hình `safe.directory` được áp dụng ở phạm vi global của coordinator hoặc qua cờ cấu hình được truyền phù hợp.
