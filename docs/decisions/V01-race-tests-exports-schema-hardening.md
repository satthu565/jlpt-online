# Quyết định kỹ thuật V01: Race tests thuật toán dữ liệu export và schema hardening

- **Task:** V01
- **Worker:** W1 (Hợp đồng dữ liệu và logic thi)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/V01`
- **Base SHA:** `c0f7ceab4724eab3fa9dccf65f04b9430c9624ba`
- **Dependencies:** A01, A05
- **Resource Locks:** `db-migration`, `engine-contract`, `schema-contract`
- **Feature IDs:** SCORE-12

---

## 1. Bối cảnh và mục tiêu

Task V01 tập trung hoàn thiện các khía cạnh bảo mật, bất biến và độ tin cậy dữ liệu của hệ thống:
1. **SCORE-12:** Xây dựng công cụ tạo báo cáo kết quả thi dạng PDF (`Score Report`) có văn bản tiếng Nhật chuẩn hóa NFC, bảng điểm chi tiết theo từng kỹ năng và cấu trúc phần thi JLPT, đồng thời đảm bảo cách ly tuyệt đối dữ liệu người dùng/tenant, ngăn ngừa rò rỉ thông tin thi hoặc PII của người khác.
2. **Xuất khẩu dữ liệu đa định dạng (PDF / XLSX / CSV):** Hỗ trợ xuất phiếu điểm ra định dạng OpenXML (.xlsx) và CSV với cơ chế chống tấn công Spreadsheet Formula Injection (`=`, `+`, `-`, `@`, `\t`, `\r`) theo chuẩn an toàn OWASP.
3. **Bộ kiểm thử thuộc tính (Property-Based Suites):** Bổ sung và củng cố các bài kiểm thử thuộc tính bất biến cho thuật toán SRS (FSRS) và công thức tính điểm chuẩn (Linear Reference Scaling), đảm bảo các giới hạn toán học `[0, 180]`, `[0, 60]`, tính đơn điệu điểm số, tính ổn định và tính tất định.
4. **Bảo mật và tuần tự hóa migration cơ sở dữ liệu:** Bổ sung bản migration `0003_privacy_export_isolation.sql` quản lý ràng buộc trạng thái của tiến trình xuất khẩu dữ liệu, các chỉ mục truy vấn tối ưu cho việc tuân thủ xóa/xuất dữ liệu riêng tư, và kiểm chứng cơ chế tuần tự hóa migration đồng thời bằng PostgreSQL Advisory Lock (`pg_advisory_lock(72110115)`) ngăn ngừa xung đột migration khi khởi động song song nhiều tiến trình/container.

---

## 2. Tiêu chí nghiệm thu & Giải pháp kỹ thuật

### Tiêu chí 1: Score report PDF có text Nhật và không chứa dữ liệu người khác (SCORE-12)
- **Tạo PDF thuần TypeScript (Zero External Dependencies):** Xây dựng module `SimplePdfDocument` tạo tài liệu chuẩn PDF 1.4 không cần cài thêm thư viện ngoài (bảo vệ chuỗi cung ứng và tương thích mọi runtime Node/Edge/Container).
- **Hỗ trợ tiếng Nhật chuẩn Unicode NFC:**
  - Định nghĩa Composite Font Type0 (`/HeiseiKakuGo-W5`) kết hợp mã hóa `/UniJIS-UTF16-H` và ToUnicode CMap.
  - Mã hóa ký tự Unicode tiếng Nhật thành chuỗi UTF-16BE hex `<HHHH>` trong lệnh `Tj` của PDF stream.
  - Chuẩn hóa toàn bộ nội dung tiếng Nhật sang dạng `NFC` (`text.normalize('NFC')`).
  - Hiển thị đầy đủ tiêu đề chứng chỉ `日本語能力試験 成績証明書 / 判定結果通知書`, kết quả `合否判定: 【 合格 】` / `【 不合格 】`, các phân môn `言語知識（文字・語彙・文法）`, `読解`, `聴解`, điểm tổng và điểm chuẩn phân môn.
- **Cách ly dữ liệu người dùng tuyệt đối (Multi-Tenant & Privacy Isolation):**
  - Hàm `assertScoreReportIsolation(data, requestingActor)` nghiêm cấm người dùng thông thường truy cập hoặc tạo phiếu báo điểm của người dùng khác.
  - Kiểm tra tenant isolation: ngăn chặn truy cập chéo giữa các tổ chức/lớp học khác nhau.
  - Dữ liệu trong tệp xuất chỉ bao gồm kết quả của chính lượt thi được chỉ định, không bao gồm thông tin hay kết quả của người dùng khác.
  - Bổ sung chữ ký điện tử SHA-256 (`checksumSha256`) xác thực tính toàn vẹn và chống giả mạo phiếu điểm.
  - Chống tấn công Formula Injection: toàn bộ trường dữ liệu dạng chuỗi (tên thí sinh, tiêu đề bài thi) đều được làm sạch bằng `sanitizeExportField`.

### Tiêu chí 2: Property suites và SRS/difficulty pass
- **SRS Property Suite (`packages/srs/tests/srs-property.test.ts`):**
  - Kiểm thử 500 bước chuỗi đánh giá ôn tập ngẫu nhiên.
  - Xác minh các bất biến:
    - Độ ổn định (Stability) luôn dương (`S > 0`).
    - Độ khó (Difficulty) luôn nằm trong giới hạn chuẩn `1 <= D <= 10`.
    - Thời gian đến hạn (Due Date) luôn nằm trong tương lai hoặc đầu ngày kế tiếp.
    - Số lần lặp (Reps) tăng đơn điệu đối với đánh giá tích cực (`Good`, `Easy`).
    - Tính tất định: cùng chuỗi đánh giá sinh ra trạng thái thẻ và thời điểm review hoàn toàn giống nhau.
- **Scoring Property Suite (`packages/exam-engine/tests/scoring-property.test.ts`):**
  - Kiểm thử 500 cấu hình bài thi và câu trả lời ngẫu nhiên trên các cấp độ N1–N5.
  - Xác minh các bất biến:
    - Điểm quy đổi tổng luôn trong khoảng `[0, 180]`.
    - Điểm từng phần luôn trong khoảng `[0, 60]`.
    - Tổng điểm từng phần bằng đúng điểm quy đổi tổng.
    - Tính đơn điệu: làm đúng thêm câu hỏi không bao giờ làm giảm điểm số.
    - Điều kiện đỗ JLPT kép: đỗ khi và chỉ khi đạt cả điểm sàn tổng (`total >= totalPass`) và điểm chuẩn từng phần (`scaled >= minPass` cho cả 3 môn).
- **Difficulty Suite (`packages/exam-engine/tests/difficulty.test.ts`):**
  - Kiểm thử độ khó thực nghiệm: quy tắc mẫu `< 30` trả về `INSUFFICIENT_DATA`, mẫu `>= 30` mới được xác nhận `CALIBRATED`.

### Tiêu chí 3: Migrations concurrent không chạy hai lần
- **Bản migration 0003 (`apps/api/src/db/migrations/0003_privacy_export_isolation.sql`):**
  - Bổ sung ràng buộc CHECK `export_jobs_status_check` (`status IN ('pending', 'processing', 'completed', 'failed', 'expired')`).
  - Bổ sung chỉ mục truy vấn bảo vệ quyền riêng tư:
    - `data_export_jobs_user_status_idx` trên `data_export_jobs (user_id, status)`
    - `deletion_requests_user_status_idx` trên `deletion_requests (user_id, status)`
    - `report_snapshots_name_period_idx` trên `report_snapshots (report_name, period)`
    - `export_jobs_requested_by_status_idx` trên `export_jobs (requested_by, status)`
- **Tuần tự hóa migration đồng thời:**
  - Khóa PostgreSQL Advisory Lock (`pg_advisory_lock(72110115)`) trên kết nối dành riêng, phối hợp với chuỗi promise trong tiến trình Node.js.
  - Kiểm thử trong `apps/api/src/db/db.test.ts`: kích hoạt đồng thời 5 lời gọi `runMigrations(client)` song song. Kết quả: đúng 1 lần thực thi migration, 4 lần còn lại nhận diện sổ cái và ghi nhận 0 migration áp dụng mới, không gặp lỗi `relation already exists`.

---

## 3. Danh mục tệp thay đổi

1. `package.json`:
   - Bổ sung scripts `"test:engines:all"` và `"test:exports"`.
2. `packages/schema/src/exports.ts`:
   - Khai báo `ScoreReportDataSchema`, `ScoreReportOptionsSchema`, `ScoreReportResultSchema`, `ScoreReportIsolationError`, và hàm `assertScoreReportIsolation`.
3. `packages/schema/src/index.ts`:
   - Export các schema và hàm từ `./exports.js`.
4. `packages/exam-engine/src/exports/`:
   - `types.ts`: Định nghĩa kiểu dữ liệu và lỗi cho báo cáo điểm số.
   - `pdf-builder.ts`: Engine sinh tài liệu PDF 1.4 thuần TypeScript hỗ trợ font tiếng Nhật Type0 / UniJIS-UTF16-H và ToUnicode CMap.
   - `score-report-pdf.ts`: Tạo phiếu báo điểm PDF cho lượt thi với tiếng Nhật NFC, xác thực cách ly người dùng và chữ ký SHA-256.
   - `score-report-xlsx.ts`: Tạo phiếu báo điểm OpenXML (.xlsx) đa sheet chống formula injection.
   - `score-report-csv.ts`: Tạo phiếu báo điểm CSV với UTF-8 BOM.
   - `index.ts`: Export toàn bộ giao diện xuất khẩu dữ liệu.
5. `packages/exam-engine/src/index.ts`:
   - Export module exports từ `./exports/index.js`.
6. `packages/exam-engine/tests/`:
   - `score-report.test.ts`: Bộ kiểm thử toàn diện tính năng SCORE-12 (text Nhật, cấu trúc PDF, cách ly đa người dùng, chặn formula injection).
   - `exports.test.ts`: Bộ kiểm thử định dạng PDF, XLSX, CSV.
   - `scoring-property.test.ts`: Kiểm thử 500 trường hợp bất biến điểm số thi JLPT.
   - `race-isolation.test.ts`: Kiểm thử chạy đồng thời 50 lượt tính điểm và 30 lượt xuất PDF/XLSX độc lập không lẫn lộn dữ liệu.
7. `packages/srs/tests/srs-property.test.ts`:
   - Kiểm thử 500 bước quy tắc toán học FSRS.
8. `apps/api/src/db/migrations/0003_privacy_export_isolation.sql`:
   - Migration bổ sung ràng buộc toàn vẹn và chỉ mục quyền riêng tư.
9. `apps/api/src/db/migrations/meta/_journal.json`:
   - Ghi nhận mục migration index 3: `0003_privacy_export_isolation`.
10. `apps/api/src/db/schema.ts`:
    - Cập nhật Drizzle schema với các chỉ mục mới trên `dataExportJobs`, `deletionRequests`, `reportSnapshots`, `exportJobs`.
11. `apps/api/src/db/db.test.ts`:
    - Bổ sung 3 test cases cho V01 Acceptance 3: kiểm thử 5 migration đồng thời, kiểm thử ràng buộc status của `export_jobs`, kiểm thử các chỉ mục quyền riêng tư.
12. `docs/decisions/V01-race-tests-exports-schema-hardening.md`:
    - Tài liệu quyết định kỹ thuật này.
