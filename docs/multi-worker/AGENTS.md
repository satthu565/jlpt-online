# Quy tắc triển khai JLPT với sáu worker

## Phạm vi và ưu tiên

Phạm vi V1–V4 và lịch 6 worker/7 ngày giữ nguyên, nhưng theo chỉ thị mới KHÔNG xây OCR, parser PDF hay model trích xuất trong ứng dụng. Bạn tự chuẩn bị import v2 rồi tải lên; không tích hợp agent đọc PDF vào hệ thống. Trong 375 mã nguồn,363 yêu cầu là phần ứng dụng và 12 yêu cầu trích xuất là EXTERNAL_PREPARATION. Không tính chúng vào code hoàn tất. Hợp đồng đầu vào là [CHUAN_DU_LIEU_NHAP.md](CHUAN_DU_LIEU_NHAP.md). Không áp dụng lại yêu cầu cũ trong nguon/.

Ưu tiên: chỉ thị chủ dự án > phạm vi/tiêu chí nghiệm thu trong thư mục này > schema/OpenAPI/events được duyệt ở F02 và cập nhật có version > task hiện hành > nguyên tắc kiến trúc > chi tiết gốc để truy vết. Mâu thuẫn không giải quyết bằng bỏ test hay bỏ quyền. Đổi hợp đồng ảnh hưởng worker khác phải có PR hợp đồng và danh sách tác động trước khi triển khai consumer.

## Một task một lần cấp việc

Coordinator là nơi cấp task và trạng thái duy nhất. Worker chỉ làm task được cấp có taskId, workerId, assignmentId, baseSHA, branch, allowedPaths, locks và acceptance. Không tự nhận việc từ bảng Markdown hoặc file nguồn. Không spawn agent phụ vượt sáu worker hoạt động; phân tích/review cũng tính tài nguyên và quota. Một worker không sửa hai task cùng lúc.

Worker sửa và commit trong clone riêng; coordinator push/PR/merge bằng credential riêng. Không dùng `gh`, push/tag/merge, SSH production, đọc secret coordinator hoặc tài khoản worker khác. User worker không có sudo hoặc Docker socket toàn host. Build cần Docker qua executor có policy/namespace; không xem user khác là sandbox nếu còn chung quyền root qua Docker.

## Quy trình

1. Đọc task, contract, feature rows và quyết định provider liên quan; xác nhận deps đã merge.
2. Viết test logic theo acceptance; dùng schema và fixtures chung, không tự bịa API.
3. Code trong allowedPaths. Ngoài quyền: tạo yêu cầu owner; coordinator cấp quyền tạm có log hoặc tách task hợp đồng.
4. Commit thường xuyên; trước pause/timeout/quota lưu patch, untracked manifest và checkpoint qua coordinator. Không reset/clean workspace còn checkpoint chưa nhận.
5. Chạy task checks và common gates. Missing command/test/provider là trạng thái chưa đạt, không bỏ qua âm thầm.
6. Gửi kết quả JSON và evidence; reviewer khác tác giả kiểm tra đúng headSHA/baseSHA. Thay code hoặc base cần rerun/review phù hợp. Unclear không phải approve.
7. Chỉ coordinator đặt DONE khi PR merge và các kiểm tra liên quan đạt; feature DONE cần đủ evidence của riêng feature.

## Quy tắc code và dữ liệu

- TypeScript strict, không dùng any/ts-ignore để qua lỗi; tên ASCII, commit Conventional Commits, body `Task: <taskId>` và `Features: ...`.
- Công cụ kiểm tra gói bàn giao có thể dùng Python chuẩn trên máy chủ dự án; ứng dụng dùng schema/validator TypeScript, không cài thư viện nhận dạng PDF. F01 xác minh và ghim dependencies thực tế, không latest trong CI production. Cần thêm thư viện: worker sửa `package.json` trong thư mục được phép của mình rồi chạy `pnpm install` để cập nhật `pnpm-lock.yaml` (không sửa lockfile bằng tay). Coordinator tự cấp khóa `dependency-lock` cho task trước bước kiểm tra, task chờ nếu khóa đang bận; reviewer không coi thay đổi manifest kèm lockfile tương ứng là vi phạm khóa.
- UTC trong DB/events, timezone người dùng cho SRS/planner/streak. Nội dung Nhật NFC, không biến NFKC vào nội dung gốc.
- Snapshot/answer key/content version bất biến; không lộ đáp án trước quyền xem, bao gồm qua AI/export/transcript/cache.
- Thi thật dùng deadline server, lease, seq, transaction ACK; event thi đồng loạt giữ embargo đến lúc công bố.
- Outbox cùng transaction, consumers idempotent, retry có backoff; không tự đồng nhất exactly-once với network delivery.
- Sáu coding worker độc lập với service app `worker`, `media-worker` và `API_WORKERS`; không tạo `apps/ocr-worker`.
- Các phần SRS, mix, scoring là hàm thuần; AI không quyết định điểm thi.
- Toàn bộ UI vi/ja/en có key, không nút giả, trợ năng cơ bản và trạng thái loading/error/empty đúng.
- Giao diện chỉ được nộp khi trang đọc và ghi dữ liệu qua API thật. Cấm mảng dữ liệu viết cứng, `ALL_SAMPLE_*`, đăng nhập giả, `page.route` hay mock fetch trong code chạy thật và trong E2E nghiệm thu. Dữ liệu mẫu chỉ được nằm trong file test hoặc seed của API. `pnpm check:no-mock-ui` phải pass. Reviewer trả CHANGES (P1) khi thấy trang trong phạm vi task còn dữ liệu giả, kể cả khi test đơn vị đều đạt.

## Những việc cần chủ dự án

Tài khoản/dịch vụ/tăng chi phí, legal/license, production/DNS/merchant live, ngày thi chính thức và rủi ro ảnh hưởng người dùng thật. Làm phần độc lập trước, báo `BLOCKED_EXTERNAL` rõ externalId và task ảnh hưởng. Không lấy im lặng làm phê duyệt. Quota dùng theo tài khoản đúng quyền; không tự động đổi danh tính để né hạn mức.

## Báo cáo cuối phiên

```json
{"taskId":"N02","assignmentId":"from-coordinator","status":"REVIEW","headSha":"actual","baseSha":"actual","featureIds":[],"testFiles":[],"runs":[],"artifacts":[],"blockers":[],"checkpoint":"path-or-null","summary":"kết quả thực tế"}
```

Không sửa checklist tiến độ dùng chung, catalog hoặc `nguon/` trong PR tính năng. Quyết định riêng lưu `docs/decisions/<taskId>-<slug>.md`; coordinator tổng hợp thay vì tất cả append một file.
