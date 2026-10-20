# Quyết Định Kiến Trúc I07: Nghiệm Thu Tích Hợp Toàn Bộ Và Khóa Chặn Dữ Liệu Giả

**Mã quyết định:** I07-integration-acceptance-and-zero-mock-lock  
**Worker:** W6 (Hạ tầng CI và kiểm chứng)  
**Ngày:** 2026-10-19  
**Trạng thái:** ACCEPTED  

---

## 1. Bối cảnh và Vấn đề

Tại mốc Ngày 8 của kế hoạch phát triển 6 worker, toàn bộ các tính năng thành phần đã được hoàn thiện qua các task từ I00 đến I16. Để sẵn sàng cho phát hành sản phẩm, hệ thống cần:
1. Đảm bảo toàn bộ mã nguồn giao diện (`apps/web`, `apps/admin`) đã ngắt kết nối hoàn toàn khỏi các mảng mẫu, hằng số giả lập (`SAMPLE_*`, `MOCK_*`), biến mẫu (`ALL_SAMPLE`), hoặc chế độ xác thực giả (`mode: 'mock'`).
2. Khóa chặn vĩnh viễn tệp `tests/integration/mock-ui-baseline.json` về trạng thái rỗng `[]`, biến lệnh `check:no-mock-ui` thành cổng chặn cứng không thể vượt qua trong CI nếu phát hiện bất kỳ dữ liệu giả nào.
3. Chạy kiểm thử E2E Playwright trên môi trường staging thực tế với đầy đủ các container dịch vụ (Web, Admin, API, Postgres, Redis, Mailpit), bảo đảm 100% các trang không có lỗi server 5xx, không hiện key dịch thô (raw translation keys), và đáp ứng chuẩn hiển thị responsive.
4. Kiểm chứng các luồng người dùng cốt lõi từ đầu đến cuối: Học viên (đăng ký -> làm bài -> xem kết quả), Ban biên tập và Quản trị (nạp gói -> duyệt 4 mắt -> xuất bản -> thư viện đề thi), và Giám sát hệ thống (quản lý người dùng, nhật ký kiểm toán).

## 2. Các Lựa Chọn và Quyết Định

### Quyết định 1: Khóa cứng baseline rỗng tuyệt đối trong `check-no-mock-ui.ts`
- **Phương án lựa chọn:** Cập nhật hàm `runNoMockUiCheck()` và entrypoint `main()` trong `tests/integration/check-no-mock-ui.ts` để kiểm tra `baselineCount === 0`. Nếu tệp `mock-ui-baseline.json` chứa bất kỳ mục nào (kể cả vi phạm đã biết), lệnh kiểm tra lập tức báo lỗi và trả về exit code 1.
- **Lý do:** Khi toàn bộ các trang đã kết nối API thật, không còn lý do cho phép ngoại lệ nào tồn tại trong baseline. Bất kỳ ngoại lệ nào cũng là rủi ro rò rỉ dữ liệu giả ra môi trường thực tế.

### Quyết định 2: Tự động hóa giám sát 5xx và key dịch thô trên toàn bộ 59 trang Web và Admin
- **Phương án lựa chọn:** Bổ sung suite kiểm thử `Platform Full Scope Integration & Zero Mock Gate Suite (I07)` vào `tests/playwright/integration.spec.ts`. Suite này sử dụng `page.on('response')` để tự động gom và kiểm tra tất cả các phản hồi HTTP/API, đồng thời dùng biểu thức chính quy quét qua toàn bộ 17 namespace ngôn ngữ của Web (`common`, `theme`, `locale`, `a11y`, `auth`, `account`, `home`, `notebook`, `flashcards`, `srs`, `planner`, `classroom`, `community`, `billing`, `seo`, `practice`, `analytics`) và 11 namespace của Admin (`app`, `nav`, `auth`, `totp`, `roles`, `common`, `commercial`, `reports`, `experiments`, `contentReports`, `content`).
- **Lý do:** Ngăn chặn tuyệt đối tình trạng người dùng gặp màn hình trắng, crash hoặc nhìn thấy các chuỗi kỹ thuật chưa dịch khi điều hướng trong hệ thống.

### Quyết định 3: Báo cáo tích hợp độc lập và minh bạch
- **Phương án lựa chọn:** Tạo tài liệu `docs/release/INTEGRATION_REPORT.md` liệt kê chi tiết từng trang trong số 29 trang web và 30 trang admin kèm đường dẫn hình ảnh chụp màn hình (screenshot artifacts), tình trạng phản hồi API và kết quả kiểm tra key dịch.
- **Lý do:** Đáp ứng trực tiếp tiêu chí nghiệm thu thứ 4 của Task card I07, tạo bằng chứng tin cậy cho điều phối viên và chủ dự án trước khi chuyển giao.

## 3. Hệ Quả và Tác Động

- **Ưu điểm:**
  - Quy trình CI tại `.github/workflows/ci.yml` và `staging.yml` được bảo vệ tối đa: dữ liệu giả không thể lọt vào main branch.
  - Các lỗi hồi quy liên quan đến dịch thuật hoặc API 5xx sẽ bị phát hiện ngay lập tức trong Playwright suite.
  - Toàn bộ bằng chứng E2E được lưu vết rõ ràng tại `playwright-report/artifacts/i07/` và `docs/release/INTEGRATION_REPORT.md`.
- **Rủi ro và biện pháp giảm thiểu:**
  - Việc duyệt 59 trang tốn tài nguyên và thời gian; do đó crawler được tối ưu hóa tải trang bằng `domcontentloaded`, tái sử dụng session đăng nhập, và phân bổ client IP riêng biệt để không kích hoạt giới hạn tần suất (RateLimitGuard).
