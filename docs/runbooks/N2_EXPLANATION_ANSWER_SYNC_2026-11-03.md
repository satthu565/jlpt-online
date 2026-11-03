# Đồng bộ lời giải với khóa đáp án N2 — 03/11/2026

Script: `apps/api/src/scripts/sync-n2-answer-explanations.ts`.

## Phạm vi

- 2 câu N2 đã được sửa khóa đáp án ngày 01/11/2026 nhưng lời giải tiếng Việt vẫn nêu khóa cũ:
  - `n2-2021-12`: Q37 (`grammar_form`) khóa 1 (`にもなって`), lời giải cũ ghi 3 (`にでもなって`).
  - `n2-2013-07`: Q32 (`usage`) khóa 2 (`大きな川が二つの市を隔てている。`), lời giải cũ ghi 4 (`試験のときは...`).
- Chỉ sửa lời giải; không thay đổi khóa đáp án hiện hành.
- Không gồm ba câu còn tranh chấp nguồn ngoài/bản leak: N2 7/2025 Q82, N2 12/2024 Q50 và N2 12/2023 Q51.

## Bảo toàn lịch sử

- Không cập nhật đè phiên bản đã xuất bản.
- Mỗi nhóm liên quan được sao chép sang phiên bản `approved` mới.
- Lời giải mới có `humanReviewed: true`, đồng thời ghi `content_reviews` và `operator_actions`.
- Mỗi đề liên quan được xuất bản thành phiên bản mới sau khi kiểm tra lời giải.

## Chạy

```bash
pnpm --filter @jlpt/api build
node apps/api/dist/src/scripts/sync-n2-answer-explanations.js

N2_EXPLANATION_SYNC_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/sync-n2-answer-explanations.js --apply
```

Lưu ý: Nếu chạy từ host ngoài docker network, truyền `DATABASE_URL` tương ứng của container `jlpt-staging-postgres` (ví dụ `postgres://jlpt:<password>@172.18.0.3:5432/jlpt_staging`).

Chế độ mặc định chỉ kiểm tra. `--apply` từ chối chạy nếu không có file backup tối thiểu 1 MiB.

## Kiểm tra bắt buộc

- Dry-run phải báo 2 lời giải chờ đồng bộ và 2 đề bị ảnh hưởng.
- Sau khi áp dụng, chạy lại dry-run phải báo `pendingExplanations: 0`.
- Kiểm tra khóa trong `correct_answers`, khóa đã xuất bản và lời giải phải cùng một giá trị ở cả 2 câu.
- Mở trang thật và kiểm tra cả 2 câu sau khi xuất bản.
