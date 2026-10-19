# Quyết định Kỹ thuật: Đồng bộ origin/main (I13) và chuẩn hóa E2E Playwright cho I04

- **Mã Task**: I04
- **Assignment ID**: I04-18
- **Người thực hiện**: W4 (Quản trị báo cáo và thương mại)
- **Thời gian**: 2026-10-19

## 1. Bối cảnh và Xung đột khi merge origin/main
- Khi đồng bộ `origin/main` mới nhất (đã merge `feat(I13)` - commit `bcdb869`), nhánh `task/I04` bị xung đột nội dung tại hai tệp:
  1. `tests/integration/mock-ui-baseline.json`: Nhánh `task/I04` đã loại bỏ hoàn toàn mock data trong `apps/admin/features/billing/billing-service.ts`, trong khi nhánh `origin/main` (từ I13) đã chuyển `apps/web/features/exam/fixtures/*` sang thư mục tests.
  2. `tests/playwright/integration.spec.ts`: Cả hai nhánh đều nối thêm suite E2E vào cuối file (`Real Practice & Mix Exam Integration Suite (I13)` và `Commercial, Reports & Experiments Real API Integration Suite (I04)`).

## 2. Phương án giải quyết xung đột
1. **`tests/integration/mock-ui-baseline.json`**:
   - Vì toàn bộ mã giao diện trong cả `apps/admin` (do I04 hoàn thiện) lẫn `apps/web` (do I13 hoàn thiện) đều không còn chứa mảng mẫu hay dữ liệu viết cứng, tệp baseline được đặt về mảng rỗng `[]`.
   - Kiểm tra `pnpm check:no-mock-ui` quét toàn bộ codebase và đạt 100% với 0 vi phạm mới và 0 vi phạm đã biết.

2. **`tests/playwright/integration.spec.ts`**:
   - Tích hợp trọn vẹn cả hai suite E2E: suite I13 (kiểm thử luyện tập và đề trộn trên staging) và suite I04 (kiểm thử luồng thương mại, gói, coupon, thanh toán sandbox, hoàn tiền, đối soát, báo cáo tổng quan/doanh thu/nội dung và thử nghiệm A/B).
   - Duy trì thuộc tính `.first()` cho bộ chọn `[data-testid^="experiment-card-"], [data-testid="experiments-empty"]` để triệt tiêu lỗi strict mode violation của Playwright.
   - Kế thừa cơ chế xử lý TOTP đa tiến trình (`handleTotpVerification` và `getSynchronizedTotp`) từ `origin/main` trong `tests/playwright/fixtures/staff-auth.fixture.ts`, tự động chờ sang khung 30 giây kế tiếp khi phát hiện mã TOTP đã được sử dụng giữa các tiến trình song song.

3. **Phạm vi an toàn**:
   - Giữ nguyên các module ngoài danh sách cho phép (không can thiệp vào dataset jlpt-official hay các module không thuộc allowedPaths).
