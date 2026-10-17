# Quyết định kỹ thuật R03: Sửa lỗi web và kiểm tra thiết bị thật (Vòng 3 - Phản hồi Reviewer W2)

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** R03
- **Assignment ID:** R03-3
- **Nhánh:** `task/R03`
- **Base SHA:** `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Ngày mục tiêu:** 7
- **Trạng thái:** REVIEW
- **Phụ thuộc:** V03, V06

---

## 1. Bối cảnh & Tiếp thu phản hồi Review chéo từ W2

Trong lượt review trước của task R03, Reviewer W2 đã đưa ra 5 điểm yêu cầu cải tiến (3 P1 và 2 P2):
1. **[P1] Kiểm tra điều kiện ngoại vi từ file thật:** Ca kiểm thử ở Section 6 assert chuỗi tĩnh thay vì đọc trực tiếp file hồ sơ ngoại vi `docs/multi-worker/external-prerequisites.json` hoặc kiểm chứng fallback logic của ứng dụng.
2. **[P1] Kiểm thử tính năng đồng bộ khi màn hình mở khóa (`visibilitychange`):** Tính năng `visibilitychange` trong `AudioPlayer` chưa có ca kiểm thử chứng minh hàm `syncWithTimeline` được kích hoạt khi `visibilityState === 'visible'` và listener được dọn dẹp (cleanup).
3. **[P1] Quyền chỉnh sửa file `package.json` gốc:** Bổ sung script `test:device` ở root ngoài `allowedPaths` ban đầu.
4. **[P2] Fixture dùng chung cho ma trận thiết bị:** Mảng `DEVICE_PROFILES` khai báo nội bộ chưa được tách thành fixture dùng chung và chưa tham số hóa cho các kịch bản kiểm thử.
5. **[P2] Chuẩn kích thước vùng chạm WCAG AAA và lưới câu hỏi co giãn:** Nút câu hỏi trên `QuestionPalette` có `min-w-[36px]` chưa đạt 44px chiều rộng; cần bố cục 4 cột linh hoạt trên màn hình siêu hẹp (320px).

---

## 2. Các giải pháp & Sửa đổi kỹ thuật chi tiết

### 2.1. Đọc và kiểm chứng trực tiếp `external-prerequisites.json` & Software Fallback ([P1])
- Cập nhật Section 6 trong `apps/web/tests/real-device.test.tsx`:
  - Đọc và phân tích trực tiếp file `docs/multi-worker/external-prerequisites.json` từ đĩa.
  - Xác nhận mục `device-test` tồn tại, có trạng thái `PENDING`, nằm trong danh sách chặn nghiệm thu (`blocksAcceptance`) của `R03` và `V06`, và liên kết định nghĩa tới `QUYET_DINH_VA_DICH_VU.md`.
  - Kiểm chứng logic fallback của ứng dụng khi thiếu phòng lab thiết bị vật lý thật: duy trì bộ nhớ đệm ngoại tuyến (`MemoryExamStorage`), áp dụng đầy đủ quy ước cảm ứng trên môi trường mô phỏng phần mềm, và báo cáo minh bạch `BLOCKED_EXTERNAL: device-test` thay vì giả định phần cứng đã kiểm thử vật lý.

### 2.2. Kiểm thử đồng bộ âm thanh khi mở khóa màn hình / Refocus Tab ([P1])
- Trong `apps/web/features/exam/components/audio-player.tsx`:
  - Trích xuất hàm `setupVisibilitySync` và giao diện `SyncVisibilityDocument` chuẩn TypeScript strict (không dùng `any`).
  - Hàm lắng nghe sự kiện `visibilitychange` trên `document`: kích hoạt `syncFn` ngay lập tức khi `visibilityState === 'visible'` và trả về hàm giải phóng listener.
- Trong `apps/web/tests/real-device.test.tsx`:
  - Bổ sung ca kiểm thử `[AUDIO-04] synchronizes audio timeline on mobile device visibilitychange (wake-up / screen unlock) and cleans up listener`.
  - Mô phỏng chính xác vòng đời: khi `visibilityState === 'hidden'` (màn hình khóa) sự kiện không kích hoạt đồng bộ; khi chuyển sang `'visible'` (học viên mở khóa hoặc quay lại tab), hàm `syncWithTimeline` được kích hoạt ngay lập tức; khi gọi hàm cleanup, listener được gỡ bỏ hoàn toàn và không gây rò rỉ bộ nhớ.

### 2.3. Hợp thức hóa quyền sửa `package.json` qua Coordinator ([P1])
- Tại assignment `R03-3`, coordinator đã chính thức bổ sung `package.json` vào danh sách `allowedPaths`:
  `"allowedPaths": ["package.json", "apps/web/", "packages/ui/", "docs/decisions/"]`.
- Lệnh script `"test:device": "pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web test:device"` trong root `package.json` được phê duyệt chính thức, đồng bộ với các script kiểm thử web khác (`test:seo`, `test:performance`, `test:a11y`, `test:e2e:web-all`).

### 2.4. Tách Fixture dùng chung & Tham số hóa ma trận kiểm thử thiết bị ([P2])
- Tạo mới file fixture `apps/web/features/exam/fixtures/device-fixtures.ts`:
  - Định nghĩa kiểu `DeviceProfile` và mảng `DEVICE_PROFILES` cho 6 thiết bị đại diện: iPhone 15, iPhone SE, Pixel 7, iPad Pro, Galaxy Tab S9 và Desktop Workstation.
  - Tái xuất khẩu (re-export) qua `apps/web/features/exam/fixtures/exam-fixtures.ts`.
- Sử dụng `it.each(DEVICE_PROFILES)` trong `apps/web/tests/real-device.test.tsx` để tham số hóa kiểm thử kết xuất giao diện co giãn, công thái học chạm và thẻ ARIA trên toàn bộ 6 hồ sơ thiết bị.

### 2.5. Đạt chuẩn kích thước vùng chạm WCAG 2.1 AAA (44x44px) & Bố cục lưới linh hoạt ([P2])
- Trong `apps/web/features/exam/components/question-palette.tsx`:
  - Nâng cấp kích thước nút chọn câu hỏi thành `min-h-[44px] min-w-[44px]` (từ mức `min-w-[36px]` cũ), đáp ứng hoàn hảo khuyến nghị WCAG 2.1 AAA Target Size cho ngón tay người dùng.
  - Cải tiến lưới hiển thị: `grid-cols-4 min-[360px]:grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6`.
  - Trên màn hình siêu hẹp (< 360px như iPhone SE 320px), bố cục 4 cột cho phép mỗi nút mở rộng đạt chuẩn >= 44px mà không bị tràn khung hay chèn ép số thứ tự câu hỏi.

---

## 3. Bằng chứng nghiệm thu & Kết quả kiểm tra

| Kiểm tra / Cổng chất lượng | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| Cổng frozen-lockfile | `pnpm install --frozen-lockfile` | PASS (exit 0) | Lockfile đồng bộ tuyệt đối, 0 thay đổi |
| Kiểm tra cú pháp (Lint) | `pnpm lint` | PASS (exit 0) | 13/13 gói đạt, 0 lỗi lint, 0 any |
| Kiểm tra kiểu dữ liệu | `pnpm typecheck` | PASS (exit 0) | 20/20 gói typecheck sạch hoàn toàn |
| Kiểm thử Web toàn bộ | `pnpm --filter @jlpt/web test` | PASS (exit 0) | 15/15 files, 206/206 tests đạt 100% |
| Kiểm thử E2E Web suite | `pnpm test:e2e:web-all` | PASS (exit 0) | 6/6 test files, 107/107 tests đạt |
| Kiểm thử A11y WCAG 2.1 AA | `pnpm test:a11y` | PASS (exit 0) | 26/26 tests đạt cả ui & web |
| Kiểm thử kiểm tra thiết bị | `pnpm --filter @jlpt/web test:device` | PASS (exit 0) | 22/22 tests đạt (bao gồm 6 parameterized profiles) |
| Kiểm thử Monorepo toàn bộ | `pnpm test` | PASS (exit 0) | 20/20 gói test đạt, 489+ test suites |
| Xác minh 363 tính năng | `pnpm features:verify` | PASS (exit 0) | 363/363 tính năng ứng dụng đạt đầy đủ |
| Biên dịch sản phẩm | `pnpm build` | PASS (exit 0) | 12/12 packages build thành công |

---

## 4. Tự review theo tiêu chí REVIEW.md

- **P0 Check:** Không phát hiện lộ đáp án (100% snapshot đề thi kiểm tra qua `assertNoAnswerLeak`), không có lỗ hổng quyền, không rò rỉ dữ liệu cá nhân hay sai lệch chấm điểm.
- **P1 Check:** Sửa triệt để 3 lỗi P1 từ lượt review của W2; các kiểm tra đọc file thật, có ca kiểm thử thực tế chứng minh hành vi `visibilitychange`; quyền ghi `package.json` đã được coordinator cấp trong `allowedPaths`.
- **P2 Findings:** Sửa triệt để 2 lỗi P2; tách fixture `DEVICE_PROFILES` và tham số hóa kiểm thử; đạt chuẩn 44x44px WCAG AAA và lưới 4 cột cho màn hình hẹp.
- **Blockers:** Ghi nhận rào cản dịch vụ ngoài `BLOCKED_EXTERNAL: device-test` cho quy trình kiểm thử phần cứng vật lý thật do operator thực hiện.
