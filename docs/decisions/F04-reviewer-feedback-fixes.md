# Quyết định kỹ thuật F04: Khắc phục phản hồi của Reviewer W4 (Round 4)

- **Task:** F04
- **Worker:** W3 (Giao diện học viên)
- **Trạng thái:** REVIEW
- **Ngày:** 2026-10-16
- **Branch:** `task/F04`
- **Base SHA:** `17936fe3db9efefe0796221543726e8c9379c526`
- **Dependencies:** F02, F03
- **Resource Locks:** `ui-contract`
- **Feature IDs:** `ACC-14`, `EXAM-26`, `SYS-01`, `SYS-14`

---

## 1. Bối cảnh xử lý phản hồi Reviewer W4

Trong lượt đánh giá task F04, reviewer W4 đã chỉ ra các vấn đề P1 và P2 liên quan đến:
1. Độ tin cậy của lệnh kiểm tra khi chạy trên checkout sạch (thiếu build artifact của `@jlpt/ui`).
2. Chất lượng bằng chứng kiểm thử của bộ test i18n (`translate` parameter interpolation và fallback).
3. Tuân thủ quy tắc AGENTS.md ("Toàn bộ UI vi/ja/en có key"): còn một số chuỗi tiếng Việt bị hardcode trong JSX trên các trang chính (`page.tsx`, `tai-khoan/page.tsx`, `dat-lai-mat-khau/page.tsx`).
4. Khả năng quốc tế hóa nhãn trợ năng trong component dùng chung (`RichTextView` và `Footer` trong `@jlpt/ui`).

Tất cả các điểm trên đã được khắc phục triệt để và kiểm chứng bằng test tự động.

---

## 2. Chi tiết các thay đổi kỹ thuật

### 2.1. Cấu hình Alias và Build Script cho `@jlpt/ui` [P1 - package.json / vitest.config.ts]
- **Vấn đề:** Trên checkout sạch, thư mục `packages/ui/dist` chưa tồn tại khiến `vitest run tests/` trong `apps/web` gặp lỗi resolve module `@jlpt/ui`.
- **Giải pháp:**
  - Cấu hình alias trong `apps/web/vitest.config.ts` ánh xạ `@jlpt/ui` trực tiếp sang mã nguồn `packages/ui/src/index.tsx`.
  - Cập nhật các script `test:web` và `test:a11y` trong `package.json` tự động thực thi `pnpm --filter @jlpt/ui build` trước khi chạy test, đảm bảo cả 2 môi trường (có build hoặc chạy thẳng từ source) đều vượt qua 100%.

### 2.2. Kiểm thử thực tế bộ dịch `translate()` [P1 - apps/web/tests/i18n.test.ts]
- **Vấn đề 1 (Fallback):** Test case trước đây gọi `translate('ja', 'common.nav.home')` nhưng key này đã có sẵn trong `ja.json`, nên không chứng minh được nhánh fallback về `DEFAULT_LOCALE` (`vi`).
  - **Khắc phục:** Tiêm một khóa tạm thời chỉ tồn tại ở `vi` (`__test_fallback_only__`), assert rằng khi gọi `translate('ja', ...)` và `translate('en', ...)`, hàm trả về đúng chuỗi tiếng Việt từ `vi.json`.
- **Vấn đề 2 (Parameter Interpolation):** Test case trước đây tự tạo chuỗi và chạy regex `.replace()` thủ công trong file test mà không gọi hàm `translate()`.
  - **Khắc phục:** Sửa test gọi trực tiếp `translate(locale, key, params)` trên các khóa thực tế (`home.levelHeading`, `home.viewLevelExams`, `account.sessions.revokeAriaLabel`), xác nhận logic thay thế `{param}` hoạt động chính xác trên cả 3 locale.

### 2.3. Loại bỏ hoàn toàn Hardcoded Strings trên Giao diện [P1/P2]
- **Trang chủ (`apps/web/app/page.tsx`):**
  - Chuyển `Cấp độ {level}` sang `t('home.levelHeading', { level })`.
  - Chuyển `Xem đề thi {level}` sang `t('home.viewLevelExams', { level })`.
  - Chuyển các tiêu đề tính năng ('Phòng thi chuẩn format', 'Ôn tập thông minh SRS', 'Phân tích & Báo cáo') sang `t('home.features.examEngineTitle')`, `t('home.features.smartSRSTitle')`, `t('home.features.analyticsTitle')`.
- **Trang Tài khoản (`apps/web/app/(account)/tai-khoan/page.tsx`):**
  - Trích xuất nhãn `levelOptions` (N1–N5) vào `account.profile.levelN1`...`levelN5`.
  - Quốc tế hóa tiêu đề modal hủy phiên (`account.sessions.confirmRevokeTitle`), mô tả modal (`account.sessions.confirmRevokeBody`), nhãn nút đóng (`common.buttons.close`).
  - Quốc tế hóa nhãn trợ năng nút hủy phiên (`account.sessions.revokeAriaLabel` với tham số `{device}`).
  - Quốc tế hóa nhãn `tablist` (`account.tabs.ariaLabel`) và tên trình duyệt mặc định (`account.sessions.defaultBrowser`).
  - Quốc tế hóa các thông báo lỗi khi cập nhật hồ sơ và hủy phiên (`account.profile.saveError`, `account.sessions.revokeError`, `account.sessions.revokeAllError`).
- **Trang Đặt lại mật khẩu (`apps/web/app/(auth)/dat-lai-mat-khau/page.tsx`):**
  - Trích xuất nhãn token (`auth.resetPassword.tokenLabel`), placeholder (`auth.resetPassword.tokenPlaceholder`), hint mật khẩu (`auth.resetPassword.passwordHint`), và lỗi fallback (`auth.resetPassword.errors.general`).
- **Trang Quên mật khẩu & Xác minh email:**
  - Bổ sung `auth.forgotPassword.errors.general` và `auth.verifyEmail.missingToken`.
- **Điều hướng & Trợ năng toàn cục (`providers.tsx`, `nav-shell.tsx`):**
  - Chuyển `label="Chuyển đến nội dung chính"` trong `SkipToContent` sang `t('a11y.skipToContent')`.
  - Truyền `a11yNotice={t('common.footer.accessibilityNotice')}` cho `Footer`.

### 2.4. Quốc tế hóa Trợ năng trong `@jlpt/ui` [P2]
- **`RichTextView` (`packages/ui/src/components/rich-text-view.tsx`):**
  - Bổ sung các props tùy chọn `blankAriaLabel`, `starAriaLabel`, `imageAlt` vào `RichTextViewProps`.
  - Bổ sung test kiểm thử nhãn trợ năng tùy biến trong `packages/ui/tests/a11y.test.tsx`.
- **`Footer` (`packages/ui/src/components/footer.tsx`):**
  - Bổ sung prop tùy chọn `a11yNotice` vào `FooterProps`.
  - Bổ sung test kiểm thử thông báo trợ năng chân trang trong `packages/ui/tests/a11y.test.tsx`.
- **`ThemeToggle` (`packages/ui/src/components/theme-toggle.tsx`):**
  - Chuẩn hóa `aria-label` thành dạng ngôn ngữ trung tính `${label} (${resolvedTheme})` khi ở chế độ hệ thống.

---

## 3. Đồng bộ Khóa Tin nhắn (Messages Sync)

100% các khóa trong `apps/web/messages/vi.json`, `apps/web/messages/ja.json`, `apps/web/messages/en.json` đã được đồng bộ tuyệt đối về mặt cấu trúc và số lượng khóa lá, tất cả chuỗi tiếng Nhật đều tuân thủ định dạng chuẩn Unicode NFC.

---

## 4. Kết quả Kiểm thử Nghiệm thu

```bash
# 1. Kiểm tra ứng dụng web
pnpm test:web
# -> 4 test files, 25 tests passed, exitCode: 0

# 2. Kiểm tra đa ngôn ngữ
pnpm test:i18n
# -> 1 test file, 8 tests passed, exitCode: 0

# 3. Kiểm tra trợ năng (UI + Web)
pnpm test:a11y
# -> 2 test files, 20 tests passed (UI: 13, Web: 7), exitCode: 0

# 4. Kiểm tra Typecheck & Lint
pnpm --filter @jlpt/ui typecheck && pnpm --filter @jlpt/web typecheck  # -> exitCode: 0
pnpm --filter @jlpt/ui lint && pnpm --filter @jlpt/web lint            # -> exitCode: 0

# 5. Build ứng dụng sản phẩm
pnpm --filter @jlpt/ui build && pnpm --filter @jlpt/web build          # -> exitCode: 0

# 6. Kiểm tra phụ thuộc F03
pnpm test:auth && pnpm test:authorization                              # -> 36 tests passed, exitCode: 0
```
