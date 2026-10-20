# Quyết Định Kỹ Thuật I07: Đồng Bộ origin/main và Hoàn Tất Nghiệm Thu Tích Hợp Toàn Bộ (Zero Mock Gate)

- **Mã quyết định:** I07-origin-main-merge-and-final-integration
- **Worker:** W6 (Hạ tầng CI và kiểm chứng)
- **Task ID:** I07
- **Assignment ID:** I07-6
- **Nhánh:** `task/I07`
- **Trạng thái:** REVIEW
- **Phụ thuộc:** I01, I08, I10, I11, I12, I13, I09, I03, I04, I05, I06, I14, I15

---

## 1. Bối cảnh và Yêu Cầu Của Lượt Thực Hiện

Theo chỉ thị giao việc `I07-6`:
1. Đồng bộ và giải quyết xung đột với nhánh `origin/main` (các task I16, I17, I18, P04, P05 vừa được merge vào main).
2. Tệp `tests/playwright/integration.spec.ts` xung đột ở khối định nghĩa bộ kiểm thử nghiệm thu `Platform Full Scope Integration & Zero Mock Gate Suite (I07)`.
3. Đảm bảo cổng `check:no-mock-ui` chặn đứng dữ liệu giả và baseline `tests/integration/mock-ui-baseline.json` rỗng tuyệt đối `[]`.
4. Vượt qua toàn bộ các cổng chung (`frozen-lockfile`, `lint`, `typecheck`, `test`, `build`).
5. Thực thi và đạt kết quả kiểm tra `sudo -n /usr/local/bin/jlpt-stage-test check-all` trên toàn bộ 5 trình duyệt thật trong staging container.

---

## 2. Giải Pháp Kỹ Thuật

1. **Xử lý xung đột `git merge origin/main`**:
   - Tích hợp các bài kiểm tra mới từ `origin/main` (I17 E2E duyệt lời giải/transcript và bảo mật delivery snapshot).
   - Bảo toàn trọn vẹn bộ kiểm thử tích hợp toàn bộ I07 (`I07-AC1`, `I07-AC2` qua 59 trang web và admin, `I07-AC3` quy trình 3 luồng dọc).

2. **Chống flakiness trong điều hướng đăng nhập học viên**:
   - Trong quá trình chạy 2 worker song song trên 5 trình duyệt với tải CPU cao, `waitForURL` mặc định chờ sự kiện `load` (chờ tất cả ảnh/tài nguyên mạng) có thể chạm ngưỡng 20s.
   - Thêm tham số `waitUntil: 'domcontentloaded'` và mở rộng timeout lên 30s (`{ timeout: 30000, waitUntil: 'domcontentloaded' }`) giúp xác nhận đăng nhập thành công ngay khi DOM sẵn sàng, loại bỏ độ trễ không cần thiết.

3. **Kiểm chứng các cổng chất lượng**:
   - `pnpm check:no-mock-ui`: 0 vi phạm, baseline `[]`.
   - `pnpm lint`: 13 packages thành công 100%.
   - `pnpm typecheck`: 20 packages thành công 100%.
   - `pnpm test`: 600 tests backend và toàn bộ frontend/packages thành công 100%.
   - `pnpm build`: 12 packages/apps Next.js và thư viện build thành công.
   - `sudo -n /usr/local/bin/jlpt-stage-test check-all`: 161 passed trên 5 trình duyệt (Chromium, Firefox, WebKit, Mobile Safari, Mobile Chrome) sau 1225s, exit code 0.
