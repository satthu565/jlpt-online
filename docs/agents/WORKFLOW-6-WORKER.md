# Làm việc qua coordinator (worker W1–W6)

Phần này chỉ áp dụng khi agent chạy dưới coordinator, tức là một worker W1–W6 được cấp task tự động. Agent làm việc trực tiếp với chủ dự án thì bỏ qua file này.

## Bản quy tắc chính thức

Quy tắc cho worker nằm ở [docs/multi-worker/AGENTS.md](../multi-worker/AGENTS.md). Coordinator nhét đường dẫn file đó vào mọi lần giao việc. Muốn đổi quy tắc cho worker thì sửa file ấy. Trước đây `AGENTS.md` ở gốc repo là bản sao của nó; nay gốc repo là hướng dẫn chung cho mọi agent và không còn phải giống bản kia.

## Tóm tắt luồng

1. Coordinator chạy trên máy ảo `jlpt-vm` (service `jlpt-coordinator`). Nó là nơi duy nhất cấp task và giữ trạng thái.
2. Task lấy từ `docs/multi-worker/tasks.json`. File này **sinh ra** từ `docs/multi-worker/tools/build_docs.py`: sửa script rồi chạy lại, không sửa tay file JSON.
3. Mỗi task có `allowedPaths`, khóa (`locks`), tiêu chí nghiệm thu và lệnh kiểm tra. Worker chỉ sửa trong `allowedPaths`.
4. Worker commit trong clone riêng. Coordinator lấy commit về, chạy kiểm tra, giao một worker khác review, rồi tự push và mở PR.
5. Worker không dùng `gh`, không push, không merge, không đọc secret của coordinator hay của worker khác.
6. Chủ dự án bật merge. CI đạt thì PR tự gộp. Coordinator đồng bộ main và đặt task thành `DONE`.

## Lệnh cho người vận hành (trên jlpt-vm)

```bash
sudo -u jlpt-coordinator -H coordinator status
sudo -u jlpt-coordinator -H coordinator cancel <task>
sudo -u jlpt-coordinator -H coordinator retry <task>
```

`cancel` không dừng phiên agent đang chạy: phải dừng tiến trình theo PID. Xem [PITFALLS.md](PITFALLS.md).

## Kiểm tra staging cho worker

Task có giao diện, E2E hoặc API: trước khi nộp REVIEW, chạy `sudo -n /usr/local/bin/jlpt-stage-test` và chỉ nộp khi kết quả PASS. Chi tiết trong [OPERATIONS.md](OPERATIONS.md).
