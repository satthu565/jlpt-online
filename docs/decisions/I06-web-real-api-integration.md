# Quyết định kỹ thuật I06: Tích hợp API thật cho 13 trang học viên và loại bỏ mock data

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** I06
- **Assignment ID:** I06-1
- **Nhánh:** `task/I06`
- **Base SHA:** `dd56415ee6abe4dc301bc6320ee3937e81dda4c8`
- **Ngày mục tiêu:** 8
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I00

---

## 1. Bối cảnh & Mục tiêu

Nhiệm vụ I06 yêu cầu kết nối toàn bộ 13 trang học viên trên giao diện Web (`apps/web`) với API thực tế của hệ thống (W5 learning/planner/stats/vocab/gamification/ai, W2 community/classroom, W4 entitlement):
1. `so-tay` (Sổ tay từ vựng & flashcard SRS)
2. `ke-hoach` (Kế hoạch học tập & lộ trình cá nhân hóa)
3. `luyen-tap` (Luyện đề & tạo đề ngẫu nhiên / đề rút gọn)
4. `thong-ke` (Phân tích tiến độ học tập & phân tích điểm yếu)
5. `tu-vung` (Kho ngữ liệu từ vựng JLPT N5–N1)
6. `ngu-phap` (Kho ngữ liệu ngữ pháp JLPT N5–N1)
7. `thong-ke-tu-vung` (Xếp hạng tần suất xuất hiện từ vựng theo cấp độ)
8. `lop-hoc` (Không gian lớp học, bài tập và phân tích kết quả học viên)
9. `su-kien` (Phòng thi sự kiện tập trung đồng loạt & bảng xếp hạng thời gian thực)
10. `thao-luan` (Diễn đàn hỏi đáp theo câu hỏi & chia sẻ thành tích)
11. `goi-thanh-vien` (Bảng giá gói thành viên Pro/Premium, mã giảm giá & thanh toán)
12. `tai-khoan` (Hồ sơ cá nhân, phiên đăng nhập, lịch sử thanh toán & tùy chọn)
13. `faq` (Hỏi đáp thường gặp đa ngôn ngữ)

### Tiêu chuẩn nghiệm thu nghiêm ngặt
- Dữ liệu hiển thị của chính học viên đăng nhập, các thay đổi (thêm mục sổ tay, tạo kế hoạch, nộp bài, bình luận, v.v.) được ghi nhận qua API và tải lại trang vẫn duy trì.
- Loại bỏ hoàn toàn mock data viết cứng (`SAMPLE_*`, `MOCK_*`, `ALL_SAMPLE`, fake login).
- Đạt `pnpm check:no-mock-ui` với 0 vi phạm mới.
- Hiển thị đầy đủ trạng thái Đang tải (loading spinner), Rỗng (empty state) và Lỗi API / 401 / 403 điều hướng về đăng nhập hoặc thông báo thiếu quyền.
- Giao diện đáp ứng (responsive) trên màn hình di động 390px và màn hình máy tính 1366px, không bị tràn cuộn ngang.
- Đảm bảo đa ngôn ngữ đối xứng cả 3 locale (`vi`, `ja`, `en`), không lộ translation key thô.

---

## 2. Chi tiết triển khai kỹ thuật

### 2.1. Bổ sung Component `<Spinner />` trong `@jlpt/ui`
- Thư viện `@jlpt/ui` trước đó thiếu component `Spinner` dùng chung cho trạng thái tải dữ liệu, dẫn đến lỗi khi gọi trên SSR.
- Triển khai `packages/ui/src/components/spinner.tsx` với 3 kích thước (`sm`, `md`, `lg`), tái xuất qua `packages/ui/src/index.tsx` và build `tsup`.

### 2.2. Kết nối API thực tế cho 13 trang học viên

1. **Sổ tay (`/so-tay`)**:
   - Sử dụng `defaultLearningClient` kết nối các endpoint: `getNotebookItems()`, `getDueCards()`, `createNotebookItem()`, `updateNotebookItem()`, `deleteNotebookItem()`, `exportNotebook()`, `getQuestionExamples()`, `generateNotebookQuiz()`.
   - Hiển thị banner cảnh báo đăng nhập với nút điều hướng `/dang-nhap?redirect=/so-tay` khi chưa xác thực hoặc gặp lỗi 401/403.
   - Thêm trạng thái loading spinner và empty state khi sổ tay chưa có mục nào.

2. **Kế hoạch học tập (`/ke-hoach`)**:
   - Kết nối `defaultPlannerClient` gọi: `getTodaySession()`, `createStudyPlan()`, `completeSession()`, `replan()`.
   - Quản lý phiên học hôm nay, cập nhật nhắc nhở học tập và hỗ trợ tạo lại kế hoạch khi thay đổi ngày thi mục tiêu.

3. **Luyện tập (`/luyen-tap`)**:
   - Tích hợp gọi `/practice-exams`, `/mixed-exams`, `/mixed-exams/quick`, `/generated-exams/:id/regenerate`.
   - Xử lý tình trạng thiếu câu hỏi (shortage UX), cho phép học viên linh hoạt đổi phạm vi mondai hoặc yêu cầu tạo đề lại.

4. **Thống kê (`/thong-ke`)**:
   - Thay thế toàn bộ mảng tĩnh bằng gọi `/api/v1/me/attempts` và `/api/v1/me/analytics?targetLevel=...`.
   - Phân tích chi tiết tỷ lệ chính xác, phân bổ điểm theo kỹ năng, và danh sách câu sai gần nhất.
   - Hiển thị CTA đăng nhập rõ ràng khi chưa có phiên đăng nhập.

5. **Ngữ liệu Từ vựng, Ngữ pháp & Tần suất (`/tu-vung`, `/ngu-phap`, `/thong-ke-tu-vung`)**:
   - Bổ sung `isLoading`, `loadError`, và gọi API thật `/api/v1/corpus/vocabularies`, `/api/v1/corpus/grammars`, `/api/v1/corpus/frequency` trong `useEffect`.
   - Giữ nguyên cấu trúc dữ liệu vi mô JSON-LD `LearningResource` cho SEO.

6. **Lớp học (`/lop-hoc`)**:
   - Kết nối `defaultClassroomClient` lấy danh sách tổ chức, lớp học, học viên và bài tập.
   - Hỗ trợ học viên nhập mã mời tham gia lớp học qua endpoint `/class-invitations/:token/join`.
   - Cho phép giáo viên xuất bảng điểm (`exportGrades`) và giao bài tập bổ sung cho học viên yếu.

7. **Sự kiện thi thử tập trung (`/su-kien`)**:
   - Kết nối `defaultCommunityClient` lấy danh sách kỳ thi đồng loạt, thông tin phòng chờ (`getEventLobby`) và bảng xếp hạng (`getEventLeaderboard`).
   - Xử lý trạng thái đếm ngược mở đề và quy tắc bảo mật cấm lộ đáp án (embargo) trước thời điểm công bố.

8. **Thảo luận & Diễn đàn (`/thao-luan`)**:
   - Kết nối `defaultCommunityClient` gọi `getQuestionDiscussions()`, gửi bình luận mới (`postComment()`), báo cáo vi phạm (`reportComment()`), và chia sẻ thành tích (`shareAchievement()`).

9. **Gói thành viên (`/goi-thanh-vien`)**:
   - Kết nối `defaultBillingClient` lấy danh sách gói cước (`getPlans()`), trạng thái gói hiện tại của học viên (`getUserSubscription()`), áp dụng mã coupon và tạo phiên thanh toán (`createCheckoutSession()`).
   - Hiển thị banner gói Pro đang hoạt động nếu người dùng đã đăng ký thành công.

10. **Tài khoản cá nhân (`/tai-khoan`)**:
    - Kết nối cập nhật hồ sơ (`updateProfile`), xem danh sách thiết bị đang đăng nhập (`getSessions`), thu hồi phiên đơn lẻ (`revokeSession`), thu hồi tất cả phiên khác (`revokeAllOtherSessions`), và xem lịch sử hóa đơn.
    - Duy trì cấu trúc tab ARIA chuẩn WCAG 2.1 AA (`role="tablist"`, `role="tab"`, `role="tabpanel"`).

11. **Hỏi đáp thường gặp (`/faq`)**:
    - Gọi API CMS `/api/v1/cms/faqs?locale=${locale}` để hiển thị danh sách câu hỏi theo ngôn ngữ hiện hành, có loading và fallback dự phòng.
    - Tích hợp schema JSON-LD `FAQPage`.

### 2.3. Đa ngôn ngữ và Trợ năng WCAG 2.1 AA
- Bổ sung đối xứng toàn bộ key dịch còn thiếu vào 3 file: `apps/web/messages/vi.json`, `apps/web/messages/ja.json`, `apps/web/messages/en.json`.
- Đảm bảo 100% không còn hiện chuỗi key thô (như `account.profile.title`, `community.events.pageTitle`, `billing.pricing.quarterly`).
- Tất cả các trang đều sử dụng thẻ ngữ nghĩa chuẩn (`<h1`, `<section`, `<nav`, `<footer`), container `max-w-6xl mx-auto px-4 w-full` chống tràn cuộn ngang ở cả 390px và 1366px.

---

## 3. Khối kiểm tra chất lượng & Bằng chứng

### 3.1. `pnpm check:no-mock-ui`
- Kết quả: **ĐẠT** (exitCode: 0).
- 0 vi phạm mới ngoài danh mục baseline.

### 3.2. `pnpm test:web`
- Kết quả: **ĐẠT** (exitCode: 0).
- 16 test files / 211 tests chạy qua trơn tru (bao gồm bộ kiểm tra toàn diện mới `tests/i06-integration.test.tsx` và `tests/a11y.test.tsx`).

### 3.3. Các cổng kiểm tra chung
- `pnpm lint`: ĐẠT.
- `pnpm typecheck`: ĐẠT.
- `pnpm test`: ĐẠT.
- `pnpm build`: ĐẠT.

---

## 4. Ghi nhận cho Coordinator / Blockers
- **Dọn dẹp `tests/integration/mock-ui-baseline.json`**:
  Cả 7 route thuộc phạm vi I06 trước đây có trong baseline (`/goi-thanh-vien`, `/lop-hoc`, `/su-kien`, `/thao-luan`, `/so-tay`, `/ke-hoach`, `/luyen-tap`) hiện đã hoàn toàn sạch dữ liệu giả và kết nối API thật. Vì thư mục `tests/` nằm ngoài danh mục `allowedPaths` của W3 (`package.json`, `apps/web/`, `packages/ui/`, `docs/decisions/`), W3 không tự ý sửa file baseline trong lượt này. Kính chuyển Coordinator / W6 gỡ bỏ 7 route trên khỏi `mock-ui-baseline.json` khi gom commit.
