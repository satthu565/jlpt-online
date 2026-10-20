# Quyết Định Kỹ Thuật I07: Chuẩn Hóa Bộ Kiểm Thử Tích Hợp Đa Trình Duyệt Staging

- **Mã quyết định:** I07-cross-browser-staging-integration-hardening
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Task ID:** I07
- **Assignment ID:** I07-2
- **Nhánh:** `task/I07`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15

---

## 1. Bối cảnh và Vấn đề Phát Hiện Từ Lượt Chạy Staging Trước

Trong vòng xác minh tích hợp `sudo -n /usr/local/bin/jlpt-stage-test check-all`, hai vấn đề chính phát sinh làm gián đoạn kiểm thử:
1. **Lỗi xuất bản đề thi trong `I07-AC3`**:
   - Khi chạy luồng dọc xuyên suốt (Editor import -> Reviewer duyệt -> Admin xuất bản), Admin truy cập `/exams` và tìm nút xuất bản đầu tiên thông qua selector chung `button[data-testid^="publish-exam-btn-"].first()`.
   - Do danh sách đề thi `schema.exams` được sắp xếp theo thời gian tạo mới nhất (`orderBy(desc(schema.exams.createdAt))`), các đề thi trộn (mixed exams) hoặc luyện tập (practice exams) sinh tự động từ các suite kiểm thử trước đó (`I13`) xuất hiện ở hàng đầu tiên của bảng. Các đề này chưa liên kết câu hỏi qua `exam_items`, dẫn tới lỗi API 400: `BadRequestException: Đề thi ... không có câu hỏi`.
   - Giao diện Admin hiển thị `data-testid="exam-error-alert"` thay vì `data-testid="status-alert"`, khiến bước kiểm thử hết thời gian chờ (15s) và kích hoạt retry.

2. **Độ trễ đồng bộ TOTP và nguy cơ quá thời gian chờ (Flakiness) trên môi trường di động**:
   - Các bài kiểm tra nhân sự đăng nhập và xác thực TOTP (`I12` tại dòng 1139 và `AC4` tại dòng 1539) có cơ chế chờ bước nhảy 30 giây của mã xác thực RFC 6238 (`waitForNextTotpStep`) để tránh va chạm mã cũ.
   - Khi chạy trên các project giả lập di động (`Mobile Safari`, `Mobile Chrome`) hoặc khi phải chờ đồng bộ TOTP window, thời lượng kiểm thử chạm ngưỡng timeout mặc định 60s, dẫn đến trạng thái retry / flaky.

---

## 2. Giải Pháp Triển Khai

1. **Định danh chính xác dòng đề thi demo N5 (`demo-n5-1`) trong quy trình xuất bản**:
   - Trong cả hai suite `I03` và `I07-AC3`, thay thế việc chọn nút xuất bản/gỡ xuất bản ngẫu nhiên bằng cách khoanh vùng chính xác dòng chứa đề thi mẫu:
     ```typescript
     const demoExamRow = adminPage.locator('tr:has-text("demo-n5-1"), tr:has-text("Đề demo N5")').first();
     ```
   - Thao tác gỡ xuất bản (`takedown-exam-btn-`) và xuất bản (`publish-exam-btn-`) chỉ thực hiện trên `demoExamRow`.
   - Bảo đảm đề thi được chọn luôn là đề thi N5 hợp lệ có đầy đủ 29 câu hỏi, đáp án và tài sản âm thanh, xuất bản thành công với phiên bản tăng dần mà không bao giờ va chạm với các đề sinh tự động khác.

2. **Mở rộng thời gian chờ kiểm thử lên 90 giây cho các bước có xác thực TOTP**:
   - Thiết lập `test.setTimeout(90_000)` cho bài test `I12` (dòng 1139) và `AC4` (dòng 1539).
   - Đảm bảo thời gian kiểm thử bao phủ trọn vẹn cả chu kỳ 30s của cửa sổ TOTP kế tiếp cùng thời gian chuyển trang và xác thực tài khoản.

---

## 3. Kết Quả Kiểm Chứng

- `pnpm check:no-mock-ui`: ĐẠT (0 vi phạm, baseline rỗng).
- `pnpm typecheck`: ĐẠT (20/20 packages clean).
- `pnpm lint`: ĐẠT (13/13 packages clean).
- `pnpm test`: ĐẠT (toàn bộ monorepo test runner 20 packages passing).
- `pnpm build`: ĐẠT (toàn bộ production bundle Next.js, API, media-worker build clean).
