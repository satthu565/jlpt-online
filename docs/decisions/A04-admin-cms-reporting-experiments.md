# Quyết định kiến trúc A04: Admin Portal, CMS, Hệ thống Báo cáo & Thử nghiệm A/B

- **Task**: A04 (Admin đầy đủ CMS báo cáo và thử nghiệm UI)
- **Worker**: W4 (Quản trị báo cáo và thương mại)
- **Ngày**: 2026-10-16
- **Trạng thái**: APPROVED (Triển khai nội bộ A04)

## 1. Bối cảnh và Yêu cầu

Nhiệm vụ A04 hoàn thiện toàn bộ tầng quản trị (Admin Portal), hệ thống báo cáo phân tích số liệu (REPORT-01 đến REPORT-15), quản lý nội dung bài viết/trang đích/FAQ (CMS, ADM-13, SEO-05, SEO-09, SEO-12), thử nghiệm giao diện (Experiments/A-B Testing, REPORT-15) cùng các tính năng quản trị chuyên sâu (ADM-01, ADM-09, ADM-10, ADM-11, ADM-12, ADM-17, ADM-18, kiểm duyệt AI, cài đặt tổ chức giáo viên).

Tiêu chí nghiệm thu bắt buộc:
1. Mọi mục ADM có UI và API thật, không dùng mockup hay stub tạm thời.
2. Reporting doanh thu, funnel, cohort khớp với seeded dataset và tính toán chuẩn xác theo thời gian thực.
3. Nội dung Markdown trong CMS được sanitize triệt để (chống XSS, script injection, iframe độc hại); cơ chế gán biến thể thử nghiệm (sticky assignment) không làm rò rỉ dữ liệu định danh cá nhân (PII).
4. Các báo cáo giữ chân (Retention) D7/D30 hiển thị trạng thái `insufficient-data` đối với cohort chưa đủ ngày trưởng thành thay vì hiển thị số liệu 0% giả gây hiểu lầm.

## 2. Các quyết định kỹ thuật chủ chốt

### 2.1. Phân hệ Báo cáo (Reporting Module - `apps/api/src/modules/reporting/`)
- Cung cấp API chuẩn `/admin/dashboard` và `/admin/reports/:kind` với 15 loại báo cáo tương ứng REPORT-01..15.
- Cơ chế D7/D30 Retention: Nếu cohort được tạo cách hiện tại ít hơn 7 ngày (với D7) hoặc ít hơn 30 ngày (với D30), chỉ số `d7Status` / `d30Status` được trả về là `insufficient_data` và giá trị rate là `null`. Chỉ khi đủ thời gian quan sát mới tính tỷ lệ phần trăm thực tế (`sufficient`).
- Tách bạch nguồn thu: Tiền tệ VND, USD, JPY được tổng hợp độc lập, không cộng gộp chéo đơn vị tiền tệ.
- Xuất dữ liệu CSV: Áp dụng chuẩn RFC 4180 và phòng chống tấn công CSV Injection (Formula Injection) bằng cách trung hòa các tiền tố nguy hiểm (`=`, `+`, `-`, `@`, `\t`, `\r`).

### 2.2. Phân hệ CMS và Vệ sinh Markdown (`apps/api/src/modules/cms/`)
- Triển khai bộ làm sạch Markdown/HTML thuần TypeScript không phụ thuộc thư viện ngoài:
  - Loại bỏ hoàn toàn các thẻ thực thi mã: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`, `<meta>`, `<link>`.
  - Loại bỏ các URI nguy hiểm: `javascript:`, `data:text/html`, `vbscript:`.
  - Loại bỏ các thuộc tính bắt sự kiện inline: `onerror`, `onload`, `onclick`, `onmouseover`, v.v.
  - Cho phép các cú pháp Markdown tiêu chuẩn: tiêu đề, đoạn văn, danh sách, khối trích dẫn, bảng, khối mã, liên kết an toàn (http, https, đường dẫn tương đối), hình ảnh an toàn.
- Khởi tạo sẵn nội dung chuẩn SEO:
  - SEO-05: Bài viết blog hướng dẫn chi tiết kỳ thi JLPT N1-N5 (`huong-dan-thi-jlpt-toan-dien`).
  - SEO-09: Trang đích giới thiệu các gói thành viên (`pricing-plans`).
  - SEO-12: Trang đích chiến dịch ôn thi JLPT 60 ngày bứt phá (`on-thi-60-ngay`).

### 2.3. Phân hệ Thử nghiệm A/B & Phân tích Hành vi (`apps/api/src/modules/experiment/`)
- Sticky Assignment:
  - Phân bổ biến thể dựa trên hàm băm giả định danh (Pseudonymous Hashing): `sha256(experimentId + ":" + subjectId + ":" + salt) % 100`.
  - Kết quả phân bổ được ghi nhận cố định vào bảng `experiment_assignments` để đảm bảo cùng một đối tượng luôn trải nghiệm cùng một biến thể qua mọi phiên.
  - Bảo vệ PII: Tuyệt đối không lưu trữ email, họ tên, số điện thoại trong bảng assignments và exposures. Nếu có userId, chỉ lưu ID ẩn danh hoặc mã băm.
- Analytics Consent Gating:
  - Sự kiện analytics chỉ được lưu trữ khi người dùng đồng ý theo chính sách quyền riêng tư (`analytics_consents`).
  - Lọc bỏ các thông tin nhạy cảm (đáp án, mật khẩu, thông tin thẻ) khỏi thuộc tính sự kiện.

### 2.4. Phân hệ Quản trị (Admin Portal UI - `apps/admin/`)
- Mở rộng các màn hình quản trị hoàn chỉnh:
  - ADM-01: Trang tổng quan Dashboard với số liệu thống kê thời gian thực và biểu đồ chỉ số.
  - ADM-09: Trang duyệt và giải quyết báo cáo lỗi câu hỏi (`/reports/content`).
  - ADM-10: Trang kiểm duyệt lời giải và bản dịch (`/reviews/explanations`) với quy tắc kiểm soát chéo (người duyệt khác tác giả).
  - ADM-11: Trang quản lý đề thi trộn ngẫu nhiên (`/exams/mixed`).
  - ADM-12: Trang quản lý từ vựng và ngữ pháp (`/vocab`).
  - ADM-13: Trang quản trị nội dung CMS (bài viết, trang đích, câu hỏi thường gặp) kèm bộ soạn thảo Markdown an toàn (`/cms`).
  - ADM-17: Trung tâm phân tích báo cáo sử dụng hệ thống đầy đủ 15 biểu đồ và bộ lọc thời gian (`/reports`).
  - ADM-18: Cấu hình mẫu thông báo và email thông báo tự động (`/settings/notifications`).
  - Kiểm duyệt AI (`/moderation/ai`), Tổ chức/Giáo viên (`/settings/org`), Quản trị thử nghiệm (`/experiments`).
