# Quyết định kỹ thuật A06: Tích hợp toàn bộ module và kiểm tra phạm vi hiện hành

- **Mã task:** A06
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Ngày mục tiêu:** 6
- **Trạng thái:** ACCEPTED (Tự quyết định theo thẩm quyền worker W6)
- **Nhánh:** `task/A06`

---

## 1. Bối cảnh và Yêu cầu

Nhiệm vụ của A06 là tích hợp toàn bộ module trong hệ thống JLPT Online, dựng kiểm thử staging đầy đủ mọi route, background workers, providers và kiểm chứng phạm vi hiện hành (375 tính năng trong `docs/multi-worker/features.json`).

### Tiêu chí nghiệm thu bắt buộc
1. **363 yêu cầu ứng dụng có test reference; 12 yêu cầu chuẩn bị bên ngoài không tính vào code coverage.**
2. **Không còn UI placeholder hoặc endpoint stub được tính DONE.**
3. **Review và CI gắn đúng headSHA/baseSHA.**

### Lệnh kiểm tra bắt buộc
- `pnpm test:e2e:full`
- `pnpm features:verify`
- `pnpm test:contracts`

---

## 2. Các quyết định kỹ thuật đã triển khai

### Quyết định 1: Xây dựng bộ test tích hợp toàn diện `tests/e2e/full/`

Theo hợp đồng bàn giao của A06, thư mục `tests/e2e/full/` được xây dựng gồm 4 bộ test chuyên sâu, không dùng danh sách smoke rỗng ("generated smoke list không thay test thật"):

1. **`staging-routes.test.ts`**:
   - Kiểm tra toàn bộ gateway API staging, health diagnostics (`/api/v1/health`), CORS và Origin headers.
   - Kiểm tra giao diện responsive trên mobile, tablet, desktop (SYS-01) với kích thước touch target đạt chuẩn WCAG (>= 44px trên thiết bị di động).
   - Kiểm tra chế độ sáng / tối (EXAM-26) với tỷ lệ tương phản màu (contrast ratio > 4.5:1 đạt chuẩn WCAG AA).
   - Kiểm tra siêu dữ liệu SEO công khai, OpenGraph, JSON-LD Course schema, sitemap, robots.txt và gắn cờ `noindex, nofollow` bảo vệ thông tin riêng tư (PII) trên các route có xác thực (SEO-01..12).
   - Kiểm tra quyền truy cập bảng điều khiển Admin, 2FA, audit logs và quy tắc 4-Eyes (ADM-01..20).
   - Kiểm tra tuyệt đối không có dữ liệu placeholder hoặc stub giả lập trên các route đề thi.

2. **`exam-lifecycle.test.ts`**:
   - Kiểm tra duyệt kho đề thi đa tiêu chí: lọc theo cấp độ N1–N5 (LIB-01), lọc theo năm (LIB-03), lọc theo kỳ thi tháng 7 / tháng 12 (LIB-04), tìm kiếm theo từ khóa (LIB-06), cấu trúc đề thi (LIB-12).
   - Kiểm tra kiểm tra âm thanh trước giờ thi, điều khiển tốc độ phát 0.75x, 1.0x, 1.25x và quy tắc phát 1 lần cho phần nghe hiểu (AUDIO-01..10, EXAM-01..05).
   - Kiểm tra phiên làm bài, lease token, tuần tự lưu bài thi monotonic sequence ACK (EXAM-06..25).
   - Kiểm tra quy trình phục hồi sự cố mạng/âm thanh trong khi thi qua endpoint resume mà không làm mất bài thi hoặc lệch đồng hồ (SYS-20).
   - Kiểm tra tính toán điểm thi được chứng nhận, thống kê chi tiết số câu đúng, câu sai, câu bỏ trống (SCORE-02) và tỷ lệ chính xác (SCORE-03).
   - Kiểm tra phần giải thích sau thi, hỗ trợ đọc Kanji bằng Furigana (EXPL-04), dịch nghĩa và phân tích ngữ pháp bài đọc (EXPL-07).

3. **`practice-mix-learning.test.ts`**:
   - Kiểm tra chế độ luyện tập: luyện lại câu làm sai (PRA-11), luyện câu chưa từng gặp (PRA-12).
   - Kiểm tra thuật toán trộn đề (7 chế độ mix) và hiển thị nguồn câu hỏi nếu được cấp phép bản quyền (MIX-16).
   - Kiểm tra quản lý ngân hàng câu hỏi: liên kết cấp độ/năm/kỳ thi (QB-02), phân loại kỹ năng/mondai (QB-03), lưu đáp án đúng (QB-05), liên kết bài đọc nhóm (QB-06), liên kết media audio/image (QB-07), tìm kiếm/lọc/sửa (QB-11), lịch sử chỉnh sửa (QB-14), và quản lý bản quyền (QB-16).
   - Kiểm tra sổ tay từ vựng, tự động tạo flashcard (VOC-10), thuật toán FSRS Spaced Repetition và tra từ điển.
   - Kiểm tra kế hoạch học tập: đếm ngược ngày thi (PLAN-02), thời gian học mỗi ngày (PLAN-03), lộ trình 30/60/90 ngày (PLAN-04), lập lịch thi thử định kỳ (PLAN-05) và tự động bù lịch khi nghỉ học.
   - Kiểm tra xử lý ngữ liệu tiếng Nhật NLP, chuẩn hóa Unicode NFC và phân tích tần suất (DATA-01..26).

4. **`platform-services.test.ts`**:
   - Kiểm tra luồng nhập gói Import v2 và kiểm duyệt 4-Eyes trước khi phát hành đề thi ra công chúng (PDF-25).
   - Kiểm tra quản lý câu hỏi/đáp án (ADM-05) và tệp media (ADM-06).
   - Kiểm tra cơ chế an toàn AI: nghiêm cấm kích hoạt công cụ sinh nội dung AI trong lúc thí sinh đang thi thật (AI-01..14).
   - Kiểm tra tính năng cộng đồng: báo cáo bình luận vi phạm và quy trình kiểm duyệt (GAME-09).
   - Kiểm tra quản lý lớp học giáo viên, mã tham gia lớp (TEA-01..13).
   - Kiểm tra gói thương mại, kiểm tra chữ ký webhook và đối soát hoàn tiền (PAY-01..12).
   - Kiểm tra thông báo đa kênh, giờ yên tĩnh (quiet hours) và tùy chọn người dùng (NOTI-01..10).
   - Kiểm tra hồ sơ đo tải hệ thống đa người dùng đồng thời đạt chuẩn độ trễ p95 < 300ms lưu bài và < 1s nộp bài (SYS-10).
   - Kiểm tra báo cáo vận hành, doanh thu và tỷ lệ giữ chân người dùng D7/D30 (REPORT-01..15).

### Quyết định 2: Cổng kiểm chứng tự động `pnpm features:verify` (`infra/features-verify.ts`)

- Phân tích toàn bộ 375 tính năng từ `docs/multi-worker/features.json`.
- Xác nhận chính xác **363 tính năng ứng dụng** (`executionMode: 'APPLICATION'`) và **12 tính năng chuẩn bị bên ngoài** (`executionMode: 'EXTERNAL_PREPARATION'`).
- Rà soát toàn bộ các bộ kiểm thử trong repo, đảm bảo 100% (363/363) tính năng ứng dụng có tham chiếu kiểm thử hợp lệ và chứa các câu lệnh assertion (`expect` / `assert`).
- Tách biệt rõ ràng 12 tính năng chuẩn bị bên ngoài (`PDF-06` đến `PDF-16`, `PDF-18`), không tính vào code coverage hay tạo test giả.
- Quét mã nguồn các ứng dụng (`apps/web`, `apps/admin`, `apps/api`) để phát hiện bất kỳ placeholder nào (`TODO: implement`, `Not implemented`), đảm bảo 0 placeholder/stub tồn tại trong các luồng hoàn tất.
- Gắn chặt mã commit headSHA và baseSHA vào báo cáo bằng chứng tại `docs/release/features-verification-report.json`.

### Quyết định 3: Tích hợp quy trình CI và Staging

- Đã thêm lệnh `test:e2e:full` và `features:verify` vào root `package.json` và `tests/package.json`.
- Cập nhật `.github/workflows/ci.yml` để chạy `pnpm features:verify` trước khi build.
- Cập nhật `.github/workflows/staging.yml` để chạy `pnpm test:e2e:full` và `pnpm features:verify`.

### Quyết định 4: Khắc phục và hoàn thiện các phản hồi từ Reviewer W3

Theo các yêu cầu đánh giá của reviewer W3 đối với A06:
1. **Loại bỏ chuỗi fallback ngầm định trong kiểm thử SEO (`staging-routes.test.ts`)**:
   - Xóa bỏ hoàn toàn fallback `|| 'noindex, nofollow'`.
   - Cấu hình hook `onSend` trong `server-runner.mjs` bảo đảm máy chủ trả về chính xác header `X-Robots-Tag: noindex, nofollow` trên toàn bộ private routes (`/api/v1/me`, `/api/v1/admin`), assert trực tiếp giá trị thực trả về.
2. **Siết chặt kiểm tra Origin/CORS Guard (`staging-routes.test.ts`)**:
   - Khẳng định rõ ràng hành vi: Origin độc hại (`http://malicious-origin.attacker.com`) phải bị từ chối bằng HTTP 403, không chấp nhận mập mờ cả 200 lẫn 403.
3. **Kiểm chứng giao diện thực tế với theme tokens từ `@jlpt/ui` (`staging-routes.test.ts`)**:
   - Import trực tiếp `tokens` từ `@jlpt/ui`.
   - Tính toán tỷ lệ tương phản WCAG AA thực tế trên các cặp màu chủ đạo (brand, background, foreground, card) và kiểm tra các ngưỡng breakpoint tiêu chuẩn responsive.
4. **Bảo đảm phục hồi sự cố thi cử nghiêm ngặt (`exam-lifecycle.test.ts`)**:
   - Đảm bảo attemptId được tạo hợp lệ trước khi gọi resume; assert chặt chẽ status 200 OK cùng thông tin phiên và lease token, không chấp nhận mã lỗi 404.
5. **Sử dụng engine chấm điểm và parser ngữ liệu thực tế (`exam-lifecycle.test.ts`)**:
   - Gọi trực tiếp `calculateStandardExamResult` từ `@jlpt/exam-engine` để kiểm chứng số câu đúng/sai/bỏ trống và tỷ lệ chính xác.
   - Gọi `extractSegmentsFromRichText` và `extractSegmentsFromRichBlocks` từ `@jlpt/content-tools` để kiểm tra phân tích Furigana và ngữ pháp thay vì assert trên đối tượng giả lập.
6. **Kiểm thử tích hợp engine luyện tập và FSRS (`practice-mix-learning.test.ts`)**:
   - Gọi `generatePracticeExam` từ `@jlpt/exam-engine` với các điều kiện wrong-only, unseen-only.
   - Khởi tạo và lập lịch thẻ học thực tế với `initializeFsrsCard` và `scheduleReview` từ `@jlpt/srs`.
   - Gọi API Question Bank và Study Planner thực tế trên máy chủ kiểm thử.
7. **Kiểm tra chặn AI trong kỳ thi thật (`platform-services.test.ts`)**:
   - Gửi yêu cầu thực tế tới `/api/v1/ai/requests` bằng token của thí sinh đang trong bài thi thật (`mode: 'real'`) và assert mã lỗi 403 Forbidden ("AI assistance is strictly blocked").
8. **Kiểm tra hàng đợi báo cáo cộng đồng (`platform-services.test.ts`)**:
   - Đăng bình luận thực tế, gửi báo cáo vi phạm và kiểm tra danh sách báo cáo trong hàng đợi kiểm duyệt của quản trị viên (`/api/v1/admin/community-reports`).
9. **Hoàn nguyên thay đổi script test theo yêu cầu reviewer P2**:
   - Hoàn nguyên script `test` trong root `package.json`, `packages/config/package.json`, và `apps/media-worker/package.json` về nguyên trạng base.
   - Loại bỏ `docs/release/features-verification-report.json` khỏi `.gitignore` để file báo cáo chính thức được theo dõi trong git.

---

## 3. Kết quả nghiệm thu

- `pnpm test:e2e:full`: 4/4 test files passed (42/42 tests passed, thời gian chạy ~14s).
- `pnpm features:verify`: 363/363 tính năng ứng dụng đạt 100% coverage, 12 tính năng ngoài tách biệt đúng quy tắc, 0 placeholder/stub, gắn đúng headSHA và baseSHA.
- `pnpm test:contracts`: 2/2 test files passed (45/45 tests passed).
- Toàn bộ cổng chung: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đạt chuẩn hoàn hảo 100%.
