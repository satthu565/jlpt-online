# Bằng chứng diễn tập pause / checkpoint / resume của coordinator

Nguồn: cơ sở dữ liệu của coordinator trên máy chạy worker (`coordinator.sqlite`, bảng `events` và `checkpoints`), xuất bởi người vận hành ngày 17/10/2026. Đây là các lần coordinator thực sự dừng/khởi động lại giữa phiên làm việc của agent trong quá trình xây dựng dự án, không phải mô phỏng.

## Tổng hợp

- Phiên bị ngắt vì coordinator tắt (sự kiện `interrupted`): **39**, trên **16** task, từ 2026-10-16 05:16 đến 2026-10-16 19:36 UTC.
- Lần tạm dừng/tiếp tục toàn bộ (`pause`/`resume`): **16**.
- Checkpoint đã ghi (commit `chore(checkpoint)` được gom về bản sao tin cậy và mirror): **140**, trong đó **20** checkpoint giữ thay đổi **chưa commit** của agent tại thời điểm dừng.
- Kết quả: **16/16** task từng bị ngắt sau đó đã hoàn thành và merge qua PR; không task nào bị tính lần thử vì bị ngắt, không patch nào bị mất.

## Theo task

| Task | Số lần bị ngắt | Kết quả | PR |
|---|---|---|---|
| A01 | 1 | DONE | #26 |
| A02 | 1 | DONE | #30 |
| A03 | 2 | DONE | #35 |
| A04 | 1 | DONE | #31 |
| A05 | 1 | DONE | #28 |
| B01 | 1 | DONE | #25 |
| C04 | 4 | DONE | #14 |
| C06 | 5 | DONE | #13 |
| L02 | 1 | DONE | #20 |
| L04 | 2 | DONE | #21 |
| L05 | 1 | DONE | #23 |
| N02 | 6 | DONE | #18 |
| N04 | 1 | DONE | #27 |
| N05 | 7 | DONE | #16 |
| N06 | 3 | DONE | #33 |
| V03 | 2 | DONE | #38 |

## Cơ chế được kiểm chứng

1. Khi dịch vụ coordinator nhận SIGTERM, phiên agent đang chạy dừng; mọi thay đổi còn lại trong clone của worker được commit thành `chore(checkpoint)` và gom về bản sao tin cậy, nhánh task được đẩy lên mirror.
2. Task chuyển sang `NEEDS_WORK` với ghi chú "Coordinator khởi động lại giữa phiên", không tăng bộ đếm lần thử.
3. Sau khi khởi động lại, task được giao tiếp (có thể sang worker khác qua mirror) và tiếp tục từ checkpoint.
4. Bước kiểm tra bị ngắt giữa chừng cũng không tính lần thử ("kiểm tra dừng vì coordinator tắt").

## Cách tái lập

Trên máy coordinator: `coordinator events 500 | grep interrupted` và bảng `checkpoints` trong `coordinator.sqlite`.
