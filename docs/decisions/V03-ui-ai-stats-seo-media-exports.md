# Quyết định kỹ thuật V03: UI AI thống kê SEO media và exports hoàn chỉnh

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** V03
- **Ngày:** 6
- **Trạng thái:** ACCEPTED
- **Tính năng liên quan:** SEO-01, SEO-02, SEO-03, SEO-04, SEO-06, SEO-07, SEO-08, SEO-10, SEO-11, SYS-02, SYS-17

---

## 1. Bối cảnh & Mục tiêu

Task V03 hoàn thiện toàn bộ tầng giao diện học viên cho các tính năng:
1. **Public SEO Pages (SEO-01, SEO-02, SEO-03, SEO-04, SEO-10):**
   - Giới thiệu từng cấp độ N1–N5 (`/n1` .. `/n5`) với tiêu chuẩn đậu, cấu trúc phần thi, thời gian, số từ vựng/kanji mục tiêu, và lộ trình ôn tập.
   - Danh sách đề theo cấp độ, năm và kỳ (`/[level]/de-thi`, `/[level]/de-thi/[session]`).
   - Giới thiệu từ vựng và mẫu ngữ pháp (`/tu-vung`, `/ngu-phap`).
   - Thống kê từ thường gặp và xu hướng qua các năm (`/thong-ke-tu-vung`).
   - Trang thông tin hỗ trợ, liên hệ, FAQ, điều khoản và chính sách bảo mật (`/faq`, `/lien-he`, `/ho-tro`, `/dieu-khoan`, `/chinh-sach`).
2. **Kỹ thuật SEO & Metadata (SEO-06, SEO-07, SEO-08):**
   - Sinh tự động `sitemap.xml` với toàn bộ URL public và alternate hreflang (`vi`, `ja`, `en`).
   - Cấu hình `robots.txt` cho phép bot thu thập trang công khai và chặn các trang private (`/phong-thi/`, `/tai-khoan/`, `/lich-su/`, `/api/`).
   - Nhúng dữ liệu có cấu trúc JSON-LD (`Course`, `FAQPage`, `BreadcrumbList`, `LearningResource`, `Organization`).
   - Open Graph và Twitter Card tags, kèm tính năng chia sẻ link bài thi, chứng nhận và huy hiệu (`/chia-se/ket-qua/[id]`).
3. **Đo lường nguồn truy cập và chấp thuận Cookie (SEO-11):**
   - Cookie Consent Banner với 3 tùy chọn: Chấp nhận tất cả, Từ chối cookie phân tích, và Tùy chỉnh.
   - Thu thập thông tin chiến dịch marketing (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `ref`) mà không xâm phạm quyền riêng tư.
   - Thu thập chỉ số trải nghiệm người dùng thực (Core Web Vitals: CLS, LCP, FID, INP, FCP, TTFB) chỉ khi người dùng đã chấp thuận.
4. **AI Chat học tập & Nhãn tạo bởi AI:**
   - Trợ lý giải thích câu hỏi và học tập với nhãn nhận diện rõ ràng "Nội dung do AI tạo (AI-Generated)".
   - Cảnh báo người dùng đối chiếu với giáo viên/nguồn chính thống.
   - Hỗ trợ 2 chế độ: giải thích tiêu chuẩn (`standard`) và giải thích chuyên sâu (`deep`).
   - Hiển thị quota token còn lại và cảnh báo ngân sách từ `/api/v1/me/ai-usage`.
5. **Gamification (Chuỗi ngày, Huy hiệu, Thử thách, Bảng xếp hạng):**
   - Theo dõi chuỗi ngày học liên tục (Streak) và điểm danh mỗi ngày (`/api/v1/me/streak`).
   - Danh sách huy hiệu thành tích và chức năng tạo link chia sẻ huy hiệu (`/api/v1/me/achievements`, `/api/v1/me/achievement-shares`).
   - Tham gia các thử thách học tập hàng tuần/tháng (`/api/v1/challenges`).
   - Bảng xếp hạng hoàn toàn tự nguyện với công tắc bật/tắt hiển thị (`/api/v1/leaderboards`, `/api/v1/me/leaderboard-opt-in`).
6. **Âm thanh TTS có fallback thông báo lỗi (SYS-02):**
   - Trình phát âm thanh mẫu từ vựng/ngữ pháp kết nối `POST /api/v1/tts`.
   - Nếu dịch vụ trả về `status: 'SANDBOX'` hoặc gặp sự cố, UI hiển thị rõ ràng thông báo thử nghiệm/lỗi: "Đang sử dụng bộ phát âm dự phòng thử nghiệm (Sandbox Fallback). Nhà cung cấp TTS chính thức chưa được kích hoạt." Tuyệt đối không giả mạo thành công của provider thật.
7. **Bảo vệ dữ liệu trả phí & Đóng dấu bản quyền PDF (SYS-17):**
   - Khi tải phiếu điểm PDF hoặc xuất danh sách học tập, hệ thống nhúng dấu bản quyền (watermark) chứa ID học viên, thời điểm xuất (UTC ISO) và mã kiểm tra chống sao chép lậu.
   - Toàn bộ trang tĩnh public tuyệt đối không chứa dữ liệu cá nhân (PII) hoặc đáp án câu hỏi.

---

## 2. Các quyết định thiết kế chi tiết

### 2.1. Kiến trúc Route tĩnh và Server-Side Generation (SSG)
- Các route `/n1` .. `/n5`, `/[level]/de-thi`, `/tu-vung`, `/ngu-phap`, `/thong-ke-tu-vung`, `/faq`, `/lien-he`, `/ho-tro`, `/dieu-khoan`, `/chinh-sach` được render tĩnh (SSG) lúc build thông qua App Router.
- Bộ lọc danh sách đề thi theo năm, kỳ, loại đề và từ khóa hoạt động 100% phía client trên danh sách tĩnh, không tạo thêm request API khi người dùng thao tác lọc.
- Trạng thái cá nhân (đã làm, đang làm, điểm số cá nhân) được nạp bất đồng bộ phía client sau khi trang tải (client-side hydration) thông qua `ExamApiClient.getUserExamStatus()`. Nhờ đó, mã nguồn HTML từ server là bất biến và không có bất kỳ thông tin cá nhân (PII) nào.

### 2.2. Dữ liệu có cấu trúc JSON-LD và Thẻ Open Graph
- Tạo component `JsonLd` an toàn trong `@jlpt/ui`, escape chuỗi an toàn chống injection.
- Chuẩn hóa schema:
  - Cấp độ N1–N5: `schema.org/Course` với thông tin môn học, thời lượng, tiêu chuẩn đậu, và tổ chức cấp chứng chỉ (JEES & Japan Foundation).
  - Trang FAQ: `schema.org/FAQPage` với danh sách câu hỏi và câu trả lời.
  - Trang chi tiết và điều hướng: `schema.org/BreadcrumbList`.
  - Trang chủ: `schema.org/WebSite` và `schema.org/Organization`.
- Open Graph tags đầy đủ: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`, `og:locale:alternate`.

### 2.3. Quản lý đồng ý Cookie và Đo lường Nguồn truy cập (SEO-11)
- Tạo module `apps/web/lib/consent.ts` và component `CookieConsentBanner` trong `@jlpt/ui`.
- Lưu trữ lựa chọn của người dùng trong `localStorage` và cookie `jlpt_consent` (`necessary`, `analytics_granted`, `analytics_denied`).
- Chỉ kích hoạt theo dõi nguồn truy cập (UTM tags, Referrer) và Core Web Vitals beacon khi người dùng đã cấp quyền. Nếu từ chối, không gửi bất kỳ gói tin tracking nào.

### 2.4. Trợ lý AI học tập & Nhãn minh bạch (Transparency Labels)
- Mọi nội dung tạo bởi AI bắt buộc có nhãn trực quan: `Nội dung do AI tạo (AI-Generated)` với icon nhận diện.
- Hiển thị thông điệp từ chối trách nhiệm (disclaimer) khuyến khích kiểm chứng với giáo viên.
- Gọi trực tiếp `POST /api/v1/ai/requests` và `GET /api/v1/me/ai-usage`. Khi quota đạt giới hạn hoặc cạn ngân sách, khóa nút gửi và hiển thị cảnh báo hướng dẫn nâng cấp gói hoặc chờ reset ngày mới.

### 2.5. Xuất phiếu điểm PDF có đóng dấu bảo hộ (SYS-17)
- Cung cấp component `PdfScoreExportButton` trên trang kết quả bài thi.
- Tạo phiếu điểm in/PDF chứa: thông tin thí sinh, mã đề, điểm từng phần, kết quả ĐỖ/CHƯA ĐẠT, kèm dấu chìm (watermark) chứa User ID, thời điểm tạo và chữ ký bản quyền chống phát tán trái phép.

### 2.6. Tối ưu Bundle Budget & Polyfill Stubbing (SYS-02)
- Thay thế các polyfill node nặng (`crypto-browserify`, `elliptic`, `bn.js`...) trong client bundle bằng client stub `apps/web/lib/stubs/crypto.js` thông qua Turbopack resolveAlias.
- Giảm kích thước chunk client tối đa từ 581KB xuống 283KB uncompressed (< 100KB gzip), đảm bảo tuân thủ nghiêm ngặt ngân sách bundle (< 350KB uncompressed / < 150KB gzip).

---

## 3. Nghiệm thu & Kiểm thử

1. `pnpm test:seo`: Kiểm tra tính hợp lệ của sitemap, robots.txt, metadata, hreflang, structured data JSON-LD, không rò rỉ PII.
2. `pnpm test:performance`: Kiểm tra ngân sách bundle (initial JS < 150KB gzip), tối ưu ảnh/audio, và cơ chế phát hiện fallback TTS sandbox.
3. `pnpm test:i18n`: Kiểm tra 100% đối xứng bộ dịch vi/ja/en và chuẩn NFC tiếng Nhật.
4. `pnpm test:e2e:web-all`: Kiểm tra tích hợp toàn diện giao diện học viên: thư viện đề, phòng thi, giải thích bài, AI assistant, gamification, corpus, và export PDF.
