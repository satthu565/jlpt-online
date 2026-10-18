# Quyết định Kỹ thuật I03: Quản trị nội dung nối API - Nhập gói, Câu hỏi, Đề thi, Kiểm duyệt, Media

- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Task ID**: I03
- **Assignment ID**: I03-5
- **Trạng thái**: REVIEW
- **Ngày**: 2026-10-18
- **Tài liệu tham chiếu**: `docs/multi-worker/AGENTS.md`, `docs/multi-worker/KE_HOACH_TRIEN_KHAI.md`, `docs/multi-worker/demo-data/README.md`, hợp đồng API Quản trị Nội dung

---

## 1. Bối cảnh & Mục tiêu

Task I03 yêu cầu kết nối toàn diện 12 trang quản trị nội dung của `apps/admin` với hệ thống API backend thực tế, thay thế triệt để toàn bộ dữ liệu mẫu tĩnh (hardcoded data / mock arrays), đáp ứng tiêu chuẩn kiểm soát `check:no-mock-ui`, và triển khai luồng người dùng hoàn chỉnh từ đầu đến cuối:
**Editor nhập gói `demo-n5-1.zip` qua giao diện -> Reviewer độc lập duyệt đề -> Admin xuất bản đề -> Đề thi hiển thị trên thư viện đề của Web (`/de-thi`).**

### Các trang thuộc phạm vi I03:
1. `/imports` (Quản lý & Tải lên Gói nhập Import v2, kiểm tra Standalone PDF, công cụ CSV/JSON)
2. `/questions` (Ngân hàng câu hỏi, soạn thảo RichText: ruby, star, gạch chân, đoạn văn, bảng biểu, nghe)
3. `/exams` (Quản lý danh sách đề thi, xem trước, xuất bản và gỡ xuất bản đề thi)
4. `/exams/mixed` (Quản lý đề trộn ngẫu nhiên theo ma trận kiến thức và điểm yếu)
5. `/blueprints` (Bản thiết kế cấu trúc đề thi N1-N5, bất biến phiên bản đã kích hoạt)
6. `/reviews` (Hàng đợi kiểm duyệt nội dung 4 mắt / tách biệt vai trò editor != reviewer)
7. `/reviews/explanations` (Kiểm duyệt lời giải và bản dịch tiếng Việt)
8. `/media` (Thư viện phương tiện âm thanh MP3/WAV và hình ảnh đề thi)
9. `/vocab` (Quản lý từ vựng và ngữ pháp theo cấp độ JLPT N1-N5)
10. `/cms` (Quản trị bài viết, trang đích và làm sạch XSS)
11. `/moderation/ai` (Giám sát nội dung AI, cảnh báo an toàn và chi phí token)
12. `/reports/content` (Quản lý báo lỗi câu hỏi từ học viên và sự cố âm thanh)

---

## 2. Các Quyết định Kỹ thuật Chính

### 2.1. Luồng Nhập gói Demo -> Duyệt -> Xuất bản (Acceptance 1)
- **Tải lên gói ZIP**: Tại `/imports`, khi Editor chọn tệp `demo-n5-1.zip`, giao diện mã hóa base64 hoặc gửi multipart/form-data tới `POST /api/v1/admin/imports`. Backend thực thi `ImportService.processPackageImport`, kiểm định chữ ký băm tệp, cấu trúc `import.json`, sơ đồ âm thanh và đối chiếu với blueprint N5 synthetic (`docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json`). Bản thảo đề thi và nhóm câu hỏi được tạo ở trạng thái `draft`.
- **Gửi duyệt**: Editor chuyển trạng thái các nhóm câu hỏi sang `in_review` qua `POST /api/v1/admin/reviews/submit` hoặc `POST /api/v1/admin/groups/:id/submit-review`.
- **Duyệt 4 mắt (Tách biệt vai trò)**: Reviewer đăng nhập bằng tài khoản độc lập (`reviewer@jlpt.local`), truy cập `/reviews`, kiểm tra đối chiếu trang nguồn và phê duyệt qua `POST /api/v1/admin/reviews/group_version/:id/v1/decision` với quyết định `approved`. Nếu người duyệt trùng với người nạp/sửa (editor == reviewer), API kiên quyết từ chối với status 403 Forbidden.
- **Xuất bản đề thi**: Quản trị viên (`publisher@jlpt.local`) truy cập `/exams`, kích hoạt xuất bản qua `POST /api/v1/admin/exams/:id/publish`. Backend kiểm tra toàn bộ câu hỏi đã duyệt, tạo snapshot bất biến và khóa đáp án an toàn không rò rỉ. Đề thi chuyển sang trạng thái `published` (v1).
- **Hiển thị trên Web**: Đề thi lập tức xuất hiện tại `/de-thi` trên ứng dụng học viên qua API công khai `GET /api/v1/exams`.

### 2.2. Xóa bỏ Mock Baseline & Làm sạch Dữ liệu Mẫu (Acceptance 2)
- Đã xóa toàn bộ hằng số mẫu (`SAMPLE_GROUP`, `SAMPLE_EXAM`, `SAMPLE_BLUEPRINT`, `art-01`, `voc-1`, `media_passage_sample`, v.v.) khỏi mã nguồn.
- Loại bỏ 6 mục khỏi `tests/integration/mock-ui-baseline.json`:
  - `/blueprints`
  - `/cms`
  - `/exams`
  - `/questions`
  - `/vocab`
  - `apps/admin/features/content/richtext-editor.tsx`
- Kiểm tra `pnpm check:no-mock-ui` đạt 0 vi phạm mới.

### 2.3. Trạng thái Đang tải, Rỗng, Lỗi & Phân quyền (Acceptance 4)
- Mọi trang đều có:
  - `[data-testid="<page>-loading"]`: Hiển thị spinner và chuỗi dịch đang tải khi nạp API.
  - `[data-testid="<page>-empty"]`: Trạng thái rỗng trực quan khi danh sách chưa có dữ liệu.
  - `[data-testid="<page>-error-alert"]`: Báo lỗi API rõ ràng kèm nút thử lại (`common.retry`).
  - `AdminGuard`: Tự động chặn truy cập chưa đăng nhập (401 đưa về `/login`) hoặc thiếu quyền vai trò (403 hiển thị `guard-forbidden`).

### 2.4. Trải nghiệm Responsive & Tri-Locale (Acceptance 5)
- Tất cả các trang được bao bọc trong container `overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto` với các class Tailwind đã cài đặt, đảm bảo không có thanh cuộn ngang trên cả viewport 390px (mobile) lẫn 1366px (desktop).
- Bổ sung từ điển bản dịch đầy đủ trong `apps/admin/messages/{vi,ja,en}.json` cho toàn bộ 12 màn hình, đảm bảo không có key dịch thô xuất hiện ở bất kỳ locale nào.

### 2.5. Đồng bộ Xác thực & Duy trì Phiên Đăng nhập (Auth Persistence)
- `AdminAuthProvider` duy trì phiên qua `localStorage` và đồng bộ tức thời với `apiClient.setAuth()`.
- Sửa lỗi race condition khi kiểm tra `/api/v1/auth/session`: Vì endpoint này là `@Public()` nên không xóa sạch phiên cục bộ khi API trả về `{ user: null }`; chỉ xóa phiên khi server chủ động phản hồi `401 Unauthorized`.
- `AdminApiClient` tự động nạp token và thông tin người dùng từ `localStorage` khi chạy trong ngữ cảnh trình duyệt nếu biến instance chưa được gán thủ công, đảm bảo mọi lệnh gọi API từ các component đều có header `Authorization: Bearer <token>` chính xác.

### 2.6. Khắc phục Race Condition & Chống Khóa Tài khoản TOTP trên E2E Đa Trình duyệt
- Hợp nhất cơ chế theo dõi time-step TOTP (`sharedUsedTotpStepMap`) ở phạm vi toàn file kiểm thử E2E với bộ đệm an toàn `+1500ms`, ngăn chặn lỗi phát lại mã cũ ("Mã TOTP đã được sử dụng") khi các trình duyệt khác nhau chạy liên tiếp.
- Trong kiểm thử phủ định mã TOTP sai (`000000`), sau khi xác nhận thông báo lỗi, lập tức nạp mã TOTP hợp lệ để reset bộ đếm `failedAttempts` về 0, loại bỏ triệt để nguy cơ tài khoản nhân sự bị khóa tự động 15 phút làm ảnh hưởng đến các bài test phía sau.

---

## 3. Bằng chứng Kiểm thử & Nghiệm thu
- `pnpm test:admin`: Kiểm thử đơn vị và tích hợp giao diện đạt 100% (14 files, 168 tests).
- `pnpm check:no-mock-ui`: Đạt, không có vi phạm mới ngoài baseline.
- `pnpm typecheck` & `pnpm lint`: Đạt 0 lỗi.
- `pnpm test`: 100% đạt (16 files, 144 tests).
