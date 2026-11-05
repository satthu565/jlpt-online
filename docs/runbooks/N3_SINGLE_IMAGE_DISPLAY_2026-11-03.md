# N3: mỗi câu chỉ hiển thị một ảnh — 03/11/2026

Kiểm tra trực quan sau PR #193 phát hiện cùng hình được render từ cả `passage` và `group.media`. Dữ liệu cũ cũng dùng cả hai nơi nên kiểm tra chỉ dựa vào snapshot/bytes chưa phát hiện được lỗi hiển thị này.

`deduplicate-n3-images.ts` dùng manifest đã duyệt của PR #193, chỉ chuyển 18 passage chứa duy nhất một ảnh sang liên kết `group_media`, theo mẫu sửa N1 Q68 đã có trong repo. Không đổi ảnh, câu hỏi, phương án, đáp án hoặc lời giải. Từ chối passage có chữ, không được xóa nội dung văn bản.

Mặc định dry-run; `--apply` bắt buộc `N3_REPAIR_BACKUP`, `N3_REPAIR_PLAN` và `DATABASE_URL`. Manifest được kiểm SHA256. Tạo phiên bản nội dung/lời giải mới, giữ bản cũ, liên kết media có provenance job_id và audit log. Nếu dừng giữa phiên bản hóa và liên kết media, chạy lại sẽ bổ sung liên kết và xuất bản phần còn thiếu. Xác minh một liên kết cho mỗi hình, không còn hình inline và không còn đề cần xuất bản.

Đây là sửa dữ liệu, không thay code giao diện, không có preview :3210. Chỉ áp dụng sau khi CI xanh và có backup mới. Phải mở phòng thi bằng tài khoản QA, chụp ảnh và xác nhận mỗi hình chỉ xuất hiện một lần.

## Kiểm tra trước PR

- Lint, typecheck, build, check:ui-primitives, check:no-mock-ui và docs:map đạt; 9 test riêng đạt.
- `pnpm test` gặp lỗi môi trường đã có ở `tests/integration/dac-ta-runner.test.ts` Scenario 10; CI chuẩn chạy lại tất cả.
- Trên database thử sau PR #193: 18 nhóm được phiên bản hóa, 7 đề xuất bản lại, 18 ảnh xác minh. Chạy lại: pendingPassages=0, missingLinks=0, không có phiên bản/xuất bản mới.
- Sau áp dụng bước này, dùng dry-run `deduplicate-n3-images.ts` để kiểm tra; manifest đầu tiên cố ý từ chối nội dung passage đã được bước này thay thế.
