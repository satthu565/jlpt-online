# Quyết định và ý muốn của chủ dự án

Tóm tắt những điều agent phải theo. Lý do chi tiết từng task nằm ở `docs/decisions/<mã task>-*.md`.

## Sản phẩm

| Quyết định | Nguồn |
|---|---|
| Ứng dụng **không** có OCR hay bộ đọc PDF. Đề được chuẩn bị bên ngoài thành gói nhập (import v2), rồi tải lên qua admin. | `docs/multi-worker/CHUAN_DU_LIEU_NHAP.md`, `docs/import-format/` |
| Chủ dự án có toàn quyền với nội dung đề JLPT trong dự án. Không thêm ghi chú bản quyền. | Chỉ thị chủ dự án |
| Ba tính năng ẩn ở giai đoạn đầu: trang chính sách, TTS, AI giải thích. Code vẫn giữ, bật lại bằng cờ. | `docs/decisions/feature-flags-phase-1.md` |
| Tiếng Việt là ngôn ngữ chính; giao diện có đủ vi/ja/en. Route web viết tiếng Việt không dấu. | F04 |
| Đỗ/trượt và điểm sàn theo quy tắc JLPT thật. Bảng quy đổi có phiên bản; kết quả cũ giữ phiên bản cũ. | P01, P03, P05 |
| Hán Việt tính theo từng từ (4 lớp), không ghép âm từng chữ. Kokuji để trống, không đoán. | H01 |
| AI không quyết định điểm thi. | Quy tắc gốc |

## Kỹ thuật

| Quyết định | Nguồn |
|---|---|
| Giao diện dùng Radix + HeroUI styles (CSS) qua `@jlpt/ui`. Không dùng `@heroui/react`. Không dùng thẻ thô. | PR #111, #113 (thay shadcn của D00–D10) |
| Giao diện chỉ dùng API thật, không dữ liệu giả (có cổng `check:no-mock-ui`). | I07, `docs/multi-worker/AGENTS.md` |
| Thi thật: deadline phía server, lease, `seq`, ACK theo transaction. | C01, C03 |
| Ảnh chụp đề, đáp án và phiên bản nội dung là bất biến. | C02 |
| Tác vụ nền qua outbox trong cùng transaction; consumer idempotent. | N02, L06 |
| Nhân sự bắt buộc 2FA; tài khoản nhân sự ban đầu tự tạo khi API khởi động. | I08–I10 |
| Unit test API dùng PGlite; E2E chạy trên staging thật (Playwright). | I00, C02 |
| PR chỉ chạy staging trên Chromium; main chạy đủ 5 trình duyệt. | Chỉ thị chủ dự án, 20/10/2026 |

## Cách làm việc

| Ý muốn | Ghi chú |
|---|---|
| Agent tự làm, chỉ hỏi khi thật sự cần: tài khoản, dịch vụ trả phí, quyết định sản phẩm. | Chủ dự án chỉ xem kết quả |
| Agent không merge PR. Chủ dự án bật merge. | Xem [SECURITY_RULES.md](SECURITY_RULES.md) |
| Tự chạy E2E trên máy ảo trước khi đẩy, vì mỗi vòng CI mất khoảng 30 phút. | Xem [OPERATIONS.md](OPERATIONS.md) |
| Báo giao diện xong chỉ khi đã mở trang thật và chụp màn hình. Test đạt chưa đủ. | |
| Không chờ "hết ngày" theo kế hoạch: phần phụ thuộc gộp xong thì làm việc tiếp theo ngay. | |
| Báo cáo cho chủ dự án viết tiếng Việt, ngắn, nói rõ cần chủ dự án làm gì. | |
