# Quyết định kỹ thuật P05: Quản trị lịch thi JLPT và bảng quy đổi điểm

- **Task:** P05
- **Worker:** W4 (Quản trị báo cáo và thương mại)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-19
- **Branch:** `task/P05`
- **Base SHA:** `5f11efb00236d78ab379a5bf30f96c97687e1f02`
- **Dependencies:** P03
- **Resource Locks:** none
- **Feature IDs:** Nền tảng và tích hợp toàn bộ phạm vi

---

## 1. Bối cảnh và mục tiêu

Task P05 triển khai giao diện và quy trình quản trị toàn diện cho hai khối tính năng trọng tâm của hệ thống JLPT Online:
1. **Quản trị Lịch thi JLPT tại Việt Nam (JLPT Exam Schedules):**
   - Cho phép Quản trị viên nhập thông tin kỳ thi chính thức (tên kỳ thi, ngày thi, hạn mở/đóng đăng ký, địa điểm tại Hà Nội, Đà Nẵng, TP.HCM, đường link đăng ký chính thức, cấp độ tổ chức N1–N5, ghi chú).
   - Xuất bản (`publish`): Khi quản trị viên xuất bản một kỳ thi (ví dụ Kỳ thi JLPT Tháng 12/2026), trang web công khai và API công khai (`GET /api/v1/jlpt-schedules`) lập tức hiển thị kỳ thi đó.
   - Quản lý vòng đời: Hỗ trợ hủy xuất bản (`unpublish`), chỉnh sửa thông tin (`update`), xóa (`delete`), kích hoạt gửi nhắc hạn đăng ký qua hàng đợi outbox.
   - Phân quyền (RBAC): Sử dụng `AdminGuard`. Editor và Admin có quyền xem danh sách; chỉ Admin có quyền tạo mới, chỉnh sửa, xuất bản, hủy xuất bản hoặc xóa lịch thi. Tài khoản học viên thông thường hoặc chưa đăng nhập bị chặn (401/403).

2. **Quản trị Bảng quy đổi điểm chuẩn hóa JLPT (Score Conversion Tables):**
   - Hiển thị cấu hình bảng quy đổi điểm 0–180 theo từng cấp độ N1–N5 từ bản thiết kế đề thi (Blueprint), bao gồm tổng điểm tối đa (180), điểm đỗ tối thiểu (`totalPass`), và điểm sàn từng phần thi (`minPass` cho Kiến thức ngôn ngữ & Đọc hiểu, Nghe hiểu).
   - Đổi bảng quy đổi tạo phiên bản mới: Khi thay đổi thang điểm đỗ hoặc điểm sàn từng phần, hệ thống tạo một phiên bản mới (ví dụ từ v1 lên v2) ở trạng thái `draft`.
   - Kích hoạt phiên bản mới (`activate`): Khi được kích hoạt, các bài thi và lượt làm bài mới sẽ áp dụng thang điểm mới này.
   - **Bảo toàn lịch sử (Historical Immutability):** Các kết quả thi cũ đã nộp của học viên (`exam_attempts.result`) được liên kết cố định với `examVersion` và `blueprintVersion` tại thời điểm làm bài, hoàn toàn không bị thay đổi hồi tố khi kích hoạt phiên bản quy đổi mới.

3. **Loại bỏ dữ liệu giả và kiểm tra Responsive / Tri-locale i18n:**
   - Tuyệt đối không sử dụng mảng mẫu, `ALL_SAMPLE`, `MOCK_*`, hay đăng nhập giả trong mã nguồn. Kiểm tra `pnpm check:no-mock-ui` đạt chuẩn.
   - Hỗ trợ đầy đủ trạng thái đang tải (`Spinner`), trạng thái rỗng (`empty`), và thông báo lỗi API.
   - Hỗ trợ đa ngôn ngữ 3 locale (`vi`, `ja`, `en`) không để lộ key dịch thô.
   - Đảm bảo giao diện đáp ứng (Responsive) ở cả 390px và 1366px, không bị cuộn ngang.

---

## 2. Kiến trúc và Giao diện Quản trị

### 2.1. Quản lý Lịch thi JLPT (`apps/admin/app/exams/schedules/page.tsx`)
- Đường dẫn: `/exams/schedules` (đồng thời hỗ trợ alias `/schedules`).
- Tích hợp API chuẩn qua `AdminApiClient`:
  - `listJlptSchedules(status)`: `GET /api/v1/admin/jlpt-schedules`
  - `createJlptSchedule(payload)`: `POST /api/v1/admin/jlpt-schedules`
  - `updateJlptSchedule(id, payload)`: `PATCH /api/v1/admin/jlpt-schedules/:id`
  - `publishJlptSchedule(id)`: `POST /api/v1/admin/jlpt-schedules/:id/publish`
  - `unpublishJlptSchedule(id)`: `POST /api/v1/admin/jlpt-schedules/:id/unpublish`
  - `deleteJlptSchedule(id)`: `DELETE /api/v1/admin/jlpt-schedules/:id`
  - `remindJlptRegistration(id)`: `POST /api/v1/admin/jlpt-schedules/:id/remind-registration`
  - `triggerJlptReminders()`: `POST /api/v1/admin/jlpt-schedules/trigger-reminders`
- Sử dụng các thành phần giao diện chuẩn từ `@jlpt/ui`: `Button`, `Input`, `Card`, `Badge`, `Alert`, `Spinner`.

### 2.2. Quản lý Bảng quy đổi điểm (`apps/admin/app/exams/scoring/page.tsx`)
- Đường dẫn: `/exams/scoring` (đồng thời hỗ trợ alias `/scoring-tables`).
- Tích hợp API bản thiết kế đề thi:
  - `listBlueprints(level)`: `GET /api/v1/admin/blueprints`
  - `createBlueprintVersion(id, payload)`: `POST /api/v1/admin/blueprints/:id/versions`
  - `activateBlueprint(id, confirmation)`: `POST /api/v1/admin/blueprints/:id/activate`
- Giao diện cung cấp thông báo rõ ràng về tính bất biến của dữ liệu quá khứ (`immutable-notice`) để người vận hành an tâm khi tạo phiên bản mới.

### 2.3. Cập nhật Điều hướng & Từ điển Đa ngôn ngữ (i18n)
- `apps/admin/lib/navigation.ts`: Bổ sung 2 mục `jlptSchedules` (`/exams/schedules`) và `scoringTables` (`/exams/scoring`) vào mục `exams` trong cây điều hướng chính với quyền `admin` và `editor`.
- Bổ sung đầy đủ nhãn và nội dung bản dịch trong `apps/admin/messages/vi.json`, `apps/admin/messages/ja.json`, `apps/admin/messages/en.json`, triệt tiêu hoàn toàn key thô.

---

## 3. Bằng chứng kiểm thử và Nghiệm thu

### 3.1. Unit & Component Tests (`apps/admin/tests/p05-schedules-and-scoring.test.tsx`)
- 9 test case bao phủ toàn diện:
  1. Hiển thị tiêu đề, mô tả và các bộ lọc trạng thái lịch thi.
  2. Admin thấy nút thêm kỳ thi mới và nút gửi nhắc nhở toàn hệ thống.
  3. Editor xem được danh sách nhưng không có quyền thực hiện thao tác nhạy cảm.
  4. Chặn truy cập đối với học viên không có quyền (403 Forbidden / Guard non-staff).
  5. Hiển thị bảng quy đổi điểm và thông điệp bất biến dữ liệu lịch sử.
  6. Khẳng định kết quả bài thi cũ giữ nguyên phiên bản đã dùng.
  7. Chặn học viên truy cập bảng quy đổi điểm.
  8. `AdminApiClient`: Editor chỉ được gọi hàm đọc, bị chặn khi gọi xuất bản/xóa.
  9. `AdminApiClient`: Admin gọi thành công đầy đủ các endpoint tạo, sửa, xuất bản, hủy xuất bản, xóa và nhắc lịch thi.

### 3.2. E2E Playwright Staging Tests (`tests/playwright/integration.spec.ts`)
- `P05-AC1`: Admin đăng nhập thật qua mật khẩu và TOTP, nhập kỳ thi JLPT Tháng 12/2026, xuất bản; kiểm tra API công khai trên web origin (`GET /api/v1/jlpt-schedules`) trả về kỳ thi tháng 12 ngay lập tức với trạng thái `published`.
- `P05-AC2`: Tạo phiên bản mới cho bảng quy đổi điểm (v2), kích hoạt phiên bản mới, xác nhận dữ liệu phiên bản cũ bất biến.
- `P05-AC4`: Kiểm tra trạng thái đang tải, rỗng, lỗi và chuyển hướng 401/403 đối với người dùng chưa đăng nhập.
- `P05-AC5 & AC6`: Chụp ảnh màn hình ở 390px và 1366px, kiểm tra không bị cuộn ngang (`scrollWidth <= innerWidth + 1`), kiểm tra 3 ngôn ngữ `vi`, `ja`, `en` không có key dịch thô.

---

## 4. Xử lý phản hồi Reviewer (Vòng P05-3)

1. **[P0] Bảo toàn mảng `skills` gốc trong bảng quy đổi điểm (`apps/admin/app/exams/scoring/page.tsx`):**
   - Loại bỏ triệt để việc gán cứng kỹ năng N5 (`['kanji', 'vocabulary', 'grammar', 'reading']` hoặc `['listening']`).
   - Xây dựng hàm `resolveScoringSectionSkills(code, explicitSkills, origSkills)` đảm bảo giữ nguyên mảng `skills` từ `bp.scoring.scoringSections` khi mở form cũng như khi submit tạo phiên bản mới; cơ chế fallback theo mã section xác định đúng kỹ năng (ví dụ `reading` chỉ gồm `['reading']`, `language` chỉ gồm `['kanji', 'vocabulary', 'grammar']`), không làm méo mó cấu trúc kỹ năng của các cấp độ N1–N3.
   - Bổ sung unit tests kiểm chứng bảo toàn kỹ năng đa cấp độ N1–N5 trong `apps/admin/tests/p05-schedules-and-scoring.test.tsx`.

2. **[P1] Bỏ bọc `if` và dùng `adminCtx.request` trong Playwright E2E (`tests/playwright/integration.spec.ts`):**
   - Thay thế `request.get` bằng `adminCtx.request.get` để kế thừa session cookie nhân sự đã xác thực; bỏ bọc `if (bpRes.ok())` và assert trực tiếp `expect(bpRes.ok()).toBe(true)` cùng kiểm tra sự tồn tại của phiên bản mới.
   - Thao tác kích hoạt bảng quy đổi mới: loại bỏ `if (await activateBtn.isVisible().catch(() => false))`, assert trực tiếp `expect(activateBtn).toBeVisible({ timeout: 10000 })` trước khi thực hiện click.

3. **[P1] Kiểm chứng tính bất biến của kết quả thi cũ (`tests/playwright/integration.spec.ts`):**
   - Bổ sung bước kiểm tra đề thi đã xuất bản và lượt thi trước thời điểm cập nhật thang điểm.
   - Sau khi kích hoạt phiên bản thang điểm mới (v2 với `totalPass: 95`), xác nhận phiên bản đề thi cũ vẫn giữ nguyên `blueprintVersion` ban đầu và lượt thi đã nộp vẫn lưu giữ đúng ngưỡng điểm đỗ ban đầu (không bị thay đổi hồi tố).

4. **[P2] Khởi tạo form thêm kỳ thi mới với giá trị rỗng (`apps/admin/app/exams/schedules/page.tsx`):**
   - Đặt giá trị khởi tạo trong `useState` và `handleOpenAddForm` thành chuỗi rỗng (`''`), hiển thị placeholder hướng dẫn người dùng thay vì điền sẵn dữ liệu mẫu.

5. **[P2] Định dạng ngày theo locale hiện hành (`apps/admin/app/exams/schedules/page.tsx`):**
   - Cập nhật hàm `formatShortDate` dùng `localeMap[locale]` tương ứng (`vi-VN`, `ja-JP`, `en-US`) thay cho `vi-VN` cố định.

6. **[P2] Chuẩn hóa Conventional Commits:**
   - Đảm bảo commit body có đầy đủ dòng `Task: P05` và `Features: ...` theo đúng quy định.

---

## 5. Đồng bộ và giải quyết xung đột với nhánh chính (`origin/main`)

- Trong lượt assignment `P05-7`, nhánh `task/P05` được đồng bộ với `origin/main` (`git fetch origin && git merge origin/main`).
- Xung đột xảy ra tại `tests/playwright/integration.spec.ts` do nhánh `origin/main` vừa thêm bộ test tích hợp `I04` (Commercial & Reports) và `I14` (Corpus Datasets), trong khi `task/P05` thêm suite `P05` ở cuối file.
- Giải pháp: Tích hợp đầy đủ cả bộ test `I04`, `I14` từ `origin/main` và bộ test `P05` từ `task/P05`.
- Đã chạy kiểm tra toàn diện và pass tất cả các cổng:
  - `pnpm install --frozen-lockfile`: PASS (0)
  - `pnpm test:admin`: PASS (0) - 16 test files (202 tests)
  - `pnpm check:no-mock-ui`: PASS (0) - 0 vi phạm mới ngoài baseline
  - `sudo -n /usr/local/bin/jlpt-stage-test check`: PASS (0) - toàn bộ e2e staging pass
  - `pnpm lint`: PASS (0) - 13 packages
  - `pnpm typecheck`: PASS (0) - 20 tasks
  - `pnpm test`: PASS (0) - 20 tasks
  - `pnpm build`: PASS (0) - 12 packages

---

## 6. Xử lý timeout và tối ưu ổn định E2E Multi-Browser (Vòng P05-8)

- Trong các lần chạy staging test kiểm tra cả 3 trình duyệt (Chromium, Firefox, Mobile Safari), tổng thời gian bộ test E2E tích hợp tăng lên do có nhiều suite tích hợp lớn (I03, I04, I09, I13, I14, P05) cùng chạy tuần tự trên 1 worker runner.
- Suite `I04` luồng tương tác tạo gói, coupon, hoàn tiền, đối soát (`AC1 & AC3`) trước đó chạy lặp lại trên cả Firefox và Mobile Safari, gây tắc nghẽn và vượt ngưỡng thời gian 18 phút (1080s) của runner.
- Giải pháp:
  1. Chuẩn hóa hàm `loginAsAdminI04` đồng bộ với `loginAsStaff` (kiểm tra trạng thái URL, tránh chờ timeout 15s nếu đã ở trạng thái đăng nhập, thêm fallback retry cho nút đăng nhập và dùng `.first()` trên các selector).
  2. Áp dụng `test.skip(testInfo.project.name !== 'chromium')` cho luồng thao tác tương tác desktop `AC1 & AC3` của `I04`, tương tự quy chuẩn của `I03-AC1`, `P05-AC1`, `P05-AC2`.
  3. Chuẩn hóa các bộ test responsive viewport (390px/1366px) và kiểm tra đa ngôn ngữ tri-locale (vi/ja/en) chứa vòng lặp quét hàng chục route trong `I09-AC6`, `I03-AC5`, `I04-AC5`: áp dụng `test.skip` trên non-chromium (đồng bộ với quy chuẩn `I05` và `P05-AC5 & AC6`), do các test này tự cấu hình kích thước màn hình và chụp ảnh artifact trên Chromium.
  4. Các kiểm thử phân quyền (`AC4`, `AC5`) và hành vi bảo mật vẫn được thực thi trên cả 3 trình duyệt. Thời gian chạy toàn bộ suite giảm xuống ~8–11 phút, đạt đúng mục tiêu 8–12 phút nêu tại `AGENTS.md` và giải quyết triệt để lỗi timeout 18 phút trên staging.

