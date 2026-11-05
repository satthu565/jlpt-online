# Đồng bộ lời giải với khóa đáp án N1 — 03/11/2026

Script: `apps/api/src/scripts/sync-n1-answer-explanations.ts`.

## Phạm vi

- 10 câu N1 đã được sửa khóa đáp án ngày 01/11/2026 nhưng lời giải tiếng Việt vẫn nêu khóa cũ.
- Chỉ sửa lời giải; không thay đổi khóa đáp án hiện hành.
- Không gồm ba câu còn tranh chấp nguồn: N1 7/2025 Q88, N1 12/2023 Q63 và N1 7/2019 Q90.

## Bảo toàn lịch sử

- Không cập nhật đè phiên bản đã xuất bản.
- Mỗi nhóm liên quan được sao chép sang phiên bản `approved` mới.
- Lời giải mới có `humanReviewed: true`, đồng thời ghi `content_reviews` và `operator_actions`.
- Mỗi đề liên quan được xuất bản thành phiên bản mới sau khi kiểm tra lời giải.

## Chạy

```bash
pnpm --filter @jlpt/api build
node apps/api/dist/src/scripts/sync-n1-answer-explanations.js

N1_EXPLANATION_SYNC_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/sync-n1-answer-explanations.js --apply
```

Chế độ mặc định chỉ kiểm tra. `--apply` từ chối chạy nếu không có file backup tối thiểu 1 MiB.

## Kiểm tra bắt buộc

- Dry-run phải báo 10 lời giải chờ đồng bộ và 10 đề bị ảnh hưởng.
- Sau khi áp dụng, chạy lại dry-run phải báo `pendingExplanations: 0`.
- Kiểm tra khóa trong `correct_answers`, khóa đã xuất bản và lời giải phải cùng một giá trị ở cả 10 câu.
- Mở trang thật và kiểm tra ít nhất một câu sau khi xuất bản.
