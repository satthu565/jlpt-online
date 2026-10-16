# Quyết định kỹ thuật N04: Nhập gói chuẩn đối chiếu duyệt xuất bản và audit admin

- **Task:** N04
- **Worker:** W4 (Quản trị báo cáo và thương mại)
- **Trạng thái:** HOÀN TẤT (REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/N04`
- **Base SHA:** `f4f76d33e8c3b346ac734b4329e4852513c6f2ce`
- **Dependencies:** C04, C02, C05, B01
- **Feature IDs:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-17, PDF-19, PDF-20, PDF-24, PDF-25, PDF-26, PDF-28, PDF-29, PDF-30, ADM-07

---

## 1. Bối cảnh và mục tiêu

Task N04 xây dựng bộ tính năng quản trị quy trình tải lên gói dữ liệu Import v2 chuẩn, kiểm duyệt hai bước (Two-person review / separation of duties), đối chiếu với tài liệu gốc tùy chọn, xuất bản đề thi bất biến và quản lý phiên bản cùng takedown bảo tồn lịch sử đề thi:
- **PDF-01 & PDF-02:** Upload một gói hoặc nhiều gói dữ liệu chuẩn (batch upload) định dạng ZIP (import.json, media/, sources/); chặn đứng hoàn toàn việc tải PDF đơn lẻ để kích hoạt tác vụ OCR hay bóc tách tự động.
- **PDF-03:** Nhận đáp án trong `correctOption` của JSON; cảnh báo và bỏ qua các tệp đáp án rời (.ans, .key); lưu trữ khóa đáp án an toàn, không lộ ra thí sinh.
- **PDF-04 & PDF-17:** Quản lý âm thanh nghe hiểu và đồng bộ timeline nghe (`listeningTimeline`: `startMs`, `endMs`, `audioStartMs`, `audioEndMs`, `gapAfterMs`).
- **PDF-05:** Khai báo và tiền kiểm cấp độ N1–N5, năm, kỳ thi (session 7/12), nguồn gốc (`provenance`: `official_past_exam`, `self_authored`, `third_party`).
- **PDF-19 & PDF-26:** Hiển thị đối chiếu song song (side-by-side) giữa dữ liệu câu hỏi số hóa và tệp PDF gốc đính kèm; lưu trữ liên kết trang nguồn (`sourcePage`) cho từng câu hỏi và nhóm câu.
- **PDF-20:** Cho phép biên tập viên (Editor) hiệu chỉnh nội dung câu hỏi (stem, options, lời giải, số trang nguồn) trong hàng đợi duyệt.
- **PDF-24:** Xem trước đề thi trên giao diện làm bài của thí sinh mà tuyệt đối không để lộ đáp án (`PublicExamSnapshot` strictly zero answer leak).
- **PDF-25:** Quy trình kiểm duyệt hai người (two-person review) với nguyên tắc 4 mắt nghiêm ngặt: Editor không được tự duyệt nội dung do chính mình biên tập.
- **PDF-28:** Theo dõi trạng thái tiến trình xử lý gói nhập (pending, validating, draft_created, succeeded, failed), số lượng lỗi, cảnh báo và blocking issues.
- **PDF-29 & ADM-07:** Quản lý phiên bản đề thi bất biến khi sửa đổi; xuất bản phiên bản mới và gỡ đề (takedown) nhưng lưu giữ toàn bộ các phiên bản cũ trong lịch sử.
- **PDF-30:** Nhập và xuất ngân hàng câu hỏi định dạng JSON và CSV (RFC 4180) hai chiều toàn vẹn dữ liệu (roundtrip), mở đúng trang nguồn PDF khi được chỉ định.

---

## 2. Các quyết định kỹ thuật và kiến trúc

### 2.1. Tiếp nhận gói chuẩn Import v2 và ngăn chặn PDF đơn lẻ (Acceptance 1)
- **Quy tắc tuyệt đối:** Website KHÔNG xây dựng OCR, parser PDF hay agent trích xuất tự động từ file scan/PDF thô. Chủ dự án tự chuẩn bị gói dữ liệu Import v2 bên ngoài hệ thống.
- **Chặn PDF đơn lẻ (`assertNotStandalonePdf`):**
  - Kiểm tra đuôi file `.pdf` và 4 bytes đầu đặc trưng `%PDF` (`[0x25, 0x50, 0x44, 0x46]`).
  - Nếu phát hiện tệp PDF đơn lẻ hoặc tệp giả mạo ZIP chứa magic bytes PDF, hệ thống lập tức ném lỗi `StandalonePdfError`:
    *"Upload import v2 chạy validator và tạo draft; PDF đơn lẻ không khởi động đọc file. Không thực hiện OCR hoặc bóc tách tự động."*
  - Không khởi tạo tiến trình nền, không gọi LLM/OCR, thông báo lỗi rõ ràng trên UI.
- **Xác thực gói ZIP an toàn (`readZipBuffer`):**
  - Giải nén hoàn toàn trong bộ nhớ đệm, bảo vệ chống Zip-Slip (kiểm tra `sanitizePathSegment`), Zip-Bomb (giới hạn tỷ lệ nén tối đa 200:1, dung lượng giải nén tối đa 500 MiB, tối đa 2000 files).
  - Yêu cầu bắt buộc phải có `import.json` chuẩn UTF-8 NFC ở thư mục gốc gói ZIP.
  - Kiểm tra `formatVersion: 2`, `packageId`, `revision >= 1`.
  - Sinh bản thảo đề thi (`AdminExam`) và các nhóm câu hỏi (`AdminQuestionGroup`) ở trạng thái `draft`.

### 2.2. Quy tắc 4 mắt và hàng đợi kiểm duyệt (Acceptance 2: "Editor không tự duyệt")
- **Nguyên tắc phân định trách nhiệm (Separation of Duties):**
  - Biên tập viên (Editor) gửi nội dung vào hàng đợi kiểm duyệt (`status: 'in_review'`).
  - Người kiểm duyệt (Reviewer) hoặc Quản trị viên (Admin) thẩm định nội dung.
  - **Kiểm soát chặt chẽ:** Nếu `reviewer.id === item.authorId` hoặc `reviewer.id === item.lastEditedBy`, hệ thống lập tức ném lỗi `SelfReviewForbiddenError`:
    *"Editor không thể tự duyệt nội dung do chính mình biên tập (Quy tắc 4 mắt / Two-person rule)."*
  - Ngay cả khi người dùng sở hữu vai trò Admin, nếu chính họ là người tạo hoặc người sửa cuối cùng của mục đó, họ cũng không được phép tự duyệt (phải có nhân sự quản trị khác duyệt).
- **Hỗ trợ biên tập trong review (PDF-20):**
  - Biên tập viên được phép chỉnh sửa stem, options, lời giải, trang nguồn; mỗi lần sửa cập nhật `lastEditedBy = editor.id` và ghi log audit `edited`.
- **Giao diện đối chiếu song song (PDF-19 & PDF-26):**
  - Khung trái: hiển thị dữ liệu JSON số hóa, câu hỏi, các lựa chọn, đáp án chuẩn, lời giải.
  - Khung phải: khung tham chiếu PDF gốc, hiển thị chính xác tệp nguồn và số trang đối chiếu (`sourcePage`).

### 2.3. Xuất bản phiên bản mới và gỡ đề bảo tồn lịch sử (Acceptance 3: "Publish version mới, takedown giữ version cũ")
- **Điều kiện tiền xuất bản (`validatePrePublish`):**
  - Tất cả các nhóm câu hỏi trong tất cả các phần thi của đề thi phải ở trạng thái đã duyệt (`status === 'approved'`).
  - Phù hợp với cấu trúc blueprint chính thức (nếu đề thi gốc).
- **Xuất bản (`publishExam`):**
  - Chỉ Admin mới có quyền thực hiện (vai trò khác bị từ chối bằng `ExamActionForbiddenError`).
  - Sinh `PublicExamSnapshot` theo chuẩn schema, loại bỏ hoàn toàn các trường đáp án (`correctOption`, `isCorrect`, `answerKey`, `explanation`).
  - Khóa đáp án `ExamAnswerKey` được sinh và lưu riêng rẽ an toàn.
  - Phiên bản xuất bản tăng tịnh tiến theo lịch sử: `nextVersion = Math.max(latestVersionInHistory, currentVersion) + 1`.
  - Đề thi chuyển sang trạng thái `published`.
- **Gỡ đề thi (`takedownExam`):**
  - Yêu cầu Admin cung cấp lý do gỡ đề bắt buộc.
  - Đề thi chuyển về trạng thái gỡ xuất bản (`publishedVersion = null`).
  - **Bảo tồn lịch sử (Preserve Old Versions):** Toàn bộ bản ghi phiên bản cũ trong `versionHistory` (gồm snapshot, answer key, thời điểm xuất bản, người xuất bản) vẫn được lưu giữ nguyên vẹn. Bản ghi gần nhất được cập nhật thêm trường `takedownAt`, `takedownBy`, `takedownReason`.
  - Khi xuất bản lại sau takedown, hệ thống tăng lên phiên bản mới (v2, v3), không làm mất dấu vết các phiên bản trước đó.
- **Tính bất biến (`ExamImmutableVersionError`):**
  - Không cho phép cập nhật trực tiếp trên đề thi đã xuất bản. Biên tập viên phải thực hiện rẽ nhánh tạo bản thảo mới (`branchNewDraft`).

### 2.4. Xuất nhập JSON/CSV và mở trang nguồn (Acceptance 4)
- **Chuẩn CSV RFC 4180 (`JsonCsvService`):**
  - Hỗ trợ các trường chứa dấu phẩy, dấu nháy kép escape (`""`), và xuống dòng nhiều dòng.
  - Roundtrip bảo đảm 100% khớp các trường: `groupId`, `version`, `level`, `sectionCode`, `mondaiType`, `skill`, `instructions`, `sourceRef`, `sourcePages`, `status`, `questionNumber`, `stem`, `option1..4`, `correctOption`, `explanation`.
- **Định vị trang nguồn (`resolveSourcePage`):**
  - Kiểm tra `sourcePage`: nếu có và >= 1, liên kết tới `/admin/sources/<sourceFileId>#page=<sourcePage>`.
  - Nếu thiếu hoặc số trang không hợp lệ (< 1): trả về `available: false` cùng thông điệp lỗi rõ ràng, không gây crash ứng dụng.

---

## 3. Quản lý điều kiện phụ thuộc ngoài (External Status)

Theo assignment, các điều kiện ngoài chưa sẵn sàng tại lượt này:
- `sample-rights`: MISSING (Đăng ký quyền sở hữu trí tuệ bản quyền tài liệu thật chưa cấp).
- `prepared-import-data`: MISSING (Gói dữ liệu thực tế N1–N5 chưa bàn giao từ chủ dự án).
- `jlpt-blueprints`: MISSING (Bản blueprint chính thức chưa được phê duyệt toàn bộ).

Hệ thống đã xây dựng bộ fixture chuẩn, sandbox dữ liệu và các ca kiểm thử tích hợp đầy đủ. Các tác vụ cần dịch vụ thật được đánh dấu `BLOCKED_EXTERNAL` minh bạch, không giả mạo đã kiểm chứng dịch vụ thực tế.

---

## 4. Bằng chứng kiểm thử và các cổng chất lượng

1. `pnpm test:e2e:import-publish`: 18/18 tests passed (exitCode: 0)
2. `pnpm test:content-review`: 6/6 tests passed (exitCode: 0)
3. `pnpm test:admin`: 100/100 tests passed (exitCode: 0)
4. `pnpm install --frozen-lockfile`: exitCode: 0
5. `pnpm lint`: exitCode: 0 (0 errors, 0 warnings trong toàn bộ apps/admin)
6. `pnpm typecheck`: exitCode: 0 (19/19 packages typechecked)
7. `pnpm build`: exitCode: 0 (Turbopack standalone build thành công cho tất cả app)
