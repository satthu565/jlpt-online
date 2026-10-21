# Bài kiểm tra đầu vào cho agent mới

Một agent mới (Codex, Cursor, Antigravity…) phải làm bài này trước khi nhận việc thật.

**Cách giao bài:** gửi cho agent nguyên văn câu dưới đây, kèm 10 câu hỏi và việc thử. Không gửi đáp án.

> Đọc AGENTS.md và các tài liệu nó trỏ tới, rồi trả lời các câu hỏi sau. Ghi rõ file nào cho bạn câu trả lời.

**Chấm bài:**

- Agent trả lời sai câu nào, nghĩa là tài liệu ở chỗ đó còn thiếu hoặc khó tìm.
- Sửa tài liệu trước (thêm vào `AGENTS.md` hoặc file liên quan), rồi mới cho agent làm lại.
- Đạt khi đúng ít nhất 9/10 câu và việc thử qua CI ngay vòng đầu.

## Câu hỏi

1. Thêm một cột vào bảng `lexical_entries` thì phải sửa những file nào?
2. Tính năng đọc thành tiếng (TTS) đang ở trạng thái nào? Bật lại bằng cách nào?
3. Trang admin mới cần khai báo menu và quyền ở đâu? Trang đó bọc trong component nào?
4. Vì sao không được chạy `pnpm format` hay `prettier --write`?
5. Những lệnh nào bắt buộc chạy trước khi nộp?
6. Giao diện được dùng `<button>` thô không? Dùng gì thay thế?
7. Thêm một chuỗi giao diện thì phải sửa mấy file? Đó là những file nào?
8. Bạn có được merge PR của mình khi CI đã xanh không?
9. Endpoint `GET /api/v1/admin/lexicon/kanji` cho vai trò nào gọi? Bạn tra ở đâu?
10. E2E của bạn tạo một lượt thi cho học viên mẫu. Cần làm gì để không làm hỏng test khác?

## Việc thử

Sửa bảng ở trang admin `/kanji` (`apps/admin/app/kanji/page.tsx`):

- cột "Số nét" và "Cấp độ" hiện "—" khi giá trị là null, thay vì ô trống;
- nếu trang chưa có dòng "Tổng: N chữ" phía trên bảng thì thêm vào, lấy N từ `total` của API.

Yêu cầu:

- chuỗi mới có đủ vi, ja, en;
- có test;
- chạy đủ các cổng kiểm tra;
- mở PR, mô tả các lệnh đã chạy và kết quả.

## Đáp án (dành cho người chấm)

1. Sửa `apps/api/src/db/schema.ts`. Thêm migration `apps/api/src/db/migrations/00NN_*.sql` và dòng tương ứng trong `meta/_journal.json`. Sửa số đếm trong `apps/api/src/db/db.test.ts`. Sau đó chạy `pnpm docs:map`. Nguồn: `DATABASE.md`, `docs/agent-guides/them-bang-cot-db.md`.
2. TTS đang ẩn. Bật bằng `NEXT_PUBLIC_FEATURE_TTS=1` lúc build web, và cần có nhà cung cấp TTS. Nguồn: `FEATURES.md`, `apps/web/lib/features.ts`.
3. Khai báo trong `apps/admin/lib/navigation.ts` (`requiredRoles`). Trang bọc trong `<AdminGuard pathname requiredRoles>`. Nguồn: `apps/admin/AGENTS.md`.
4. Repo không có cấu hình prettier, nên chạy sẽ đổi nháy đơn thành nháy kép trên toàn file và làm diff phình to (#118). Nguồn: `PITFALLS.md`.
5. `lint`, `typecheck`, `test`, `build`, `check:ui-primitives`, `check:no-mock-ui`, `docs:map`. Có giao diện hoặc API thì chạy thêm E2E staging. Nguồn: `AGENTS.md`, `kiem-tra-truoc-khi-nop.md`.
6. Không được. Dùng component `@jlpt/ui` (`Button`…). `check:ui-primitives` sẽ chặn thẻ thô.
7. Ba file: `messages/vi.json`, `ja.json`, `en.json` của app đó.
8. Không. Chủ dự án bật merge. Nguồn: `SECURITY_RULES.md`.
9. `admin`, `editor`, `reviewer`. Tra trong `PROJECT_MAP.generated.md`, mục API `vocab`.
10. Dọn trong `afterEach`, ví dụ nộp bài. Nguồn: `PITFALLS.md`, mục E2E.
