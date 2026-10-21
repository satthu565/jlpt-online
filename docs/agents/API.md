# API

NestJS 12 trên Fastify, tiền tố toàn cục `/api/v1`, cổng 4000. Hợp đồng nằm ở `contracts/openapi.yaml`; sự kiện ở `contracts/events.schema.json`.

## Module (`apps/api/src/modules/`)

| Module | Việc chính |
|---|---|
| `auth` | Đăng ký, đăng nhập, phiên, xác minh email, đặt lại mật khẩu, 2FA nhân sự |
| `user` | `/me`, hồ sơ, quyền riêng tư, xuất và xóa dữ liệu |
| `exam` | Danh sách đề, chi tiết, xuất bản, luyện tập trộn |
| `attempt` | Phòng thi: bắt đầu, lưu đáp án (`seq`, lease), nộp bài |
| `scoring` | Chấm điểm, bảng quy đổi |
| `blueprint` | Cấu trúc đề theo cấp (`admin/blueprints`) |
| `question-bank` | Ngân hàng câu hỏi |
| `import` | Nhập gói đề (`admin/imports`) |
| `review` | Duyệt nội dung, lời giải |
| `license` | Giấy phép nội dung |
| `media`, `storage` | Tải lên và phục vụ media có token |
| `vocab` | Từ điển, tra nhanh, Hán Việt, ngữ liệu, admin từ điển/kanji |
| `learning`, `planner` | Sổ tay, flashcard, kế hoạch học |
| `stats` | Thống kê học viên |
| `classroom`, `community` | Lớp học, sự kiện thi, thảo luận |
| `gamification` | Thành tích, thử thách, bảng xếp hạng |
| `payment`, `entitlement` | Gói, thanh toán, quyền dùng |
| `ai` | Giải thích bằng AI, hạn mức, kiểm duyệt |
| `notification`, `email` | Thông báo, email |
| `cms` | Bài viết, landing page, FAQ |
| `experiment` | Thử nghiệm A/B |
| `reporting` | Báo cáo admin |
| `admin`, `audit` | Endpoint quản trị chung, nhật ký thao tác |
| `outbox` | Sự kiện nền |
| `turnstile` | Chống bot |
| `health` | Kiểm tra sống |

## Quy ước

- **Quyền:** endpoint mặc định cần đăng nhập. Dùng `@Public()` để mở cho khách, `@Roles('admin', 'editor')` để giới hạn vai trò, `@RequireTotp()` cho thao tác nhân sự nhạy cảm.
- **Giới hạn tần suất:** `@RateLimit({...})` cho endpoint công khai hoặc tốn tài nguyên.
- **Kiểm tra đầu vào:** schema Zod, dùng `new ZodValidationPipe(Schema)` hoặc filter riêng của module. Tham số UUID dùng `uuid-param.pipe.ts`.
- **Lỗi:** ném exception của Nest; `ApiExceptionFilter` chuẩn hóa thành `{ code, message, details, requestId }`.
- **Nhật ký:** thao tác thay đổi dữ liệu của nhân sự thì gọi `AuditService.recordAction(...)` để ghi vào `operator_actions`.
- **Body rỗng:** request POST/PUT/PATCH không có body thì client không đặt `Content-Type: application/json`, nếu không Fastify sẽ báo lỗi. Xem [PITFALLS.md](PITFALLS.md).
- **Đáp án:** không trả đáp án hay lời giải trước khi người dùng được phép xem. Có test `no-answer-leak`.
- **Hợp đồng:** đổi request hoặc response mà web/admin dùng thì cập nhật `contracts/openapi.yaml`, rồi chạy `pnpm contracts:check`.

## Viết test

Mẫu theo `apps/api/src/modules/vocab/vocab.test.ts`:

- tạo PGlite bằng `createDbClient()` và gọi `runMigrations()`;
- khởi tạo service và controller trực tiếp;
- kiểm tra metadata quyền bằng `Reflect.getMetadata(ROLES_KEY | IS_PUBLIC_KEY | RATE_LIMIT_KEY, handler)`.

Chạy riêng một file: `pnpm vitest run apps/api/src/modules/<module>/<file>.test.ts`.

## Thêm endpoint

Từng bước: [apps/api/AGENTS.md](../../apps/api/AGENTS.md).
