# Dọn lỗi nội dung JLPT N1–N5 — 02/11/2026

Script: `apps/api/src/scripts/fix-confirmed-content-issues.ts`.

## Phạm vi

- 49 phép sửa nội dung đã xác nhận trong 30 đề, gồm lỗi OCR/kana/trợ từ, bảng dữ liệu mâu thuẫn và câu có nhiều đáp án do nhập sai lựa chọn.
- Tạo phiên bản nhóm/câu hỏi mới; không ghi đè phiên bản đã xuất bản.
- Xuất bản phiên bản đề mới để snapshot công khai nhận nội dung đã sửa.
- Không tự dựng lại hình, audio, transcript hoặc bài đọc đang mất hoàn toàn.

## Các sửa đổi biên tập quan trọng

- N3 12/2012 Q62: khôi phục tên ga `田村駅` trong lựa chọn nhiễu để chỉ còn đáp án 3 đúng.
- N5 7/2017 Q54 và N5 2010–2011 Q54: `の` → `が`, tạo câu đích `日本語がかんたんな本` và loại cách xếp thứ hai.
- N3 7/2021 Q65: sửa câu hỏi để hỏi trực tiếp nội dung `面白いのは`.
- N2 12/2013 Q74–75: thống nhất hạn nhận bài là 17/12/2013.
- N3 7/2022 Q71–72: bỏ thời lượng 90 phút bị chèn nhầm vào bài học thử 60 phút.

## Chạy an toàn

```bash
pnpm --filter @jlpt/api build
node apps/api/dist/src/scripts/fix-confirmed-content-issues.js

CONFIRMED_CONTENT_BACKUP=/duong-dan/backup.dump \
  node apps/api/dist/src/scripts/fix-confirmed-content-issues.js --apply
```

Chế độ mặc định là dry-run. `--apply` yêu cầu backup tối thiểu 1 MiB, kiểm tra đúng một chuỗi cũ hoặc chuỗi mới cho mỗi phép sửa, tạo audit log và tự đọc lại toàn bộ nội dung sau khi xuất bản.
