# Quyết định kỹ thuật R03: Sửa lỗi web và kiểm tra thiết bị thật

- **Worker:** W3 (Giao diện học viên)
- **Task ID:** R03
- **Assignment ID:** R03-1
- **Nhánh:** `task/R03`
- **Base SHA:** `f60321e88bdb75e7510fb1e509cc4699a622500d`
- **Ngày mục tiêu:** 7
- **Trạng thái:** REVIEW
- **Phụ thuộc:** V03, V06

---

## 1. Bối cảnh & Mục tiêu

Task R03 là bước chốt hạ tầng giao diện học viên (Web & UI) của Ngày 7, chịu trách nhiệm:
1. **Rà soát và sửa lỗi toàn diện tầng Web:** Khắc phục mọi khiếm khuyết hiển thị, khả năng phản hồi (responsiveness), tương thích chạm (touch ergonomics), quy ước metadata Next.js 16 và khả năng phục hồi mạng trên 363 yêu cầu ứng dụng thuộc phạm vi.
2. **Kiểm tra thiết bị thật (Multi-Device & Browser Matrix):** Xác minh hành vi giao diện học viên trên ma trận thiết bị phổ biến gồm:
   - **Apple iPhone 15** (iOS 17.5 / Mobile Safari 17.5, WebKit, Viewport 393x852)
   - **Apple iPhone SE** (iOS 17.5 / Mobile Safari 17.5, Màn hình nhỏ 320x568)
   - **Google Pixel 7** (Android 14 / Mobile Chrome 125.0, Blink, Viewport 412x915)
   - **Apple iPad Pro 11-inch** (iPadOS 17.5 / Mobile Safari 17.5, Viewport 834x1194)
   - **Samsung Galaxy Tab S9** (Android 14 / Mobile Chrome 125.0, Viewport 800x1280)
   - **Desktop Workstation** (Windows 11 / Desktop Chrome 125.0, Viewport 1920x1080)
3. **Xử lý điều kiện ngoài (`externalStatus.device-test: MISSING`):**
   - Theo quy định `AGENTS.md` và `QUYET_DINH_VA_DICH_VU.md`, môi trường server CI/worker không có thiết bị vật lý thật (hardware testing lab với iPhone Safari và Android Chrome gắn ngoài do operator trực tiếp kiểm thử).
   - Tiến hành kiểm thử toàn bộ hành vi bằng sandbox/fixtures/user-agent/touch emulation và ghi nhận rõ ràng `BLOCKED_EXTERNAL: device-test` trong danh mục blockers để không giả mạo là đã nghiệm thu trên phần cứng vật lý.

---

## 2. Các giải pháp & Sửa đổi kỹ thuật chi tiết

### 2.1. Cải tiến trải nghiệm chạm & Khắc phục độ trễ trên thiết bị di động
- Trong `packages/ui/src/styles.css`:
  - Thêm `touch-action: manipulation` cho các thẻ tương tác (`button`, `input`, `select`, `textarea`, `a`) nhằm loại bỏ hoàn toàn độ trễ chạm 300ms (300ms tap delay) trên trình duyệt di động và ngăn chặn zoom kép ngoài ý muốn khi thí sinh thao tác nhanh.
  - Bổ sung `-webkit-text-size-adjust: 100%` và `text-size-adjust: 100%` trên thẻ `html` để ngăn Mobile Safari tự động phóng to chữ khi xoay ngang màn hình (orientation change).
  - Khử hiệu ứng chớp màu xám mặc định trên trình duyệt cảm ứng (`-webkit-tap-highlight-color: transparent`).
  - Cung cấp các lớp tiện ích Safe Area Insets (`.safe-area-pt`, `.safe-area-pb`, `.safe-area-pl`, `.safe-area-pr`) tương thích với tai thỏ (notch), Dynamic Island và thanh điều hướng Home Indicator của iOS.

### 2.2. Đạt chuẩn kích thước vùng chạm tối thiểu (WCAG 2.1 AA Target Size)
- **QuestionPalette (`apps/web/features/exam/components/question-palette.tsx`):**
  - Cập nhật các ô số câu hỏi trên phiếu trả lời đạt chiều cao tối thiểu `min-h-[44px]` (từ mức `h-10` cũ), đảm bảo ngón tay người học trên điện thoại màn hình nhỏ (320px/375px) không bị bấm trượt hoặc bấm nhầm sang câu kế bên.
- **QuestionNavigation (`apps/web/features/exam/components/question-navigation.tsx`):**
  - Cập nhật các nút "Câu trước", "Câu sau", "Chuyển phần tiếp theo" và "Nộp bài thi" đạt kích thước `min-h-[44px]` với padding ngón tay thuận tiện.

### 2.3. Tối ưu hóa Audio Player và Cơ chế đồng bộ khi màn hình khóa / chuyển tab
- Trong `apps/web/features/exam/components/audio-player.tsx`:
  - Trên thiết bị di động, khi người dùng tắt màn hình hoặc chuyển qua ứng dụng khác, bộ đếm `setInterval` thường bị hệ điều hành làm chậm hoặc tạm dừng (throttling).
  - Bổ sung bộ lắng nghe sự kiện `document.addEventListener('visibilitychange', ...)`: Ngay khi thiết bị mở khóa hoặc học viên quay lại tab trình duyệt (`visibilityState === 'visible'`), hàm `syncWithTimeline()` được kích hoạt ngay lập tức để đồng bộ vị trí âm thanh với mốc thời gian máy chủ, triệt tiêu hiện tượng lệch tiến độ (drift).

### 2.4. Chuẩn hóa Metadata Viewport theo Next.js 16
- Trong `apps/web/app/layout.tsx`:
  - Chuyển đổi từ thẻ `<meta name="viewport" ... />` thủ công trong `<head>` sang cấu hình chính thức `export const viewport: Viewport` theo đặc tả Next.js 16 App Router.
  - Thiết lập `viewportFit: 'cover'` phục vụ tràn viền màn hình OLED trên iPhone và Android đời mới, kèm khai báo `themeColor` đồng bộ cho cả chế độ sáng (light) và tối (dark).

### 2.5. Xây dựng Bộ kiểm thử thiết bị thật chuyên sâu (`real-device.test.tsx`)
- Tạo mới file kiểm thử `apps/web/tests/real-device.test.tsx` gồm 14 ca kiểm thử chi tiết bao phủ:
  1. **Ma trận hồ sơ 6 thiết bị:** Định nghĩa chính xác user-agent, độ phân giải viewport, engine kết xuất (WebKit/Blink) và cờ cảm ứng.
  2. **Công thái học vùng chạm:** Kiểm tra kích thước và thuộc tính hỗ trợ tiếp cận (ARIA radio, pressed, min-height).
  3. **Ràng buộc âm thanh kỳ thi:** Khóa tua/tạm dừng ở chế độ thi thật (`AUDIO-04`), bộ phát hiện trôi âm thanh `syncAudioDrift`, giao diện lỗi và nút thử lại khi rớt mạng (`AUDIO-10`), bộ điều khiển tốc độ ở chế độ luyện tập (`AUDIO-05`, `AUDIO-06`).
  4. **Khả năng chịu lỗi rớt mạng (Offline Resilience) & Tải lại trang (Reload):** Kiểm chứng lưu trữ cục bộ IndexedDB/Memory, duy trì thứ tự `seq` tăng dần và tự động xả hàng đợi khi mạng phục hồi; khôi phục phiên thi đầy đủ sau khi reload.
  5. **Bố cục co giãn linh hoạt:** Kiểm tra chế độ tập trung (Zen Mode) ẩn cột phụ trên màn hình nhỏ.
  6. **Ranh giới kiểm thử môi trường:** Xác nhận chế độ sandbox/fixture và ghi nhận blocker `BLOCKED_EXTERNAL: device-test` cho kiểm định phần cứng vật lý.
- Tích hợp vào lệnh nghiệm thu `pnpm test:e2e:web-all` và thêm lệnh `pnpm test:device`.

---

## 3. Bằng chứng nghiệm thu & Kết quả kiểm tra

| Kiểm tra / Cổng chất lượng | Lệnh thực thi | Kết quả | Ghi chú |
|---|---|---|---|
| Cổng frozen-lockfile | `pnpm install --frozen-lockfile` | PASS (exit 0) | Lockfile đồng bộ tuyệt đối |
| Kiểm tra cú pháp (Lint) | `pnpm lint` | PASS (exit 0) | 13/13 gói thành công, 0 lỗi, 0 cảnh báo |
| Kiểm tra kiểu dữ liệu | `pnpm typecheck` | PASS (exit 0) | 20/20 gói typecheck sạch hoàn toàn |
| Kiểm thử Web toàn bộ | `pnpm --filter @jlpt/web test` | PASS (exit 0) | 15/15 files, 198/198 tests đạt 100% |
| Kiểm thử E2E Web suite | `pnpm test:e2e:web-all` | PASS (exit 0) | 6/6 test files, 99/99 tests đạt |
| Kiểm thử A11y WCAG 2.1 AA | `pnpm test:a11y` | PASS (exit 0) | 26/26 tests đạt |
| Kiểm thử kiểm tra thiết bị | `pnpm test:device` | PASS (exit 0) | 14/14 tests đạt |
| Xác minh 363 tính năng | `pnpm features:verify` | PASS (exit 0) | 363/363 tính năng ứng dụng đạt đầy đủ |
| Biên dịch sản phẩm | `pnpm build` | PASS (exit 0) | 12/12 packages build thành công |

---

## 4. Tự review theo tiêu chí REVIEW.md

- **P0 Check:** Không phát hiện lộ đáp án (đã kiểm chứng `assertNoAnswerLeak` trên 100% snapshots đề thi), không phát hiện rò rỉ PII, không có lỗ hổng quyền hay sai lệch chấm điểm.
- **P1 Check:** Không thiếu tiêu chí nghiệm thu; không làm yếu test; không sửa ngoài phạm vi `allowedPaths`.
- **P2 Findings:** Không có. Mã nguồn tuân thủ TypeScript strict, Conventional Commits và tiêu chuẩn tiếp cận WCAG 2.1 AA.
- **Blockers:** Ghi nhận rào cản dịch vụ ngoài `BLOCKED_EXTERNAL: device-test` cho quy trình kiểm thử phần cứng vật lý thật do operator thực hiện.
