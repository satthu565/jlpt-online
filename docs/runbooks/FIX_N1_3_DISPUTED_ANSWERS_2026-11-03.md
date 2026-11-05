# Sửa 3 khóa đáp án và lời giải N1 có tranh chấp — 03/11/2026

Script: `apps/api/src/scripts/fix-disputed-n1-answers.ts`.

## Phạm vi

- 3 câu N1 có tranh chấp giữa bảng đáp án nguồn và ngữ cảnh/logic thực tế, đã được chủ dự án phê duyệt điều chỉnh:
  1. `n1-2025-07:Q88`: Đổi từ đáp án 1 sang **2** (Bài nghe khẳng định tiến độ thi công hoàn toàn không chịu ảnh hưởng thời tiết xấu, phản xạ đúng là yên tâm).
  2. `n1-2023-12:Q63`: Đổi từ đáp án 3 sang **4** (Tác giả phân tích chỗ dựa vượt qua khó khăn là mối quan hệ sâu sắc, bền chặt với gia đình và bạn bè, không phải mở rộng số lượng quan hệ).
  3. `n1-2019-07:Q90`: Đổi từ đáp án 2 sang **1** (Thầy giáo nhận lời học trò xin phát biểu tiệc chia tay bằng câu hỏi 2-3 phút có được không; phương án 2 sai nghiêm trọng về kính ngữ vì bề trên không dùng khiêm nhường ngữ 差し上げる với học trò).

## Bảo toàn lịch sử và dữ liệu

- Không cập nhật đè trực tiếp lên các hàng `question_versions`, `correct_answers` hoặc `explanation_versions` đã xuất bản.
- Mỗi nhóm câu hỏi liên quan được sao chép sang phiên bản `approved` mới.
- Cập nhật đồng bộ cả `correct_answers`, `question_versions.explanation` và `explanation_versions.content` (locale `vi`) với đầy đủ lý do đúng, phân tích từng phương án và cờ `humanReviewed: true`.
- Ghi `content_reviews` với editor và reviewer riêng biệt, cùng `operator_actions` cho thao tác bảo trì.
- Xuất bản lại các đề liên quan (`publishExam`) để đồng bộ `exam_answer_keys` và `exams.published_version`.

## Chạy

```bash
pnpm --filter @jlpt/api... build
node apps/api/dist/src/scripts/fix-disputed-n1-answers.js

DISPUTED_ANSWER_KEYS_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/fix-disputed-n1-answers.js --apply
```

Chế độ mặc định là dry-run. `--apply` yêu cầu biến môi trường `DISPUTED_ANSWER_KEYS_BACKUP` trỏ tới file sao lưu hợp lệ (tối thiểu 1 MiB).

## Kiểm tra sau khi chạy

- Chế độ dry-run ban đầu báo 3 câu cần xử lý (`pending: 3`).
- Sau khi chạy `--apply`, script tự động kiểm tra lại toàn bộ và báo `fixesVerified: 3`.
- Chạy lại dry-run phải báo `pending: 0`.
- Kiểm tra trực tiếp trên cơ sở dữ liệu và giao diện web để đảm bảo khóa đáp án và lời giải hiển thị chính xác.
