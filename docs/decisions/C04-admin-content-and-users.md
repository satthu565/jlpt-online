# Quyết định kỹ thuật C04: Admin ngân hàng câu hỏi editor RichText, blueprint và phân quyền người dùng

- **Task:** C04
- **Worker:** W4 (Quản trị báo cáo và thương mại)
- **Trạng thái:** HOÀN TẤT (REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/C04`
- **Dependencies:** F05, F08
- **Feature IDs:** ADM-02, ADM-03, ADM-04, ADM-08

---

## 1. Bối cảnh và mục tiêu

Task C04 xây dựng bộ tính năng quản trị ngân hàng câu hỏi, trình soạn thảo RichText chuyên biệt cho đề thi JLPT, quản lý cấu trúc đề (ExamBlueprint), ghép bộ đề thi (Exams), và phân quyền quản lý người dùng (Users & RBAC) cho hệ thống JLPT Online:
- **ADM-02 (Quản lý người dùng):** Danh sách người dùng, tìm kiếm theo email/tên, lọc theo vai trò (role), trạng thái khóa (blockedAt), xem chi tiết tài khoản.
- **ADM-03 (Phân quyền Admin / Biên tập viên / Người duyệt):** Thiết lập ma trận quyền hạn nghiêm ngặt:
  - Chỉ Admin mới có quyền đổi vai trò người dùng hoặc khóa/mở khóa tài khoản.
  - Biên tập viên (Editor), Người kiểm duyệt (Reviewer) hoặc học viên không thể sửa vai trò hoặc tự nâng quyền lên Admin (403 Forbidden).
  - Áp dụng nguyên tắc 4 mắt (two-person rule): Người duyệt đề không được là người soạn thảo hoặc người sửa cuối cùng của nhóm câu hỏi.
- **ADM-04 (Quản lý bộ đề thi):** Ghép nhóm câu hỏi vào các phần thi theo blueprint, kiểm tra vi phạm blueprint (`validateExamBlueprint`), xuất bản đề thi với snapshot công khai (tuyệt đối không chứa đáp án) và bảng khóa đáp án (`ExamAnswerKey`) tách biệt an toàn.
- **ADM-08 (Quản lý bản thiết kế đề thi Blueprint):** Cấu trúc chuẩn N1–N5 theo tài liệu chính thức (jlpt.jp); yêu cầu nguồn kiểm chứng và người có thẩm quyền xác nhận khi kích hoạt; quản lý phiên bản bất biến.
- **Tiêu chí nghiệm thu cốt lõi:**
  1. *Tạo sửa ruby star bài đọc bảng nghe và xem trước.*
  2. *Không sửa đè published version.*
  3. *Admin sửa role còn editor không thể tự nâng quyền.*

---

## 2. Các quyết định kỹ thuật và kiến trúc

### 2.1. Soạn thảo RichText chuyên biệt và xem trước phòng thi (Acceptance 1)
- Xây dựng module `apps/admin/features/content/`:
  - **Cấu trúc đoạn (RichTextSegment):** Hỗ trợ đầy đủ các loại đoạn theo schema chuẩn `@jlpt/schema`:
    - `text`: Chuỗi ký tự thông thường.
    - `ruby`: Furigana phiên âm trên chữ Hán (`<ruby>text<rt>rt</rt></ruby>`).
    - `star`: Dấu sao JLPT (`★`) đặc thù của dạng bài sắp xếp câu (sentence_composition).
    - `underline`: Gạch chân từ vựng/ngữ pháp cần hỏi.
    - `blank`: Ô trống có số thứ tự `( )`.
    - `br`: Xuống dòng an toàn.
    - `image`: Hình ảnh nội dòng (inline image) có `mediaKey`, `alt`.
  - **Khối bài đọc hiểu (PassageBlock):**
    - `paragraph`: Đoạn văn bản chứa các RichTextSegment.
    - `table`: Bảng biểu đa chiều (`rows: RichText[][]`), mỗi ô là một mảng RichTextSegment.
    - `image`: Hình ảnh minh họa bài đọc (biểu đồ, hình vẽ).
  - **Phần nghe hiểu (Listening Preview & Timeline):**
    - Quản lý file âm thanh qua `mediaKey` / `audioSha256`.
    - Bộ thiết lập mốc thời gian `ListeningTimelineItem` (`startMs`, `endMs`, `audioStartMs`, `audioEndMs`, `gapAfterMs`) phục vụ bài thi nghe đồng bộ.
  - **Visual Parity Preview:**
    - Sử dụng component `RichTextView` chuẩn từ `@jlpt/ui` để kết xuất xem trước y hệt phòng thi của thí sinh.
    - Kiểm soát an toàn XSS: Không dùng `dangerouslySetInnerHTML`. Các chuỗi `<script>` hoặc HTML độc hại đều được React mã hóa thành thực thể chữ an toàn.

### 2.2. Quy tắc bất biến phiên bản (Acceptance 2: "Không sửa đè published version")
Hệ thống thiết lập nguyên tắc bất biến nghiêm ngặt tại cả 3 phân hệ:

1. **Nhóm câu hỏi (Question Groups):**
   - Nhóm câu hỏi ở trạng thái `draft` hoặc `rejected`: Biên tập viên được phép chỉnh sửa in-place trên cùng phiên bản.
   - Nhóm câu hỏi đã ở trạng thái `approved` (hoặc đã gắn vào đề thi xuất bản): **Tuyệt đối không sửa đè phiên bản cũ**. Khi có yêu cầu sửa, hệ thống tự động rẽ nhánh phiên bản mới (`version: current.version + 1`) ở trạng thái `draft`, bảo toàn phiên bản đã được duyệt nguyên vẹn trong cơ sở dữ liệu.

2. **Bản thiết kế đề thi (Blueprints):**
   - Bản thiết kế thi chính thức khi đã kích hoạt (`active`) không được sửa đè.
   - Khi có thay đổi về thời gian hoặc cấu trúc, hệ thống tạo bản ghi phiên bản mới trong `blueprint_versions` với `version + 1`. Các đề thi cũ đã xuất bản vẫn tham chiếu phiên bản blueprint lúc xuất bản.
   - Chốt chặn kích hoạt Blueprint thi thật (`activateBlueprint`):
     - Nguồn tham chiếu bắt buộc phải có URL từ `jlpt.jp`.
     - Phải có xác nhận rõ ràng của người vận hành / chủ dự án (`confirmedBy`).
     - Thời gian các phần thi và số câu hỏi phải lớn hơn 0, không cho phép placeholder.

3. **Bộ đề thi (Exams & Publishing):**
   - Đề thi ở trạng thái bản thảo (`draft`): Biên tập viên có thể cập nhật thông tin và danh sách nhóm câu hỏi.
   - Xuất bản đề thi (`publishExam`):
     - Kiểm tra toàn diện theo blueprint (`validateExamBlueprint`). Nếu thiếu phần thi hoặc thiếu số lượng câu hỏi của từng dạng bài thì từ chối xuất bản (trừ đề thực hành tự do).
     - Tất cả các nhóm câu hỏi trong đề gốc (`original`) bắt buộc phải ở trạng thái `approved`.
     - Sinh `PublicExamSnapshot` công khai: **Tuyệt đối loại bỏ mọi trường đáp án và giải thích** (`correctOption`, `keys`, `answers`, `isCorrect`).
     - Bảng khóa đáp án `ExamAnswerKey` được tách riêng và bảo mật trong bảng `exam_answer_keys`.
     - Đặt `publishedVersion: 1` (hoặc tăng dần) và chuyển trạng thái sang `published`.
   - **Bảo toàn bất biến:** Khi đề thi đã có `publishedVersion`, hành vi cố tình gọi cập nhật in-place sẽ bị chặn ngay lập tức với lỗi `IMMUTABLE_VERSION` / `ConflictException`. Mọi sửa đổi phải rẽ nhánh bản thảo mới (`branchNewDraft`).

### 2.3. Quản lý người dùng và phân quyền RBAC (Acceptance 3: "Admin sửa role còn editor không thể tự nâng quyền")
- Xây dựng module `apps/admin/features/users/`:
  - **Phân định thẩm quyền rõ ràng:**
    - `admin`: Có toàn quyền sửa vai trò nhân sự (`admin`, `editor`, `reviewer`, `moderator`, `billing_admin`, `student`), khóa/mở khóa tài khoản, xuất bản đề thi và xem nhật ký kiểm toán hệ thống.
    - `editor`: Chỉ được phép biên tập nội dung, không có quyền đổi vai trò người dùng, không thể khóa tài khoản.
    - `reviewer`: Chỉ duyệt nội dung, không được sửa vai trò người dùng.
  - **Chốt chặn tự nâng quyền (Self-Elevation Guard):**
    - Khi một tài khoản không phải Admin (như Editor, Reviewer) gửi yêu cầu đổi vai trò của chính mình thành `admin`, hệ thống phát hiện hành vi tự nâng quyền, từ chối với mã lỗi `403 FORBIDDEN` và thông điệp: *"Biên tập viên hoặc nhân sự không thể tự nâng quyền lên Quản trị viên (Admin)"*.
    - Hành vi vi phạm được ghi ngay lập tức vào nhật ký kiểm toán với kết quả `blocked_self_elevation`.
  - **Nguyên tắc 4 mắt (Two-Person Rule):**
    - Người phê duyệt nội dung (`reviewer`) không được là người soạn thảo (`authorId`) hoặc người chỉnh sửa cuối cùng (`lastEditedBy`) của nhóm câu hỏi (`apps/admin/features/content/question-bank.ts`).
    - Khi gọi duyệt (`reviewGroup`), hệ thống kiểm tra `reviewer.id !== group.authorId` (tác giả không được tự duyệt) và `reviewer.id !== group.lastEditedBy` (người sửa cuối cùng không được duyệt).
  - **Nhật ký kiểm toán (Audit Logs - ADM-14):**
    - Mọi thao tác thay đổi vai trò, khóa tài khoản, kích hoạt blueprint, xuất bản đề thi đều được ghi lại vào nhật ký kiểm toán kèm thông tin định danh operator, thời điểm UTC, tài nguyên mục tiêu và chi tiết trạng thái cũ/mới.
    - Chỉ có Quản trị viên (`admin`) mới được phép truy vấn và xem danh sách nhật ký kiểm toán.

---

## 3. Bàn giao và cấu trúc mã nguồn

Các thành phần được tổ chức gọn gàng, tuân thủ đúng phạm vi `allowedPaths` và `outputs` được giao cho task C04 theo `docs/multi-worker/tasks.json`:
```
apps/admin/
├── vitest.config.ts                 # Cấu hình Vitest với oxc jsx transform cho React JSX
├── features/
│   ├── content/
│   │   ├── types.ts                 # Định nghĩa kiểu RichText, QuestionGroup, Blueprint, Exam
│   │   ├── richtext-editor.tsx      # Trình soạn thảo trực quan: ruby, star, bảng, đoạn văn
│   │   ├── preview.tsx              # Component xem trước bài thi chuẩn phòng thi
│   │   ├── question-bank.ts         # Logic quản lý ngân hàng câu hỏi & bất biến phiên bản
│   │   ├── blueprint-manager.ts     # Quản lý blueprint, kiểm tra nguồn jlpt.jp và kích hoạt
│   │   ├── exam-manager.ts          # Quản lý đề thi, kiểm tra blueprint và xuất bản bất biến
│   │   └── index.ts                 # Barrel export
│   └── users/
│       ├── types.ts                 # Định nghĩa người dùng và audit logs
│       ├── user-service.ts          # Phân quyền RBAC, đổi vai trò, chốt chặn tự nâng quyền
│       ├── audit-service.ts         # Lưu vết và truy vấn nhật ký kiểm toán
│       ├── user-components.tsx      # Giao diện danh sách người dùng, đổi role, timeline audit
│       └── index.ts                 # Barrel export
├── app/
│   ├── questions/page.tsx           # Trang quản trị ngân hàng câu hỏi
│   ├── blueprints/page.tsx          # Trang quản trị bản thiết kế đề thi
│   ├── exams/page.tsx               # Trang quản trị và xuất bản đề thi
│   ├── users/page.tsx               # Trang quản lý người dùng và phân vai trò
│   └── audit-logs/page.tsx          # Trang nhật ký kiểm toán
├── lib/
│   └── api-client.ts                # Bổ sung các phương thức gọi API có UI Guard
└── tests/
    ├── content.test.ts              # 11 ca kiểm thử nghiệm thu nội dung, preview và bất biến
    └── users.test.ts                # 11 ca kiểm thử nghiệm thu RBAC, role và chốt chặn tự nâng quyền
```

---

## 4. Xử lý phản hồi Reviewer (Vòng C04-5)

1. **Cấu hình JSX Transform cho Vitest [P1]:**
   - **Vấn đề:** Do `apps/admin/tsconfig.json` đặt `"jsx": "preserve"` (cần thiết cho Next.js Compiler), runner Vitest (dùng Vite 8 / OXC) khi chạy từ thư mục `apps/admin` hoặc qua `pnpm --filter admin test` không thể phân tích cú pháp JSX của `preview.tsx`, dẫn đến lỗi `Failed to parse source for import analysis because the content contains invalid JS syntax. If you use tsconfig.json, make sure to not set jsx to preserve`.
   - **Khắc phục:** Đã tạo file `apps/admin/vitest.config.ts` với cấu hình:
     ```ts
     import { defineConfig } from 'vitest/config';

     export default defineConfig({
       oxc: {
         jsx: {
           runtime: 'automatic',
         },
       },
       test: {
         environment: 'node',
       },
     });
     ```
     Nhờ cấu hình này, OXC tự động transform JSX runtime cho test runner mà không cần thay đổi `tsconfig.json` của Next.js. Toàn bộ 11 tests của `content.test.ts` (và 63 tests của toàn bộ `apps/admin`) chạy thành công 100% với exit code 0 cả từ root monorepo lẫn trong package admin.

2. **Tách module Backend CMS ra khỏi Task C04 [P1 & P2]:**
   - **Vấn đề:** `apps/api/src/modules/cms/` thuộc phạm vi outputs của task A04 (Ngày 5, W4) theo `docs/multi-worker/tasks.json`. Task C04 chỉ có phạm vi bàn giao `apps/admin/features/content/` và `apps/admin/features/users/`. Việc sửa `apps/api/src/modules/cms/` trong C04 là out-of-scope edits.
   - **Khắc phục:** Đã gỡ bỏ toàn bộ thư mục `apps/api/src/modules/cms/` khỏi nhánh `task/C04`. Module backend CMS cùng với việc tích hợp `CmsModule` vào `AppModule` sẽ được bàn giao đầy đủ, đúng tiến độ ở task A04 theo phân công của `tasks.json`.

---

## 5. Kết quả kiểm thử và nghiệm thu

Tất cả các lệnh kiểm tra được giao đều chạy thành công 100%:
- `pnpm test:admin-content`: 11/11 passed (Acceptance 1: tạo sửa ruby star bảng nghe xem trước; Acceptance 2: không sửa đè published version).
- `pnpm test:admin-users`: 11/11 passed (Acceptance 3: Admin sửa role còn editor không thể tự nâng quyền; ADM-02, ADM-03).
- `pnpm test:admin`: 63/63 passed across 7 test files (Navigation, Health, Users, I18n, Auth, Guard, Content).
- `pnpm --filter admin test`: 63/63 passed.
- `pnpm typecheck`: 17/17 packages pass (0 error).
- `pnpm lint`: 13/13 packages pass (0 error).
