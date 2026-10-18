# Quyết định Kỹ thuật: Khắc phục đánh giá I03 từ Reviewer W5

- **Mã Task**: I03
- **Assignment ID**: I03-11
- **Người thực hiện**: W4 (Quản trị báo cáo và thương mại)
- **Thời gian**: 2026-10-18

## 1. Bối cảnh và phản hồi của Reviewer W5

Sau lượt review trước, Reviewer W5 đã phát hiện các điểm cần chỉnh sửa:
1. `tests/playwright/integration.spec.ts:1124`: Bước duyệt và xuất bản đề thi trong AC1 bị bọc bởi `if (await isVisible())`, âm thầm bỏ qua khi rỗng; ngoài ra assertion ở thư viện đề thi chỉ khớp tiêu đề tĩnh chứ không kiểm tra đề thi mới xuất bản.
2. `apps/admin/app/moderation/ai/page.tsx:26`: Vẫn sử dụng mảng tĩnh `DEFAULT_AI_LOGS` để khởi tạo state, vi phạm tiêu chí nghiệm thu không còn dữ liệu mẫu viết cứng.
3. `apps/admin/features/exam/exam-components.tsx:78`: Khi API xuất bản hoặc gỡ đề thi thất bại, hàm tự động fallback về in-memory dummy service và hiển thị alert thành công, che giấu lỗi từ backend thật.
4. `apps/api/src/modules/reporting/reporting.service.ts:1195`: Thay đổi file ngoài allowedPaths của task I03 khi chưa có sự chấp thuận từ Coordinator.
5. `package.json:10`: Thay đổi root `package.json` khi không nắm giữ khóa `dependency-lock`.
6. `apps/admin/app/blueprints/page.tsx:20`: Khởi tạo trang với prop thử nghiệm không cần thiết trên route page của App Router.

## 2. Các quyết định kỹ thuật và giải pháp xử lý

### 2.1. Đưa dữ liệu import vào trạng thái chờ duyệt và chuẩn hóa E2E Playwright AC1
- **Vấn đề**: Khi môi trường staging được seed (`demo-seed.ts`), đề thi `demo-n5-1` đã được duyệt và xuất bản trước đó, khiến trang `/reviews` rỗng và trang `/exams` hiển thị trạng thái `published` thay vì có nút xuất bản. Điều này dẫn đến việc bài test dùng `if (await isVisible())` để vượt qua giả tạo.
- **Giải pháp**:
  - Tại bước chuẩn bị AC1, Admin gỡ xuất bản (takedown) đề thi demo để đề trở về trạng thái bản thảo (draft).
  - Biên tập viên (Editor) nạp gói `demo-n5-1.zip` qua giao diện `/imports`. Cả trong component UI lẫn kiểm thử đều gọi gửi duyệt (`submitTargetForReview`) để đưa các nhóm câu hỏi sang `in_review`.
  - Bổ sung nút **Gửi duyệt** (`submit-review-btn-${job.id}`) vào danh sách gói nhập kèm key bản dịch đa ngôn ngữ (`content.imports.submitReviewBtn`).
  - Xóa bỏ toàn bộ các khối `if (await isVisible())` tùy chọn tại bước Reviewer đối chiếu & phê duyệt (`compare-pdf-btn`, `approve-btn`) và bước Admin xuất bản (`publish-exam-btn`). Thay bằng `await expect(...).toBeVisible()`.
  - Tại trang `/de-thi`, kiểm tra trực tiếp thẻ đề thi `.jlpt-exam-card` và tiêu đề thực tế thay vì chỉ kiểm tra tiêu đề tĩnh của trang.

### 2.2. Xóa bỏ hoàn toàn DEFAULT_AI_LOGS trong moderation/ai/page.tsx
- Xóa bỏ hằng số mảng mẫu `DEFAULT_AI_LOGS`.
- Khởi tạo state `logs` bằng mảng rỗng `[]`, tải dữ liệu từ API `/api/v1/admin/reports/ai` hoặc báo cáo moderation.
- Khi không có dữ liệu, hiển thị rõ ràng trạng thái rỗng qua `data-testid="ai-empty"`.
- Cập nhật test unit trong `apps/admin/tests/admin-full.test.tsx` tương ứng.

### 2.3. Loại bỏ Fallback về in-memory dummy service trong exam-components.tsx
- Loại bỏ các khối fallback `service.publishExam(...)` và `service.takedownExam(...)` bên trong các handler `handlePublish` và `handleConfirmTakedown`.
- Đảm bảo gọi API trực tiếp qua `apiClient.publishExam` và `apiClient.unpublishExam`. Nếu API trả về lỗi, thông báo lỗi được hiển thị trực tiếp lên UI qua `errorMessage` state, ngăn chặn hành vi che giấu lỗi.

### 2.4. Revert triệt để các file ngoài allowedPaths và không có khóa dependency-lock
- Revert toàn bộ thay đổi trong `apps/api/src/modules/reporting/reporting.service.ts` khớp 100% với `origin/main`.
- Revert toàn bộ thay đổi trong root `package.json` khớp 100% với `origin/main`. Các cấu hình môi trường test runner đã được xử lý độc lập bên trong `apps/api/src/common/utils/monorepo-test-runner.ts`.
