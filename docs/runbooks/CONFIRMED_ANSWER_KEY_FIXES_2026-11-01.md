# Sửa khóa đáp án chắc chắn sai — cập nhật 03/11/2026

Script: `apps/api/src/scripts/fix-confirmed-answer-keys.ts`.

## Phạm vi

- 29 khóa đáp án đã được chủ dự án yêu cầu sửa.
- 22 đề N1–N5, 29 nhóm câu hỏi.
- Bổ sung N2 7/2025 Q82 (khóa 4 → 3) và N2 12/2023 Q51 (khóa 2 → 3) sau khi đối chiếu đề, transcript/audio và nhiều bảng đáp án độc lập.
- N2 12/2024 Q50 giữ nguyên khóa 2 vì PDF đáp án tại dự án và các nguồn độc lập đều xác nhận `感動していた`.
- Không gồm các câu có hai đáp án hợp lệ hoặc các mục còn cần nghe audio/đối chiếu bản gốc.

## Bảo toàn lịch sử

- Không cập nhật hàng `correct_answers` đã xuất bản.
- Mỗi nhóm được sao chép sang phiên bản `approved` mới; chỉ khóa mục tiêu thay đổi.
- Mỗi đề liên quan được xuất bản thành phiên bản mới để `exam_answer_keys` dùng khóa mới.
- Ghi `content_reviews` với editor và reviewer khác nhau, cùng `operator_actions` cho thao tác bảo trì.

## Chạy

```bash
pnpm --filter @jlpt/api build
node apps/api/dist/src/scripts/fix-confirmed-answer-keys.js

CONFIRMED_ANSWER_KEYS_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/fix-confirmed-answer-keys.js --apply
```

Chế độ mặc định chỉ kiểm tra. `--apply` từ chối chạy nếu không có file backup tối thiểu 1 MiB.

## Kiểm tra bắt buộc

- Dry-run phải báo 29 mục tiêu và không có khóa ngoài giá trị cũ/mới mong đợi.
- Sau khi áp dụng, script tự đọc lại cả phiên bản câu hỏi mới lẫn `exam_answer_keys` phiên bản đề mới.
- Chạy lại ở chế độ dry-run phải báo `pendingQuestionVersions: 0` và `pendingPublishedKeys: 0`.
- Mở trang thật của ít nhất một đề mỗi cấp N1–N5 sau khi phiên bản mới được xuất bản.
