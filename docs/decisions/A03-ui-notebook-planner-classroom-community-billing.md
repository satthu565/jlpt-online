# Quyết định kỹ thuật A03: UI Notebook, Planner, Classroom, Community và Gói Thành Viên

- **Task:** A03
- **Assignment:** A03-2
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** HOÀN TẤT (Sẵn sàng REVIEW)
- **Ngày:** 2026-10-16
- **Branch:** `task/A03`
- **Base SHA:** `5312dce2ef046affbda7947574cae4e052196244`
- **Dependencies:** L03, L05, L04, A02
- **Feature IDs:** [] (nền tảng & tích hợp giao diện toàn diện)

---

## 1. Bối cảnh và mục tiêu

Task A03 hoàn thiện toàn bộ giao diện học viên (Web Frontend) cho các phân hệ học tập nâng cao, tích hợp liền mạch với backend API từ các task L03, L04, L05 và A02:
1. **Sổ tay từ vựng & SRS Review (`apps/web/features/learning/`):**
   - Quản lý sổ tay cá nhân (từ vựng, ngữ pháp, kanji), lọc theo trạng thái/loại/nhãn.
   - Trình luyện flashcard và runner ôn tập ngắt quãng (SRS) có cơ chế xếp hàng ngoại tuyến (`SrsSyncManager`), gửi bất đồng bộ kèm `clientReviewId` duy nhất, xử lý an toàn idempotent replay khi có retry từ mobile/web.
   - Mini-quiz tạo tự động từ sổ tay ôn tập.

2. **Kế hoạch học tập (`apps/web/features/planner/`):**
   - Tạo lộ trình học cá nhân hóa theo mục tiêu JLPT (N1-N5), ngày thi và thời lượng học hàng ngày.
   - Bảng điều khiển tiến độ, streak, cảnh báo nước rút chặng cuối (`isFinalSprint`).
   - Runner buổi học hôm nay và hộp thoại điều chỉnh lộ trình (`ReplanModal`) ghi nhận lý do tái cấu trúc lịch học.

3. **Cổng lớp học & Giáo viên (`apps/web/features/classroom/`):**
   - Bảng điều khiển lớp học đa tổ chức (`ClassroomDashboard`) tích hợp huy hiệu bảo mật quyền riêng tư nhóm học (`CohortPrivacyBadge`), cảnh báo cách ly dữ liệu giữa các tenant (Teacher A không nhìn thấy dữ liệu Organization B).
   - Modal giao bài tập (`CreateAssignmentModal`) với hạn nộp và chọn đối tượng học viên.
   - Xem tiến độ bài tập (`AssignmentProgressView`) chi tiết tỷ lệ hoàn thành, đạt chuẩn và danh sách học viên cần bổ trợ.
   - Xuất điểm (`GradeExportModal`) định dạng CSV/XLSX/JSON/PDF có thông báo phòng chống tấn công chèn công thức (CSV formula injection).

4. **Cộng đồng & Sự kiện thi (`apps/web/features/community/`):**
   - Tiền sảnh sự kiện thi (`ExamEventLobby`) hiển thị đếm ngược thời gian mở đề và thông báo cấm vận kết quả (Embargo notice - ẩn điểm và lời giải trước `resultReleaseAt`).
   - Thảo luận câu hỏi (`QuestionDiscussions`) áp dụng khóa bảo mật chống lộ đề (chỉ mở sau khi học viên hoàn thành câu hỏi/đề thi), hỗ trợ báo cáo vi phạm (`reportComment`) với các lý do chuẩn hóa (`spam`, `spoiler`, `harassment`, `wrong_answer`, `other`).
   - Thẻ chia sẻ thành tích (`AchievementShareCard`).

5. **Gói thành viên & Thanh toán (`apps/web/features/billing/`):**
   - Bảng giá các gói học viên (`PricingTable`) hiển thị giá VND chuẩn hóa, chu kỳ thanh toán và danh mục quyền lợi.
   - Ô nhập mã giảm giá (`CouponInput`) xác thực coupon, tính giảm trừ giá trị thực tế.
   - Thẻ thanh toán (`CheckoutCard`) tổng hợp đơn hàng, chiết khấu và kích hoạt phiên thanh toán.
   - Thẻ trạng thái đăng ký (`SubscriptionStatusCard`) quản lý vòng đời gói (active, cancelled, expired) và gia hạn.
   - Lịch sử giao dịch (`TransactionHistoryCard`) hiển thị trạng thái đơn hàng và huy hiệu hoàn tiền (`RefundStatus`: requested, approved, refunded, rejected).

6. **Cài đặt thông báo & Riêng tư (`apps/web/features/account/`):**
   - Quản lý kênh thông báo (email, push, in-app), thông báo học tập và khung giờ yên tĩnh (Quiet Hours).
   - Cài đặt quyền riêng tư, xuất dữ liệu GDPR và xóa tài khoản tuân thủ lưu trữ pháp lý (Retention-safe deletion).

---

## 2. Tiêu chí nghiệm thu (Acceptance Criteria)

1. **SRS/mobile review sync và notification settings có E2E:**
   - Được chứng minh qua bộ test `pnpm test:e2e:advanced` (16 test cases).
   - Kiểm tra `SrsSyncManager`: xếp hàng đánh giá cục bộ, gắn `clientReviewId` ngẫu nhiên chuẩn hóa, gửi idempotent payload, xử lý an toàn phản hồi `isIdempotentReplay: true`, bảo toàn hàng đợi khi mất mạng.
   - Kiểm tra `NotificationSettings` và `PrivacySettings`: hiển thị đúng toàn bộ kênh, khung giờ yên tĩnh, xuất dữ liệu GDPR và cơ chế xóa tài khoản an toàn.

2. **Teacher giao đề xem progress/export và cohort privacy:**
   - Kiểm tra hiển thị huy hiệu `CohortPrivacyBadge` phân biệt rõ thông điệp giáo viên (chỉ thấy học viên trong tổ chức mình) và học viên (dữ liệu nhóm được bảo vệ, điểm số ẩn danh).
   - `CreateAssignmentModal` cho phép đặt deadline, chọn đề thi và chỉ định học viên.
   - `AssignmentProgressView` thống kê tỷ lệ nộp bài, phân phối điểm, danh sách học viên nộp bài / trễ hạn và nút bổ trợ.
   - `GradeExportModal` hỗ trợ các định dạng kèm cảnh báo Formula Injection Sanitization.

3. **Coupon checkout refund status hiển thị đúng backend:**
   - Được chứng minh qua bộ test `pnpm test:e2e:checkout` (7 test cases).
   - Bảng giá hiển thị đúng giá tiền minor sang VND định dạng phân cách hàng nghìn.
   - `CouponInput` hiển thị thẻ giảm giá đã áp dụng, số tiền giảm và nút gỡ bỏ.
   - `CheckoutCard` tính toán đúng giá trị thanh toán cuối cùng.
   - `SubscriptionStatusCard` phản ánh đúng trạng thái `active` (có nút hủy) và `cancelled` (có nút gia hạn).
   - `TransactionHistoryCard` hiển thị huy hiệu trạng thái giao dịch và hoàn tiền (`refundStatus: requested | refunded | rejected`).

4. **i18n/a11y full routes:**
   - Toàn bộ các route mới: `/so-tay`, `/ke-hoach`, `/lop-hoc`, `/su-kien`, `/thao-luan`, `/goi-thanh-vien`, `/tai-khoan` đều có trang thực, không để nút bấm giả (no dummy buttons).
   - Đầy đủ 3 bộ bản dịch `vi.json`, `ja.json`, `en.json` đồng bộ 100% key, không có giá trị rỗng, tiếng Nhật chuẩn NFC.
   - Đạt chuẩn tiếp cận WCAG 2.1 AA (`pnpm test:a11y`): ARIA roles (`dialog`, `alert`, `tablist`, `tab`, `tabpanel`), landmark, label-input bindings, `aria-invalid`, `aria-busy`.

---

## 3. Các quyết định kỹ thuật và khắc phục sự cố

1. **Khắc phục lỗi TS Strict & ESLint trong phiên trước:**
   - Toàn bộ kiểu `any` trong các file test (`e2e-advanced.test.tsx`, `e2e-checkout.test.tsx`) và component (`ke-hoach/page.tsx`, `planner-dashboard.tsx`) được thay bằng kiểu dữ liệu TypeScript tường minh (`CreateStudyPlanInput`, `ReviewSubmission`, `ReviewResult`, `CouponDiscount`, `CheckoutSession`, `RefundRequestResponse`, `AssignmentAnalytics`, `GradeExportResponse`).
   - Xử lý các biến/import không sử dụng: loại bỏ hoặc thêm tiền tố `_` theo đúng cấu hình ESLint `/^_/u`.
   - Sửa kiểu của `QuestionDiscussionsProps.onReportComment` đồng bộ kiểu union `CommentReportReason = 'spam' | 'spoiler' | 'harassment' | 'wrong_answer' | 'other'`, tránh lỗi biến thiên đối số (contravariance).
   - Bổ sung phương thức `getEventLeaderboard` vào `CommunityClient` để đồng nhất với trang `/su-kien`.

2. **Dọn dẹp file ngoài phạm vi (Boundary Protection):**
   - Xóa file `docs/release/load-baseline-metrics.json` vô tình bị thêm trong checkpoint trước. Đảm bảo toàn bộ thay đổi giữa `5312dce` và `HEAD` chỉ nằm trong các đường dẫn được cấp phép: `apps/web/`, `packages/ui/`, `package.json`, `docs/decisions/`.

3. **Bảo mật cấm vận và chống rò rỉ dữ liệu:**
   - Trang `/su-kien` hiển thị rõ thông báo cấm vận kết quả thi trước mốc `resultReleaseAt`.
   - Trang `/thao-luan` khóa quyền xem và gửi bình luận đối với câu hỏi chưa hoàn thành (`!isCompleted`), ngăn chặn học viên xem lời giải trước khi làm bài.

---

## 4. Kết quả kiểm thử và cổng chất lượng

Mọi kiểm tra của task và các cổng chung của dự án đều vượt qua 100%:
- `pnpm test:e2e:advanced`: 16/16 tests PASS.
- `pnpm test:e2e:checkout`: 7/7 tests PASS.
- `pnpm test:a11y`: 26/26 tests PASS (13 @jlpt/ui + 13 @jlpt/web).
- `pnpm test:web`: 12/12 test files, 150/150 tests PASS.
- `pnpm test:i18n`: 8/8 tests PASS (vi, ja, en đồng bộ 100%, NFC verified).
- `pnpm install --frozen-lockfile`: PASS (clean lockfile).
- `pnpm lint`: PASS (13/13 packages, 0 error, 0 warning).
- `pnpm typecheck`: PASS (19/19 packages, 0 error).
- `pnpm test`: PASS (19/19 packages, 390/390 tests in api, full monorepo pass).
- `pnpm build`: PASS (12/12 packages built successfully, all static/dynamic routes generated).
